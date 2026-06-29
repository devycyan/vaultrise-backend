/**
 * Minimal Telegram sender. Sends to a specific chat id (a subscriber's id).
 * No-op (logs only) when TELEGRAM_BOT_TOKEN is unset, so the backend runs fine
 * without Telegram configured.
 */
import axios from "axios";
import { config } from "./config";

let warned = false;

export function telegramConfigured(): boolean {
  return Boolean(config.telegramBotToken);
}

export async function sendTelegram(chatId: string, text: string): Promise<void> {
  if (!config.telegramBotToken) {
    if (!warned) {
      console.warn("[telegram] TELEGRAM_BOT_TOKEN not set — alerts log only");
      warned = true;
    }
    console.log(`[telegram:off→${chatId}]`, text.replace(/\n/g, " · "));
    return;
  }
  try {
    await axios.post(
      `https://api.telegram.org/bot${config.telegramBotToken}/sendMessage`,
      {
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      },
      { timeout: 10_000 }
    );
  } catch (e: any) {
    console.error(`[telegram] send to ${chatId} failed:`, e?.response?.data?.description || e.message);
  }
}

/**
 * Long-poll for incoming messages and reply to /start with a confirmation. The
 * alert bot is otherwise send-only; this just gives users immediate feedback when
 * they open the bot. No-op without TELEGRAM_BOT_TOKEN. Uses getUpdates (polling),
 * so do NOT also configure a webhook for the same bot.
 */
export function startTelegramCommandListener(): void {
  if (!config.telegramBotToken) return;
  const base = `https://api.telegram.org/bot${config.telegramBotToken}`;
  let offset = 0;
  const loop = async (): Promise<void> => {
    for (;;) {
      try {
        const res = await axios.get(`${base}/getUpdates`, {
          params: { offset, timeout: 30 },
          timeout: 35_000,
        });
        for (const upd of res.data?.result ?? []) {
          offset = upd.update_id + 1;
          const msg = upd.message;
          const text: string = (msg?.text ?? "").trim();
          const chatId = msg?.chat?.id;
          // Matches "/start", "/start <param>" and "/start@BotName".
          if (chatId != null && /^\/start(@\w+)?(\s|$)/.test(text)) {
            await sendTelegram(String(chatId), "Chat with bot created, now you can register your telegram id on website");
          }
        }
      } catch {
        // transient (network, or 409 if a webhook is set) — back off and retry
        await new Promise((r) => setTimeout(r, 5_000));
      }
    }
  };
  console.log("[telegram] command listener: replying to /start");
  void loop();
}
