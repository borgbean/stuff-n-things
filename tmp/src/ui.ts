import { DeviceManager, DeviceState } from "./BluetoothManager";
import { TreadmillCharacteristics, TreadmillDriver } from "./TreadmillDriver";

let button = document.querySelector('#ble');
button!.addEventListener('click', addNewDevice);

let driver = new TreadmillDriver();
let deviceManager = new DeviceManager();
deviceManager.init([driver]);

async function addNewDevice() {
    // if(deviceManager.knownDevices.size < 1) {
    await deviceManager.findNewDevice(driver);
    // }
    // let deviceState;
    // for(let dev of deviceManager.knownDevices.values()) { deviceState = dev; }


    // document.querySelector('#status').textContent = 'connected';
    // device.addEventListener('gattserverdisconnected', () => document.querySelector('#status').textContent = 'disconnected');




    // const btPermission = await navigator.permissions.query({ name: "bluetooth" });
    // if (btPermission.state !== "denied") {
    // // Do something
    // }
}




let devicesList = document.querySelector('#devices')!;

deviceManager.emitter.on('deviceAdded', showDevice);

const domByDevice = new Map();

let selectedDevice: UIDeviceState | undefined;


interface UIDeviceState {
    deviceState: DeviceState<TreadmillCharacteristics>
}


async function showDevice(deviceState: DeviceState<TreadmillCharacteristics>) {
    let domElement = document.createElement('div');
    domElement.innerHTML = `device: ${deviceState.device.name}; CONNECTED: <span class="status"></span>; SIGNAL: <span class="rssi">${deviceState.lastAdvertisement?.rssi}</span>
                        <button id="useDevice">switch to device</button>
                        `;//TODO

    let deviceStateWrapper = {
        deviceState,
    };

    let render = renderDevice.bind(null, deviceStateWrapper, domElement);
    deviceState.emitter.on('connected', async () => {
        render();
        deviceManager.useDevice(deviceState, c => setupNotify(c, deviceStateWrapper, selectedDevice), false);
    });

    deviceState.emitter.on('disconnected', render);
    deviceState.emitter.on('advertisementreceived', render);


    domByDevice.set(deviceState, domElement);

    devicesList.appendChild(domElement);

    render();

    if (!selectedDevice) {
        selectDevice(deviceStateWrapper);
    }
}

async function setupNotify(characteristics: TreadmillCharacteristics, _deviceStateWrapper: UIDeviceState, oldDevice: UIDeviceState | undefined) {
    if (oldDevice) { /* TODO */ }

    // await deviceManager.useDevice(deviceStateWrapper.deviceState, async characteristics => {
    // await  new Promise(r => setTimeout(r, 2000));
    console.log('enabling characteristics');
    await characteristics.treadmillData.startNotifications();
    // await characteristics.treadmillData.startNotifications();

    characteristics.treadmillData.addEventListener('characteristicvaluechanged', () => {
        console.log('VALUE RECEIVED!!!')

        const value = characteristics.treadmillData.value!;

        const mode = value.getUint8(2);
        if(mode !== 0x03) {
            console.log('treadmill asleep....');
            return;
        }

        let speed = value.getUint8(3);
        let incline = value.getUint8(4);
        let duration = value.getUint16(5, true);
        let distance = value.getUint16(7, true);

        // console.log(`SPEED: ${speed/10}mph - INCLINE: ${incline} - T: ${Math.floor(duration/60)}:${duration%60} - ${distance/100}mi`)

        document.querySelector('#status')!.textContent = `SPEED: ${speed/10}mph - INCLINE: ${incline} - T: ${(''+Math.floor(duration/60)).padStart(2, '0')}:${(''+duration%60).padStart(2, '0')} - ${distance/100}mi`;

        return;

    });

    console.log('awaiting notifications...');


}

function selectDevice(deviceStateWrapper: UIDeviceState) {
    selectedDevice = deviceStateWrapper;
}

function renderDevice(device: UIDeviceState, domElement: Element) {
    domElement.querySelector('.rssi')!.textContent = device.deviceState.lastAdvertisement?.rssi + '';
    domElement.querySelector('.status')!.textContent = `${device.deviceState.connected}`;
}

document.querySelector('#start')!.addEventListener('click', async () => {
    await deviceManager.useDevice(selectedDevice!.deviceState, async characteristics => {
        await characteristics.sendCommand.writeValueWithoutResponse(hexToBuf('02530100000000000000000e03'));
    }, true);
})
document.querySelector('#resume')!.addEventListener('click', async () => {
    await deviceManager.useDevice(selectedDevice!.deviceState, async characteristics => {
        await characteristics.sendCommand.writeValueWithoutResponse(hexToBuf('0253090603'));
    }, true);
});


function getTreadmillUpdateCommand() {
    let speed = Number((document.querySelector('#speed')! as any).value);
    let incline = Number((document.querySelector('#incline') as any).value);

    let bytes = new Uint8Array(7);
    let dv = new DataView(bytes.buffer);

    dv.setUint8(0, 2);
    dv.setUint8(1, 0b01010011); // ???
    dv.setUint8(2, 0b00000010);// ???
    dv.setUint8(3, speed);
    dv.setUint8(4, incline);

    let cksum = dv.getUint8(1)
                 + dv.getUint8(2)
                 + dv.getUint8(3)
                 + dv.getUint8(4);
    cksum ^= 90;

    dv.setUint8(5, cksum);
    dv.setUint8(6, 0b00000011);

    return bytes.buffer;
}

document.querySelector('#speed')!.addEventListener('input', async _ => {
    await deviceManager.useDevice(selectedDevice!.deviceState, async characteristics => {
        await characteristics.sendCommand.writeValueWithoutResponse(getTreadmillUpdateCommand());
    }, true);
});
document.querySelector('#incline')!.addEventListener('input', async _ => {
    await deviceManager.useDevice(selectedDevice!.deviceState, async characteristics => {
        await characteristics.sendCommand.writeValueWithoutResponse(getTreadmillUpdateCommand());
    }, true);
});

function hexToBuf(hex: String) {
    let cmdBuffer = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
        cmdBuffer[i / 2] = parseInt(hex.slice(i, i + 2), 16);
    }

    return cmdBuffer;
}

document.querySelector('#pause')!.addEventListener('click', async () => {
    await deviceManager.useDevice(selectedDevice!.deviceState, async characteristics => {
        await characteristics.sendCommand.writeValueWithoutResponse(hexToBuf('02530a0703'));
    }, true);
})

document.querySelector('#stop')!.addEventListener('click', async () => {
    await deviceManager.useDevice(selectedDevice!.deviceState, async characteristics => {
        await characteristics.sendCommand.writeValueWithoutResponse(hexToBuf('0253030c03'));
    }, true);
})





