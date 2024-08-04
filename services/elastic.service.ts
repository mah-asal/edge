import type { ServiceSchema } from "moleculer";

import elastic from "../shared/elastic";

const document = {
	type: "object",
	props: {
		id: {
			type: "string",
		},
		site: {
			type: "string",
		},
		schema: {
			type: "string",
		},
		url: {
			type: "string",
			default: null,
		},
		data: {
			type: "object",
		},
		version: {
			type: "string",
			convert: true,
			default: "1",
		},
		createdAt: {
			type: "number",
			convert: true,
			default: Date.now(),
		},
		updatedAt: {
			type: "number",
			convert: true,
			default: Date.now(),
		},
	},
};

const ElasticService: ServiceSchema = {
	name: "elastic",
	version: "api.v1",

	/**
	 * Settings
	 */
	settings: {},

	/**
	 * Dependencies
	 */
	dependencies: [],

	/**
	 * Actions
	 */
	actions: {
		sets: {
			visibility: "published",
			permissions: ["api.v1.elastic.set"],
			params: {
				index: {
					type: "string",
				},
				documents: {
					type: "array",
					items: document,
				},
			},
			async handler(ctx) {
				try {
					const start = Date.now();

					const operations = (ctx.params.documents as any[]).flatMap((doc) => [
						{ index: { _index: ctx.params.index } },
						doc,
					]);

					await elastic.bulk({
						refresh: true,
						operations,
					});

					return {
						code: 200,
						meta: {
							took: Date.now() - start,
						},
					};
				} catch (error) {
					return {
						code: 500,
					};
				}
			},
		},
		set: {
			visibility: "published",
			permissions: ["api.v1.elastic.set"],
			params: {
				index: {
					type: "string",
				},
				document,
			},
			async handler(ctx) {
				try {
					const start = Date.now();

					const result = await elastic.index({
						index: ctx.params.index,
						id: ctx.params.document.id,
						document: ctx.params.document,
					});

					return {
						code: 200,
						meta: {
							took: Date.now() - start,
						},
						data: {
							id: result._id,
						},
					};
				} catch (error) {
					return {
						code: 500,
					};
				}
			},
		},
		search: {
			visibility: "published",
			permissions: ["api.v1.elastic.search"],
			params: {
				index: {
					type: "string",
					default: 'profile'
				},
				random: {
					type: "boolean",
					convert: true,
					default: false,
				},
				page: {
					type: "number",
					convert: true,
					min: 1,
					default: 1,
				},
				limit: {
					type: "number",
					convert: true,
					min: 0,
					max: 100,
					default: 10,
				},
				filter: {
					type: "array",
					items: {
						type: "object",
						props: {
							key: { type: "string" },
							value: [
								{ type: "string", optional: true, default: null },
								{ type: "number", optional: true, default: null },
								{ type: "boolean", optional: true, default: null },
								{ type: "array", optional: true, default: [] },
								{ type: "object", optional: true, default: {} },
							],
							oprator: {
								type: "enum",
								values: [
									"query",
									"equals",
									"not-equals",
									"greater-than",
									"greater-than-equals",
									"less-than",
									"less-than-equals",
									"contains",
									"not-contains",
									"or-contains",
									"starts-with",
									"ends-with",
									"length",
									"geo",
								],
							},
							fuzziness: {
								type: "number",
								min: 0,
								max: 2,
								optional: true,
								default: 0,
							},
						},
					},
					optional: true,
					default: [],
				},
				sort: {
					type: "array",
					items: {
						type: "object",
						props: {
							key: { type: "string" },
							order: {
								type: "enum",
								values: ["asc", "desc"],
							},
						},
					},
					optional: true,
					default: [],
				},
				aggregate: {
					type: "array",
					items: {
						type: "object",
						props: {
							key: [{ type: "string" }, { type: "array", items: "string" }],
							oprator: {
								type: "enum",
								values: ["min", "max", "avg", "list"],
							},
						},
					},
					optional: true,
					default: [],
				},
				boost: {
					type: "array",
					items: {
						type: "object",
						props: {
							key: { type: "string" },
							value: [{ type: "number" }, { type: "string" }, { type: "boolean" }],
							boost: {
								type: "number",
								min: 1,
								max: 100,
								convert: true,
								integer: true,
							},
							oprator: {
								type: "enum",
								values: [
									"equals",
									"not-equals",
									"greater-than",
									"greater-than-equals",
									"less-than",
									"less-than-equals",
									"contains",
									"not-contains",
									"or-contains",
									"starts-with",
									"ends-with",
									"length",
								],
							},
						},
					},
					optional: true,
					default: [],
				},
			},
			async handler(ctx) {
				try {
					const { index, page, limit, random } = ctx.params;

					const elastic_query: any = {
						index: index,
						query: {
							bool: {
								must: [],
								must_not: [],
								should: [],
							},
						},
						sort: [],
						size: limit,
						from: (page - 1) * limit,
						track_total_hits: true,
					};

					if (ctx.params.filter && ctx.params.filter.length != 0) {
						for (let filter of ctx.params.filter) {
							switch (filter.oprator) {
								case "geo":
									const calculateRadius =
										(38000 / Math.pow(2, filter.value.zoom)) *
										Math.cos((filter.value.lat * Math.PI) / 180);

									elastic_query.query.bool.must.push({
										geo_distance: {
											distance: `${calculateRadius}km`,
											[filter.key]: {
												lat: filter.value.lat,
												lon: filter.value.lon,
											},
										},
									});
									break;
								case "equals":
									if (Array.isArray(filter.value)) {
										elastic_query.query.bool.must.push({
											terms: {
												[filter.key]: filter.value,
											},
										});
									} else {
										elastic_query.query.bool.must.push({
											match: {
												[filter.key]: filter.value,
											},
										});
									}
									break;
								case "not-equals":
									elastic_query.query.bool.must_not.push({
										match: {
											[filter.key]: filter.value,
										},
									});
									break;
								case "greater-than":
									elastic_query.query.bool.must.push({
										range: {
											[filter.key]: {
												gt: filter.value,
											},
										},
									});
									break;
								case "greater-than-equals":
									elastic_query.query.bool.must.push({
										range: {
											[filter.key]: {
												gte: filter.value,
											},
										},
									});
									break;
								case "less-than":
									elastic_query.query.bool.must.push({
										range: {
											[filter.key]: {
												lt: filter.value,
											},
										},
									});
									break;
								case "less-than-equals":
									elastic_query.query.bool.must.push({
										range: {
											[filter.key]: {
												lte: filter.value,
											},
										},
									});
									break;
								case "contains":
									if (Array.isArray(filter.value)) {
										if (
											filter.value.length == 1 &&
											typeof filter.value[0] == "string"
										) {
											// wildcard *value*
											elastic_query.query.bool.must.push({
												wildcard: {
													[filter.key]: `*${filter.value[0].toLocaleLowerCase()}*`,
												},
											});
										} else {
											elastic_query.query.bool.must.push({
												terms: {
													[filter.key]: filter.value,
												},
											});
										}
									} else {
										elastic_query.query.bool.must.push({
											match_phrase: {
												[filter.key]: filter.value,
											},
										});
									}
									break;
								case "not-contains":
									if (Array.isArray(filter.value)) {
										elastic_query.query.bool.must_not.push({
											terms: {
												[filter.key]: filter.value,
											},
										});
									} else {
										elastic_query.query.bool.must_not.push({
											match_phrase: {
												[filter.key]: filter.value,
											},
										});
									}
									break;
								case "query":
								case "or-contains":
									let index = (elastic_query.query.bool.must as any[]).findIndex(
										(item) => item["multi_match"],
									);

									if (index != -1) {
										elastic_query.query.bool.must[
											index
										].multi_match.fields.push(filter.key);
									} else {
										elastic_query.query.bool.must.push({
											multi_match: {
												query: filter.value,
												fields: [filter.key],
											},
										});
									}
									break;
								case "starts-with":
									elastic_query.query.bool.must.push({
										prefix: {
											[filter.key]: filter.value,
										},
									});
									break;
								case "ends-with":
									elastic_query.query.bool.must.push({
										wildcard: {
											[filter.key]: `*${filter.value}`,
										},
									});
									break;
								case "length":
									elastic_query.query.bool.must.push({
										script: {
											script: `doc['data.${filter.key}'].size() == ${filter.value}`,
										},
									});
									break;
							}
						}
					}

					if (ctx.params.sort && ctx.params.sort.length != 0) {
						elastic_query.sort = ctx.params.sort.map((sort: any) => ({
							[sort.key]: sort.order,
						}));
					}

					// create a aggregation query
					const elastic_aggs: any = {};

					// create a aggregation query for each field
					for (let field of ctx.params.aggregate) {
						switch (field.oprator) {
							case "min":
								elastic_aggs[field.key + "_" + field.oprator] = {
									min: {
										field: field.key,
									},
								};
								break;
							case "max":
								elastic_aggs[field.key + "_" + field.oprator] = {
									max: {
										field: field.key,
									},
								};
								break;
							case "avg":
								elastic_aggs[field.key + "_" + field.oprator] = {
									avg: {
										field: field.key,
									},
								};
								break;
							case "list":
								elastic_aggs[field.key + "_" + field.oprator] = {
									terms: {
										field: field.key,
										size: 10000,
									},
								};

								break;
						}
					}

					// add aggregation query to the main query
					elastic_query.aggs = elastic_aggs;

					// add boost query with function scrore
					if (ctx.params.boost && ctx.params.boost.length != 0) {
						const max_boost = ctx.params.boost.reduce(
							(max: number, boost: any) => max + boost.boost,
							0,
						);

						let functions = [];

						for (let boost of ctx.params.boost) {
							switch (boost.oprator) {
								case "starts-with":
									// handle it with wildcard value*
									functions.push({
										filter: {
											wildcard: {
												[boost.key]: `${boost.value}*`,
											},
										},
										weight: boost.boost,
									});
									break;
								case "equals":
									functions.push({
										filter: {
											match: {
												[boost.key]: boost.value,
											},
										},
										weight: boost.boost,
									});
									break;

								default:
									break;
							}
						}

						elastic_query.query = {
							function_score: {
								query: elastic_query.query,
								boost: 1,
								functions,
								score_mode: "sum",
								boost_mode: "sum",
								max_boost: max_boost,
								min_score: 0,
							},
						};

						// add sort by score
						elastic_query.sort.unshift({
							_score: "desc",
						});
					}

					if (random) {
						const query = { ...elastic_query["query"]["bool"] };

						delete elastic_query["query"]["bool"];

						elastic_query["query"]["function_score"] = {
							query: {
								bool: query,
							},
							random_score: {},
							boost_mode: "replace",
						};
					}

					const start = Date.now();
					const elastic_data = await elastic.search(elastic_query);
					const end = Date.now();

					const total = (elastic_data.hits.total as any).value;

					let data_hits: any[] = [];

					data_hits = elastic_data.hits.hits.map((hit: any) => ({
						id: hit._id,
						...hit._source,
						score: hit._score,
					}));

					let data_aggs: any = {};

					if (ctx.params.aggregate.length != 0 && elastic_data.aggregations) {
						for (let field of ctx.params.aggregate) {
							const key = `${field.key}_${field.oprator}`;

							switch (field.oprator) {
								case "min":
									data_aggs[field.key] = {
										...(data_aggs[field.key] ?? {}),
										min: (elastic_data.aggregations[key] as any).value,
									};
									break;
								case "max":
									data_aggs[field.key] = {
										...(data_aggs[field.key] ?? {}),
										max: (elastic_data.aggregations[key] as any).value,
									};
									break;
								case "avg":
									data_aggs[field.key] = {
										...(data_aggs[field.key] ?? {}),
										avg: (elastic_data.aggregations[key] as any).value,
									};
									break;
								case "list":
									data_aggs[field.key] = (
										elastic_data.aggregations[key] as any
									).buckets.map((bucket: any) => ({
										value: bucket.key,
										count: bucket.doc_count,
									}));
									break;

								default:
									break;
							}
						}
					}

					return {
						code: 200,
						meta: {
							page,
							limit,
							total,
							last: Math.max(Math.ceil(total / limit), 1),
							took: end - start,
							start,
							end,
						},
						data: {
							hits: data_hits,
							aggregate: data_aggs,
						},
					};
				} catch (error) {
					console.error(error);
					return {
						code: 500,
					};
				}
			},
		},
		one: {
			visibility: "published",
			permissions: ["api.v1.elastic.one"],
			params: {
				index: {
					type: "string",
					default: 'profile'
				},
				id: {
					type: 'string'
				}
			},
			async handler(ctx) {
				try {
					const { index, id } = ctx.params;

					const one = await elastic.get({
						index,
						id
					});

					return {
						code: one ? 200 : 404,
						data: one ? one._source : null
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
	methods: {},

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

export default ElasticService;
