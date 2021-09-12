const { ShardingManager } = require('kurasuta');

const Struct = {
    ShardingManager: ShardingManager
};
const beforeSpawn = [];

class Structures {
    static extend(name, structure) {
        if (Struct[name]) Struct[name] = structure;
    }

    static get(name) {
        return Struct[name];
    }
    
    static setBeforeSpawn(fn) {
        beforeSpawn.push(fn);
    }

    static getBeforeSpawn() {
        const clone = [...beforeSpawn];
        beforeSpawn.length = 0;
        return clone;
    }
}

module.exports = Structures;