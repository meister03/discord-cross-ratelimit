const RatelimitManager = require('./Bridge/RatelimitManager.js')

class GlobalRatelimit{
    constructor(bridge, options={}){
        this.bridge = bridge;
        this.options = options;
        this.bridge.ratelimit = this;
        this.ratelimit = new RatelimitManager(this.bridge);
    }
}
module.exports = GlobalRatelimit;