import { RequestHandler } from './typings/client/RequestHandler';
import { RequestManager, Request, EmittedInfo } from './typings/client/RequestManager';
import { AzumaIPC } from './typings/ratelimits/AzumaIPC';
import { AzumaManager } from './typings/ratelimits/AzumaManager';
import { AzumaRatelimit, ParsedHeaders } from './typings/ratelimits/AzumaRatelimit';
import { Azuma, RatelimitOptions } from './typings/Azuma';
import { Structures } from './typings/Structures';
import * as Constants from './typings/Constants';

declare module 'azuma' {
    export { 
        RequestHandler,
        RequestManager,
        Request,
        EmittedInfo,
        AzumaIPC,
        AzumaManager,
        AzumaRatelimit,
        ParsedHeaders,
        Azuma,
        RatelimitOptions,
        Structures,
        Constants
    };
}
