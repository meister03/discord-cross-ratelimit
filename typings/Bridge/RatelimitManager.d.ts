import { Cheshire } from 'cheshire';
import { Bridge } from 'discord-cross-hosting';
import { Manager } from 'discord-hybrid-sharding';
import { Ratelimit } from './Ratelimit';
import { DefaultOptions } from '../Constants'

export class RatelimitManager {
    constructor(bridge: Bridge | Manager, options?: object);
    public bridge: Bridge | Manager;
    public options: object | DefaultOptions;
    public hashes: Cheshire<string, string>;
    public handlers: Cheshire<string, Ratelimit>;
    public timeout: number;
    public readonly server: any;
    public readonly globalTimeout: number;
    public get(data: Object): Object;
    public update(data: Object): IDBRequest;
}
