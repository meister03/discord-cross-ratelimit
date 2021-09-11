import { AzumaManager } from './ratelimits/AzumaManager';
import { AzumaRatelimit } from './ratelimits/AzumaRatelimit';

export interface DefaultOptions {
    handlerSweepInterval?: number;
    inactiveTimeout?: number;
    requestOffset?: number;
}

export interface Events {
    ON_REQUEST: string;
    ON_RESPONSE: string;
    ON_TOO_MANY_REQUEST: string;
}

export interface Handler {
    limit: number;
    remaining: number;
    limited: boolean;
    timeout: number;
    global: boolean;
}

export interface FetchHandlerMessage {
    op: string;
    type: string;
    hash: string;
    id: string;
    route: string;
}

export interface UpdateHandlerMessage {
    op: string;
    type: string;
    hash: string;
    id: string;
    method: string;
    route: string;
    data: Object;
}

export interface FetchHashMessage {
    op: string;
    type: string;
    id: string;
}

export interface Constants {
    OP: string;
    DefaultOptions: DefaultOptions;
    Events: Events;
    createHandler(manager: AzumaManager, handler: AzumaRatelimit): Handler;
    createFetchHandlerMessage(id: string, hash: string, route: string): FetchHandlerMessage;
    createUpdateHandlerMessage(id: string, hash: string, method: string, route: string, data: Object): UpdateHandlerMessage;
    createFetchHashMessage(id: string): FetchHashMessage;
}