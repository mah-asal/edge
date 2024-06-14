import type { ServiceSchema } from "moleculer";

const CafebazaarService: ServiceSchema = {
	name: "cafebazaar",
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

export default CafebazaarService;
