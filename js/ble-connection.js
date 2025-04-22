class BLEConnection {
    constructor() {
        // BLE configuration
        this.deviceName = "Braille Display";
        this.serviceUuid = "19b10000-e8f2-537e-4f6c-d104768a1214";
        this.characteristicUuid = "19b10001-e8f2-537e-4f6c-d104768a1214";
        
        // State management
        this.device = null;
        this.server = null;
        this.service = null;
        this.characteristic = null;
        this.isConnected = false;
        
        // Callbacks
        this.callbacks = {
            onConnected: null,
            onDisconnected: null,
            onError: null,
            onDataSent: null
        };
    }

    async connect() {
        if (!navigator.bluetooth) {
            const error = new Error('Bluetooth not supported in this browser');
            if (this.callbacks.onError) this.callbacks.onError(error);
            throw error;
        }

        try {
            console.log('Requesting Bluetooth device...');
            
            this.device = await navigator.bluetooth.requestDevice({
                filters: [{ name: this.deviceName }],
                optionalServices: [this.serviceUuid]
            });
            
            if (!this.device) {
                throw new Error('No Bluetooth device selected');
            }
            
            // Set up disconnect listener
            this.device.addEventListener('gattserverdisconnected', this.onDisconnected.bind(this));
            
            console.log('Connecting to GATT server...');
            this.server = await this.device.gatt.connect();
            
            console.log('Getting primary service...');
            this.service = await this.server.getPrimaryService(this.serviceUuid);
            
            console.log('Getting characteristic...');
            this.characteristic = await this.service.getCharacteristic(this.characteristicUuid);
            
            this.isConnected = true;
            console.log('Connected to Braille Display');
            
            if (this.callbacks.onConnected) this.callbacks.onConnected();
            return true;
            
        } catch (error) {
            console.error('BLE connection error:', error);
            this.isConnected = false;
            if (this.callbacks.onError) this.callbacks.onError(error);
            throw error;
        }
    }

    async disconnect() {
        if (this.device && this.device.gatt.connected) {
            this.device.gatt.disconnect();
            console.log('Disconnected from device');
        } else {
            console.log('No device connected');
        }
        
        this.isConnected = false;
        this.device = null;
        this.server = null;
        this.service = null;
        this.characteristic = null;
    }

    onDisconnected() {
        console.log('Device disconnected');
        this.isConnected = false;
        
        if (this.callbacks.onDisconnected) {
            this.callbacks.onDisconnected();
        }
    }

    async sendBraillePattern(pattern) {
        if (!this.isConnected || !this.characteristic) {
            const error = new Error('Not connected to a BLE device');
            if (this.callbacks.onError) this.callbacks.onError(error);
            throw error;
        }

        try {
            // Format the pattern according to specification: O:[[1,2,5],[3,4]]
            const formattedPattern = `O:${JSON.stringify(pattern)}`;
            const encoder = new TextEncoder();
            const data = encoder.encode(formattedPattern);
            
            await this.characteristic.writeValue(data);
            console.log('Sent pattern to device:', formattedPattern);
            
            if (this.callbacks.onDataSent) {
                this.callbacks.onDataSent(formattedPattern);
            }
            
            return true;
        } catch (error) {
            console.error('Error sending pattern:', error);
            if (this.callbacks.onError) this.callbacks.onError(error);
            throw error;
        }
    }

    async runSpeedTest() {
        if (!this.isConnected) {
            throw new Error('Not connected to BLE device');
        }

        const results = {
            totalTests: 10,
            successfulTests: 0,
            averageTime: 0,
            startTime: Date.now()
        };

        // Simple test patterns
        const testPatterns = [
            [[1,3,5]],
            [[1,2,3]],
            [[4,5,6]],
            [[1,4]],
            [[2,5]],
            [[3,6]],
            [[1,2,3,4,5,6]],
            [[1], [2], [3]],
            [[1,3,5], [2,4,6]],
            [[]]
        ];

        const times = [];
        for (let i = 0; i < testPatterns.length; i++) {
            const pattern = testPatterns[i];
            const startTime = performance.now();
            
            try {
                await this.sendBraillePattern(pattern);
                const endTime = performance.now();
                times.push(endTime - startTime);
                results.successfulTests++;
            } catch (error) {
                console.error(`Test ${i+1} failed:`, error);
            }
            
            // Add a small delay between tests
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        results.endTime = Date.now();
        results.totalTime = results.endTime - results.startTime;
        results.averageTime = times.length ? times.reduce((a, b) => a + b, 0) / times.length : 0;
        
        return results;
    }

    on(event, callback) {
        if (this.callbacks.hasOwnProperty(event)) {
            this.callbacks[event] = callback;
            return true;
        }
        return false;
    }
}

// Create and export a singleton instance
const bleConnection = new BLEConnection();
