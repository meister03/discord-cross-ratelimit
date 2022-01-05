const { Cheshire } = require('cheshire');
const Constants = require('../Util/Constants.js');
const Ratelimit = require('./Ratelimit.js');
const { Util } = require('discord.js');

// @todo support also hybrid-sharding Instance

/**
* Governs all the ratelimits across all your clusters / process, which are in the Machines
* @class RatelimitManager
*/
class RatelimitManager {
    /**
     * @param {bridge} bridge The Bridge Instance, which is created by the Package Discord-Cross-Hosting or the Cluster Manager
     */
    constructor(bridge, options) {
        /**
         * Contains the bridge, and ratelimit manager class
         * @type {bridge}
         */
        this.bridge = bridge;
        if (!this.bridge) throw new Error('ClIENT_MISSING_OPTION', 'valid Instance must be provided and be type of Bridge (discord-cross-hosting) or Cluster.Manager (discord-hybrid-sharding)');

        /**
         * The Options for the ratelimit manager
         * @type {options=Constants.DefaultOptions}
         */
        this.options = Util.mergeDefault(Constants.DefaultOptions, options);

        /**
         * Currently cached ratelimit hashes
         * @type {Cheshire<string, string>}
         */
        this.hashes = new Cheshire({ lru: true, lifetime: this.options.inactiveTimeout });

        /**
         * Currently cached ratelimit info
         * @type {Cheshire<string, Ratelimit>}
         */
        this.handlers = new Cheshire({ lru: true, lifetime: this.options.inactiveTimeout });

        /**
         * Global ratelimit timeout
         * @type {number}
         */
        this.timeout = 0;

        // listener for replying with the handlers, bucket and hashes...
        this.server.on('clientRequest', message => {
            if (!message) return;
            console.log(message.raw)
            const data = message.raw;
            // This OP should be "ALWAYS RECEPTIVE"
            if (Constants.OP !== data?.op) return;
            switch (data.type) {
                case 'handler':
                    message.reply({ data: this.get(data) });
                    break;
                case 'bucket':
                    message.reply({ data: this.update(data) });
                    break;
                case 'hash':
                    message.reply({ data: this.hashes.get(data.id) });
            }
        });
    }

    /**
    * The server for the NET IPC
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
        const timeout = this.timeout - Date.now() + this.options.requestOffset;
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