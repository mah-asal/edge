import type { ServiceSchema } from "moleculer";

import moment from 'jalali-moment';
import qs from 'qs';

import api from "../shared/api";
import endpoint from "../shared/endpoint";

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
					max: 100,
					default: 10,
					optional: true,
					convert: true
				},
				type: {
					type: 'enum',
					values: ['newest', 'advertised', 'visited', 'favorited', 'favorites', 'blocked', 'blocks'],
					default: 'newest'
				},
				filters: {
					type: "object",
					default: {},
				}
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

							image = endpoint.api + image;

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

									return Math.round(dur.asYears());
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
				keys: ['id', 'detailed'],
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
				keys: ['#token'],
			},
			async handler(ctx) {
				try {
					const token = ctx.meta.token;

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
		async formatProfile(item: any, detailed: boolean = false, withToken: boolean = false) {
			let image = item.defaultImageUrl;

			if (item.userImageConfirmed && item.userImagesURL) {
				image = item.userImagesURL;
			}

			image = endpoint.format(image);

			let details: any = {};

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

				if (result.code == 200) {
					details = result.data;
				}

				details['childCount'] = item.childCount;
				details['oldestChildAge'] = item.oldestChildAge;
				details['height'] = item.height;
				details['weight'] = item.weight;
				details['job'] = item.job;
				details['aboutMe'] = item.aboutMe;
				details['birthDate'] = moment(item.birthDate).locale('fa').format('dddd jDD jMMMM jYYYY');
				details['registerDate'] = moment(item.createDate).locale('fa').format('dddd jDD jMMMM jYYYY');
				details['age'] = (() => {
					const dur = moment.duration(moment().diff(moment(item.birthDate)));

					return Math.round(dur.asYears());
				})();
			}

			let plan: any = {};

			if (withToken) {
				plan['sms'] = item.countSmsReminded;

				const diff = (key = "") => {
					const value = item[key];

					if (value) {
						const dur = moment.duration(moment(value).diff(moment()));

						return dur.asDays() <= 0 ? 0 : Math.round(dur.asDays());
					}

					return 0;
				}

				plan['specialDays'] = diff('endDateSpecialAccount');
				plan['adDays'] = diff('endDateAdvertisementAccount');
			}

			return {
				id: item.id,
				status: this.settings.status[item.latestUserLoginStatus * -10],
				avatar: image,
				fullname: `${item.name} ${item.family ?? ''}`.trim(),
				phone: item.mobile,
				verified: item.mobileConfirmed ?? false,
				last: moment(item.latestUserActivity).locale('fa').format('dddd jDD jMMMM jYYYY ساعت HH:MM'),
				seen: this.settings.seen[item.isOnlineByDateTime] ?? "offline",
				...details,
				plan: {
					free: item.endDateFreeSpecialAccount != null ? true : false,
					special: item.hasSpecialAccount ? true : false,
					ad: item.hasAdvertisementAccount ? true : false,
					...plan
				},
				permission: {
					voiceCall: item.allowVoiceCall,
					videoCall: item.allowVideoCall,
					notificationChat: item.allowNotificationChat,
					notificationVoiceCall: item.allowNotificationVoiceCall,
					notificationVideoCall: item.allowNotificationVideoCall,
				},
				relation: withToken ? {
					blocked: item.isBlocked,
					blockedMe: item.isBlockedMe,
					favorited: item.isFaved,
				} : undefined
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
