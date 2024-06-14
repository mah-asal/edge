import type { ServiceSchema } from "moleculer";

import axios from "axios";

const CallService: ServiceSchema = {
    name: "call",
    version: 'api.v1',

    /**
     * Settings
     */
    settings: {
        endpoint: process.env.OPENVIDU_ENDPOINT,
        username: process.env.OPENVIDU_USERNAME,
        password: process.env.OPENVIDU_PASSWORD,
    },

    /**
     * Dependencies
     */
    dependencies: [],

    /**
     * Actions
     */
    actions: {
        make: {
            visibility: 'published',
            description: 'Make a online call',
            params: {
                user: {
                    type: 'number',
                    convert: true,
                    min: 1
                },
                mode: {
                    type: 'enum',
                    values: ['voice', 'video'],
                    default: 'voice'
                },
            },
            async handler(ctx) {
                try {
                    const { user, mode } = ctx.params;
                    const { token } = ctx.meta;

                    // 1. get user profile info
                    const resultOfMyProfile: any = await ctx.call('api.v1.profile.me', {}, {
                        meta: {
                            token,
                        }
                    });

                    if (resultOfMyProfile.code != 200) {
                        return {
                            code: 400,
                            i18n: 'BAD_USER'
                        }
                    }

                    var result = await axios(
                        `${this.settings.endpoint}/openvidu/api/sessions`,
                        {
                            method: 'post',
                            auth: {
                                username: this.settings.username,
                                password: this.settings.password
                            },
                            headers: {
                                'Content-Type': 'application/json'
                            }
                        }
                    );

                    if (result.status != 200) {
                        return {
                            code: 500,
                            i18n: 'OPENVIDU_SERVER_ERROR'
                        }
                    }

                    const sessionId = result.data.sessionId;

                    var result = await axios(
                        `${this.settings.endpoint}/openvidu/api/sessions/${sessionId}/connection`,
                        {
                            method: 'post',
                            auth: {
                                username: this.settings.username,
                                password: this.settings.password
                            },
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            data: {
                                "type": "WEBRTC",
                                "role": "PUBLISHER",
                            },
                        }
                    );

                    if (result.status != 200) {
                        return {
                            code: 500,
                            i18n: 'OPENVIDU_SERVER_ERROR'
                        }
                    }

                    const sessionToken = result.data.token.slice(56);
                    const sessionConnectionId = result.data.connectionId;

                    ctx.emit('socket.emit', {
                        'to': user,
                        'event': 'call:calling',
                        'data': {
                            'user': {
                                'id': resultOfMyProfile['data']['id'],
                                'avatar': resultOfMyProfile['data']['avatar'],
                                'fullname': resultOfMyProfile['data']['fullname'],
                            },
                            'mode': mode,
                            'session': sessionId,
                            'endpoint': this.settings.endpoint,
                        },
                    });

                    const data = {
                        session: sessionId,
                        token: sessionToken,
                        endpoint: this.settings.endpoint,
                        ws: result.data.token
                    };
                    
                    const base64 = btoa(JSON.stringify(data));

                    return {
                        code: 200,
                        data: {
                            ...data,
                            base64,
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
        destroy: {
            visibility: 'published',
            description: 'Destroy an incoming call',
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

                    // 1. get user profile info
                    const resultOfMyProfile: any = await ctx.call('api.v1.profile.me', {}, {
                        meta: {
                            token,
                        }
                    });

                    if (resultOfMyProfile.code != 200) {
                        return {
                            code: 400,
                            i18n: 'BAD_USER'
                        }
                    }

                    ctx.emit('socket.emit', {
                        'to': user,
                        'event': 'call:destroy',
                        'data': {
                            'user': {
                                'id': resultOfMyProfile['data']['id'],
                            }
                        }
                    });

                    return {
                        code: 200,
                    }
                } catch (error) {
                    return {
                        code: 500
                    }
                }
            }
        },
        join: {
            visibility: 'published',
            description: 'Join to a call sesstion',
            params: {
                session: {
                    type: 'string'
                }
            },
            async handler(ctx) {
                try {
                    const { session } = ctx.params;

                    var result = await axios(
                        `${this.settings.endpoint}/openvidu/api/sessions/${session}/connection`,
                        {
                            method: 'post',
                            auth: {
                                username: this.settings.username,
                                password: this.settings.password
                            },
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            data: {
                                "type": "WEBRTC",
                                "role": "PUBLISHER",
                            },
                        }
                    );

                    if (result.status != 200) {
                        return {
                            code: 500,
                            i18n: 'OPENVIDU_SERVER_ERROR'
                        }
                    }

                    const sessionToken = result.data.token.slice(56);

                    const data = {
                        session: session,
                        token: sessionToken,
                        endpoint: this.settings.endpoint,
                        ws: result.data.token
                    };

                    const base64 = btoa(JSON.stringify(data));

                    return {
                        code: 200,
                        data: {
                            ...data,
                            base64
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

export default CallService;
