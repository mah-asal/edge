import type { ServiceSchema } from "moleculer";

import prisma from "../shared/prisma";

const types: string[] = [
	'discount-with-comment',
	'discount'
];

const MarketerService: ServiceSchema = {
	name: "marketer",
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
		listCampaign: {
			visibility: 'published',
			permissions: ['api.v1.marketer.listCampaign'],
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
				},
			},
			async handler(ctx) {
				try {
					const { page, limit } = ctx.params;

					const start = Date.now();

					let where: any = {};

					const [count, campaigns] = await prisma.$transaction([
						prisma.campaign.count({
							where: where
						}),
						prisma.campaign.findMany({
							skip: (page - 1) * limit,
							take: limit,
							orderBy: {
								id: "desc",
							},
							where: where
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
						data: campaigns
					}
				} catch (error) {
					return {
						code: 500
					}
				}
			}
		},
		createCampaign: {
			visibility: 'published',
			description: 'Create a campaign',
			permissions: ['api.v1.marketer.createCampaign'],
			params: {
				type: {
					type: 'enum',
					values: types,
				},
				method: {
					type: 'enum',
					values: ['sms', 'notification'],
				},
				title: {
					type: 'string'
				},
				description: {
					type: 'string'
				},
				message: {
					type: 'string'
				},
				code: {
					type: 'string'
				},
				redirect: {
					type: 'url'
				},
				sends: {
					type: 'number',
					convert: true
				}
			},
			async handler(ctx) {
				try {
					const { type, method, message, title, description, code, sends, redirect } = ctx.params;

					const campaign = await prisma.campaign.create({
						data: {
							type,
							method,
							message,
							title,
							description,
							code,
							redirect,
							sends
						}
					});

					return {
						code: 200,
						i18n: 'Campaign created',
						data: campaign
					}
				} catch (error) {
					return {
						code: 500
					}
				}
			}
		},
		updateCampaign: {
			visibility: 'published',
			description: 'Update a campaign',
			permissions: ['api.v1.marketer.updateCampaign'],
			params: {
				id: {
					type: 'number',
					convert: true,
					min: 1
				},
				type: {
					type: 'enum',
					values: types,
				},
				method: {
					type: 'enum',
					values: ['sms', 'notification'],
				},
				title: {
					type: 'string'
				},
				description: {
					type: 'string'
				},
				message: {
					type: 'string'
				},
				code: {
					type: 'string'
				},
				redirect: {
					type: 'url'
				},
				sends: {
					type: 'number',
					convert: true
				}
			},
			async handler(ctx) {
				try {
					const { id, type, method, message, title, description, code, sends, redirect } = ctx.params;

					const campaign = await prisma.campaign.update({
						where: {
							id
						},
						data: {
							type,
							method,
							message,
							title,
							description,
							code,
							redirect,
							sends
						}
					});

					return {
						code: 200,
						i18n: 'Campaign updated',
						data: campaign
					}
				} catch (error) {
					return {
						code: 500
					}
				}
			}
		},
		getCampaignByCode: {
			visibility: 'published',
			description: 'Get campaign by code',
			params: {
				code: {
					type: 'string',
				}
			},
			cache: {
				enabled: true,
				keys: ['code']
			},
			async handler(ctx) {
				try {
					const { code } = ctx.params;

					const result = await prisma.campaign.findMany({
						where: {
							code
						}
					});

					return {
						code: result.length == 1 ? 200 : 404,
						data: result.length == 1 ? result[0] : null
					}
				} catch (error) {
					return {
						code: 500
					}
				}
			}
		},
		openCampaignByCode: {
			visibility: 'published',
			description: 'Open campaign by code',
			params: {
				code: {
					type: 'string',
				}
			},
			async handler(ctx) {
				try {
					const { code } = ctx.params;

					const campaigns = await prisma.campaign.findMany({
						where: {
							code
						}
					});					

					if (campaigns.length == 1) {
						await prisma.campaign.update({
							where: {
								id: campaigns[0].id
							},
							data: {
								opens: campaigns[0].opens + 1,
							}
						})
					}

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

export default MarketerService;
