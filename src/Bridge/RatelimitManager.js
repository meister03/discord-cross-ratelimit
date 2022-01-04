const { Cheshire } = require('cheshire');
const Constants = require('../Util/Constants.js');
const Ratelimit = require('./Ratelimit.js');

/**
  * Governs all the ratelimits across all your clusters / process
  * @class AzumaManager
  */
class RatelimitManager {
    /**
     * @param {Azuma} azuma The class that initalized the sharding manager, and ratelimit manager class
     */
    constructor(bridge) {
        /**
         * Contains the sharding manager, and ratelimit manager class
         * @type {Azuma}
         */
        this.bridge = bridge;
        /**
         * Currently cached ratelimit hashes
         * @type {Cheshire<string, string>}
         */
        this.hashes = new Cheshire({ lru: true, lifetime: this.bridge.ratelimit.options.inactiveTimeout });
        /**
         * Currently cached ratelimit info
         * @type {Cheshire<string, AzumaRatelimit>}
         */
        this.handlers = new Cheshire({ lru: true, lifetime:  this.bridge.ratelimit.options.inactiveTimeout });
        /**
         * Global ratelimit timeout
         * @type {number}
         */
        this.timeout = 0;
        // listener
        this.server.on('clientRequest', message => {
            if (!message) return;
            console.log(message.raw)
            const data = message.raw;
            // This OP should be "ALWAYS RECEPTIVE"
            if (Constants.OP !== data?.op) return;
            switch(data.type) {
                case 'handler': 
                    message.reply({data: this.get(data)});
                    break;
                case 'bucket': 
                    message.reply({data: this.update(data)});
                    break;
                case 'hash': 
                    message.reply({data: this.hashes.get(data.id)});
            }
        });
    }
    /**
     * The server for the IPC
     * @type {*}
     * @readonly
     */
    get server() {
        return this.bridge;
    }
    /**
     * Global timeout if there's any. Will only be accurate if this.timeout is not zero
     * @type {number}
     * @readonly
     */
    get globalTimeout() {
        if (this.timeout === 0) return 0;
        const timeout = this.timeout - Date.now() + this.bridge.ratelimit.options.requestOffset;
        if (Math.sign(timeout) === -1) return 0;
        return timeout;
    }
    /**
     * Gets a specific handler from cache
     * @param {Object} data
     * @returns {*}
     */
    get({ id, hash, route }) {
        let limiter = this.handlers.get(id);
        if (!limiter) {
            limiter = new Ratelimit(this, id, hash, route);
            this.handlers.set(id, limiter);
        }
        return Constants.createHandler(this, limiter);
    }
    /**
     * Updates a specific handler from cache
     * @param {Object} data
     * @returns {void}
     */
    update({ id, hash, method, route, data }) {
        let limiter = this.handlers.get(id);
        if (!limiter) {
            limiter = new Ratelimit(this, id, hash, route);
            this.handlers.set(id, limiter);
        }
        return limiter.update(method, route, data);
    }
}

module.exports = RatelimitManager;