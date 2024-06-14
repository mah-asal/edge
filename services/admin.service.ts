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
					const [resultOfUsers, resultOfOnlines, resultOfApps, resultOfDevices, resultOfNotifications, resultOfVersions]: any = await Promise.all([
						ctx.call('api.v1.profile.search', { limit: 1 }),
						ctx.call('v1.socket.onlines'),
						prisma.$queryRaw`SELECT COUNT(DISTINCT("user")) FROM "Device"`,
						prisma.$queryRaw`SELECT COUNT(DISTINCT("uuid")) FROM "Device"`,
						prisma.$queryRaw`SELECT COUNT(*) FROM "Notification"`,
						prisma.$queryRaw`SELECT COUNT(DISTINCT("uuid")), package FROM "Device" GROUP BY package`,
					]);										

					return {
						code: 200,
						data: {
							users: Number(resultOfUsers['meta']['total']).toLocaleString('fa-IR'),
							onlines: Number(resultOfOnlines['data']).toLocaleString('fa-IR'),
							apps:  Number(resultOfApps[0]['count']).toLocaleString('fa-IR'),
							devices:  Number(resultOfDevices[0]['count']).toLocaleString('fa-IR'),
							notifications:  Number(resultOfNotifications[0]['count']).toLocaleString('fa-IR'),
							versions: (resultOfVersions as any[]).reduce((prev, curr) => {
								return {
									...prev,
									[curr.package]: Number(curr.count),
								}
							}, {})
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

export default AdminService;
