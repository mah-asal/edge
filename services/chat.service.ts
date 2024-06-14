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
		one: {
			visibility: 'published',
			description: 'Get one chat with user info and permissions',
			params: {
				user: {
					type: 'number',
					convert: true,
					min: 1
				}
			},
			cache: {
				enabled: ctx => ctx.meta.cache,
				ttl: 120,
				keys: ['#id', 'user'],
			},
			async handler(ctx) {
				try {
					const { user } = ctx.params;
					const { token } = ctx.meta;

					const start = Date.now();

					// 1. me, user, messages
					const [
						resultOfMe,
						resultOfUser,
						resultOfMessages
					]: any[] = await Promise.all([
						ctx.call('api.v1.profile.me', {}, {
							meta: {
								token: token,
							}
						}),
						ctx.call('api.v1.profile.one', {
							id: user,
							detailed: true
						}, {
							meta: {
								token: token
							}
						}),
						ctx.call('api.v1.chat.messages', {
							id: user,
							type: 'user',
						}, {
							meta: {
								token: token
							}
						}),
					]);

					if (resultOfUser.data.error != null) {
						return {
							code: 200,
							data: {
								chat: user,
								permission: null,
								user: resultOfUser.data
							}
						}
					}

					const mySex = resultOfMe.data.dropdowns.sexuality;

					const userSentMessageToMe = resultOfMessages.data.findIndex((item: any) => item.me == false) != -1;
					const userHasPlan = resultOfUser.data.profile.plan.free || resultOfUser.data.profile.plan.special || resultOfUser.data.profile.plan.ad || false;
					const iHavePlan = resultOfMe.data.plan.free || resultOfMe.data.plan.special || resultOfMe.data.plan.ad || false;

					let allowVoiceCall = false;
					let allowVideoCall = false;

					let placeholder = '';

					let canSendMessage = false;
					let canAttachment = false;
					let canRecordVoice = false;
					let canTypeNumbers = false;

					let phoneConfirmed = resultOfMe.data.verified;
					let needPlan = !(iHavePlan ? true : userHasPlan && userSentMessageToMe);

					if (needPlan) {
						if (mySex == 0) {
							placeholder = 'جهت ارسال تصویر و چت صوتی و تصویری یکی از طرفین باید حساب کاربری ویژه داشته باشد';

							canSendMessage = true;
							canAttachment = false;
							canRecordVoice = true;
							canTypeNumbers = false;
						}

						if (mySex == 1) {
							placeholder = 'جهت ارسال تصویر و چت صوتی و تصویری یکی از طرفین باید حساب کاربری ویژه داشته باشد';

							if (userSentMessageToMe && userHasPlan) {
								canSendMessage = true;
								canAttachment = false;
								canRecordVoice = true;
								canTypeNumbers = true;
							} else {
								canSendMessage = false;
								canAttachment = false;
								canRecordVoice = false;
								canTypeNumbers = false;
							}
						}

						allowVoiceCall = false;
						allowVideoCall = false;
					} else {
						allowVoiceCall = resultOfUser.data.profile.permission.voiceCall;
						allowVideoCall = resultOfUser.data.profile.permission.videoCall;

						canSendMessage = true;
						canAttachment = true;
						canRecordVoice = true;
						canTypeNumbers = true;

						placeholder = 'پیام خود را بنویسید';
					}

					if (phoneConfirmed == false) {
						canSendMessage = false;
						canAttachment = false;
						canRecordVoice = false;
						canTypeNumbers = false;
						allowVideoCall = false;
						allowVoiceCall = false;

						placeholder = 'برای چت کردن ابتدا موبایل خود را تایید کنید';
					}

					const permission = {
						userSentMessageToMe,
						allowVoiceCall,
						allowVideoCall,
						placeholder,
						canSendMessage,
						canAttachment,
						canRecordVoice,
						canTypeNumbers,
						phoneConfirmed,
						needPlan
					};

					return {
						code: 200,
						meta: {
							took: Date.now() - start,
						},
						data: {
							chat: user,
							permission: permission,
							user: resultOfUser.data,
							messages: resultOfMessages
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
		list: {
			visibility: 'published',
			description: 'Get list of chats from user or admin',
			params: {
				type: {
					type: 'enum',
					values: ['user', 'admin'],
					default: 'user'
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
					default: 12
				},
			},
			cache: {
				enabled: ctx => ctx.meta.cache,
				ttl: 120,
				keys: ['#id', 'type', 'page', 'limit'],
			},
			async handler(ctx) {
				try {
					const { type, page, limit } = ctx.params;
					const { token, id: myId } = ctx.meta;

					let path = type == 'admin' ? '/AdminMessage/Index' : '/Chat';

					const start = Date.now();

					const result = await api.request({
						path: path += `?pageIndex=${page - 1}&pageSize=${limit}`,
						method: 'GET',
						token,
					});


					if (result.returnData == null) {
						return {
							code: 200,
							meta: {
								page,
								limit,
								total: 0,
								last: 1,
								took: Date.now() - start,
								type,
							},
							data: [],
						}
					}

					const count = result.totalCount ?? result.returnData.totalCount;

					const data = (result.returnData.items ?? result.returnData ?? []).map((element: any) => {
						const item = element.item ?? element;


						let sender: any = {
							id: item.senderId,
							name: item.senderName,
							avatar: endpoint.format(item.senderImage),
							seen: type == 'admin' ? this.settings.seen['1'] : this.settings.seen[`${element.sender.isOnlineByDateTime}`] ?? 'offline',
						};

						if (sender.id == myId) {
							sender = {
								id: item.reciverId,
								name: item.reciverName,
								avatar: endpoint.format(item.reciverImage),
								seen: type == 'admin' ? this.settings.seen['1'] : this.settings.seen[element.reciever && element.reciever.isOnlineByDateTime ? `${element.reciever.isOnlineByDateTime}` : '0'] ?? 'offline',
							};
						}

						let count = null;

						if (element.contentTypeJson) {
							count = parseInt(JSON.parse(element.contentTypeJson.split('\'').join('"'))['countUnreadMessages']);
						}

						if (typeof element.unreadMessagesCount != 'undefined') {
							count = element.unreadMessagesCount;
						}

						return {
							id: type == 'admin' ? item.id : sender.id == myId ? item.reciverId : sender.id,
							count: count,
							message: this.formatMessage(item),
							sender,
						};
					});

					return {
						code: 200,
						meta: {
							page,
							limit,
							total: count,
							last: Math.max(Math.ceil(count / limit), 1),
							took: Date.now() - start,
							type,
						},
						data,
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
					default: 20,
				},
			},
			async handler(ctx) {
				try {
					const { id, type, page, limit } = ctx.params;
					const { token, id: myId } = ctx.meta;

					let path = type == 'admin' ? '/AdminMessage/Details' : '/Chat/Details';

					const start = Date.now();

					const result = await api.request({
						path: path += `?pageIndex=${page - 1}&pageSize=${limit}&id=${id}`,
						method: 'GET',
						token,
					});

					let data: any[] = [];
					let meta: any = {};

					let items = (type == 'admin' ? result.returnData.apiDataItem : result.returnData.items);

					for (let item of items) {
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

					if (type == 'admin') {
						let total = data.length;

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
		},
		sendFreeMessage: {
			visibility: 'published',
			description: 'Send a free message',
			params: {
				user: {
					type: 'number',
					convert: true,
					min: 1
				},
				message: {
					type: 'number',
					convert: true,
					min: 1
				}
			},
			async handler(ctx) {
				try {
					const { user, message } = ctx.params;
					const { token, id } = ctx.meta;

					const result = await api.request({
						method: 'POST',
						path: `/Chat/SendFreeMessage?reciverId=${user}`,
						data: {
							'messageId': message
						},
						token: token
					});

					if (result.code == 0 && false) {
						// 1. get message from dropdown
						const resultOfMessage: any = await ctx.call('api.v1.dropdown.byGroupAndValue', {
							key: "PrepairedMessages",
							value: message.toString(),
						});

						if (resultOfMessage.code == 200) {
							const value = resultOfMessage.data;

							// 2. sent this message to users
							const output = this.formatMessage({
								id: Date.now(),
								isRead: false,
								sendDateTime: new Date().toISOString(),
								contentType: 1,
								message: value
							});

							ctx.emit('socket.emit', {
								to: user,
								event: 'chat:message:recive',
								data: {
									chat: id,
									message: output,
									me: false,
								}
							});

							ctx.emit('socket.emit', {
								to: id,
								event: 'chat:message:recive',
								data: {
									chat: user,
									message: output,
									me: true
								}
							});
						}
					}

					return {
						code: 200,
						"message": result['messages'][0],
					}
				} catch (error) {
					console.error(error);

					return {
						code: 500
					}
				}
			}
		},
		sendSmsMessage: {
			visibility: 'published',
			description: 'Send a free message',
			params: {
				user: {
					type: 'number',
					convert: true,
					min: 1
				},
			},
			async handler(ctx) {
				try {
					const { user } = ctx.params;
					const { token } = ctx.meta;

					const result = await api.request({
						method: 'POST',
						path: `/Sms/SendInvitationSmsToSpecifiedUser?userId=${user}`,
						token: token
					});

					return {
						code: 200,
						"message": result['messages'][0],
					}
				} catch (error) {
					return {
						code: 500
					}
				}
			}
		},
		delete: {
			visibility: 'published',
			description: 'Delete chat',
			params: {
				id: {
					type: 'number',
					convert: true,
					min: 1
				}
			},
			async handler(ctx) {
				try {
					const { id } = ctx.params;
					const { token } = ctx.meta;

					const result = await api.request({
						method: 'GET',
						path: `/Chat/Remove?id=${id}&deleteChatMessageType=2`,
						token: token
					});

					return {
						status: result['code'] == 0,
						code: 200,
						"message": result['code'] == 0 ? 'چت حذف شد' : 'خطا در حذف چت رخ داد'
					}
				} catch (error) {
					return {
						code: 500
					}
				}
			}
		},
		sendMessage: {
			visibility: 'published',
			description: 'Send message to a user',
			params: {
				user: {
					type: 'number',
					convert: true,
					min: 1
				},
				type: {
					type: 'enum',
					values: ['text', 'voice', 'video', 'audio', 'image', 'location', 'call', 'map'],
				},
				data: {
					type: 'any'
				}
			},
			async handler(ctx) {
				try {
					const { user, type, data } = ctx.params;
					const { token, id } = ctx.meta;

					const body: any = {
						userId: user,
						contentType: 7
					};

					switch (type) {
						case 'text':
							body['message'] = { 'type': 'text', 'message': data };
							break;

						case 'audio':
						case 'music':
						case 'video':
						case 'voice':
						case 'call':
						case 'map':
						case 'image':
							body['message'] = { 'type': type, 'media': [data] };
							break;

						default:
							break;
					}

					if (typeof body['message'] == 'object') {
						body['message'] = JSON.stringify(body['message']);
					}

					const result = await api.request({
						method: 'POST',
						path: '/chat/SendMessageToUserAsyc',
						token: token,
						data: body,
					});

					const output = this.formatMessage({
						id: result.returnData.id,
						isRead: false,
						sendDateTime: result.returnData.sendDateTime,
						contentType: 7,
						message: body['message'],
					});

					ctx.emit('socket.emit', {
						to: user,
						event: 'chat:message:recive',
						data: {
							chat: id,
							message: output,
							me: false,
						}
					});

					ctx.emit('socket.emit', {
						to: id,
						event: 'chat:message:recive',
						data: {
							chat: user,
							message: output,
							me: true
						}
					});

					ctx.emit('notification.send', {
						to: user,
						accessToken: token,
						action: 'message'
					});

					return {
						code: 200,
						data: {
							chat: user,
							message: output,
							me: true
						},
					}
				} catch (error) {
					console.error(error);

					return {
						code: 500
					}
				}
			}
		},
		sendAdminMessage: {
			visibility: 'published',
			description: 'Send message to a user',
			params: {
				admin: {
					type: 'number',
					convert: true,
					min: 1
				},
				type: {
					type: 'enum',
					values: ['text', 'voice', 'video', 'audio', 'image', 'location', 'call', 'map'],
				},
				data: {
					type: 'any'
				}
			},
			async handler(ctx) {
				try {
					const { admin, type, data } = ctx.params;
					const { token, id } = ctx.meta;

					const body: any = {
						parentMessageId: admin,
						contentType: 7
					};

					switch (type) {
						case 'text':
							body['message'] = { 'type': 'text', 'message': data };
							break;

						case 'audio':
						case 'music':
						case 'video':
						case 'voice':
						case 'call':
						case 'map':
						case 'image':
							body['message'] = { 'type': type, 'media': [data] };
							break;

						default:
							break;
					}

					if (typeof body['message'] == 'object') {
						body['message'] = JSON.stringify(body['message']);
					}

					await api.request({
						method: 'POST',
						path: '/adminmessage/CreateImageInExternalServereReply',
						token: token,
						data: body,
					});

					const output = this.formatMessage({
						id: Date.now(),
						isRead: false,
						sendDateTime: new Date().toISOString(),
						contentType: 7,
						message: body['message'],
					});

					ctx.emit('socket.emit', {
						to: id,
						event: 'chat:message:recive',
						data: {
							chat: admin,
							message: output,
							me: true
						}
					});

					return {
						code: 200,
					}
				} catch (error) {
					console.error(error);

					return {
						code: 500
					}
				}
			}
		},
		deleteMessage: {
			visibility: 'published',
			description: 'Delete a message by message id',
			params: {
				chat: {
					type: 'number',
					convert: true,
					min: 1
				},
				message: {
					type: 'number',
					convert: true,
					min: 1
				},
				type: {
					type: 'enum',
					values: ['all', 'me'],
					default: 'all'
				}
			},
			async handler(ctx) {
				try {
					const { chat, message, type } = ctx.params;
					const { token, id } = ctx.meta;

					await api.request({
						method: 'GET',
						path: `/chat/DeleteMessageAsyc?messageId=${message}&deleteChatMessageType=${type == 'all' ? 2 : 0}`,
						token: token,
					});

					if (type == 'all') {
						ctx.emit('socket.emit', {
							to: chat,
							event: 'chat:message:delete',
							data: {
								chat: id,
								message: message,
							}
						});
					}

					return {
						code: 200,
						data: {
							chat: chat,
							message: message,
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
		countMessages: {
			visibility: 'published',
			description: 'Get count of messages',
			async handler(ctx) {
				try {
					const { token } = ctx.meta;

					const [chatsCount, adminsCount] = await Promise.all([
						api.request({
							method: 'GET',
							path: '/chat/CountTotalUserUnreadMessages',
							token: token
						}),
						api.request({
							method: 'GET',
							path: '/AdminMessage/CountUnreadAdminMessages',
							token: token
						}),
					]);

					const chats = (chatsCount.returnData ?? 0);
					const admins = (adminsCount ?? 0);

					return {
						code: 200,
						data: {
							count: chats + admins,
							chat: chats,
							admin: admins
						}
					}
				} catch (error) {
					return {
						code: 500
					}
				}
			}
		},
		markMessagesAsReaded: {
			visibility: 'published',
			description: 'Mark all chat message as readed',
			params: {
				chat: {
					type: 'number',
					convert: true,
					min: 1
				}
			},
			async handler(ctx) {
				try {
					const { chat } = ctx.params;
					const { token, id } = ctx.meta;

					await api.request({
						method: 'GET',
						path: `/chat/MessageReadAll?userId=${chat}`,
						token
					});

					ctx.emit('socket.emit', {
						to: chat,
						event: 'chat:message:readed',
						data: {
							chat: id,
						}
					});

					return {
						code: 200,
						data: {
							chat
						}
					}
				} catch (error) {
					return {
						code: 500
					}
				}
			}
		},
		markMessageAsReaded: {
			visibility: 'published',
			description: 'Mark all chat message as readed',
			params: {
				chat: {
					type: 'number',
					convert: true,
					min: 1
				},
				message: {
					type: 'number',
					convert: true,
					min: 1
				}
			},
			async handler(ctx) {
				try {
					const { chat, message } = ctx.params;
					const { token, id } = ctx.meta;


					await api.request({
						method: 'GET',
						path: `/chat/MessageReadAllAsyc?userId=${chat}&messageIds=${message}`,
						token
					});

					ctx.emit('socket.emit', {
						to: chat,
						event: 'chat:message:readed',
						data: {
							chat: id,
							message: message,
						}
					});

					return {
						code: 200
					}
				} catch (error) {
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
				message: '',
				data: '',
				ago: item.sendDateTime.includes('ه') ? item.sendDateTime : moment(item.sendDateTime).locale('fa').fromNow(true),
				date: item.sendDateTime,
			};

			item.message = item.message.startsWith('<img') ? item.message : cheerio.load(item.message).text();

			if ((item.message as string).startsWith('{') && (item.message as string).endsWith('}')) {
				item.contentType = 7;
			}

			switch (item.contentType) {
				case 1:
					if (item.message.startsWith('<img')) {
						output.type = 'image';
						output.message = 'تصویر';
						output.data = cheerio.load(item.message)('img').attr('src');
					} else {
						output.type = 'text';
						output.message = item.message.slice(0, 50);
						output.data = item.message;
					}
					break;

				case 7:
					let data = item.message;

					try {
						data = JSON.parse(item.message);

					} catch (error) {
						//
					}

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

						case 'music':
							output.message = 'فایل صوتی';
							output.data = data.media[0];
							break;

						case 'audio':
							output.message = 'فایل صوتی';
							output.data = data.media[0];
							break;

						case 'video':
							output.message = 'فایل تصویری';
							output.data = data.media[0];
							break;

						case 'voice':
							output.message = 'پیام صوتی';
							let value: string = data.media[0];

							if (value.startsWith('/UserUploadedFiles')) {
								value = endpoint.api + value;
							}

							output.data = value;
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
