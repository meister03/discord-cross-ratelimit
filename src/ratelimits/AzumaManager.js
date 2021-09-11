const { Cheshire } = require('cheshire');
const { OP, createHandler } = require('../Constants.js');
const AzumaRatelimit = require('./AzumaRatelimit.js');

/**
  * Governs all the ratelimits across all your clusters / process
  * @class RatelimitManager
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
         * Currently cached ratelimit handlers
         * @type {Cheshire<string, RatelimitQueue>}
         */
        this.handlers = new Cheshire({ lru: true, lifetime: this.azuma.options.inactiveTimeout });
        /**
         * Global ratelimit timeout
         * @type {number}
         */
        this.timeout = 0;
        /**
         * IPC message handler
         */
        this.server.on('message', message => {
            if (!message) return;
            const data = message.data;
            // This OP should be "ALWAYS RECEPTIVE"
            if (OP !== data?.op) return;
            switch(data.type) {
                case 'handler': 
                    message.reply(this.fetch(data));
                    break;
                case 'bucket': 
                    message.reply(this.update(data));
                    break;
                case 'hash': 
                    message.reply(this.hashes.get(data.id));
            }
        });
    }

    get server() {
        return this.azuma.manager.ipc.server;
    }

    get globalTimeout() {
        return Date.now() - this.timeout;
    }

    fetch({ id, hash, route }) {
        let limiter = this.handlers.get(id);
        if (!limiter) {
            limiter = new AzumaRatelimit(this, id, hash, route);
            this.handlers.set(id, limiter);
        }
        return createHandler(this, limiter);
    }

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