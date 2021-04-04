const { isMaster } = require('cluster');
const { ShardingManager } = require('kurasuta');
const { Constants, Util } = require('discord.js');
const { ReplaceClientRest } = require('./util/TsundereUtil.js');
const RatelimitManager = require('./ratelimits/RatelimitManager.js');
// Replace require cache
ReplaceClientRest();

class Wa2000 extends ShardingManager {
    constructor(path, options = {}) {
        if (options.clientOptions) options.clientOptions = Util.mergeDefault(Constants.DefaultOptions, options.clientOptions);
        super(path, options);
    }

    spawn() {
        if (isMaster) {
            this.ratelimitManager = new RatelimitManager(this, `${Constants.DefaultOptions.http.api}/v${Constants.DefaultOptions.http.version}`);
            this.ratelimitManager.listen();
        }
        return super.spawn();
    }
}

module.exports = Wa2000;