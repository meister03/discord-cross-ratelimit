const { MasterIPC, IPCEvents, SharderEvents } = require('kurasuta');

class Wa2000MasterIPC extends MasterIPC {
    _incommingMessage(message) {
        const event = IPCEvents[message.data.op]?.toLowerCase();
        if (!event) return;
        this[`_${event}`](message);
    }

    _message(message) {
        this.manager.emit(SharderEvents.MESSAGE, message);
    }

}

module.exports = Wa2000MasterIPC;