const { resolve } = require('path');
const KashimaRESTManager = require('../ratelimits/client/KashimaRequestManager.js');
const Op = 'Walther-WA2000';

// I'm a fucking weeb so why not?
class TsundereUtil {
    static get op() {
        return Op;
    }

    static Baka(ms) {
        return new Promise(res => ms ? setTimeout(res, ms) : setImmediate(res));
    }

    static GenerateIPCRequest() {
        return {
            op: Op,
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

    static ReplaceClientRest() {
        const Util = require.cache[resolve(require.resolve('kurasuta'))].exports.Util;
        Util.startCluster = async manager => {
            const imported = await import(manager.path);
            const Cluster = imported.default ? imported.default : imported;
            const cluster = new Cluster(manager);
            cluster.client.rest = new KashimaRESTManager(cluster.client, cluster.client.options._tokenType);
            return cluster.init();
        }; 
    }
}

module.exports = TsundereUtil;