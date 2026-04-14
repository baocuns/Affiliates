/**
 * Product info scraper using Open Graph metadata
 * 
 * Uses open-graph-scraper to extract product name, image, and description
 * from Shopee product pages via their OG meta tags.
 */

import ogs from 'open-graph-scraper';

/**
 * Fetch product information from Shopee using Open Graph metadata
 * @param {string} productUrl - Canonical Shopee product URL (shopee.vn/product/SHOP_ID/ITEM_ID)
 * @returns {Object} Product info { name, description, image, url }
 */
export async function getProductInfo(productUrl) {
  try {
    const { error, result } = await ogs({
      url: productUrl,
      fetchOptions: {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
        },
      },
      timeout: 10000,
    });

    if (error) {
      console.error('OGS error:', error);
      return null;
    }

    // Extract product name (remove " | Shopee Việt Nam" suffix)
    let name = result.ogTitle || '';
    name = name.replace(/\s*\|\s*Shopee\s+Việt\s+Nam\s*$/i, '').trim();

    // Extract image URL
    let image = null;
    if (result.ogImage && result.ogImage.length > 0) {
      image = result.ogImage[0].url || result.ogImage[0];
    }

    // Extract description (clean up the promotional text)
    let description = result.ogDescription || '';
    description = description
      .replace(/^Mua\s+/i, '')
      .replace(/\s*giá tốt\..*$/s, '')
      .trim();

    // Try to get detailed description from JSON-LD
    let detailedDescription = '';
    if (result.jsonLD && Array.isArray(result.jsonLD)) {
      const productLD = result.jsonLD.find(item => item['@type'] === 'Product');
      if (productLD && productLD.description) {
        detailedDescription = productLD.description.substring(0, 500);
      }
    }

    // Extract canonical URL
    const canonicalUrl = result.ogUrl || productUrl;

    return {
      name: name || 'Sản phẩm Shopee',
      description: detailedDescription || description || '',
      image,
      url: canonicalUrl,
    };
  } catch (error) {
    console.error('Scraper error:', error.message);
    return null;
  }
}
