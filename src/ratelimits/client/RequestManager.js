const { resolve } = require('path');
const { Wa2000Request, Wa2000BeingTsunOnly }= require('../../Constants.js');
const RequestHandler = require('./RequestHandler.js');
const Router = require('./Router.js');

const APIRequest = require(resolve(require.resolve('discord.js').replace('index.js', '/rest/APIRequest.js')));
const RESTManager = require(resolve(require.resolve('discord.js').replace('index.js', '/rest/RESTManager.js')));

class RequestManager extends RESTManager {
    constructor(...args) {
        super(...args);
        delete this.globalTimeout;
        delete this.globalLimit;
        delete this.globalRemaining;
        delete this.globalReset;
        delete this.globalDelay;
    }

    get server() {
        return this.client.shard.ipc.server;
    }

    get api() {
        return Router(this);
    }

    async append(endpoint) {
        const response = await this.server.send(Wa2000Request(endpoint), { receptive: true });
        if (!response.errored) return;
        throw Wa2000BeingTsunOnly(response);
    }

    async update(endpoint, headers) {
        const response = await this.server.send(Wa2000Request(endpoint, headers), { receptive: true });
        if (!response.errored) return;
        throw Wa2000BeingTsunOnly(response);
    }

    request(method, url, options = {}) {
        const request = new APIRequest(this, method, url, options);
        let handler = this.handlers.get(request.route);
        if (!handler) {
            handler = new RequestHandler(this);
            this.handlers.set(request.route, handler);
        }
        return handler.push(request);
    }
}

module.exports = RequestManager;