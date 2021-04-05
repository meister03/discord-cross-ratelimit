
const { Collection, Constants } = require('discord.js');
const { op } = require('../util/TsundereUtil.js');
const RatelimitQueue = require('./RatelimitQueue.js');

class RatelimitManager {
    constructor(wa2000) {
        this.wa2000 = wa2000;
        this.base = `${Constants.DefaultOptions.http.api}/v${Constants.DefaultOptions.http.version}`;
        this.handlers = new Collection();
        this.ready = false;
        this.timeout = null;
        if (this.wa2000.sweepInterval > 0) 
            this.sweeper = setInterval(() => this.handlers.sweep(endpoint => endpoint.inactive), this.wa2000.sweepInterval * 1000);
    }
    
    static GenerateReplyInfo() {
        return {
            errored: false,
            name: null,
            message: null,
            stack: null
        };
    }

    get server() {
        return this.wa2000.manager.ipc.server;
    }

    update(endpoint, headers) {
        const limiter = this.handlers.get(endpoint) || new RatelimitQueue(this, endpoint);
        if (!this.handlers.has(endpoint)) this.handlers.set(endpoint, limiter);
        return limiter.update(headers);
    }

    append(endpoint) {
        const limiter = this.handlers.get(endpoint) || new RatelimitQueue(this, endpoint);
        if (!this.handlers.has(endpoint)) this.handlers.set(endpoint, limiter);
        return limiter.handle();
    }

    debug({ endpoint, limit, remaining, after, timeout }) {
        this.wa2000.emit('debug',
            '[ Discord Ratelimit Manager ] Ratelimit Handled\n' + 
            `  Base               : ${this.base}\n` + 
            `  Endpoint           : ${endpoint}\n` +
            `  Limit              : ${limit}\n` +
            `  Remaining          : ${remaining}\n`+
            `  Retry After        : ${after}ms\n` + 
            `  Calculated Timeout : ${timeout}ms\n` + 
            `  Global Ratelimit   : ${!!this.timeout}`
        );
    }

    listen() {
        if (this.ready) return;
        this.server.on('message', message => {
            if (!message) return;
            const data = message.data;
            if (!data || op !== data.op) return;
            // This OP should be "ALWAYS RECEPTIVE"
            this.handleMessage(message)
                .then(() => this.handleSuccess(message))
                .catch(error => this.handleError(message, error));
        });
        this.ready = true;
    }

    handleMessage({ data }) {
        const { endpoint, update, headers } = data;
        return update ? 
            this.update(endpoint, headers) :
            this.append(endpoint);
    }

    handleSuccess(message) {
        message.reply(RatelimitManager.GenerateReplyInfo);
    }

    handleError(message, error) {
        const info = RatelimitManager.GenerateReplyInfo();
        info.errored = true;
        info.name = error.name;
        info.message = error.message;
        info.stack = error.stack;
        message.reply(info);
    }
}

module.exports = RatelimitManager;