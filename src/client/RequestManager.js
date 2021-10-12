const EventEmitter = require('events');

const { Cheshire } = require('cheshire');
const { Constants } = require('discord.js');
const { resolve } = require('path');
const { createFetchHashMessage, createFetchHandlerMessage, createUpdateHandlerMessage }= require('../Constants.js');

const RequestHandler = require('./RequestHandler.js');
const Router = require('./Router.js');
const APIRequest = require(resolve(require.resolve('discord.js').replace('index.js', '/rest/APIRequest.js')));

/**
 * The parameter emitted in onRequest, onResponse, onTooManyRequest events
 * @typedef {Object} EmittedInfo
 * @property {Request} request Info about the request made
 * @property {Response} [response] Response for the request made, will be null in onRequest event
 */

/**
  * The request manager of the non-master process that communicates with the master process
  * @class RequestManager
  */
class RequestManager extends EventEmitter {
    /**
     * @param {DiscordClient} client The client for this request manager
     * @param {number} lifetime The TTL for ratelimit handlers
     */
    constructor(client, lifetime) {
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
         * @type {DiscordClient}
         */
        this.client = client;
        /**
         * If this request manager is versioned
         * @type {boolean}
         */
        this.versioned = true;
        /**
         * The request handlers that this request manager handles
         * @type {Cheshire<string, RequestHandler>}
         */
        this.handlers = new Cheshire({ lru: true, lifetime, disposer: (_, handler) => handler.inactive });
    }
    /**
     * The client for the IPC
     * @type {*}
     * @readonly
     */
    get server() {
        return this.client.shard.ipc.server;
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
        return Constants.Endpoints.CDN(this.client.options.http.cdn);
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
        return this.server.send(createFetchHashMessage(id), { receptive: true });
    }
    /**
     * Gets a cached ratelimit info in central cache
     * @param {Object} data
     * @returns {Promise<*>}
     */
    fetchInfo(...args) {
        return this.server.send(createFetchHandlerMessage(...args), { receptive: true });
    }
    /**
     * Updates a cached ratelimit info in central cache
     * @param {Object} data
     * @returns {Promise<void>}
     */
    updateInfo(...args) {
        return this.server.send(createUpdateHandlerMessage(...args), { receptive: true });
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
        let handler = this.handlers.get(`${hash}:${options.major}`);
        if (!handler) {
            handler = new RequestHandler(this, hash, options);
            this.handlers.set(handler.id, handler);
        }
        return handler.push(new APIRequest(this, method, route, options));
    }
}

module.exports = RequestManager;