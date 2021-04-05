module.exports = {
    OP: 'Walther-WA2000',
    Wa2000BeingTsundere: (error = null) => {
        return {
            errored: !!error,
            name: error?.name,
            message: error?.message,
            stack: error?.stack
        };
    },
    Wa2000Request: (endpoint, headers = null) => {
        if (!endpoint) throw new Error('Ugh, pass an endpoint, I can\'t make a ratelimit bucket without it, stupid...');
        return {
            op: this.op,
            endpoint,
            update: !!headers,
            headers
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