import {EventEmitter} from 'eventemitter3';

export interface DeviceDriver<C extends BluetoothDeviceCharacteristics> {
    scanFilters: any;
    supports: (device: BluetoothDevice) => boolean;
    initializeState(gatt: BluetoothRemoteGATTServer, state: DeviceState<C>): Promise<void>;
}
export interface DeviceState<C extends BluetoothDeviceCharacteristics> {
    device: BluetoothDevice;
    driver: DeviceDriver<C>;
    autoConnect: boolean;
    connected: boolean;
    inUse: boolean;
    promise: Promise<any>;
    emitter: EventEmitter;
    lastAdvertisement?: BluetoothAdvertisingEvent;
    _characteristics?: C;
}
export interface BluetoothDeviceCharacteristics {
}

export class DeviceManager {
    knownDevices = new Map<BluetoothDevice, DeviceState<any>>();
    emitter =  new EventEmitter();

    async init(drivers: DeviceDriver<any>[]) {
        for (let device of await navigator.bluetooth.getDevices()) {
            let found = false;
            for(let driver of drivers) {
                if(driver.supports(device)) {
                    found = true;
                    let state = this._initDeviceState(device, driver);
                    this.emitter.emit('deviceAdded', state);
                    break;
                }
            }
            if(!found) {
                console.error(`Unsupported device connected?!`);
            }
        }

        await this.watchAdvertisements();
    }

    async findNewDevice<C extends BluetoothDeviceCharacteristics>(driver: DeviceDriver<C>) {
        const device = await navigator.bluetooth.requestDevice(driver.scanFilters);
        if (device) {
            let state = this._initDeviceState(device, driver);
            this.emitter.emit('deviceAdded', state);
        }
    }
    _initDeviceState(device: BluetoothDevice, driver: DeviceDriver<any>): DeviceState<any> {
        let state = {
            device,
            driver,
            autoConnect: false,
            connected: false,
            inUse: false,
            promise: new Promise(r => r(null)),
            emitter: new EventEmitter()
        };
        this.knownDevices.set(device, state);
        device.addEventListener('gattserverdisconnected', () => {
            state.connected = false;
            state.emitter.emit('disconnected', state);
        });

        return state;
    }
    async useDevice<C extends BluetoothDeviceCharacteristics>(state: DeviceState<C>, callback: (characteristics: C) => Promise<void>, autoConnect: boolean) {
        if (!state) {
            throw new Error('device not found');
        }

        await state.promise;
        return (state.promise = this._useDevice(state, callback, autoConnect));
    }
    async _useDevice<C extends BluetoothDeviceCharacteristics>(state: DeviceState<C>, callback: (characteristics: C) => Promise<void>, autoConnect: boolean) {
        let device = state.device;
        const gatt = device.gatt;
        if (!state.connected) {
            if (!autoConnect) {
                throw new Error('was not connected, and autoconnect=false');
            }
            if(!gatt) {
                throw new Error('Internal bluetooth error - no gatt?!');
            }
            await gatt.connect();
            state.connected = true;

            await state.driver.initializeState(gatt, state);

            state.emitter.emit('connected', state);
        }

        if(!state._characteristics) {
            throw new Error('internal driver issue - uninitialized characteristics');
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
    _advertisementReceived(event: BluetoothAdvertisingEvent) {
        let state = this.knownDevices.get(event.device);
        if (!state) { return; }

        //TODO
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
