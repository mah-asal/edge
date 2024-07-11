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

					const [resultOfUsers, resultOfOnlines, resultOfFeedbacks, [resultOfApps, resultOfDevices, resultOfNotifications, resultOfSuccessfullSentNotifications, resultOfFailedSentNotifications, resultOfPackages, resultOfStores, resultOfVersions, resultOfBrands]]: any = await Promise.all([
						ctx.call('api.v1.profile.search', { limit: 1 }),
						ctx.call('v1.socket.onlines'),
						ctx.call('api.v1.feedback.count'),
						prisma.$transaction([
							prisma.$queryRaw`SELECT COUNT(DISTINCT("user")) FROM "Device"`,
							prisma.$queryRaw`SELECT COUNT(DISTINCT("uuid")) FROM "Device"`,
							prisma.$queryRaw`SELECT COUNT(*) FROM "Notification"`,
							prisma.$queryRaw`SELECT COUNT(*) FROM "NotificationSend" WHERE sent='true'`,
							prisma.$queryRaw`SELECT COUNT(*) FROM "NotificationSend" WHERE sent='false'`,
							prisma.$queryRaw`SELECT COUNT(DISTINCT("uuid")), package FROM "Device" GROUP BY package`,
							prisma.$queryRaw`SELECT COUNT(DISTINCT("uuid")), store FROM "Device" GROUP BY store`,
							prisma.$queryRaw`SELECT COUNT(DISTINCT("uuid")), version FROM "Device" GROUP BY version`,
							prisma.$queryRaw`SELECT COUNT(DISTINCT(uuid)), LOWER(brand) FROM public."Device" GROUP BY LOWER(brand)`,
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
							users: Number(resultOfUsers['meta']['total']).toLocaleString('fa-IR'),
							onlines: Number(resultOfOnlines['data']).toLocaleString('fa-IR'),
							apps: Number(resultOfApps[0]['count']).toLocaleString('fa-IR'),
							devices: Number(resultOfDevices[0]['count']).toLocaleString('fa-IR'),
							notifications: Number(resultOfNotifications[0]['count']).toLocaleString('fa-IR'),
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
				}
			},
			async handler(ctx) {
				try {
					const { page, limit } = ctx.params;

					const start = Date.now();

					const [count, notifications] = await prisma.$transaction([
						prisma.notificationSend.count({
							where: {

							},
						}),
						prisma.notificationSend.findMany({
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
						data: notifications,
					}
				} catch (error) {
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

export default AdminService;
