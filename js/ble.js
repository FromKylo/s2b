/**
 * BLE Connection Module
 * Handles Bluetooth Low Energy connectivity to the braille display device
 */
class BLEConnection {
    constructor() {
        this.device = null;
        this.server = null;
        this.service = null;
        this.characteristic = null;
        this.speedTestCharacteristic = null;
        this.DEVICE_NAME = "Braille Display";
        this.SERVICE_UUID = "19b10000-e8f2-537e-4f6c-d104768a1214";
        this.CHARACTERISTIC_UUID = "19b10001-e8f2-537e-4f6c-d104768a1214";
        this.SPEED_TEST_UUID = "19b10002-e8f2-537e-4f6c-d104768a1214";
        this.statusElement = document.getElementById('connection-status');
    }
    
    /**
     * Connect to the braille display device
     */
    async connect() {
        if (!navigator.bluetooth) {
            this.updateStatus('error', 'Bluetooth not supported in this browser');
            throw new Error('Web Bluetooth API not supported in this browser');
        }
        
        try {
            logDebug('Requesting BLE device...');
            this.updateStatus('connecting', 'Connecting...');
            
            // Request device with filters
            this.device = await navigator.bluetooth.requestDevice({
                filters: [{ name: this.DEVICE_NAME }],
                optionalServices: [this.SERVICE_UUID]
            });
            
            // Setup disconnect listener
            this.device.addEventListener('gattserverdisconnected', () => {
                this.handleDisconnection();
            });
            
            logDebug('Connecting to GATT server...');
            this.server = await this.device.gatt.connect();
            
            logDebug('Getting primary service...');
            this.service = await this.server.getPrimaryService(this.SERVICE_UUID);
            
            logDebug('Getting characteristics...');
            this.characteristic = await this.service.getCharacteristic(this.CHARACTERISTIC_UUID);
            
            // Try to get the speed test characteristic if it exists
            try {
                this.speedTestCharacteristic = await this.service.getCharacteristic(this.SPEED_TEST_UUID);
                logDebug('Speed test characteristic found');
            } catch (error) {
                logDebug('Speed test characteristic not available');
                this.speedTestCharacteristic = null;
            }
            
            this.updateStatus('connected', 'Connected');
            logDebug('Connected to Braille Display device');
            return true;
        } catch (error) {
            this.updateStatus('error', 'Connection failed');
            logDebug('Connection failed: ' + error.message);
            throw error;
        }
    }
    
    /**
     * Handle disconnection event
     */
    handleDisconnection() {
        this.updateStatus('disconnected', 'Disconnected');
        logDebug('Device disconnected');
        
        this.server = null;
        this.service = null;
        this.characteristic = null;
        this.speedTestCharacteristic = null;
        
        // You could implement auto-reconnect here if desired
    }
    
    /**
     * Disconnect from the device
     */
    async disconnect() {
        if (this.device && this.device.gatt.connected) {
            await this.device.gatt.disconnect();
            this.updateStatus('disconnected', 'Disconnected');
            logDebug('Disconnected from device');
        }
    }
    
    /**
     * Check if currently connected
     */
    isConnected() {
        return this.device && this.device.gatt.connected;
    }
    
    /**
     * Send braille pattern to the device
     * @param {string} arrayStr - The braille pattern array as a string
     */
    async sendBraillePattern(arrayStr) {
        if (!this.isConnected() || !this.characteristic) {
            logDebug('Cannot send data: Not connected');
            return false;
        }
        
        try {
            // Prefix the array with 'O:' to indicate output phase
            const data = `O:${arrayStr}`;
            logDebug(`Sending data: ${data}`);
            
            // Convert string to UTF-8 encoded ArrayBuffer
            const encoder = new TextEncoder();
            const dataBuffer = encoder.encode(data);
            
            // Write to the characteristic
            await this.characteristic.writeValue(dataBuffer);
            logDebug('Data sent successfully');
            return true;
        } catch (error) {
            logDebug('Error sending data: ' + error.message);
            return false;
        }
    }
    
    /**
     * Send direct pin control command
     * Format: P:cell,pin,value
     */
    async sendPinControl(cell, pin, value) {
        if (!this.isConnected() || !this.characteristic) {
            logDebug('Cannot send pin control: Not connected');
            return false;
        }
        
        try {
            // Format the command
            const command = `P:${cell},${pin},${value}`;
            logDebug(`Sending pin control: ${command}`);
            
            // Convert string to UTF-8 encoded ArrayBuffer
            const encoder = new TextEncoder();
            const dataBuffer = encoder.encode(command);
            
            // Write to the characteristic
            await this.characteristic.writeValue(dataBuffer);
            logDebug('Pin control sent successfully');
            return true;
        } catch (error) {
            logDebug('Error sending pin control: ' + error.message);
            return false;
        }
    }
    
    /**
     * Run a speed test to measure BLE throughput
     */
    async runSpeedTest() {
        if (!this.isConnected()) {
            logDebug('Cannot run speed test: Not connected');
            return;
        }
        
        const packetSize = 20; // bytes per packet
        const testDuration = 5000; // 5 seconds
        const payload = new Array(packetSize).fill('A').join('');
        
        const startTime = Date.now();
        let packetsSent = 0;
        let totalBytesSent = 0;
        
        logDebug('Starting BLE speed test...');
        
        // Use the dedicated speed test characteristic if available
        const targetCharacteristic = this.speedTestCharacteristic || this.characteristic;
        const prefix = this.speedTestCharacteristic ? '' : 'S:';
        
        const sendPacket = async () => {
            if (Date.now() - startTime >= testDuration) {
                const endTime = Date.now();
                const durationSec = (endTime - startTime) / 1000;
                const throughput = totalBytesSent / durationSec;
                
                logDebug(`Speed test complete: ${packetsSent} packets sent`);
                logDebug(`Total bytes: ${totalBytesSent}`);
                logDebug(`Throughput: ${throughput.toFixed(2)} bytes/sec`);
                
                return;
            }
            
            try {
                const data = prefix + payload + packetsSent;
                const encoder = new TextEncoder();
                const dataBuffer = encoder.encode(data);
                
                await targetCharacteristic.writeValue(dataBuffer);
                
                packetsSent++;
                totalBytesSent += dataBuffer.byteLength;
                
                // Update progress every 10 packets
                if (packetsSent % 10 === 0) {
                    const elapsedTime = (Date.now() - startTime) / 1000;
                    logDebug(`Progress: ${packetsSent} packets, ${totalBytesSent} bytes, ${elapsedTime.toFixed(1)}s elapsed`);
                }
                
                // Schedule next packet
                setTimeout(sendPacket, 10);
            } catch (error) {
                logDebug(`Speed test error: ${error.message}`);
            }
        };
        
        // Start sending packets
        sendPacket();
    }
    
    /**
     * Update the connection status display
     */
    updateStatus(status, message) {
        if (!this.statusElement) return;
        
        this.statusElement.className = status;
        this.statusElement.textContent = message;
        
        // Flash the status briefly
        this.statusElement.style.transition = 'none';
        this.statusElement.style.opacity = '0.7';
        setTimeout(() => {
            this.statusElement.style.transition = 'opacity 0.3s ease';
            this.statusElement.style.opacity = '1';
        }, 10);
    }
}

// Initialize global BLE connection instance
window.bleConnection = new BLEConnection();
