/**
 * Speech to Braille Application
 * Main application controller that coordinates modules and manages application flow
 */

class SpeechToBrailleApp {
    constructor() {
        // Application phases
        this.PHASE_INTRO = 'intro';
        this.PHASE_RECORDING = 'recording';
        this.PHASE_OUTPUT = 'output';
        
        // Phase timing (in milliseconds)
        this.INTRO_DURATION = 10000;  // 10 seconds
        this.OUTPUT_DURATION = 8000;  // 8 seconds
        
        // Current application state
        this.currentPhase = this.PHASE_INTRO;
        this.currentTranscript = '';
        
        // Timers
        this.introTimer = null;
        this.outputTimer = null;
        
        // Mobile detection
        this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        // Audio cues (to be loaded later)
        this.audioCues = {
            recording: null,
            output: null,
            noMatch: null
        };
        
        // Debug mode
        this.debugMode = false;
        
        // Initialize when the DOM is loaded
        document.addEventListener('DOMContentLoaded', () => this.init());
    }
    
    /**
     * Initialize the application
     */
    init() {
        this.log('Initializing Speech to Braille Application');
        
        // Get DOM elements
        this.initDomElements();
        
        // Setup debug console
        this.setupDebugConsole();
        
        // Setup BLE connection handling
        this.setupBLEConnection();
        
        // Setup speech recognition callbacks
        this.setupSpeechRecognition();
        
        // Setup UI event listeners
        this.setupEventListeners();
        
        // Setup audio visualization
        this.setupAudioVisualization();
        
        // Enable debug mode for components
        this.enableDebugLogging();
        
        // Create mobile-specific UI if needed
        this.setupMobileUI();
        
        // Check microphone permission
        this.checkMicrophonePermission();
        
        // Start the intro phase
        this.startIntroPhase();
        
        this.log('Application initialized');
    }
    
    /**
     * Initialize DOM element references
     */
    initDomElements() {
        // Phase containers
        this.introPhase = document.getElementById('intro-phase');
        this.recordingPhase = document.getElementById('recording-phase');
        this.outputPhase = document.getElementById('output-phase');
        
        // Countdown elements
        this.introCountdown = document.getElementById('intro-countdown');
        this.outputCountdown = document.getElementById('output-countdown');
        
        // Text and output areas
        this.recognizedText = document.getElementById('recognized-text');
        this.brailleOutput = document.getElementById('braille-output');
        
        // Audio wave visualization
        this.audioWave = document.getElementById('audio-wave');
        this.audioBars = this.audioWave ? Array.from(this.audioWave.querySelectorAll('.bar')) : [];
        
        // Status displays
        this.phaseStatus = document.getElementById('phase-status');
        this.bleStatus = document.getElementById('ble-status');
        
        // Button elements
        this.skipIntroBtn = document.getElementById('skip-intro-btn');
        this.manualOutputBtn = document.getElementById('manual-output-btn');
        this.returnToRecordingBtn = document.getElementById('return-to-recording-btn');
        this.bleConnectBtn = document.getElementById('ble-connect-btn');
        this.bleTestBtn = document.getElementById('ble-test-btn');
        this.debugToggleBtn = document.getElementById('debug-toggle-btn');
        
        // Mobile press-to-talk
        this.pressToTalkContainer = document.getElementById('press-to-talk-container');
        this.pressToTalk = document.getElementById('press-to-talk');
        
        // Debug console
        this.debugConsole = document.getElementById('debug-console');
        this.debugOutput = document.getElementById('debug-output');
        this.debugInput = document.getElementById('debug-input');
        this.debugRunBtn = document.getElementById('debug-run-btn');
        this.debugCloseBtn = document.getElementById('debug-close-btn');
        
        // Debug buttons
        this.clearCacheBtn = document.getElementById('clear-cache-btn');
        this.testAlphabetBtn = document.getElementById('test-alphabet-btn');
        this.testNumbersBtn = document.getElementById('test-numbers-btn');
        this.speedTestBtn = document.getElementById('speed-test-btn');
    }
    
    /**
     * Setup debug console functionality
     */
    setupDebugConsole() {
        // Debug console show/hide
        this.debugToggleBtn.addEventListener('click', () => this.toggleDebugConsole());
        this.debugCloseBtn.addEventListener('click', () => this.hideDebugConsole());
        
        // Command execution
        this.debugRunBtn.addEventListener('click', () => this.executeDebugCommand());
        this.debugInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                this.executeDebugCommand();
            }
        });
        
        // Debug buttons
        this.clearCacheBtn.addEventListener('click', () => this.clearDatabaseCache());
        this.testAlphabetBtn.addEventListener('click', () => this.testAlphabet());
        this.testNumbersBtn.addEventListener('click', () => this.testNumbers());
        this.speedTestBtn.addEventListener('click', () => this.runSpeedTest());
        
        // Add debug logging to browser console too
        window.debugLog = (message) => this.log(message);
    }
    
    /**
     * Setup BLE connection handling
     */
    setupBLEConnection() {
        // Use the global BLE connection instance
        this.bleConnection = window.bleConnection;
        
        // Set connection callback
        this.bleConnection.setConnectionCallback((isConnected) => {
            this.updateBleStatus(isConnected);
        });
        
        // Check if BLE is supported
        if (!this.bleConnection.isWebBluetoothSupported()) {
            this.bleConnectBtn.disabled = true;
            this.bleConnectBtn.textContent = 'BLE Not Supported';
            this.updateBleStatus(false, 'Not Supported');
        }
        
        // Connect button
        this.bleConnectBtn.addEventListener('click', async () => {
            if (this.bleConnection.isConnectedToBLE()) {
                // Disconnect if already connected
                this.bleConnectBtn.disabled = true;
                this.bleConnectBtn.textContent = 'Disconnecting...';
                
                await this.bleConnection.disconnect();
                
                this.bleConnectBtn.disabled = false;
                this.bleConnectBtn.textContent = 'Connect Braille Display';
            } else {
                // Connect if not connected
                this.bleConnectBtn.disabled = true;
                this.bleConnectBtn.textContent = 'Connecting...';
                
                const success = await this.bleConnection.connect();
                
                this.bleConnectBtn.disabled = false;
                if (success) {
                    this.bleConnectBtn.textContent = 'Disconnect';
                } else {
                    this.bleConnectBtn.textContent = 'Connect Braille Display';
                }
            }
        });
        
        // Test button
        this.bleTestBtn.addEventListener('click', () => {
            if (this.bleConnection.isConnectedToBLE()) {
                this.testAlphabet();
            } else {
                this.showMessage('Please connect to a Braille Display first');
            }
        });
    }
    
    /**
     * Setup speech recognition callbacks
     */
    setupSpeechRecognition() {
        // Use the global speech recognizer instance
        this.speechRecognizer = window.speechRecognizer;
        
        // Set callbacks
        this.speechRecognizer.setCallbacks({
            onStartListening: () => this.handleSpeechStart(),
            onStopListening: () => this.handleSpeechStop(),
            onWordDetected: (word, isFinal) => this.handleWordDetected(word, isFinal),
            onFinalResult: (text) => this.handleFinalResult(text),
            onInterimResult: (text) => this.handleInterimResult(text),
            onError: (error) => this.handleSpeechError(error),
            onVolumeChange: (volume) => this.updateAudioVisualization(volume),
            onPermissionChange: (granted) => this.handlePermissionChange(granted)
        });
        
        // Use the global braille translator instance
        this.brailleTranslator = window.brailleTranslator;
    }
    
    /**
     * Setup UI event listeners
     */
    setupEventListeners() {
        // Skip intro button
        this.skipIntroBtn.addEventListener('click', () => {
            this.skipIntroduction();
        });
        
        // Manual output button
        this.manualOutputBtn.addEventListener('click', () => {
            this.startOutputPhase();
        });
        
        // Return to recording button
        this.returnToRecordingBtn.addEventListener('click', () => {
            this.startRecordingPhase();
        });
        
        // Press to talk (for mobile)
        if (this.pressToTalk) {
            this.pressToTalk.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.handlePressTalkStart();
            });
            
            this.pressToTalk.addEventListener('touchend', (e) => {
                e.preventDefault();
                this.handlePressTalkEnd();
            });
            
            this.pressToTalk.addEventListener('mousedown', () => {
                this.handlePressTalkStart();
            });
            
            this.pressToTalk.addEventListener('mouseup', () => {
                this.handlePressTalkEnd();
            });
        }
        
        // Handle keyboard shortcuts
        document.addEventListener('keydown', (event) => {
            // F12 or D key for debug console
            if (event.key === 'F12' || (event.ctrlKey && event.key === 'd')) {
                this.toggleDebugConsole();
                event.preventDefault();
            }
        });
    }
    
    /**
     * Setup audio wave visualization
     */
    setupAudioVisualization() {
        // Base heights for the bars
        this.baseHeight = 5;
    }
    
    /**
     * Create mobile-specific UI if needed
     */
    setupMobileUI() {
        if (this.isMobile && this.pressToTalkContainer) {
            this.pressToTalkContainer.classList.remove('hidden');
        }
    }
    
    /**
     * Check for microphone permission
     */
    async checkMicrophonePermission() {
        const hasPermission = await this.speechRecognizer.checkMicrophonePermission();
        this.handlePermissionChange(hasPermission);
    }
    
    /**
     * Enable debug logging for all components
     */
    enableDebugLogging() {
        if (this.debugMode) {
            if (this.brailleTranslator && this.brailleTranslator.debug) {
                this.brailleTranslator.debug.enabled = true;
            }
            
            if (this.speechRecognizer && this.speechRecognizer.debug) {
                this.speechRecognizer.debug.enabled = true;
            }
            
            if (this.bleConnection && this.bleConnection.debug) {
                this.bleConnection.debug.enabled = true;
            }
        }
    }
    
    /**
     * Start the introduction phase
     */
    startIntroPhase() {
        this.currentPhase = this.PHASE_INTRO;
        this.updatePhaseDisplay();
        this.setActivePhase(this.introPhase);
        
        // Start countdown
        let countdown = 10; // 10 seconds
        this.introCountdown.textContent = countdown;
        
        this.introTimer = setInterval(() => {
            countdown--;
            this.introCountdown.textContent = countdown;
            
            if (countdown <= 0) {
                clearInterval(this.introTimer);
                this.startRecordingPhase();
            }
        }, 1000);
        
        // Welcome message using speech
        setTimeout(() => {
            this.speakText('Welcome to Speech to Braille. I will convert your speech to braille patterns. Get ready to start speaking.');
        }, 500);
    }
    
    /**
     * Skip the introduction phase
     */
    skipIntroduction() {
        if (this.introTimer) {
            clearInterval(this.introTimer);
        }
        
        this.startRecordingPhase();
    }
    
    /**
     * Start the recording phase
     */
    startRecordingPhase() {
        this.currentPhase = this.PHASE_RECORDING;
        this.updatePhaseDisplay();
        this.setActivePhase(this.recordingPhase);
        
        // Start speech recognition
        this.speechRecognizer.startListening();
        
        // Reset recognized text if coming from output phase
        if (this.outputTimer) {
            clearInterval(this.outputTimer);
            this.outputTimer = null;
        } else {
            // Only clear the recognized text if not transitioning from output phase
            this.recognizedText.innerHTML = '';
            this.currentTranscript = '';
            this.speechRecognizer.reset();
        }
        
        // Play audio cue for recording mode
        this.playAudioCue('recording');
    }
    
    /**
     * Start the output phase
     */
    startOutputPhase() {
        // Process the recognized text for braille matches
        const brailleMatches = this.brailleTranslator.searchWords(this.currentTranscript);
        
        // If no matches found, return to recording phase immediately
        if (brailleMatches.length === 0) {
            this.log('No braille matches found, returning to recording phase');
            this.showMessage('No braille patterns found');
            return;
        }
        
        // Update UI
        this.currentPhase = this.PHASE_OUTPUT;
        this.updatePhaseDisplay();
        this.setActivePhase(this.outputPhase);
        
        // Stop speech recognition
        this.speechRecognizer.stopListening();
        
        // Play audio cue for output mode
        this.playAudioCue('output');
        
        // Display braille patterns
        this.brailleTranslator.displayBrailleOutput(brailleMatches, this.brailleOutput);
        
        // Send braille data to BLE device if connected
        if (this.bleConnection && this.bleConnection.isConnectedToBLE() && brailleMatches.length > 0) {
            this.bleConnection.sendBraille(brailleMatches[0]);
            this.flashWordSent(brailleMatches[0].word);
        }
        
        // Speak the matched word
        if (brailleMatches.length > 0 && brailleMatches[0].word) {
            this.speakText(brailleMatches[0].word);
        }
        
        // Start countdown for returning to recording
        let countdown = 8; // 8 seconds
        this.outputCountdown.textContent = countdown;
        
        this.outputTimer = setInterval(() => {
            countdown--;
            this.outputCountdown.textContent = countdown;
            
            if (countdown <= 0) {
                clearInterval(this.outputTimer);
                this.outputTimer = null;
                this.startRecordingPhase();
            }
        }, 1000);
    }
    
    /**
     * Set the active phase by showing the correct container
     * @param {HTMLElement} phaseElement - The phase container to activate
     */
    setActivePhase(phaseElement) {
        // Hide all phases
        this.introPhase.classList.remove('active');
        this.recordingPhase.classList.remove('active');
        this.outputPhase.classList.remove('active');
        
        // Show the active phase
        if (phaseElement) {
            phaseElement.classList.add('active');
        }
    }
    
    /**
     * Update the phase display in the status bar
     */
    updatePhaseDisplay() {
        if (!this.phaseStatus) return;
        
        switch (this.currentPhase) {
            case this.PHASE_INTRO:
                this.phaseStatus.textContent = 'Introduction';
                break;
                
            case this.PHASE_RECORDING:
                this.phaseStatus.textContent = 'Recording';
                break;
                
            case this.PHASE_OUTPUT:
                this.phaseStatus.textContent = 'Output';
                break;
                
            default:
                this.phaseStatus.textContent = 'Unknown';
        }
    }
    
    /**
     * Update BLE connection status display
     * @param {boolean} isConnected - Whether connected to a device
     * @param {string} [customText] - Optional custom text to display
     */
    updateBleStatus(isConnected, customText) {
        if (!this.bleStatus) return;
        
        if (customText) {
            this.bleStatus.textContent = customText;
            return;
        }
        
        if (isConnected) {
            const deviceInfo = this.bleConnection.getDeviceInfo();
            const deviceName = deviceInfo ? deviceInfo.name : 'Device';
            this.bleStatus.textContent = `Connected to ${deviceName}`;
            
            // Update button text
            if (this.bleConnectBtn) {
                this.bleConnectBtn.textContent = 'Disconnect';
                this.bleConnectBtn.disabled = false;
            }
        } else {
            this.bleStatus.textContent = 'Not Connected';
            
            // Update button text
            if (this.bleConnectBtn) {
                this.bleConnectBtn.textContent = 'Connect Braille Display';
                this.bleConnectBtn.disabled = false;
            }
        }
    }
    
    /**
     * Update audio wave visualization based on volume level
     * @param {number} volume - Volume level (0-100)
     */
    updateAudioVisualization(volume) {
        if (!this.audioBars || this.audioBars.length === 0) return;
        
        // Scale the volume (0-100) to bar heights
        const maxHeight = 50;
        
        // Create a wave-like pattern based on the volume
        this.audioBars.forEach((bar, index) => {
            // Create a wave effect with different heights for each bar
            // using sine function with phase shift based on index and volume
            const phase = (index / this.audioBars.length) * Math.PI * 2;
            const baseVolume = Math.max(5, volume); // minimum of 5 to always show something
            const barHeight = this.baseHeight + (Math.sin(phase + (Date.now() / 200)) * 0.5 + 0.5) * baseVolume;
            
            // Apply height to the bar
            bar.style.height = `${Math.min(maxHeight, barHeight)}px`;
        });
    }
    
    /**
     * Handle speech recognition start
     */
    handleSpeechStart() {
        this.log('Speech recognition started');
    }
    
    /**
     * Handle speech recognition stop
     */
    handleSpeechStop() {
        this.log('Speech recognition stopped');
        
        // If we're still in recording phase, restart recognition
        if (this.currentPhase === this.PHASE_RECORDING) {
            setTimeout(() => {
                this.speechRecognizer.startListening();
            }, 1000);
        }
    }
    
    /**
     * Handle detected word
     * @param {string} word - The detected word
     * @param {boolean} isFinal - Whether this is a final result
     */
    handleWordDetected(word, isFinal) {
        if (!word) return;
        
        // Only process words in recording phase
        if (this.currentPhase !== this.PHASE_RECORDING) return;
        
        this.log(`Word detected: "${word}" (${isFinal ? 'final' : 'interim'})`);
        
        // Find match in braille database
        const match = this.brailleTranslator.findWord(word);
        
        if (match && match.found) {
            this.log(`Found match for word: ${word}`, match);
            
            // Display this specific match
            this.brailleTranslator.displayBrailleOutput([match], this.brailleOutput);
            
            // Send to BLE if connected
            if (this.bleConnection && this.bleConnection.isConnectedToBLE()) {
                try {
                    this.bleConnection.sendBraille(match);
                    // Visual feedback that a word was sent
                    this.flashWordSent(word);
                } catch (err) {
                    console.error("BLE transmission error:", err);
                }
            }
            
            // Only set up clearance timeout for interim results
            // Final results are handled differently
            if (!isFinal) {
                // Clear after 4 seconds
                setTimeout(() => {
                    // Only clear if still in recording phase
                    if (this.currentPhase === this.PHASE_RECORDING) {
                        this.brailleOutput.innerHTML = '';
                    }
                }, 4000);
            }
        } else if (isFinal) {
            // Only show no-match feedback for final results
            this.log(`No match found for: ${word}`);
            
            // Add visual feedback for no match
            const noMatchElement = document.createElement('div');
            noMatchElement.className = 'no-match-feedback';
            noMatchElement.textContent = `No braille pattern found for: ${word}`;
            noMatchElement.style.color = 'red';
            noMatchElement.style.padding = '5px';
            noMatchElement.style.margin = '5px 0';
            this.recognizedText.appendChild(noMatchElement);
            
            setTimeout(() => noMatchElement.remove(), 3000);
            
            // Play no-match audio cue
            this.playAudioCue('noMatch');
        }
    }
    
    /**
     * Handle final speech recognition result
     * @param {string} text - The recognized text
     */
    handleFinalResult(text) {
        this.currentTranscript = text;
        this.updateRecognizedText(text);
    }
    
    /**
     * Handle interim speech recognition result
     * @param {string} text - The interim recognized text
     */
    handleInterimResult(text) {
        // Show interim text with different styling
        this.updateRecognizedText(this.currentTranscript, text);
    }
    
    /**
     * Handle speech recognition error
     * @param {string} error - The error message
     */
    handleSpeechError(error) {
        this.log(`Speech recognition error: ${error}`);
        
        // Show error message
        this.showMessage(`Speech recognition error: ${error}`, 'error');
    }
    
    /**
     * Handle microphone permission change
     * @param {boolean} granted - Whether permission was granted
     */
    handlePermissionChange(granted) {
        if (granted) {
            this.log('Microphone permission granted');
        } else {
            this.log('Microphone permission denied');
            this.showMessage('Microphone permission denied. Please allow microphone access to use speech recognition.', 'error');
        }
    }
    
    /**
     * Handle press-to-talk button press
     */
    handlePressTalkStart() {
        if (this.currentPhase !== this.PHASE_RECORDING) return;
        
        // Start listening if not already
        this.speechRecognizer.startListening();
        
        // Visual feedback
        this.pressToTalk.classList.add('active');
        this.pressToTalk.textContent = 'Listening...';
    }
    
    /**
     * Handle press-to-talk button release
     */
    handlePressTalkEnd() {
        if (this.currentPhase !== this.PHASE_RECORDING) return;
        
        // Process final result and transition to output if we detected something
        if (this.currentTranscript.trim()) {
            this.startOutputPhase();
        }
        
        // Stop listening
        this.speechRecognizer.stopListening();
        
        // Visual feedback
        this.pressToTalk.classList.remove('active');
        this.pressToTalk.textContent = 'Press to Talk';
    }
    
    /**
     * Update the recognized text display
     * @param {string} finalText - The final recognized text
     * @param {string} [interimText] - Optional interim text to display
     */
    updateRecognizedText(finalText, interimText) {
        if (!this.recognizedText) return;
        
        // Create content with final and interim text
        let content = '';
        
        if (finalText) {
            content += `<span class="final">${finalText}</span>`;
        }
        
        if (interimText) {
            content += ` <span class="interim">${interimText}</span>`;
        }
        
        this.recognizedText.innerHTML = content;
        
        // Scroll to bottom
        this.recognizedText.scrollTop = this.recognizedText.scrollHeight;
    }
    
    /**
     * Toggle the debug console
     */
    toggleDebugConsole() {
        if (!this.debugConsole) return;
        
        this.debugConsole.classList.toggle('hidden');
        
        // Focus input when showing
        if (!this.debugConsole.classList.contains('hidden')) {
            this.debugInput.focus();
        }
    }
    
    /**
     * Hide the debug console
     */
    hideDebugConsole() {
        if (!this.debugConsole) return;
        
        this.debugConsole.classList.add('hidden');
    }
    
    /**
     * Execute a debug command
     */
    executeDebugCommand() {
        if (!this.debugInput || !this.debugOutput) return;
        
        const command = this.debugInput.value.trim();
        if (!command) return;
        
        this.log(`> ${command}`);
        
        // Process command
        if (command.startsWith('O:') || command.startsWith('N:')) {
            // Direct braille output command
            this.executeDirectOutputCommand(command);
        } else if (command.startsWith('pins:')) {
            // Pin control command
            this.executePinControlCommand(command);
        } else if (command.startsWith('test:')) {
            // Test command
            this.executeTestCommand(command);
        } else if (command.startsWith('search:')) {
            // Search command
            this.executeSearchCommand(command);
        } else if (command.startsWith('language:')) {
            // Language command
            this.executeLanguageCommand(command);
        } else if (command === 'clear') {
            // Clear console
            this.debugOutput.innerHTML = '';
        } else if (command === 'help') {
            // Show help
            this.showDebugHelp();
        } else {
            this.log('Unknown command. Type "help" for available commands.');
        }
        
        // Clear input
        this.debugInput.value = '';
    }
    
    /**
     * Execute a direct output command (O: or N:)
     * @param {string} command - The command to execute
     */
    executeDirectOutputCommand(command) {
        if (!this.bleConnection.isConnectedToBLE()) {
            this.log('Not connected to a braille display');
            return;
        }
        
        // Send the command directly
        this.bleConnection.sendData(command);
        this.log(`Sent command: ${command}`);
    }
    
    /**
     * Execute a pin control command (pins:cell,pin,value)
     * @param {string} command - The command to execute
     */
    executePinControlCommand(command) {
        if (!this.bleConnection.isConnectedToBLE()) {
            this.log('Not connected to a braille display');
            return;
        }
        
        // Parse parameters
        const params = command.substring(5).split(',');
        if (params.length !== 3) {
            this.log('Invalid pin control format. Use: pins:cell,pin,value');
            return;
        }
        
        const cell = parseInt(params[0]);
        const pin = parseInt(params[1]);
        const value = parseInt(params[2]);
        
        if (isNaN(cell) || isNaN(pin) || isNaN(value)) {
            this.log('Invalid parameters. All parameters must be numbers.');
            return;
        }
        
        // Send pin control command
        this.bleConnection.controlPin(cell, pin, value);
        this.log(`Setting pin: cell ${cell}, pin ${pin}, value ${value}`);
    }
    
    /**
     * Execute a test command (test:type)
     * @param {string} command - The command to execute
     */
    executeTestCommand(command) {
        const testType = command.substring(5).toLowerCase();
        
        switch (testType) {
            case 'alphabet':
                this.testAlphabet();
                break;
                
            case 'numbers':
                this.testNumbers();
                break;
                
            default:
                // Test a specific character or word
                const match = this.brailleTranslator.findWord(testType);
                if (match && match.found) {
                    this.log(`Testing pattern for "${testType}"`);
                    this.brailleTranslator.displayBrailleOutput([match], this.brailleOutput);
                    
                    if (this.bleConnection.isConnectedToBLE()) {
                        this.bleConnection.sendBraille(match);
                    }
                } else {
                    this.log(`No pattern found for "${testType}"`);
                }
                break;
        }
    }
    
    /**
     * Execute a search command (search:word)
     * @param {string} command - The command to execute
     */
    executeSearchCommand(command) {
        const searchTerm = command.substring(7).toLowerCase();
        if (!searchTerm) {
            this.log('No search term provided');
            return;
        }
        
        const match = this.brailleTranslator.findWord(searchTerm);
        if (match && match.found) {
            const pattern = Array.isArray(match.array[0]) ? JSON.stringify(match.array) : `[${match.array.join(',')}]`;
            this.log(`Found pattern for "${searchTerm}":`);
            this.log(`- Language: ${match.language}`);
            this.log(`- Braille: ${match.braille}`);
            this.log(`- Array: ${pattern}`);
            
            // Show pattern
            this.brailleTranslator.displayBrailleOutput([match], this.brailleOutput);
        } else {
            this.log(`No pattern found for "${searchTerm}"`);
        }
    }
    
    /**
     * Execute a language command (language:code)
     * @param {string} command - The command to execute
     */
    executeLanguageCommand(command) {
        const langCode = command.substring(9).trim().toUpperCase();
        
        if (!langCode) {
            // Show available languages
            const languages = this.brailleTranslator.getAvailableLanguages();
            this.log(`Available languages: ${languages.join(', ') || 'None'}`);
            this.log(`Current language: ${this.brailleTranslator.currentLanguage}`);
            return;
        }
        
        // Set language
        if (this.brailleTranslator.setLanguage(langCode)) {
            this.log(`Language set to: ${langCode}`);
        } else {
            this.log(`Failed to set language: ${langCode}`);
        }
    }
    
    /**
     * Show debug console help
     */
    showDebugHelp() {
        this.log('Available commands:');
        this.log('- O:[array] - Send output pattern directly (e.g., O:[[1,2,3]])');
        this.log('- N:[] - Clear display (lower all dots)');
        this.log('- pins:cell,pin,value - Control individual pin (cell 0-2, pin 0-5, value 0-1)');
        this.log('- test:character - Test a specific character or word');
        this.log('- test:alphabet - Run through the entire alphabet');
        this.log('- test:numbers - Test all number representations');
        this.log('- search:word - Search the database for a word');
        this.log('- language:code - Set translation language (e.g., UEB)');
        this.log('- language: - View available languages');
        this.log('- clear - Clear the console output');
        this.log('- help - Show this help information');
    }
    
    /**
     * Test the alphabet
     */
    async testAlphabet() {
        if (!this.bleConnection.isConnectedToBLE() && !this.debugMode) {
            this.log('Not connected to a braille display');
            this.showMessage('Please connect to a Braille Display first');
            return;
        }
        
        this.log('Running alphabet test...');
        
        // Get alphabet and numbers
        const alphabetEntries = this.brailleTranslator.getAlphabetAndNumbers()
            .filter(entry => /^[a-z]$/.test(entry.word)); // Only a-z
        
        // Run test in sequence
        for (let i = 0; i < alphabetEntries.length; i++) {
            const entry = alphabetEntries[i];
            
            // Display status
            this.log(`Testing letter ${entry.word} (${i+1}/${alphabetEntries.length})`);
            
            // Display in the UI
            this.brailleTranslator.displayBrailleOutput([entry], this.brailleOutput);
            
            // Send to BLE
            if (this.bleConnection.isConnectedToBLE()) {
                await this.bleConnection.sendBraille(entry);
            }
            
            // Wait 1 second before next letter
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        this.log('Alphabet test complete');
    }
    
    /**
     * Test numbers
     */
    async testNumbers() {
        if (!this.bleConnection.isConnectedToBLE() && !this.debugMode) {
            this.log('Not connected to a braille display');
            this.showMessage('Please connect to a Braille Display first');
            return;
        }
        
        this.log('Running number test...');
        
        // Get number entries
        const numberWords = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
        const numberEntries = [];
        
        for (const word of numberWords) {
            const match = this.brailleTranslator.findWord(word);
            if (match && match.found) {
                numberEntries.push(match);
            }
        }
        
        // Run test in sequence
        for (let i = 0; i < numberEntries.length; i++) {
            const entry = numberEntries[i];
            
            // Display status
            this.log(`Testing number ${entry.word} (${i}/${numberEntries.length - 1})`);
            
            // Display in the UI
            this.brailleTranslator.displayBrailleOutput([entry], this.brailleOutput);
            
            // Send to BLE
            if (this.bleConnection.isConnectedToBLE()) {
                await this.bleConnection.sendBraille(entry);
            }
            
            // Wait 1 second before next number
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        this.log('Number test complete');
    }
    
    /**
     * Run a BLE speed test
     */
    async runSpeedTest() {
        if (!this.bleConnection.isConnectedToBLE()) {
            this.log('Not connected to a braille display');
            this.showMessage('Please connect to a Braille Display first');
            return;
        }
        
        this.log('Running BLE speed test...');
        
        const results = await this.bleConnection.runSpeedTest(20, 20);
        if (results) {
            this.log('Speed test results:');
            this.log(`- Packets sent: ${results.packetsCount}`);
            this.log(`- Packet size: ${results.packetSize} bytes`);
            this.log(`- Total bytes: ${results.totalBytes} bytes`);
            this.log(`- Duration: ${results.durationSeconds.toFixed(2)} seconds`);
            this.log(`- Speed: ${results.bytesPerSecond} bytes/second`);
        } else {
            this.log('Speed test failed');
        }
    }
    
    /**
     * Clear the database cache
     */
    clearDatabaseCache() {
        if (this.brailleTranslator.clearCache()) {
            this.log('Database cache cleared. Reload the page to rebuild the cache.');
            
            // Add reload button
            const reloadButton = document.createElement('button');
            reloadButton.textContent = 'Reload Page';
            reloadButton.onclick = () => location.reload();
            reloadButton.style.margin = '10px 0';
            this.debugOutput.appendChild(reloadButton);
        } else {
            this.log('Failed to clear cache');
        }
    }
    
    /**
     * Play an audio cue
     * @param {string} type - The type of cue (recording, output, noMatch)
     */
    playAudioCue(type) {
        // TODO: Implement audio cues (could use pre-loaded audio files)
        // For now, we'll just log the cue
        this.log(`Playing ${type} audio cue`);
    }
    
    /**
     * Speak text using text-to-speech
     * @param {string} text - The text to speak
     */
    speakText(text) {
        if (!text || !this.speechRecognizer) return;
        
        this.speechRecognizer.speak(text);
    }
    
    /**
     * Show a temporary message to the user
     * @param {string} message - The message to show
     * @param {string} [type] - The type of message (info, error, success)
     */
    showMessage(message, type = 'info') {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        messageDiv.textContent = message;
        
        // Style the message
        messageDiv.style.position = 'fixed';
        messageDiv.style.bottom = '70px';
        messageDiv.style.left = '50%';
        messageDiv.style.transform = 'translateX(-50%)';
        messageDiv.style.backgroundColor = type === 'error' ? 'rgba(220, 53, 69, 0.9)' : 
                                          type === 'success' ? 'rgba(40, 167, 69, 0.9)' : 
                                          'rgba(0, 123, 255, 0.9)';
        messageDiv.style.color = 'white';
        messageDiv.style.padding = '10px 20px';
        messageDiv.style.borderRadius = '5px';
        messageDiv.style.zIndex = '1000';
        messageDiv.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.2)';
        
        document.body.appendChild(messageDiv);
        
        // Remove after 3 seconds
        setTimeout(() => {
            messageDiv.style.opacity = '0';
            messageDiv.style.transition = 'opacity 0.5s';
            
            setTimeout(() => messageDiv.remove(), 500);
        }, 3000);
    }
    
    /**
     * Flash a notification that a word was sent
     * @param {string} word - The word that was sent
     */
    flashWordSent(word) {
        const feedbackDiv = document.createElement('div');
        feedbackDiv.textContent = `Sent "${word}" to braille display`;
        feedbackDiv.style.position = 'fixed';
        feedbackDiv.style.bottom = '20px';
        feedbackDiv.style.left = '50%';
        feedbackDiv.style.transform = 'translateX(-50%)';
        feedbackDiv.style.backgroundColor = 'rgba(40, 167, 69, 0.8)';
        feedbackDiv.style.color = 'white';
        feedbackDiv.style.padding = '10px 20px';
        feedbackDiv.style.borderRadius = '20px';
        feedbackDiv.style.zIndex = '1000';
        
        document.body.appendChild(feedbackDiv);
        
        // Fade out and remove
        setTimeout(() => {
            feedbackDiv.style.transition = 'opacity 1s';
            feedbackDiv.style.opacity = '0';
            setTimeout(() => feedbackDiv.remove(), 1000);
        }, 2000);
    }
    
    /**
     * Log a message to the debug console
     * @param {string} message - The message to log
     */
    log(message) {
        const timestamp = new Date().toLocaleTimeString();
        const logMessage = `[${timestamp}] ${message}`;
        
        // Log to browser console
        console.log(logMessage);
        
        // Log to debug output if available
        if (this.debugOutput) {
            const logLine = document.createElement('div');
            logLine.textContent = logMessage;
            this.debugOutput.appendChild(logLine);
            
            // Scroll to bottom
            this.debugOutput.scrollTop = this.debugOutput.scrollHeight;
        }
    }
}

// Create global instance
window.app = new SpeechToBrailleApp();