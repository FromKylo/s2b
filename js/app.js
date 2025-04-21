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
    PERMISSION: 'permission'
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
        this.isRunningTest = false;
        
        // DOM elements
        this.elements = {
            phaseContainers: {
                [PHASE.INTRODUCTION]: document.getElementById('introduction-phase'),
                [PHASE.RECORDING]: document.getElementById('recording-phase'),
                [PHASE.OUTPUT]: document.getElementById('output-phase'),
                [PHASE.PERMISSION]: document.getElementById('permission-phase'),
            },
            bleStatus: document.getElementById('ble-status'),
            connectButton: document.getElementById('connect-ble'),
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
            audioWave: document.querySelector('.audio-wave'),
            permissionStatus: document.querySelector('.permission-status'),
            grantPermissionButton: document.getElementById('grant-permission'),
            // Add braille test button reference
            testButton: document.getElementById('braille-test-btn')
        };
        
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
        
        // Grant permission button (if exists)
        if (this.elements.grantPermissionButton) {
            this.elements.grantPermissionButton.addEventListener('click', () => {
                this.requestMicrophonePermission();
            });
        }
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
        if (this.elements.permissionStatus) {
            this.elements.permissionStatus.textContent = 'Requesting permission...';
        }
        
        const permissionGranted = await speechRecognition.requestMicrophoneAccess();
        
        if (permissionGranted) {
            this.log('Microphone permission granted');
            this.elements.permissionStatus.textContent = 'Permission granted!';
            this.updatePermissionUI('granted');
            
            // Proceed to introduction phase immediately
            this.startIntroductionPhase();
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
        // Debug logging for troubleshooting
        this.log(`BEGIN OUTPUT PHASE TRANSITION for word: "${word}"`, 'debug');
        
        // Guard against null patterns
        if (!pattern) {
            this.log("ERROR: Null pattern provided to output phase", 'error');
            console.error("Attempted to transition to output phase with null pattern");
            return;
        }
        
        this.log(`Pattern details: ${JSON.stringify(pattern)}`, 'debug');
        
        // Clear any existing timers
        if (this.introTimer) {
            clearInterval(this.introTimer);
            this.log("Intro timer cleared", 'debug');
        }
        if (this.outputTimer) {
            clearInterval(this.outputTimer);
            this.log("Output timer cleared", 'debug');
        }
        
        // Stop speech recognition temporarily
        speechRecognition.stopListening();
        this.log("Speech recognition stopped for output phase", 'debug');
        
        // Play output sound
        if (pattern) {
            this.sounds.outputSuccess.play().catch(e => {
                this.log(`Error playing success sound: ${e}`, 'error');
                console.log('Error playing sound:', e);
            });
            this.log("Output success sound played", 'debug');
        } else {
            this.sounds.outputFailure.play().catch(e => {
                this.log(`Error playing failure sound: ${e}`, 'error');
                console.log('Error playing sound:', e);
            });
            this.log("Output failure sound played", 'debug');
        }
        
        // Switch to output phase
        this.log(`Switching to OUTPUT phase`, 'debug');
        this.switchPhase(PHASE.OUTPUT);
        
        // Display word and pattern
        this.elements.recognizedWord.textContent = word;
        this.log(`Word text set in UI: "${word}"`, 'debug');
        
        // Enhance word display with extra information
        const wordInfo = document.createElement('div');
        wordInfo.className = 'word-info';
        wordInfo.innerHTML = `<span class="word-language">${brailleTranslation.currentLanguage}</span>`;
        this.elements.recognizedWord.appendChild(wordInfo);
        this.log(`Word language info added: ${brailleTranslation.currentLanguage}`, 'debug');
        
        // Log the pattern for debugging
        console.log("Braille pattern for output:", pattern);
        
        // Create debug information section in output display
        const debugInfo = document.createElement('div');
        debugInfo.className = 'debug-info';
        debugInfo.innerHTML = `
            <div class="debug-label">Pattern Data:</div>
            <pre>${JSON.stringify(pattern, null, 2)}</pre>
        `;
        this.elements.brailleDisplay.appendChild(debugInfo);
        
        // Render braille cells
        this.log(`Rendering braille pattern to display`, 'debug');
        brailleTranslation.renderBrailleCells(pattern, this.elements.brailleDisplay);
        
        // Send to BLE device if connected
        if (bleConnection.isConnected) {
            this.log(`Sending pattern to BLE device...`, 'debug');
            bleConnection.sendBraillePattern(pattern)
                .then(() => {
                    this.log(`Pattern successfully sent to BLE device`, 'success');
                })
                .catch(error => {
                    this.log(`ERROR sending pattern to BLE: ${error.message}`, 'error');
                });
        } else {
            this.log(`Not sending to BLE - device not connected`, 'warning');
        }
        
        // Speak the word
        speechRecognition.speak(word, { rate: 1.0 });
        this.log(`TTS started for word: "${word}"`, 'debug');
        
        // Reset countdown
        this.countdownValue = 8;
        this.elements.outputCountdown.textContent = this.countdownValue;
        this.log(`Output countdown reset to ${this.countdownValue}`, 'debug');
        
        // Start countdown
        this.log(`Starting output countdown timer`, 'debug');
        this.outputTimer = setInterval(() => {
            this.countdownValue--;
            this.elements.outputCountdown.textContent = this.countdownValue;
            
            if (this.countdownValue <= 0) {
                this.log(`Output countdown reached zero, cleaning up...`, 'debug');
                clearInterval(this.outputTimer);
                
                // Clear BLE display if connected
                if (bleConnection.isConnected) {
                    this.log(`Clearing BLE display...`, 'debug');
                    bleConnection.clearDisplay()
                        .then(() => {
                            this.log(`BLE display cleared successfully`, 'success');
                        })
                        .catch(error => {
                            this.log(`Error clearing BLE display: ${error.message}`, 'error');
                        });
                }
                
                this.log(`Transitioning back to recording phase`, 'debug');
                this.transitionToRecordingPhase();
            }
        }, 1000);
        
        this.log(`OUTPUT PHASE TRANSITION COMPLETE`, 'debug');
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
     * Search the braille database for a word
     * @param {string} word - The word to search for
     * @returns {Object|null} - The matching database entry or null if not found
     */
    searchDatabase(word) {
        this.log(`Searching database for: ${word}`);
        
        if (!word || typeof word !== 'string') {
            this.log('Invalid search term', 'error');
            return null;
        }
        
        const result = brailleTranslation.findWordInDatabase(word);
        
        if (result) {
            this.log(`Found match for "${word}" in database`, 'success');
            return result;
        } else {
            this.log(`No match found for "${word}"`, 'warning');
            return null;
        }
    }
 
    /**
     * Display database search result in the UI
     * @param {Object} result - The database search result
     */ 
    displayDatabaseResult(result, searchTerm) {
        // Create or get result container
        let resultContainer = document.getElementById('db-search-result');
        if (!resultContainer) {
            resultContainer = document.createElement('div');
            resultContainer.id = 'db-search-result';
            resultContainer.className = 'search-result';
            this.elements.debugConsole.appendChild(resultContainer);
        }
        
        if (!result) {
            resultContainer.innerHTML = `<div class="not-found">No match found for "${searchTerm}"</div>`;
            return;
        }
        
        // Format and display the result
        let html = `
            <div class="result-item">
                <h4>Found Match: "${result.word}"</h4>
                <ul>
                    <li><strong>Short Form:</strong> ${result.shortf || 'None'}</li>
                    <li><strong>Braille:</strong> ${result.braille || 'None'}</li>
                    <li><strong>Language:</strong> ${result.lang || 'UEB'}</li>
                </ul>
                <div class="braille-preview"></div>
            </div>
        `;
        
        resultContainer.innerHTML = html;
        
        // Render braille pattern if available
        if (result.array) {
            const previewElement = resultContainer.querySelector('.braille-preview');
            brailleTranslation.renderBrailleCells(result.array, previewElement);
        }
    }

    /**
     * Send a debug command to the BLE device
     * @param {string} command - The command to send
     */
    async sendDebugCommand(command) {
        if (!command) return;
        
        // Log the command
        this.log(`> ${command}`, 'command');
        
        // Process different command types
        if (command.toLowerCase().startsWith('o:') || 
            command.toLowerCase().startsWith('n:')) {
            // Direct BLE commands
            if (!bleConnection.isConnected) {
                this.log('Cannot send command: BLE not connected', 'error');
                return;
            }
            
            try {
                // Add detailed logging before sending
                this.log(`Sending ${command.startsWith('O:') ? 'OUTPUT' : 'CLEAR'} command to device...`, 'debug');
                this.log(`Command data: ${command}`, 'debug');
                
                // Send the command
                await bleConnection.sendData(command);
                this.log('Command sent successfully', 'success');
                
                // Show current phase for debugging
                this.log(`Current phase: ${this.currentPhase}`, 'debug');
            } catch (error) {
                this.log(`Error sending command: ${error.message}`, 'error');
            }
        } 
        else if (command.toLowerCase().startsWith('pins:')) {
            // Pin control command
            if (!bleConnection.isConnected) {
                this.log('Cannot send pin command: BLE not connected', 'error');
                return;
            }
            
            try {
                const params = command.substring(5).split(',').map(p => parseInt(p.trim()));
                
                if (params.length !== 3 || isNaN(params[0]) || isNaN(params[1]) || isNaN(params[2])) {
                    this.log('Invalid format. Use: pins:cell,pin,value (e.g., pins:0,2,1)', 'error');
                    return;
                }
                
                const [cell, pin, value] = params;
                
                if (cell < 0 || cell > 2 || pin < 0 || pin > 5 || (value !== 0 && value !== 1)) {
                    this.log('Invalid parameters. Cell: 0-2, Pin: 0-5, Value: 0-1', 'error');
                    return;
                }
                
                // Create direct pin command and send it using sendData
                const pinCommand = `P:${cell},${pin},${value}`;
                await bleConnection.sendData(pinCommand);
                this.log(`Set cell ${cell} pin ${pin} to ${value}`, 'success');
            } catch (error) {
                this.log(`Error sending pin command: ${error.message}`, 'error');
            }
        }
        else if (command.toLowerCase().startsWith('debug:')) {
            // Debug specific commands
            const debugParam = command.substring(6).trim().toLowerCase();
            
            if (debugParam === 'phase') {
                // Show current application phase state
                this.log(`Current phase: ${this.currentPhase}`, 'info');
                this.log(`Containers active states:`, 'info');
                
                // Inspect phase containers
                Object.keys(this.elements.phaseContainers).forEach(phase => {
                    const container = this.elements.phaseContainers[phase];
                    if (container) {
                        this.log(`- ${phase}: ${container.classList.contains('active') ? 'ACTIVE' : 'inactive'}`, 'debug');
                    }
                });
            }
            else if (debugParam === 'output') {
                // Debug output phase specifically
                this.log('Output Phase Debug Information:', 'info');
                this.log(`Current countdown value: ${this.countdownValue}`, 'debug');
                this.log(`Output timer active: ${this.outputTimer !== null}`, 'debug');
                this.log(`BLE connected: ${bleConnection.isConnected}`, 'debug');
                this.log(`Current word displayed: "${this.elements.recognizedWord.textContent}"`, 'debug');
                this.log(`Current display element contents: ${this.elements.brailleDisplay.children.length} cells`, 'debug');
            }
            else if (debugParam.startsWith('simulate')) {
                // Simulate output phase with test data
                const word = debugParam.split(':')[1] || 'test';
                this.log(`Simulating output phase with word: "${word}"`, 'info');
                
                // Find pattern for word
                const pattern = brailleTranslation.translateWord(word);
                if (pattern) {
                    this.transitionToOutputPhase(word, pattern);
                } else {
                    this.log(`No pattern found for word: ${word}`, 'error');
                }
            }
            else {
                this.log(`Unknown debug command: ${debugParam}`, 'error');
                this.log(`Available debug commands: phase, output, simulate:word`, 'info');
            }
        }
        else if (command.toLowerCase().startsWith('test:')) {
            // Test commands
            const testParam = command.substring(5).trim().toLowerCase();
            
            if (!testParam) {
                this.log('Please specify a test parameter (e.g., test:a, test:alphabet, test:numbers)', 'error');
                return;
            }
            
            try {
                if (testParam === 'alphabet') {
                    this.log('Running alphabet test...', 'info');
                    const container = document.createElement('div');
                    container.className = 'debug-braille-output';
                    this.elements.debugOutput.appendChild(container);
                    
                    await brailleTranslation.runAlphabetAndNumbersTest(
                        container, 
                        bleConnection.isConnected ? pattern => bleConnection.sendBraillePattern(pattern) : null
                    );
                    
                    this.log('Alphabet test complete', 'success');
                } 
                else if (testParam === 'numbers') {
                    this.log('Running numbers test...', 'info');
                    const container = document.createElement('div');
                    container.className = 'debug-braille-output';
                    this.elements.debugOutput.appendChild(container);
                    
                    const numbers = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
                    
                    for (const num of numbers) {
                        const pattern = brailleTranslation.translateWord(num);
                        if (pattern) {
                            this.log(`Testing number: ${num}`, 'info');
                            brailleTranslation.renderBrailleCells(pattern, container);
                            
                            if (bleConnection.isConnected) {
                                await bleConnection.sendBraillePattern(pattern);
                            }
                            
                            await new Promise(resolve => setTimeout(resolve, 800));
                        }
                    }
                    
                    this.log('Numbers test complete', 'success');
                } 
                else {
                    // Test a single character or word
                    const pattern = brailleTranslation.translateWord(testParam);
                    
                    if (pattern) {
                        this.log(`Testing pattern for: ${testParam}`, 'info');
                        
                        const container = document.createElement('div');
                        container.className = 'debug-braille-output';
                        
                        // Create word label
                        const label = document.createElement('div');
                        label.className = 'debug-braille-label';
                        label.textContent = testParam;
                        container.appendChild(label);
                        
                        // Render braille pattern
                        brailleTranslation.renderBrailleCells(pattern, container);
                        
                        this.elements.debugOutput.appendChild(container);
                        
                        // Send to hardware if connected
                        if (bleConnection.isConnected) {
                            await bleConnection.sendBraillePattern(pattern);
                        }
                    } else {
                        this.log(`No pattern found for: ${testParam}`, 'error');
                        
                        // Try to be more helpful with suggestions
                        this.log(`Trying to find alternative options...`, 'info');
                        
                        // Try letter by letter if it's a multi-character word
                        if (testParam.length > 1) {
                            this.log(`Breaking down "${testParam}" into individual letters:`, 'info');
                            let foundAny = false;
                            
                            for (const letter of testParam) {
                                const letterPattern = brailleTranslation.translateWord(letter);
                                if (letterPattern) {
                                    foundAny = true;
                                    this.log(`- Letter "${letter}" found in database`, 'success');
                                } else {
                                    this.log(`- Letter "${letter}" not found in database`, 'warning');
                                }
                            }
                            
                            if (foundAny) {
                                this.log(`Tip: Try testing individual letters (e.g., test:${testParam[0]})`, 'info');
                            }
                        }
                        
                        // Suggest using the search command for more details
                        this.log(`Tip: Use 'search:${testParam}' to search the database with more details`, 'info');
                        
                        // Try to find similar words as suggestions
                        const languages = brailleTranslation.getLanguages();
                        this.log(`Currently using language: ${brailleTranslation.currentLanguage}`, 'info');
                        this.log(`Try switching language with 'language:[${languages.join('|')}]'`, 'info');
                    }
                }
            } catch (error) {
                this.log(`Test error: ${error.message}`, 'error');
            }
        }
        else if (command.toLowerCase().startsWith('search:')) {
            const searchTerm = command.substring(7).trim();
            
            if (!searchTerm) {
                this.log('Please specify a search term (e.g., search:hello)', 'error');
                return;
            }
            
            const result = brailleTranslation.findWordInDatabase(searchTerm);
            
            if (result) {
                const container = document.createElement('div');
                container.className = 'debug-braille-output';
                
                // Format search result
                const resultHTML = `
                    <div class="search-result">
                        <h3>${result.word}</h3>
                        <ul>
                            <li><strong>Language:</strong> ${result.lang}</li>
                            <li><strong>Braille:</strong> ${result.braille || 'None'}</li>
                            <li><strong>Array:</strong> ${JSON.stringify(result.array)}</li>
                        </ul>
                    </div>
                `;
                
                container.innerHTML = resultHTML;
                
                // Add braille pattern visualization
                const patternContainer = document.createElement('div');
                patternContainer.className = 'braille-preview';
                container.appendChild(patternContainer);
                brailleTranslation.renderBrailleCells(result.array, patternContainer);
                
                this.elements.debugOutput.appendChild(container);
                
                // Send pattern to device if connected
                if (bleConnection.isConnected) {
                    const sendButton = document.createElement('button');
                    sendButton.className = 'debug-send-btn';
                    sendButton.textContent = 'Send to Device';
                    sendButton.onclick = async () => {
                        await bleConnection.sendBraillePattern(result.array);
                        this.log(`Pattern sent: ${result.word}`, 'success');
                    };
                    container.appendChild(sendButton);
                }
            } else {
                this.log(`No database entry found for: ${searchTerm}`, 'error');
            }
        }
        else if (command.toLowerCase().startsWith('language:')) {
            const language = command.substring(9).trim();
            
            if (!language) {
                // Just show available languages
                const languages = brailleTranslation.getLanguages();
                this.log(`Available languages: ${languages.join(', ')}`, 'info');
                this.log(`Current language: ${brailleTranslation.currentLanguage}`, 'info');
                return;
            }
            
            if (brailleTranslation.setLanguage(language)) {
                this.log(`Language set to: ${language}`, 'success');
            } else {
                const languages = brailleTranslation.getLanguages();
                this.log(`Invalid language: ${language}. Available options: ${languages.join(', ')}`, 'error');
            }
        }
        else if (command.toLowerCase() === 'help') {
            // Display help information
            const helpText = `
                <div class="debug-help">
                    <h3>Debug Console Commands:</h3>
                    <ul>
                        <li><code>O:[[1,2,3]]</code> - Send output pattern directly</li>
                        <li><code>N:[]</code> - Clear display (lower all dots)</li>
                        <li><code>pins:cell,pin,value</code> - Control individual pin (e.g., pins:0,2,1)</li>
                        <li><code>test:x</code> - Test character or word (e.g., test:a)</li>
                        <li><code>test:alphabet</code> - Run through entire alphabet</li>
                        <li><code>test:numbers</code> - Test all number representations</li>
                        <li><code>search:word</code> - Search database for a word</li>
                        <li><code>language:X</code> - Set or view language (e.g., language:UEB)</li>
                        <li><code>debug:phase</code> - Show current app phase state</li>
                        <li><code>debug:output</code> - Show output phase debug info</li>
                        <li><code>debug:simulate:word</code> - Simulate output phase with word</li>
                        <li><code>clear</code> - Clear the console</li>
                        <li><code>help</code> - Show this help text</li>
                    </ul>
                </div>
            `;
            const helpElement = document.createElement('div');
            helpElement.innerHTML = helpText;
            this.elements.debugOutput.appendChild(helpElement);
        }
        else if (command.toLowerCase() === 'clear') {
            this.elements.debugOutput.innerHTML = '';
        }
        else {
            this.log(`Unknown command: ${command}`, 'error');
            this.log('Type "help" to see available commands', 'info');
        }
        
        // Scroll to bottom after command execution
        this.elements.debugOutput.scrollTop = this.elements.debugOutput.scrollHeight;
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
     * @param {string} type - Log type (info, error, warning, debug)
     */
    log(message, type = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        const logElement = document.createElement('div');
        logElement.className = `log-entry ${type}`;
        
        // For debug messages, add detailed timestamp with milliseconds
        if (type === 'debug') {
            const detailedTime = new Date().toISOString().split('T')[1].split('Z')[0];
            logElement.innerHTML = `<span class="timestamp">[${detailedTime}]</span> ${message}`;
        } else {
            logElement.innerHTML = `<span class="timestamp">[${timestamp}]</span> ${message}`;
        }
        
        this.elements.debugOutput.appendChild(logElement);
        this.elements.debugOutput.scrollTop = this.elements.debugOutput.scrollHeight;
        
        // Also log to console with appropriate method
        switch(type) {
            case 'error':
                console.error(`[${type}] ${message}`);
                break;
            case 'warning':
                console.warn(`[${type}] ${message}`);
                break;
            case 'debug':
                console.debug(`[${type}] ${message}`);
                break;
            default:
                console.log(`[${type}] ${message}`);
        }
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
        
        // Add database search UI to debug console
        this.createDatabaseSearchUI();
    }

    /**
     * Create UI elements for database search
     */
    createDatabaseSearchUI() {
        // Create search container if it doesn't exist
        let searchContainer = document.getElementById('db-search-container');
        if (!searchContainer) {
            searchContainer = document.createElement('div');
            searchContainer.id = 'db-search-container';
            searchContainer.className = 'debug-section';
            
            searchContainer.innerHTML = `
                <h3>Database Search</h3>
                <div class="search-form">
                    <input type="text" id="db-search-input" placeholder="Type a word to search">
                    <button id="db-search-button">Search</button>
                </div>
            `;
            
            // Add to debug console before the debug output
            this.elements.debugConsole.insertBefore(
                searchContainer, 
                this.elements.debugOutput
            );
            
            // Add event listener to the search button
            const searchButton = document.getElementById('db-search-button');
            const searchInput = document.getElementById('db-search-input');
            
            if (searchButton && searchInput) {
                // Search on button click
                searchButton.addEventListener('click', () => {
                    const searchTerm = searchInput.value.trim().toLowerCase();
                    if (searchTerm) {
                        const result = this.searchDatabase(searchTerm);
                        this.displayDatabaseResult(result, searchTerm);
                    }
                });
                
                // Search on Enter key
                searchInput.addEventListener('keyup', (event) => {
                    if (event.key === 'Enter') {
                        const searchTerm = searchInput.value.trim().toLowerCase();
                        if (searchTerm) {
                            const result = this.searchDatabase(searchTerm);
                            this.displayDatabaseResult(result, searchTerm);
                        }
                    }
                });
            }
        }
    }
}

// Initialize the app when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new SpeechToBrailleApp();
});
