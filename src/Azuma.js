import { isPrimary } from 'cluster';
import { Util } from 'discord.js';
import Structures from './Structures.js';
import Constants from './Constants.js';
import EventEmitter from 'events';
import AzumaIPC from './ratelimits/AzumaIPC.js';
import AzumaManager from './ratelimits/AzumaManager.js';
import RequestManager from './client/RequestManager.js';

/**
 * Discord.JS Client
 * @external DiscordClient
 * @see {@link https://discord.js.org/#/docs/main/stable/class/Client}
 */
/**
 * Kurasuta Options
 * @external KurasutaOptions
 * @see {@link https://github.com/DevYukine/Kurasuta#shardingmanager}
 */
/**
 * Kurasuta ShardingManager
 * @external KurasutaShardingManager
 * @see {@link https://github.com/DevYukine/Kurasuta#shardingmanager}
 */
/**
 * Node.JS Timeout
 * @external Timeout
 * @see {@link https://nodejs.org/api/timers.html#timers_class_timeout}
 */
/**
 * Request object in EmittedInfo
 * @external Request
 * @see {@link https://github.com/Deivu/Azuma/blob/8ed42d73c4604c09aba0df117982123b0592c796/typings/client/RequestManager.d.ts#L11}
 */
/**
 * Response object in EmittedInfo
 * @external Response
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/Response}
 */

/**
  * Initalizes the sharding manager, and ratelimit manager class
  * @class Azuma
  * @extends {EventEmitter}
  */
class Azuma extends EventEmitter {
    /**
     * @param {string} path The path of your extended Kurasuta "BaseCluster.js"
     * @param {KurasutaOptions} [managerOptions={}] Options to initialize Kurasuta with
     * @param {Object} [ratelimitOptions={}] Options to initialize Azuma with
     * @param {number} [ratelimitOptions.inactiveTimeout=240000] TTL for cached hashes, data and handlers. in ms
     * @param {number} [ratelimitOptions.requestOffset=500] Extra time in ms to wait before continuing to make REST requests
     */
    constructor(path, managerOptions = {}, ratelimitOptions = {}) {
        super();
        /**
         * Emitted when a debug message was sent
         * @event Azuma#debug
         * @param {string} message
         * @memberOf Azuma
         */
        if (!path) throw new Error('Commander, please provide a path for your BaseCluster.js');
        /**
         * Your Kurasuta sharding manager class
         * @type {KurasutaShardingManager}
         */
        this.manager = new (Structures.get('ShardingManager'))(path, managerOptions);
        /**
         * Options for Azuma
         * @type {Object}
         */
        this.options = Util.mergeDefault(Constants.DefaultOptions, ratelimitOptions);
        /**
         * Ratelimit cache for all your clusters, null on non primary process
         * @type {AzumaManager|null}
         */
        this.ratelimits = null;
    }
    /**
     * Initializes Azuma and Kurasuta
     * @memberOf Azuma
     * @returns {Promise<void>}
     */
    async spawn() {
        if (isPrimary) {
            while(this.manager.ipc.server.status !== 1) await Util.delayFor(1);
            await this.manager.ipc.server.close();
            this.manager.ipc.server.removeAllListeners();
            this.manager.ipc = new AzumaIPC(this.manager);
            while(this.manager.ipc.server.status !== 1) await Util.delayFor(1);
            this.ratelimits = new AzumaManager(this);
            const tasks = Structures.getBeforeSpawn();
            if (tasks.length) await Promise.all(tasks.map(task => task(this.manager)));
            await this.manager.spawn();
            return;
        }
        const manager = await import(this.manager.path);
        const cluster = new manager.default(this.manager);
        cluster.client.rest = new RequestManager(cluster.client, this.options.inactiveTimeout);
        await cluster.init();
    }
}

export default Azuma;