const EventEmitter = require('events');
const { isMaster } = require('cluster');
const { Constants, Util } = require('discord.js');
const RatelimitManager = require('./ratelimits/RatelimitManager.js');
const RequestManager = require('./ratelimits/client/RequestManager.js');

class Wa2000 extends EventEmitter {
    constructor(manager) {
        super();
        if (!manager) 
            throw new Error('Ugh, commander, I am not dumb enough to know you didn\'t pass a Kurasuta Sharding Manager, Baka!');
        this.manager = manager;
        this.ratelimits = null;
        this.sweepInterval = Util.mergeDefault(Constants.DefaultOptions, manager.clientOptions).restSweepInterval;
    }

    spawn() {
        if (isMaster) {
            this.ratelimits = new RatelimitManager(this);
            this.ratelimits.listen();
            return this.manager.spawn();
        }
        const Cluster = require(this.manager.path);
        const cluster = new Cluster(this.manager);
        cluster.client.rest = new RequestManager(cluster.client);
        return cluster.init();
    }
}

module.exports = Wa2000;