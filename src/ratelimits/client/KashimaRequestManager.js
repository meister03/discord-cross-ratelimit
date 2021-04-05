const { resolve } = require('path');
const TsundereUtil = require('../../util/TsundereUtil.js');
const KashimaRequestHandler = require('./KashimaRequestHandler.js');
const Router = require('./Router.js');

const APIRequest = require(resolve(require.resolve('discord.js').replace('index.js', '/rest/APIRequest.js')));
const RESTManager = require(resolve(require.resolve('discord.js').replace('index.js', '/rest/RESTManager.js')));

class KashimaRESTManager extends RESTManager {
    constructor(...args) {
        super(...args);
        delete this.globalTimeout;
        delete this.globalLimit;
        delete this.globalRemaining;
        delete this.globalReset;
        delete this.globalDelay;
    }

    static GenerateIPCRequest() {
        return {
            op: TsundereUtil.op,
            // note to self, dont forget to send endpoint
            endpoint: null,
            // update is true when we send headers, while false if we just check
            update: false,
            // headers is needed when update is set to true, but if not then leave it
            headers: null
        };
    }

    get server() {
        return this.client.shard.server;
    }

    get api() {
        return Router(this);
    }

    async append(endpoint) {
        const request = KashimaRESTManager.GenerateIPCRequest();
        request.endpoint = endpoint;
        request.update = false;
        const response = await this.server.send(request, { receptive: true });
        if (!response.errored) return;
        const error = new Error();
        error.name = request.name;
        error.message = request.message;
        error.stack = request.stack;
        throw error;
    }

    async update(endpoint, headers) {
        const request = KashimaRESTManager.GenerateIPCRequest();
        request.endpoint = endpoint;
        request.update = true;
        request.headers = headers;
        const response = await this.server.send(request, { receptive: true });
        if (!response.errored) return;
        const error = new Error();
        error.name = request.name;
        error.message = request.message;
        error.stack = request.stack;
        throw error;
    }

    request(method, url, options = {}) {
        const request = new APIRequest(this, method, url, options);
        let handler = this.handlers.get(request.route);
        if (!handler) {
            handler = new KashimaRequestHandler(this);
            this.handlers.set(request.route, handler);
        }
        return handler.push(request);
    }
}

module.exports = KashimaRESTManager;