import { RatelimitManager } from './RatelimitManager';

export interface ParsedHeaders {
    date: string;
    limit: string|number;
    remaining: string|number;
    reset: string|number;
    hash: string;
    after: string|number;
    global: boolean;
    reactions: boolean;
}

export class Ratelimit {
    constructor(manager: RatelimitManager, id: string, hash: string, route: string);
    public manager: RatelimitManager;
    public id: string;
    public hash: string;
    public route: string;
    public limit: number;
    public remaining: number;
    public reset: number;
    public after: number;
    protected static constructData(request: Object, headers: ParsedHeaders): Object;
    protected static getAPIOffset(date: string): number;
    protected static calculateReset(reset: number, date: string): number;
    public readonly limited: boolean;
    public readonly timeout: number;
    public update(method: string, route: string, data: ParsedHeaders): void;
}