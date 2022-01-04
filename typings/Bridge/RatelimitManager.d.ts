import { Cheshire } from 'Cheshire';
import { server} from 'discord-cross-hosting';
import { Ratelimit } from './Ratelimit';
import { DefaultOptions } from '../Constants'

export class RatelimitManager {
    constructor(bridge: server, options: object);
    public bridge: sever;
    public options: options | DefaultOptions;
    public hashes: Cheshire<string, string>;
    public handlers: Cheshire<string, Ratelimit>;
    public timeout: number;
    public readonly server: any;
    public readonly globalTimeout: number;
    public get(data: Object): Object;
    public update(data: Object): void;
}