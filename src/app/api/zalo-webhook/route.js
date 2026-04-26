import { NextResponse } from 'next/server';
import { processShopeeUrl, isValidShopeeUrl, isShortLink, generateShortId } from '@/lib/shopee';
import { getProductInfo } from '@/lib/scraper';
import { sendMessage, sendChatAction } from '@/lib/zalo';
import { supabaseAdmin } from '@/lib/supabase-admin';

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
 * Check if the text is a valid email
 */
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
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

const UNSUPPORTED_MESSAGE_AUTHED = `⚠️ Tôi không đọc được tin nhắn dạng thẻ liên kết.

📌 Hãy gửi lại link theo cách sau:
1. Paste link vào ô tin nhắn
2. Bấm ✕ để tắt thẻ xem trước liên kết
3. Bấm Gửi`;

const NEED_AUTH_MESSAGE = `👋 Chào bạn! Bạn chưa liên kết tài khoản để sử dụng tính năng tạo link affiliate.

📱 Vui lòng cung cấp **địa chỉ Email** của bạn tại đây:
- Nếu bạn ĐÃ CÓ tài khoản trên web, hãy nhập chính xác email đó (bot sẽ gửi OTP).
- Nếu bạn CHƯA CÓ tài khoản, bot sẽ tự động tạo cho bạn một tài khoản mới.`;

/**
 * POST /api/zalo-webhook
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
    console.log('Zalo webhook body received');

    const payload = body.result || body;
    const { event_name, message } = payload;

    if (!event_name || !message) {
      return NextResponse.json({ message: 'Invalid payload' }, { status: 400 });
    }

    const chatId = message.from?.id || message.chat?.id;
    if (!chatId) {
      return NextResponse.json({ message: 'No chat ID' }, { status: 400 });
    }

    const isUnsupported = event_name === 'message.unsupported.received';
    const isMessage = event_name === 'message.text.received';
    const userText = message?.text?.trim() || '';

    // Ignore other types
    if (!isUnsupported && !isMessage) {
      return NextResponse.json({ message: 'Ignored' });
    }

    // --- 3. Auth checking ---
    // Look for existing user with this Zalo ID
    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      .select('id, zalo_id, email, role')
      .eq('zalo_id', chatId);

    let profile = profiles?.[0];

    // Look if they are in pending OTP state
    let pendingProfile = null;
    if (!profile) {
      const { data: pending } = await supabaseAdmin
        .from('profiles')
        .select('id, zalo_id, email')
        .eq('zalo_id', `pending:${chatId}`);
      pendingProfile = pending?.[0];
    }

    // --- 4. Unauthenticated Flow ---
    if (!profile) {

      // Sub-case: User is in pending OTP state
      if (pendingProfile) {
        // Bug #2 fix: Unsupported msg while pending → remind OTP (not NEED_AUTH)
        if (isUnsupported) {
          await sendMessage(chatId, `⚠️ Tôi không đọc được tin nhắn này.\n\nVui lòng nhập mã OTP đã gửi về email **${pendingProfile.email}**.\n\n(Hoặc nhập một địa chỉ email khác nếu bạn muốn thử lại).`);
          return NextResponse.json({ message: 'Success' });
        }

        // Bug #1 fix: User sends a new email while pending → clear old pending first
        if (isMessage && isValidEmail(userText)) {
          await supabaseAdmin.from('profiles').update({ zalo_id: null }).eq('id', pendingProfile.id);
          // Fall through to email flow below
        }
        // Check for OTP or other text
        else if (isMessage) {
          // Bug #4 fix: Strict OTP match — only pure digits, not substrings in URLs
          const otpMatch = userText.match(/^\d{6,10}$/);

          if (otpMatch) {
            const token = otpMatch[0];
            await sendMessage(chatId, '⏳ Đang xác minh mã OTP...');
            const { error } = await supabaseAdmin.auth.verifyOtp({
              email: pendingProfile.email,
              token: token,
              type: 'email'
            });

            if (error) {
              const { error: error2 } = await supabaseAdmin.auth.verifyOtp({
                email: pendingProfile.email,
                token: token,
                type: 'magiclink'
              });

              if (error2) {
                await sendMessage(chatId, `❌ Sai mã OTP hoặc mã đã hết hạn. Vui lòng nhập lại, hoặc gửi một email khác để bắt đầu lại.`);
                return NextResponse.json({ message: 'Success' });
              }
            }

            await supabaseAdmin.from('profiles').update({ zalo_id: chatId }).eq('id', pendingProfile.id);
            await sendMessage(chatId, `✅ Xác minh thành công!\nBạn đã liên kết Zalo ID với tài khoản **${pendingProfile.email}**.\n\n🎉 Bây giờ bạn đã có thể gửi link Shopee để tạo link Affiliate!`);
            return NextResponse.json({ message: 'Success' });
          } else {
            // Text that's not an email and not a pure OTP → remind
            await sendMessage(chatId, `Vui lòng nhập mã OTP đã gửi về email **${pendingProfile.email}**.\n\n(Hoặc nhập một địa chỉ email khác nếu bạn muốn thử lại).`);
            return NextResponse.json({ message: 'Success' });
          }
        }
      }

      // Email flow (handles both fresh users and users who just cleared pending)
      if (isMessage && isValidEmail(userText)) {
        const email = userText.toLowerCase();
        await sendChatAction(chatId);

        // Find existing profile with this email
        const { data: matchedProfiles } = await supabaseAdmin.from('profiles').select('id, zalo_id, email').eq('email', email);
        const targetProfile = matchedProfiles?.[0];

        if (targetProfile) {
          if (targetProfile.zalo_id && !targetProfile.zalo_id.startsWith('pending:')) {
            await sendMessage(chatId, `❌ Email **${email}** đã được liên kết với một tài khoản Zalo khác! Vui lòng sử dụng email khác.`);
            return NextResponse.json({ message: 'Success' });
          }

          await supabaseAdmin.from('profiles').update({ zalo_id: `pending:${chatId}` }).eq('id', targetProfile.id);
          const { error } = await supabaseAdmin.auth.signInWithOtp({ email });

          if (error) {
            await sendMessage(chatId, `❌ Lỗi gửi OTP: ${error.message}`);
          } else {
            await sendMessage(chatId, `📧 Hệ thống đã gửi một mã OTP đến email **${email}**.\n\nVui lòng kiểm tra hộp thư (và thư mục Spam) sau đó nhập mã OTP vào đây để xác nhận liên kết tài khoản.`);
          }
          return NextResponse.json({ message: 'Success' });
        } else {
          await sendMessage(chatId, '⏳ Email chưa đăng ký, hệ thống đang tự động tạo tài khoản mới...');

          const generatedPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-5);
          const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: email,
            password: generatedPassword,
            email_confirm: true
          });

          if (authError) {
            await sendMessage(chatId, `❌ Lỗi tạo tài khoản: ${authError.message}`);
            return NextResponse.json({ message: 'Success' });
          }

          await new Promise(r => setTimeout(r, 1000));

          if (authData?.user) {
            await supabaseAdmin.from('profiles').update({ zalo_id: chatId }).eq('id', authData.user.id);
          }

          await sendMessage(chatId, `✅ Tự động tạo tài khoản và liên kết thành công!\n\n📧 Email: ${email}\n🔑 Mật khẩu: ${generatedPassword}\n\n💡 Bạn có thể dùng thông tin này để đăng nhập trên Web quản trị.\n\n🎉 Bây giờ bạn đã có thể gửi link Shopee!`);
          return NextResponse.json({ message: 'Success' });
        }
      }

      // Catch-all for unauthenticated users
      await sendMessage(chatId, NEED_AUTH_MESSAGE);
      return NextResponse.json({ message: 'Success' });
    }

    // --- 5. Authenticated flow: User has a valid linked profile ---
    // Bug #5 fix: Guard check — profile should always be defined here,
    // but protect against future code changes that might skip the return above.
    if (!profile) {
      return NextResponse.json({ message: 'Success' });
    }

    if (isUnsupported) {
      await sendMessage(chatId, UNSUPPORTED_MESSAGE_AUTHED);
      return NextResponse.json({ message: 'Success' });
    }

    // 5.1 Extract and find Shopee URL
    const urls = extractUrls(userText);
    if (urls.length === 0) {
      const withProtocol = 'https://' + userText;
      if (isValidShopeeUrl(withProtocol) || isShortLink(withProtocol)) {
        urls.push(withProtocol);
      }
    }

    if (urls.length === 0) {
      // Sent regular text after auth
      await sendMessage(chatId, HELP_MESSAGE);
      return NextResponse.json({ message: 'Success' });
    }

    const shopeeUrl = findShopeeUrl(urls);
    if (!shopeeUrl) {
      await sendMessage(chatId, NOT_SHOPEE_MESSAGE);
      return NextResponse.json({ message: 'Success' });
    }

    // 5.2 Process the Shopee link
    await sendChatAction(chatId);

    const affiliateId = process.env.SHOPEE_AFFILIATE_ID;
    if (!affiliateId) {
      await sendMessage(chatId, '❌ Bot chưa được cấu hình Affiliate ID. Vui lòng liên hệ admin.');
      return NextResponse.json({ message: 'Success' });
    }

    const subId1 = process.env.SHOPEE_SUB_ID || '';

    try {
      // Generate short_id for conversion tracking and sub_id2
      let shortId = '';
      for (let attempt = 0; attempt < 5; attempt++) {
        shortId = generateShortId();
        const { data: existing } = await supabaseAdmin
          .from('conversions')
          .select('id')
          .eq('short_id', shortId)
          .single();
        if (!existing) break;
      }

      // Process URL -> validate + build affiliate link (synchronous)
      const result = processShopeeUrl(shopeeUrl, affiliateId, subId1, shortId);

      // Fetch product info via OG meta tags
      let product = null;
      try {
        product = await getProductInfo(result.productUrl);
      } catch (err) {
        console.warn('Failed to fetch product info:', err.message);
      }

      // Save conversion to database for tracking
      if (shortId && profile.id) {
        try {
          const insertData = {
            short_id: shortId,
            user_id: profile.id,
            original_url: result.originalUrl,
            affiliate_url: result.affiliateLink,
            product_name: product?.name || 'Sản phẩm Shopee',
            product_image: product?.image || null,
            product_description: product?.description || null,
            source: 'zalo',
          };

          // Only include IDs if they were extracted
          if (result.shopId) insertData.shop_id = parseInt(result.shopId);
          if (result.itemId) insertData.item_id = parseInt(result.itemId);

          const { error: insertError } = await supabaseAdmin
            .from('conversions')
            .insert(insertData);

          if (insertError) console.error('Failed to save Zalo conversion:', insertError.message);
        } catch (dbErr) {
          console.error('DB insert error (Zalo):', dbErr.message);
        }
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
