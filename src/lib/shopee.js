/**
 * Shopee URL parser & affiliate link generator
 * 
 * Hỗ trợ các dạng URL:
 * 1. https://s.shopee.vn/XXXXX (link rút gọn từ app)
 * 2. https://shopee.vn/product-name-i.SHOP_ID.ITEM_ID
 * 3. https://shopee.vn/product/SHOP_ID/ITEM_ID
 * 4. https://shopee.vn/shop-name (link shop/page)
 * 
 * Cách tạo affiliate link:
 * - Encode trực tiếp URL người dùng paste vào
 * - Gắn vào template: https://s.shopee.vn/an_redir?origin_link={encoded}&affiliate_id={id}&sub_id={sub}
 * - Không cần resolve short link hay extract IDs
 */

const SHOPEE_DOMAINS = ['shopee.vn', 's.shopee.vn', 'shope.ee', 'vn.shp.ee'];

/**
 * Check if URL is a Shopee short link
 */
export function isShortLink(url) {
  try {
    const parsed = new URL(url);
    return parsed.hostname === 's.shopee.vn' || parsed.hostname === 'shope.ee' || parsed.hostname === 'vn.shp.ee';
  } catch {
    return false;
  }
}

/**
 * Check if URL is a valid Shopee URL
 */
export function isValidShopeeUrl(url) {
  try {
    const parsed = new URL(url);
    return SHOPEE_DOMAINS.some(domain => parsed.hostname === domain || parsed.hostname === `www.${domain}`);
  } catch {
    return false;
  }
}

/**
 * Extract shop_id and item_id from a Shopee URL (optional, for tracking only)
 * Returns null if IDs cannot be extracted (e.g. shop pages, promo links)
 */
export function extractIds(url) {
  // Decode URL-encoded characters first (e.g. %2F → /)
  let decodedUrl;
  try {
    decodedUrl = decodeURIComponent(url);
  } catch {
    decodedUrl = url;
  }

  // Pattern 1: -i.SHOP_ID.ITEM_ID or .i.SHOP_ID.ITEM_ID
  // Standard Shopee format: product-name-i.123456.789012
  let match = decodedUrl.match(/[-.]i\.(\d+)\.(\d+)/);
  if (match) {
    return { shopId: match[1], itemId: match[2] };
  }

  // Pattern 2: /product/SHOP_ID/ITEM_ID
  match = decodedUrl.match(/\/product\/(\d+)\/(\d+)/);
  if (match) {
    return { shopId: match[1], itemId: match[2] };
  }

  // Pattern 3: /ANYTHING/SHOP_ID/ITEM_ID (e.g. /opaanlp/123/456)
  match = decodedUrl.match(/\/[a-zA-Z]+\/(\d+)\/(\d+)/);
  if (match) {
    return { shopId: match[1], itemId: match[2] };
  }

  return null;
}

/**
 * Generate a short ID for tracking conversions (6 chars alphanumeric)
 * Used as sub_id2 in affiliate links
 */
export function generateShortId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Build the affiliate redirect URL
 * Encode trực tiếp URL gốc và gắn vào template affiliate
 * sub_id format: {subId1}-{subId2} → Shopee auto-splits by '-' into Sub_id1, Sub_id2
 */
export function buildAffiliateLink(originalUrl, affiliateId, subId1 = '', subId2 = '') {
  const encodedUrl = encodeURIComponent(originalUrl);
  let link = `https://s.shopee.vn/an_redir?origin_link=${encodedUrl}&affiliate_id=${affiliateId}`;
  if (subId1) {
    const subId = subId2 ? `${subId1}-${subId2}` : subId1;
    link += `&sub_id=${subId}`;
  }
  return link;
}

/**
 * Main function: Process any type of Shopee URL and return affiliate link
 * 
 * Flow đơn giản:
 * 1. Validate URL là Shopee
 * 2. Encode trực tiếp URL → tạo affiliate link
 * 3. Extract IDs (optional, cho tracking)
 */
export function processShopeeUrl(inputUrl, affiliateId, subId1 = '', subId2 = '') {
  // Step 1: Validate input
  let url = inputUrl.trim();
  if (!url.startsWith('http')) {
    url = 'https://' + url;
  }

  if (!isValidShopeeUrl(url)) {
    throw new Error('URL không phải là link Shopee hợp lệ. Vui lòng nhập link từ shopee.vn');
  }

  // Step 2: Build affiliate link directly from input URL (no resolve needed)
  const affiliateLink = buildAffiliateLink(url, affiliateId, subId1, subId2);

  // Step 3: Extract IDs for tracking (optional, won't fail if not found)
  const ids = extractIds(url);

  return {
    shopId: ids?.shopId || null,
    itemId: ids?.itemId || null,
    productUrl: url,
    affiliateLink,
    originalUrl: url,
  };
}
