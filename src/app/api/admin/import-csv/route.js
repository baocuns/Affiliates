import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { mapRow, processRows, parseNumber, parseDate } from '@/lib/csv-parser';
import Papa from 'papaparse';

export async function POST(request) {
  try {
    const supabase = await createClient();

    // Verify admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: isAdmin } = await supabase.rpc('is_admin');

    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file');
    const shareRate = parseFloat(formData.get('shareRate') || process.env.COMMISSION_USER_SHARE_RATE || '0.8');

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const csvText = await file.text();
    const filename = file.name;

    // Parse CSV
    const parseResult = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
    });

    if (parseResult.errors.length > 0) {
      console.error('CSV parse errors:', parseResult.errors);
    }

    // Map rows to English keys
    const mappedRows = parseResult.data.map(mapRow).filter(r => r.order_id);

    // Create import batch
    const { data: batch, error: batchError } = await supabase
      .from('import_batches')
      .insert({
        admin_id: user.id,
        filename,
        total_rows: mappedRows.length,
        status: 'processing',
      })
      .select('id')
      .single();

    if (batchError) {
      return NextResponse.json({ error: 'Failed to create import batch: ' + batchError.message }, { status: 500 });
    }

    // Get all sub_id2 values from the CSV
    const subId2Values = [...new Set(mappedRows.map(r => r.sub_id2).filter(Boolean))];

    // Look up conversions by short_id
    let conversionMap = new Map();
    if (subId2Values.length > 0) {
      const { data: conversions } = await supabase
        .from('conversions')
        .select('id, short_id, user_id')
        .in('short_id', subId2Values);

      (conversions || []).forEach(c => {
        conversionMap.set(c.short_id, { conversion_id: c.id, user_id: c.user_id });
      });
    }

    // Get existing orders to detect duplicates
    const orderKeys = mappedRows.map(r => r.order_id);
    const { data: existingComms } = await supabase
      .from('commissions')
      .select('order_id, item_id')
      .in('order_id', orderKeys);

    const existingOrders = new Set(
      (existingComms || []).map(c => `${c.order_id}|${c.item_id}`)
    );

    // Process rows
    const { matched, unmatched, duplicated, cancelled } = processRows(
      mappedRows, conversionMap, existingOrders, shareRate
    );

    // Insert matched commissions
    let insertedCount = 0;
    if (matched.length > 0) {
      const toInsert = matched.map(m => ({
        ...m,
        import_batch_id: batch.id,
      }));

      // Insert in batches of 50
      for (let i = 0; i < toInsert.length; i += 50) {
        const chunk = toInsert.slice(i, i + 50);
        const { error: insertError } = await supabase.from('commissions').insert(chunk);
        if (insertError) {
          console.error('Insert error:', insertError.message);
        } else {
          insertedCount += chunk.length;
        }
      }
    }

    // Insert unmatched commissions (no user, all commission goes to owner)
    if (unmatched.length > 0) {
      const unmatchedToInsert = unmatched
        .filter(u => !existingOrders.has(`${u.order_id}|${u.item_id}`))
        .map(u => ({
          order_id: u.order_id,
          order_status: u.order_status,
          order_date: u.order_date,
          completed_date: u.completed_date,
          shop_id: u.shop_id,
          item_id: u.item_id,
          item_name: u.item_name,
          price: u.price,
          order_value: u.order_value,
          channel: u.channel,
          total_commission: u.total_commission,
          user_share: 0,
          owner_share: u.total_commission,
          share_rate: shareRate,
          import_batch_id: batch.id,
        }));

      for (let i = 0; i < unmatchedToInsert.length; i += 50) {
        const chunk = unmatchedToInsert.slice(i, i + 50);
        await supabase.from('commissions').insert(chunk);
      }
    }

    // Update batch status
    await supabase
      .from('import_batches')
      .update({
        matched_rows: matched.length,
        unmatched_rows: unmatched.length,
        duplicated_rows: duplicated.length,
        status: 'completed',
        report: {
          matched: matched.length,
          unmatched: unmatched.length,
          duplicated: duplicated.length,
          cancelled: cancelled.length,
          inserted: insertedCount,
          shareRate,
        },
      })
      .eq('id', batch.id);

    return NextResponse.json({
      success: true,
      batchId: batch.id,
      results: {
        total: mappedRows.length,
        matched: matched.length,
        unmatched: unmatched.length,
        duplicated: duplicated.length,
        cancelled: cancelled.length,
        inserted: insertedCount,
      },
      matchedDetails: matched.slice(0, 10).map(m => ({
        order_id: m.order_id,
        item_name: m.item_name,
        total_commission: m.total_commission,
        user_share: m.user_share,
      })),
    });
  } catch (error) {
    console.error('Import CSV error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
