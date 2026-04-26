import { NextResponse } from 'next/server';
import { processShopeeUrl, generateShortId } from '@/lib/shopee';
import { getProductInfo } from '@/lib/scraper';
import { createClient } from '@/utils/supabase/server';

export async function POST(request) {
  try {
    const body = await request.json();
    const { url } = body;

    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Vui lòng nhập link sản phẩm Shopee' },
        { status: 400 }
      );
    }

    // Get affiliate ID from environment variable
    const affiliateId = process.env.SHOPEE_AFFILIATE_ID;
    if (!affiliateId) {
      return NextResponse.json(
        { success: false, error: 'Hệ thống chưa được cấu hình Affiliate ID. Vui lòng liên hệ admin.' },
        { status: 500 }
      );
    }

    // Get default sub_id from environment
    const subId1 = process.env.SHOPEE_SUB_ID || '';

    // Check auth - get current user
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Generate short_id for tracking
    let shortId = '';
    if (user) {
      // Generate unique short_id, retry if collision
      for (let attempt = 0; attempt < 5; attempt++) {
        shortId = generateShortId();
        const { data: existing } = await supabase
          .from('conversions')
          .select('id')
          .eq('short_id', shortId)
          .single();
        if (!existing) break;
      }
    }

    // Step 1: Process URL → validate + build affiliate link (synchronous, no fetch)
    const result = processShopeeUrl(url, affiliateId, subId1, shortId);

    // Step 2: Fetch product info via OG meta tags
    let product = null;
    try {
      product = await getProductInfo(result.productUrl);
    } catch (err) {
      console.error('Failed to fetch product info:', err.message);
      // Non-critical: continue without product info
    }

    // Step 3: Save conversion to database (if user is logged in)
    let conversionId = null;
    if (user && shortId) {
      try {
        const insertData = {
          short_id: shortId,
          user_id: user.id,
          original_url: result.originalUrl,
          affiliate_url: result.affiliateLink,
          product_name: product?.name || 'Sản phẩm Shopee',
          product_image: product?.image || null,
          product_description: product?.description || null,
          source: 'web',
        };

        // Only include IDs if they were extracted
        if (result.shopId) insertData.shop_id = parseInt(result.shopId);
        if (result.itemId) insertData.item_id = parseInt(result.itemId);

        const { data: conversion, error: insertError } = await supabase
          .from('conversions')
          .insert(insertData)
          .select('id')
          .single();

        if (insertError) {
          console.error('Failed to save conversion:', insertError.message);
        } else {
          conversionId = conversion?.id;
        }
      } catch (err) {
        console.error('DB insert error:', err.message);
        // Non-critical: continue without DB record
      }
    }

    return NextResponse.json({
      success: true,
      affiliateLink: result.affiliateLink,
      product: product || {
        name: 'Sản phẩm Shopee',
        description: '',
        image: null,
        url: result.productUrl,
      },
      meta: {
        shopId: result.shopId,
        itemId: result.itemId,
        productUrl: result.productUrl,
        originalUrl: result.originalUrl,
        shortId,
        conversionId,
      },
    });
  } catch (error) {
    console.error('Convert API error:', error.message);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 400 }
    );
  }
}

