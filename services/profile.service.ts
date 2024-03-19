import type { Context, Service, ServiceSchema, ServiceSettingSchema } from "moleculer";
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
		one: {
			visibility: 'published',
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
				enabled: true,
				// ttl for 1 hour
				ttl: 3600
			},
			async handler(ctx) {
				try {
					const { id, detailed } = ctx.params;
					const token = ctx.meta.token;

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

					if(status && this.settings.status[status]) {
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
		async textFromDropdown(
			group: string,
			value: string
		) {
			if(!value) return "نامشخص";

			try {
				const result: any = await this.broker.call('api.v1.dropdown.byGroupAndValue', {
					key: group,
					value: value.toString(),
				});				

				if (result.data) {
					return result.data;
				}

				return "خطا دریافت"

			} catch (error) {
				console.error(error);

				return "خطا دریافت"
			}
		},
		async formatProfile(item: any, detailed: boolean = false, withToken: boolean = false) {
			let image = item.defaultImageUrl;

			if (item.userImageConfirmed && item.userImagesURL) {
				image = item.userImagesURL;
			}
			
			image = endpoint.api + image;

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
						Province: item.province,
						City: item.city,
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
			}			

			return {
				id: item.id,
				status: this.settings.status[item.latestUserLoginStatus * -10],
				avatar: image,
				fullname: `${item.name} ${item.family ?? ''}`.trim(),
				...details,
				plan: {
					free: item.hasFreeSpecialAccount ? true : false,
					special: item.hasSpecialAccount ? true : false,
					ad: item.hasAdvertisementAccount ? true : false,
				},
				permission: {
					voiceCall: item.allowVoiceCall,
					videoCall: item.allowVideoCall,
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
