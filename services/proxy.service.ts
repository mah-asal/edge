import type { ServiceSchema } from "moleculer";

import FormData from 'form-data';

import api from "../shared/api";

const ProxyService: ServiceSchema = {
	name: "proxy",
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
		request: {
			visibility: 'published',
			params: {
				path: {
					type: "string",
					optional: false,
				},
				method: {
					type: "enum",
					values: ["GET", "POST", "PUT", "DELETE"],
					default: "GET",
					optional: true,
				},
				header: {
					type: "object",
					optional: true,
					default: {}
				},
				data: {
					type: "object",
					optional: true,
					default: {}
				},
			},
			cache: {
				enabled: ctx => ctx.meta.cache,
				ttl: 120,
				keys: ['path', 'method', 'data', 'header'],
			},
			async handler(ctx) {
				try {
					const { path, method, header, data } = ctx.params;
					const token = ctx.meta.token;

					const body = new FormData();					

					Object.keys(data).forEach(key => {
						if(data[key]) {
							body.append(key, data[key]);
						}						
					});					

					const result: any = await api.request({
						method: method,
						path: path,
						token: token,
						data: body,
						headers: {
							...header,
							// form data
							'Content-Type': 'application/x-www-form-urlencoded',
						}
					});					

					return {
						code: 200,
						data: {
							status: result.code == 0,
							code: result.code,
							message:
								result.message ?
									result.message ?
										result.message[0]
										:
										null
									:
									result.messages ?
										result.messages[0]
										:
										null,
							data: result.returnData ?? result,
						}
					}
				} catch (error) {
					// console.error(error);
					console.log(error);

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

export default ProxyService;
