/**
 * BLE Connection Module
 * Handles Bluetooth Low Energy connection to braille display hardware
 */

class BLEConnection {
    constructor() {
        // Bluetooth device info
        this.device = null;
        this.server = null;
        this.service = null;
        this.characteristic = null;
        this.speedTestCharacteristic = null;
        
        // UUIDs (must match Arduino sketch)
        this.SERVICE_UUID = '19b10000-e8f2-537e-4f6c-d104768a1214';
        this.CHARACTERISTIC_UUID = '19b10001-e8f2-537e-4f6c-d104768a1214';
        this.SPEED_TEST_CHARACTERISTIC_UUID = '19b10002-e8f2-537e-4f6c-d104768a1214';
        
        // Status flags
        this.isConnected = false;
        this.isConnecting = false;
        
        // Callbacks
        this.onConnectCallback = null;
        this.onDisconnectCallback = null;
        this.onErrorCallback = null;
        
        // Auto-reconnect
        this.autoReconnect = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 3;
    }

    /**
     * Check if Web Bluetooth API is available
     */
    isAvailable() {
        return 'bluetooth' in navigator;
    }

    /**
     * Connect to the BLE device
     */
    async connect() {
        if (!this.isAvailable()) {
            const error = 'Web Bluetooth API not available in this browser';
            console.error(error);
            if (this.onErrorCallback) this.onErrorCallback(error);
            return false;
        }
        
        if (this.isConnected) {
            console.log('Already connected to BLE device.');
            return true;
        }
        
        if (this.isConnecting) {
            console.log('Connection already in progress.');
            return false;
        }
        
        this.isConnecting = true;
        
        try {
            // Request device with specific name and service
            this.device = await navigator.bluetooth.requestDevice({
                filters: [
                    { name: 'Braille Display' },
                    { services: [this.SERVICE_UUID] }
                ]
            });
            
            // Log device info
            console.log('BLE device selected:', this.device.name);
            
            // Add disconnection listener
            this.device.addEventListener('gattserverdisconnected', () => this.handleDisconnection());
            
            // Connect to GATT server
            this.server = await this.device.gatt.connect();
            console.log('Connected to GATT server');
            
            // Get service
            this.service = await this.server.getPrimaryService(this.SERVICE_UUID);
            console.log('Got primary service');
            
            // Get characteristic
            this.characteristic = await this.service.getCharacteristic(this.CHARACTERISTIC_UUID);
            console.log('Got characteristic');
            
            // Try to get the speed test characteristic (optional)
            try {
                this.speedTestCharacteristic = await this.service.getCharacteristic(
                    this.SPEED_TEST_CHARACTERISTIC_UUID
                );
                console.log('Got speed test characteristic');
            } catch (e) {
                console.warn('Speed test characteristic not available:', e);
                // Continue without speed test characteristic
            }
            
            this.isConnected = true;
            this.isConnecting = false;
            this.reconnectAttempts = 0;
            
            // Send test message to confirm connection
            await this.sendData('BLE:HELLO');
            
            if (this.onConnectCallback) this.onConnectCallback();
            
            return true;
        } catch (error) {
            this.isConnecting = false;
            console.error('BLE connection failed:', error);
            
            if (this.onErrorCallback) this.onErrorCallback(error.message || 'Connection failed');
            
            return false;
        }
    }

    /**
     * Handle disconnection event
     */
    async handleDisconnection() {
        this.isConnected = false;
        console.log('Device disconnected');
        
        if (this.onDisconnectCallback) this.onDisconnectCallback();
        
        // Attempt to reconnect if enabled
        if (this.autoReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
            
            // Wait before reconnecting
            setTimeout(async () => {
                try {
                    if (this.device && this.device.gatt) {
                        this.server = await this.device.gatt.connect();
                        console.log('Reconnected to GATT server');
                        this.isConnected = true;
                        
                        if (this.onConnectCallback) this.onConnectCallback();
                    }
                } catch (error) {
                    console.error('Reconnection failed:', error);
                }
            }, 2000);
        }
    }

    /**
     * Disconnect from the BLE device
     */
    async disconnect() {
        if (!this.isConnected || !this.device) return;
        
        try {
            // Disable auto-reconnect before disconnecting
            this.autoReconnect = false;
            
            if (this.device.gatt && this.device.gatt.connected) {
                this.device.gatt.disconnect();
                console.log('Disconnected from device');
            }
            
            this.isConnected = false;
            
            if (this.onDisconnectCallback) this.onDisconnectCallback();
            
            return true;
        } catch (error) {
            console.error('Error disconnecting:', error);
            return false;
        }
    }

    /**
     * Send data to the BLE device
     * @param {string|ArrayBuffer} data - Data to send
     */
    async sendData(data) {
        if (!this.isConnected || !this.characteristic) {
            console.error('Not connected to BLE device');
            return false;
        }
        
        try {
            // Convert string to ArrayBuffer if needed
            let buffer;
            if (typeof data === 'string') {
                const encoder = new TextEncoder();
                buffer = encoder.encode(data);
            } else if (data instanceof ArrayBuffer) {
                buffer = data;
            } else {
                console.error('Invalid data type. Must be string or ArrayBuffer');
                return false;
            }
            
            // Send the data
            await this.characteristic.writeValueWithResponse(buffer);
            console.log('Data sent successfully:', data);
            return true;
        } catch (error) {
            console.error('Error sending data:', error);
            return false;
        }
    }

    /**
     * Send braille pattern to hardware
     * @param {Array} pattern - Braille pattern array
     */
    async sendBraillePattern(pattern) {
        if (!pattern) return false;
        
        try {
            // Format: "O:[[1,2],[3,4]]" - O: prefix indicates output phase
            const dataString = `O:${JSON.stringify(pattern)}`;
            return await this.sendData(dataString);
        } catch (error) {
            console.error('Error sending braille pattern:', error);
            return false;
        }
    }

    /**
     * Clear the braille display (lower all dots)
     */
    async clearDisplay() {
        try {
            // Format: "N:[]" - N: prefix indicates not output phase
            const dataString = 'N:[]';
            return await this.sendData(dataString);
        } catch (error) {
            console.error('Error clearing display:', error);
            return false;
        }
    }

    /**
     * Run BLE speed test to measure connection performance
     * @param {number} packetSize - Size of each test packet in bytes
     * @param {number} packetCount - Number of packets to send
     * @param {number} delayMs - Delay between packets in milliseconds
     */
    async runSpeedTest(packetSize = 20, packetCount = 50, delayMs = 20) {
        if (!this.isConnected) {
            console.error('Not connected to BLE device');
            return false;
        }
        
        console.log(`Starting BLE speed test: ${packetCount} packets of ${packetSize} bytes each`);
        const testData = new Uint8Array(packetSize).fill(0xFF); // Fill with 0xFF
        
        const startTime = Date.now();
        let successCount = 0;
        
        const useSpeedCharacteristic = !!this.speedTestCharacteristic;
        console.log(`Using ${useSpeedCharacteristic ? 'dedicated speed test' : 'regular'} characteristic`);
        
        // Run the test
        for (let i = 0; i < packetCount; i++) {
            try {
                // Update first byte to indicate packet number
                testData[0] = i % 256;
                
                if (useSpeedCharacteristic) {
                    // Use dedicated speed test characteristic if available
                    await this.speedTestCharacteristic.writeValueWithoutResponse(testData);
                } else {
                    // Fall back to regular characteristic with special prefix
                    const prefix = `S:${i}:`;
                    const encoder = new TextEncoder();
                    const prefixBuffer = encoder.encode(prefix);
                    
                    // Combine prefix and test data
                    const combined = new Uint8Array(prefixBuffer.length + testData.length);
                    combined.set(prefixBuffer);
                    combined.set(testData, prefixBuffer.length);
                    
                    await this.characteristic.writeValueWithoutResponse(combined);
                }
                
                successCount++;
                
                // Wait if specified
                if (delayMs > 0) {
                    await new Promise(resolve => setTimeout(resolve, delayMs));
                }
            } catch (error) {
                console.error(`Error sending packet ${i}:`, error);
            }
        }
        
        const endTime = Date.now();
        const durationMs = endTime - startTime;
        const bytesTransferred = successCount * packetSize;
        const speedBps = (bytesTransferred * 1000) / durationMs;
        
        const result = {
            packetsTotal: packetCount,
            packetsSuccess: successCount,
            bytesTransferred,
            durationMs,
            speedBps
        };
        
        console.log('Speed test results:', result);
        return result;
    }

    /**
     * Set callback for connection event
     * @param {Function} callback - Function to call on connection
     */
    onConnect(callback) {
        this.onConnectCallback = callback;
    }

    /**
     * Set callback for disconnection event
     * @param {Function} callback - Function to call on disconnection
     */
    onDisconnect(callback) {
        this.onDisconnectCallback = callback;
    }

    /**
     * Set callback for error events
     * @param {Function} callback - Function to call on errors
     */
    onError(callback) {
        this.onErrorCallback = callback;
    }
}

// Create global instance
const bleConnection = new BLEConnection();
