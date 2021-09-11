import { Cheshire } from 'Cheshire';
import { Azuma } from '../Azuma';
import { AzumaRatelimit } from './AzumaRatelimit';

export class AzumaManager {
    constructor(azuma: Azuma);
    public azuma: Azuma;
    public hashes: Cheshire<string, string>;
    public handlers: Cheshire<string, AzumaRatelimit>;
    public timeout: number;
    public readonly server: any;
    public readonly globalTimeout: number;
    public get(data: Object): Object;
    public update(data: Object): void;
}