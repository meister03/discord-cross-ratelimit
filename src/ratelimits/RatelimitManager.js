
const { Collection, Constants } = require('discord.js');
const { op, GenerateReplyInfo } = require('../util/TsundereUtil.js');
const RatelimitQueue = require('./RatelimitQueue.js');

class RatelimitManager {
    constructor(wa2000) {
        this.ready = false;
        this.wa2000 = wa2000;
        this.base = `${Constants.DefaultOptions.http.api}/v${Constants.DefaultOptions.http.version}`;
        this.handlers = new Collection();
        // Global Timeout
        this.timeout = null;
        // Sweep inactive ratelimit buckets
        if (this.wa2000.sweepInterval > 0) 
            this.sweeper = setInterval(() => this.handlers.sweep(endpoint => endpoint.inactive), this.wa2000.sweepInterval * 1000);
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
            if (!message || message.op !== op) return;
            // This OP should be "ALWAYS RECEPTIVE"
            this.handleMessage(message)
                .then(() => this.handleSuccess(message))
                .catch(error => this.handleError(message, error));
        });
        this.ready = true;
    }

    handleMessage({ endpoint, update, headers }) {
        return update ? 
            this.update(endpoint, headers) :
            this.append(endpoint);
    }

    handleSuccess(message) {
        message.reply(GenerateReplyInfo);
    }

    handleError(message, error) {
        const info = GenerateReplyInfo();
        info.errored = true;
        info.name = error.name;
        info.message = error.message;
        info.stack = error.stack;
        message.reply(info);
    }
}

module.exports = RatelimitManager;