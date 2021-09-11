import { EventEmitter } from 'events';
import { SharderOptions, ShardingManager } from 'kurasuta';
import { AzumaManager } from './ratelimits/AzumaManager';

export interface RatelimitOptions {
    handlerSweepInterval?: number;
    inactiveTimeout?: number;
    requestOffset?: number;
}

export class Azuma extends EventEmitter {
    constructor(path: string, managerOptions: SharderOptions, ratelimitOptions?: RatelimitOptions);
    public manager: ShardingManager;
    public options: RatelimitOptions;
    public ratelimits: AzumaManager;
    public spawn(): Promise<void>;
}

export interface Azuma {
    on(event: 'debug', listener: (message: string) => void): this;
    once(event: 'debug', listener: (message: string) => void): this;
    off(event: 'debug', listener: (message: string) => void): this;
}