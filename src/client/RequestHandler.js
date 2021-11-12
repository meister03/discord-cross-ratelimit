import { AsyncQueue } from '@sapphire/async-queue';
import { Util, Constants as DiscordConstants } from 'discord.js';

import AzumaConstants from '../Constants.js';
import RequestError from './structures/RequestError.js';
import DiscordError from './structures/DiscordError.js';
import AzumaRatelimit from '../ratelimits/AzumaRatelimit.js';

/**
  * The handler for the non-master process that executes the rest requests
  * @class RequestHandler
  */
class RequestHandler {
    /**
     * @param {RequestManager} manager The manager for this request handler
     * @param {string} hash The hash for this request handler
     * @param {Object} options The options for the API request from the router
     */
    constructor(manager, hash, { major }) {
        /**
         * The manager of this request handler
         * @type {RequestManager}
         */
        this.manager = manager;
        /**
         * The ratelimit hash of this request handler
         * @type {string}
         */
        this.hash = hash;
        /**
         * The ID of this request handler
         * @type {string}
         */
        this.id = `${hash}:${major}`;
        /**
         * The current queued requests for this handler
         * @type {AsyncQueue}
         */
        this.queue = new AsyncQueue();
    }
    /**
     * Parses an api response
     * @static
     * @param {Response} res
     * @returns {Promise<Buffer|Object>}
     */
    static async parseResponse(res) {
        if (res.headers.get('content-type').startsWith('application/json')) return await res.json();
        const arrayBuffer = await res.arrayBuffer();
        return Buffer.from(arrayBuffer);
    }
    /**
     * If this handler is inactive
     * @type {boolean}
     * @readonly
     */
    get inactive() {
        return this.queue.remaining === 0;
    }
    /**
     * Queues a request in this handler
     * @param {Request} request
     * @returns {Promise<Buffer|Object|null>}
     */
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
    /**
     * Executes a request in this handler
     * @param {Request} request
     * @private
     * @returns {Promise<Buffer|Object|null>}
     */
    async execute(request) {
        // Get ratelimit data
        const { limited, limit, global, timeout } = await this.manager.fetchInfo(this.id, this.hash, request.route);
        if (global || limited) {
            if (this.manager.client.listenerCount(DiscordConstants.Events.RATE_LIMIT)) 
                this.manager.client.emit(DiscordConstants.Events.RATE_LIMIT, {
                    method: request.method, 
                    path: request.path, 
                    route: request.route,
                    hash: this.hash,
                    timeout, 
                    limit,  
                    global
                });
            await Util.delayFor(timeout);
        }
        // Perform the request
        let res;
        try {
            if (this.manager.listenerCount(AzumaConstants.Events.ON_REQUEST)) 
                this.manager.emit(AzumaConstants.Events.ON_REQUEST, { request });
            res = await request.make();
        } catch (error) {
            // Retry the specified number of times for request abortions
            if (request.retries === this.manager.client.options.retryLimit) {
                throw new RequestError(error.message, error.constructor.name, error.status, request);
            }
            request.retries++;
            return this.execute(request);
        }
        if (this.manager.listenerCount(AzumaConstants.Events.ON_RESPONSE)) 
            this.manager.emit(AzumaConstants.Events.ON_RESPONSE, { request, response: res });
        let after;
        if (res.headers) {
            // Build ratelimit data for master process
            const data = AzumaRatelimit.constructData(request, res.headers);
            // Just incase I messed my ratelimit handling up, so you can avoid getting banned
            after = !isNaN(data.after) ? Number(data.after) * 1000 : -1;
            // Send ratelimit data, and wait for possible global ratelimit manager halt
            await this.manager.updateInfo(this.id, this.hash, request.method, request.route, data);
        }
        // Handle 2xx and 3xx responses
        if (res.ok) 
            // Nothing wrong with the request, proceed with the next one
            return RequestHandler.parseResponse(res);
        
        // Handle 4xx responses
        if (res.status >= 400 && res.status < 500) {
            // Handle ratelimited requests
            if (res.status === 429) {
                if (this.manager.listenerCount(AzumaConstants.Events.ON_TOO_MANY_REQUEST)) 
                    this.manager.emit(AzumaConstants.Events.ON_TOO_MANY_REQUEST, { request, response: res });
                // A ratelimit was hit, You did something stupid @saya
                this.manager.client.emit('debug', 
                    'Encountered unexpected 429 ratelimit\n' + 
                    `  Route          : ${request.route}\n` + 
                    `  Request        : ${request.method}\n` +
                    `  Hash:Major     : ${this.id}\n` + 
                    `  Request Route  : ${request.route}\n` + 
                    `  Retry After    : ${after}ms` 
                );
                // Retry after, but add 500ms on the top of original retry after
                await Util.delayFor(after + 500);
                return this.execute(request);
            }
            // Handle possible malformed requests
            let data;
            try {
                data = await RequestHandler.parseResponse(res);
            } catch (err) {
                throw new RequestError(err.message, err.constructor.name, err.status, request);
            }
            throw new DiscordError(data, res.status, request);
        }
        // Handle 5xx responses
        if (res.status >= 500 && res.status < 600) {
            // Retry the specified number of times for possible serverside issues
            if (request.retries === this.manager.client.options.retryLimit)
                throw new RequestError(res.statusText, res.constructor.name, res.status, request);
            request.retries++;
            return this.execute(request);
        }
        // Fallback in the rare case a status code outside the range 200..=599 is returned
        return null;
    }
}

export default RequestHandler;