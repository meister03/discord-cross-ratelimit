<p align="center"><a href="https://nodei.co/npm/discord-cross-ratelimit/"><img src="https://nodei.co/npm/discord-cross-ratelimit.png"></a></p>
<p align="center"><img src="https://img.shields.io/npm/v/discord-cross-ratelimit"> <img src="https://img.shields.io/npm/dm/discord-cross-ratelimit?label=downloads"> <img src="https://img.shields.io/npm/l/discord-cross-ratelimit"> <img src="https://img.shields.io/github/repo-size/meister03/discord-cross-ratelimit">  <a href="https://discord.gg/YTdNBHh"><img src="https://discordapp.com/api/guilds/697129454761410600/widget.png" alt="Discord server"/></a></p>

# discord-cross-ratelimit
A effecient package, which syncs ratelimits of your Discord Bot on all Machines/Clusters

## ON WORK 

Bridge:
```js
const {RatelimitManager} = require('discord-cross-ratelimit');
new RatelimitManager(server)
```
Client.js
```js
const {RequestManager} = require('discord-cross-ratelimit');
client.rest = new RequestManager(client);
```