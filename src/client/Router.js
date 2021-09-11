'use strict';
const { SnowflakeUtil } = require('discord.js');

const noop = () => {}; // eslint-disable-line no-empty-function
const methods = ['get', 'post', 'delete', 'patch', 'put'];
const reflectors = [
    'toString',
    'valueOf',
    'inspect',
    'constructor',
    Symbol.toPrimitive,
    Symbol.for('nodejs.util.inspect.custom'),
];

function buildRoute(manager) {
    const route = [''];
    const handler = {
        get(target, name) {
            if (reflectors.includes(name)) return () => route.join('/');
            if (methods.includes(name)) {
                const endpoint = route.join('/');
                const major = /^\/(?:channels|guilds|webhooks)\/(\d{16,19})/.exec(endpoint)?.[1] ?? 'global';
                const bucket = endpoint.replace(/\d{16,19}/g, ':id').replace(/\/reactions\/(.*)/, '/reactions/:reaction');
                // Hard-Code Old Message Deletion Exception (2 week+ old messages are a different bucket)
                // https://github.com/discord/discord-api-docs/issues/1295
                let exceptions = '';
                if (name === 'delete' && bucket === '/channels/:id/messages/:id') {
                    const id = /\d{16,19}$/.exec(endpoint)[0];
                    const { timestamp } = SnowflakeUtil.deconstruct(id);
                    if (Date.now() - Number(timestamp) > 1000 * 60 * 60 * 24 * 14) exceptions += '/Delete Old Message';
                }
                return options =>
                    manager.request(
                        name,
                        endpoint,
                        Object.assign({ versioned: manager.versioned, route: bucket + exceptions, major }, options)
                    );
            }
            route.push(name);
            return new Proxy(noop, handler);
        },
        apply(target, _, args) {
            route.push(...args.filter(x => x != null)); // eslint-disable-line eqeqeq
            return new Proxy(noop, handler);
        },
    };
    return new Proxy(noop, handler);
}

module.exports = buildRoute;