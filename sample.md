```meramid
sequenceDiagram
    participant User as User
    participant WebApp as Web Application
    participant BLEHandler as BLE Handler (ble-handler.js)
    participant BLEDevice as BLE Device
    
    User->>WebApp: Initiate BLE Connection
    WebApp->>BLEHandler: Call connectToBLE()
    BLEHandler->>BLEDevice: Request Device Connection
    BLEDevice-->>BLEHandler: Acknowledge Connection
    BLEHandler-->>WebApp: Update Connection Status

    User->>WebApp: Send Data to BLE Device
    WebApp->>BLEHandler: Call sendBrailleToBLE(data)
    BLEHandler->>BLEDevice: Write Data to Characteristic
    BLEDevice-->>BLEHandler: Confirm Data Received
    BLEHandler-->>WebApp: Acknowledge Data Sent

    BLEDevice->>BLEHandler: Disconnect Event
    BLEHandler->>WebApp: Notify Disconnection
```
