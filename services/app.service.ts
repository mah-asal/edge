import type { ServiceSchema } from "moleculer";

const AppService: ServiceSchema = {
	name: "app",
	version: 'api.v1',

	/**
	 * Settings
	 */
	settings: {
	},

	/**
	 * Dependencies
	 */
	dependencies: [],

	/**
	 * Actions
	 */
	actions: {
		handshake: {
			visibility: "published",
			description: "In this action we are just returning application config and environment variables",
			async handler(ctx) {
				const configs: any = await ctx.call('api.v1.config.all');

				return {
					code: 200,
					data: {
						configs: configs.code == 200 ? configs.data : null,
					}
				}
			}
		},
	},

	/**
	 * Events
	 */
	events: {},

	/**
	 * Methods
	 */
	methods: {

	},

	/**
	 * Service created lifecycle event handler
	 */
	created() { },

	/**
	 * Service started lifecycle event handler
	 */
	async started() { },

	/**
	 * Service stopped lifecycle event handler
	 */
	async stopped() { },
};

export default AppService;
