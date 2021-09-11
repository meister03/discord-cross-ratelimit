const { Collection } = require('@discordjs/collection');
const { Constants } = require('discord.js');
const { resolve } = require('path');
const { createFetchHashMessage, createFetchHandlerMessage, createUpdateHandlerMessage }= require('../Constants.js');
const EventEmitter = require('events');
const RequestHandler = require('./RequestHandler.js');
const Router = require('./Router.js');
const APIRequest = require(resolve(require.resolve('discord.js').replace('index.js', '/rest/APIRequest.js')));

/**
  * The request manager of the non-master process that communicates with the master process
  * @class RequestManager
  */
class RequestManager extends EventEmitter {
    /**
     * @param {DiscordClient} client The client for this request manager
     * @param {number} interval The interval ms for the handler sweeper for this request manager
     */
    constructor(client, interval) {
        super();
        /**
         * Emitted when a request was made
         * @event Azuma#onRequest
         * @param {Object} data
         * @memberOf Azuma
         */
        /**
         * Emitted when a request was fulfilled 
         * @event Azuma#onResponse
         * @param {Object} data
         * @memberOf Azuma
         */
        /**
         * Emitted when an actual 429 was hit
         * @event Azuma#onTooManyRequest
         * @param {Object} data
         * @memberOf Azuma
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
         * @type {Collection<string, RequestHandler>}
         */
        this.handlers = new Collection();
        /**
         * Inactive handlers sweeper
         * @type {Timeout|null}
         */
        this.sweeper = null;

        if (interval > 0) {
            this.sweeper = setInterval(() => this.handlers.sweep(handler => handler.inactive), interval);
            this.sweeper.unref();
        }
    }

    get server() {
        return this.client.shard.ipc.server;
    }

    get api() {
        return Router(this);
    }

    get cdn() {
        return Constants.Endpoints.CDN(this.client.options.http.cdn);
    }

    get endpoint() {
        return this.client.options.http.api;
    }
    
    set endpoint(endpoint) {
        this.client.options.http.api = endpoint;
    }

    getAuth() {
        const token = this.client.token || this.client.accessToken;
        if (token) return `Bot ${token}`;
        throw new Error('TOKEN_MISSING');
    }

    fetchHash(id) {
        return this.server.send(createFetchHashMessage(id), { receptive: true });
    }

    fetchInfo(...args) {
        return this.server.send(createFetchHandlerMessage(...args), { receptive: true });
    }

    updateInfo(...args) {
        return this.server.send(createUpdateHandlerMessage(...args), { receptive: true });
    }

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