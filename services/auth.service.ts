import type { ServiceSchema } from "moleculer";
import api from "../shared/api";

const AuthService: ServiceSchema = {
	name: "auth",
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
		captcha: {
			visibility: 'published',
			description: 'Get a new captcha',
			async handler(ctx) {
				try {
					const result = await api.request({
						method: 'GET',
						path: '/Security/GetCaptchaImage',
					});

					return {
						code: 200,
						data: {
							hash: result['returnData']['validateHash'],
							base64: result['returnData']['img']['fileContents'],
						}
					};
				} catch (error) {
					return {
						code: 200
					}
				}
			}
		},
		login: {
			visibility: 'published',
			description: 'Login',
			params: {
				phone: {
					type: 'string',
					min: 11,
					max: 11
				},
				password: {
					type: 'string',
					min: 4
				},
				captcha: {
					type: 'string',
					min: 4,
					max: 4,
					default: '8112'
				},
				captchaHash: {
					type: 'string',
					default: '2070140485'
				}
			},
			async handler(ctx) {
				try {
					const { phone, password, captcha, captchaHash } = ctx.params;

					const result = await api.request({
						method: 'POST',
						path: '/Security/LoginApi',
						data: {
							"Username": phone,
							"Password": password,
							"Captcha": captcha,
							"ValidateHash": captchaHash,
						}
					});

					return {
						code: 200,
						"message": result['messages'][0],
						data: {
							"token": result['returnData']
						}
					}
				} catch (error) {
					return {
						code: 500
					}
				}
			}
		},
		forgot: {
			visibility: 'published',
			description: 'Send a new password by phone',
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

					const result = await api.request({
						method: 'POST',
						path: '/Home/ForgetPassword',
						data: {
							"Mobile": phone,
						}
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
		register: {
			visibility: 'published',
			description: 'Register',
			params: {
				name: {
					type: 'string',
					min: 3
				},
				gender: {
					type: 'string',
					min: 1
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
				phone: {
					type: 'string',
					min: 11,
					max: 11
				},
				password: {
					type: 'string',
					min: 4
				},
			},
			async handler(ctx) {
				try {
					const data = {
						"Name": ctx.params['name'],
						"Sexuality": ctx.params['gender'],
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
						"Mobile": ctx.params['phone'],
						"Password": ctx.params['password'],
						"PasswordRepeat": ctx.params['password'],
					};

					const result = await api.request({
						method: 'POST',
						path: '/Home/Register',
						data: data
					});

					return {
						code: 200,
						"message": result['messages'][0],
						data: {
							"token": result['returnData']
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

export default AuthService;
