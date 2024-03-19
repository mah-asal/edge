import type { ServiceSchema } from "moleculer";

import { Server } from "socket.io";

import { server } from "../../http/src/server";

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

            const _socketEmit = socket.emit;

            (socket as any).emit = (event: string, data: any) => {
                this.logger.info(`Socket event: ${event}`);

                _socketEmit.call(socket, event, data);
            }

            // socket on disconnect event emit
            socket.on("disconnect", () => {
                this.broker.emit("socket.disconnect", { socket });
            });

            // socket on auth event emit
            socket.on("auth", (data) => {
                this.broker.emit("socket.auth", { socket, data });
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
                try {
                    const { action, params, id } = data;

                    if (!action) {
                        return socket.emit("call_response", {
                            status: false,
                            code: 400,
                            i18n: 'BAD_DATA',
                            message: "Action name needed",
                        });
                    }

                    if (action.startsWith("$")) {
                        return socket.emit("call_response", {
                            status: false,
                            code: 400,
                            i18n: 'BAD_DATA',
                            message: "Action name cannot start with $",
                        });
                    }

                    const foundAction = this.findAction(action);

                    if (!foundAction || foundAction.action.visibility != "published") {
                        return socket.emit("call_response", {
                            status: false,
                            code: 404,
                            i18n: 'ACTION_NOT_FOUND',
                            message: "Action not found",
                        });
                    }

                    // check action has permission
                    if (foundAction.action.permission) {
                        const permission = foundAction.permission;

                        // check permission
                    }

                    const result: any = await this.broker.call(action, params, {
                        meta: (socket as any).meta,
                    });

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
                            }))
                        });
                    }

                    socket.emit("call_response", {
                        status: false,
                        code: 500,
                        i18n: 'INTERNAL_SERVER_ERROR',
                        message: error.message,
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
