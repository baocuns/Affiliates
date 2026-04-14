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

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text }),
  });

  const data = await response.json();

  if (!data.ok) {
    console.error('Zalo sendMessage error:', data);
    throw new Error(`sendMessage failed: ${JSON.stringify(data)}`);
  }

  return data.result;
}

/**
 * Gửi trạng thái "đang nhập..." cho người dùng
 * @param {string} chatId - ID cuộc hội thoại
 */
export async function sendChatAction(chatId) {
  const token = getBotToken();
  const url = `${ZALO_BOT_API}/bot${token}/sendChatAction`;

  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, action: 'typing' }),
    });
  } catch (err) {
    // Non-critical, log and continue
    console.warn('sendChatAction failed:', err.message);
  }
}
