import type { ServiceSchema } from "moleculer";

import redis from "../shared/redis";
import endpoint from "../shared/endpoint";

const keys = [
	"link:contact-us",
	"link:blog",
	"app:latest-version", // to show
	"app:latest-version-code", // to compare
	"config:free-account-time",
	"hash:dropdowns",
	"endpoint:api",
	"payment:card-number",
	"payment:card-name",
	"payment:card-color",
	"payment:card-bank"
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
            permission: ["api.v1.config.all"],
            async handler(ctx) {
                const configs = await this.getConfigs();

                return {
                    code: 200,
                    data: configs,
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
				]
			},
			async handler(ctx) {
				const { key, value } = ctx.params;

				await redis.set('#mahasal:' + key, value);

				if (key === 'endpoint:api') {
					endpoint.api = value;
				}

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
				}
			},
			async handler(ctx) {
				const { key } = ctx.params;

				await redis.del('#mahasal:' + key);

				if (key === 'endpoint:api') {
					endpoint.api = '';
				}

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
                }
            },
            async handler(ctx) {
                const { key } = ctx.params;
                const value = await redis.get('#mahasal:' + key);

                return {
                    code: 200,
                    data: value,
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
		async getConfigs() {
			try {

				const values = await redis.mget(keys.map((key: string) => '#mahasal:' + key));

				// return like this => {[key]: value}
				const result = keys.reduce((acc: any, key, index) => {
					acc[key] = values[index] ?? null;
					return acc;
				}, {});

				return result;
			} catch (error) {
				return null;
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
		// set endpoint from redis
		const endpointValue = await redis.get('#mahasal:endpoint:api');		

		if (endpointValue) {
			endpoint.api = endpointValue;			
		}
	},

	/**
	 * Service stopped lifecycle event handler
	 */
	async stopped() { },
};

export default ConfigService;
