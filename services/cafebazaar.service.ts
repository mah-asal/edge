import axios from "axios";
import FormData from 'form-data';
import type { ServiceSchema } from "moleculer";

const CafebazaarService: ServiceSchema = {
	name: "cafebazaar",
	version: 'api.v1',

	/**
	 * Settings
	 */
	settings: {
		client_id: 'hCTSp6xl7UoF2TkUXeH1us9wXjVJVfiR1yYjBU9M',
		client_secret: 'uOu37Yz1INHiuGFZcnv27DmjW1TY44zgRwhra4eiU7tn7La65v9pZbpzzu7R',
		redirect_url: 'https://edge.tv-92.com/api/v1/call/api.v1.cafebazaar.auth'
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
			description: 'Request Cafebazaar authentication',
			permission: ['api.v1.cafebazaar.request'],
			params: {
				redirect: {
					type: 'boolean',
					convert: true,
					default: false,
				}
			},
			async handler(ctx) {
				try {
					return {
						code: ctx.params.redirect ? 301 : 200,
						data: `https://pardakht.cafebazaar.ir/devapi/v2/auth/authorize/?response_type=code&access_type=offline&redirect_uri=${this.settings.redirect_url}&client_id=${this.settings.client_id}`
					}
				} catch (error) {
					return {
						code: 500
					}
				}
			}
		},
		auth: {
			visibility: 'published',
			description: 'Cafebazaar authentication',
			params: {
				code: {
					type: 'string'
				}
			},
			async handler(ctx) {
				try {
					const { code } = ctx.params;

					const form = new FormData();
					form.append('grant_type', 'authorization_code');
					form.append('code', code);
					form.append('client_id', this.settings.client_id);
					form.append('client_secret', this.settings.client_secret);
					form.append('redirect_uri', this.settings.redirect_url);

					const result = await axios.post(
						'https://pardakht.cafebazaar.ir/devapi/v2/auth/token/',
						form,
						{
							headers: {
								...form.getHeaders(),
								// 'Cookie': 'csrftoken=vd4IcUbAsxUoMggB8K0F5PAlZlmsgFED; sessionid=t5hlokdpurbfvm5alcms29oup37jj7uk'
							}
						}
					);

					if (result.status == 200) {
						const { access_token, refresh_token } = result.data;

						await ctx.call('api.v1.config.set', {
							key: 'cafebazaar:accessToken',
							value: access_token,
						});

						await ctx.call('api.v1.config.set', {
							key: 'cafebazaar:refreshToken',
							value: refresh_token,
						});
					}

					return {
						code: result.status,
						data: result.data
					}
				} catch (error) {
					console.error(error);

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

export default CafebazaarService;
