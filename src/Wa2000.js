const EventEmitter = require('events');
const { ShardingManager } = require('kurasuta');
const { isMaster } = require('cluster');
const { Util } = require('discord.js');
const { DefaultOptions } = require('./Constants.js');

const Wa2000MasterIPC = require('./Wa2000MasterIPC.js');
const RatelimitManager = require('./ratelimits/RatelimitManager.js');
const RequestManager = require('./ratelimits/client/RequestManager.js');

class Wa2000 extends EventEmitter {
    constructor(path, managerOptions = {}, ratelimitOptions = {}) {
        super();
        if (!path) throw new Error('Ugh, commander, I am not dumb enough to know you didn\'t pass a path for your cluster file, Baka!');
        this.manager = new ShardingManager(path, managerOptions);
        this.options = Util.mergeDefault(DefaultOptions, ratelimitOptions);
    }

    async spawn() {
        if (isMaster) {
            while(this.manager.ipc.server.status !== 1) await Util.delayFor(50);
            await this.manager.ipc.server.close();
            this.manager.ipc = new Wa2000MasterIPC(this.manager);
            while(this.manager.ipc.server.status !== 1) await Util.delayFor(50);
            this.ratelimits = new RatelimitManager(this);
            return this.manager.spawn();
        }
        const Cluster = require(this.manager.path);
        const cluster = new Cluster(this.manager);
        cluster.client.rest = new RequestManager(cluster.client, this.options.handlerSweepInterval);
        return cluster.init();
    }
}

module.exports = Wa2000;