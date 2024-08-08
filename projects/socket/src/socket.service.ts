import type { ServiceSchema } from "moleculer";

import { Server } from "socket.io";

import { server } from "../../http/src/server";
import prisma from "../../../shared/prisma";
import jwt from "../../../shared/jwt";

const SocketService: ServiceSchema = {
    name: "socket",
    version: "v1",

    /**
     * Settings
     */
    settings: {
        state: "UNKNOWN",
        io: undefined
    },

    /**
     * Dependencies
     */
    dependencies: [],

    /**
     * Actions
     */
    actions: {
        onlines: {
            visibility: 'published',
            description: 'Get online users count',
            async handler(ctx) {
                try {
                    return {
                        code: 200,
                        data: this.settings.io.engine.clientsCount,
                    }
                } catch (error) {
                    return {
                        code: 500
                    }
                }
            }
        },
        online: {
            visibility: 'published',
            description: 'Get user socket is available or not to check user is online',
            params: {
                user: {
                    type: 'number',
                    convert: true,
                    min: 1
                }
            },
            async handler(ctx) {
                try {
                    const room = this.settings.io.sockets.adapter.rooms.get(ctx.params.user);

                    if (room) {
                        return {
                            code: 200,
                            i18n: 'ONLINE'
                        }
                    } else {
                        return {
                            code: 404,
                            i18n: 'OFFLINE'
                        }
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
    events: {
        "socket.emit": {
            handler(ctx: any) {
                const { event, data, room, to } = ctx.params;

                if (room) {
                    this.settings.io.to(room).emit("event", { event, data });
                }

                if (to) {
                    this.settings.io.to(to).emit("event", { event, data });
                }

                if (!room && !to) {
                    this.settings.io.emit("event", { event, data });
                }
            }
        },
        "socket.room.join": {
            handler(ctx: any) {
                const { room, socket } = ctx.params;

                if (socket.meta) {
                    socket.meta.id = room;
                }

                socket.join(room);
            }
        },
        "socket.room.leave": {
            handler(ctx: any) {
                const { room, socket } = ctx.params;

                socket.leave(room);
            }
        },
    },

    /**
     * Methods
     */
    methods: {
        listActions(): any[] {
            return this.broker.registry.actions.list({
                'onlyAvailable': true,
                'skipInternal': true,
            });
        },
        findAction(name: string): any {
            const listActions = this.listActions();

            const foundAction = listActions.find((item: any) => item.name == name);

            return foundAction ?? foundAction!.action;
        },
        formatAction(action: any): any {
            return {
                name: action.name,
                params: action.action.params,
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
    async started() {
        const io = new Server(server, {
            cors: {
                origin: "*",
                methods: ["GET", "POST"]
            }
        });


        io.on('connection', (socket) => {
            // event that socket on connect
            this.broker.emit("socket.connect", { socket });

            (socket as any).meta = {
                connectedBy: "socket",
                ip: socket.request.headers['x-forwarded-for'] || socket.request.socket.remoteAddress,
                userAgent: socket.request.headers['user-agent'],
                $socket: socket,
            }

            if (socket.handshake.headers['bearer']) {
                (socket as any).meta.token = socket.handshake.headers['bearer'];
                const tdata = jwt.extract((socket as any).meta.token);
                (socket as any).meta.id = tdata['sub'];
                (socket as any).meta.sex = tdata['Sexuality'] == "0" ? 'female' : 'male';


                this.broker.emit("socket.auth", {
                    socket,
                    token: (socket as any).meta.token,
                    id: tdata['sub']
                });
            }

            if (socket.handshake.query['bearer']) {
                (socket as any).meta.token = socket.handshake.query['bearer'];
                const tdata = jwt.extract((socket as any).meta.token);
                (socket as any).meta.id = tdata['sub'];
                (socket as any).meta.sex = tdata['Sexuality'] == "0" ? 'female' : 'male';

                this.broker.emit("socket.auth", {
                    socket,
                    token: (socket as any).meta.token,
                    id: tdata['sub']
                });
            }

            const _socketEmit = socket.emit;

            (socket as any).emit = async (event: string, data: any) => {
                _socketEmit.call(socket, event, data);
            }

            // socket on disconnect event emit
            socket.on("disconnect", () => {
                this.broker.emit("socket.disconnect", { socket });
            });

            // socket on auth event emit
            socket.on("auth", (data) => {
                if (data['token']) {
                    (socket as any).meta.token = data['token'];
                    const tdata = jwt.extract((socket as any).meta.token);
                    (socket as any).meta.id = tdata['sub'];
                    (socket as any).meta.sex = tdata['Sexuality'] == "0" ? 'female' : 'male';
                    this.broker.emit("socket.auth", { socket, token: data['token'], id: tdata['sub'] });
                } else {
                    socket.emit("actions_response", {
                        status: false,
                        code: 403,
                        i18n: 'FORBIDEN',
                        message: "Forbiden",
                        data: {
                            "message": "Bad Token"
                        },
                    });
                }
            });

            socket.on("health", () => {
                socket.emit("health_response", {
                    status: true,
                    code: 200,
                    i18n: 'HEALTH_CHECK',
                    message: "Health check",
                    data: {
                        state: this.settings.state,
                        uptime: process.uptime(),
                        timestamp: Date.now(),
                    }
                });
            });

            socket.on("actions", () => {
                const listActions = this.listActions();

                const formattedActions = listActions.map((action: any) => this.formatAction(action));

                socket.emit("actions_response", {
                    status: true,
                    code: 200,
                    i18n: 'ACTIONS_LIST',
                    message: "Actions list",
                    data: formattedActions,
                });
            });

            socket.on("action", (data) => {
                const { action } = data;

                if (!action) {
                    return socket.emit("action_response", {
                        status: false,
                        code: 400,
                        i18n: 'BAD_DATA',
                        message: "Action name needed",
                    });

                }

                const foundAction = this.findAction(action);

                if (!foundAction) {
                    return socket.emit("action_response", {
                        status: false,
                        code: 404,
                        i18n: 'ACTION_NOT_FOUND',
                        message: "Action not found",
                    });
                }

                socket.emit("action_response", {
                    status: true,
                    code: 200,
                    i18n: 'ACTION_INFO',
                    message: "Action info",
                    data: this.formatAction(foundAction),
                });
            });

            socket.on('call', async (data) => {
                const { action, params, id, cache } = data;

                const start = Date.now();

                try {
                    if (!action) {
                        return socket.emit("call_response", {
                            status: false,
                            code: 400,
                            i18n: 'BAD_DATA',
                            message: "Action name needed",
                            meta: {
                                id: id ?? "orphan",
                                action: action,
                                params: params,
                            }
                        });
                    }

                    if (action.startsWith("$")) {
                        return socket.emit("call_response", {
                            status: false,
                            code: 400,
                            i18n: 'BAD_DATA',
                            message: "Action name cannot start with $",
                            meta: {
                                id: id ?? "orphan",
                                action: action,
                                params: params,
                            }
                        });
                    }

                    const foundAction = this.findAction(action);

                    if (!foundAction || foundAction.action.visibility != "published") {
                        return socket.emit("call_response", {
                            status: false,
                            code: 404,
                            i18n: 'ACTION_NOT_FOUND',
                            message: "Action not found",
                            meta: {
                                id: id ?? "orphan",
                                action: action,
                                params: params,
                            }
                        });
                    }

                    // check action has permission
                    if (foundAction.action.permission) {
                        const permission = foundAction.permission;

                        // check permission
                    }

                    const result: any = await this.broker.call(action, params, {
                        meta: {
                            ...(socket as any).meta,
                            cache: cache ?? false
                        }
                    });

                    result.status = result.status ?? result.code == 200;

                    socket.emit("call_response", {
                        status: true,
                        code: 200,
                        i18n: "ACTION_CALLED",
                        message: "Action called",
                        data: result,
                        meta: {
                            id: id ?? "orphan",
                            action: action,
                            params: params,
                        }
                    });

                } catch (error) {
                    if (error.message == 'Parameters validation error!') {
                        return socket.emit("call_response", {
                            status: false,
                            code: 400,
                            i18n: 'BAD_DATA',
                            message: error.message,
                            data: error.data.map((item: any) => ({
                                message: item.message,
                                field: item.field,
                                error: item.type
                            })),
                            meta: {
                                id: id ?? "orphan",
                                action: action,
                                params: params,
                            }
                        });
                    }

                    socket.emit("call_response", {
                        status: false,
                        code: 500,
                        i18n: 'INTERNAL_SERVER_ERROR',
                        message: error.message,
                        meta: {
                            id: id ?? "orphan",
                            action: action,
                            params: params,
                        }
                    });
                }
            });
        });

        this.settings.io = io;
    },

    /**
     * Service stopped lifecycle event handler
     */
    async stopped() { },
};

export default SocketService;
