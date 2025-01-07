import { BluetoothDeviceCharacteristics, DeviceDriver, DeviceState } from "./BluetoothManager";

export interface TreadmillCharacteristics extends BluetoothDeviceCharacteristics {
    sendCommand: BluetoothRemoteGATTCharacteristic;
    treadmillData: BluetoothRemoteGATTCharacteristic;
}

export class TreadmillDriver implements DeviceDriver<TreadmillCharacteristics> {
    scanFilters = {
        filters: [{ services: [0x1826] }],
        optionalServices: [0xFFF0, 0xfee0]
    };

    //TODO temporary
    supports(_device: BluetoothDevice) { return true; }

    async initializeState(gatt: BluetoothRemoteGATTServer, state: DeviceState<TreadmillCharacteristics>): Promise<void> {
        let services = await gatt.getPrimaryServices(0xfff0);
        let service = services.find(x => x.uuid.includes('fff0'));
        let characteristics = await service!.getCharacteristics();


        let characteristicState = {
            sendCommand: characteristics.find(x => x.uuid.includes('fff2'))!,
            treadmillData: characteristics.find(x => x.uuid.includes('fff1'))!
        };

        if(!characteristicState.sendCommand || !characteristicState.treadmillData) {
            throw new Error(`Missing characteristics!! ${characteristicState.sendCommand}:${characteristicState.treadmillData}`);
        }

        state._characteristics = characteristicState;
    }
    
}