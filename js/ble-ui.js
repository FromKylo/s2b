/**
 * BLE UI Components and Functionality
 * Handles UI elements and interactions related to the Bluetooth connection
 */

class BLEUI {
    constructor(app) {
        this.app = app;
        this.elements = {
            bleStatus: document.getElementById('ble-status'),
            connectButton: document.getElementById('connect-ble'),
            brailleTestBtn: document.getElementById('braille-test-btn'),
            runSpeedTest: document.getElementById('run-speed-test')
        };
        
        // Bind events specific to BLE UI
        this.bindEvents();
    }

    /**
     * Bind events specific to BLE UI
     */
    bindEvents() {
        // Braille test button
        if (this.elements.brailleTestBtn) {
            this.elements.brailleTestBtn.addEventListener('click', () => {
                this.runBrailleTest();
            });
        }
        
        // BLE Speed test button
        if (this.elements.runSpeedTest) {
            this.elements.runSpeedTest.addEventListener('click', () => {
                this.runBLESpeedTest();
            });
        }
    }

    /**
     * Set up Bluetooth callbacks
     */
    setupBLECallbacks() {
        bleConnection.onConnect = () => {
            this.updateBLEStatus('connected', 'Connected');
            this.app.log('BLE device connected successfully', 'success');
            playAudioCue('connected');
        };
        
        bleConnection.onDisconnect = () => {
            this.updateBLEStatus('disconnected', 'Disconnected');
            this.app.log('BLE device disconnected', 'warning');
            playAudioCue('disconnected');
        };
        
        bleConnection.onError = (error) => {
            this.updateBLEStatus('error', 'Error');
            this.app.log(`BLE error: ${error}`, 'error');
            playAudioCue('error');
        };
        
        bleConnection.onSend = (data) => {
            this.app.log(`Data sent to BLE device: ${data}`, 'debug');
        };
        
        bleConnection.onReceive = (data) => {
            this.app.log(`Data received from BLE device: ${data}`, 'info');
        };
    }

    /**
     * Update BLE connection status UI
     * @param {string} status - The connection status
     * @param {string} text - The text to display
     */
    updateBLEStatus(status, text) {
        if (this.elements.bleStatus) {
            this.elements.bleStatus.className = `status-indicator ${status}`;
            const textElement = this.elements.bleStatus.querySelector('.status-text');
            if (textElement) textElement.textContent = text;
        }
        
        // Update connect button text
        if (this.elements.connectButton) {
            if (status === 'connected') {
                this.elements.connectButton.textContent = 'Disconnect';
                this.elements.connectButton.classList.add('connected');
            } else {
                this.elements.connectButton.textContent = 'Connect Braille Display';
                this.elements.connectButton.classList.remove('connected');
            }
        }
        
        // Update braille test button state
        if (this.elements.brailleTestBtn) {
            this.elements.brailleTestBtn.disabled = status !== 'connected';
        }
    }

    /**
     * Run a test of the braille display
     */
    async runBrailleTest() {
        if (!bleConnection.isConnected) {
            this.app.log('Cannot run test: BLE device not connected', 'error');
            return;
        }
        
        this.app.log('Starting braille display test sequence...', 'info');
        
        try {
            // First clear the display
            await bleConnection.clearDisplay();
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Show test patterns in sequence
            const testPatterns = [
                // All dots up
                [[1, 2, 3, 4, 5, 6], [1, 2, 3, 4, 5, 6], [1, 2, 3, 4, 5, 6]],
                // First row
                [[1, 4], [1, 4], [1, 4]],
                // Second row
                [[2, 5], [2, 5], [2, 5]],
                // Third row
                [[3, 6], [3, 6], [3, 6]],
                // Alternating pattern
                [[1, 3, 5], [2, 4, 6], [1, 3, 5]],
                // Count pattern (1, 2, 3)
                [[1], [1, 2], [1, 2, 3]],
                // Letter A, B, C
                [[1], [1, 2], [1, 4]]
            ];
            
            // Show each pattern with a delay
            for (const pattern of testPatterns) {
                this.app.log(`Sending test pattern: ${JSON.stringify(pattern)}`, 'debug');
                await bleConnection.sendBraillePattern(pattern);
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
            
            // Finish with a wave pattern
            await this.runWavePattern();
            
            // Finally clear the display
            await bleConnection.clearDisplay();
            
            this.app.log('Braille test sequence completed successfully', 'success');
        } catch (error) {
            this.app.log(`Error during test sequence: ${error.message}`, 'error');
        }
    }

    /**
     * Run a wave pattern animation on the braille display
     */
    async runWavePattern() {
        if (!bleConnection.isConnected) return;
        
        const patterns = [
            [[1], [0], [0]],
            [[2], [1], [0]],
            [[3], [2], [1]],
            [[4], [3], [2]],
            [[5], [4], [3]],
            [[6], [5], [4]],
            [[0], [6], [5]],
            [[0], [0], [6]]
        ];
        
        // Run through the wave pattern twice
        for (let i = 0; i < 2; i++) {
            for (const pattern of patterns) {
                await bleConnection.sendBraillePattern(pattern);
                await new Promise(resolve => setTimeout(resolve, 200));
            }
        }
    }

    /**
     * Run a speed test on the BLE connection
     */
    async runBLESpeedTest() {
        if (!bleConnection.isConnected) {
            this.app.log('Cannot run speed test: BLE device not connected', 'error');
            return;
        }
        
        this.app.log('Starting BLE speed test...', 'info');
        
        const iterations = 10;
        const testPattern = [[1, 2, 3], [1, 2, 3], [1, 2, 3]];
        
        try {
            // Clear display before starting
            await bleConnection.clearDisplay();
            
            // Start timing
            const startTime = performance.now();
            
            // Send test pattern multiple times
            for (let i = 0; i < iterations; i++) {
                this.app.log(`Speed test iteration ${i + 1}/${iterations}`, 'debug');
                await bleConnection.sendBraillePattern(testPattern);
                // Small delay to prevent overwhelming device
                await new Promise(resolve => setTimeout(resolve, 200));
            }
            
            // Calculate time taken
            const endTime = performance.now();
            const totalTime = endTime - startTime;
            const averageTime = totalTime / iterations;
            
            // Clear display after test
            await bleConnection.clearDisplay();
            
            // Log results
            this.app.log(`BLE Speed Test Results:`, 'info');
            this.app.log(`Total test time: ${totalTime.toFixed(2)}ms`, 'info');
            this.app.log(`Average command time: ${averageTime.toFixed(2)}ms`, 'info');
            this.app.log(`Speed test completed successfully`, 'success');
            
            // Create result container
            const resultContainer = document.createElement('div');
            resultContainer.className = 'speed-test-result';
            resultContainer.innerHTML = `
                <h3>BLE Speed Test Results</h3>
                <ul>
                    <li>Iterations: ${iterations}</li>
                    <li>Total time: ${totalTime.toFixed(2)}ms</li>
                    <li>Average command time: ${averageTime.toFixed(2)}ms</li>
                    <li>Connection quality: ${this.getConnectionQuality(averageTime)}</li>
                </ul>
            `;
            
            // Add to debug output
            document.getElementById('debug-output').appendChild(resultContainer);
            
        } catch (error) {
            this.app.log(`Error during speed test: ${error.message}`, 'error');
        }
    }

    /**
     * Calculate connection quality assessment based on average command time
     * @param {number} averageTime - Average time per command in ms
     * @returns {string} - Quality assessment
     */
    getConnectionQuality(averageTime) {
        if (averageTime < 300) {
            return 'Excellent';
        } else if (averageTime < 500) {
            return 'Good';
        } else if (averageTime < 800) {
            return 'Fair';
        } else {
            return 'Poor';
        }
    }
}

// Export the module
window.BLEUI = BLEUI;