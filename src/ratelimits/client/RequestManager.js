const { Constants, Collection } = require('discord.js');
const { resolve } = require('path');


const { Wa2000Request, Wa2000FetchHash, Wa2000BeingTsunOnly }= require('../../Constants.js');
const RequestHandler = require('./RequestHandler.js');
const Router = require('./Router.js');

const APIRequest = require(resolve(require.resolve('discord.js').replace('index.js', '/rest/APIRequest.js')));

class RequestManager {
    constructor(client) {
        this.client = client;
        this.tokenPrefix = client.options._tokenType;
        this.versioned = true;
        this.handlers = new Collection();
        if (client.options.restSweepInterval > 0) {
            const interval = client.setInterval(() => 
                this.handlers.sweep(handler => handler.inactive)
            , client.options.restSweepInterval * 1000);
            interval.unref();
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