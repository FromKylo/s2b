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
        
        // Sound is always enabled - no longer using the toggle
        window.soundEnabled = true;
        localStorage.setItem('soundEnabled', 'true');
        
        // Initialize permission flags
        this.micPermissionGranted = false;
        this.ttsPermissionTested = false;
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
        
        // Speak the status message for important states
        if (status === 'error' || status === 'success') {
            this.speechRecognizer.speak(message);
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
        
        // Update permission status displays
        this.checkPermissionStatuses();
        
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
            this.speechRecognizer.speak(
                "Welcome to Speech to Braille. This app converts your spoken words into braille patterns. " +
                "Please enable microphone access and test the voice output before starting.", 
                true // Priority message
            );
        }, 500);
    }
    
    /**
     * Check current permission status
     */
    checkPermissionStatuses() {
        // Check if mic permission is already granted
        navigator.permissions.query({name: 'microphone'}).then(result => {
            if (result.state === 'granted') {
                this.updateMicPermissionStatus(true);
            }
        }).catch(err => {
            // Some browsers don't support permissions API for microphone
            logDebug('Error checking microphone permission: ' + err.message);
        });
        
        // Check if TTS was previously tested
        if (localStorage.getItem('ttsTested') === 'true') {
            this.updateTTSPermissionStatus(true);
        }
        
        // Update start button status
        this.updateStartButtonStatus();
    }
    
    /**
     * Update microphone permission status
     */
    updateMicPermissionStatus(granted) {
        const micStatus = document.getElementById('mic-status');
        const enableMicBtn = document.getElementById('enable-mic-btn');
        
        this.micPermissionGranted = granted;
        
        if (granted) {
            micStatus.textContent = 'Enabled';
            micStatus.classList.add('enabled');
            enableMicBtn.textContent = 'Microphone Enabled';
            enableMicBtn.disabled = true;
        } else {
            micStatus.textContent = 'Not enabled';
            micStatus.classList.remove('enabled');
            enableMicBtn.textContent = 'Enable Microphone';
            enableMicBtn.disabled = false;
        }
        
        this.updateStartButtonStatus();
    }
    
    /**
     * Update TTS permission status
     */
    updateTTSPermissionStatus(tested) {
        const ttsStatus = document.getElementById('tts-status');
        const testTTSBtn = document.getElementById('test-tts-btn');
        
        this.ttsPermissionTested = tested;
        
        if (tested) {
            ttsStatus.textContent = 'Voice Enabled';
            ttsStatus.classList.add('enabled');
            testTTSBtn.textContent = 'Test Again';
            
            // Remember TTS was tested
            localStorage.setItem('ttsTested', 'true');
        } else {
            ttsStatus.textContent = 'Not tested';
            ttsStatus.classList.remove('enabled');
            testTTSBtn.textContent = 'Test Voice';
        }
        
        this.updateStartButtonStatus();
    }
    
    /**
     * Update start button status based on permissions
     */
    updateStartButtonStatus() {
        const startBtn = document.getElementById('start-btn');
        
        if (this.micPermissionGranted && this.ttsPermissionTested) {
            startBtn.disabled = false;
        } else {
            startBtn.disabled = true;
        }
    }
    
    /**
     * Request microphone permission
     */
    requestMicrophonePermission() {
        // Try to start audio context to gain microphone access
        logDebug('Requesting microphone permission...');
        
        navigator.mediaDevices.getUserMedia({ audio: true })
            .then(stream => {
                logDebug('Microphone permission granted');
                // Stop the tracks right away, we don't need them yet
                stream.getTracks().forEach(track => track.stop());
                
                // Update UI
                this.updateMicPermissionStatus(true);
                
                // Speak confirmation
                this.speechRecognizer.speak('Microphone access enabled. Thank you.', true);
            })
            .catch(err => {
                logDebug('Microphone permission denied: ' + err.message);
                alert('Microphone access is required for speech recognition. Please enable it and try again.');
                this.updateMicPermissionStatus(false);
            });
    }
    
    /**
     * Test TTS functionality
     */
    testTTSVoice() {
        logDebug('Testing Text-to-Speech...');
        
        // Speak a test message
        const utterance = this.speechRecognizer.speak(
            'This is a test of the text-to-speech system. Voice feedback is now enabled.',
            true
        );
        
        if (utterance) {
            // Listen for the end of speech to confirm it worked
            utterance.onend = () => {
                logDebug('TTS test completed successfully');
                this.updateTTSPermissionStatus(true);
            };
            
            // If speech doesn't end in a reasonable time, assume it worked anyway
            // (some browsers don't fire onend event reliably)
            setTimeout(() => {
                if (!this.ttsPermissionTested) {
                    logDebug('TTS test timeout - assuming success');
                    this.updateTTSPermissionStatus(true);
                }
            }, 3000);
        } else {
            // If utterance is null, TTS is not supported
            logDebug('TTS not supported in this browser');
            alert('Text-to-speech may not be fully supported in your browser. Some features may be limited.');
            // Mark as tested anyway so user can proceed
            this.updateTTSPermissionStatus(true);
        }
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
            this.speechRecognizer.speak("Testing BLE connection");
        });
        
        // Permission buttons in intro phase
        document.getElementById('enable-mic-btn').addEventListener('click', () => {
            this.requestMicrophonePermission();
        });
        
        document.getElementById('test-tts-btn').addEventListener('click', () => {
            this.testTTSVoice();
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
            this.speechRecognizer.speak("Speech recognition cleared");
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
            this.speechRecognizer.speak("Restarting the application");
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
        
        // Debug console tools - improved toggle handling
        document.getElementById('debug-toggle').addEventListener('click', () => {
            const debugConsole = document.getElementById('debug-console');
            debugConsole.classList.toggle('hidden');
            
            // Log debug console activation
            logDebug('Debug console toggled');
        });
        
        // Add debug layout test button listener
        document.getElementById('debug-test-braille').addEventListener('click', () => {
            this.testBrailleLayout();
        });
        
        // Clear debug output
        document.getElementById('clear-debug-btn').addEventListener('click', () => {
            document.getElementById('debug-output').innerHTML = '';
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
            // Speak connection success
            this.speechRecognizer.speak("Braille display connected successfully");
        } catch (error) {
            logDebug(`Failed to connect: ${error.message}`);
            alert('Failed to connect to Braille Display: ' + error.message);
            // Speak connection failure
            this.speechRecognizer.speak("Failed to connect to braille display. Please try again.");
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
        
        // Remove the "Ready to listen" announcement
        
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
        
        // Announce transition to output phase
        this.speechRecognizer.speak("Showing braille pattern", false);
        
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
            
            // Remove the "Returning to listening mode" announcement
            
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
                
                // Speak the recognized word with its language
                const langName = translation.language === 'UEB' ? 'English' : 
                                (translation.language === 'Philippine' ? 'Filipino' : translation.language);
                this.speechRecognizer.speak(`"${word}" in ${langName} braille`, true);
                
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
                    
                    // Remove the "No braille pattern found" announcement
                    
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
        this.speechRecognizer.speak("Testing braille patterns. Displaying alphabet in braille.");
    }
    
    /**
     * Test BLE data transmission
     */
    async testBleTransmission() {
        if (!this.bleConnection.isConnected()) {
            logDebug('Cannot test: Not connected to BLE device');
            alert('Please connect to the BLE device first');
            this.speechRecognizer.speak("Please connect to the BLE device first");
            return;
        }
        
        logDebug('Running BLE transmission test...');
        this.speechRecognizer.speak("Testing Bluetooth connection to braille display");
        
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
        this.speechRecognizer.speak("Testing braille dot positions");
        
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
                this.speechRecognizer.speak("Braille layout test complete");
                return;
            }
            
            document.getElementById('recognized-word').textContent = `Position ${currentTest}`;
            this.brailleCellRenderer.renderBrailleCells(JSON.stringify([[currentTest]]));
            this.speechRecognizer.speak(`Testing dot position ${currentTest}`);
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
    if (!window.soundEnabled) return;
    
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // If app hasn't been initialized yet, return without attempting TTS
    const app = window.app;
    
    if (type === 'no-match') {
        // Error sound - falling tone
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
        
        // Frequency ramp up
        oscillator.frequency.linearRampToValueAtTime(783.99, audioContext.currentTime + 0.2); // G5 note
        
        setTimeout(() => {
            oscillator.stop();
        }, 400);
    } else if (type === 'recording') {
        // Recording start sound - rising tone
        oscillator.type = 'sine';
        oscillator.frequency.value = 440; // A4 note
        gainNode.gain.value = 0.1;
        oscillator.start();
        
        // Frequency ramp up
        oscillator.frequency.linearRampToValueAtTime(587.33, audioContext.currentTime + 0.15); // D5 note
        
        setTimeout(() => {
            oscillator.stop();
        }, 300);
    } else if (type === 'output') {
        // Output sound - success chime
        oscillator.type = 'sine';
        oscillator.frequency.value = 783.99; // G5
        gainNode.gain.value = 0.1;
        oscillator.start();
        
        setTimeout(() => {
            oscillator.stop();
        }, 200);
        
        // Play a second tone after a short delay
        setTimeout(() => {
            const secondOscillator = audioContext.createOscillator();
            secondOscillator.connect(gainNode);
            secondOscillator.type = 'sine';
            secondOscillator.frequency.value = 1046.50; // C6
            
            secondOscillator.start();
            setTimeout(() => {
                secondOscillator.stop();
            }, 300);
        }, 200);
    } else if (type === 'connection') {
        // Connection sound - two ascending tones
        oscillator.type = 'sine';
        oscillator.frequency.value = 440; // A4
        gainNode.gain.value = 0.1;
        oscillator.start();
        
        setTimeout(() => {
            oscillator.stop();
        }, 100);
        
        // Play a second higher tone after a short delay
        setTimeout(() => {
            const secondOscillator = audioContext.createOscillator();
            secondOscillator.connect(gainNode);
            secondOscillator.type = 'sine';
            secondOscillator.frequency.value = 880; // A5
            
            secondOscillator.start();
            setTimeout(() => {
                secondOscillator.stop();
            }, 200);
        }, 100);
    }
}
