import { MasterIPC, IPCEvents } from 'kurasuta';

class AzumaIPC extends MasterIPC {
    _incommingMessage(message) {
        const event = IPCEvents[message.data.op]?.toLowerCase();
        if (!event) return;
        this[`_${event}`](message);
    }
}

export default AzumaIPC;