import type { ServiceSchema } from "moleculer";
import { md5 } from "js-md5";
import api from "../shared/api";


const DropdownService: ServiceSchema = {
	name: "dropdown",
	version: 'api.v1',

	/**
	 * Settings
	 */
	settings: {
		dropdowns: [],
		maps: {},
		hash: '',
	},

	/**
	 * Dependencies
	 */
	dependencies: [],

	/**
	 * Actions
	 */
	actions: {
		list: {
			visibility: "published",
			description: "In this action we are just returning list of dropdowns",
			cache: {
				enabled: false,
				ttl: 3600
			},
			async handler(ctx) {
				try {
					await this.loadDropdown();

					return {
						code: 200,
						data: this.settings.dropdowns,
						meta: {
							total: this.settings.dropdowns.length,
							hash: this.settings.hash
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
		byGroup: {
			params: {
				key: {
					type: "string",
					min: 3
				},
			},
			visibility: "published",
			description: "In this action we are just returning list of dropdowns filtered by group key",
			cache: {
				enabled: true,
				ttl: 3600,
				keys: ['key']
			},
			async handler(ctx) {
				const { key } = ctx.params;

				try {
					const result: any[] = this.settings.dropdowns.filter((item: any) => item.group.toLowerCase() === key.toLowerCase());

					return {
						code: 200,
						data: result,
						meta: {
							total: result.length,
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
		byGroupAndValue: {
			params: {
				key: {
					type: "string",
					min: 3
				},
				value: {
					type: "string"
				},
			},
			visibility: "published",
			description: "In this action we are just returning list of dropdowns filtered by group key and value",
			cache: {
				enabled: false,
				// ttl for 1 hour
				ttl: 3600,
				keys: ['key', 'value']
			},
			async handler(ctx) {
				const { key, value } = ctx.params;

				try {
					const result: any = this.settings.maps[`${key}:${value}`];

					return {
						code: 200,
						data: result,
					}

				} catch (error) {
					console.error(error);

					return {
						code: 500
					}
				}
			}
		},
		byBulk: {
			visibility: "published",
			description: "In this action we are just returning list of dropdowns filtered by group key and value",
			params: {
				// bulk of group and value
				bulk: {
					type: "object",
				},
			},
			cache: {
				enabled: false,
				// ttl for 1 hour
				ttl: 3600,
			},
			async handler(ctx) {
				const { bulk } = ctx.params;

				try {
					const result: any = {};

					for (const key of Object.keys(bulk)) {
						const value = bulk[key];
						const _key = key.slice(0, 1).toLowerCase() + key.slice(1);
						result[_key] = this.settings.maps[`${key}:${value}`];
					}

					return {
						code: 200,
						data: result,
					}

				} catch (error) {
					console.error(error);

					return {
						code: 500
					}
				}
			}
		},
		groups: {
			visibility: 'published',
			cache: {
				enabled: true,
				// ttl for 1 hour
				ttl: 3600
			},
			async handler() {
				try {
					const result: any[] = this.settings.dropdowns.map((item: any) => item.group);
					const unique = [...new Set(result)];

					return {
						code: 200,
						data: unique,
						meta: {
							total: unique.length
						}
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
		formatDropdown(item: any) {
			return {
				id: item.id,
				text: item.name,
				value: item.value,
				order: item.order ?? 0,
				parent: item.parentId,
				group: item.keyGroup,
			}
		},
		async loadDropdown() {
			try {
				var result: any[] = await api.request({
					method: "GET",
					path: "/AppDropDown/GetAll"
				});

				this.settings.dropdowns = result.map(this.formatDropdown);

				// covert dropdowns to '{group}:{value}': {text} for mapping
				for (const item of this.settings.dropdowns) {
					const key = `${item.group}:${item.value}`;
					const value = item.text.trim();
					this.settings.maps[key] = value;
					await this.broker.cacher!.set(key, value, 0);
				}

				this.settings.hash = md5(JSON.stringify(this.settings.maps));

				await this.broker.call('api.v1.config.set', {
					key: 'hash:dropdowns',
					value: this.settings.hash,
				});

				return Promise.resolve();
			} catch (error) {
				return Promise.reject();
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
	started() {
		setTimeout(() => {
			this.loadDropdown().catch(() => { });
		}, 5000);
	},

	/**
	 * Service stopped lifecycle event handler
	 */
	async stopped() { },
};

export default DropdownService;
