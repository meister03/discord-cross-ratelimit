const { Constants, Collection } = require('discord.js');
const { resolve } = require('path');


const { Wa2000Request, Wa2000FetchHash, Wa2000BeingTsunOnly }= require('../../Constants.js');
const RequestHandler = require('./RequestHandler.js');
const Router = require('./Router.js');

const APIRequest = require(resolve(require.resolve('discord.js').replace('index.js', '/rest/APIRequest.js')));

/**
  * RequestManager, the request manager of the non-master process that communicates with the master process
  * @class RequestManager
  */
class RequestManager {
    /**
     * @param {DiscordClient} client The client for this request manager
     * @param {number} interval The interval ms for the handler sweeper for this request manager
     */
    constructor(client, interval) {
        /**
         * The client for this request manager
         * @type {DiscordClient}
         */
        this.client = client;
        /**
         * The prefix to use for the token
         * @type {string}
         */
        this.tokenPrefix = client.options._tokenType || 'Bot';
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
            this.sweeper = client.setInterval(() => this.handlers.sweep(handler => handler.inactive), interval);
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
        if (token) return `${this.tokenPrefix} ${token}`;
        throw new Error('TOKEN_MISSING');
    }

    // Fetch Hashes
    fetch(id) {
        return this.server.send(Wa2000FetchHash(id), { receptive: true });
    }

    // Handle Ratelimit
    async send(id, hash, method, route, data = null) {
        const response = await this.server.send(Wa2000Request(id, hash, method, route, data), { receptive: true });
        if (!response.errored) return;
        throw Wa2000BeingTsunOnly(response);
    }

    // Make API request
    async request(method, route, options = {}) {
        const hash = await this.fetch(`${method}:${options.route}`) ?? `Global(${method}:${options.route})`;
        let handler = this.handlers.get(`${hash}:${options.major}`);
        if (!handler) {
            handler = new RequestHandler(this, hash, options);
            this.handlers.set(handler.id, handler);
        }
        return handler.push(new APIRequest(this, method, route, options));
    }
}

module.exports = RequestManager;