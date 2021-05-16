
const { Collection, Constants } = require('discord.js');
const { api, version } = Constants.DefaultOptions.http;
const { TLRU } = require('tlru');

const { OP, Wa2000BeingTsundere } = require('../Constants.js');
const RatelimitQueue = require('./RatelimitQueue.js');

/**
  * RatelimitManager, governs all the ratelimits across all your clusters / process
  * @class RatelimitManager
  */
class RatelimitManager {
    /**
     * @param {Wa2000} wa2000 The main class of this package
     */
    constructor(wa2000) {
        /**
         * Wa2000, the main class of this package
         * @type {Wa2000}
         */
        this.wa2000 = wa2000;
        /**
         * Currently cached ratelimit hashes
         * @type {TLRU<string, string>}
         */
        this.hashes = new TLRU({ defaultLRU: true, maxAgeMs: this.wa2000.options.hashInactiveTimeout, maxStoreSize: Infinity });
        /**
         * Currently cached ratelimit handlers
         * @type {Collection<string, RatelimitQueue>}
         */
        this.handlers = new Collection();
        /**
         * Global ratelimit timeout
         * @type {Timeout|null}
         */
        this.timeout = null;
        /**
         * Inactive handlers sweeper
         * @type {Timeout|null}
         */
        this.sweeper = null;

        // inactive handler sweeper
        if (this.wa2000.options.handlerSweepInterval > 0) {
            this.sweeper = setInterval(() => this.handlers.sweep(endpoint => endpoint.inactive), this.wa2000.options.handlerSweepInterval * 1000);
            this.sweeper.unref();
        }
        // ipc message event handler
        this.server.on('message', message => {
            if (!message) return;
            const data = message.data;
            // This OP should be "ALWAYS RECEPTIVE"
            if (!data || OP !== data.op) return;
            // Handle Bucket Ratelimits
            if (message.data.type === 'bucket') {
                this.execute(message.data)
                    .then(() => message.reply(Wa2000BeingTsundere()))
                    .catch(error => message.reply(Wa2000BeingTsundere(error)));
                return;
            }
            // Handle Fetch Hashes Requests
            message.reply(this.hashes.get(message.data.id));
        });
    }

    get base() {
        return `${api}/v${version}`;
    }

    get server() {
        return this.wa2000.manager.ipc.server;
    }

    execute({ id, hash, method, route, data }) {
        let limiter = this.handlers.get(id);
        if (!limiter) {
            limiter = new RatelimitQueue(this, id, hash, route);
            this.handlers.set(id, limiter);
        }
        return data ? limiter.update(method, route, data) : limiter.handle();
    }
}

module.exports = RatelimitManager;