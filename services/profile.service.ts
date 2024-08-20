import type { ServiceSchema } from "moleculer";

import moment from 'jalali-moment';
import qs from 'qs';

import api from "../shared/api";
import jwt from "../shared/jwt";

import ProfileMixin from "../mixin/profile.mixin";

const ProfileService: ServiceSchema = {
	name: "profile",
	version: 'api.v1',

	mixins: [ProfileMixin],

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
		home: {
			visibility: 'published',
			description: 'Get home page profiles',
			async handler(ctx) {
				try {
					const start = Date.now();

					const [advertised, visited, newest]: any[] = await Promise.all([
						ctx.call('api.v1.profile.search', {
							limit: 4,
							type: 'advertised'
						}, {
							meta: ctx.meta
						}),
						ctx.call('api.v1.profile.search', {
							limit: 4,
							type: 'visited'
						}, {
							meta: ctx.meta
						}),
						ctx.call('api.v1.profile.search', {
							limit: 4,
							type: 'newest',
							filters: {
								HasImage: 1
							}
						}, {
							meta: ctx.meta
						}),
					]);

					return {
						code: 200,
						meta: {
							took: Date.now() - start,
						},
						data: {
							advertised: advertised['data'],
							visited: visited['data'],
							newest: newest['data'],
						}
					}
				} catch (error) {
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
								isRandom: true
							};
							break;
						default:
							path = '/search';
							break;
					}

					let queries = qs.stringify({
						pageIndex: page - 1,
						pageSize: limit,
						...typeQueries,
						...filters,
					});

					const start = Date.now();

					if (queries.includes('&HasImage=0')) {
						queries = queries.replace('&HasImage=0', '');
					}

					const result = await api.request({
						path: `${path}?${queries}`,
						method: 'GET',
						token,
					});

					let output: any[] = [];

					if (result.returnData) {
						for (let item of result.returnData.items) {
							let image = item.userImagesURL;

							if (image.startsWith('http') == false) {
								image = 'https://s3.tv-92.com/uploads' + image;
							}

							// const cityResult: any = await ctx.call('api.v1.dropdown.byGroupAndValue', {
							// 	key: "City",
							// 	value: item.city ? item.city.toString() : '',
							// });

							const cityResult = await this.broker.cacher?.get(`City:${item.city}`);							

							output.push({
								id: item.id,
								avatar: image,
								fullname: `${item.name} ${item.family ?? ''}`.trim(),
								verified: item.mobileConfirmed ?? false,
								city: cityResult ?? 'خارج از کشور',
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
		searchOnElastic: {
			visibility: 'published',
			description: 'Search profiles on elastic',
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
					default: 12,
					optional: true,
					convert: true
				},
				type: {
					type: 'enum',
					values: ['search', 'newest', 'advertised'],
					default: 'search'
				},
				filters: {
					type: "object",
					default: {},
				}
			},
			async handler(ctx) {
				try {
					const { page, limit, type, filters } = ctx.params;
					const { sex } = ctx.meta;

					let filter: any = [];
					let sort: any = [];
					let random: boolean = false;

					if (sex) {
						filter.push({
							key: 'data.dropdowns.sexuality.keyword',
							value: sex == 'male' ? 1 : 0,
							oprator: 'equals'
						});
					}

					switch (type) {
						case 'advertised':
							filter.push({
								key: 'data.plan.ad',
								value: true,
								oprator: 'equals'
							});
							random = true;
							break;
						case 'newest':
							filter.push({
								key: 'data.defaultAvatar',
								value: false,
								oprator: 'equals'
							});
							sort.push({
								key: 'data.registerAt',
								order: 'asc'
							});
							break;
					}

					return ctx.call('api.v1.elastic.search', {
						page: page,
						limit: limit,
						filter,
						sort,
						random,
					});
				} catch (error) {
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

					const start = Date.now();

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

					if (!result.returnData) {
						return {
							code: 200,
							data: {
								error: 'LEAVE_FOR_EVER',
								profile: null
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
						meta: {
							took: Date.now() - start
						},
						data: {
							error: null,
							profile: await this.formatProfile(result.returnData, detailed, token != undefined),
						}
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
