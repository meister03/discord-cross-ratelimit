# Walther WA2000
Your tsundere gun-girl that aims to integrate proper and globally synced ratelimit handling for Discord.JS

> (c) Girl's Frontline for [Wa2000-chan](https://iopwiki.com/wiki/WA2000)

<p align="center">
  <img src="https://iopwiki.com/images/c/ce/WA2000_costume3.png">
</p>

## Features

✅ Easy to use

✅ Tsundere Gun-Girl Waifu

✅ A drop in solution for your 429 problems

✅ Supports Discord.JS v13

## Installation
> npm i Deivu/Walther-WA2000 --save

## Documentation
> https://deivu.github.io/Walther-WA2000/

## Support
> https://discord.gg/FVqbtGu `#development` channel

## Example
> Running Wa2000 should be similar on how you do it with Kurasuta [Click Me](https://github.com/Deivu/Kurasuta#example), Except Your Index.JS will need minor changes

## Example of index.js
```js
const { join } = require('path');
const Walther = require('wa2000');
const YourBotClient = require('./YourBotClient.js')
const KurasutaOptions = {
    client: YourBotClient,
    timeout: 90000,
    token: 'idk'
};
const WaltherOptions = {
    handlerSweepInterval: 150000,
    hashInactiveTimeout: 300000,
    requestOffset: 500
};
const walther = new Walther(join(__dirname, 'YourBaseCluster.js'), KurasutaOptions,  WaltherOptions);
// If you need to access the Kurasuta Sharding Manager, example, you want to listen to shard ready event
walther.manager.on('shardReady', id => console.log(`Shard ${id} is now ready`));
// Call spawn from walther, not from kurasuta
walther.spawn();
```

## Example Bot
https://github.com/Deivu/Kongou

> Based from my Handling from `@Kashima`, Made with ❤ by @Sāya#0113
