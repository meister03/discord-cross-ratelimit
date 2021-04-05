const EventEmitter = require('events');
const { ShardingManager } = require('kurasuta');
const { isMaster } = require('cluster');
const { Constants, Util } = require('discord.js');
const TsundereUtil = require('./util/TsundereUtil.js');
const RatelimitManager = require('./ratelimits/RatelimitManager.js');

class Wa2000 extends EventEmitter {
    constructor(manager) {
        super();
        if (!(manager instanceof ShardingManager)) throw new Error('Supplied manager is not an instance of Kurasuta Sharding Manager');
        this.manager = manager;
        this.sweepInterval = Util.mergeDefault(Constants.DefaultOptions, manager.clientOptions).restSweepInterval;
    }

    spawn() {
        if (isMaster) {
            this.ratelimitManager = new RatelimitManager(this);
            this.ratelimitManager.listen();
            return this.manager.spawn();
        }
        return TsundereUtil.startCluster(this.manager);
    }
}

module.exports = Wa2000;