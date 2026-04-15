import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();

    // Verify admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: isAdmin } = await supabase.rpc('is_admin');

    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get all unpaid commissions grouped by user
    const { data: unpaidComms } = await supabase
      .from('commissions')
      .select('id, user_id, user_share, order_id, item_name')
      .eq('payment_status', 'pending')
      .not('user_id', 'is', null);

    // Group by user
    const userMap = {};
    (unpaidComms || []).forEach(c => {
      if (!userMap[c.user_id]) {
        userMap[c.user_id] = { commissions: [], total: 0 };
      }
      userMap[c.user_id].commissions.push(c);
      userMap[c.user_id].total += parseFloat(c.user_share) || 0;
    });

    // Get user profiles and payment info
    const userIds = Object.keys(userMap);
    if (userIds.length === 0) {
      return NextResponse.json({ success: true, users: [] });
    }

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name, email, phone')
      .in('id', userIds);

    const { data: paymentInfos } = await supabase
      .from('payment_info')
      .select('*')
      .in('user_id', userIds);

    const profileMap = {};
    (profiles || []).forEach(p => { profileMap[p.id] = p; });

    const paymentMap = {};
    (paymentInfos || []).forEach(p => { paymentMap[p.user_id] = p; });

    const users = userIds.map(id => ({
      userId: id,
      profile: profileMap[id] || {},
      paymentInfo: paymentMap[id] || null,
      unpaidTotal: Math.round(userMap[id].total * 100) / 100,
      commissionCount: userMap[id].commissions.length,
      commissionIds: userMap[id].commissions.map(c => c.id),
    })).sort((a, b) => b.unpaidTotal - a.unpaidTotal);

    return NextResponse.json({ success: true, users });
  } catch (error) {
    console.error('Payments GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const supabase = await createClient();

    // Verify admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: isAdmin } = await supabase.rpc('is_admin');

    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { userId, commissionIds, transactionRef, paymentMethod, note, amount } = body;

    if (!userId || !commissionIds?.length) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Update commissions to paid
    const { error: updateError } = await supabase
      .from('commissions')
      .update({
        payment_status: 'paid',
        paid_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .in('id', commissionIds)
      .eq('user_id', userId);

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update commissions: ' + updateError.message }, { status: 500 });
    }

    // Create payment history record
    const { error: historyError } = await supabase
      .from('payment_history')
      .insert({
        user_id: userId,
        admin_id: user.id,
        amount: amount || 0,
        commission_ids: commissionIds,
        payment_method: paymentMethod || 'bank_transfer',
        transaction_ref: transactionRef || '',
        note: note || '',
      });

    if (historyError) {
      console.error('Payment history insert error:', historyError.message);
    }

    return NextResponse.json({ success: true, paidCount: commissionIds.length });
  } catch (error) {
    console.error('Payments POST error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
