import type { ServiceSchema } from "moleculer";
import moment from 'jalali-moment';

const ProfileMixin: ServiceSchema = {
	name: "profile",
	version: 'mixin',

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
			let image: string = item.defaultImageUrl;
			let canDeleteImage = false;

			if (item.userImagesURL && !item.userImagesURL.includes('static')) {
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
				details['birthAt'] = Math.abs(birthDate.valueOf());
				details['registerDate'] = moment(item.createDate).locale('fa').format('dddd jDD jMMMM jYYYY');
				details['registerAt'] = moment(item.createDate).valueOf();
				dropdowns['birthDateYear'] = birthDate.jYear();
				dropdowns['birthDateMonth'] = (birthDate.jMonth() + 1);
				dropdowns['birthDateDay'] = birthDate.jDate();
				details['age'] = (() => {
					const dur = moment.duration(moment().diff(moment(item.birthDate)));

					return Math.round(dur.asYears());
				})();
			}

			let plan: any = {};

			if (withToken) {
				plan['sms'] = item.countSmsReminded;
			}

			const diff = (key = "", mode: 'days' | 'hours' | 'minutes') => {
				const value = item[key];

				if (value) {
					const dur = moment.duration(moment(value).diff(moment()));

					if (mode == 'days') {
						return dur.asDays() <= 0 ? 0 : Math.round(dur.asDays());
					}

					if (mode == 'hours') {
						return dur.asHours() <= 0 ? 0 : Math.round(dur.asHours());
					}

					if (mode == 'minutes') {
						return dur.asMinutes() <= 0 ? 0 : Math.round(dur.asMinutes());
					}
				}

				return 0;
			}

			plan['specialDays'] = diff('endDateSpecialAccount', 'days');
			plan['adDays'] = diff('endDateAdvertisementAccount', 'days');
			plan['freeHours'] = diff('endDateFreeSpecialAccount', 'hours');
			plan['freeMinutes'] = diff('endDateFreeSpecialAccount', 'minutes');			


			return {
				id: item.id,
				status: this.settings.status[item.latestUserLoginStatus * -10],
				avatar: image,
				defaultAvatar: !canDeleteImage,
				fullname: `${item.name} ${item.family ?? ''}`.trim(),
				phone: item.mobile,
				verified: item.mobileConfirmed ?? false,
				last: item.latestUserActivity ? moment(item.latestUserActivity).locale('fa').format('dddd jDD jMMMM jYYYY ساعت HH:MM') : 'خیلی وقت پیش',
				lastAt: item.latestUserActivity ? moment(item.latestUserActivity).valueOf() : null,
				ago: item.latestUserActivity ? moment(item.latestUserActivity).locale('fa').fromNow(true) : 'خیلی وقت پیش',
				seen: this.settings.seen[item.isOnlineByDateTime] ?? "offline",
				age: (() => {
					const dur = moment.duration(moment().diff(moment(item.birthDate)));

					return Math.round(dur.years());
				})(),
				...details,
				plan: {
					freeAt: moment(item.endDateFreeSpecialAccount).valueOf(),
					free: item.endDateFreeSpecialAccount != null && plan && plan['freeHours'] != 0 ? true : false,
					specialAt: moment(item.endDateSpecialAccount).valueOf(),
					special: item.hasSpecialAccount ? true : false,
					adAt: moment(item.endDateAdvertisementAccount).valueOf(),
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

export default ProfileMixin;
