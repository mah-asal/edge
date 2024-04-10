import type { ServiceSchema } from "moleculer";

import moment from 'jalali-moment';

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
					default: 10
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

							if(sender.id == myId) {
								sender = {
									id: item.reciverId,
									name: item.reciverName,
									avatar: endpoint.format(item.reciverImage),
									seen: type == 'admin' ? this.settings.seen['1'] : this.settings.seen[element.reciver.isOnlineByDateTime] ?? 'offline',
								};
							}

							return {
								id: item.id ?? sender.id,
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
				data: '',
				ago: moment(item.sendDateTime).locale('fa').fromNow(true),
			};
			

			switch (item.contentType) {
				case 1:
					output.type = 'text';
					output.data = item.message;
					break;

				case 7:
					const data = JSON.parse(item.message);
					output.type = data.type;
					
					switch (output.type) {
						case 'text':
							output.data = data.message;
							break;

						case 'voice':
							output.data = 'پیام صوتی';
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
