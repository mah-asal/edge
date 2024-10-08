import type { ServiceSchema } from "moleculer";

import cheerio from "cheerio";
import axios from "axios";
import qs from "qs";
import jwt from "../shared/jwt";

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
		cafebazaarAccessToken: "",
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
				enabled: true, //ctx => ctx.meta.cache,
				ttl: 120,
				keys: ['store', '#token'],
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
							discount: item['discount'],
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
					console.error(error);
					if(error == 403) {
						return {
							code: 403
						}
					}

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
				plans: {
					type: 'array',
					min: 1,
					items: {
						type: 'number',
						convert: true,
						min: 1
					},
				},
				store: {
					type: 'enum',
					values: ['GOOGLEPLAY', 'MYKEY', 'CAFEBAZAAR', 'DIRECT', 'ANY'],
					default: 'ANY'
				}
			},
			async handler(ctx) {
				try {
					const { plans, store } = ctx.params;
					const { token } = ctx.meta;

					const start = Date.now();

					let queries = plans.map((plan: string) => `planIds=${plan}`)

					await api.request({
						method: 'POST',
						path: `/plan/CreateFactorByPlanIds?${queries.join('&')}`,
						token: token
					});

					let result = await api.request({
						method: 'GET',
						path: '/Plan/ShowCurrentFactor',
						token: token,
					});

					let data = {
						id: result['id'],
						price: result['price'],
						discount: result['discountFromCode'] + result['discountFromShopPlan'],
						total: result['priceOriginal'],
						plans: result['factorDetails'].map((item: any) => ({
							id: item['shopPlan']['id'],
							title: item['shopPlan']['title'],
							price: item['price'],
							discount: item['shopPlan']['discount'],
						})),
						jsonwebtoken: '',
					}

					// // calculate price
					// for (let plan of data.plans) {
					// 	data['price'] += Math.floor(plan.price - ((plan.price * (plan.discount ?? 0)) / 100));
					// }

					if (store == 'CAFEBAZAAR') {
						const results = await prisma.config.findMany({
							where: {
								key: 'cafebazaar:jwtSecret'
							}
						});

						if (results.length == 1) {
							// create jwt token
							data['jsonwebtoken'] = jwt.generate({
								price: data['price'] * 10,
								package_name: 'com.mahasal.app.mahasal',
								sku: plans[0].toString(),
							}, results[0].value);
						}
					}

					return {
						code: 200,
						meta: {
							took: Date.now() - start,
						},
						data: data,
					}
				} catch (error) {
					console.error(error);
					if(error == 403) {
						return {
							code: 403
						}
					}

					return {
						code: 500,
					}
				}
			}
		},
		discount: {
			visibility: 'published',
			description: 'Submit discount to the factor',
			params: {
				code: {
					type: 'string'
				},
				store: {
					type: 'enum',
					values: ['GOOGLEPLAY', 'MYKEY', 'CAFEBAZAAR', 'DIRECT', 'ANY'],
					default: 'ANY'
				}
			},
			async handler(ctx) {
				try {
					const { code, store } = ctx.params;
					const { token } = ctx.meta;

					const result = await api.request({
						method: 'POST',
						path: `/Plan/ApplyDiscountCode?code=${code}`,
						token: token,
					});

					let data: any = {};

					if (result.code == 0) {
						data['id'] = result.returnData.id;
						data['price'] = result.returnData.price;
						data['discount'] = result.returnData.discountFromCode + result.returnData.discountFromShopPlan;
						data['total'] = result.returnData.priceOriginal;
						data['plans'] = result.returnData.factorDetails.map((item: any) => ({
							id: item['shopPlan']['id'],
							title: item['shopPlan']['title'],
							price: item['price'],
							discount: item['shopPlan']['discount'],
						}));

						// regenerate jwt token
						if (store == 'CAFEBAZAAR') {
							const results = await prisma.config.findMany({
								where: {
									key: 'cafebazaar:jwtSecret'
								}
							});

							if (results.length == 1) {
								// create jwt token
								data['jsonwebtoken'] = jwt.generate({
									price: data['price'] * 10,
									package_name: 'com.mahasal.app.mahasal',
									sku: data['plans'][0]['id'].toString(),
								}, results[0].value);
							}
						}
					}

					return {
						code: 200,
						message: result.messages ? result.messages[0] : result.returnData,
						data: data,
					}
				} catch (error) {
					console.error(error);
					if(error == 403) {
						return {
							code: 403
						}
					}

					return {
						code: 500
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

					const current = await api.request({
						method: 'GET',
						path: '/Plan/ShowCurrentFactor',
						token: token,
					});

					let log;
					let price;
					let factor;

					if (current && current['id']) {
						price = current['price'] ?? 0;
						factor = current['id'];

						if (price == 0) {
							return {
								code: 400,
								i18n: 'PRICE_IS_ZERO'
							}
						}

						log = await prisma.paymentLog.create({
							data: {
								user: id.toString(),
								factor: factor.toString(),
								price: price,
								method: method,
								payied: false,
								data: inapp && inapp['token'] ? inapp['token'] : null
							}
						});
					}

					if (method == 'gateway') {
						const results = await prisma.config.findMany({
							where: {
								key: 'endpoint:bank:redirect'
							}
						});

						if (results.length == 1) {
							const callback = results[0].value;

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
						console.log(ctx.params);
						

						const { sku, token: purchasesToken } = inapp;
						const url = `https://pardakht.cafebazaar.ir/devapi/v2/api/validate/com.mahasal.app.mahasal/inapp/${sku}/purchases/${purchasesToken}?access_token=${this.settings.cafebazaarAccessToken}`;

						console.log(url);
						

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

									if (log) {
										await prisma.paymentLog.update({
											where: {
												id: log.id
											},
											data: {
												payied: true,
												data: purchasesToken
											}
										});
									} else {
										await prisma.paymentLog.create({
											data: {
												user: id.toString(),
												factor: factor.toString(),
												price: price,
												method: method,
												payied: true,
												data: purchasesToken
											}
										});
									}

									await ctx.call('api.v1.notification.send', {
										user: ctx.meta.id,
										title: 'بسته شما با موفقیت فعال شد',
										body: 'پرداخت شما از طریق درگاه کافه بازار با موفقیت انجام شد و بسته شما فعال شد'
									}, {});
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

									if (log) {
										await prisma.paymentLog.update({
											where: {
												id: log.id
											},
											data: {
												payied: true
											}
										});
									} else {
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
					if(error == 403) {
						return {
							code: 403
						}
					}

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
			// this.broker.call('api.v1.config.get', {
			// 	key: 'cafebazaar:accessToken'
			// }).then((res: any) => {
			// 	if (res['code'] == 200 && res['data']) {
			// 		this.settings.cafebazaarAccessToken = res['data'];


			// 	}
			// }).catch(console.error)

			prisma.config.findMany({
				where: {
					key: 'cafebazaar:accessToken'
				}
			}).then((result) => {
				if (result.length == 1) {
					this.settings.cafebazaarAccessToken = result[0].value;
				}
			});

			// this.broker.call('api.v1.config.get', {
			// 	key: 'myket:token'
			// }).then((res: any) => {
			// 	if (res['code'] == 200 && res['data']) {
			// 		this.settings.myketToken = res['data'];
			// 	}
			// }).catch(console.error);
		}, 1000);
	},

	/**
	 * Service stopped lifecycle event handler
	 */
	async stopped() { },
};

export default PlanService;
