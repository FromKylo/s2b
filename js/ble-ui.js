class BleUI {
    constructor() {
        this.connectButton = document.getElementById('connect-ble');
        this.statusIndicator = document.getElementById('ble-status');
        this.testButton = document.getElementById('braille-test-btn');
        this.initialized = false;
    }

    init() {
        if (this.initialized) return;
        
        if (this.connectButton) {
            this.connectButton.addEventListener('click', this.handleConnectClick.bind(this));
        }
        
        if (this.testButton) {
            this.testButton.addEventListener('click', this.handleTestClick.bind(this));
        }
        
        // Set up BLE callbacks
        bleConnection.on('onConnected', () => this.updateConnectionStatus(true));
        bleConnection.on('onDisconnected', () => this.updateConnectionStatus(false));
        bleConnection.on('onError', (error) => this.handleBleError(error));
        
        this.initialized = true;
    }

    async handleConnectClick() {
        if (bleConnection.isConnected) {
            try {
                await bleConnection.disconnect();
                this.updateConnectionStatus(false);
            } catch (error) {
                console.error('Error disconnecting:', error);
                debugManager.error('BLE disconnect error', error);
            }
        } else {
            this.setConnecting();
            try {
                await bleConnection.connect();
                // updateConnectionStatus will be called via callback
            } catch (error) {
                console.error('Connection error:', error);
                debugManager.error('BLE connection error', error);
                this.updateConnectionStatus(false);
            }
        }
    }

    async handleTestClick() {
        if (!bleConnection.isConnected) {
            alert('Please connect to a braille display first');
            return;
        }
        
        try {
            // Test pattern - a sequence of letters
            const alphabet = 'abcdefghijklmnopqrstuvwxyz';
            
            for (const letter of alphabet) {
                const translation = brailleTranslator.translateWord(letter);
                
                if (translation && translation.pattern) {
                    debugManager.info(`Testing letter: ${letter}`, translation);
                    await bleConnection.sendBraillePattern(translation.pattern);
                    
                    // Wait for a moment before sending the next letter
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }
            
            debugManager.info('Braille test complete');
        } catch (error) {
            console.error('Test error:', error);
            debugManager.error('Braille test error', error);
        }
    }

    updateConnectionStatus(connected) {
        if (this.statusIndicator) {
            this.statusIndicator.className = `status-indicator ${connected ? 'connected' : 'disconnected'}`;
            
            const statusDot = this.statusIndicator.querySelector('.status-dot');
            const statusText = this.statusIndicator.querySelector('.status-text');
            
            if (statusText) {
                statusText.textContent = connected ? 'Connected' : 'Disconnected';
            }
        }
        
        if (this.connectButton) {
            this.connectButton.textContent = connected ? 'Disconnect Display' : 'Connect Braille Display';
        }
        
        debugManager.log(`BLE connection status: ${connected ? 'Connected' : 'Disconnected'}`);
    }

    setConnecting() {
        if (this.statusIndicator) {
            this.statusIndicator.className = 'status-indicator connecting';
            
            const statusText = this.statusIndicator.querySelector('.status-text');
            if (statusText) {
                statusText.textContent = 'Connecting...';
            }
        }
        
        if (this.connectButton) {
            this.connectButton.textContent = 'Connecting...';
        }
    }

    handleBleError(error) {
        console.error('BLE error:', error);
        
        // Show a user-friendly error message
        const errorMessage = error.message || 'Unknown error';
        alert(`Bluetooth error: ${errorMessage}`);
    }
}

// Create and initialize the BLE UI
const bleUI = new BleUI();
document.addEventListener('DOMContentLoaded', () => bleUI.init());
