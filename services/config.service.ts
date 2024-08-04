import type { ServiceSchema } from "moleculer";

import redis from "../shared/redis";
import endpoint from "../shared/endpoint";
import prisma from "../shared/prisma";

const CONFIG_SUFFIX = process.env.CONFIG_SUFFIX as string;

const keys = [
	"link:download",
	"link:contact-us",
	"link:blog",
	"link:search",
	"link:privacy",
	"app:latest-version",
	"app:deprecated-version",
	"config:free-account-time",
	"config:free-account-visable",
	"config:free-account-active-automatically",
	"config:visitation-hours",
	"config:invitation-message",
	"config:captcha",
	"config:feedback",
	"config:discount",
	"hash:dropdowns",
	"endpoint:api",
	"endpoint:public",
	"endpoint:public:dating",
	"endpoint:public:social",
	"endpoint:invite",
	"endpoint:bank:redirect",
	"payment:card-number",
	"payment:card-name",
	"payment:card-color",
	"payment:card-bank",
	"cafebazaar:accessToken",
	"cafebazaar:refreshToken",
	"cafebazaar:jwtSecret",
	"myket:token"
].sort();

const ConfigService: ServiceSchema = {
	name: "config",
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
		all: {
			visibility: "published",
			description: "In this action we are just returning application config",
			params: {
				store: {
					type: 'enum',
					values: ['GOOGLEPLAY', 'MYKEY', 'CAFEBAZAAR', 'DIRECT', 'ANY'],
					default: 'ANY'
				}
			},
			async handler(ctx) {
				try {
					const { store } = ctx.params;

					const { total, stores, values } = await this.getConfigs(store);

					return {
						code: 200,
						meta: {
							total,
							stores,
						},
						data: keys.reduce((prev, curr) => {
							return {
								...prev,
								[curr]: values[curr] ?? null,
							}
						}, {})
					}
				} catch (error) {
					console.error(error);

					return {
						code: 500
					}
				}
			}
		},
		set: {
			visibility: "published",
			description: "In this action we are just setting application config",
			permission: ["api.v1.config.set"],
			params: {
				key: {
					type: "enum",
					values: keys
				},
				value: [
					{
						type: "string"
					},
					{
						type: "number"
					}
				],
				store: {
					type: 'enum',
					values: ['GOOGLEPLAY', 'MYKEY', 'CAFEBAZAAR', 'DIRECT', 'ANY'],
					default: 'ANY'
				}
			},
			async handler(ctx) {
				const { key, value, store } = ctx.params;

				const one = await prisma.config.findFirst({
					where: {
						key,
						store,
					}
				});

				if (one) {
					await prisma.config.update({
						where: {
							id: one.id
						},
						data: {
							value
						}
					});
				} else {
					await prisma.config.create({
						data: {
							key,
							value,
							store
						}
					});
				}

				if (key === 'endpoint:api') {
					endpoint.api = value;
				}

				await this.emitConfigChanged(store);

				return {
					code: 200,
				}
			},
		},
		unset: {
			visibility: "published",
			description: "In this action we are just unsetting application config",
			permission: ["api.v1.config.unset"],
			params: {
				key: {
					type: "enum",
					values: keys
				},
				store: {
					type: 'enum',
					values: ['GOOGLEPLAY', 'MYKEY', 'CAFEBAZAAR', 'DIRECT', 'ANY'],
					default: 'ANY'
				}
			},
			async handler(ctx) {
				const { key, store } = ctx.params;

				const one = await prisma.config.findFirst({
					where: {
						key,
						store,
					}
				});

				if (one) {
					await prisma.config.delete({
						where: {
							id: one.id
						}
					});
				}

				if (key === 'endpoint:api') {
					endpoint.api = '';
				}

				await this.emitConfigChanged(store);

				return {
					code: 200,
				}
			},
		},
		get: {
			visibility: "published",
			description: "In this action we are just returning application config",
			permission: ["api.v1.config.get"],
			params: {
				key: {
					type: "enum",
					values: keys
				},
				store: {
					type: 'enum',
					values: ['GOOGLEPLAY', 'MYKEY', 'CAFEBAZAAR', 'DIRECT', 'ANY'],
					default: 'ANY'
				}
			},
			async handler(ctx) {
				const { key, store } = ctx.params;

				const one = await prisma.config.findFirst({
					where: {
						key,
						store,
					}
				});

				return {
					code: 200,
					data: one?.value ?? null,
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
		async emitConfigChanged(store: string = 'ANY') {
			try {
				const configs = await this.getConfigs(store);

				this.broker.emit('config.changed', configs);
			} catch (error) {
				//
			}
		},
		async getConfigs(store: string = 'ANY') {
			const stores = Array.from(new Set(['ANY', store]));

			try {

				const data = await prisma.config.findMany({
					where: {
						OR: stores.map((store: string) => ({
							store,
						}))
					}
				});

				const values: any = data.reduce((prev, curr) => {
					return {
						...prev,
						[curr.key]: curr.value
					}
				}, {});

				return {
					stores,
					total: data.length,
					values,
				}
			} catch (error) {
				return {
					stores,
					total: 0,
					values: {}
				}
			}
		}
	},

	/**
	 * Service created lifecycle event handler
	 */
	created() { },

	/**
	 * Service started lifecycle event handler
	 */
	async started() {
		setTimeout(async () => {
			const result = await prisma.config.findFirst({
				where: {
					key: 'endpoint:api'
				}
			});

			if(result) {
				endpoint.api = result?.value;
			}
		}, 1000);
	},

	/**
	 * Service stopped lifecycle event handler
	 */
	async stopped() { },
};

export default ConfigService;
