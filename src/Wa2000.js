const EventEmitter = require('events');
const { ShardingManager } = require('kurasuta');
const { isMaster } = require('cluster');
const { Util } = require('discord.js');
const { DefaultOptions } = require('./Constants.js');

const Wa2000MasterIPC = require('./Wa2000MasterIPC.js');
const RatelimitManager = require('./ratelimits/RatelimitManager.js');
const RequestManager = require('./ratelimits/client/RequestManager.js');

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
  * Wa2000, initalizes the sharding manager, and ratelimit manager class
  * @class Wa2000
  * @extends {EventEmitter}
  */
class Wa2000 extends EventEmitter {
    /**
     * @param {string} path The path of your extended Kurasuta "BaseCluster.js"
     * @param {KurasutaOptions} [managerOptions={}] Options to initialize Kurasuta with
     * @param {Object} [ratelimitOptions={}] Options to initialize Kurasuta with
     * @param {number} [ratelimitOptions.handlerSweepInterval=150000] Interval for sweeping inactive cached ratelimit buckets, in ms
     * @param {number} [ratelimitOptions.hashInactiveTimeout=300000] TTL for unaccessed ratelimit hashes, in ms
     * @param {number} [ratelimitOptions.requestOffset=500] Offset for calculated timeouts for ratelimits, like "timeout + requestOffset"
     */
    constructor(path, managerOptions = {}, ratelimitOptions = {}) {
        super();
        if (!path) throw new Error('Ugh, commander, I am not dumb enough to know you didn\'t pass a path for your cluster file, Baka!');
        /**
         * Your Kurasuta sharding manager class, where Wa2000 is binded to
         * @type {KurasutaShardingManager}
         */
        this.manager = new ShardingManager(path, managerOptions);
        /**
         * Ratelimit Options of Wa2000
         * @type {Object}
         */
        this.options = Util.mergeDefault(DefaultOptions, ratelimitOptions);
        /**
         * Ratelimit Manager of Wa2000, this will be null if not invoked in master process
         * @type {RatelimitManager|null}
         */
        this.ratelimits = null;
    }
    /**
     * Intializes Wa2000 and Kurasuta, then starts the boot up process
     * @memberOf Wa2000
     * @returns {Promise<void>}
     */
    async spawn() {
        if (isMaster) {
            while(this.manager.ipc.server.status !== 1) await Util.delayFor(50);
            await this.manager.ipc.server.close();
            this.manager.ipc = new Wa2000MasterIPC(this.manager);
            while(this.manager.ipc.server.status !== 1) await Util.delayFor(50);
            this.ratelimits = new RatelimitManager(this);
            await this.manager.spawn();
            return;
        }
        const Cluster = require(this.manager.path);
        const cluster = new Cluster(this.manager);
        cluster.client.rest = new RequestManager(cluster.client, this.options.handlerSweepInterval);
        await cluster.init();
        return;
    }
    /**
     * Emitted when Wa2000 handled a ratelimit, not a 429, basically she handled the ratelimit before you hit a 429
     * @event Wa2000#ratelimit
     * @param {string} info.base Base URL of the ratelimit handled
     * @param {string} info.route Route of the ratelimit handled
     * @param {string} info.bucket Bucket ID of the ratelimit handled in format "hash:major"
     * @param {number} info.limit Total number of request you can do per ratelimit rotation
     * @param {number} info.remaining How many requests left you can do before Wa2000 halts any new requests on this route
     * @param {number} info.after Retry-After in a request header, this is usually 0 unless you got 429'ed, or any other unusual events. This is in ms
     * @param {number} info.timeout Calculated timeout, on which this ratelimit resets. This is in ms
     * @param {boolean} info.global Indicates if all your requests are halted, regardless of anything, this is global. Wa2000 will halt any requests if this is true until the timeout expires
     * @memberOf Wa2000
     */
    /**
     * Emitted when Wa2000 sent a debug message
     * @event Wa2000#debug
     * @param {string} message
     * @memberOf Wa2000
     */
}

module.exports = Wa2000;