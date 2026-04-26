/**
 * Product info scraper using Open Graph metadata
 * 
 * Fetches HTML with a Facebook crawler User-Agent to extract OG meta tags.
 * Shopee serves pre-rendered OG tags for known bot user-agents, which is
 * how Zalo/Facebook generate link preview cards.
 */

/**
 * Extract OG meta tag content from HTML string
 * @param {string} html - Raw HTML string
 * @param {string} property - OG property name (e.g. "og:title")
 * @returns {string|null} Content value or null
 */
function extractOgTag(html, property) {
  // Match both property="og:xxx" and name="og:xxx" patterns
  // Handle content before or after property attribute
  const patterns = [
    new RegExp(`<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']*)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+property=["']${property}["']`, 'i'),
    new RegExp(`<meta[^>]+name=["']${property}["'][^>]+content=["']([^"']*)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+name=["']${property}["']`, 'i'),
  ];

  for (const regex of patterns) {
    const match = html.match(regex);
    if (match && match[1]) {
      // Decode HTML entities
      return match[1]
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&#x27;/g, "'")
        .trim();
    }
  }
  return null;
}

/**
 * Fetch product information from Shopee using Open Graph metadata
 * Uses facebookexternalhit User-Agent to trigger Shopee's bot-friendly HTML response
 * 
 * @param {string} productUrl - Shopee product URL
 * @returns {Object|null} Product info { name, description, image, url }
 */
export async function getProductInfo(productUrl) {
  try {
    const response = await fetch(productUrl, {
      headers: {
        'User-Agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'vi-VN,vi;q=0.9,en;q=0.8',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      console.error(`Scraper: HTTP ${response.status} for ${productUrl}`);
      return null;
    }

    const html = await response.text();

    // Extract OG tags
    const ogTitle = extractOgTag(html, 'og:title');
    const ogImage = extractOgTag(html, 'og:image');
    const ogDescription = extractOgTag(html, 'og:description');
    const ogUrl = extractOgTag(html, 'og:url');

    // Clean up title (remove " | Shopee Việt Nam" suffix)
    let name = ogTitle || '';
    name = name.replace(/\s*\|\s*Shopee\s+Việt\s+Nam\s*$/i, '').trim();

    // Clean up description
    let description = ogDescription || '';
    description = description
      .replace(/^Mua\s+/i, '')
      .replace(/\s*giá tốt\..*$/s, '')
      .trim();

    // Extract canonical URL
    const canonicalUrl = ogUrl || productUrl;

    return {
      name: name || 'Sản phẩm Shopee',
      description: description || '',
      image: ogImage || null,
      url: canonicalUrl,
    };
  } catch (error) {
    console.error('Scraper error:', error.message);
    return null;
  }
}
