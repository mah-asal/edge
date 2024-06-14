import type { ServiceSchema } from "moleculer";
import prisma from "../shared/prisma";


const DeviceService: ServiceSchema = {
	name: "device",
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
			visibility: 'published',
			description: 'Handshake device',
			params: {
				uuid: {
					type: 'string'
				},
				store: {
					type: 'enum',
					values: ['GOOGLEPLAY', 'MYKEY', 'CAFEBAZAAR', 'DIRECT', 'ANY'],
					default: 'ANY'
				},
				platform: {
					type: 'string'
				},
				device: {
					type: 'string'
				},
				brand: {
					type: 'string'
				},
				model: {
					type: 'string'
				},
				physical: {
					type: 'string'
				},
				version: {
					type: 'string'
				},
				screen: {
					type: 'string'
				},
				package: {
					type: 'string'
				},
				timestamp: {
					type: 'number'
				}
			},
			async handler(ctx) {
				try {
					const params = ctx.params;
					const { id, ip } = ctx.meta;


					const data = {
						...params,
						ip,
						user: id.toString()
					};

					await prisma.device.create({
						data,
					});

					ctx.emit('telegram.send', {
						type: 'handshake',
						data: data,
					});

					return {
						code: 200
					}
				} catch (error) {
					console.error(error);

					return {
						code: 500
					}
				}
			}
		},
		byUser: {
			visibility: 'published',
			description: 'Get list of user devices',
			permission: ['api.v1.device.byUser'],
			params: {
				user: {
					type: 'string',
					convert: true
				}
			},
			async handler(ctx) {
				try {
					const { user } = ctx.params;

					const result = await prisma.device.findMany({
						where: {
							user: user,
						}
					});

					return {
						code: 200,
						meta: {
							total: result.length,
						},
						data: result.map((item) => ({
							...item,
							timestamp: Number(item.timestamp)
						}))
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

export default DeviceService;
