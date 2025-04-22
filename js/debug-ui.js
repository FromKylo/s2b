class DebugUI {
    constructor() {
        this.debugButton = document.getElementById('toggle-debug');
        this.debugConsole = document.getElementById('debug-console');
        this.debugOutput = document.getElementById('debug-output');
        this.debugCommand = document.getElementById('debug-command');
        this.sendCommandButton = document.getElementById('send-command');
        this.speedTestButton = document.getElementById('run-speed-test');
        this.initialized = false;
    }

    init() {
        if (this.initialized) return;
        
        if (this.debugButton) {
            this.debugButton.addEventListener('click', this.toggleDebugConsole.bind(this));
        }
        
        if (this.sendCommandButton && this.debugCommand) {
            this.sendCommandButton.addEventListener('click', this.sendCommand.bind(this));
            
            // Add enter key support
            this.debugCommand.addEventListener('keypress', (event) => {
                if (event.key === 'Enter') {
                    this.sendCommand();
                }
            });
        }
        
        if (this.speedTestButton) {
            this.speedTestButton.addEventListener('click', this.runSpeedTest.bind(this));
        }
        
        // Set initial state
        this.initialized = true;
        
        // Start periodic log updates if debug is visible
        if (this.debugConsole && !this.debugConsole.classList.contains('hidden')) {
            this.startLogUpdates();
        }
    }

    toggleDebugConsole() {
        if (!this.debugConsole) return;
        
        this.debugConsole.classList.toggle('hidden');
        const isVisible = !this.debugConsole.classList.contains('hidden');
        
        // Toggle debug mode
        debugManager.toggle();
        
        if (isVisible) {
            this.startLogUpdates();
            this.updateLogDisplay();
        } else {
            this.stopLogUpdates();
        }
    }

    startLogUpdates() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        this.updateInterval = setInterval(() => this.updateLogDisplay(), 1000);
    }

    stopLogUpdates() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }

    updateLogDisplay() {
        if (!this.debugOutput) return;
        
        const entries = debugManager.getEntries();
        let html = '';
        
        entries.forEach(entry => {
            const timestamp = entry.timestamp.toLocaleTimeString();
            const typeClass = `log-${entry.type}`;
            const message = this.escapeHtml(entry.message);
            
            html += `<div class="log-entry ${typeClass}">
                <span class="log-time">${timestamp}</span>
                <span class="log-message">${message}</span>
            </div>`;
            
            if (entry.data && typeof entry.data === 'object') {
                const jsonData = this.escapeHtml(JSON.stringify(entry.data, null, 2));
                html += `<div class="log-data"><pre>${jsonData}</pre></div>`;
            }
        });
        
        this.debugOutput.innerHTML = html || '<div class="log-empty">No log entries</div>';
        
        // Scroll to bottom
        this.debugOutput.scrollTop = this.debugOutput.scrollHeight;
    }

    async sendCommand() {
        if (!this.debugCommand) return;
        
        const command = this.debugCommand.value.trim();
        if (!command) return;
        
        debugManager.log(`Executing command: ${command}`, 'info');
        
        try {
            if (bleConnection.isConnected) {
                await debugManager.executeBLECommand(command);
                this.debugCommand.value = '';
                this.updateLogDisplay();
            } else {
                debugManager.error('Cannot send command: BLE not connected');
                this.updateLogDisplay();
            }
        } catch (error) {
            debugManager.error(`Command execution failed: ${error.message}`, error);
            this.updateLogDisplay();
        }
    }

    async runSpeedTest() {
        if (!bleConnection.isConnected) {
            alert('Please connect to a braille display first');
            return;
        }
        
        debugManager.log('Running BLE speed test...');
        this.updateLogDisplay();
        
        try {
            const results = await bleConnection.runSpeedTest();
            
            debugManager.log('BLE speed test complete', 'info', {
                totalTests: results.totalTests,
                successfulTests: results.successfulTests,
                averageTime: `${results.averageTime.toFixed(2)}ms`,
                totalTime: `${results.totalTime}ms`
            });
            
            this.updateLogDisplay();
            
        } catch (error) {
            debugManager.error('Speed test failed', error);
            this.updateLogDisplay();
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Create and initialize the Debug UI
const debugUI = new DebugUI();
document.addEventListener('DOMContentLoaded', () => debugUI.init());
