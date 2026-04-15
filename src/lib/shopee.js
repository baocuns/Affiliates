/**
 * Shopee URL parser & affiliate link generator
 * 
 * Hỗ trợ các dạng URL:
 * 1. https://s.shopee.vn/XXXXX (link rút gọn từ app)
 * 2. https://shopee.vn/product-name-i.SHOP_ID.ITEM_ID
 * 3. https://shopee.vn/product/SHOP_ID/ITEM_ID
 * 4. https://shopee.vn/opaanlp/SHOP_ID/ITEM_ID (redirect from short link)
 */

const SHOPEE_DOMAINS = ['shopee.vn', 's.shopee.vn', 'shope.ee', 'vn.shp.ee'];

/**
 * Check if URL is a Shopee short link that needs to be resolved
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
 * Resolve a Shopee short link (s.shopee.vn/xxx) to full URL
 * Returns the Location header from the 301 redirect
 */
export async function resolveShortLink(shortUrl) {
  try {
    const response = await fetch(shortUrl, {
      method: 'HEAD',
      redirect: 'manual',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    const location = response.headers.get('location');
    if (location) {
      return location;
    }

    // If HEAD doesn't give Location, try GET with redirect follow
    const getResponse = await fetch(shortUrl, {
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });
    return getResponse.url;
  } catch (error) {
    throw new Error(`Không thể resolve link rút gọn: ${error.message}`);
  }
}

/**
 * Extract shop_id and item_id from a Shopee URL
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

  // Pattern 3: /ANYTHING/SHOP_ID/ITEM_ID (from resolved short links like /opaanlp/123/456)
  match = decodedUrl.match(/\/[a-zA-Z]+\/(\d+)\/(\d+)/);
  if (match) {
    return { shopId: match[1], itemId: match[2] };
  }

  return null;
}

/**
 * Build the canonical Shopee product URL
 */
export function buildProductUrl(shopId, itemId) {
  return `https://shopee.vn/product/${shopId}/${itemId}`;
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
 * Main function: Process any type of Shopee URL and return affiliate link + IDs
 */
export async function processShopeeUrl(inputUrl, affiliateId, subId1 = '', subId2 = '') {
  // Step 1: Validate input
  let url = inputUrl.trim();
  if (!url.startsWith('http')) {
    url = 'https://' + url;
  }

  if (!isValidShopeeUrl(url)) {
    throw new Error('URL không phải là link Shopee hợp lệ. Vui lòng nhập link từ shopee.vn');
  }

  // Step 2: Resolve short link if needed
  let resolvedUrl = url;
  if (isShortLink(url)) {
    resolvedUrl = await resolveShortLink(url);
  }

  // Step 3: Extract IDs
  const ids = extractIds(resolvedUrl);
  if (!ids) {
    throw new Error('Không tìm thấy thông tin sản phẩm trong link. Vui lòng kiểm tra lại URL.');
  }

  // Step 4: Build canonical product URL and affiliate link
  const productUrl = buildProductUrl(ids.shopId, ids.itemId);
  const affiliateLink = buildAffiliateLink(productUrl, affiliateId, subId1, subId2);

  return {
    shopId: ids.shopId,
    itemId: ids.itemId,
    productUrl,
    affiliateLink,
    originalUrl: url,
    resolvedUrl,
  };
}
