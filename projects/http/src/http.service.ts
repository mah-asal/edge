import type { ServiceSchema } from "moleculer";

import path from "path";
import fs from "fs";

import { app, server, express, upload } from "./server";
import jwt from "../../../shared/jwt";
import prisma from "../../../shared/prisma";

const __admins = path.join(process.cwd(), 'admins.json');

const HttpService: ServiceSchema = {
    name: "http",
    version: "v1",

    /**
     * Settings
     */
    settings: {
        port: process.env.PORT ?? 3000,
        state: "UNKNOWN",
        publicdir: path.join(process.cwd(), "public"),
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
        listActions(): any[] {
            return this.broker.registry.actions.list({
                'onlyAvailable': true,
                'skipInternal': true,
                'withEndpoints': true
            });
        },
        findAction(name: string): any {
            try {
                const listActions = this.listActions();

                const foundAction = listActions.find((item: any) => item.name == name);

                return foundAction ?? foundAction!.action;

            } catch (error) {
                return undefined;
            }
        },
        formatAction(action: any): any {
            return {
                name: action.name,
                description: action.action.description,
                params: action.action.params,
                visibility: action.action.visibility,
                permission: action.action.permission,
                nodes: action.endpoints.map((item: any) => item.nodeID)
            }
        },
        getAdmin(username: string, password: string) {
            const data = fs.readFileSync(__admins).toString();

            const json = JSON.parse(data);

            if (json[username] && json[username]['password'] == password) {
                return {
                    username,
                    ...json[username]
                }
            }

            return null;
        }
    },

    /**
     * Service created lifecycle event handler
     */
    created() {
        this.settings.state = "CREATED";
    },

    /**
     * Service started lifecycle event handler
     */
    async started() {
        this.settings.state = "STARTED";


        server.listen(
            this.settings.port,
            () => {
                this.logger.info(
                    `Server is starting on port ${this.settings.port}`
                )
            }
        );

        // check public dir exists then serve it
        if (fs.existsSync(this.settings.publicdir)) {
            this.logger.info(
                `Serving static files from ${this.settings.publicdir}`
            );

            app.use(
                express.static(this.settings.publicdir)
            );
        }

        app.use((req, res, next) => {
            (req as any).meta = {
                connectedBy: "http",
                ip: req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for'] || req.socket.remoteAddress,
                userAgent: req.headers['user-agent'],
                requestedAt: Date.now(),
                responsedAt: null,
                response: null,
            };

            if (req.headers['bearer']) {
                (req as any).meta.token = req.headers['bearer'];
            }

            if (req.query['token']) {
                (req as any).meta.token = req.query['token'];
            }

            if (req.headers['x-cache'] == 'true' || req.query['xCache'] == 'true') {
                (req as any).meta.cache = true;
            }

            if ((req as any).meta.token) {
                try {
                    const data = jwt.extract((req as any).meta.token);
                    (req as any).meta.id = data['sub'];
                } catch (error) {
                    //
                }
            }

            const _resJson = res.json;

            (res as any).json = async (body: any) => {
                (req as any).meta.responsedAt = Date.now();
                (req as any).meta.response = body;

                _resJson.call(res, body);
            }


            if (req.headers['authorization']) {
                const token: string = req.headers['authorization'].replace('Basic ', '');
                (req as any).meta.accessToken = token;

                const [username, password] = Buffer.from(token, 'base64').toString('ascii').split(':');

                const accessData = this.getAdmin(username, password);

                if (accessData) {
                    (req as any).meta.accessData = accessData;
                } else {
                    return res.status(403).json({
                        status: false,
                        code: 403,
                        i18n: 'FORBIDDEN',
                        data: {
                            error: 'Bad admin'
                        }
                    })
                }
            }

            next();
        });

        // send hello world
        app.all("/", (req, res) => {
            res.json({
                status: true,
                code: 200,
                message: "Hello World!",
                data: {
                    timestamp: Date.now(),
                }
            });
        });

        // send service info
        app.get("/api/v1/info", (req, res) => {
            res.json({
                status: true,
                code: 200,
                i18n: 'SERVICE_INFO',
                message: "Service info",
                data: {
                    name: this.broker.namespace,
                    version: this.broker.version,
                    node: this.broker.nodeID,
                    state: this.settings.state,
                    uptime: process.uptime(),
                    timestamp: Date.now()
                }
            });
        });

        // send actions list
        app.get("/api/v1/action", (req, res) => {
            try {
                const actions = this.listActions();

                res.json({
                    status: true,
                    code: 200,
                    i18n: 'ACTIONS_LIST',
                    message: "Actions list",
                    data: actions.map(this.formatAction)
                });
            } catch (error) {
                res.status(500).json({
                    status: false,
                    code: 500,
                    i18n: 'INTERNAL_SERVER_ERROR',
                    message: "Internal Server Error"
                });
            }
        });

        // send action info
        app.get("/api/v1/action/:action", (req, res) => {
            try {
                const action = req.params.action;

                const foundAction = this.findAction(action);

                if (!foundAction) {
                    return res.status(404).json({
                        status: false,
                        code: 404,
                        i18n: 'ACTION_NOT_FOUND',
                        message: "Action not found"
                    });
                }

                res.json({
                    status: true,
                    code: 200,
                    i18n: 'ACTION_INFO',
                    message: "Action info",
                    data: this.formatAction(foundAction)
                });
            } catch (error) {
                res.status(500).json({
                    status: false,
                    code: 500,
                    i18n: 'INTERNAL_SERVER_ERROR',
                    message: "Internal Server Error"
                });
            }
        });

        // send health check
        app.get("/api/v1/health", (req, res) => {
            try {
                res.json({
                    status: true,
                    code: 200,
                    i18n: 'HEALTH_CHECK',
                    message: "Health check",
                    data: {
                        state: this.settings.state,
                        uptime: process.uptime(),
                        timestamp: Date.now()
                    }
                })
            } catch (error) {
                res.status(500).json({
                    status: false,
                    code: 500,
                    i18n: 'INTERNAL_SERVER_ERROR',
                    message: "Internal Server Error"
                });
            }
        });

        app.post('/api/v1/upload', upload.single('file'), async (req, res) => {
            try {
                if (!req.file) {
                    return res.json({
                        status: false,
                        code: 400,
                        i18n: 'FILE_NEEDED',
                        message: 'Need file to upload'
                    });
                }

                const data = {
                    mimeType: req.file!.mimetype,
                    size: req.file!.size,
                    filename: req.file!.filename,
                    url: (req as any).file_location ?? (req.file as any).location ?? req.file!.filename,
                };

                const hash: string = req.query['hash'] as string;

                if (hash) {
                    await prisma.file.create({
                        data: {
                            user: (req.query['id'] as string || req.query['user'] as string) ?? '0',
                            hash: hash,
                            ...data,
                            size: data.size ?? 0,
                        }
                    });
                }

                res.json({
                    status: true,
                    code: 200,
                    i18n: 'FILE_UPLOADED',
                    message: 'File uploaded successfully',
                    data: data,
                });
            } catch (error) {
                console.error(error);

                res.status(500).json({
                    stauts: false,
                    code: 500,
                    i18n: 'INTERNAL_SERVER_ERROR',
                    message: 'Internal server error'
                })
            }
        });

        // call action
        app.all("/api/v1/call/:action", async (req, res) => {
            // concat queries and body
            const params = {
                ...req.query,
                ...req.body,
            };

            const action = req.params.action;

            try {
                (req as any).meta.action = action;
                (req as any).meta.params = params;

                if (action.startsWith('$')) {
                    return res.status(400).json({
                        status: false,
                        code: 400,
                        i18n: 'BAD_DATA',
                        message: "Action name cannot start with $"
                    });
                }

                const foundAction = this.findAction(action);


                if (!foundAction || foundAction.action.visibility != "published") {
                    return res.status(404).json({
                        status: false,
                        code: 404,
                        i18n: 'ACTION_NOT_FOUND',
                        message: "Action not found"
                    });
                }

                // check action has permission
                if (foundAction.action.permission != undefined) {
                    const permission = foundAction.action.permission;

                    if ((req as any).meta.accessData == undefined) {
                        return res.status(403).json({
                            status: false,
                            code: 403,
                            i18n: 'FORBIDDEN',
                            data: {
                                error: 'Access denied'
                            }
                        })
                    }
                }

                const result: any = await this.broker.call(action, params, {
                    meta: (req as any).meta,
                });

                result.status = result.status ?? result.code == 200;

                if (result.code == 301 && result.data && typeof result.data == 'string') {
                    res.status(301).redirect(result.data);
                }

                res.status(result.code ?? 200).json({
                    status: result.status,
                    code: result.code ?? 200,
                    i18n: result.i18n ?? 'OK',
                    message: result.message,
                    meta: result.meta,
                    data: result.data,
                });

            } catch (error) {
                if (error.message == 'Parameters validation error!') {
                    return res.status(400).json({
                        status: false,
                        code: 400,
                        i18n: 'BAD_DATA',
                        message: error.message,
                        meta: {
                            params,
                        },
                        data: error.data.map((item: any) => ({
                            message: item.message,
                            field: item.field,
                            error: item.type
                        })),
                    })
                }

                console.log(error.message);


                res.status(500).json({
                    status: false,
                    code: 500,
                    i18n: 'INTERNAL_SERVER_ERROR',
                    message: "Internal Server Error"
                });
            }
        });

        // handle 404
        app.all("*", (req, res) => {
            res.status(404).json({
                status: false,
                code: 404,
                i18n: 'NOT_FOUND',
                message: "Not Found"
            });
        });

    },

    /**
     * Service stopped lifecycle event handler
     */
    async stopped() {
        this.settings.state = "STOPPED";

        // handle server port listening
        server.close();
    },
};

export default HttpService;
