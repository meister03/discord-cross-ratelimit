
const { Collection, Constants } = require('discord.js');
const { OP, Wa2000BeingTsundere } = require('../Constants.js');
const RatelimitQueue = require('./RatelimitQueue.js');

class RatelimitManager {
    constructor(wa2000) {
        this.wa2000 = wa2000;
        this.handlers = new Collection();
        this.timeout = null;
        if (this.wa2000.sweepInterval > 0) {
            this.sweeper = setInterval(() => this.handlers.sweep(endpoint => endpoint.inactive), this.wa2000.sweepInterval * 1000);
            this.sweeper.unref();
        }   
    }

    get base() {
        return `${Constants.DefaultOptions.http.api}/v${Constants.DefaultOptions.http.version}`;
    }

    get server() {
        return this.wa2000.manager.ipc.server;
    }

    execute({ id, endpoint, headers }) {
        const limiter = this.handlers.get(id) || new RatelimitQueue(this, id, endpoint);
        if (!this.handlers.has(id)) this.handlers.set(id, limiter);
        return headers ? limiter.update(headers) : limiter.handle();
    }

    listen() {
        this.server.on('message', message => {
            if (!message) return;
            const data = message.data;
            if (!data || OP !== data.op) return;
            // This OP should be "ALWAYS RECEPTIVE"
            this.execute(message.data)
                .then(() => message.reply(Wa2000BeingTsundere()))
                .catch(error => message.reply(Wa2000BeingTsundere(error)));
        });
    }
}

module.exports = RatelimitManager;