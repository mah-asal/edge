import type { ServiceSchema } from "moleculer";

import moment from 'jalali-moment';
import qs from 'qs';

import api from "../shared/api";
import endpoint from "../shared/endpoint";
import jwt from "../shared/jwt";

const ProfileService: ServiceSchema = {
	name: "profile",
	version: 'api.v1',

	/**
	 * Settings
	 */
	settings: {
		status: {
			// error
			"1": "UNSUBSCRIBED",
			"2": "SUSSPENDED",
			"3": "SUSSPENDED_BY_ADMIN",
			"4": "BLOCKED",
			"5": "BLOCKED_BY_ADMIN",
			"6": "LEAVE_FOR_EVER",
			// not error
			"0": "NORMAL",
			"-17": "REFRESH_TOKEN",
			"-18": "REFRESHED_TOKEN",
			"-19": "FORGET_PASSWORD",
			"-100": "EXPIRED_PASSWORD",
			"-110": "CONFIRMED_MOBILE_MANUALLY",
			"-120": "UNCONFIRMED_MOBILE_MANUALLY",
			"-130": "UNBLOCKED_BY_ADMIN",
			"-140": "RESTORED_PASSWORD",
			"-150": "UNEXPIRED_PASSWORD",
			"-160": "UNSUSPENDED",
		},
		seen: {
			"0": "offline",
			"1": "recently",
			"2": "online"
		},
		reactions: {
			"block": "Block",
			"unblock": "Unblock",
			"favorite": "Fave",
			"disfavorite": "Unfave"
		}
	},

	/**
	 * Dependencies
	 */
	dependencies: [],

	/**
	 * Actions
	 */
	actions: {
		reaction: {
			visibility: "published",
			description: "React to a user",
			params: {
				action: {
					type: "enum",
					values: [
						"block", "unblock", "favorite", "disfavorite"
					],
				},
				user: {
					type: "number",
					convert: true,
					min: 1,
				}
			},
			async handler(ctx) {
				try {
					const { action, user } = ctx.params;
					const { token } = ctx.meta;

					if (!token) {
						return {
							code: 403
						}
					}

					const queries = qs.stringify({
						userReactionType: this.settings.reactions[action],
						userId: user,
					});

					const result = await api.request({
						path: `/fave/add?${queries}`,
						method: 'GET',
						token,
					});

					if (result.code == 0) {
						ctx.emit('notification.send', {
							accessToken: token,
							to: user,
							action: action
						});
					}

					return {
						status: result.code == 0,
						code: 200,
					}
				} catch (error) {
					return {
						code: 500
					}
				}
			}
		},
		search: {
			visibility: 'published',
			description: 'Search in profiles with filters',
			params: {
				page: {
					type: "number",
					min: 1,
					default: 1,
					optional: true,
					convert: true,
				},
				limit: {
					type: "number",
					min: 1,
					// max: 100,
					default: 12,
					optional: true,
					convert: true
				},
				type: {
					type: 'enum',
					values: ['search', 'newest', 'advertised', 'visited', 'favorited', 'favorites', 'blocked', 'blocks'],
					default: 'search'
				},
				filters: {
					type: "object",
					default: {},
				}
			},
			cache: {
				enabled: ctx => ctx.meta.cache,
				ttl: 120,
				keys: ['type', 'page', 'limit'],
			},
			async handler(ctx) {
				try {
					const { page, limit, type, filters } = ctx.params;
					const { token } = ctx.meta;

					let path = '';
					let typeQueries: any = {};

					switch (type) {
						case 'advertised':
							path = '/panel/AdvertisedUsers'
							break;

						case 'visited':
							path = '/Fave/details';
							typeQueries = {
								isRandom: true, userReactionType: 7, isMyReaction: false
							};
							break;

						case 'favorited':
							path = '/Fave/details';
							typeQueries = {
								userReactionType: 1, isMyReaction: false
							};
							break;

						case 'favorites':
							path = '/Fave/details';
							typeQueries = {
								userReactionType: 1, isMyReaction: true
							};
							break;

						case 'blocked':
							path = '/Fave/details';
							typeQueries = {
								userReactionType: 3, isMyReaction: false
							};
							break;

						case 'blocks':
							path = '/Fave/details';
							typeQueries = {
								userReactionType: 3, isMyReaction: true
							};
							break;

						case 'newest':
							path = '/Panel/NewestUsers';
							typeQueries = {
								HasImage: 1, isRandom: true
							};
							break;
						default:
							path = '/search';
							break;
					}

					const queries = qs.stringify({
						pageIndex: page - 1,
						pageSize: limit,
						...typeQueries,
						...filters
					});

					const start = Date.now();

					const result = await api.request({
						path: `${path}?${queries}`,
						method: 'GET',
						token,
					});

					let output: any[] = [];

					if (result.returnData) {
						for (let item of result.returnData.items) {
							let image = item.defaultImageUrl;

							if (item.userImageConfirmed && item.userImagesURL) {
								image = item.userImagesURL;
							}

							if (image.startsWith('http') == false) {
								image = 'https://s3.tv-92.com/uploads' + image;
							}

							const cityResult: any = await ctx.call('api.v1.dropdown.byGroupAndValue', {
								key: "City",
								value: item.city ? item.city.toString() : '',
							});

							output.push({
								id: item.id,
								avatar: image,
								fullname: `${item.name} ${item.family ?? ''}`.trim(),
								verified: item.mobileConfirmed ?? false,
								city: cityResult && cityResult.code == 200 ? cityResult.data ?? 'خارج از کشور' : '-',
								age: (() => {
									const dur = moment.duration(moment().diff(moment(item.birthDate)));

									return Math.round(dur.years());
								})(),
								seen: this.settings.seen[item.isOnlineByDateTime] ?? "offline",
								plan: {
									special: item.hasSpecialAccount ? true : false,
									ad: item.hasAdvertisementAccount ? true : false,
								},
							})
						}
					}

					return {
						code: 200,
						meta: {
							total: result.returnData ? result.returnData.totalCount : 0,
							last: result.returnData ? result.returnData.totalPages : 1,
							page,
							limit,
							took: Date.now() - start,
							filters: ctx.params,
						},
						data: output,
					}
				} catch (error) {
					return {
						code: 500,
					}
				}
			}
		},
		one: {
			visibility: 'published',
			description: 'Get one profile by id',
			params: {
				id: {
					type: "number",
					min: 1,
					convert: true,
				},
				detailed: [
					{
						type: "boolean",
						optional: true,
					},
					{
						type: "number",
						convert: true,
						optional: true,
						default: 0,
						min: 0,
						max: 1,
					}
				],
			},
			cache: {
				enabled: ctx => ctx.meta.cache,
				ttl: 120,
				keys: ['id', 'detailed', '#id'],
			},
			async handler(ctx) {
				try {
					const { id, detailed } = ctx.params;
					const { token } = ctx.meta;

					const result: any = await api.request({
						method: "GET",
						path: `/Profile/Details?userId=${id}`,
						token: token,
					});

					if (result.code != 0) {
						return {
							code: 200,
							data: {
								error: "GAY",
								profile: null,
							}
						}
					}

					// handle user status
					const status = result.returnData.latestUserLoginStatus;

					if (status && this.settings.status[status]) {
						return {
							code: 200,
							data: {
								error: this.settings.status[status],
								profile: null,
							}
						}
					}

					if (result.returnData.isBlocked) {
						return {
							code: 200,
							data: {
								error: "BLOCKED",
								profile: null,
							}
						};
					}

					if (result.returnData.isBlockedMe) {
						return {
							code: 200,
							data: {
								error: "BLOCKED_ME",
								profile: null,
							}
						};
					}


					return {
						code: 200,
						data: {
							error: null,
							profile: await this.formatProfile(result.returnData, detailed, token != undefined),
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
		me: {
			visibility: "published",
			description: "Get your profile",
			cache: {
				enabled: ctx => ctx.meta.cache,
				ttl: 120,
				keys: ['#id'],
			},
			async handler(ctx) {
				try {
					const token = ctx.meta.token;

					if (!token) {
						return {
							code: 403,
							i18n: 'FORBBIDEN'
						}
					}

					const result: any = await api.request({
						method: "GET",
						path: `/Profile`,
						token: token,
					});

					return {
						code: 200,
						data: await this.formatProfile(result.returnData, true, true),
					}
				} catch (error) {
					return {
						code: 500
					}
				}
			}
		},
		seen: {
			visibility: 'published',
			description: 'Get latest seen status of a user',
			params: {
				user: {
					type: 'number',
					convert: true,
					min: 1
				}
			},
			async handler(ctx) {
				try {
					const { user } = ctx.params;
					const { token } = ctx.meta;

					const result: any = await api.request({
						method: "GET",
						path: `/Profile/IsOnlineByDateTime?userId=${user}`,
						token: token
					});

					return {
						code: 200,
						data: {
							id: user,
							seen: this.settings.seen[result] ?? "offline",
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
	events: {
		'socket.auth': async (ctx: any) => {
			const { token, socket } = ctx.params;

			try {
				const data = jwt.extract(token);

				if (data['sub']) {
					const id = data['sub'];

					ctx.emit('socket.room.join', {
						'room': parseInt(id),
						'socket': socket,
					});
					return;
				}

			} catch (error) {
				//
			}

			try {
				const resultOfMyProfile: any = await ctx.call('api.v1.profile.me', {}, {
					meta: {
						token,
					}
				});

				if (resultOfMyProfile.code == 200) {
					const id = resultOfMyProfile['data']['id'];

					ctx.emit('socket.room.join', {
						'room': id,
						'socket': socket,
					});
				}
			} catch (error) {
				//
			}
		}
	},

	/**
	 * Methods
	 */
	methods: {
		async formatProfile(item: any, detailed: boolean = false, withToken: boolean = false) {
			let image: string = item.defaultImageUrl;
			let canDeleteImage = false;

			if (item.userImagesURL) {
				image = item.userImagesURL;
				canDeleteImage = true;
			}

			if (image.startsWith('http') == false) {
				image = 'https://s3.tv-92.com/uploads' + image;
			}

			let details: any = {};
			let dropdowns: any = {};

			if (detailed) {
				const result: any = await this.broker.call('api.v1.dropdown.byBulk', {
					bulk: {
						Education: item.education,
						ReligionRate: item.religionRate,
						MarriageType: item.marriageType,
						Sexuality: item.sexuality,
						MaritalStatus: item.maritalStatus,
						SkinColor: item.skinColor,
						BeautyRate: item.beautyRate,
						StyleRate: item.styleRate,
						HealthStatus: item.healthStatus,
						SalaryRange: item.salaryRange,
						CarStatus: item.carStatus,
						HouseStatus: item.houseStatus,
						LifeStyle: item.lifeStyle,
						Province: item.province ?? 'خارج از کشور',
						City: item.city ?? 'خارج از کشور',
					}
				});

				dropdowns = {
					education: item.education,
					religionRate: item.religionRate,
					marriageType: item.marriageType,
					sexuality: item.sexuality,
					maritalStatus: item.maritalStatus,
					skinColor: item.skinColor,
					beautyRate: item.beautyRate,
					styleRate: item.styleRate,
					healthStatus: item.healthStatus,
					salaryRange: item.salaryRange,
					carStatus: item.carStatus,
					houseStatus: item.houseStatus,
					lifeStyle: item.lifeStyle,
					province: item.province ?? '0',
					city: item.city ?? '0',
				};

				if (result.code == 200) {
					details = result.data;
				}

				const birthDate = moment(item.birthDate).locale('fa');

				details['childCount'] = item.childCount;
				details['oldestChildAge'] = item.oldestChildAge;
				details['height'] = item.height;
				details['weight'] = item.weight;
				details['job'] = item.job;
				details['aboutMe'] = item.aboutMe;
				details['birthDate'] = birthDate.format('dddd jDD jMMMM jYYYY');
				details['registerDate'] = moment(item.createDate).locale('fa').format('dddd jDD jMMMM jYYYY');
				dropdowns['birthDateYear'] = birthDate.jYear().toString();
				dropdowns['birthDateMonth'] = (birthDate.jMonth() + 1).toString();
				dropdowns['birthDateDay'] = birthDate.jDate().toString();
				details['age'] = (() => {
					const dur = moment.duration(moment().diff(moment(item.birthDate)));

					return Math.round(dur.asYears());
				})();
			}

			let plan: any = {};

			if (withToken) {
				plan['sms'] = item.countSmsReminded;

				const diff = (key = "", mode: 'days' | 'hours') => {
					const value = item[key];

					if (value) {
						const dur = moment.duration(moment(value).diff(moment()));

						if (mode == 'days') {
							return dur.asDays() <= 0 ? 0 : Math.round(dur.asDays());
						}

						if (mode == 'hours') {
							return dur.asHours() <= 0 ? 0 : Math.round(dur.asHours());
						}
					}

					return 0;
				}

				plan['specialDays'] = diff('endDateSpecialAccount', 'days');
				plan['adDays'] = diff('endDateAdvertisementAccount', 'days');
				plan['freeHours'] = diff('endDateFreeSpecialAccount', 'hours');
			}

			return {
				id: item.id,
				status: this.settings.status[item.latestUserLoginStatus * -10],
				avatar: image,
				defaultAvatar: !canDeleteImage,
				fullname: `${item.name} ${item.family ?? ''}`.trim(),
				phone: item.mobile,
				verified: item.mobileConfirmed ?? false,
				last: item.latestUserActivity ? moment(item.latestUserActivity).locale('fa').format('dddd jDD jMMMM jYYYY ساعت HH:MM') : 'خیلی وقت پیش',
				ago: item.latestUserActivity ? moment(item.latestUserActivity).locale('fa').fromNow(true) : 'خیلی وقت پیش',
				seen: this.settings.seen[item.isOnlineByDateTime] ?? "offline",
				age: (() => {
					const dur = moment.duration(moment().diff(moment(item.birthDate)));

					return Math.round(dur.years());
				})(),
				...details,
				plan: {
					free: item.endDateFreeSpecialAccount != null && plan && plan['freeHours'] != 0 ? true : false,
					special: item.hasSpecialAccount ? true : false,
					ad: item.hasAdvertisementAccount ? true : false,
					...plan
				},
				permission: {
					voiceCall: item.allowVoiceCall,
					videoCall: item.allowVideoCall,
					notificationReaction: item.allowNotificationReaction,
					notificationChat: item.allowNotificationChat,
					notificationVoiceCall: item.allowNotificationVoiceCall,
					notificationVideoCall: item.allowNotificationVideoCall,
				},
				relation: withToken ? {
					blocked: item.isBlocked,
					blockedMe: item.isBlockedMe,
					favorited: item.isFaved,
				} : undefined,
				dropdowns
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
	async started() { },

	/**
	 * Service stopped lifecycle event handler
	 */
	async stopped() { },
};

export default ProfileService;
