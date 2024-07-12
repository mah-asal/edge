import type { ServiceSchema } from "moleculer";

import prisma from "../shared/prisma";

import admin from 'firebase-admin';

const NotificationService: ServiceSchema = {
	name: "notification",
	version: 'api.v1',
	/**
	 * Settings
	 */
	settings: {
		app: undefined,
	},

	/**
	 * Dependencies
	 */
	dependencies: [],

	/**
	 * Actions
	 */
	actions: {
		join: {
			visibility: 'published',
			description: 'Join to notification',
			params: {
				token: {
					type: 'string'
				},
				device: {
					type: 'string'
				}
			},
			async handler(ctx) {
				try {
					const { token: firebaseToken, device } = ctx.params;
					const { id: user } = ctx.meta;

					// if device exists change it's userId
					// const deviceExists = await this.adapter.find({ query: { device: device } });					

					const deviceExists = await prisma.notification.findFirst({
						where: {
							device
						}
					});

					if (deviceExists) {
						await prisma.notification.update({
							where: {
								id: deviceExists.id
							},
							data: {
								user: user.toString()
							}
						})
					} else {
						await prisma.notification.create({
							data: {
								user: user.toString(),
								device: device,
								firebase: firebaseToken
							}
						});
					}

					return {
						code: 200,
						i18n: 'JOIN_SUCCESSFULL'
					}

				} catch (error) {
					console.error(error);

					return {
						code: 500
					}
				}
			}
		},
		leave: {
			visibility: 'published',
			description: 'Leave user from its notification',
			params: {
				device: {
					type: 'string'
				}
			},
			async handler(ctx) {
				try {
					const { device } = ctx.params;
					const { id: user } = ctx.meta;


					await prisma.notification.deleteMany({
						where: {
							user: user.toString(),
							device: device,
						}
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
		send: {
			visibility: 'published',
			description: 'Send message to a user',
			permission: ['api.v1.notification.send'],
			params: {
				user: {
					type: 'number',
					convert: true,
					min: 1
				},
				title: {
					type: 'string',
					min: 3
				},
				body: {
					type: 'string',
					min: 3,
					optional: true,
					default: null
				}
			},
			async handler(ctx) {
				try {
					const { user, title, body } = ctx.params;

					const data = await prisma.notification.findMany({
						where: {
							user: user.toString()
						}
					});

					if (data.length == 0) {
						return {
							code: 400,
							i18n: 'EMPTY_USER'
						}
					}

					for (let item of data) {
						const result = await this.settings.app.messaging().sendEach([{
							notification: {
								title: title,
								body: body
							},
							token: item.firebase
						}]);

						await prisma.notificationSend.create({
							data: {
								user: user.toString(),
								device: item.device,
								firebase: item.firebase,
								title: title,
								body: body ?? "",
								sent: result['successCount'] == 1
							}
						});
					}

					return {
						code: 200,
						meta: {
							total: data.length,
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
		'notification.send': async (ctx: any) => {
			const {
				accessToken,
				to,
				action
			} = ctx.params;

			let me: any = {};
			let reciver: any = {};

			let title = null;
			let body = null;

			if (accessToken) {
				const resultOfProfile: any = await ctx.call('api.v1.profile.me', {}, {
					meta: {
						token: accessToken,
						cache: false,
					}
				});

				if (resultOfProfile.code == 200) {
					me = resultOfProfile.data;
				}
			}

			if (to) {
				const resultOfProfile: any = await ctx.call('api.v1.profile.one', {
					id: to,
				}, {
					meta: {
						cache: false,
						token: undefined,
					}
				});

				if (resultOfProfile.code == 200) {
					reciver = resultOfProfile.data.profile;
				}
			}

			let type = 'unknown';

			switch (action) {
				case 'favorite':
					title = 'کاربری علاقه مند به شما شد';
					body = `${me.fullname} به شما علاقه مند شده است`;
					type = 'reaction';
					break;

				case 'disfavorite':
					title = 'کاربری دیگر علاقه مند به شما نیست';
					body = `${me.fullname} دیگر به شما علاقه ندارد`;
					type = 'reaction';
					break;

				case 'block':
					title = 'کاربری شما را بلاک کرد';
					body = `${me.fullname} شما را بلاک کرد`;
					type = 'reaction';
					break;

				case 'unblock':
					title = 'کاربری شما را آنبلاک کرد';
					body = `${me.fullname} شما را از بلاکی در آورد`;
					type = 'reaction';
					break;

				case 'message':
					title = 'شما یک پیام دارید';
					body = 'یک کاربر به شما پیام ارسال کرده است';
					type = 'chat';
					break;

				default:
					break;
			}

			if (type == 'reaction' && reciver['permission'] == undefined || reciver['permission']['notificationReaction'] != true) {
				return;
			}

			if (type == 'chat') {
				const resultOfReciverOnline = await ctx.call('v1.socket.online', {
					user: to
				});

				if (resultOfReciverOnline.code == 200) {
					return;
				}
			}

			if (title) {
				ctx.call('api.v1.notification.send', {
					user: to,
					title,
					body,
				});
			}
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
	async created() {
		try {
			if (this.settings.app) return;

			this.settings.app = admin.initializeApp({
				credential: admin.credential.cert(require('../firebase.config.json')),
				databaseURL: "https://mahasal-dev.firebaseio.com",

			}, `Mahasal@v${Date.now()}`);
		} catch (error) {
			console.error(error);
		}
	},

	/**
	 * Service started lifecycle event handler
	 */
	async started() {
	},

	/**
	 * Service stopped lifecycle event handler
	 */
	async stopped() { },
};

export default NotificationService;
