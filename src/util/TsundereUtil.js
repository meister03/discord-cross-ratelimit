const KashimaRESTManager = require('../ratelimits/client/KashimaRequestManager.js');

// I'm a fucking weeb so why not?
class TsundereUtil {
    static get op() {
        return 'Walther-WA2000';
    }

    static Baka(ms) {
        return new Promise(res => ms ? setTimeout(res, ms) : setImmediate(res));
    }

    static GenerateIPCRequest() {
        return {
            op: TsundereUtil.op,
            // note to self, dont forget to send endpoint
            endpoint: null,
            // update is true when we send headers, while false if we just check
            update: false,
            // headers is needed when update is set to true, but if not then leave it
            headers: null
        };
    }

    static GenerateReplyInfo() {
        return {
            errored: false,
            name: null,
            message: null,
            stack: null
        };
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