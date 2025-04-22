class DebugManager {
    constructor() {
        this.isDebugEnabled = false;
        this.logEntries = [];
        this.maxLogEntries = 100;
    }

    enable() {
        this.isDebugEnabled = true;
        console.log('Debug mode enabled');
    }

    disable() {
        this.isDebugEnabled = false;
        console.log('Debug mode disabled');
    }

    toggle() {
        this.isDebugEnabled = !this.isDebugEnabled;
        console.log(`Debug mode ${this.isDebugEnabled ? 'enabled' : 'disabled'}`);
        return this.isDebugEnabled;
    }

    log(message, type = 'info', data = null) {
        const entry = {
            timestamp: new Date(),
            message: message,
            type: type,
            data: data
        };
        
        this.logEntries.unshift(entry);
        
        // Trim log if it gets too long
        if (this.logEntries.length > this.maxLogEntries) {
            this.logEntries = this.logEntries.slice(0, this.maxLogEntries);
        }
        
        // Only output to console if debug is enabled
        if (this.isDebugEnabled) {
            const formattedMessage = `[${entry.timestamp.toISOString()}] ${message}`;
            
            switch (type) {
                case 'error':
                    console.error(formattedMessage, data || '');
                    break;
                case 'warn':
                    console.warn(formattedMessage, data || '');
                    break;
                default:
                    console.log(formattedMessage, data || '');
            }
        }
        
        return entry;
    }

    error(message, data = null) {
        return this.log(message, 'error', data);
    }

    warn(message, data = null) {
        return this.log(message, 'warn', data);
    }

    info(message, data = null) {
        return this.log(message, 'info', data);
    }

    clear() {
        this.logEntries = [];
        console.clear();
        return true;
    }

    getEntries(count = null) {
        if (count === null) {
            return [...this.logEntries];
        }
        return this.logEntries.slice(0, count);
    }

    async executeBLECommand(command) {
        if (!bleConnection.isConnected) {
            return this.error('BLE not connected, cannot execute command');
        }
        
        try {
            const encoder = new TextEncoder();
            const data = encoder.encode(command);
            await bleConnection.characteristic.writeValue(data);
            return this.log(`BLE command sent: ${command}`, 'info', { command });
        } catch (error) {
            return this.error(`BLE command failed: ${command}`, error);
        }
    }
}

// Create and export a singleton instance
const debugManager = new DebugManager();
