import type { ServiceSchema } from "moleculer";
import prisma from "../shared/prisma";

const FeedbackService: ServiceSchema = {
	name: "feedback",
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
		submit: {
			visibility: 'published',
			description: 'Submit a feedback',
			params: {
				score: {
					type: 'number',
					convert: true,
					min: 1,
					max: 5
				},
				message: {
					type: 'string',
					optional: true,
					default: ''
				},
				store: {
					type: 'enum',
					values: ['GOOGLEPLAY', 'MYKEY', 'CAFEBAZAAR', 'DIRECT', 'ANY'],
					default: 'ANY'
				},
				device: {
					type: 'string'
				}
			},
			async handler(ctx) {
				try {
					const { score, message, store, device } = ctx.params;
					const { id, ip } = ctx.meta;

					const data = {
						user: id.toString(),
						score: score.toString(),
						message: message.length == 0 ? null : message,
						store,
						device,
						ip
					};

					await prisma.feedbackScore.create({
						data,
					});

					ctx.emit('telegram.send', {
						type: 'feedback',
						data,
					});

					return {
						code: 200
					}
				} catch (error) {
					return {
						code: 500
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

export default FeedbackService;
