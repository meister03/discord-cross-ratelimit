const { Cheshire } = require('cheshire');
const { OP, createHandler } = require('../Constants.js');
const AzumaRatelimit = require('./AzumaRatelimit.js');

/**
  * Governs all the ratelimits across all your clusters / process
  * @class AzumaManager
  */
class AzumaManager {
    /**
     * @param {Azuma} azuma The class that initalized the sharding manager, and ratelimit manager class
     */
    constructor(azuma) {
        /**
         * Contains the sharding manager, and ratelimit manager class
         * @type {Azuma}
         */
        this.azuma = azuma;
        /**
         * Currently cached ratelimit hashes
         * @type {Cheshire<string, string>}
         */
        this.hashes = new Cheshire({ lru: true, lifetime: this.azuma.options.inactiveTimeout });
        /**
         * Currently cached ratelimit info
         * @type {Cheshire<string, AzumaRatelimit>}
         */
        this.handlers = new Cheshire({ lru: true, lifetime: this.azuma.options.inactiveTimeout });
        /**
         * Global ratelimit timeout
         * @type {number}
         */
        this.timeout = 0;
        this.server.on('message', message => {
            if (!message) return;
            const data = message.data;
            // This OP should be "ALWAYS RECEPTIVE"
            if (OP !== data?.op) return;
            switch(data.type) {
                case 'handler': 
                    message.reply(this.get(data));
                    break;
                case 'bucket': 
                    message.reply(this.update(data));
                    break;
                case 'hash': 
                    message.reply(this.hashes.get(data.id));
            }
        });
    }
    /**
     * The server for the IPC
     * @type {*}
     * @readonly
     */
    get server() {
        return this.azuma.manager.ipc.server;
    }
    /**
     * Global timeout if there's any. Will only be accurate if this.timeout is not zero
     * @type {number}
     * @readonly
     */
    get globalTimeout() {
        return Date.now() - this.timeout;
    }
    /**
     * Gets a specific handler from cache
     * @param {Object} data
     * @returns {*}
     */
    get({ id, hash, route }) {
        let limiter = this.handlers.get(id);
        if (!limiter) {
            limiter = new AzumaRatelimit(this, id, hash, route);
            this.handlers.set(id, limiter);
        }
        return createHandler(this, limiter);
    }
    /**
     * Updates a specific handler from cache
     * @param id
     * @param hash
     * @param method
     * @param route
     * @param {Object} data
     * @returns {void}
     */
    update({ id, hash, method, route, data }) {
        let limiter = this.handlers.get(id);
        if (!limiter) {
            limiter = new AzumaRatelimit(this, id, hash, route);
            this.handlers.set(id, limiter);
        }
        return limiter.update(method, route, data);
    }
}

module.exports = AzumaManager;