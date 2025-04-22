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
            connectButton: document.getElementById('connect-ble'),
            introCountdown: document.getElementById('intro-countdown'),
            interimResult: document.getElementById('interim-result'),
            finalResult: document.getElementById('final-result'),
            recognizedWord: document.getElementById('recognized-word'),
            brailleDisplay: document.getElementById('braille-display'),
            audioWave: document.querySelector('.audio-wave'),
            permissionStatus: document.querySelector('.permission-status'),
            grantPermissionButton: document.getElementById('grant-permission'),
            debugToggle: document.getElementById('toggle-debug'),
            debugConsole: document.getElementById('debug-console'),
            debugOutput: document.getElementById('debug-output'),
            debugCommand: document.getElementById('debug-command'),
            sendCommand: document.getElementById('send-command'),
            mainActionButton: document.getElementById('main-action-button') // Add this line for the middle button
        };
        
        // Add mobile-specific UI elements
        if (this.isMobileDevice) {
            this.createMobileUI();
        }
        
        // Initialize UI modules
        this.bleUI = new BLEUI(this);
        this.debugUI = new DebugUI(this);
        this.outputUI = new OutputUI(this);
        
        // Initialize modules
        this.initializeModules();
        
        // Bind events
        this.bindEvents();
        
        // Explicitly set up the debug console toggle
        this.setupDebugConsoleToggle();
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
            this.bleUI.setupBLECallbacks();

            // Ensure debug console exists and is properly initialized
            this.ensureDebugConsoleExists();
            
            // Create main action button if it doesn't exist
            this.createMainActionButton();
            
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
     * Create the main action button if it doesn't exist
     */
    createMainActionButton() {
        if (!this.elements.mainActionButton) {
            const mainActionButton = document.createElement('button');
            mainActionButton.id = 'main-action-button';
            mainActionButton.className = 'main-action-button';
            mainActionButton.textContent = 'Start Recording';
            
            // Add to intro phase and recording phase
            const introContent = this.elements.phaseContainers[PHASE.INTRODUCTION].querySelector('.phase-content');
            if (introContent) {
                introContent.appendChild(mainActionButton.cloneNode(true));
            }
            
            const recordingContent = this.elements.phaseContainers[PHASE.RECORDING].querySelector('.phase-content');
            if (recordingContent) {
                recordingContent.appendChild(mainActionButton);
            }
            
            this.elements.mainActionButton = mainActionButton;
        }
    }

    /**
     * Ensure debug console exists in DOM and is properly set up
     */
    ensureDebugConsoleExists() {
        // Check if debug console exists
        let debugConsole = document.getElementById('debug-console');
        if (!debugConsole) {
            this.log('Debug console not found in DOM. Creating it...', 'warning');
            
            // Create the debug console if it doesn't exist
            debugConsole = document.createElement('div');
            debugConsole.id = 'debug-console';
            debugConsole.className = 'debug-console hidden';
            
            // Create debug output area
            const debugOutput = document.createElement('div');
            debugOutput.id = 'debug-output';
            debugConsole.appendChild(debugOutput);
            
            // Create input area
            const debugInput = document.createElement('div');
            debugInput.className = 'debug-input';
            
            const input = document.createElement('input');
            input.type = 'text';
            input.id = 'debug-command';
            input.placeholder = 'Enter command...';
            
            const sendBtn = document.createElement('button');
            sendBtn.id = 'send-command';
            sendBtn.textContent = 'Send';
            
            debugInput.appendChild(input);
            debugInput.appendChild(sendBtn);
            debugConsole.appendChild(debugInput);
            
            // Add to the footer or body
            const footer = document.querySelector('footer');
            if (footer) {
                footer.appendChild(debugConsole);
            } else {
                document.body.appendChild(debugConsole);
            }
        }
        
        // Verify debug toggle button
        let toggleDebug = document.getElementById('toggle-debug');
        if (!toggleDebug) {
            this.log('Debug toggle button not found. Creating it...', 'warning');
            
            // Create toggle button
            toggleDebug = document.createElement('button');
            toggleDebug.id = 'toggle-debug';
            toggleDebug.className = 'secondary-btn';
            toggleDebug.textContent = 'Debug Console';
            
            // Add to footer or body
            const controlPanel = document.querySelector('.control-panel');
            if (controlPanel) {
                controlPanel.appendChild(toggleDebug);
            } else {
                const footer = document.querySelector('footer');
                if (footer) {
                    footer.appendChild(toggleDebug);
                } else {
                    document.body.appendChild(toggleDebug);
                }
            }
        }
        
        // Update element reference
        this.elements.debugToggle = toggleDebug;
        this.elements.debugConsole = debugConsole;
        this.elements.debugOutput = document.getElementById('debug-output');
        
        // Ensure event listener for toggle button
        toggleDebug.addEventListener('click', () => {
            debugConsole.classList.toggle('hidden');
            this.log('Debug console toggled via button', 'debug');
        });
        
        this.log('Debug console is ready and can be toggled with the debug button', 'info');
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
                    
                    // Note: We're no longer auto-transitioning here
                    // Instead the user will press the button to go to output phase
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
                    
                    // Store the current word and pattern for when the user presses the button
                    this.currentWord = lastWord;
                    this.currentPattern = pattern;
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
     * Bind UI event handlers
     */
    bindEvents() {
        // BLE connection button
        if (this.elements.connectButton) {
            this.elements.connectButton.addEventListener('click', () => {
                if (bleConnection.isConnected) {
                    bleConnection.disconnect();
                } else {
                    this.bleUI.updateBLEStatus('connecting', 'Connecting...');
                    bleConnection.connect();
                }
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
        
        // Main action button in intro phase
        const introActionButton = this.elements.phaseContainers[PHASE.INTRODUCTION].querySelector('#main-action-button');
        if (introActionButton) {
            introActionButton.addEventListener('click', () => {
                // Clear intro countdown and transition to recording
                if (this.introTimer) {
                    clearInterval(this.introTimer);
                }
                this.transitionToRecordingPhase();
            });
        }
        
        // Main action button in recording phase
        const recordingActionButton = this.elements.phaseContainers[PHASE.RECORDING].querySelector('#main-action-button');
        if (recordingActionButton) {
            recordingActionButton.addEventListener('click', () => {
                // If we have a recognized word, transition to output phase
                if (this.currentWord && this.currentPattern) {
                    this.showOutputPhase(this.currentWord, this.currentPattern);
                } else {
                    // Otherwise try to use a test word for demo
                    const testWord = "example";
                    const testPattern = brailleTranslation.translateWord(testWord);
                    if (testPattern) {
                        this.showOutputPhase(testWord, testPattern);
                    } else {
                        this.log("No word recognized yet. Please speak first.", "warning");
                    }
                }
            });
        }
        
        // Spacebar to connect/disconnect BLE (when not typing)
        document.addEventListener('keydown', (event) => {
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
        
        // Update main action button to show it's ready
        const introActionButton = this.elements.phaseContainers[PHASE.INTRODUCTION].querySelector('#main-action-button');
        if (introActionButton) {
            introActionButton.textContent = 'Start Recording';
            introActionButton.disabled = false;
        }
        
        // No auto-countdown timer now - user must press the button
    }

    /**
     * Transition to recording phase
     */
    transitionToRecordingPhase() {
        // Clear any existing timers
        if (this.introTimer) clearInterval(this.introTimer);
        if (this.outputUI && this.outputUI.outputTimer) clearInterval(this.outputUI.outputTimer);
        
        // Switch to recording phase
        this.switchPhase(PHASE.RECORDING);
        
        // Play recording start sound
        playAudioCue('recording');
        
        // Clear previous results
        this.elements.interimResult.textContent = '';
        this.elements.finalResult.textContent = '';
        
        // Reset current word and pattern
        this.currentWord = null;
        this.currentPattern = null;
        
        // Update main action button
        const recordingActionButton = this.elements.phaseContainers[PHASE.RECORDING].querySelector('#main-action-button');
        if (recordingActionButton) {
            recordingActionButton.textContent = 'Show Output';
            recordingActionButton.disabled = false;
        }
        
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

        // No automatic transition to output phase - user must press the button
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
     * Run a braille test sequence
     */ 
    async runBrailleTest() {
        this.bleUI.runBrailleTest();
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
        
        const debugOutput = document.getElementById('debug-output');
        if (debugOutput) {
            debugOutput.appendChild(logElement);
            debugOutput.scrollTop = debugOutput.scrollHeight;
        }
        
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
     * Set up the debug console toggle
     */
    setupDebugConsoleToggle() {
        if (this.elements.debugToggle && this.elements.debugConsole) {
            // Make sure the button exists and has event listener
            this.elements.debugToggle.addEventListener('click', () => {
                this.elements.debugConsole.classList.toggle('hidden');
                this.log('Debug console toggled via button', 'debug');
            });
            
            this.log('Debug console toggle set up successfully', 'info');
        } else {
            this.log('Debug console elements not found, toggle not set up', 'error');
        }
    }

    /**
     * Show the output phase with the recognized word and pattern
     * @param {string} word - The recognized word
     * @param {Array} pattern - The braille pattern
     */
    showOutputPhase(word, pattern) {
        this.log(`Showing output phase for word: "${word}"`, 'info');
        
        // Stop speech recognition if it's running
        if (speechRecognition.isListening) {
            speechRecognition.stopListening();
        }
        
        // Use the outputUI to handle the transition
        if (this.outputUI) {
            this.outputUI.transitionToOutputPhase(word, pattern);
        } else {
            this.log('Error: outputUI not initialized', 'error');
            // Fallback to just switching the phase
            this.switchPhase(PHASE.OUTPUT);
        }
    }
}

// Initialize the app when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new SpeechToBrailleApp();
});
