import type { ServiceSchema } from "moleculer";

import moment from 'jalali-moment';
import cheerio from "cheerio";

import api from "../shared/api";
import endpoint from "../shared/endpoint";


const ChatService: ServiceSchema = {
	name: "chat",
	version: 'api.v1',

	/**
	 * Settings
	 */
	settings: {
		seen: {
			"0": "offline",
			"1": "recently",
			"2": "online"
		},
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
			visibility: 'published',
			description: 'Get list of chats from user or admin',
			params: {
				type: {
					type: 'enum',
					values: ['user', 'admin'],
				},
				page: {
					type: 'number',
					convert: true,
					min: 1,
					default: 1
				},
				limit: {
					type: 'number',
					convert: true,
					min: 1,
					max: 100,
					default: 20
				},
			},
			async handler(ctx) {
				try {
					const { type, page, limit } = ctx.params;
					const { token } = ctx.meta;

					let path = type == 'admin' ? '/AdminMessage/Index' : '/Chat';

					const result = await api.request({
						path: path += `?pageIndex=${page - 1}&pageSize=${limit}`,
						method: 'GET',
						token,
					});

					const myProfile: any = await ctx.call('api.v1.profile.me', {}, {
						meta: {
							token: token,
							cache: true,
						}
					});

					const myId = myProfile.code == 200 ? myProfile.data.id : undefined;

					const count = result.totalCount ?? result.returnData.totalCount;

					return {
						code: 200,
						meta: {
							page,
							limit,
							total: count,
							last: Math.max(Math.ceil(count / limit), 1),
						},
						data: (result.returnData.items ?? result.returnData).map((element: any) => {
							const item = element.item ?? element;

							let sender = {
								id: item.senderId,
								name: item.senderName,
								avatar: endpoint.format(item.senderImage),
								seen: type == 'admin' ? this.settings.seen['1'] : this.settings.seen[element.sender.isOnlineByDateTime] ?? 'offline',
							};

							if (sender.id == myId) {
								sender = {
									id: item.reciverId,
									name: item.reciverName,
									avatar: endpoint.format(item.reciverImage),
									seen: type == 'admin' ? this.settings.seen['1'] : this.settings.seen[element.reciver?.isOnlineByDateTime ?? '0'] ?? 'offline',
								};
							}

							return {
								id: type == 'admin' ? item.id : sender.id == myId ? item.reciverId : sender.id,
								message: this.formatMessage(item),
								sender,
							};
						}),
					}
				} catch (error) {
					console.error(error);

					return {
						code: 500
					}
				}
			}
		},
		messages: {
			visibility: 'published',
			description: 'Get list of messages by pagination',
			params: {
				id: {
					type: "number",
					convert: true,
					min: 1
				},
				type: {
					type: "enum",
					values: ["user", "admin"],
				},
				page: {
					type: 'number',
					convert: true,
					min: 1,
					default: 1
				},
				limit: {
					type: 'number',
					convert: true,
					min: 1,
					max: 100,
					default: 50,
				},
			},
			async handler(ctx) {
				try {
					const { id, type, page, limit } = ctx.params;
					const { token } = ctx.meta;

					let path = type == 'admin' ? '/AdminMessage/Details' : '/Chat/Details';

					const start = Date.now();

					const result = await api.request({
						path: path += `?pageIndex=${page - 1}&pageSize=${limit}&id=${id}`,
						method: 'GET',
						token,
					});

					const myProfile: any = await ctx.call('api.v1.profile.me', {}, {
						meta: {
							token: token,
							cache: true,
						}
					});

					const myId = myProfile.code == 200 ? myProfile.data.id : undefined;

					let data: any[] = [];
					let meta: any = {};

					for (let item of (type == 'admin' ? result.returnData.apiDataItem : result.returnData.items)) {
						data.push(
							{
								...this.formatMessage(item),
								'me': item.senderId == myId,
							}
						)
					}


					if (type == 'user') {
						let total = result.returnData.totalCount;

						meta = {
							total,
							last: Math.max(Math.ceil(total / limit), 1),
						};
					}

					return {
						code: 200,
						meta: {
							page,
							limit,
							...meta,
							took: Date.now() - start,
						},
						data
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
		formatMessage(item: any) {
			let output: any = {
				id: item.id,
				readed: item.isRead,
				type: 'unknown',
				message: '',
				data: '',
				ago: item.sendDateTime.includes('ه') ? item.sendDateTime : moment(item.sendDateTime).locale('fa').fromNow(true),
			};

			item.message = cheerio.load(item.message).text();

			switch (item.contentType) {
				case 1:
					output.type = 'text';
					output.message = item.message.slice(0, 50);
					output.data = item.message;
					break;

				case 7:
					const data = JSON.parse(item.message);
					output.type = data.type;

					switch (output.type) {
						case 'text':
							output.message = data.message.slice(0, 50);
							output.data = data.message;
							break;

						case 'image':
							output.message = 'تصویر';
							output.data = data.media[0];
							break;

						case 'voice':
							output.message = 'پیام صوتی';
							output.data = data.media[0];
							break;

						case 'call':
							output.data = data.media[0];
							let mode = output.data.mode == 'audio' ? 'صوتی' : 'تصویری';
							if (output.data.type == 'endcall') {
								output.message = `تماس ${mode} ${output.data.time}`;
							}
							if (output.data.type == 'misscall') {
								output.message = `تماس ${mode} از دست رفته`;
							}
							if (output.data.type == 'declined') {
								output.message = `تماس ${mode} رد شده`;
							}
							break;
						
						case 'map':
							output.message = 'موقعیت مکانی';
							output.data = {
								...data.media[0]
							};
							break;

						default:
							break;
					}

				default:
					break;
			}

			return output;
		}
	},

	/**
	 * Service created lifecycle event handler
	 */
	created() { },

	/**
	 * Service started lifecycle event handler
	 */
	started() { },

	/**
	 * Service stopped lifecycle event handler
	 */
	async stopped() { },
};

export default ChatService;
