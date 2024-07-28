import type { ServiceSchema } from "moleculer";
import prisma from "../shared/prisma";

const AdminService: ServiceSchema = {
	name: "admin",
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
		counts: {
			visibility: 'published',
			description: 'Get counts of everythings admin wants',
			permission: ['api.v1.admin.counts'],
			async handler(ctx) {
				try {
					const start = Date.now();

					const [resultOfFranceOnlines, resultOfIranOnlines, resultOfFeedbacks, [resultOfApps, resultOfDevices, resultOfNotifications, resultOfSuccessfullSentNotifications, resultOfFailedSentNotifications, resultOfPackages, resultOfStores, resultOfVersions, resultOfBrands, resultOfTotalPayments]]: any = await Promise.all([
						ctx.call('v1.socket.onlines', {}, {
							nodeID: 'edge@france'
						}),
						ctx.call('v1.socket.onlines', {}, {
							nodeID: 'edge@iran'
						}),
						ctx.call('api.v1.feedback.count'),
						prisma.$transaction([
							prisma.$queryRaw`SELECT COUNT(DISTINCT("user")) FROM "Device" WHERE updated='false'`,
							prisma.$queryRaw`SELECT COUNT(DISTINCT("uuid")) FROM "Device" WHERE updated='false'`,
							prisma.$queryRaw`SELECT COUNT(*) FROM "Notification"`,
							prisma.$queryRaw`SELECT COUNT(*) FROM "NotificationSend" WHERE sent='true'`,
							prisma.$queryRaw`SELECT COUNT(*) FROM "NotificationSend" WHERE sent='false'`,
							prisma.$queryRaw`SELECT COUNT(DISTINCT("user")), package FROM "Device" WHERE updated='false' GROUP BY package`,
							prisma.$queryRaw`SELECT COUNT(DISTINCT("user")), store FROM "Device" WHERE updated='false' GROUP BY store`,
							prisma.$queryRaw`SELECT COUNT(DISTINCT("user")), version FROM "Device" WHERE updated='false' GROUP BY version`,
							prisma.$queryRaw`SELECT COUNT(DISTINCT("user")), LOWER(brand) FROM public."Device" GROUP BY LOWER(brand)`,
							prisma.$queryRaw`SELECT SUM(price) as total FROM public."PaymentLog" WHERE payied='true'`
						]),
					]);


					const reduce = (data: any[], key: string) => data.reduce((prev, curr) => {
						return {
							...prev,
							[curr[key]]: Number(curr.count),
						}
					}, {});

					return {
						code: 200,
						meta: {
							took: Date.now() - start,
						},
						data: {
							feedback: resultOfFeedbacks['data'],
							users: 0,
							onlines: Number(resultOfFranceOnlines['data'] + resultOfIranOnlines['data']).toLocaleString('fa-IR'),
							apps: Number(resultOfApps[0]['count']).toLocaleString('fa-IR'),
							devices: Number(resultOfDevices[0]['count']).toLocaleString('fa-IR'),
							notifications: Number(resultOfNotifications[0]['count']).toLocaleString('fa-IR'),
							payments: Number(resultOfTotalPayments[0]['total']).toLocaleString('fa-IR'),
							sentSuccessfullNotifications: Number(resultOfSuccessfullSentNotifications[0]['count']),
							sentFailedNotifications: Number(resultOfFailedSentNotifications[0]['count']),
							sentNotifications: Number(resultOfSuccessfullSentNotifications[0]['count'] + resultOfFailedSentNotifications[0]['count']).toLocaleString('fa-IR'),
							packages: reduce(resultOfPackages, 'package'),
							stores: reduce(resultOfStores, 'store'),
							versions: reduce(resultOfVersions, 'version'),
							brands: reduce(resultOfBrands, 'lower'),

						}
					}
				} catch (error) {
					console.error(error);

					return {
						code: 500
					}
				}
			}
		},
		notifications: {
			visibility: 'published',
			permission: ['api.v1.admin.notifications'],
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
				},
				user: {
					type: 'string',
					optional: true,
					convert: true
				}
			},
			async handler(ctx) {
				try {
					const { page, limit, user } = ctx.params;

					const start = Date.now();

					let where: any = {};

					if (user) {
						where['user'] = user;
					}

					const [count, notifications] = await prisma.$transaction([
						prisma.notificationSend.count({
							where: where
						}),
						prisma.notificationSend.findMany({
							skip: (page - 1) * limit,
							take: limit,
							orderBy: {
								id: "desc",
							},
							where: where
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
						data: notifications.map((item) => ({
							id: item.id,
							device: item.device,
							user: item.user,
							sent: item.sent,
							title: item.title,
							body: item.body,
							createdAt: item.createdAt
						})),
					}
				} catch (error) {
					return {
						code: 500
					}
				}
			}
		},
		feedbacks: {
			visibility: 'published',
			description: 'Get list of feedbacks',
			permission: ['api.v1.admin.feedbacks'],
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
				},
				user: {
					type: 'string',
					optional: true,
					convert: true
				}
			},
			async handler(ctx) {
				try {
					const { page, limit, user } = ctx.params;

					const start = Date.now();

					let where: any = {};

					if (user) {
						where['user'] = user;
					}

					const [count, feedbacks] = await prisma.$transaction([
						prisma.feedbackScore.count({
							where: where
						}),
						prisma.feedbackScore.findMany({
							skip: (page - 1) * limit,
							take: limit,
							orderBy: {
								id: "desc",
							},
							where: where
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
		payments: {
			visibility: 'published',
			description: 'Get list of payment logs',
			permission: ['api.v1.admin.payments'],
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
				},
				user: {
					type: 'string',
					optional: true,
					convert: true
				}
			},
			async handler(ctx) {
				try {
					const { page, limit, user } = ctx.params;

					const start = Date.now();

					let where: any = {};

					if (user) {
						where['user'] = user;
					}

					const [count, payments] = await prisma.$transaction([
						prisma.paymentLog.count({
							where: where
						}),
						prisma.paymentLog.findMany({
							skip: (page - 1) * limit,
							take: limit,
							orderBy: {
								id: "desc",
							},
							where: where
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
						data: payments,
					}
				} catch (error) {
					return {
						code: 500
					}
				}
			},
		},
		devices: {
			visibility: 'published',
			description: 'Get list of devices',
			permission: ['api.v1.admin.devices'],
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
				},
				user: {
					type: 'string',
					optional: true,
					convert: true
				}
			},
			async handler(ctx) {
				try {
					const { page, limit, user } = ctx.params;

					const start = Date.now();

					let where: any = {};

					if (user) {
						where['user'] = user;
					}

					const [count, devices] = await prisma.$transaction([
						prisma.device.count({
							where: where
						}),
						prisma.device.findMany({
							skip: (page - 1) * limit,
							take: limit,
							orderBy: {
								id: "desc",
							},
							where: where
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
						data: devices.map((item) => ({
							id: item.id,
							user: item.user,
							uuid: item.uuid,
							store: item.store,
							device: item.device,
							version: item.version,
							screen: item.screen,
							package: item.package,
							brand: item.brand,
							model: item.model,
							ip: item.ip,
							timestamp: Number(item.timestamp),
						})),
					}
				} catch (error) {
					return {
						code: 500
					}
				}
			},
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

export default AdminService;
