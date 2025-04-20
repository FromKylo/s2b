/**
 * Speech to Braille - Main Application 
 * Controls app phases, UI updates, and integration between modules
 */

// App phases
const PHASE = {
    INTRODUCTION: 'introduction',
    RECORDING: 'recording',
    OUTPUT: 'output'
};

class SpeechToBrailleApp {
    constructor() {
        // Current application state
        this.currentPhase = PHASE.INTRODUCTION;
        this.introTimer = null;
        this.outputTimer = null;
        this.countdownValue = 8; // seconds
        
        // DOM elements
        this.elements = {
            phaseContainers: {
                [PHASE.INTRODUCTION]: document.getElementById('introduction-phase'),
                [PHASE.RECORDING]: document.getElementById('recording-phase'),
                [PHASE.OUTPUT]: document.getElementById('output-phase')
            },
            bleStatus: document.getElementById('ble-status'),
            connectButton: document.getElementById('connect-ble'),
            testButton: document.getElementById('test-braille'),
            debugToggle: document.getElementById('toggle-debug'),
            debugConsole: document.getElementById('debug-console'),
            debugOutput: document.getElementById('debug-output'),
            debugCommand: document.getElementById('debug-command'),
            sendCommand: document.getElementById('send-command'),
            runSpeedTest: document.getElementById('run-speed-test'),
            introCountdown: document.getElementById('intro-countdown'),
            outputCountdown: document.getElementById('output-countdown'),
            interimResult: document.getElementById('interim-result'),
            finalResult: document.getElementById('final-result'),
            recognizedWord: document.getElementById('recognized-word'),
            brailleDisplay: document.getElementById('braille-display'),
            audioWave: document.querySelector('.audio-wave')
        };
        
        // Audio feedback sounds
        this.sounds = {
            recordingStart: new Audio('sounds/recording-start.mp3'),
            recordingStop: new Audio('sounds/recording-stop.mp3'),
            outputSuccess: new Audio('sounds/output-success.mp3'),
            outputFailure: new Audio('sounds/output-failure.mp3')
        };
        
        // Initialize modules
        this.initializeModules();
        
        // Bind events
        this.bindEvents();
    }

    /**
     * Initialize all application modules
     */
    async initializeModules() {
        try {
            // Initialize braille translation
            const brailleInitialized = await brailleTranslation.initialize();
            this.log(`Braille translation initialized: ${brailleInitialized}`);
            
            // Initialize speech recognition
            const speechInitialized = speechRecognition.initialize();
            this.log(`Speech recognition initialized: ${speechInitialized}`);
            
            // Set up speech recognition callbacks
            this.setupSpeechRecognition();
            
            // Set up BLE callbacks
            this.setupBLECallbacks();
            
            // Start the introduction phase
            this.startIntroductionPhase();
            
            // Notify user of initialization status
            this.log('App initialization complete');
        } catch (error) {
            this.log(`Error initializing modules: ${error.message}`, 'error');
            console.error('Initialization error:', error);
        }
    }

    /**
     * Set up speech recognition callbacks
     */
    setupSpeechRecognition() {
        // Handle interim results
        speechRecognition.setOnInterimResult((result) => {
            this.elements.interimResult.textContent = result;
            this.animateAudioWave(true);
            
            // Check if we have a braille match for the interim result
            const words = result.toLowerCase().split(' ');
            const lastWord = words[words.length - 1];
            
            if (lastWord && lastWord.length > 1) {
                const pattern = brailleTranslation.translateWord(lastWord);
                if (pattern) {
                    this.log(`Found braille match for interim word: ${lastWord}`);
                    this.transitionToOutputPhase(lastWord, pattern);
                }
            }
        });
        
        // Handle final results
        speechRecognition.setOnFinalResult((result) => {
            this.elements.finalResult.textContent = result;
            
            // Check for braille matches in final result
            const words = result.toLowerCase().split(' ');
            const lastWord = words[words.length - 1];
            
            if (lastWord) {
                const pattern = brailleTranslation.translateWord(lastWord);
                if (pattern) {
                    this.log(`Found braille match for final word: ${lastWord}`);
                    this.transitionToOutputPhase(lastWord, pattern);
                }
            }
        });
        
        // Handle start/stop listening
        speechRecognition.setOnStartListening(() => {
            this.animateAudioWave(true);
            this.log('Speech recognition started');
        });
        
        speechRecognition.setOnStopListening(() => {
            this.animateAudioWave(false);
            this.log('Speech recognition stopped');
        });
    }

    /**
     * Set up Bluetooth callbacks
     */
    setupBLECallbacks() {
        bleConnection.onConnect(() => {
            this.updateBLEStatus('connected', 'Connected');
            this.log('BLE device connected');
        });
        
        bleConnection.onDisconnect(() => {
            this.updateBLEStatus('disconnected', 'Disconnected');
            this.log('BLE device disconnected');
        });
        
        bleConnection.onError((error) => {
            this.updateBLEStatus('disconnected', 'Error');
            this.log(`BLE error: ${error}`, 'error');
        });
    }

    /**
     * Bind UI event handlers
     */
    bindEvents() {
        // BLE connection button
        this.elements.connectButton.addEventListener('click', () => {
            if (bleConnection.isConnected) {
                bleConnection.disconnect();
            } else {
                this.updateBLEStatus('connecting', 'Connecting...');
                bleConnection.connect();
            }
        });
        
        // Test braille button
        this.elements.testButton.addEventListener('click', () => {
            this.runBrailleTest();
        });
        
        // Debug console toggle
        this.elements.debugToggle.addEventListener('click', () => {
            this.elements.debugConsole.classList.toggle('hidden');
        });
        
        // Send debug command
        this.elements.sendCommand.addEventListener('click', () => {
            const command = this.elements.debugCommand.value.trim();
            if (command) {
                this.sendDebugCommand(command);
                this.elements.debugCommand.value = '';
            }
        });
        
        // Debug command input enter key
        this.elements.debugCommand.addEventListener('keyup', (event) => {
            if (event.key === 'Enter') {
                const command = this.elements.debugCommand.value.trim();
                if (command) {
                    this.sendDebugCommand(command);
                    this.elements.debugCommand.value = '';
                }
            }
        });
        
        // Run BLE speed test
        this.elements.runSpeedTest.addEventListener('click', () => {
            this.runBLESpeedTest();
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (event) => {
            // F12 to toggle debug console
            if (event.key === 'F12') {
                event.preventDefault();
                this.elements.debugConsole.classList.toggle('hidden');
            }
            
            // Spacebar to connect/disconnect BLE (when not typing)
            if (event.code === 'Space' && document.activeElement.tagName !== 'INPUT') {
                event.preventDefault();
                if (bleConnection.isConnected) {
                    bleConnection.disconnect();
                } else {
                    bleConnection.connect();
                }
            }
        });
    }

    /**
     * Start the introduction phase
     */
    startIntroductionPhase() {
        this.switchPhase(PHASE.INTRODUCTION);
        
        // Reset countdown
        this.countdownValue = 8;
        this.elements.introCountdown.textContent = this.countdownValue;
        
        // Welcome message
        speechRecognition.speak('Welcome to Speech to Braille', {
            rate: 1.1
        });
        
        // Start countdown
        this.introTimer = setInterval(() => {
            this.countdownValue--;
            this.elements.introCountdown.textContent = this.countdownValue;
            
            if (this.countdownValue <= 0) {
                clearInterval(this.introTimer);
                this.transitionToRecordingPhase();
            }
        }, 1000);
    }

    /**
     * Transition to recording phase
     */
    transitionToRecordingPhase() {
        // Clear any existing timers
        if (this.introTimer) clearInterval(this.introTimer);
        if (this.outputTimer) clearInterval(this.outputTimer);
        
        // Switch to recording phase
        this.switchPhase(PHASE.RECORDING);
        
        // Play recording start sound
        this.sounds.recordingStart.play().catch(e => console.log('Error playing sound:', e));
        
        // Clear previous results
        this.elements.interimResult.textContent = '';
        this.elements.finalResult.textContent = '';
        
        // Start listening
        speechRecognition.startListening();
        
        // Animate audio wave
        this.animateAudioWave(true);
        
        // Speak prompt
        setTimeout(() => {
            speechRecognition.speak('I\'m listening', { rate: 1.2 });
        }, 500);
    }

    /**
     * Transition to output phase
     * @param {string} word - The recognized word
     * @param {Array} pattern - The braille pattern
     */
    transitionToOutputPhase(word, pattern) {
        // Clear any existing timers
        if (this.introTimer) clearInterval(this.introTimer);
        if (this.outputTimer) clearInterval(this.outputTimer);
        
        // Stop speech recognition temporarily
        speechRecognition.stopListening();
        
        // Play output sound
        if (pattern) {
            this.sounds.outputSuccess.play().catch(e => console.log('Error playing sound:', e));
        } else {
            this.sounds.outputFailure.play().catch(e => console.log('Error playing sound:', e));
        }
        
        // Switch to output phase
        this.switchPhase(PHASE.OUTPUT);
        
        // Display word and pattern
        this.elements.recognizedWord.textContent = word;
        
        // Render braille cells
        brailleTranslation.renderBrailleCells(pattern, this.elements.brailleDisplay);
        
        // Send to BLE device if connected
        if (bleConnection.isConnected) {
            bleConnection.sendBraillePattern(pattern);
        }
        
        // Speak the word
        speechRecognition.speak(word, { rate: 1.0 });
        
        // Reset countdown
        this.countdownValue = 8;
        this.elements.outputCountdown.textContent = this.countdownValue;
        
        // Start countdown
        this.outputTimer = setInterval(() => {
            this.countdownValue--;
            this.elements.outputCountdown.textContent = this.countdownValue;
            
            if (this.countdownValue <= 0) {
                clearInterval(this.outputTimer);
                
                // Clear BLE display if connected
                if (bleConnection.isConnected) {
                    bleConnection.clearDisplay();
                }
                
                this.transitionToRecordingPhase();
            }
        }, 1000);
    }

    /**
     * Switch to a different phase
     * @param {string} phase - The phase to switch to
     */
    switchPhase(phase) {
        // Remove active class from all phases
        Object.values(this.elements.phaseContainers).forEach(container => {
            container.classList.remove('active');
        });
        
        // Add active class to target phase
        this.elements.phaseContainers[phase].classList.add('active');
        
        // Update current phase
        this.currentPhase = phase;
        
        this.log(`Phase changed to: ${phase}`);
    }

    /**
     * Animate the audio wave visualization
     * @param {boolean} active - Whether to animate or not
     */
    animateAudioWave(active) {
        if (active) {
            this.elements.audioWave.classList.add('listening');
        } else {
            this.elements.audioWave.classList.remove('listening');
        }
    }

    /**
     * Update the BLE status indicator
     * @param {string} status - Status class (connected, disconnected, connecting)
     * @param {string} text - Status text to display
     */
    updateBLEStatus(status, text) {
        this.elements.bleStatus.className = `status-indicator ${status}`;
        this.elements.bleStatus.querySelector('.status-text').textContent = text;
        
        // Update connect button text
        if (status === 'connected') {
            this.elements.connectButton.textContent = 'Disconnect';
        } else {
            this.elements.connectButton.textContent = 'Connect Braille Display';
        }
    }

    /**
     * Run a braille test sequence
     */
    async runBrailleTest() {
        this.log('Starting braille test sequence');
        
        // Switch to output phase for the test
        this.switchPhase(PHASE.OUTPUT);
        
        // Run the test
        await brailleTranslation.runBrailleTest(
            this.elements.brailleDisplay,
            bleConnection.isConnected ? pattern => bleConnection.sendBraillePattern(pattern) : null
        );
        
        this.log('Braille test sequence completed');
        
        // Return to recording phase
        this.transitionToRecordingPhase();
    }

    /**
     * Send a debug command to the BLE device
     * @param {string} command - The command to send
     */
    async sendDebugCommand(command) {
        this.log(`Sending debug command: ${command}`);
        
        if (!bleConnection.isConnected) {
            this.log('Cannot send command: not connected to BLE device', 'error');
            return;
        }
        
        const success = await bleConnection.sendData(command);
        
        if (success) {
            this.log('Command sent successfully');
        } else {
            this.log('Failed to send command', 'error');
        }
    }

    /**
     * Run a BLE speed test
     */
    async runBLESpeedTest() {
        if (!bleConnection.isConnected) {
            this.log('Cannot run speed test: not connected to BLE device', 'error');
            return;
        }
        
        this.log('Starting BLE speed test...');
        
        const results = await bleConnection.runSpeedTest();
        
        if (results) {
            this.log(`Speed test results: ${results.packetsSuccess}/${results.packetsTotal} packets, ` + 
                     `${results.bytesTransferred} bytes, ${results.speedBps.toFixed(2)} bytes/sec`);
        } else {
            this.log('Speed test failed', 'error');
        }
    }

    /**
     * Add a log message to the debug console
     * @param {string} message - The message to log
     * @param {string} type - Log type (info, error, warning)
     */
    log(message, type = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        const logElement = document.createElement('div');
        logElement.className = `log-entry ${type}`;
        logElement.innerHTML = `<span class="timestamp">[${timestamp}]</span> ${message}`;
        
        this.elements.debugOutput.appendChild(logElement);
        this.elements.debugOutput.scrollTop = this.elements.debugOutput.scrollHeight;
        
        console.log(`[${type}] ${message}`);
    }
}

// Initialize the app when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new SpeechToBrailleApp();
});
