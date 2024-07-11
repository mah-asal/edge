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
		list: {
			visibility: 'published',
			description: 'Get list of feedbacks',
			permission: ['api.v1.feedback.list'],
			params: {
				page: {
					type: 'number',
					convert: true,
					min: 1,
					default: 1
				},
				limit: {
					type: 'number',
					convert: true,
					min: 10,
					max: 100,
					default: 10
				}
			},
			async handler(ctx) {
				try {
					const { page, limit } = ctx.params;

					const start = Date.now();

					const [count, feedbacks] = await prisma.$transaction([
						prisma.feedbackScore.count({
							where: {

							},
						}),
						prisma.feedbackScore.findMany({
							skip: (page - 1) * limit,
							take: limit,
							orderBy: {
								id: "desc",
							},
							where: {

							},
						}),
					]);

					return {
						code: 200,
						meta: {
							page,
							limit,
							total: count,
							last: Math.max(Math.ceil(count / limit), 1),
							took: Date.now() - start,
						},
						data: feedbacks,
					}
				} catch (error) {
					return {
						code: 500
					}
				}
			},
		},
		count: {
			visibility: 'published',
			description: 'Get count of notifications by scores',
			permission: ['api.v1.feedback.count'],
			async handler(ctx) {
				try {
					const start = Date.now();

					const [total, one, two, three, four, five]: any[] = await prisma.$transaction([
						prisma.$queryRaw`SELECT COUNT(*) FROM "FeedbackScore"`,
						prisma.$queryRaw`SELECT COUNT(*) FROM "FeedbackScore" WHERE score='1'`,
						prisma.$queryRaw`SELECT COUNT(*) FROM "FeedbackScore" WHERE score='2'`,
						prisma.$queryRaw`SELECT COUNT(*) FROM "FeedbackScore" WHERE score='3'`,
						prisma.$queryRaw`SELECT COUNT(*) FROM "FeedbackScore" WHERE score='4'`,
						prisma.$queryRaw`SELECT COUNT(*) FROM "FeedbackScore" WHERE score='5'`,
					]);

					return {
						code: 200,
						meta: {
							took: Date.now() - start,
						},
						data: {
							total: Number(total[0]['count']),
							one: Number(one[0]['count']),
							two: Number(two[0]['count']),
							three: Number(three[0]['count']),
							four: Number(four[0]['count']),
							five: Number(five[0]['count']),
						}
					}
				} catch (error) {
					console.error(error);

					return {
						code: 500
					}
				}
			}
		}
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
