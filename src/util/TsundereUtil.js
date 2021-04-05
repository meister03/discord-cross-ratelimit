const KashimaRESTManager = require('../ratelimits/client/KashimaRequestManager.js');

// I'm a fucking weeb so why not?
class TsundereUtil {
    static get op() {
        return 'Walther-WA2000';
    }

    static Baka(ms) {
        return new Promise(res => ms ? setTimeout(res, ms) : setImmediate(res));
    }
    
    static async startCluster(manager) {
        const imported = await import(manager.path);
        const Cluster = imported.default ? imported.default : imported;
        const cluster = new Cluster(manager);
        cluster.client.rest = new KashimaRESTManager(cluster.client, cluster.client.options._tokenType);
        return cluster.init();
    }
}

module.exports = TsundereUtil;