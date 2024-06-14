import type { ServiceSchema } from "moleculer";

import cheerio from "cheerio";

import api from "../shared/api";
import endpoint from "../shared/endpoint";
import moment from "jalali-moment";

const BlogService: ServiceSchema = {
    name: "blog",
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
        search: {
            visibility: 'published',
            description: 'Get list of posts',
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
                    default: 10
                }
            },
            cache: {
                enabled: ctx => ctx.meta.cache,
                ttl: 120,
                keys: ['page', 'limit'],
            },
            async handler(ctx) {
                try {
                    const { page, limit } = ctx.params;

                    const start = Date.now();

                    const result = await api.request({
                        path: `/Blog?pageIndex=${page}&pageSize=${limit}`,
                        method: 'GET',
                    });

                    return {
                        code: 200,
                        meta: {
                            total: result.returnData ? result.returnData.totalCount : 0,
                            last: result.returnData ? result.returnData.totalPages : 1,
                            page,
                            limit,
                            took: Date.now() - start,
                        },
                        data: result.returnData.items.map((item: any) => this.formatPost(item, true)),
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
            description: 'Get one post',
            params: {
                id: {
                    type: 'number',
                    convert: true,
                    min: 1
                }
            },
            cache: {
                enabled: ctx => ctx.meta.cache,
            },
            async handler(ctx) {
                try {
                    const { id } = ctx.params;

                    const start = Date.now();

                    const result = await api.request({
                        path: `/Blog/Post/${id}`,
                        method: 'GET',
                    });

                    return {
                        code: 200,
                        meta: {
                            took: Date.now() - start,
                        },
                        data: this.formatPost(result['returnData'])
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
        formatPost(item: any, skipHTML = false) {
            let html = undefined;

            if (skipHTML == false) {
                const $ = cheerio.load(item['body']);

                const images = $('img');

                images.each((i, element) => {
                    const src = $(element).attr('src');
                    const newSrc = endpoint.api + '/' + src;
                    $(element).attr('src', newSrc);
                    $(element).removeAttr('class');
                    $(element).removeAttr('style');
                    $(element).addClass('w-full object-contain object-center my-10 rounded-lg');
                });

                html = $.html();
            }

            return {
                id: item['id'],
                slug: item['title'].split(' ').join('-'),
                image: endpoint.api + '/' + item['imageUrl'],
                title: item['title'],
                tags: item['tags'].split('#').map((item: string) => item.trim()).filter((item: string) => item.length != 0),
                content: cheerio.load(item['body']).text().slice(0, 100) + '...',
                html: html,
                date: moment(item['dateTime']).locale('fa').format("dddd jDD MMMM jYYYY hh:mm"),
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

export default BlogService;
