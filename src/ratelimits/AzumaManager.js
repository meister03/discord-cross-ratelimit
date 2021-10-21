import { Cheshire } from 'cheshire';
import Constants from '../Constants.js';
import AzumaRatelimit from './AzumaRatelimit.js';

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
        // listener
        this.server.on('message', message => {
            if (!message) return;
            const data = message.data;
            // This OP should be "ALWAYS RECEPTIVE"
            if (Constants.OP !== data?.op) return;
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
        if (this.timeout === 0) return 0;
        const timeout = this.timeout - Date.now() + this.azuma.options.requestOffset;
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
            limiter = new AzumaRatelimit(this, id, hash, route);
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
            limiter = new AzumaRatelimit(this, id, hash, route);
            this.handlers.set(id, limiter);
        }
        return limiter.update(method, route, data);
    }
}

export default AzumaManager;