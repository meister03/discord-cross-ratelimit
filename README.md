# Walther WA2000
Your tsundere gun-girl that aims to integrate global ratelimits handling for Discord.JS v12

> (c) Girl's Frontline for [Wa2000-chan](https://iopwiki.com/wiki/WA2000)

<p align="center">
  <img src="https://iopwiki.com/images/c/ce/WA2000_costume3.png">
</p>

### Before using this, please ensure you have my custom fork of [Kurasuta](https://github.com/Deivu/Kurasuta)
> Failure to use my fork of Kurasuta will make this module not work as intended

## Features

✅ Easy to use

✅ Tsundere Gun-Girl Waifu

## Installation
> npm i Deivu/Walther-WA2000 --save

## Example
> Running Wa2000 should be similar on how you do it with Kurasuta [Click Me](https://github.com/Deivu/Kurasuta#example), Except Your Index.JS will need minor changes

### Example of index.js
```js
const { ShardingManager } = require('kurasuta');
const { join } = require('path');
const Walther = require('wa2000');
// Require Kurasuta as normal
const manager = new ShardingManager(join(__dirname, 'main'), {
  // Kurasuta Options
});
// Require Walther-WA2000 
const walther = new Walther(manager);
// Call spawn from "Walther-WA2000" not from "Kurasuta"
walther.spawn();
```

> Based from my Handling from `@Kashima`, Made with ❤ by @Sāya#0113
