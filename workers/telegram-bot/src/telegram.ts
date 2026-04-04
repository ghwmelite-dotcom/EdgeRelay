export class TelegramApi {
  constructor(private token: string) {}

  private async call(method: string, body: Record<string, unknown>): Promise<unknown> {
    const res = await fetch(`https://api.telegram.org/bot${this.token}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return res.json();
  }

  async sendMessage(
    chatId: number,
    text: string,
    parseMode: string = 'HTML',
    replyMarkup?: unknown,
  ): Promise<unknown> {
    return this.call('sendMessage', {
      chat_id: chatId,
      text,
      parse_mode: parseMode,
      ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
    });
  }

  async answerCallbackQuery(callbackQueryId: string, text?: string): Promise<unknown> {
    return this.call('answerCallbackQuery', {
      callback_query_id: callbackQueryId,
      ...(text ? { text } : {}),
    });
  }

  async setWebhook(url: string, secret: string): Promise<unknown> {
    return this.call('setWebhook', { url, secret_token: secret });
  }

  async setChatMenuButton(chatId: number, webAppUrl: string): Promise<unknown> {
    return this.call('setChatMenuButton', {
      chat_id: chatId,
      menu_button: {
        type: 'web_app',
        text: 'Dashboard',
        web_app: { url: webAppUrl },
      },
    });
  }
}
