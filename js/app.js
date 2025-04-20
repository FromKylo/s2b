/**
 * Main Application Module
 * Coordinates all components and handles UI interactions
 */
class SpeechToBrailleApp {
    constructor() {
        this.currentPhase = 'intro'; // intro, recording, output
        this.bleConnection = window.bleConnection;
        this.speechRecognizer = window.speechRecognizer;
        this.brailleTranslator = window.brailleTranslator;
        this.brailleCellRenderer = null;
        
        // Initialize language mappings for speech recognition
        this.languageMap = {
            'UEB': 'en-US',
            'Philippine': 'fil-PH'
        };
    }
    
    /**
     * Initialize the application
     */
    async initialize() {
        // Initialize braille renderer
        const brailleCellsContainer = document.querySelector('.braille-cells-container');
        this.brailleCellRenderer = new BrailleCellRenderer(brailleCellsContainer);
        
        // Load braille database
        await this.brailleTranslator.initialize();
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Initialize debug console
        this.initializeDebugConsole();
        
        logDebug('Application initialized');
        return true;
    }
    
    /**
     * Set up event listeners for UI interactions
     */
    setupEventListeners() {
        // BLE connection
        document.getElementById('ble-connect').addEventListener('click', () => {
            this.connectBleDevice();
        });
        
        // Phase navigation
        document.getElementById('start-btn').addEventListener('click', () => {
            this.startRecording();
        });
        
        document.getElementById('stop-btn').addEventListener('click', () => {
            this.stopRecording();
            this.showOutputPhase();
        });
        
        document.getElementById('clear-btn').addEventListener('click', () => {
            this.speechRecognizer.clear();
        });
        
        document.getElementById('back-to-speak-btn').addEventListener('click', () => {
            this.showRecordingPhase();
        });
        
        document.getElementById('restart-btn').addEventListener('click', () => {
            this.showIntroPhase();
        });
        
        // Test button
        document.getElementById('test-btn').addEventListener('click', () => {
            this.testBraillePatterns();
        });
        
        // Language selection
        document.getElementById('language-select').addEventListener('change', (e) => {
            const language = e.target.value;
            this.setLanguage(language);
        });
    }
    
    /**
     * Initialize debug console
     */
    initializeDebugConsole() {
        const debugToggle = document.getElementById('debug-toggle');
        const debugConsole = document.getElementById('debug-console');
        
        debugToggle.addEventListener('click', () => {
            debugConsole.classList.toggle('hidden');
        });
        
        document.getElementById('debug-send').addEventListener('click', () => {
            const command = document.getElementById('debug-command').value;
            if (command) {
                this.sendCustomCommand(command);
                document.getElementById('debug-command').value = '';
            }
        });
        
        document.getElementById('speed-test-btn').addEventListener('click', () => {
            this.bleConnection.runSpeedTest();
        });
        
        document.getElementById('clear-debug-btn').addEventListener('click', () => {
            document.getElementById('debug-output').innerHTML = '';
        });
        
        // Allow Enter key to send debug commands
        document.getElementById('debug-command').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                document.getElementById('debug-send').click();
            }
        });
    }
    
    /**
     * Connect to BLE device
     */
    async connectBleDevice() {
        try {
            await this.bleConnection.connect();
        } catch (error) {
            logDebug(`Failed to connect: ${error.message}`);
            alert('Failed to connect to Braille Display: ' + error.message);
        }
    }
    
    /**
     * Set language for both speech and braille
     */
    setLanguage(language) {
        // Set braille language
        this.brailleTranslator.setLanguage(language);
        
        // Map braille language to speech language
        if (this.languageMap[language]) {
            this.speechRecognizer.setLanguage(this.languageMap[language]);
        }
        
        logDebug(`Language set to ${language}`);
    }
    
    /**
     * Show the intro phase
     */
    showIntroPhase() {
        this.currentPhase = 'intro';
        this.updatePhaseDisplay();
        this.speechRecognizer.stop();
    }
    
    /**
     * Show the recording phase and start listening
     */
    showRecordingPhase() {
        this.currentPhase = 'recording';
        this.updatePhaseDisplay();
        this.startRecording();
    }
    
    /**
     * Show the output phase
     */
    showOutputPhase() {
        this.currentPhase = 'output';
        this.updatePhaseDisplay();
    }
    
    /**
     * Update the UI to reflect the current phase
     */
    updatePhaseDisplay() {
        // Hide all phases
        document.querySelectorAll('.app-phase').forEach(phase => {
            phase.classList.remove('active');
        });
        
        // Show current phase
        const currentPhaseElement = document.getElementById(`${this.currentPhase}-phase`);
        if (currentPhaseElement) {
            currentPhaseElement.classList.add('active');
        }
    }
    
    /**
     * Start recording audio
     */
    startRecording() {
        this.speechRecognizer.start(
            (result) => this.handleSpeechResult(result),
            () => logDebug('Speech recognition ended')
        );
    }
    
    /**
     * Stop recording audio
     */
    stopRecording() {
        this.speechRecognizer.stop();
    }
    
    /**
     * Handle speech recognition results
     */
    handleSpeechResult(result) {
        logDebug(`Recognized: "${result}"`);
        
        // Process the recognized text
        const words = result.trim().split(/\s+/);
        if (words.length > 0) {
            const lastWord = words[words.length - 1].toLowerCase().replace(/[^\w]/g, '');
            if (lastWord) {
                const translation = this.brailleTranslator.translateWord(lastWord);
                
                if (translation) {
                    logDebug(`Translation found for "${lastWord}": ${translation.array}`);
                    
                    // Update UI with the word
                    document.getElementById('recognized-word').textContent = lastWord;
                    
                    // Render braille cells
                    this.brailleCellRenderer.renderBrailleCells(translation.array);
                    
                    // Send to BLE device if connected
                    if (this.bleConnection.isConnected()) {
                        this.bleConnection.sendBraillePattern(translation.array);
                    }
                    
                    // Switch to output phase
                    this.showOutputPhase();
                } else {
                    logDebug(`No translation found for "${lastWord}"`);
                }
            }
        }
    }
    
    /**
     * Test braille patterns with alphabet
     */
    testBraillePatterns() {
        this.showOutputPhase();
        document.getElementById('recognized-word').textContent = 'Testing Braille Patterns...';
        this.brailleCellRenderer.renderAlphabetTest();
    }
    
    /**
     * Send custom command via BLE
     */
    sendCustomCommand(command) {
        if (!this.bleConnection.isConnected()) {
            logDebug('Cannot send command: Not connected to BLE device');
            return;
        }
        
        // Convert command to appropriate format
        try {
            // Check if it's a valid JSON array
            if (command.trim().startsWith('[')) {
                // Assume it's a braille pattern array
                this.bleConnection.sendBraillePattern(command);
            } else if (command.includes(',')) {
                // Check if it's a pin control command (cell,pin,value)
                const parts = command.split(',');
                if (parts.length === 3) {
                    const cell = parseInt(parts[0].trim());
                    const pin = parseInt(parts[1].trim());
                    const value = parseInt(parts[2].trim());
                    
                    if (!isNaN(cell) && !isNaN(pin) && !isNaN(value)) {
                        this.bleConnection.sendPinControl(cell, pin, value);
                        return;
                    }
                }
                
                // Otherwise, send it as a raw command
                this.bleConnection.sendBraillePattern(command);
            } else {
                // Send as a raw string
                const encoder = new TextEncoder();
                const dataBuffer = encoder.encode(command);
                this.bleConnection.characteristic.writeValue(dataBuffer);
                logDebug(`Sent raw command: ${command}`);
            }
        } catch (error) {
            logDebug(`Error sending command: ${error.message}`);
        }
    }
}

// Initialize the app when DOM content is loaded
document.addEventListener('DOMContentLoaded', async () => {
    const app = new SpeechToBrailleApp();
    await app.initialize();
});
