/**
 * BLE Connection Module
 * Handles Bluetooth Low Energy connection to braille display hardware
 */

class BLEConnection {
    constructor() {
        // Check for Web Bluetooth API support
        this.isSupported = 'bluetooth' in navigator;
        
        // Device info
        this.device = null;
        this.server = null;
        this.service = null;
        this.characteristic = null;
        this.connected = false;
        
        // Configuration for BLE device
        this.config = {
            name: 'BrailleDisplay',
            namePrefix: 'Braille',
            serviceUUID: '19b10000-e8f2-537e-4f6c-d104768a1214', // Custom service UUID
            characteristicUUID: '19b10001-e8f2-537e-4f6c-d104768a1214', // Custom characteristic UUID
            deviceInfoServiceUUID: '0000180a-0000-1000-8000-00805f9b34fb', // Standard Device Info service
            firmwareCharUUID: '00002a26-0000-1000-8000-00805f9b34fb',    // Firmware Revision
            manufacturerCharUUID: '00002a29-0000-1000-8000-00805f9b34fb' // Manufacturer Name
        };
        
        // Connection state management
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 3;
        this.autoReconnect = false;
        this.reconnectDelay = 2000;
        
        // Stats for data transfer
        this.stats = {
            sentCommands: 0,
            bytesTransferred: 0,
            errors: 0,
            lastSendTime: null,
            averageSendTime: 0,
            totalSendTime: 0
        };
        
        // Callbacks
        this.onConnectCallback = null;
        this.onDisconnectCallback = null;
        this.onErrorCallback = null;
        
        // Debug
        this.debug = {
            enabled: true,
            log: function(message) {
                if (this.enabled) {
                    console.log(`[BLE] ${message}`);
                }
            }
        };
    }
    
    /**
     * Check if Web Bluetooth is supported
     * @returns {boolean} Whether Web Bluetooth is supported
     */
    isBLESupported() {
        return this.isSupported;
    }
    
    /**
     * Request connection to a Bluetooth device
     * @returns {Promise} Promise resolving on successful connection
     */
    async connect() {
        if (!this.isSupported) {
            this.debug.log('Web Bluetooth is not supported by this browser');
            throw new Error('Web Bluetooth not supported');
        }
        
        try {
            this.debug.log('Requesting Bluetooth device...');
            
            // Request device with specified options
            const options = {
                filters: [],
                optionalServices: [this.config.serviceUUID, this.config.deviceInfoServiceUUID]
            };
            
            // Add name or prefix filter if provided
            if (this.config.name) {
                options.filters.push({ name: this.config.name });
            } else if (this.config.namePrefix) {
                options.filters.push({ namePrefix: this.config.namePrefix });
            } else {
                // If no name filters, use service UUID as filter
                options.filters.push({ services: [this.config.serviceUUID] });
            }
            
            // Request the device
            this.device = await navigator.bluetooth.requestDevice(options);
            
            // Add event listener for disconnection
            this.device.addEventListener('gattserverdisconnected', this.handleDisconnect.bind(this));
            
            // Connect to GATT server
            this.debug.log('Connecting to GATT server...');
            this.server = await this.device.gatt.connect();
            
            // Get primary service
            this.debug.log(`Getting primary service (${this.config.serviceUUID})...`);
            this.service = await this.server.getPrimaryService(this.config.serviceUUID);
            
            // Get characteristic
            this.debug.log(`Getting characteristic (${this.config.characteristicUUID})...`);
            this.characteristic = await this.service.getCharacteristic(this.config.characteristicUUID);
            
            // Connected
            this.connected = true;
            this.reconnectAttempts = 0;
            
            this.debug.log(`Connected to ${this.device.name}`);
            
            // Try to get device information
            this.getDeviceInfo();
            
            // Call connect callback
            if (typeof this.onConnectCallback === 'function') {
                this.onConnectCallback(this.device);
            }
            
            return {
                success: true,
                device: this.device.name
            };
        } catch (error) {
            this.connected = false;
            this.debug.log(`Connection error: ${error.message}`);
            
            // Call error callback
            if (typeof this.onErrorCallback === 'function') {
                this.onErrorCallback(error);
            }
            
            throw error;
        }
    }
    
    /**
     * Handle device disconnection
     */
    async handleDisconnect() {
        const wasConnected = this.connected;
        this.connected = false;
        
        this.debug.log('Device disconnected');
        
        // Call disconnect callback if it was previously connected
        if (wasConnected && typeof this.onDisconnectCallback === 'function') {
            this.onDisconnectCallback();
        }
        
        // Attempt to reconnect if auto-reconnect is enabled
        if (this.autoReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            
            this.debug.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
            
            // Wait before reconnecting
            await new Promise(resolve => setTimeout(resolve, this.reconnectDelay));
            
            try {
                // Reconnect
                await this.device.gatt.connect();
                this.debug.log('Reconnected');
                this.connected = true;
                
                // Reset reconnect attempts
                this.reconnectAttempts = 0;
                
                // Call connect callback
                if (typeof this.onConnectCallback === 'function') {
                    this.onConnectCallback(this.device);
                }
            } catch (error) {
                this.debug.log(`Reconnection failed: ${error.message}`);
            }
        }
    }
    
    /**
     * Disconnect from the device
     */
    disconnect() {
        if (!this.connected || !this.device) {
            return;
        }
        
        this.debug.log('Disconnecting...');
        
        // Disable auto-reconnect before disconnecting
        this.autoReconnect = false;
        
        // Disconnect from GATT server
        if (this.device.gatt.connected) {
            this.device.gatt.disconnect();
        }
        
        this.connected = false;
    }
    
    /**
     * Check if connected to a device
     * @returns {boolean} Whether connected
     */
    isConnected() {
        return this.connected && this.device && this.device.gatt.connected;
    }
    
    /**
     * Get connected device name
     * @returns {string|null} Device name or null if not connected
     */
    getDeviceName() {
        return this.device ? this.device.name : null;
    }
    
    /**
     * Get device information
     * @returns {Promise<Object>} Promise resolving to device info
     */
    async getDeviceInfo() {
        if (!this.isConnected()) {
            throw new Error('Not connected to a device');
        }
        
        try {
            const info = {};
            
            // Try to get device information service
            try {
                const deviceInfoService = await this.server.getPrimaryService(this.config.deviceInfoServiceUUID);
                
                // Try to get firmware revision
                try {
                    const firmwareChar = await deviceInfoService.getCharacteristic(this.config.firmwareCharUUID);
                    const value = await firmwareChar.readValue();
                    info.firmware = new TextDecoder().decode(value);
                } catch (e) {
                    this.debug.log('Firmware information not available');
                }
                
                // Try to get manufacturer name
                try {
                    const manufacturerChar = await deviceInfoService.getCharacteristic(this.config.manufacturerCharUUID);
                    const value = await manufacturerChar.readValue();
                    info.manufacturer = new TextDecoder().decode(value);
                } catch (e) {
                    this.debug.log('Manufacturer information not available');
                }
            } catch (e) {
                this.debug.log('Device information service not available');
            }
            
            this.debug.log('Device info:', info);
            return info;
        } catch (error) {
            this.debug.log(`Error getting device info: ${error.message}`);
            return {};
        }
    }
    
    /**
     * Send data to the connected device
     * @param {Array|ArrayBuffer|DataView} data - The data to send
     * @returns {Promise<boolean>} Promise resolving to success status
     */
    async sendData(data) {
        if (!this.isConnected()) {
            throw new Error('Not connected to a device');
        }
        
        try {
            // Start timing
            const startTime = performance.now();
            
            // Make sure data is in the correct format
            let dataToSend;
            if (data instanceof ArrayBuffer) {
                dataToSend = data;
            } else if (data instanceof DataView) {
                dataToSend = data.buffer;
            } else if (Array.isArray(data)) {
                // Convert array to ArrayBuffer
                dataToSend = new Uint8Array(data).buffer;
            } else {
                throw new Error('Data must be an Array, ArrayBuffer, or DataView');
            }
            
            // Send the data
            await this.characteristic.writeValue(dataToSend);
            
            // End timing
            const endTime = performance.now();
            const sendTime = endTime - startTime;
            
            // Update stats
            this.stats.sentCommands++;
            this.stats.bytesTransferred += dataToSend.byteLength;
            this.stats.lastSendTime = sendTime;
            this.stats.totalSendTime += sendTime;
            this.stats.averageSendTime = this.stats.totalSendTime / this.stats.sentCommands;
            
            this.debug.log(`Data sent (${dataToSend.byteLength} bytes) in ${sendTime.toFixed(2)}ms`);
            return true;
        } catch (error) {
            this.stats.errors++;
            this.debug.log(`Error sending data: ${error.message}`);
            
            // Call error callback
            if (typeof this.onErrorCallback === 'function') {
                this.onErrorCallback(error);
            }
            
            throw error;
        }
    }
    
    /**
     * Send braille pattern to the device
     * @param {Array} braillePattern - Array of braille pattern arrays
     * @returns {Promise<boolean>} Promise resolving to success status
     */
    async sendBraillePattern(braillePattern) {
        if (!Array.isArray(braillePattern)) {
            throw new Error('Braille pattern must be an array');
        }
        
        // Flatten the pattern if it's a 2D array
        let flatPattern;
        if (Array.isArray(braillePattern[0])) {
            flatPattern = braillePattern.flat();
        } else {
            flatPattern = braillePattern;
        }
        
        // Convert to byte array
        const byteArray = new Uint8Array(flatPattern);
        
        // Send data
        return this.sendData(byteArray.buffer);
    }
    
    /**
     * Set auto-reconnect option
     * @param {boolean} enable - Whether to enable auto-reconnect
     */
    setAutoReconnect(enable) {
        this.autoReconnect = !!enable;
    }
    
    /**
     * Get connection statistics
     * @returns {Object} Connection statistics
     */
    getStats() {
        return { ...this.stats };
    }
    
    /**
     * Reset statistics
     */
    resetStats() {
        this.stats = {
            sentCommands: 0,
            bytesTransferred: 0,
            errors: 0,
            lastSendTime: null,
            averageSendTime: 0,
            totalSendTime: 0
        };
    }
    
    /**
     * Set callback for connect event
     * @param {Function} callback - Connect callback
     */
    onConnect(callback) {
        this.onConnectCallback = callback;
    }
    
    /**
     * Set callback for disconnect event
     * @param {Function} callback - Disconnect callback
     */
    onDisconnect(callback) {
        this.onDisconnectCallback = callback;
    }
    
    /**
     * Set callback for error event
     * @param {Function} callback - Error callback
     */
    onError(callback) {
        this.onErrorCallback = callback;
    }
}

// Create global instance
window.bleConnection = new BLEConnection();