const { AsyncQueue } = require('@sapphire/async-queue');
const { setTimeout: sleep } = require('node:timers/promises');
const Discord = require('discord.js');

const Constants = require('../Util/Constants.js');
const RequestError = require('./structures/RequestError.js');
const DiscordError = require('./structures/DiscordError.js');
const RateLimitError = require('./structures/RateLimitError');
const Ratelimit = require('../Bridge/Ratelimit.js');

/**
  * The handler for the client that executes the rest requests
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

    /*
    * Determines whether the request should be queued or whether a RateLimitError should be thrown
    */
    async onRateLimit(request, limit, timeout, isGlobal) {
        const { options } = this.manager.client;
        if (!options.rejectOnRateLimit) return;

        const rateLimitData = {
            timeout,
            limit,
            method: request.method,
            path: request.path,
            route: request.route,
            global: isGlobal,
        };
        const shouldThrow =
            typeof options.rejectOnRateLimit === 'function'
                ? await options.rejectOnRateLimit(rateLimitData)
                : options.rejectOnRateLimit.some(route => rateLimitData.route.startsWith(route.toLowerCase()));
        if (shouldThrow) {
            throw new RateLimitError(rateLimitData);
        }
    }


    /**
     * Executes a request in this handler
     * @param {Request} request
     * @private
     * @returns {Promise<Buffer|Object|null>}
     */
    async execute(request) {
        // Get ratelimit data
        const { limited, limit, global, timeout, invalidRequestTimeout, invalidRequestCount } = await this.manager.fetchInfo(this.id, this.hash, request.route);
        if (global || limited) {
            if (this.manager.client.listenerCount(Discord.Constants.Events.RATE_LIMIT))
                this.manager.client.emit(Discord.Constants.Events.RATE_LIMIT, {
                    method: request.method,
                    path: request.path,
                    route: request.route,
                    hash: this.hash,
                    timeout,
                    limit,
                    global
                });
            // Determine whether a RateLimitError should be thrown
            await this.onRateLimit(request, limit, timeout, global); // eslint-disable-line no-await-in-loop
            await sleep(timeout);
        }
        if(invalidRequestTimeout){
            if(this.manager.client.options.invalidRequestRejectOnAmount){
                if(this.manager.client.options.invalidRequestRejectOnAmount < invalidRequestCount) {
                    // Wait until Invalid Request Count has been reseted
                    this.manager.client.emit('debug', '[MANAGER => CLIENTS] To many invalids requests done (limit exceeded) in the last 10 minutes, stopping all requests until the reset');
                    await sleep(invalidRequestTimeout);
                    return this.execute(request);
                }
            }
        }
        // Perform the request
        let res;
        try {
            if (this.manager.listenerCount(Constants.Events.ON_REQUEST))
                this.manager.emit(Constants.Events.ON_REQUEST, { request });
            res = await request.make();
        } catch (error) {
            // Retry the specified number of times for request abortions
            if (request.retries === this.manager.client.options.retryLimit) {
                throw new RequestError(error.message, error.constructor.name, error.status, request);
            }
            request.retries++;
            return this.execute(request);
        }

        if (this.manager.listenerCount(Constants.Events.ON_RESPONSE))
            this.manager.emit(Constants.Events.ON_RESPONSE, { request, response: res });
        let after;
        if (res.headers) {
            // Build ratelimit data for master process
            const data = Ratelimit.constructData(request, res.headers);
            // Just incase I messed my ratelimit handling up, so you can avoid getting banned
            after = !isNaN(data.after) ? Number(data.after) * 1000 : -1;
            // Send ratelimit data, and wait for possible global ratelimit manager halt
            await this.manager.updateInfo(this.id, this.hash, request.method, request.route, data);
        }
        // Handle 2xx and 3xx responses
        if (res.ok)
            // Nothing wrong with the request, proceed with the next one
            return RequestHandler.parseResponse(res);

        // Count the invalid requests
        if (res.status === 401 || res.status === 403 || res.status === 429) {
            const invalidRequest = await this.manager.updateInvalidCount(this.id);
            const emitInvalid =
                this.manager.client.listenerCount(Constants.Events.INVALID_REQUEST_WARNING) &&
                this.manager.client.options.invalidRequestWarningInterval > 0 &&
                invalidRequest.count % this.manager.client.options.invalidRequestWarningInterval === 0;
            if (emitInvalid) {
                /**
                 * @typedef {Object} InvalidRequestWarningData
                 * @property {number} count Number of invalid requests that have been made in the window
                 * @property {number} remainingTime Time in ms remaining before the count resets
                 */

                /**
                 * Emitted periodically when the process sends invalid requests to let users avoid the
                 * 10k invalid requests in 10 minutes threshold that causes a ban
                 * @event BaseClient#invalidRequestWarning
                 * @param {InvalidRequestWarningData} invalidRequestWarningData Object containing the invalid request info
                 */
                this.manager.client.emit(Constants.Events.INVALID_REQUEST_WARNING, {
                    count: invalidRequest.count,
                    remainingTime: invalidRequest.reset - Date.now(),
                });
            }
            if(this.manager.client.options.invalidRequestRejectOnAmount){
                if(this.manager.client.options.invalidRequestRejectOnAmount < invalidRequest.count) {
                    throw new RateLimitError({name: 'InvalidRequestAmount higher than limit', method: request.method, path: request.path, route: request.route, limit: this.manager.client.options.invalidRequestRejectOnAmount, timeout: invalidRequest.reset, global: false});
                }
            }
        }

        // Handle 4xx responses
        if (res.status >= 400 && res.status < 500) {
            // Handle ratelimited requests
            if (res.status === 429) {
                if (this.manager.listenerCount(Constants.Events.ON_TOO_MANY_REQUEST))
                    this.manager.emit(Constants.Events.ON_TOO_MANY_REQUEST, { request, response: res });
                // A ratelimit was hit, You did something stupid 
                this.manager.client.emit('debug',
                    'Encountered unexpected 429 ratelimit\n' +
                    `  Route          : ${request.route}\n` +
                    `  Request        : ${request.method}\n` +
                    `  Hash:Major     : ${this.id}\n` +
                    `  Request Route  : ${request.route}\n` +
                    `  Retry After    : ${after}ms`
                );
                // Retry after, but add 500ms on the top of original retry after
                await sleep(after + 500);
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

module.exports = RequestHandler;