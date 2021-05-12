const OP = 'Walther-WA2000';

module.exports = {
    OP,
    Wa2000BeingTsundere: (error = null) => {
        return {
            errored: !!error,
            name: error?.name,
            message: error?.message,
            stack: error?.stack
        };
    },
    Wa2000Request: (id, hash, method, route, data = {}) => {
        if (!id || !method || !route) throw new Error('Ugh, id, method or endpoint is missing. I can\'t make a handler without it, stupid...');
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
    Wa2000FetchHash: id => {
        if (!id) throw new Error('Ugh, pass an id for hash, I can\'t get the ratelimit hash without it, stupid...');
        return {
            op: OP,
            type: 'hash',
            id
        };
    },
    Wa2000BeingTsunOnly: response => {
        if (!response) return new Error('You wan\'t me to go full Tsun to you yet you didn\'t pass an response object?');
        const error = new Error();
        error.name = response.name;
        error.message = response.message;
        error.stack = response.stack;
        return error;
    }
};