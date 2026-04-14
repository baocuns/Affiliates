import { NextResponse } from 'next/server';
import { processShopeeUrl } from '@/lib/shopee';
import { getProductInfo } from '@/lib/scraper';

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
    const subId = process.env.SHOPEE_SUB_ID || '';

    // Step 1: Process URL → resolve short link + extract IDs + build affiliate link
    const result = await processShopeeUrl(url, affiliateId, subId);

    // Step 2: Fetch product info via OG scraper
    let product = null;
    try {
      product = await getProductInfo(result.productUrl);
    } catch (err) {
      console.error('Failed to fetch product info:', err.message);
      // Non-critical: continue without product info
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
