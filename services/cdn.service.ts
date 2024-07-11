import type { ServiceSchema } from "moleculer";
import prisma from "../shared/prisma";

const CDNService: ServiceSchema = {
	name: "cdn",
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
		exists: {
			visibility: 'published',
			description: 'File hash checked in database to prevent reupload file',
			params: {
				hash: {
					type: 'string'
				}
			},
			async handler(ctx) {
				try {
					const { hash } = ctx.params;

					const one = await prisma.file.findFirst({
						where: {
							hash,
						}
					});

					if(one) {
						return {
							code: 200,
							data: one
						}
					}

					return {
						code: 404
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

export default CDNService;
