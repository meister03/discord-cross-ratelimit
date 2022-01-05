<p align="center"><a href="https://nodei.co/npm/discord-cross-ratelimit/"><img src="https://nodei.co/npm/discord-cross-ratelimit.png"></a></p>
<p align="center"><img src="https://img.shields.io/npm/v/discord-cross-ratelimit"> <img src="https://img.shields.io/npm/dm/discord-cross-ratelimit?label=downloads"> <img src="https://img.shields.io/npm/l/discord-cross-ratelimit"> <img src="https://img.shields.io/github/repo-size/meister03/discord-cross-ratelimit">  <a href="https://discord.gg/YTdNBHh"><img src="https://discordapp.com/api/guilds/697129454761410600/widget.png" alt="Discord server"/></a></p>

# Discord-cross-ratelimit
A efficient package, which syncs ratelimits of your Discord Bot on all Machines/Clusters.

## Why?
When Sharding/Scaling your Bot over many processes or even machines, every client has it own ratelimits, which are not synced with shards/clusters or machines.

Bots which encounter a high load, often hit the (global) ratelimit, because the Shards are not informed about existing ratelimits in other Shards.

Hitting less Global Ratelimits is essential, inorder to not get "cooldowned" by the ratelimit.

This Package syncs the ratelimits of your Bot over Machines and Clusters with no Breaking Changes, when using `Discord.js v13`

**Note:** You have to switch to `discord-hybrid-sharding`, which just needs some small changes and even allow Clustering and resource saving and has all functions of the ShardingManager. 

### Features:
* Syncs ratelimits of your Bot over Machines and Clusters
* No Breaking Changes for `Discord.js`
* Can be used in combination with `discord-hybrid-sharding` & `discord-cross-hosting`
* Fast Hash and Handlers fetching for allowing a fast processing of rest requests

## How does it Work?
When doing a rest request on the Discord Api, the package fetches Hashes and Handlers from the Manager, which can be a Bridge (`discord-cross-hosting`) or a Cluster.Manager (`discord-hybrid-sharding`)

The Manager saves on which route a request has been done and caches the sublimit, method, route and the remaining requests, which can be done without a ratelimit.

When executing a rest request and a hash/handler exists on the manager, the request will be queued inorder to not hit a ratelimit.

This is very similar to `Discord.js` Rest Ratelimits handling, the only difference is that it is saved globally instead locally.

# Guide
**If you need help feel free to join our <a href="https://discord.gg/YTdNBHh">discord server</a>. We will provied you all help ☺**

## Download
You can download it from npm:
```cli
npm i discord-cross-ratelimit
```

**1. Using the Package just with `Discord-Hybrid-Sharding`**

**2. Using the Package with `Discord-Cross-Hosting`**

**3. Api Reference**

### 1. Using the Package just with `Discord-Hybrid-Sharding`:
* When you are not familiar with the Package, you can take a look at the [Package's Readme](https://npmjs.com/package/discord-hybrid-sharding)
* You need two files, one for the Cluster Manager (`cluster.js`) and one for the Client (`bot.js`).

Cluster.js:
```js
const Cluster = require("discord-hybrid-sharding");
let {token} = require("./config.json");
const manager = new Cluster.Manager(`${__dirname}/bot.js`,{
//Check the Package's Readme for more options
                                       totalShards: 8 , 
                                       shardsPerClusters: 2, 
                                       mode: "process" ,  
                                       token: token,
                                    })

//Cache the Hashes and Handlers:
const {RatelimitManager} = require("discord-cross-ratelimit");
new RatelimitManager(manager);

manager.on('clusterCreate', cluster => console.log(`Launched Cluster ${cluster.id}`));
manager.spawn({timeout: -1});
```

Bot.js:
```js
const Cluster = require("discord-hybrid-sharding");
const Discord = require("discord.js");
const client = new Discord.Client({
   //@ts-ignore
 	shards: Cluster.data.SHARD_LIST,        //  A Array of Shard list, which will get spawned
	shardCount: Cluster.data.TOTAL_SHARDS, // The Number of Total Shards
});
client.cluster = new Cluster.Client(client); 

///Overwrite Request Manager for accounting global ratelimits:
const {RequestManager} = require("discord-cross-ratelimit");
client.rest = new RequestManager(client, client.cluster); //Init the Request Manager

client.login("Your_Token");
```
* Now go ahead and start `node cluster.js`, all ratelimits should now be synced between all Clusters in the Cluster Manager.
* When you are interested in syncing the ratelimits over all Machines, then scroll down.


### 2. Using the Package with `Discord-Cross-Hosting`:
* When you are not familiar with the Package, you can take a look at the [Package's Readme](https://npmjs.com/package/discord-cross-hosting)
* You need three files, one for the Bridge (`server.js`), the Cluster Manager (`cluster.js`) and one for the Client (`bot.js`).

Server.js:
```js
    const {Bridge} = require('discord-cross-hosting');

    const server = new Bridge({ 
        port: 4444, //The Port of the Server | Proxy Connection (Replit) needs Port 443
        authToken: 'Your_auth_token_same_in_cluster.js', 
        totalShards: 40, //The Total Shards of the Bot or 'auto'
        totalMachines: 2, //The Total Machines, where the Clusters will run
        shardsPerCluster: 2, //The amount of Internal Shards, which are in one Cluster
        token: 'Your_Bot_Token',
    });

    //Cache the Handlers and Hashes:
    const {RatelimitManager} = require("discord-cross-ratelimit");
    new RatelimitManager(server);

    server.on('debug', console.log)
    server.start();
    server.on('ready', (url) => console.log('Server is ready' + url));
```
Cluster.js:
```js
const client = new Client({
    agent: 'bot', 
    host: "localhost", ///Domain without https
    port: 4444, ///Proxy Connection (Replit) needs Port 443
    //handshake: true, When Replit or any other Proxy is used
    authToken: 'theauthtoken',
    rollingRestarts: false, //Enable, when bot should respawn when cluster list changes.
});
client.on('debug', console.log)
client.connect();

const Cluster = require("discord-hybrid-sharding");
const manager = new Cluster.Manager(`${__dirname}/bot.js`,{totalShards: 1 ,totalClusters: 'auto'}) //Some dummy Data
manager.on('clusterCreate', cluster => console.log(`Launched Cluster ${cluster.id}`));
manager.on('debug', console.log)

client.listen(manager);
client.requestShardData().then(e => {
    if(!e) return;
    if(!e.shardList) return;
    manager.totalShards = e.totalShards;
    manager.totalClusters = e.shardList.length;
    manager.shardList = e.shardList;
    manager.clusterList = e.clusterList;
    manager.spawn({timeout: -1})
}).catch(e => console.log(e));
```
Bot.js:
```js
const Cluster = require("discord-hybrid-sharding");
const Discord = require("discord.js");
const client = new Discord.Client({
    intents: ['GUILDS'], //Your Intents
 	shards: Cluster.data.SHARD_LIST,        //  A Array of Shard list, which will get spawned
	shardCount: Cluster.data.TOTAL_SHARDS, // The Number of Total Shards
});

client.cluster = new Cluster.Client(client); 

const {Shard}= require('discord-cross-hosting');
client.machine = new Shard(client.cluster); //Initalize Cluster

/***********************************************************/
///Overwrite Request Manager for accounting global ratelimits:
const {RequestManager} = require("discord-cross-ratelimit");
client.rest = new RequestManager(client, client.machine); //Init the Request Manager
/***********************************************************/
client.on('ready', () => console.log('ready'))

client.login(process.env.token);
```
* Start the Bridge at first and the Cluster (on all machines you want) with `node Server.js` and `node Cluster.js`
* All ratelimits should now be synced over all Machines  and Clusters.

### 3. Api Reference:
* Api Refernce is on work, in the meanwhile you can look [here](https://deivu.github.io/Azuma/?api) or in the typings/code...

### `new RatelimitManager(manager | bridge, options)`
| Option | Type | Default | Description |
| ------------- | ------------- | ------------- | ------------- |
| manager| class| required| The Bridge/Cluster Manager to send the Ratelimit Data over the IPC |
| options | object| `{ inactiveTimeout: 240000, requestOffset: 500 }` | Options, which should be respected, when saving and sending hashes/handers |

### `new RequesttManager(client, ClusterClient | MachineShard)`
| Option | Type | Default | Description |
| ------------- | ------------- | ------------- | ------------- |
| client| class| required| The Discord.js Client, which is required for the http.options |
| instance| class| required| The ClusterClient/MachineShard for requesting the Hashes and Handlers via the IPC |

# Bugs, Glitches, Issues and Feature Requests
If you encounter any problems feel free to open an issue in our <a href="https://github.com/meister03/discord-cross-ratelimit/issues">github repository or join the [discord server](https://discord.gg/YTdNBHh).</a>

# Credits
Credits goes to [Azuma](https://github.com/Deivu/Azuma), since this has been heavily inspired from it and the discord.js libary (See the Changes.md)