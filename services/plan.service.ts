import type { ServiceSchema } from "moleculer";

import cheerio from "cheerio";

import axios from "axios";
import qs from "qs";
import api from "../shared/api";
import prisma from "../shared/prisma";

const PlanService: ServiceSchema = {
	name: "plan",
	version: 'api.v1',

	/**
	 * Settings
	 */
	settings: {
		types: {
			'0': 'special',
			'1': 'sms',
			'3': 'ad'
		},
		cafebazaarAccessToken: "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3MjEyNzM2MjUsInVzZXJfaWQiOjY3OTcxNTkzLCJzY29wZXMiOlsiYW5kcm9pZHB1Ymxpc2hlciJdfQ.FWH00AdTKWG3QCF9h2J34oWKy5GoGs6nAJ2up4145JIcIZeazzNFrtYgaGPDJVbSrIAx8zaYMItJgimz6c2yZpDO5NphAAsHiNjXd5-MJln1PQREIeQB0y7ni7VJ2Mgy4S9NC3y7nc6my73TLL0WcyhwEGj2udvVdFgH0WkhXy_L0x0W85Gf--6AuQS8ipyUG6zYKRhHHAHJ4p8DCBeGd5GnVJZgB2Cag4Sq--TxZjtb0xUlakXpmQU53sSbX6drdgPxrNv8DFT8UPLffMaO8FAy3NK2g6Ysxel8bbRSdYPxPVHzr0HovrmsFPcZCSGKE4v5bMjrpA5p3uJi7VuY52yBEzfn_EEu8PIinf_BisqmTcPnShnpWbGRCFVRKGGTJOgl0swiQhDxSAXjxc97Kiht8LzEq9H9cZHRV6sxn8R3GKgoql-NTQlSvb_0xyc7c6k090F_mOGE0-vX8fpkUAsAMSKjvOKJfNdL0047DEfxkJOnf6lrMxUefsYeHY0srWKv7Gs7MS9R-EvTZmKIkMetv5mf6V4YrPXWiZoAdFEpaCniRtbOaLVByx73XvAXR4EqDvPNnPzHiMOOVoN9I9W3GD63pM975uSe644gJ5mIMxJY07pQQNOfJTHqf6lJgrLThvXhVgAREIfNSwDMaaPN06IGMWbaAwiic30t3vs",
		myketToken: "fbc2e22e-c857-4269-a534-8d1f30c81c87",
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
			visibility: 'published',
			description: 'Get all plans',
			params: {
				store: {
					type: 'enum',
					values: ['default', 'cafebazaar', 'myket'],
					default: 'default'
				}
			},
			cache: {
				enabled: ctx => ctx.meta.cache,
				ttl: 120,
				keys: ['store'],
			},
			async handler(ctx) {
				try {
					const { store } = ctx.params;
					const start = Date.now();

					var result = await api.request({
						method: 'GET',
						path: '/Plan?pageSize=100',
						token: ctx.meta.token,
					});

					let data: any[] = result.returnData.items.map((item: any) => {
						return {
							id: item['id'],
							title: item['title'],
							description: cheerio.load(item['body']).text(),
							price: item['price'],
							badge: item['minutesCount'] == null ? null : `${Math.round(item['minutesCount'] / 1440)} روزه`,
							type: this.settings.types[item['planType']],
							order: item['displayOrder'],
							storeProductId: item['productIdStore'] ?? null,
							store: item['storeName'] ?? null,
						}
					});

					if (store == 'default') {
						data = data.filter((item: any) => item['store'] == null)
					}

					if (store == 'cafebazaar') {
						data = data.filter((item: any) => item['store'] == 'bazar')
					}

					if (store == 'myket') {
						data = data.filter((item: any) => item['store'] == 'myket')
					}

					data.sort((a: any, b: any) => {
						if (a.type < b.type) {
							return -1;
						}
						if (a.type > b.type) {
							return 1;
						}
						return 0;
					});

					data.sort((a: any, b: any) => {
						if (a.order < b.order) {
							return -1;
						}
						if (a.order > b.order) {
							return 1;
						}
						return 0;
					});

					return {
						code: 200,
						meta: {
							limit: 100,
							total: data.length,
							took: Date.now() - start,
						},
						data: data,
					}
				} catch (error) {
					return {
						code: 500
					}
				}
			}
		},
		cart: {
			visibility: 'published',
			description: 'Generate a new cart',
			params: {
				'plans': {
					type: 'array',
					min: 1,
					items: {
						type: 'number',
						convert: true,
						min: 1
					},
				},
			},
			async handler(ctx) {
				try {
					const { plans } = ctx.params;
					const { token } = ctx.meta;

					const start = Date.now();

					let queries = plans.map((plan: string) => `planIds=${plan}`)

					await api.request({
						method: 'POST',
						path: `/plan/CreateFactorByPlanIds?${queries.join('&')}`,
						token: token
					});

					const result = await api.request({
						method: 'GET',
						path: '/Plan/ShowCurrentFactor',
						token: token,
					});

					return {
						code: 200,
						meta: {
							took: Date.now() - start,
						},
						data: {
							id: result['id'],
							price: result['price'],
							plans: result['factorDetails'].map((item: any) => ({
								id: item['shopPlan']['id'],
								title: item['shopPlan']['title'],
								price: item['price'],
							})),
						}
					}
				} catch (error) {
					console.error(error);

					return {
						code: 500,
					}
				}
			}
		},
		pay: {
			visibility: 'published',
			description: 'Request for payment by Bank gateway or Card to Card',
			params: {
				method: {
					type: 'enum',
					values: ['gateway', 'card', 'cafebazaar', 'myket'],
					default: 'gateway'
				},
				card: {
					type: 'object',
					props: {
						price: 'number',
						year: {
							type: 'number',
							convert: true,
						},
						month: {
							type: 'number',
							convert: true,
						},
						day: {
							type: 'number',
							convert: true,
						},
						hour: {
							type: 'number',
							convert: true,
						},
						minute: {
							type: 'number',
							convert: true,
						},
						tracking: 'string',
						card: 'string',
						description: {
							type: 'string',
							optional: true,
							default: '',
						},
						image: {
							type: 'string',
							default: null,
							optional: true,
						}
					},
					optional: true,
					default: null
				},
				data: {
					type: "object",
					props: {
						sku: {
							type: 'number',
							convert: true
						},
						token: {
							type: "string"
						}
					},
					optional: true,
					default: null
				},
			},
			async handler(ctx) {
				try {
					const { method, card, data: inapp } = ctx.params;
					const { token, id } = ctx.meta;

					let data: any = undefined;
					let i18n: string = 'OK';

					const start = Date.now();

					// 1. get current factor
					const current = await api.request({
						method: 'GET',
						path: '/Plan/ShowCurrentFactor',
						token: token,
					});

					const price = current['price'] ?? 0;
					const factor = current['id'];

					if (price == 0) {
						return {
							code: 400,
							i18n: 'PRICE_IS_ZERO'
						}
					}

					if (method == 'gateway') {
						const configOfBankRedirectEndpoint: any = await ctx.call('api.v1.config.get', {
							key: 'endpoint:bank:redirect',
						});

						if (configOfBankRedirectEndpoint.data) {
							const callback = configOfBankRedirectEndpoint.data;

							const result = await api.request({
								method: 'GET',
								path: `/Factor/PayOnline?callbackUrl=${callback}`,
								token: token,
							});

							const url = result['returnData'];

							if (result['returnData']) {
								data = {
									url: url,
								};

								await prisma.paymentLog.create({
									data: {
										user: id.toString(),
										factor: factor.toString(),
										price: price,
										method: method,
										payied: false,
									}
								});
							}
						}
					}

					if (method == 'card') {
						if (card == null) {
							return {
								"status": false,
								"code": 400,
								"i18n": "BAD_DATA",
								"message": "Parameters validation error!",
								"data": [
									{
										"message": "The 'card' field is required",
										"field": "card",
										"error": "required"
									}
								]
							}
						}

						const formData: any = {
							Price: card.price,
							PayDateYear: card.year,
							PayDateMounth: card.month,
							PayDateDay: card.day,
							PayDateHour: card.hour,
							PayDateMinute: card.minute,
							SaleReferenceID: card.tracking,
							CardNumber: card.card,
							Description: card.description,
							PayImageUrl: card.image,
						};

						const result = await api.request({
							method: 'POST',
							path: '/Factor/PayByCard',
							data: formData,
							token: token,
						});

						if (result.returnData) {
							data = result;
							i18n = 'REQUEST_SUBMITED'

							await prisma.paymentLog.create({
								data: {
									user: id.toString(),
									factor: factor.toString(),
									price: price,
									method: method,
									payied: true,
								}
							});
						}
					}

					if (method == 'cafebazaar') {
						const { sku, token: purchasesToken } = inapp;
						const url = `https://pardakht.cafebazaar.ir/devapi/v2/api/validate/com.mahasal.app.mahasal/inapp/${sku}/purchases/${purchasesToken}?access_token=${this.settings.cafebazaarAccessToken}`;

						const result = await axios.get(url);

						if (result.status == 200) {
							const { consumptionState } = result.data;

							if (consumptionState == 0) {
								const result = await api.request({
									method: 'GET',
									path: `/factor/PayForce`,
									token: token
								});


								if (result.code == 0) {
									data = {

									};

									await prisma.paymentLog.create({
										data: {
											user: id.toString(),
											factor: factor.toString(),
											price: price,
											method: method,
											payied: true,
										}
									});
								}
							}
						}
					}

					if (method == "myket") {
						const { sku, token: purchasesToken } = inapp;
						const url = `https://developer.myket.ir/api/partners/applications/com.mahasal.app.mahasal/purchases/products/${sku}/tokens/${purchasesToken}`;

						const result = await axios.get(url, {
							headers: {
								'X-Access-Token': this.settings.myketToken
							}
						});

						if (result.status == 200) {
							const { consumptionState } = result.data;

							if (consumptionState == 0) {
								const result = await api.request({
									method: 'GET',
									path: `/factor/PayForce`,
									token: token
								});


								if (result.code == 0) {
									data = {

									};

									await prisma.paymentLog.create({
										data: {
											user: id.toString(),
											factor: factor.toString(),
											price: price,
											method: method,
											payied: true,
										}
									});
								}
							}
						}
					}

					return {
						code: data ? 200 : 400,
						i18n: i18n,
						meta: {
							took: Date.now() - start,
						},
						data: data
					}
				} catch (error) {
					console.error(error);

					return {
						code: 500,
					}
				}
			}
		},
		validate: {
			visibility: 'published',
			description: 'Validate bank gateway',
			params: {
				data: {
					type: 'object',
				}
			},
			async handler(ctx) {
				try {
					const { data } = ctx.params;
					const { token } = ctx.meta;

					const queries = qs.stringify(data);

					const start = Date.now();

					const result = await api.request({
						method: 'GET',
						path: `/Factor/BankBack?${queries}`,
						token: token
					});

					// 1. get current factor
					const current = await api.request({
						method: 'GET',
						path: '/Plan/ShowCurrentFactor',
						token: token,
					});

					const factor = current['id'];

					if (factor) {
						await prisma.paymentLog.updateMany({
							where: {
								factor: factor.toString()
							}, data: {
								payied: result.code == 0
							}
						});
					}


					return {
						code: 200,
						meta: {
							took: Date.now() - start,
						},
						data: {
							status: result.code == 0 ? 'success' : 'failed',
							message: result.messages ? result.messages![0] : 'دلیلی نامشخص'
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
	events: {
		'config.changed'(ctx: any) {
			if (ctx.params['cafebazaar:accessToken'])
				this.settings.cafebazaarAccessToken = ctx.params['cafebazaar:accessToken'];
			if (ctx.params['myket:token'])
				this.settings.myketToken = ctx.params['myket:token'];
		}
	},

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
	async started() {
		setTimeout(() => {
			this.broker.call('api.v1.config.get', {
				key: 'cafebazaar:accessToken'
			}).then((res: any) => {
				if (res['status'] && res['data']) {
					this.settings.cafebazaarAccessToken = res['data'];
				}
			});
			this.broker.call('api.v1.config.get', {
				key: 'myket:token'
			}).then((res: any) => {
				if (res['status'] && res['data']) {
					this.settings.myketToken = res['data'];
				}
			});
		}, 1000);
	},

	/**
	 * Service stopped lifecycle event handler
	 */
	async stopped() { },
};

export default PlanService;
