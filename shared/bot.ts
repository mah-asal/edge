
import TelegramBot from "node-telegram-bot-api";

export default new TelegramBot(process.env.TELEGRAM_BOT_TOKEN as string, { polling: true });

export { TelegramBot }