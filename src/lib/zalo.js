/**
 * Zalo Bot API helper
 * 
 * Dùng để gọi các API của Zalo Bot Platform:
 * - sendMessage: gửi tin nhắn text
 * - sendChatAction: hiển thị trạng thái "đang nhập..."
 * 
 * Docs: https://bot.zapps.me/docs/apis/sendMessage/
 */

const ZALO_BOT_API = 'https://bot-api.zaloplatforms.com';

function getBotToken() {
  const token = process.env.ZALO_BOT_TOKEN;
  if (!token || token === 'your_bot_token_here') {
    throw new Error('ZALO_BOT_TOKEN chưa được cấu hình trong .env.local');
  }
  return token;
}

/**
 * Gửi tin nhắn text đến người dùng
 * @param {string} chatId - ID cuộc hội thoại (lấy từ webhook message.chat.id)
 * @param {string} text - Nội dung tin nhắn
 */
export async function sendMessage(chatId, text) {
  const token = getBotToken();
  const url = `${ZALO_BOT_API}/bot${token}/sendMessage`;

  console.log('[Zalo] sendMessage →', { chatId, textLength: text.length });

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
    });

    const responseText = await response.text();
    console.log('[Zalo] sendMessage response:', response.status, responseText);

    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      console.error('[Zalo] sendMessage non-JSON response:', response.status, responseText);
      return { ok: false, error: `Non-JSON response: ${response.status}` };
    }

    if (!data.ok) {
      console.warn('[Zalo] sendMessage API error:', data.description || data.error_code);
      return { ok: false, error: data.description, errorCode: data.error_code };
    }

    return { ok: true, result: data.result };
  } catch (err) {
    console.error('[Zalo] sendMessage fetch error:', err.message);
    return { ok: false, error: err.message };
  }
}

/**
 * Gửi trạng thái "đang nhập..." cho người dùng
 * @param {string} chatId - ID cuộc hội thoại
 */
export async function sendChatAction(chatId) {
  const token = getBotToken();
  const url = `${ZALO_BOT_API}/bot${token}/sendChatAction`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, action: 'typing' }),
    });
    const text = await response.text();
    console.log('[Zalo] sendChatAction response:', response.status, text);
  } catch (err) {
    // Non-critical, log and continue
    console.warn('[Zalo] sendChatAction failed:', err.message);
  }
}
