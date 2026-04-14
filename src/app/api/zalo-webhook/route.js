import { NextResponse } from 'next/server';
import { processShopeeUrl, isValidShopeeUrl, isShortLink } from '@/lib/shopee';
import { getProductInfo } from '@/lib/scraper';
import { sendMessage, sendChatAction } from '@/lib/zalo';

/**
 * Extract URLs from a text message
 */
function extractUrls(text) {
  const urlRegex = /https?:\/\/[^\s]+/gi;
  return text.match(urlRegex) || [];
}

/**
 * Find the first Shopee URL in a list of URLs
 */
function findShopeeUrl(urls) {
  return urls.find(url => {
    try {
      return isValidShopeeUrl(url) || isShortLink(url);
    } catch {
      return false;
    }
  });
}

/**
 * Format product info into a nice chat message
 */
function formatReply(product, affiliateLink) {
  const lines = ['🛒 Sản phẩm Shopee\n'];

  if (product?.name) {
    lines.push(`📦 ${product.name}`);
  }

  if (product?.description) {
    // Truncate long descriptions for chat readability
    const desc = product.description.length > 200
      ? product.description.substring(0, 200) + '...'
      : product.description;
    lines.push(`📝 ${desc}`);
  }

  lines.push('');
  lines.push(`🔗 Link Affiliate:`);
  lines.push(affiliateLink);
  lines.push('');
  lines.push('👆 Bấm link trên để mua hàng và nhận hoàn tiền!');

  return lines.join('\n');
}

const HELP_MESSAGE = `👋 Xin chào! Tôi là bot chuyển đổi link Shopee.

📎 Hãy gửi cho tôi link sản phẩm Shopee, tôi sẽ tạo link affiliate giúp bạn!

Hỗ trợ:
• Link từ app: https://s.shopee.vn/xxxxx
• Link web: https://shopee.vn/ten-san-pham-i.123.456`;

const NOT_SHOPEE_MESSAGE = `⚠️ Link bạn gửi không phải link Shopee.

📎 Tôi chỉ hỗ trợ chuyển đổi link từ shopee.vn hoặc s.shopee.vn. Hãy thử lại nhé!`;

/**
 * POST /api/zalo-webhook
 * 
 * Nhận webhook từ Zalo khi có tin nhắn mới.
 * Zalo gửi POST với header X-Bot-Api-Secret-Token để xác thực.
 */
export async function POST(request) {
  try {
    // --- 1. Verify secret token ---
    const secretToken = request.headers.get('x-bot-api-secret-token');
    const expectedSecret = process.env.ZALO_WEBHOOK_SECRET;

    if (expectedSecret && secretToken !== expectedSecret) {
      console.warn('Webhook: Invalid secret token');
      return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
    }

    // --- 2. Parse webhook body ---
    const body = await request.json();

    if (!body.ok || !body.result) {
      return NextResponse.json({ message: 'Invalid payload' }, { status: 400 });
    }

    const { event_name, message } = body.result;

    // Only handle text messages
    if (event_name !== 'message.text.received' || !message?.text) {
      return NextResponse.json({ message: 'Ignored' });
    }

    const chatId = message.chat?.id;
    const userText = message.text.trim();

    if (!chatId) {
      return NextResponse.json({ message: 'No chat ID' }, { status: 400 });
    }

    // --- 3. Extract and find Shopee URL ---
    const urls = extractUrls(userText);

    // If no URL found at all, also check if the whole message is a URL without protocol
    if (urls.length === 0) {
      const withProtocol = 'https://' + userText;
      if (isValidShopeeUrl(withProtocol) || isShortLink(withProtocol)) {
        urls.push(withProtocol);
      }
    }

    if (urls.length === 0) {
      // No URL in message → send help
      await sendMessage(chatId, HELP_MESSAGE);
      return NextResponse.json({ message: 'Success' });
    }

    const shopeeUrl = findShopeeUrl(urls);

    if (!shopeeUrl) {
      // URLs found but none are Shopee → notify
      await sendMessage(chatId, NOT_SHOPEE_MESSAGE);
      return NextResponse.json({ message: 'Success' });
    }

    // --- 4. Process the Shopee link ---
    // Show typing indicator while processing
    await sendChatAction(chatId);

    const affiliateId = process.env.SHOPEE_AFFILIATE_ID;
    if (!affiliateId) {
      await sendMessage(chatId, '❌ Bot chưa được cấu hình Affiliate ID. Vui lòng liên hệ admin.');
      return NextResponse.json({ message: 'Success' });
    }

    const subId = process.env.SHOPEE_SUB_ID || '';

    try {
      // Process URL → resolve short link + extract IDs + build affiliate link
      const result = await processShopeeUrl(shopeeUrl, affiliateId, subId);

      // Fetch product info (non-critical)
      let product = null;
      try {
        product = await getProductInfo(result.productUrl);
      } catch (err) {
        console.warn('Failed to fetch product info:', err.message);
      }

      // Format and send reply
      const reply = formatReply(product, result.affiliateLink);
      await sendMessage(chatId, reply);
    } catch (err) {
      console.error('Process Shopee URL error:', err.message);
      await sendMessage(chatId, `❌ Lỗi xử lý link: ${err.message}\n\nVui lòng kiểm tra lại link và thử lại.`);
    }

    return NextResponse.json({ message: 'Success' });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ message: 'Internal error' }, { status: 500 });
  }
}
