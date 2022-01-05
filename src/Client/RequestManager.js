const {EventEmitter} = require('events');
const Https = require('https');

const Discord = require('discord.js');

const Constants = require('../Util/Constants.js');
const DiscordRequest  = require('./structures/DiscordRequest.js');
const RequestHandler = require('./RequestHandler.js');
const Router = require('./Router.js');

/**
 * The parameter emitted in onRequest, onResponse, onTooManyRequest events
 * @typedef {Object} EmittedInfo
 * @property {Request} request Info about the request made
 * @property {Response} [response] Response for the request made, will be null in onRequest event
 */

/**
  * The request manager of the client that communicates with the bridge (tcp server)
  * @class RequestManager
  */
class RequestManager extends EventEmitter {
    /**
     * @param {DiscordClient} client The client for this request manager
     * @param {instance} instance The Shard or ClusterClient Instance for the IPC
     */
    constructor(client, instance) {
        super();
        /**
         * Emitted when a request was made
         * @event RequestManager#onRequest
         * @param {EmittedInfo} data
         * @memberOf RequestManager
         */
        /**
         * Emitted when a request was fulfilled 
         * @event RequestManager#onResponse
         * @param {EmittedInfo} data
         * @memberOf RequestManager
         */
        /**
         * Emitted when an actual 429 was hit
         * @event RequestManager#onTooManyRequest
         * @param {EmittedInfo} data
         * @memberOf RequestManager
         */
        
        /**
        * The client for this request manager
        * @type {ClusterClient | Shard}
        */
        this.instance = instance;
        if (!this.instance) throw new Error('ClIENT_MISSING_OPTION', 'valid Instance must be provided and be type of SHARD (discord-cross-hosting) or ClusterClient');

        /**
         * The client for this request manager
         * @type {DiscordClient}
         */
        this.client = client;
        if (!this.client) throw new Error('ClIENT_MISSING_OPTION', 'valid Client must be provided and type of Discord.Client');

        /**
         * If this request manager is versioned
         * @type {boolean}
         */
        this.versioned = true;
        /**
         * The request handlers that this request manager handles
         * @type {LimitedCollection<string, RequestHandler>}
         */
        this.handlers = new Discord.LimitedCollection({ sweepInterval: 60, sweepFilter: () => handler => handler.inactive });
        /**
         * The agent used for this manager
         * @type {Agent}
         */
        this.agent = new Https.Agent({ ...client.options.http.agent, keepAlive: true });
    }
    /**
     * The client for the NET IPC
     * @type {*}
     * @readonly
     */
    get server() {
        return this.instance;
    }
    /**
     * A proxy api router 
     * @type {*}
     * @readonly
     */
    get api() {
        return Router(this);
    }
    /**
     * CDN endpoints
     * @type {Object}
     * @readonly
     */
    get cdn() {
        return Discord.Constants.Endpoints.CDN(this.client.options.http.cdn);
    }
    /**
     * Sets the endpoint for http api
     * @type {string}
     */
    get endpoint() {
        return this.client.options.http.api;
    }

    set endpoint(endpoint) {
        this.client.options.http.api = endpoint;
    }
    /**
     * Gets the auth for this manager
     * @returns {string}
     */
    getAuth() {
        const token = this.client.token || this.client.accessToken;
        if (token) return `Bot ${token}`;
        throw new Error('TOKEN_MISSING');
    }
    /**
     * Gets a cached hash in central cache
     * @param {string} id
     * @returns {Promise<string>}
     */
    fetchHash(id) {
        return this.server.request(Constants.createFetchHashMessage(id)).then(e => e.data);
    }
    /**
     * Gets a cached ratelimit info in central cache
     * @param {Object} data
     * @returns {Promise<*>}
     */
    fetchInfo(...args) {
        return this.server.request(Constants.createFetchHandlerMessage(...args)).then(e => e.data);
    }
    /**
     * Updates a cached ratelimit info in central cache
     * @param {Object} data
     * @returns {Promise<void>}
     */
    updateInfo(...args) {
        return this.server.request(Constants.createUpdateHandlerMessage(...args)).then(e => e.data);
    }
    /**
     * Executes a request
     * @param {string} method
     * @param {route} route
     * @param {Object} data
     * @returns {Promise<Buffer|Object|null>}
     */
    async request(method, route, options = {}) {
        const hash = await this.fetchHash(`${method}:${options.route}`) ?? `Global(${method}:${options.route})`;
        if (hash.startsWith('Global')) options.major = 'id';
        let handler = this.handlers.get(`${hash}:${options.major}`);
        if (!handler) {
            handler = new RequestHandler(this, hash, options);
            this.handlers.set(handler.id, handler);
        }
        return handler.push(new DiscordRequest(this, method, route, options));
    }
}

module.exports = RequestManager;