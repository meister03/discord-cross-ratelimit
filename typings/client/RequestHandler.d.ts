import { AsyncQueue } from '@sapphire/async-queue';
import { Request, RequestManager } from './RequestManager';

export class RequestHandler {
    constructor(manager: RequestManager, hash: string, options: Object);
    public manager: RequestManager;
    public hash: string;
    public id: string;
    public queue: AsyncQueue;
    public readonly inactive: boolean;
    public static parseResponse(res: Response): Promise<Buffer|Object>;
    public push(request: Request): Promise<Buffer|Object|null>;
    private execute(request: Request): Promise<Buffer|Object|null>;
}