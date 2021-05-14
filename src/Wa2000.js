const EventEmitter = require('events');
const { isMaster } = require('cluster');
const { Util } = require('discord.js');
const { DefaultOptions } = require('./Constants.js');

const RatelimitManager = require('./ratelimits/RatelimitManager.js');
const RequestManager = require('./ratelimits/client/RequestManager.js');

class Wa2000 extends EventEmitter {
    constructor(manager, options = {}) {
        super();
        if (!manager) throw new Error('Ugh, commander, I am not dumb enough to know you didn\'t pass a Kurasuta Sharding Manager, Baka!');
        this.manager = manager;
        this.options = Util.mergeDefault(DefaultOptions, options);
        this.ratelimits = null;
    }

    spawn() {
        if (isMaster) {
            this.ratelimits = new RatelimitManager(this);
            this.ratelimits.listen();
            return this.manager.spawn();
        }
        const Cluster = require(this.manager.path);
        const cluster = new Cluster(this.manager);
        cluster.client.rest = new RequestManager(cluster.client, this.options.handlerSweepInterval);
        return cluster.init();
    }
}

module.exports = Wa2000;