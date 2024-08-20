import type { ServiceSchema } from "moleculer";
import api from "../shared/api";
import _ from "lodash";

const boolean = [
	{
		type: 'boolean',
		convert: true,
		optional: true
	},
	{
		type: 'number',
		convert: true,
		min: 0,
		max: 1,
		optional: true
	}
];

const UserService: ServiceSchema = {
	name: "user",
	version: 'api.v1',

	/**
	 * Settings
	 */
	settings: {
	},

	/**
	 * Dependencies
	 */
	dependencies: [],

	/**
	 * Actions
	 */
	actions: {
		activeWelcomePackage: {
			visibility: 'published',
			description: 'Activate user welcome package',
			async handler(ctx) {
				try {
					const { token } = ctx.meta;

					const result = await api.request({
						method: 'GET',
						path: '/Panel/ActivateWelcomePakage',
						token,
					});

					return {
						code: 200,
						"message": result['messages'][0],
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
		changePassword: {
			visibility: 'published',
			decription: 'User change password',
			params: {
				password: {
					type: 'string',
					min: 4
				}
			},
			async handler(ctx) {
				try {
					const { password } = ctx.params;
					const { token } = ctx.meta;

					const result = await api.request({
						method: 'POST',
						path: '/Profile/UpdatePassword',
						token,
						data: {
							"Password": password,
							"PasswordRepeat": password
						}
					});

					return {
						code: 200,
						"message": result['code'] == 0 ? 'رمز عبور تغییر کرد' : 'خطا در تغییر رمز عبور رخ داد'
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
		changePhoneNumber: {
			visibility: 'published',
			decription: 'User change phone number',
			params: {
				phone: {
					type: 'string',
					min: 11,
					max: 11
				}
			},
			async handler(ctx) {
				try {
					const { phone } = ctx.params;
					const { token } = ctx.meta;

					const result = await api.request({
						method: 'POST',
						path: '/Profile/UpdateMobile',
						token,
						data: {
							"Mobile": phone,
						}
					});

					return {
						code: 200,
						"message": result['code'] == 0 ? 'شماره موبایل تغییر کرد' : 'خطا در تغییر شماره موبایل رخ داد',
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
		sendCode: {
			visibility: 'published',
			decription: 'Send verification code',
			async handler(ctx) {
				try {
					const { token } = ctx.meta;

					const result = await api.request({
						method: 'GET',
						path: '/Sms/GetSmsValidationCodeApi',
						token,
					});

					if (!result['validateHash']) {
						return {
							code: 400,
							message: "خطا در ارسال کد رخ داد",
						}
					}

					return {
						code: 200,
						"message": "کد ارسال شد",
						data: {
							hash: result['validateHash'],
							expiredAt: result['expireDate'],
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
		verifyCode: {
			visibility: 'published',
			decription: 'Verify verification code',
			params: {
				hash: {
					type: 'string'
				},
				code: {
					type: 'string',
					min: 4,
					max: 4
				}
			},
			async handler(ctx) {
				try {
					const { hash, code } = ctx.params;
					const { token } = ctx.meta;

					const result = await api.request({
						method: 'GET',
						path: `/Sms/MobileVerificationApi?recivedCode=${code}&validateHash=${hash}`,
						token,
					});

					return {
						status: result['code'] == 0,
						code: 200,
						"message": result['messages'][0],
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
		leaveAccount: {
			visibility: 'published',
			description: 'User leave its account',
			params: {
				"description": {
					type: 'string',
					default: ''
				}
			},
			async handler(ctx) {
				try {
					const { description } = ctx.params;
					const { token } = ctx.meta;

					const result = await api.request({
						method: 'POST',
						path: '/Home/Leave',
						token,
						data: {
							"Cause": description,
						}
					});

					return {
						code: 200,
						"message": result['messages'][0],
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
		deleteAccount: {
			visibility: 'published',
			description: 'User delete its account',
			params: {
				"description": {
					type: 'string',
					default: ''
				}
			},
			async handler(ctx) {
				try {
					const { description } = ctx.params;
					const { token } = ctx.meta;

					const result = await api.request({
						method: 'POST',
						path: '/Home/LeaveForever',
						token,
						data: {
							"Cause": description,
						}
					});

					return {
						code: 200,
						"message": result['messages'][0],
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
		refreshToken: {
			visibility: 'published',
			description: 'Get a new access token',
			async handler(ctx) {
				try {
					const { token } = ctx.meta;

					const result = await api.request({
						method: 'GET',
						path: '/Profile/RenewToken',
						token,
					});

					return {
						code: 200,
						"message": result['messages'][0],
						data: {
							token: result['returnData']
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
		deleteProfileImage: {
			visibility: 'published',
			description: 'Delete profile image',
			async handler(ctx) {
				try {
					const { token } = ctx.meta;

					const result = await api.request({
						method: 'POST',
						path: '/profile/DeleteProfileImage',
						token,
					});

					return {
						code: 200,
						"message": result['messages'][0],
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
		changeProfileImage: {
			visibility: 'published',
			description: 'User change its profile image by url',
			params: {
				"url": {
					type: 'url',
				}
			},
			async handler(ctx) {
				try {
					const { url } = ctx.params;
					const { token } = ctx.meta;

					const result = await api.request({
						method: 'POST',
						path: '/profile/UpdateProfileImageInExternalServere',
						token,
						data: {
							"url": url,
						}
					});

					return {
						status: result['code'] == 0,
						code: 200,
						"message": result['messages'][0],
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
		report: {
			visibility: 'published',
			description: 'Report a user',
			params: {
				reciver: {
					type: 'string'
				},
				user: {
					type: 'number',
					convert: true,
					min: 1,
					optional: true
				},
				title: {
					type: 'string'
				},
				message: {
					type: 'string'
				},
				image: {
					type: 'url',
					optional: true,
				}
			},
			async handler(ctx) {
				try {
					const { token } = ctx.meta;

					const data = {
						"MessageType": ctx.params.reciver,
						"Title": ctx.params.title,
						"Message": ctx.params.message,
						"ReportedUserId": ctx.params.user,
						"url": ctx.params.image
					};

					const result = await api.request({
						method: 'POST',
						path: '/AdminMessage/CreateImageInExternalServere',
						token,
						data,
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
		update: {
			visibility: 'published',
			description: 'User update its profile',
			params: {
				name: {
					type: 'string',
					min: 3
				},
				year: {
					type: 'string',
					min: 1
				},
				month: {
					type: 'string',
					min: 1
				},
				day: {
					type: 'string',
					min: 1
				},
				marital: {
					type: 'string',
					min: 1
				},
				children: {
					type: 'string',
					min: 1
				},
				maxAge: {
					type: 'string',
					min: 1
				},
				height: {
					type: 'string',
					min: 1
				},
				weight: {
					type: 'string',
					min: 1
				},
				color: {
					type: 'string',
					min: 1
				},
				shape: {
					type: 'string',
					min: 1
				},
				beauty: {
					type: 'string',
					min: 1
				},
				health: {
					type: 'string',
					min: 1
				},
				education: {
					type: 'string',
					min: 1
				},
				job: {
					type: 'string',
					min: 1
				},
				living: {
					type: 'string',
					min: 1
				},
				salary: {
					type: 'string',
					min: 1
				},
				car: {
					type: 'string',
					min: 1
				},
				home: {
					type: 'string',
					min: 1
				},
				province: {
					type: 'string',
					min: 1
				},
				city: {
					type: 'string',
					min: 1
				},
				religion: {
					type: 'string',
					min: 1
				},
				marriageType: {
					type: 'string',
					optional: true,
				},
				about: {
					type: 'string',
					min: 4
				},
			},
			async handler(ctx) {
				try {
					const { token } = ctx.meta;

					const data = {
						"Name": ctx.params['name'],
						"BirthDateYear": ctx.params['year'],
						"BirthDateMounth": ctx.params['month'],
						"BirthDateDay": ctx.params['day'],
						"MaritalStatus": ctx.params['marital'],
						"ChildCount": ctx.params['children'],
						"OldestChildAge": ctx.params['maxAge'],
						"Height": ctx.params['height'],
						"Weight": ctx.params['weight'],
						"SkinColor": ctx.params['color'],
						"StyleRate": ctx.params['shape'],
						"BeautyRate": ctx.params['beauty'],
						"HealthStatus": ctx.params['health'],
						"Education": ctx.params['education'],
						"Job": ctx.params['job'],
						"LifeStyle": ctx.params['living'],
						"SalaryRange": ctx.params['salary'],
						"CarStatus": ctx.params['car'],
						"HouseStatus": ctx.params['home'],
						"Province": ctx.params['province'],
						"City": ctx.params['city'],
						"ReligionRate": ctx.params['religion'],
						"MarriageType": ctx.params['marriageType'],
						"AboutMe": ctx.params['about'],
					};

					const result = await api.request({
						method: 'POST',
						path: '/Profile/Update',
						data: data,
						token: token
					});					

					return {
						code: 200,
						message: result['messages'].length == 2 && result['messages'][1].length != 0 ? result['messages'][1] : result['messages'][0],
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
		settings: {
			visibility: 'published',
			description: 'User change its settings',
			params: {
				allowVoiceCall: boolean,
				allowVideoCall: boolean,
				notificationReaction: boolean,
				notificationChat: boolean,
				notificationVideoCall: boolean,
				notificationVoiceCall: boolean
			},
			async handler(ctx) {
				try {
					const { allowVoiceCall, allowVideoCall, notificationReaction, notificationChat, notificationVideoCall, notificationVoiceCall } = ctx.params;
					const { token } = ctx.meta;

					let data: any = {};

					if (typeof allowVoiceCall != 'undefined') {
						data['allowVoiceCall'] = allowVoiceCall ? 'true' : 'false';
					}

					if (typeof allowVideoCall != 'undefined') {
						data['allowVideoCall'] = allowVideoCall ? 'true' : 'false';
					}

					if (typeof notificationChat != 'undefined') {
						data['allowNotificationChat'] = notificationChat ? 'true' : 'false';
					}

					if (typeof notificationReaction != 'undefined') {
						data['allowNotificationReaction'] = notificationReaction ? 'true' : 'false';
					}

					if (typeof notificationVideoCall != 'undefined') {
						data['allowNotificationVideoCall'] = notificationVideoCall ? 'true' : 'false';
					}

					if (typeof notificationVoiceCall != 'undefined') {
						data['allowNotificationVoiceCall'] = notificationVoiceCall ? 'true' : 'false';
					}

					await api.request({
						method: 'POST',
						path: '/Profile/Update',
						data: data,
						token: token,
					});

					return {
						code: 200,
						message: 'تنظیمات با موفقیت ذخیره شد'
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

export default UserService;
