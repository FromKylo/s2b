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
        
        // Initialize timers
        this.introTimer = null;
        this.outputTimer = null;
        this.introTimerDuration = 8; // seconds
        this.outputTimerDuration = 8; // seconds
        
        // Initialize language mappings for speech recognition
        this.languageMap = {
            'UEB': 'en-US',
            'Philippine': 'fil-PH'
        };
        
        // Initialize sound preference
        window.soundEnabled = localStorage.getItem('soundEnabled') !== 'false';
    }
    
    /**
     * Initialize the application
     */
    async initialize() {
        // Initialize braille renderer
        const brailleCellsContainer = document.querySelector('.braille-cells-container');
        this.brailleCellRenderer = new BrailleCellRenderer(brailleCellsContainer);
        
        // Show database loading status
        this.showDatabaseStatus('Loading braille database...', 'loading');
        
        // Load braille database with explicit feedback
        logDebug('Starting braille database initialization...');
        const dbInitialized = await this.brailleTranslator.initialize();
        
        // Update database status based on initialization result
        if (dbInitialized) {
            if (this.brailleTranslator.totalEntries > 50) {
                this.showDatabaseStatus('Database loaded successfully', 'success', true);
                logDebug(`Braille database loaded with ${this.brailleTranslator.totalEntries} entries`);
            } else {
                this.showDatabaseStatus('Limited database loaded. Some words may not translate correctly.', 'warning');
                logDebug(`Limited braille database loaded with only ${this.brailleTranslator.totalEntries} entries`);
            }
        } else {
            this.showDatabaseStatus('Failed to load database. Try refreshing the page.', 'error');
            logDebug('ERROR: Failed to initialize braille database');
            document.getElementById('debug-console').classList.remove('hidden');
            // Create a basic fallback database
            this.createFallbackDatabase();
        }
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Initialize debug console
        this.initializeDebugConsole();
        
        // Start intro phase with countdown
        this.startIntroPhaseWithCountdown();
        
        logDebug('Application initialized');
        return true;
    }
    
    /**
     * Show database status message
     */
    showDatabaseStatus(message, status = 'info', autoHide = false) {
        const statusElement = document.getElementById('database-status');
        if (!statusElement) return;
        
        statusElement.classList.remove('hidden', 'success', 'error', 'warning', 'loading');
        statusElement.classList.add(status);
        
        const statusText = statusElement.querySelector('.status-text');
        if (statusText) {
            statusText.textContent = message;
        }
        
        // For success messages, auto-hide after 5 seconds
        if (autoHide) {
            setTimeout(() => {
                statusElement.classList.add('hidden');
            }, 5000);
        }
    }
    
    /**
     * Create a basic fallback database with just alphabet
     * This will allow the app to function if CSV loading fails
     */
    createFallbackDatabase() {
        logDebug('Creating basic fallback database');
        
        // Basic alphabet a-z
        const alphabet = 'abcdefghijklmnopqrstuvwxyz'.split('');
        
        // Set up minimal database structure
        this.brailleTranslator.database = {
            'UEB': {}
        };
        
        // Standard braille patterns for alphabet
        const patterns = [
            [[1]], [[1,2]], [[1,4]], [[1,4,5]], [[1,5]],
            [[1,2,4]], [[1,2,4,5]], [[1,2,5]], [[2,4]], [[2,4,5]],
            [[1,3]], [[1,2,3]], [[1,3,4]], [[1,3,4,5]], [[1,3,5]],
            [[1,2,3,4]], [[1,2,3,4,5]], [[1,2,3,5]], [[2,3,4]], [[2,3,4,5]],
            [[1,3,6]], [[1,2,3,6]], [[2,4,5,6]], [[1,3,4,6]], [[1,3,4,5,6]], [[1,3,5,6]]
        ];
        
        // Create entries
        for (let i = 0; i < alphabet.length; i++) {
            const letter = alphabet[i];
            const pattern = patterns[i] || [[1]]; // Default to 'a' if pattern missing
            
            this.brailleTranslator.database.UEB[letter] = {
                braille: '', // No Unicode braille character
                array: JSON.stringify([pattern]) // Ensure proper nesting
            };
        }
        
        this.brailleTranslator.isLoaded = true;
        this.brailleTranslator.totalEntries = alphabet.length;
        
        logDebug(`Created fallback database with ${alphabet.length} entries`);
    }
    
    /**
     * Start intro phase with countdown timer
     */
    startIntroPhaseWithCountdown() {
        this.showIntroPhase();
        
        // Create countdown elements if they don't exist
        if (!document.getElementById('intro-countdown-container')) {
            const countdownContainer = document.createElement('div');
            countdownContainer.id = 'intro-countdown-container';
            countdownContainer.className = 'countdown-container';
            
            const countdownValue = document.createElement('span');
            countdownValue.id = 'intro-countdown-value';
            countdownValue.className = 'countdown-value';
            countdownValue.textContent = this.introTimerDuration;
            
            const countdownLabel = document.createElement('span');
            countdownLabel.className = 'countdown-label';
            countdownLabel.textContent = ' seconds remaining';
            
            countdownContainer.appendChild(countdownValue);
            countdownContainer.appendChild(countdownLabel);
            
            // Add to intro phase
            const introPhase = document.getElementById('intro-phase');
            const container = introPhase.querySelector('.container');
            container.appendChild(countdownContainer);
        }
        
        // Reset countdown value
        const countdownValue = document.getElementById('intro-countdown-value');
        let secondsRemaining = this.introTimerDuration;
        countdownValue.textContent = secondsRemaining;
        
        // Clear existing timer if any
        if (this.introTimer) {
            clearInterval(this.introTimer);
        }
        
        // Start countdown
        this.introTimer = setInterval(() => {
            secondsRemaining--;
            countdownValue.textContent = secondsRemaining;
            
            if (secondsRemaining <= 0) {
                clearInterval(this.introTimer);
                this.showRecordingPhase();
            }
        }, 1000);
        
        // Read welcome message using TTS
        setTimeout(() => {
            this.speechRecognizer.speak("Welcome to Speech to Braille. Start speaking when recording begins.");
        }, 500);
    }
    
    /**
     * Set up event listeners for UI interactions
     */
    setupEventListeners() {
        // BLE connection
        document.getElementById('ble-connect').addEventListener('click', () => {
            this.connectBleDevice();
        });
        
        // Add BLE test button handler
        document.getElementById('ble-test').addEventListener('click', () => {
            this.testBleTransmission();
        });
        
        // Phase navigation
        document.getElementById('start-btn').addEventListener('click', () => {
            // Skip the countdown and go directly to recording
            if (this.introTimer) {
                clearInterval(this.introTimer);
            }
            this.showRecordingPhase();
        });
        
        document.getElementById('stop-btn').addEventListener('click', () => {
            this.stopRecording();
            this.showOutputPhase();
        });
        
        document.getElementById('clear-btn').addEventListener('click', () => {
            this.speechRecognizer.clear();
            // Return to recording phase if we were in output phase
            if (this.currentPhase === 'output') {
                this.showRecordingPhase();
            }
        });
        
        document.getElementById('back-to-speak-btn').addEventListener('click', () => {
            // If output timer is running, clear it
            if (this.outputTimer) {
                clearInterval(this.outputTimer);
                this.outputTimer = null;
            }
            this.showRecordingPhase();
        });
        
        document.getElementById('restart-btn').addEventListener('click', () => {
            // If output timer is running, clear it
            if (this.outputTimer) {
                clearInterval(this.outputTimer);
                this.outputTimer = null;
            }
            this.startIntroPhaseWithCountdown();
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
        
        // Add retry database button
        const retryDatabaseBtn = document.getElementById('retry-database');
        if (retryDatabaseBtn) {
            retryDatabaseBtn.addEventListener('click', async () => {
                this.showDatabaseStatus('Retrying database load...', 'loading');
                const success = await this.brailleTranslator.initialize();
                if (success) {
                    this.showDatabaseStatus('Database loaded successfully', 'success', true);
                } else {
                    this.showDatabaseStatus('Failed to load database', 'error');
                }
            });
        }
        
        // Sound toggle
        const soundToggle = document.getElementById('sound-toggle');
        if (soundToggle) {
            // Set initial state based on preference
            soundToggle.checked = window.soundEnabled;
            
            soundToggle.addEventListener('change', (e) => {
                window.soundEnabled = e.target.checked;
                localStorage.setItem('soundEnabled', window.soundEnabled);
                logDebug(`Sound ${window.soundEnabled ? 'enabled' : 'disabled'}`);
                
                // Play a test sound if enabled
                if (window.soundEnabled) {
                    playAudioCue('intro');
                }
            });
        }
        
        // Debug console tools
        document.getElementById('debug-toggle').addEventListener('click', () => {
            this.toggleDebugConsole();
        });
        
        // Add debug layout test button listener
        document.getElementById('debug-test-braille').addEventListener('click', () => {
            this.testBrailleLayout();
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
            playAudioCue('connection');
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
        playAudioCue('intro');
        logDebug('Switched to intro phase');
    }
    
    /**
     * Show the recording phase and start listening
     */
    showRecordingPhase() {
        this.currentPhase = 'recording';
        this.updatePhaseDisplay();
        playAudioCue('recording');
        this.startRecording();
        logDebug('Switched to recording phase');
        
        // Clear any existing output timer
        if (this.outputTimer) {
            clearInterval(this.outputTimer);
            this.outputTimer = null;
        }
    }
    
    /**
     * Show the output phase
     */
    showOutputPhase() {
        this.currentPhase = 'output';
        this.updatePhaseDisplay();
        playAudioCue('output');
        
        // Add output countdown timer
        this.startOutputCountdown();
        
        logDebug('Switched to output phase');
    }
    
    /**
     * Start output phase countdown
     */
    startOutputCountdown() {
        // Create countdown elements if they don't exist
        if (!document.getElementById('output-countdown-container')) {
            const countdownContainer = document.createElement('div');
            countdownContainer.id = 'output-countdown-container';
            countdownContainer.className = 'countdown-container';
            
            const countdownValue = document.createElement('span');
            countdownValue.id = 'output-countdown-value';
            countdownValue.className = 'countdown-value';
            countdownValue.textContent = this.outputTimerDuration;
            
            const countdownLabel = document.createElement('span');
            countdownLabel.className = 'countdown-label';
            countdownLabel.textContent = ' seconds remaining';
            
            countdownContainer.appendChild(countdownValue);
            countdownContainer.appendChild(countdownLabel);
            
            // Add to output phase
            const outputPhase = document.getElementById('output-phase');
            const container = outputPhase.querySelector('.container');
            container.appendChild(countdownContainer);
        }
        
        // Reset countdown value
        const countdownValue = document.getElementById('output-countdown-value');
        let secondsRemaining = this.outputTimerDuration;
        countdownValue.textContent = secondsRemaining;
        
        // Clear existing timer if any
        if (this.outputTimer) {
            clearInterval(this.outputTimer);
        }
        
        // Start countdown
        this.outputTimer = setInterval(() => {
            secondsRemaining--;
            countdownValue.textContent = secondsRemaining;
            
            if (secondsRemaining <= 0) {
                clearInterval(this.outputTimer);
                this.showRecordingPhase();
            }
        }, 1000);
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
            (word) => this.handleSpeechResult(word), // This now receives single words
            () => {
                logDebug('Speech recognition ended');
                // Automatically restart if still in recording phase
                if (this.currentPhase === 'recording') {
                    setTimeout(() => this.startRecording(), 500);
                }
            }
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
        // Single word processing - result is now just the last word from speech recognizer
        const word = result.trim().toLowerCase().replace(/[^\w]/g, '');
        
        if (word && word.length > 0) {
            logDebug(`Processing word: "${word}"`);
            
            const translation = this.brailleTranslator.translateWord(word);
            const wordDisplay = document.getElementById('recognized-word');
            
            if (translation) {
                logDebug(`Translation found for "${word}": ${JSON.stringify(translation.array)}`);
                
                // Update UI with the word
                wordDisplay.textContent = word;
                wordDisplay.classList.remove('no-match');
                
                // Render braille cells
                this.brailleCellRenderer.renderBrailleCells(JSON.stringify(translation.array));
                
                // Speak the matched word
                this.speechRecognizer.speak(word);
                
                // Send to BLE device if connected
                if (this.bleConnection.isConnected()) {
                    this.bleConnection.sendBraillePattern(JSON.stringify(translation.array));
                }
                
                // Switch to output phase
                this.showOutputPhase();
            } else {
                // Only show no-match for words longer than 2 characters
                if (word.length > 2) {
                    logDebug(`No translation found for "${word}"`);
                    playAudioCue('no-match');
                    
                    // Show no-match message with styling
                    wordDisplay.textContent = `"${word}" - No braille pattern found`;
                    wordDisplay.classList.add('no-match');
                    this.brailleCellRenderer.clear();
                    
                    // Switch to output phase to show the no-match state
                    this.showOutputPhase();
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
     * Test BLE data transmission
     */
    async testBleTransmission() {
        if (!this.bleConnection.isConnected()) {
            logDebug('Cannot test: Not connected to BLE device');
            alert('Please connect to the BLE device first');
            return;
        }
        
        logDebug('Running BLE transmission test...');
        
        // Test a simple dot pattern (dots 1,3,5)
        const testPattern = "[[1,3,5]]";
        document.getElementById('recognized-word').textContent = "Test Pattern";
        
        // Show the output in our UI
        this.showOutputPhase();
        this.brailleCellRenderer.renderBrailleCells(testPattern);
        
        // First try using the normal channel
        logDebug('Sending test pattern via normal channel...');
        const result = await this.bleConnection.sendBraillePattern(testPattern);
        
        if (result) {
            logDebug('Test pattern sent successfully');
        } else {
            logDebug('Failed to send via normal channel, trying direct test...');
            // Try the dedicated test function with alternate methods
            await this.bleConnection.sendTestPattern();
        }
        
        // Also add this to debug console for visibility
        document.getElementById('debug-output').innerHTML += 
            '<span style="color:#4CAF50">BLE test executed - check serial monitor on ESP32</span>\n';
    }
    
    /**
     * Test braille layout by displaying positions
     */
    testBrailleLayout() {
        logDebug('Testing braille layout...');
        document.getElementById('recognized-word').textContent = "Position Test";
        
        this.showOutputPhase();
        
        // Show dots in sequence
        const positions = [];
        let currentTest = 1;
        
        // First show all dots
        for (let i = 1; i <= 6; i++) {
            positions.push(i);
        }
        this.brailleCellRenderer.renderBrailleCells(JSON.stringify([positions]));
        
        // Then show dots one by one
        const testInterval = setInterval(() => {
            if (currentTest > 6) {
                clearInterval(testInterval);
                // Show all dots again at the end
                this.brailleCellRenderer.renderBrailleCells(JSON.stringify([[1,2,3,4,5,6]]));
                return;
            }
            
            document.getElementById('recognized-word').textContent = `Position ${currentTest}`;
            this.brailleCellRenderer.renderBrailleCells(JSON.stringify([[currentTest]]));
            currentTest++;
        }, 1000);
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

/**
 * Play audio cue for different phases
 */
function playAudioCue(type) {
    // Check if sounds are enabled
    if (!window.soundEnabled) {
        return;
    }
    
    // Check if audio is supported
    if (!window.AudioContext && !window.webkitAudioContext) {
        logDebug('Web Audio API not supported in this browser');
        return;
    }
    
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    if (type === 'recording') {
        oscillator.type = 'sine';
        oscillator.frequency.value = 440; // A4 note
        gainNode.gain.value = 0.1;
        oscillator.start();
        setTimeout(() => {
            oscillator.stop();
        }, 200);
    } else if (type === 'no-match') {
        oscillator.type = 'triangle';
        oscillator.frequency.value = 220; // A3 note
        gainNode.gain.value = 0.1;
        oscillator.start();
        setTimeout(() => {
            oscillator.stop();
        }, 200);
        
        // Play a second tone after a short delay for a distinctive "no match" sound
        setTimeout(() => {
            const secondOscillator = audioContext.createOscillator();
            secondOscillator.connect(gainNode);
            secondOscillator.type = 'sawtooth';
            secondOscillator.frequency.value = 220; // A3 note
            
            secondOscillator.start();
            setTimeout(() => {
                secondOscillator.stop();
            }, 200);
        }, 250);
    } else if (type === 'intro') {
        // Pleasant startup sound
        oscillator.type = 'sine';
        oscillator.frequency.value = 523.25; // C5 note
        gainNode.gain.value = 0.1;
        oscillator.start();
        
        // Gradually change frequency for a welcoming effect
        oscillator.frequency.linearRampToValueAtTime(783.99, audioContext.currentTime + 0.3); // G5
        setTimeout(() => {
            oscillator.stop();
        }, 400);
    } else if (type === 'connection') {
        // Successful connection sound
        oscillator.type = 'sine';
        oscillator.frequency.value = 587.33; // D5
        gainNode.gain.value = 0.1;
        
        oscillator.start();
        setTimeout(() => {
            oscillator.stop();
            
            // Play a second higher tone
            const secondOscillator = audioContext.createOscillator();
            secondOscillator.connect(gainNode);
            secondOscillator.type = 'sine';
            secondOscillator.frequency.value = 880; // A5
            
            secondOscillator.start();
            setTimeout(() => {
                secondOscillator.stop();
            }, 200);
        }, 150);
    }
}
