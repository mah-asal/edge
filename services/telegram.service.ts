import type { ServiceSchema } from "moleculer";
import bot, { TelegramBot } from "../shared/bot";

const TelegramService: ServiceSchema<{ bot: TelegramBot | null, recivers: string[] }> = {
    name: "telegram",
    version: 'api.v1',

    /**
     * Settings
     */
    settings: {
        bot: bot,
        recivers: ['-1002205874697'],
    },

    /**
     * Dependencies
     */
    dependencies: [],

    /**
     * Actions
     */
    actions: {

    },

    /**
     * Events
     */
    events: bot == null ? {} : {
        async 'telegram.send'(ctx: any) {
            try {
                const { type, data } = ctx.params;

                let message = '';

                switch (type) {
                    case 'handshake':
                        message = `#handshake\n🛜 ${data['ip']}\n🆔 ${data['user']}\n🛒 ${data['store']}\n📱 ${data['brand']} ${data['model']} (Android ${data['version']})\n🛟 ${data['uuid']}\n🔨 ${data['package']}`;
                        break;

                    case 'feedback':
                        message = `#feedback\n🛜 ${data['ip']}\n🆔 ${data['user']}\n🛒 ${data['store']}\n🛟 ${data['device']}\n\n⭐️ ${data['score']}\n💬 ${data['message'] ?? 'متنی ارسال نشده است'}`;
                        break;

                    default:
                        break;
                }

                if (message.length != 0) {
                    for (let reciver of this.settings.recivers) {
                        this.settings.bot.sendMessage(reciver, message)
                    }
                }
            } catch (error) {
                //
            }
        }
    },

    /**
     * Methods
     */
    methods: {

    },

    /**
     * Service created lifecycle event handler
     */
    created() {

    },

    /**
     * Service started lifecycle event handler
     */
    async started() {
        if (this.settings.bot) {
            this.settings.bot.on('text', (msg) => {
                if (msg.text == '/start') {
                    this.settings.bot!.sendMessage(
                        msg.chat.id,
                        `🆔 ${msg.from?.id}`
                    );
                }
            });
        }
    },

    /**
     * Service stopped lifecycle event handler
     */
    async stopped() { },
};

export default TelegramService;
