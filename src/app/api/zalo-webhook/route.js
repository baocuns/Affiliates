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

📎 Hãy gửi link sản phẩm Shopee, tôi sẽ tạo link affiliate giúp bạn!

📌 Cách gửi link:
1. Paste link vào ô tin nhắn
2. Bấm ✕ để tắt thẻ xem trước liên kết
3. Bấm Gửi

Hỗ trợ link từ app (s.shopee.vn) và link web (shopee.vn).`;

const NOT_SHOPEE_MESSAGE = `⚠️ Link bạn gửi không phải link Shopee.

📎 Tôi chỉ hỗ trợ chuyển đổi link từ shopee.vn hoặc s.shopee.vn. Hãy thử lại nhé!`;

const UNSUPPORTED_MESSAGE = `⚠️ Tôi không đọc được tin nhắn dạng thẻ liên kết.

📌 Hãy gửi lại link theo cách sau:
1. Paste link vào ô tin nhắn
2. Bấm ✕ để tắt thẻ xem trước liên kết
3. Bấm Gửi`;

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
    console.log('Zalo webhook body:', JSON.stringify(body, null, 2));

    // Handle both formats:
    // Format 1 (docs): { ok: true, result: { event_name, message } }
    // Format 2 (raw):  { event_name, message }
    const payload = body.result || body;
    const { event_name, message } = payload;

    if (!event_name || !message) {
      console.warn('Webhook: Missing event_name or message in payload');
      return NextResponse.json({ message: 'Invalid payload' }, { status: 400 });
    }

    const chatId = message.chat?.id;

    // --- Handle unsupported messages (link cards, etc.) ---
    // When users paste a Shopee link, Zalo auto-renders it as a rich link card
    // which the Bot API classifies as "unsupported". We catch this and guide the user.
    if (event_name === 'message.unsupported.received') {
      console.log('[Webhook] Unsupported message received → sending guide');
      if (chatId) {
        await sendMessage(chatId, UNSUPPORTED_MESSAGE);
      }
      return NextResponse.json({ message: 'Success' });
    }

    // Only handle text messages
    if (event_name !== 'message.text.received' || !message?.text) {
      console.log('Webhook: Ignoring event:', event_name);
      return NextResponse.json({ message: 'Ignored' });
    }

    const userText = message.text.trim();
    console.log('[Webhook] chatId:', chatId, '| userText:', userText);

    if (!chatId) {
      console.warn('[Webhook] No chat ID found');
      return NextResponse.json({ message: 'No chat ID' }, { status: 400 });
    }

    // --- 3. Extract and find Shopee URL ---
    const urls = extractUrls(userText);
    console.log('[Webhook] Extracted URLs:', urls);

    // If no URL found at all, also check if the whole message is a URL without protocol
    if (urls.length === 0) {
      const withProtocol = 'https://' + userText;
      if (isValidShopeeUrl(withProtocol) || isShortLink(withProtocol)) {
        urls.push(withProtocol);
      }
    }

    if (urls.length === 0) {
      // No URL in message → send help
      console.log('[Webhook] No URL found → sending help message');
      await sendMessage(chatId, HELP_MESSAGE);
      return NextResponse.json({ message: 'Success' });
    }

    const shopeeUrl = findShopeeUrl(urls);
    console.log('[Webhook] Shopee URL found:', shopeeUrl);

    if (!shopeeUrl) {
      // URLs found but none are Shopee → notify
      console.log('[Webhook] No Shopee URL → sending not-shopee message');
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
      console.log('[Webhook] Sending affiliate reply, length:', reply.length);
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
