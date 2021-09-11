# Azuma
A package that actually syncs your ratelimits across all your clusters on Discord.JS

> The Shipgirl Project; [Azuma](https://azurlane.koumakan.jp/Azuma)

<p align="center">
  <img src="https://azurlane.netojuu.com/w/images/4/42/Azuma.png">
</p>

## Features

✅ An easy drop in solution for those who wants globally synced ratelimits

✅ Follows the original Discord.JS rest manager, so no breaking changes needed to do

✅ Supports Discord.JS v13

## TODO

* Support for `options.invalidRequestWarningInterval`

* Support for `options.restGlobalRateLimit`

* Support for `options.rejectOnRateLimit`

## Support
> https://discord.gg/FVqbtGu `#development` channel

## Example
> Running Azuma is the same with [Kurasuta](https://github.com/Deivu/Kurasuta#example), except on you need to change your index.js based on example below

## Example of index.js
```js
const { join } = require('path');
const Azuma = require('azuma');
const YourBotClient = require('./YourBotClient.js')
const KurasutaOptions = {
    client: YourBotClient,
    timeout: 90000,
    token: 'idk'
};
const AzumaOptions = {
    handlerSweepInterval: 150000,
    hashInactiveTimeout: 300000,
    requestOffset: 500
};
const azuma = new Azuma(join(__dirname, 'YourBaseCluster.js'), KurasutaOptions, AzumaOptions);
// If you need to access the Kurasuta Sharding Manager, example, you want to listen to shard ready event
azuma.manager.on('shardReady', id => console.log(`Shard ${id} is now ready`));
// Call spawn from azuma, not from kurasuta
azuma.spawn();
```

## Pro Tip
> Azuma also exposes when a request was made, when a response from a request is received, and if you hit an actul 429 via an event emitter, which you can use to make metrics on
```js
const { Client } = require('discord.js');
class Example extends Client {
  constructor(...args) {
    super();
    this.rest.on('onRequest', ({ request }) => /* do some parses on your thing for metrics or log it idk */);
    this.rest.on('onResponse', ({ request, response }) => /* do some parses on your thing for metrics or log it idk */);
    this.rest.on('onTooManyRequest', ({ request, response }) => /* do some probably, warning logs here? since this is an actual 429 and can get you banned for an hour */);
  }
}
```
> WARNING: DO NOT CHANGE ANYTHING ON THIS PARAMETERS. EX: `request.thing = yourthing;` It may cause unforseen problems that you may not want to deal with

## Example Bot
https://github.com/Deivu/Kongou

> Based from my Handling from `@Kashima`, Made with ❤ by @Sāya#0113
