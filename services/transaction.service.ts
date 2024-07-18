import type { ServiceSchema } from "moleculer";

import api from "../shared/api";

import moment from "jalali-moment";
import cheerio from 'cheerio';

const TransactionService: ServiceSchema = {
    name: "transaction",
    version: 'api.v1',

    /**
     * Settings
     */
    settings: {
        types: {
            '0': 'special',
            '1': 'sms',
            '3': 'ad'
        },
    },

    /**
     * Dependencies
     */
    dependencies: [],

    /**
     * Actions
     */
    actions: {
        list: {
            visibility: 'published',
            description: 'Get list of users\' transactions',
            params: {
                page: {
                    type: 'number',
                    convert: true,
                    min: 1,
                    default: 1
                },
                limit: {
                    type: 'number',
                    convert: true,
                    min: 10,
                    max: 100,
                    default: 12
                },
            },
            cache: {
                enabled: ctx => ctx.meta.cache,
                ttl: 120,
            },
            async handler(ctx) {
                try {
                    const { page, limit } = ctx.params;
                    const { token } = ctx.meta;

                    const start = Date.now();

                    const result = await api.request({
                        method: 'GET',
                        path: `/Factor/Index?pageIndex=${(page - 1)}&pageSize=${limit}`,
                        token: token,
                    });

                    const count = result.returnData.totalCount;

                    return {
                        code: 200,
                        meta: {
                            page,
                            limit,
                            total: count,
                            last: Math.max(Math.ceil(count / limit), 1),
                            took: Date.now() - start,
                        },
                        data: result.returnData.items.map((item: any) => {
                            return {
                                id: item['id'],
                                price: item['price'],
                                date: moment(item['date']).locale('fa').format("dddd jDD jMMMM jYYYY ساعت hh:mm"),
                                method: item['isPayByCard'] ? 'کارت به کارت' : item['bankName'],
                            }
                        })
                    }
                } catch (error) {
                    return {
                        code: 500
                    }
                }
            }
        },
        one: {
            visibility: 'published',
            description: 'Get on transaction by id',
            params: {
                id: {
                    type: 'number',
                    convert: true,
                    min: 1
                }
            },
            cache: {
                enabled: ctx => ctx.meta.cache,
                ttl: 120,
            },
            async handler(ctx) {
                try {
                    const { id } = ctx.params;
                    const { token } = ctx.meta;

                    const start = Date.now();

                    const result = await api.request({
                        method: 'GET',
                        path: `/Factor/Details/${id}`,
                        token: token,
                    });

                    return {
                        code: 200,
                        meta: {
                            took: Date.now() - start,
                        },
                        data: {
                            id: id,
                            total: result['price'] ?? 0,
                            method: result['isPayByCard'] ? 'کارت به کارت' : 'پرداخت آنلاین',
                            bank: result['bankName'],
                            card: result['cardNumber'] == 'True' ? null : result['cardNumber'],
                            paiedAt: result['payDate'] ? moment(result['payDate']).locale('fa').format("jYYYY/jMM/jDD hh:mm") : null,
                            approved: result['isApprovedByAdmin'],
                            approvedAt: result['approveDate'] ? moment(result['approveDate']).locale('fa').format("jYYYY/jMM/jDD hh:mm") : null,
                            approvedMessage: result['payNotApprovedCause'],
                            description: result['description'] ?? 'توضیحاتی ثبت نشده است',
                            image: result['payImageUrl'],
                            orders: result['factorDetails'].map((item: any) => {
                                return {
                                    id: item['id'],
                                    title: item['shopPlan']['title'],
                                    description: cheerio.load(item['shopPlan']['body']).text(),
                                    price: item['price'],
                                    badge: item['shopPlan']['minutesCount'] == null ? null : `${Math.round(item['shopPlan']['minutesCount'] / 1440)} روزه`,
                                    type: this.settings.types[item['shopPlan']['planType']],
                                    startAt: moment(item['shopPlan']['startDate']).locale('fa').format("dddd jDD MMMM jYYYY - hh:mm"),
                                    endAt: item['shopPlan']['endDate'] ? moment(item['shopPlan']['endDate']).locale('fa').format("dddd jDD MMMM jYYYY - hh:mm") : null,
                                }
                            }),
                        },
                    }
                } catch (error) {
                    console.error(error)

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
    async started() {

    },

    /**
     * Service stopped lifecycle event handler
     */
    async stopped() { },
};

export default TransactionService;
