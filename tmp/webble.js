
/* Polyfill EventEmitter. */
var EventEmitter = function () {
    this.events = {};
};

EventEmitter.prototype.on = function (event, listener) {
    if (typeof this.events[event] !== 'object') {
        this.events[event] = [];
    }

    this.events[event].push(listener);
};

EventEmitter.prototype.removeListener = function (event, listener) {
    var idx;

    if (typeof this.events[event] === 'object') {
        idx = this.events[event].indexOf(listener);

        if (idx > -1) {
            this.events[event].splice(idx, 1);
        }
    }
};

EventEmitter.prototype.emit = function (event) {
    var i, listeners, length, args = [].slice.call(arguments, 1);

    if (typeof this.events[event] === 'object') {
        listeners = this.events[event].slice();
        length = listeners.length;

        for (i = 0; i < length; i++) {
            listeners[i].apply(this, args);
        }
    }
};

EventEmitter.prototype.once = function (event, listener) {
    this.on(event, function g() {
        this.removeListener(event, g);
        listener.apply(this, arguments);
    });
};





class DeviceManager {
    knownDevices = new Map();

    async init() {
        this.emitter = new EventEmitter();

        for (let device of await navigator.bluetooth.getDevices()) {
            let state = this.initDeviceState(device);
            this.emitter.emit('deviceAdded', state);
        }

        await this.watchAdvertisements();
    }

    async findNewDevice() {
        const device = await navigator.bluetooth.requestDevice({
            // filters: [{services: ['0000fee0-0000-1000-8000-00805f9b34fb']}]
            filters: [{ services: [0x1826] }],
            optionalServices: [0xFFF0]
            // filters: [{services: [0x1826, 0xFFF0]}]
            // filters: [{services: ['5833ff01-9b8b-5191-6142-22a4536ef123']}]
        });
        if (device) {
            let state = this.initDeviceState(device);
            this.emitter.emit('deviceAdded', state);
        }
    }
    initDeviceState(device) {
        let state = {
            device,
            autoConnect: false,
            connected: false,
            inUse: false,
            promise: new Promise(r => r()),
            emitter: new EventEmitter()
        };
        this.knownDevices.set(device, state);
        device.addEventListener('gattserverdisconnected', () => {
            state.connected = false;
            state.emitter.emit('disconnected', state);
        });

        return state;
    }
    async useDevice(state, callback, autoConnect) {
        if (!state) {
            throw new Error('device not found');
        }

        await state.promise;
        return (state.promise = this._useDevice(state, callback, autoConnect));
    }
    async _useDevice(state, callback, autoConnect) {
        let device = state.device;
        const gatt = device.gatt;
        if (!state.connected) {
            if (!autoConnect) {
                throw new Error('was not connected, and autoconnect=false');
            }
            await gatt.connect();
            state.connected = true;
            state.emitter.emit('connected', state);

            let _characteristics = {};

            {
                let services = await gatt.getPrimaryServices(0xfff0);
                let service = services.find(x => x.uuid.includes('fff0'));
                let characteristics = await service.getCharacteristics();
                _characteristics.sendCommand = characteristics.find(x => x.uuid.includes('fff2'));
            }
            
            {
                let services = await gatt.getPrimaryServices(0x1826);
                
                let service = services.find(x => x.uuid.includes('1826'));
                let characteristics = await service.getCharacteristics();
                debugger;
                _characteristics.treadmillData = characteristics.find(x => x.uuid.includes('2acd'));
                _characteristics.treadmillStatus = characteristics.find(x => x.uuid.includes('2ada'));
                _characteristics.trainingStatus = characteristics.find(x => x.uuid.includes('2ad3'));
            }

            state._characteristics = _characteristics;
        }

        await callback(state._characteristics);
    }
    async watchAdvertisements() {
        let p = [];
        for (let device of this.knownDevices.keys()) {
            device.addEventListener('advertisementreceived', e => this._advertisementReceived(e));
            p.push(device.watchAdvertisements());
        }
        await Promise.all(p);
    }
    _advertisementReceived(event) {
        let state = this.knownDevices.get(event.device);
        if (!state) { return; }

        state.lastAdvertisement = event;
        state.emitter.emit('advertisementreceived');
        /*
        
log('Advertisement received.');
log('  Device Name: ' + event.device.name);
log('  Device ID: ' + event.device.id);
log('  RSSI: ' + event.rssi);
log('  TX Power: ' + event.txPower);
log('  UUIDs: ' + event.uuids);
event.manufacturerData.forEach((valueDataView, key) => {
logDataView('Manufacturer', key, valueDataView);
});
event.serviceData.forEach((valueDataView, key) => {
logDataView('Service', key, valueDataView);
});
});

log('Watching advertisements from "' + device.name + '"...');
return device.watchAdvertisements();  
        */
    }
}
