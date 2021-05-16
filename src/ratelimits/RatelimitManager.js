
const { Collection, Constants } = require('discord.js');
const { api, version } = Constants.DefaultOptions.http;
const { TLRU } = require('tlru');

const { OP, Wa2000BeingTsundere } = require('../Constants.js');
const RatelimitQueue = require('./RatelimitQueue.js');

class RatelimitManager {
    constructor(wa2000) {
        this.wa2000 = wa2000;
        this.hashes = new TLRU({ defaultLRU: true, maxAgeMs: this.wa2000.options.hashInactiveTimeout, maxStoreSize: Infinity });
        this.handlers = new Collection();
        this.timeout = null;
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