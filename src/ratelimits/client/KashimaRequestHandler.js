const { resolve } = require('path');
const { Util } = require('discord.js');
const RequestQueue = require('../RatelimitQueue.js');

const AsyncQueue = require(resolve(require.resolve('discord.js').replace('index.js', '/rest/AsyncQueue.js')));
const HTTPError = require(resolve(require.resolve('discord.js').replace('index.js', '/rest/HTTPError.js')));
const DiscordAPIError = require(resolve(require.resolve('discord.js').replace('index.js', '/rest/DiscordAPIError.js')));

class KashimaRequestHandler {
    static parseResponse(res) {
        if (res.headers.get('content-type').startsWith('application/json')) return res.json();
        return res.buffer();
    }
    constructor(manager) {
        this.manager = manager;
        this.queue = new AsyncQueue();
        this.retryAfter = -1;
    }

    get _inactive() {
        return this.queue.remaining === 0;
    }
    
    async push(request) {
        await this.queue.wait();
        let res;
        try {
            res = await this.execute(request);
        } finally {
            this.queue.shift();
        }
        return res;
    }

    async execute(request) {
        // Let master process "pause" this request until master process says its safe to resume due to ratelimits
        await this.manager.append(request.route);    
        // Perform the request
        let res;
        try {
            res = await request.make();
        } catch (error) {
            // Retry the specified number of times for request abortions
            if (request.retries === this.manager.client.options.retryLimit) {
                throw new HTTPError(error.message, error.constructor.name, error.status, request.method, request.path);
            }
            request.retries++;
            return this.execute(request);
        }
        if (res.headers) {
            // Build ratelimit info for master process
            const ratelimitInfo = RequestQueue.rateLimitBuilder(res.headers);
            this.retryAfter = !isNaN(ratelimitInfo.after) ? Number(ratelimitInfo.after) * 1000 : -1;
            // https://github.com/discordapp/discord-api-docs/issues/182
            ratelimitInfo.reactions = request.route.includes('reactions');
            // Send ratelimit info
            await this.manager.update(request.route, ratelimitInfo);
        }
        // Handle 2xx and 3xx responses
        if (res.ok) {
            // Nothing wrong with the request, proceed with the next one
            return KashimaRequestHandler.parseResponse(res);
        }
        // Handle 4xx responses
        if (res.status >= 400 && res.status < 500) {
            // Handle ratelimited requests
            if (res.status === 429) {
            // A ratelimit was hit - You did big meme on your master process ratelimits Saya
                this.manager.client.emit('debug', `429 hit on route ${request.route}, retrying after ${this.retryAfter}ms + 500ms`);
                await Util.delayFor(this.retryAfter + 500);
                return this.execute(request);
            }
            // Handle possible malformed requests
            let data;
            try {
                data = await KashimaRequestHandler.parseResponse(res);
            } catch (err) {
                throw new HTTPError(err.message, err.constructor.name, err.status, request.method, request.path);
            }
    
            throw new DiscordAPIError(request.path, data, request.method, res.status);
        }
        // Handle 5xx responses
        if (res.status >= 500 && res.status < 600) {
            // Retry the specified number of times for possible serverside issues
            if (request.retries === this.manager.client.options.retryLimit) {
                throw new HTTPError(res.statusText, res.constructor.name, res.status, request.method, request.path);
            }
    
            request.retries++;
            return this.execute(request);
        }
        // Fallback in the rare case a status code outside the range 200..=599 is returned
        return null;
    }
}

module.exports = KashimaRequestHandler;