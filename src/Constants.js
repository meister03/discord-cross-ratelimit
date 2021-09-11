const { ShardingManager } = require('kurasuta');
const OP = 'AZUMA';

let manager = ShardingManager;

module.exports = {
    OP,
    DefaultOptions: {
        handlerSweepInterval: 120000,
        hashInactiveTimeout: 240000,
        requestOffset: 500
    },
    Events: {
        ON_REQUEST: 'onRequest',
        ON_RESPONSE: 'onResponse',
        ON_TOO_MANY_REQUEST: 'onTooManyRequest'
    },
    createHandler: (manager, handler) => {
        const global = !!manager.timeout;
        const timeout = global ? manager.globalTimeout : handler.timeout;
        return {
            limit: handler.limit,
            remaining: handler.remaining,
            limited: handler.limited,
            timeout,
            global
        };
    },
    createFetchHandlerMessage: (id, hash, route) => {
        return {
            op: OP,
            type: 'handler',
            hash,
            id,
            route
        };
    },
    createUpdateHandlerMessage: (id, hash, method, route, data) => {
        return {
            op: OP,
            type: 'bucket',
            hash,
            id,
            method,
            route,
            data
        };
    },
    createFetchHashMessage: id => {
        return {
            op: OP,
            type: 'hash',
            id
        };
    },
    setShardingManager: extended => {
        if (!(extended instanceof ShardingManager)) throw new Error('Extended class not an instance of sharding manager');
        manager = extended;
    },
    getShardingManager: () => manager
};