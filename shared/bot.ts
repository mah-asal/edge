
import TelegramBot from "node-telegram-bot-api";

export default process.env.TELEGRAM_BOT_TOKEN ? new TelegramBot(process.env.TELEGRAM_BOT_TOKEN as string, { polling: true }) : null;

export { TelegramBot }