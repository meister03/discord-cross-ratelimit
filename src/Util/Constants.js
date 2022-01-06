const OP = 'CRM'; // Cross Ratelimit Manager

module.exports = {
    OP,
    DefaultOptions: {
        inactiveTimeout: 240000,
        requestOffset: 500
    },
    Events: {
        ON_REQUEST: 'onRequest',
        ON_RESPONSE: 'onResponse',
        ON_TOO_MANY_REQUEST: 'onTooManyRequest'
    },
    createHandler: (manager, handler) => {
        const global = manager.timeout !== 0;
        const timeout = global ? manager.globalTimeout : handler.timeout;
        return {
            limit: handler.limit,
            remaining: handler.remaining,
            limited: handler.limited,
            timeout,
            global,
            invalidRequestTimeout: handler.invalidRequestTimeout,
            invalidRequestCount: handler.invalidRequestCount,
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

    createInvalidRequestMessage: (id) => {
        return {
            op: OP,
            type: 'invalidRequest',
            id
        };
    }
};