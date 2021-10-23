import { Constants } from 'discord.js';
import FormData from '@discordjs/form-data';
import Fetch from 'node-fetch';

class DiscordRequest {
    constructor(rest, method, path, options) {
        this.rest = rest;
        this.client = rest.client;
        this.method = method;
        this.route = options.route;
        this.options = options;
        this.retries = 0;
        const { userAgentSuffix } = this.client.options;
        this.fullUserAgent = `${Constants.UserAgent}${userAgentSuffix.length ? `, ${userAgentSuffix.join(', ')}` : ''}`;
        let queryString = '';
        if (options.query) {
            const query = Object.entries(options.query)
                .filter(([, value]) => value !== null && typeof value !== 'undefined')
                .flatMap(([key, value]) => Array.isArray(value) ? value.map(v => [key, v]) : [[key, value]]);
            queryString = new URLSearchParams(query).toString();
        }
        this.path = `${path}${queryString && `?${queryString}`}`;
    }

    make() {
        const API = this.options.versioned === false
            ? this.client.options.http.api
            : `${this.client.options.http.api}/v${this.client.options.http.version}`;
        const url = API + this.path;
        let headers = {
            ...this.client.options.http.headers,
            'User-Agent': this.fullUserAgent,
        };
        if (this.options.auth !== false) headers.Authorization = this.rest.getAuth();
        if (this.options.reason) headers['X-Audit-Log-Reason'] = encodeURIComponent(this.options.reason);
        if (this.options.headers) headers = Object.assign(headers, this.options.headers);
        let body;
        if (this.options.files?.length) {
            body = new FormData();
            for (const file of this.options.files) {
                if (file?.file) body.append(file.key ?? file.name, file.file, file.name);
            }
            if (typeof this.options.data !== 'undefined') {
                if (this.options.dontUsePayloadJSON) {
                    for (const [key, value] of Object.entries(this.options.data)) body.append(key, value);
                } else {
                    body.append('payload_json', JSON.stringify(this.options.data));
                }
            }
            headers = Object.assign(headers, body.getHeaders());
            // eslint-disable-next-line eqeqeq
        } else if (this.options.data != null) {
            body = JSON.stringify(this.options.data);
            headers['Content-Type'] = 'application/json';
        }
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), this.client.options.restRequestTimeout).unref();
        return Fetch(url, {
            method: this.method,
            agent: this.rest.agent,
            signal: controller.signal,
            headers,
            body
        }).finally(() => clearTimeout(timeout));
    }
}

export default DiscordRequest;