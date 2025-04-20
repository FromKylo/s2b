/**
 * Speech to Braille - Main Application 
 * Controls app phases, UI updates, and integration between modules
 * Enhanced with mobile-friendly speech recognition controls
 */

// App phases
const PHASE = {
    INTRODUCTION: 'introduction',
    RECORDING: 'recording',
    OUTPUT: 'output',
};

class SpeechToBrailleApp {
    constructor() {
        // Current application state
        this.currentPhase = PHASE.INTRODUCTION;
        this.introTimer = null;
        this.outputTimer = null;
        this.countdownValue = 8; // seconds
        this.isPressToTalk = false; // Whether we're using press-to-talk mode
        this.isMobileDevice = this.checkIfMobile();
        
        // DOM elements
        this.elements = {
            phaseContainers: {
                [PHASE.INTRODUCTION]: document.getElementById('introduction-phase'),
                [PHASE.RECORDING]: document.getElementById('recording-phase'),
                [PHASE.OUTPUT]: document.getElementById('output-phase'),
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
        
        // Create permission UI if it doesn't exist
        if (!this.elements.phaseContainers[PHASE.PERMISSION]) {
            this.createPermissionUI();
        }
        
        // Add mobile-specific UI elements
        if (this.isMobileDevice) {
            this.createMobileUI();
        }
        
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

        // Set up additional UI controls
        this.setupUIControls();
    }

    /**
     * Check if the current device is mobile
     */
    checkIfMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }

    /**
     * Create mobile-specific UI elements
     */
    createMobileUI() {
        // Create press-to-talk button
        const talkButton = document.createElement('button');
        talkButton.id = 'press-to-talk';
        talkButton.className = 'talk-button';
        talkButton.innerHTML = '<span>Hold to Talk</span>';
        
        // Create audio level indicator
        const audioLevel = document.createElement('div');
        audioLevel.id = 'audio-level';
        audioLevel.className = 'audio-level';
        audioLevel.innerHTML = '<div class="level-bar"></div>';
        
        // Create network status indicator
        const networkStatus = document.createElement('div');
        networkStatus.id = 'network-status';
        networkStatus.className = 'status-indicator online';
        networkStatus.innerHTML = '<span class="status-dot"></span><span class="status-text">Online</span>';
        
        // Add elements to the recording phase
        const recordingContent = this.elements.phaseContainers[PHASE.RECORDING].querySelector('.phase-content');
        if (recordingContent) {
            recordingContent.appendChild(audioLevel);
            recordingContent.appendChild(talkButton);
            
            // Add network status to header
            const header = document.querySelector('header');
            if (header) {
                header.appendChild(networkStatus);
            }
        }
        
        // Update our elements reference
        this.elements.talkButton = talkButton;
        this.elements.audioLevel = audioLevel;
        this.elements.networkStatus = networkStatus;
        
        // Set press-to-talk mode for mobile
        this.isPressToTalk = true;
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
            
            // Check for microphone permission before proceeding
            const permissionStatus = await speechRecognition.checkMicrophonePermission();
            if (permissionStatus === 'granted') {
                // Start the introduction phase if permission is granted
                this.startIntroductionPhase();
            } else {
                // Show permission request UI
                this.switchPhase(PHASE.PERMISSION);
            }
            
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
            this.updateAudioLevel();
            
            // Words are now handled by the dedicated word detection callback
            // so we don't need to extract words here
        });
        
        // Handle word detection (both interim and final)
        speechRecognition.setOnWordDetected((word, confidence, isFinal) => {
            console.log(`Word detected: "${word}" (${isFinal ? 'final' : 'interim'}) with confidence ${confidence}`);
            
            // Only process words with sufficient length and confidence
            if (word.length >= 2) {
                // Try to find a match in the braille database
                const pattern = brailleTranslation.translateWord(word);
                
                if (pattern) {
                    this.log(`Found braille match for ${isFinal ? 'final' : 'interim'} word: ${word} (confidence: ${confidence.toFixed(2)})`);
                    
                    // Display the detected word and its confidence
                    this.elements.finalResult.textContent = `Detected: ${word} (${(confidence * 100).toFixed(0)}%)`;
                    
                    // Visual feedback for match found
                    this.flashWordFound(word);
                    
                    // Transition to output phase
                    this.transitionToOutputPhase(word, pattern);
                }
            }
        });
        
        // Handle final results
        speechRecognition.setOnFinalResult((result, confidence) => {
            this.elements.finalResult.textContent = result;
            
            // Process individual words from final result
            const words = speechRecognition.extractWords(result);
            
            if (words.length > 0) {
                // Process the last word from the final result
                const lastWord = words[words.length - 1];
                
                // Try to find a match in the braille database
                const pattern = brailleTranslation.translateWord(lastWord);
                
                if (pattern) {
                    this.log(`Found braille match for final word: ${lastWord} (confidence: ${confidence.toFixed(2)})`);
                    
                    // Visual feedback for match found
                    this.flashWordFound(lastWord);
                    
                    // Transition to output phase
                    this.transitionToOutputPhase(lastWord, pattern);
                }
            }
        });
        
        // Handle start/stop listening
        speechRecognition.setOnStartListening(() => {
            this.animateAudioWave(true);
            this.updateTalkButtonState(true);
            this.log('Speech recognition started');
        });
        
        speechRecognition.setOnStopListening(() => {
            this.animateAudioWave(false);
            this.updateTalkButtonState(false);
            this.log('Speech recognition stopped');
        });
        
        // Handle permission changes
        speechRecognition.setOnPermissionChange((status) => {
            this.log(`Microphone permission status changed to: ${status}`);
            this.updatePermissionUI(status);
            
            if (status === 'granted' && this.currentPhase === PHASE.PERMISSION) {
                // If we were waiting for permission and got it, move to intro phase
                this.startIntroductionPhase();
            }
        });
        
        // Handle network status changes
        speechRecognition.setOnNetworkStatusChange((status) => {
            this.log(`Network status changed to: ${status}`);
            this.updateNetworkStatusUI(status);
        });
    }

    /**
     * Visual feedback when a word match is found
     * @param {string} word - The word that was found
     */
    flashWordFound(word) {
        // Add a flashing highlight to the word
        const wordIndicator = document.createElement('div');
        wordIndicator.className = 'word-found-indicator';
        wordIndicator.textContent = `Match found: "${word}"`;
        
        // Append to recording phase content
        const recordingContent = this.elements.phaseContainers[PHASE.RECORDING].querySelector('.phase-content');
        if (recordingContent) {
            recordingContent.appendChild(wordIndicator);
            
            // Remove after a short delay
            setTimeout(() => {
                if (wordIndicator.parentNode) {
                    wordIndicator.parentNode.removeChild(wordIndicator);
                }
            }, 2000);
        }
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
        
        // Grant permission button
        if (this.elements.grantPermissionButton) {
            this.elements.grantPermissionButton.addEventListener('click', () => {
                this.requestMicrophonePermission();
            });
        }
        
        // Press-to-talk button for mobile devices
        if (this.elements.talkButton) {
            // Touch events for mobile
            this.elements.talkButton.addEventListener('touchstart', (e) => {
                e.preventDefault(); // Prevent default touch behavior
                this.handlePressTalkStart();
            });
            
            this.elements.talkButton.addEventListener('touchend', (e) => {
                e.preventDefault();
                this.handlePressTalkEnd();
            });
            
            // Mouse events for desktop testing
            this.elements.talkButton.addEventListener('mousedown', () => {
                this.handlePressTalkStart();
            });
            
            this.elements.talkButton.addEventListener('mouseup', () => {
                this.handlePressTalkEnd();
            });
            
            // Handle case where user moves finger out of button while pressing
            this.elements.talkButton.addEventListener('touchcancel', (e) => {
                e.preventDefault();
                this.handlePressTalkEnd();
            });
            
            this.elements.talkButton.addEventListener('mouseleave', () => {
                if (this.isPressToTalk && speechRecognition.isListening) {
                    this.handlePressTalkEnd();
                }
            });
        }
        
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
     * Handle the start of press-to-talk
     */
    handlePressTalkStart() {
        if (this.currentPhase !== PHASE.RECORDING) return;
        
        this.elements.talkButton.classList.add('active');
        this.elements.talkButton.querySelector('span').textContent = 'Listening...';
        
        // Start recognition for this press
        speechRecognition.startListening();
    }

    /**
     * Handle the end of press-to-talk
     */
    handlePressTalkEnd() {
        if (this.currentPhase !== PHASE.RECORDING) return;
        
        this.elements.talkButton.classList.remove('active');
        this.elements.talkButton.querySelector('span').textContent = 'Hold to Talk';
        
        // Stop recognition when button is released
        if (speechRecognition.isListening) {
            speechRecognition.stopListening();
        }
    }

    /**
     * Request microphone permission explicitly
     */
    async requestMicrophonePermission() {
        this.log('Requesting microphone permission...');
        this.elements.permissionStatus.textContent = 'Requesting permission...';
        
        const permissionGranted = await speechRecognition.requestMicrophoneAccess();
        
        if (permissionGranted) {
            this.log('Microphone permission granted');
            this.elements.permissionStatus.textContent = 'Permission granted!';
            this.updatePermissionUI('granted');
            
            // Proceed to introduction phase
            setTimeout(() => {
                this.startIntroductionPhase();
            }, 1000);
        } else {
            this.log('Microphone permission denied', 'error');
            this.elements.permissionStatus.textContent = 'Permission denied. Please enable microphone access in your browser settings.';
            this.updatePermissionUI('denied');
        }
    }

    /**
     * Update permission UI based on current status
     */
    updatePermissionUI(status) {
        if (this.elements.permissionStatus) {
            switch (status) {
                case 'granted':
                    this.elements.permissionStatus.className = 'status-message success';
                    this.elements.permissionStatus.textContent = 'Microphone access granted!';
                    if (this.elements.grantPermissionButton) {
                        this.elements.grantPermissionButton.disabled = true;
                        this.elements.grantPermissionButton.textContent = 'Permission Granted';
                    }
                    break;
                    
                case 'denied':
                    this.elements.permissionStatus.className = 'status-message error';
                    this.elements.permissionStatus.textContent = 'Microphone access denied. Please enable in browser settings.';
                    if (this.elements.grantPermissionButton) {
                        this.elements.grantPermissionButton.textContent = 'Enable in Settings';
                    }
                    break;
                    
                case 'prompt':
                    this.elements.permissionStatus.className = 'status-message warning';
                    this.elements.permissionStatus.textContent = 'Please click "Allow" when prompted for microphone access.';
                    break;
                    
                default:
                    this.elements.permissionStatus.className = 'status-message';
                    this.elements.permissionStatus.textContent = 'Permission status unknown.';
            }
        }
    }

    /**
     * Update network status UI
     */
    updateNetworkStatusUI(status) {
        if (this.elements.networkStatus) {
            const statusElement = this.elements.networkStatus;
            const statusText = statusElement.querySelector('.status-text');
            
            statusElement.className = `status-indicator ${status}`;
            
            switch (status) {
                case 'online':
                    statusText.textContent = 'Online';
                    break;
                case 'offline':
                    statusText.textContent = 'Offline';
                    break;
                case 'unstable':
                    statusText.textContent = 'Unstable Connection';
                    break;
                default:
                    statusText.textContent = status;
            }
        }
    }

    /**
     * Update talk button state
     */
    updateTalkButtonState(isListening) {
        if (!this.elements.talkButton) return;
        
        if (isListening) {
            this.elements.talkButton.classList.add('active');
            this.elements.talkButton.querySelector('span').textContent = 'Listening...';
        } else {
            this.elements.talkButton.classList.remove('active');
            this.elements.talkButton.querySelector('span').textContent = 'Hold to Talk';
        }
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
        
        // Start listening - handle differently based on device type
        if (this.isPressToTalk) {
            // For mobile, wait for press-to-talk button
            this.log('Ready for press-to-talk input');
            // Show instruction
            const instructionEl = document.createElement('div');
            instructionEl.className = 'instruction-text';
            instructionEl.textContent = 'Press and hold the button to speak';
            
            const recordingContent = this.elements.phaseContainers[PHASE.RECORDING].querySelector('.phase-content');
            if (recordingContent && !recordingContent.querySelector('.instruction-text')) {
                recordingContent.insertBefore(instructionEl, recordingContent.firstChild.nextSibling);
            }
        } else {
            // For desktop, start continuous listening
            speechRecognition.startListening();
        }
        
        // Animate audio wave
        this.animateAudioWave(false); // Initially not active until we get audio
        
        // Speak prompt
        setTimeout(() => {
            if (this.isPressToTalk) {
                speechRecognition.speak('Press and hold to speak', { rate: 1.2 });
            } else {
                speechRecognition.speak('I\'m listening', { rate: 1.2 });
            }
        }, 500);
    }

    /**
     * Transition to output phase
     * @param {string} word - The recognized word
     * @param {Array} pattern - The braille pattern
     */
    transitionToOutputPhase(word, pattern) {
        // Guard against null patterns
        if (!pattern) {
            console.error("Attempted to transition to output phase with null pattern");
            return;
        }
        
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
        
        // Enhance word display with extra information
        const wordInfo = document.createElement('div');
        wordInfo.className = 'word-info';
        
        // Show cell count for multi-cell patterns 
        const cellCount = Array.isArray(pattern[0]) ? pattern.length : 1;
        wordInfo.innerHTML = `
            <span class="word-language">${brailleTranslation.currentLanguage}</span>
            <span class="word-cells">${cellCount} cell${cellCount > 1 ? 's' : ''}</span>
        `;
        this.elements.recognizedWord.appendChild(wordInfo);
        
        // Log the pattern for debugging
        console.log("Braille pattern for output:", pattern);
        
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
            if (container) container.classList.remove('active');
        });
        
        // Add active class to target phase
        if (this.elements.phaseContainers[phase]) {
            this.elements.phaseContainers[phase].classList.add('active');
        }
        
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
     * Update audio level visualization based on microphone input
     */
    updateAudioLevel() {
        // This would ideally use AudioContext to get actual microphone levels
        // For now, we'll simulate varying levels
        if (!this.elements.audioLevel) return;
        
        const levelBar = this.elements.audioLevel.querySelector('.level-bar');
        if (!levelBar) return;
        
        if (speechRecognition.isListening) {
            // Generate random audio level between 10% and 90%
            const randomLevel = 10 + Math.floor(Math.random() * 80);
            levelBar.style.width = `${randomLevel}%`;
            
            // Adjust color based on level
            if (randomLevel > 80) {
                levelBar.style.backgroundColor = '#ff4d4d'; // Red for very loud
            } else if (randomLevel > 40) {
                levelBar.style.backgroundColor = '#4CAF50'; // Green for good level
            } else {
                levelBar.style.backgroundColor = '#2196F3'; // Blue for quiet
            }
        } else {
            levelBar.style.width = '0%';
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
        
        // Clear any existing timers
        if (this.introTimer) clearInterval(this.introTimer);
        if (this.outputTimer) clearInterval(this.outputTimer);
        
        // Run the test
        await brailleTranslation.runAlphabetAndNumbersTest(
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

    /**
     * Set up additional UI controls
     */
    setupUIControls() {
        // Add handler for braille test button
        const brailleTestBtn = document.getElementById('braille-test-btn');
        if (brailleTestBtn) {
            brailleTestBtn.addEventListener('click', async () => {
                // Check if we're already in a test
                if (this.isRunningTest) return;
                
                this.isRunningTest = true;
                brailleTestBtn.disabled = true;
                brailleTestBtn.textContent = 'Running Test...';
                
                try {
                    // Switch to output phase to ensure proper display
                    this.switchPhase(PHASE.OUTPUT);
                    
                    // Run the test
                    await brailleTranslation.runAlphabetAndNumbersTest(
                        this.elements.brailleDisplay,
                        pattern => bleConnection.sendBraillePattern(pattern)
                    );
                    
                    // Clear display when done
                    setTimeout(() => {
                        this.elements.brailleDisplay.innerHTML = '';
                    }, 1000);
                } catch (error) {
                    console.error('Error running braille test:', error);
                    this.log('Braille test error: ' + error.message, 'error');
                } finally {
                    // Re-enable button
                    brailleTestBtn.disabled = false;
                    brailleTestBtn.textContent = 'Test Braille Display';
                    this.isRunningTest = false;
                    
                    // Return to recording phase
                    setTimeout(() => {
                        this.transitionToRecordingPhase();
                    }, 2000);
                }
            });
        }
        
        // Add handler for cache management
        const clearCacheBtn = document.getElementById('clear-cache-btn');
        if (clearCacheBtn) {
            clearCacheBtn.addEventListener('click', () => {
                if (brailleTranslation.clearCache()) {
                    this.log('Braille database cache cleared', 'success');
                    // Reload database
                    brailleTranslation.initialize().then(success => {
                        if (success) {
                            this.log('Database reloaded successfully', 'success');
                        } else {
                            this.log('Failed to reload database', 'error');
                        }
                    });
                } else {
                    this.log('Failed to clear cache', 'error');
                }
            });
        }
    }
}

// Initialize the app when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new SpeechToBrailleApp();
});
