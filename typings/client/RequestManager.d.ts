import { LimitedCollection } from 'discord.js';
import { EventEmitter } from 'events';
import { ParsedHeaders } from '../ratelimits/AzumaRatelimit';
import { RequestHandler } from './RequestHandler';

export interface EmittedInfo {
    request: Request;
    response?: Response;
}

export class Request {
    public rest: RequestManager;
    public client: any;
    public method: string;
    public route: string;
    public options: Object;
    public retries: number;
    public fullUserAgent: string;
    public path: string;
    protected make(): Promise<Response>;
}

export class RequestManager extends EventEmitter {
    constructor(client: any, interval: number);
    public client: any;
    public versioned: boolean;
    public handlers: LimitedCollection<string, RequestHandler>;
    public endpoint: string;
    public readonly server: any;
    public readonly api: any;
    public readonly cdn: Object;
    public getAuth(): string;
    public fetchHash(id: string): Promise<string>;
    public fetchInfo(id: string, hash: string, route: string): Promise<Object>;
    public updateInfo(id: string, hash: string, method: string, route: string, data: ParsedHeaders): Promise<any>;
    public request(method: string, route: string, options?: Object): Promise<Buffer|Object|null>;
}

export interface RequestManager {
    on(event: 'onRequest', listener: (info: EmittedInfo) => void): this;
    on(event: 'onResponse', listener: (info: EmittedInfo) => void): this;
    on(event: 'onTooManyRequest', listener: (info: EmittedInfo) => void): this;
    once(event: 'onRequest', listener: (info: EmittedInfo) => void): this;
    once(event: 'onResponse', listener: (info: EmittedInfo) => void): this;
    once(event: 'onTooManyRequest', listener: (info: EmittedInfo) => void): this;
    off(event: 'onRequest', listener: (info: EmittedInfo) => void): this;
    off(event: 'onResponse', listener: (info: EmittedInfo) => void): this;
    off(event: 'onTooManyRequest', listener: (info: EmittedInfo) => void): this;
}