/**
 * Speech to Braille - Main Application 
 */

const PHASE = {
    INTRODUCTION: 'introduction',
    RECORDING: 'recording',
    OUTPUT: 'output',
    PERMISSION: 'permission'
};

// Sound service using Web Audio API
const audioFeedback = {
    context: null,
    
    init() {
        this.context = new (window.AudioContext || window.webkitAudioContext)();
        console.log('Audio feedback service initialized');
    },
    
    play(type) {
        if (!this.context) {
            this.init();
        }
        
        if (this.context.state === 'suspended') {
            this.context.resume();
        }
        
        const oscillator = this.context.createOscillator();
        const gainNode = this.context.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.context.destination);
        
        switch (type) {
            case 'recordingStart':
                // Rising tone for recording start
                oscillator.type = 'sine';
                oscillator.frequency.value = 440; // A4 note
                gainNode.gain.value = 0.1;
                oscillator.start();
                
                oscillator.frequency.linearRampToValueAtTime(587.33, this.context.currentTime + 0.15); // D5
                
                setTimeout(() => {
                    oscillator.stop();
                }, 300);
                break;
                
            case 'recordingStop':
                // Falling tone for recording stop
                oscillator.type = 'sine';
                oscillator.frequency.value = 587.33; // D5
                gainNode.gain.value = 0.1;
                oscillator.start();
                
                oscillator.frequency.linearRampToValueAtTime(440, this.context.currentTime + 0.15); // A4
                
                setTimeout(() => {
                    oscillator.stop();
                }, 300);
                break;
                
            case 'outputSuccess':
                // Two ascending tones for success
                oscillator.type = 'sine';
                oscillator.frequency.value = 783.99; // G5
                gainNode.gain.value = 0.1;
                oscillator.start();
                
                setTimeout(() => {
                    oscillator.stop();
                }, 200);
                
                setTimeout(() => {
                    const secondOscillator = this.context.createOscillator();
                    secondOscillator.connect(gainNode);
                    secondOscillator.type = 'sine';
                    secondOscillator.frequency.value = 1046.50; // C6
                    
                    secondOscillator.start();
                    setTimeout(() => {
                        secondOscillator.stop();
                    }, 300);
                }, 200);
                break;
                
            case 'outputFailure':
                // Error sound - falling tone
                oscillator.type = 'triangle';
                oscillator.frequency.value = 220; // A3 note
                gainNode.gain.value = 0.1;
                oscillator.start();
                
                setTimeout(() => {
                    oscillator.stop();
                }, 200);
                
                setTimeout(() => {
                    const secondOscillator = this.context.createOscillator();
                    secondOscillator.connect(gainNode);
                    secondOscillator.type = 'sawtooth';
                    secondOscillator.frequency.value = 174.61; // F3
                    
                    secondOscillator.start();
                    setTimeout(() => {
                        secondOscillator.stop();
                    }, 300);
                }, 250);
                break;
                
            case 'connection':
                // Connection success sound
                oscillator.type = 'sine';
                oscillator.frequency.value = 440; // A4
                gainNode.gain.value = 0.1;
                oscillator.start();
                
                setTimeout(() => {
                    oscillator.stop();
                }, 100);
                
                setTimeout(() => {
                    const secondOscillator = this.context.createOscillator();
                    secondOscillator.connect(gainNode);
                    secondOscillator.type = 'sine';
                    secondOscillator.frequency.value = 880; // A5
                    
                    secondOscillator.start();
                    setTimeout(() => {
                        secondOscillator.stop();
                    }, 200);
                }, 100);
                break;
                
            default:
                console.warn('Unknown sound type:', type);
        }
        
        return true;
    }
};

class SpeechToBrailleApp {
    constructor() {
        // Current application state
        this.currentPhase = PHASE.INTRODUCTION;
        this.introTimer = null;
        this.outputTimer = null;
        this.countdownValue = 8; // seconds
        this.isPressToTalk = false;
        this.isMobileDevice = this.checkIfMobile();
        this.isRunningTest = false;
        this.listeningDuration = 5000; // 5 seconds of listening time
        this.isListeningActive = false;
        this.listeningTimer = null;
        
        // Phase timer properties
        this.phaseStartTime = Date.now();
        this.phaseTimer = null;
        this.accumulatedListeningTime = 0;
        this.lastFromOutput = false;
        
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
            testButton: document.getElementById('braille-test-btn'),
            
            // Phase timer elements
            phaseTimer: document.getElementById('phase-timer'),
            phaseTimerValue: document.getElementById('phase-timer-value'),
            currentPhaseName: document.getElementById('current-phase-name')
        };
        
        if (this.isMobileDevice) {
            this.createMobileUI();
        }
        
        // Initialize audio feedback
        audioFeedback.init();
        
        this.initializeModules();
        this.bindEvents();
        this.setupUIControls();
    }

    checkIfMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }

    createMobileUI() {
        const talkButton = document.createElement('button');
        talkButton.id = 'press-to-talk';
        talkButton.className = 'talk-button';
        talkButton.innerHTML = '<span>Press to Talk</span>';
        
        const audioLevel = document.createElement('div');
        audioLevel.id = 'audio-level';
        audioLevel.className = 'audio-level';
        audioLevel.innerHTML = '<div class="level-bar"></div>';
        
        const networkStatus = document.createElement('div');
        networkStatus.id = 'network-status';
        networkStatus.className = 'status-indicator online';
        networkStatus.innerHTML = '<span class="status-dot"></span><span class="status-text">Online</span>';
        
        const recordingContent = this.elements.phaseContainers[PHASE.RECORDING].querySelector('.phase-content');
        if (recordingContent) {
            recordingContent.appendChild(audioLevel);
            recordingContent.appendChild(talkButton);
            
            const header = document.querySelector('header');
            if (header) {
                header.appendChild(networkStatus);
            }
        }
        
        this.elements.talkButton = talkButton;
        this.elements.audioLevel = audioLevel;
        this.elements.networkStatus = networkStatus;
        
        this.isPressToTalk = true;
    }

    async initializeModules() {
        try {
            const brailleInitialized = await brailleTranslation.initialize();
            this.log(`Braille translation initialized: ${brailleInitialized}`);
            
            const speechInitialized = speechRecognition.initialize();
            this.log(`Speech recognition initialized: ${speechInitialized}`);
            
            this.setupSpeechRecognition();
            this.setupBLECallbacks();
            
            const permissionStatus = await speechRecognition.checkMicrophonePermission();
            if (permissionStatus === 'granted') {
                this.startIntroductionPhase();
            } else {
                this.switchPhase(PHASE.PERMISSION);
            }
            
            this.log('App initialization complete');
        } catch (error) {
            this.log(`Error initializing modules: ${error.message}`, 'error');
            console.error('Initialization error:', error);
        }
    }

    setupSpeechRecognition() {
        speechRecognition.setOnInterimResult((result) => {
            this.elements.interimResult.textContent = result;
            this.animateAudioWave(true);
            this.updateAudioLevel();
        });
        
        speechRecognition.setOnWordDetected((word, confidence, isFinal) => {
            console.log(`Word detected: "${word}" (${isFinal ? 'final' : 'interim'}) with confidence ${confidence}`);
            
            if (word.length >= 2) {
                const match = brailleTranslation.translateWord(word);
                
                if (match) {
                    this.log(`Found braille match for ${isFinal ? 'final' : 'interim'} word: ${word} (confidence: ${confidence.toFixed(2)})`);
                    
                    this.elements.finalResult.textContent = `Detected: ${word} (${(confidence * 100).toFixed(0)}%)`;
                    
                    this.flashWordFound(word);
                    this.transitionToOutputPhase(word, match);
                }
            }
        });
        
        speechRecognition.setOnFinalResult((result, confidence) => {
            this.elements.finalResult.textContent = result;
            
            const words = speechRecognition.extractWords(result);
            
            if (words.length > 0) {
                const lastWord = words[words.length - 1];
                const match = brailleTranslation.translateWord(lastWord);
                
                if (match) {
                    this.log(`Found braille match for final word: ${lastWord} (confidence: ${confidence.toFixed(2)})`);
                    this.flashWordFound(lastWord);
                    this.transitionToOutputPhase(lastWord, match);
                }
            }
        });
        
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
        
        speechRecognition.setOnPermissionChange((status) => {
            this.log(`Microphone permission status changed to: ${status}`);
            this.updatePermissionUI(status);
            
            if (status === 'granted' && this.currentPhase === PHASE.PERMISSION) {
                this.startIntroductionPhase();
            }
        });
        
        speechRecognition.setOnNetworkStatusChange((status) => {
            this.log(`Network status changed to: ${status}`);
            this.updateNetworkStatusUI(status);
        });
    }

    flashWordFound(word) {
        const wordIndicator = document.createElement('div');
        wordIndicator.className = 'word-found-indicator';
        wordIndicator.textContent = `Match found: "${word}"`;
        
        const recordingContent = this.elements.phaseContainers[PHASE.RECORDING].querySelector('.phase-content');
        if (recordingContent) {
            recordingContent.appendChild(wordIndicator);
            
            setTimeout(() => {
                if (wordIndicator.parentNode) {
                    wordIndicator.parentNode.removeChild(wordIndicator);
                }
            }, 2000);
        }
    }

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

    bindEvents() {
        this.elements.connectButton.addEventListener('click', () => {
            if (bleConnection.isConnected) {
                bleConnection.disconnect();
            } else {
                this.updateBLEStatus('connecting', 'Connecting...');
                bleConnection.connect();
            }
        });
        
        this.elements.testButton.addEventListener('click', () => {
            this.runBrailleTest();
        });
        
        this.elements.debugToggle.addEventListener('click', () => {
            this.elements.debugConsole.classList.toggle('hidden');
        });
        
        this.elements.sendCommand.addEventListener('click', () => {
            const command = this.elements.debugCommand.value.trim();
            if (command) {
                this.sendDebugCommand(command);
                this.elements.debugCommand.value = '';
            }
        });
        
        this.elements.debugCommand.addEventListener('keyup', (event) => {
            if (event.key === 'Enter') {
                const command = this.elements.debugCommand.value.trim();
                if (command) {
                    this.sendDebugCommand(command);
                    this.elements.debugCommand.value = '';
                }
            }
        });
        
        this.elements.runSpeedTest.addEventListener('click', () => {
            this.runBLESpeedTest();
        });
        
        if (this.elements.talkButton) {
            this.elements.talkButton.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleTalkButtonClick();
            });
        }
        
        document.addEventListener('keydown', (event) => {
            if (event.key === 'F12') {
                event.preventDefault();
                this.elements.debugConsole.classList.toggle('hidden');
            }
            
            if (event.code === 'Space' && document.activeElement.tagName !== 'INPUT') {
                event.preventDefault();
                if (bleConnection.isConnected) {
                    bleConnection.disconnect();
                } else {
                    bleConnection.connect();
                }
            }
        });
        
        if (this.elements.grantPermissionButton) {
            this.elements.grantPermissionButton.addEventListener('click', () => {
                this.requestMicrophonePermission();
            });
        }
    }

    handleTalkButtonClick() {
        if (this.currentPhase !== PHASE.RECORDING) return;
        
        if (this.isListeningActive) {
            // If already listening, stop it
            this.stopListeningSession();
        } else {
            // Start a new listening session
            this.startListeningSession();
        }
    }

    startListeningSession() {
        if (this.listeningTimer) {
            clearTimeout(this.listeningTimer);
        }
        
        this.isListeningActive = true;
        this.updateTalkButtonState(true);
        
        speechRecognition.startListening();
        
        this.elements.interimResult.textContent = '';
        this.elements.finalResult.textContent = '';
        
        this.listeningTimer = setTimeout(() => {
            this.stopListeningSession();
        }, this.listeningDuration);
        
        this.startListeningCountdown(this.listeningDuration / 1000);
        
        this.log(`Listening for ${this.listeningDuration/1000} seconds...`);
        audioFeedback.play('recordingStart');
    }

    stopListeningSession() {
        if (this.listeningTimer) {
            clearTimeout(this.listeningTimer);
            this.listeningTimer = null;
        }
        
        this.stopListeningCountdown();
        
        this.isListeningActive = false;
        this.updateTalkButtonState(false);
        
        speechRecognition.stopListening();
        
        audioFeedback.play('recordingStop');
        
        this.log('Listening session ended');
    }

    startListeningCountdown(seconds) {
        let countdownElement = document.getElementById('listening-countdown');
        if (!countdownElement) {
            countdownElement = document.createElement('div');
            countdownElement.id = 'listening-countdown';
            countdownElement.className = 'listening-countdown';
            this.elements.phaseContainers[PHASE.RECORDING].appendChild(countdownElement);
        }
        
        let count = seconds;
        countdownElement.textContent = `${count}s`;
        countdownElement.style.display = 'block';
        
        this.countdownInterval = setInterval(() => {
            count--;
            countdownElement.textContent = `${count}s`;
            
            if (count <= 0) {
                this.stopListeningCountdown();
            }
        }, 1000);
    }

    stopListeningCountdown() {
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
            this.countdownInterval = null;
        }
        
        const countdownElement = document.getElementById('listening-countdown');
        if (countdownElement) {
            countdownElement.style.display = 'none';
        }
    }

    updateTalkButtonState(isListening) {
        if (!this.elements.talkButton) return;
        
        if (isListening) {
            this.elements.talkButton.classList.add('active');
            this.elements.talkButton.querySelector('span').textContent = 'Listening...';
        } else {
            this.elements.talkButton.classList.remove('active');
            this.elements.talkButton.querySelector('span').textContent = 'Press to Talk';
        }
    }

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
            
            this.startIntroductionPhase();
        } else {
            this.log('Microphone permission denied', 'error');
            this.elements.permissionStatus.textContent = 'Permission denied. Please enable microphone access in your browser settings.';
            this.updatePermissionUI('denied');
        }
    }

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

    startIntroductionPhase() {
        this.switchPhase(PHASE.INTRODUCTION);
        
        this.countdownValue = 8;
        this.elements.introCountdown.textContent = this.countdownValue;
        
        speechRecognition.speak('Welcome to Speech to Braille', {
            rate: 1.1
        });
        
        this.introTimer = setInterval(() => {
            this.countdownValue--;
            this.elements.introCountdown.textContent = this.countdownValue;
            
            if (this.countdownValue <= 0) {
                clearInterval(this.introTimer);
                this.transitionToRecordingPhase();
            }
        }, 1000);
    }

    transitionToRecordingPhase() {
        if (this.introTimer) clearInterval(this.introTimer);
        if (this.outputTimer) clearInterval(this.outputTimer);
        
        this.switchPhase(PHASE.RECORDING);
        
        audioFeedback.play('recordingStart');
        
        this.elements.interimResult.textContent = '';
        this.elements.finalResult.textContent = '';
        
        if (this.isPressToTalk) {
            this.log('Ready for press-to-talk input');
            const instructionEl = document.createElement('div');
            instructionEl.className = 'instruction-text';
            instructionEl.textContent = 'Press and hold the button to speak';
            
            const recordingContent = this.elements.phaseContainers[PHASE.RECORDING].querySelector('.phase-content');
            if (recordingContent && !recordingContent.querySelector('.instruction-text')) {
                recordingContent.insertBefore(instructionEl, recordingContent.firstChild.nextSibling);
            }
        } else {
            speechRecognition.startListening();
        }
        
        this.animateAudioWave(false);
        
        setTimeout(() => {
            if (this.isPressToTalk) {
                speechRecognition.speak('Press and hold to speak', { rate: 1.2 });
            } else {
                speechRecognition.speak('I\'m listening', { rate: 1.2 });
            }
        }, 500);
    }

    transitionToOutputPhase(word, match) {
        this.log(`BEGIN OUTPUT PHASE TRANSITION for word: "${word}"`, 'debug');
        
        if (!match || !match.array) {
            this.log("ERROR: Null pattern provided to output phase", 'error');
            console.error("Attempted to transition to output phase with null pattern");
            return;
        }
        
        this.log(`Pattern details: ${JSON.stringify(match.array)}`, 'debug');
        this.log(`Match language: ${match.lang}`, 'debug');
        
        if (this.isListeningActive) {
            this.stopListeningSession();
        }
        
        if (this.introTimer) {
            clearInterval(this.introTimer);
            this.log("Intro timer cleared", 'debug');
        }
        if (this.outputTimer) {
            clearInterval(this.outputTimer);
            this.log("Output timer cleared", 'debug');
        }
        
        speechRecognition.stopListening();
        this.log("Speech recognition stopped for output phase", 'debug');
        
        if (match && match.array) {
            audioFeedback.play('outputSuccess');
            this.log("Output success sound played", 'debug');
        } else {
            audioFeedback.play('outputFailure');
            this.log("Output failure sound played", 'debug');
        }
        
        this.log(`Switching to OUTPUT phase`, 'debug');
        this.switchPhase(PHASE.OUTPUT);
        
        this.elements.recognizedWord.textContent = word;
        this.log(`Word text set in UI: "${word}"`, 'debug');
        
        const wordInfo = document.createElement('div');
        wordInfo.className = 'word-info';
        wordInfo.innerHTML = `<span class="word-language">${match.lang || brailleTranslation.currentLanguage}</span>`;
        this.elements.recognizedWord.appendChild(wordInfo);
        this.log(`Word language info added: ${match.lang || brailleTranslation.currentLanguage}`, 'debug');
        
        this.elements.brailleDisplay.innerHTML = '';
        
        console.log("Braille pattern for output:", match.array);
        
        const debugInfo = document.createElement('div');
        debugInfo.className = 'debug-info';
        debugInfo.innerHTML = `
            <div class="debug-label">Pattern Data:</div>
            <pre>${JSON.stringify(match.array, null, 2)}</pre>
        `;
        this.elements.brailleDisplay.appendChild(debugInfo);
        
        this.log(`Rendering braille pattern to display`, 'debug');
        brailleTranslation.renderBrailleCells(match.array, this.elements.brailleDisplay);
        
        if (bleConnection.isConnected) {
            this.log(`Sending pattern to BLE device...`, 'debug');
            bleConnection.sendBraillePattern(match.array)
                .then(() => {
                    this.log(`Pattern successfully sent to BLE device`, 'success');
                })
                .catch(error => {
                    this.log(`ERROR sending pattern to BLE: ${error.message}`, 'error');
                });
        } else {
            this.log(`Not sending to BLE - device not connected`, 'warning');
        }
        
        speechRecognition.speak(word, { rate: 1.0 });
        this.log(`TTS started for word: "${word}"`, 'debug');
        
        this.countdownValue = 8;
        this.elements.outputCountdown.textContent = this.countdownValue;
        this.log(`Output countdown reset to ${this.countdownValue}`, 'debug');
        
        this.log(`Starting output countdown timer`, 'debug');
        this.outputTimer = setInterval(() => {
            this.countdownValue--;
            this.elements.outputCountdown.textContent = this.countdownValue;
            
            if (this.countdownValue <= 0) {
                this.log(`Output countdown reached zero, cleaning up...`, 'debug');
                clearInterval(this.outputTimer);
                
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

    switchPhase(phase) {
        // Store the previous phase before switching
        const previousPhase = this.currentPhase;
        
        Object.values(this.elements.phaseContainers).forEach(container => {
            if (container) container.classList.remove('active');
        });
        
        if (this.elements.phaseContainers[phase]) {
            this.elements.phaseContainers[phase].classList.add('active');
        }
        
        this.currentPhase = phase;
        
        // Handle phase timer
        this.pausePhaseTimer();
        
        // Reset timer if transitioning from output to recording
        if (previousPhase === PHASE.OUTPUT && phase === PHASE.RECORDING) {
            this.resetPhaseTimer();
        }
        
        // If we're going to recording phase from something other than output,
        // we don't reset the accumulated time
        if (phase === PHASE.RECORDING && previousPhase !== PHASE.OUTPUT) {
            this.lastFromOutput = false;
        }
        
        // Start the timer for the new phase
        this.startPhaseTimer();
        
        this.log(`Phase changed to: ${phase}`);
    }

    animateAudioWave(active) {
        if (active) {
            this.elements.audioWave.classList.add('listening');
        } else {
            this.elements.audioWave.classList.remove('listening');
        }
    }

    updateAudioLevel() {
        if (!this.elements.audioLevel) return;
        
        const levelBar = this.elements.audioLevel.querySelector('.level-bar');
        if (!levelBar) return;
        
        if (speechRecognition.isListening) {
            const randomLevel = 10 + Math.floor(Math.random() * 80);
            levelBar.style.width = `${randomLevel}%`;
            
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

    updateBLEStatus(status, text) {
        this.elements.bleStatus.className = `status-indicator ${status}`;
        this.elements.bleStatus.querySelector('.status-text').textContent = text;
        
        if (status === 'connected') {
            this.elements.connectButton.textContent = 'Disconnect';
        } else {
            this.elements.connectButton.textContent = 'Connect Braille Display';
        }
    }

    async runBrailleTest() {
        this.log('Starting braille test sequence');
        
        this.switchPhase(PHASE.OUTPUT);
        
        await brailleTranslation.runBrailleTest(
            this.elements.brailleDisplay,
            bleConnection.isConnected ? pattern => bleConnection.sendBraillePattern(pattern) : null
        );
        
        this.log('Braille test sequence completed');
        
        this.transitionToRecordingPhase();
    }

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
 
    displayDatabaseResult(result, searchTerm) {
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
        
        if (result.array) {
            const previewElement = resultContainer.querySelector('.braille-preview');
            brailleTranslation.renderBrailleCells(result.array, previewElement);
        }
    }

    // Debug console commands implementation
    async sendDebugCommand(command) {
        // Function implementation retained, but comments removed
        // ...existing code...
    }

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

    log(message, type = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        const logElement = document.createElement('div');
        logElement.className = `log-entry ${type}`;
        
        if (type === 'debug') {
            const detailedTime = new Date().toISOString().split('T')[1].split('Z')[0];
            logElement.innerHTML = `<span class="timestamp">[${detailedTime}]</span> ${message}`;
        } else {
            logElement.innerHTML = `<span class="timestamp">[${timestamp}]</span> ${message}`;
        }
        
        this.elements.debugOutput.appendChild(logElement);
        this.elements.debugOutput.scrollTop = this.elements.debugOutput.scrollHeight;
        
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

    setupUIControls() {
        const brailleTestBtn = document.getElementById('braille-test-btn');
        if (brailleTestBtn) {
            brailleTestBtn.addEventListener('click', async () => {
                if (this.isRunningTest) return;
                
                this.isRunningTest = true;
                brailleTestBtn.disabled = true;
                brailleTestBtn.textContent = 'Running Test...';
                
                try {
                    this.switchPhase(PHASE.OUTPUT);
                    
                    await brailleTranslation.runAlphabetAndNumbersTest(
                        this.elements.brailleDisplay,
                        pattern => bleConnection.sendBraillePattern(pattern)
                    );
                    
                    setTimeout(() => {
                        this.elements.brailleDisplay.innerHTML = '';
                    }, 1000);
                } catch (error) {
                    console.error('Error running braille test:', error);
                    this.log('Braille test error: ' + error.message, 'error');
                } finally {
                    brailleTestBtn.disabled = false;
                    brailleTestBtn.textContent = 'Test Braille Display';
                    this.isRunningTest = false;
                    
                    setTimeout(() => {
                        this.transitionToRecordingPhase();
                    }, 2000);
                }
            });
        }
        
        const clearCacheBtn = document.getElementById('clear-cache-btn');
        if (clearCacheBtn) {
            clearCacheBtn.addEventListener('click', () => {
                if (brailleTranslation.clearCache()) {
                    this.log('Braille database cache cleared', 'success');
                    
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
        
        this.createDatabaseSearchUI();
    }

    createDatabaseSearchUI() {
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
            
            this.elements.debugConsole.insertBefore(
                searchContainer, 
                this.elements.debugOutput
            );
            
            const searchButton = document.getElementById('db-search-button');
            const searchInput = document.getElementById('db-search-input');
            
            if (searchButton && searchInput) {
                searchButton.addEventListener('click', () => {
                    const searchTerm = searchInput.value.trim().toLowerCase();
                    if (searchTerm) {
                        const result = this.searchDatabase(searchTerm);
                        this.displayDatabaseResult(result, searchTerm);
                    }
                });
                
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

    // Add the phase timer methods
    startPhaseTimer() {
        // Set the initial start time
        this.phaseStartTime = Date.now();
        
        // Clear any existing timer
        if (this.phaseTimer) {
            clearInterval(this.phaseTimer);
        }
        
        // Update phase name in the timer
        const phaseName = this.currentPhase.charAt(0).toUpperCase() + this.currentPhase.slice(1);
        if (this.elements.currentPhaseName) {
            this.elements.currentPhaseName.textContent = phaseName;
        }
        
        // Update phase timer class
        if (this.elements.phaseTimer) {
            this.elements.phaseTimer.className = `phase-timer ${this.currentPhase}`;
        }
        
        // Start the interval to update the timer
        this.phaseTimer = setInterval(() => {
            this.updatePhaseTimer();
        }, 100); // Update every 100ms for smoother timer display
        
        this.updatePhaseTimer(); // Update immediately once
    }
    
    updatePhaseTimer() {
        if (!this.elements.phaseTimerValue) return;
        
        const now = Date.now();
        let elapsed;
        
        // If recording phase and not coming from output, accumulate time
        if (this.currentPhase === PHASE.RECORDING && !this.lastFromOutput) {
            elapsed = this.accumulatedListeningTime + (now - this.phaseStartTime);
        } else {
            elapsed = now - this.phaseStartTime;
        }
        
        // Format the elapsed time as mm:ss.d
        const minutes = Math.floor(elapsed / 60000);
        const seconds = Math.floor((elapsed % 60000) / 1000);
        const deciseconds = Math.floor((elapsed % 1000) / 100);
        
        const formattedTime = 
            `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${deciseconds}`;
            
        this.elements.phaseTimerValue.textContent = formattedTime;
    }
    
    resetPhaseTimer() {
        // Reset the accumulated time and set lastFromOutput flag
        this.accumulatedListeningTime = 0;
        this.lastFromOutput = true;
        this.phaseStartTime = Date.now();
        
        if (this.elements.phaseTimerValue) {
            this.elements.phaseTimerValue.textContent = "00:00.0";
        }
    }
    
    pausePhaseTimer() {
        // When transitioning from recording to output, store the accumulated time
        if (this.currentPhase === PHASE.RECORDING) {
            const now = Date.now();
            this.accumulatedListeningTime += (now - this.phaseStartTime);
        }
        
        if (this.phaseTimer) {
            clearInterval(this.phaseTimer);
            this.phaseTimer = null;
        }
    }
}

// Initialize the app when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new SpeechToBrailleApp();
});

/**
 * Main application file for Speech to Braille
 * Links speech recognition with braille translation
 */

// References to UI elements
const recognizedTextElement = document.getElementById('recognized-text');
const brailleOutputElement = document.getElementById('braille-output');
const statusElement = document.getElementById('status');

// Initialize components when the document is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing Speech to Braille application');
    
    // Initialize the braille database
    if (brailleTranslation) {
        brailleTranslation.initialize();
        console.log('Braille database initialized');
        updateStatus('Braille database loaded successfully');
    } else {
        console.error('Braille translation module not found');
        updateStatus('Error: Braille module not loaded', true);
    }
    
    // Connect to speech recognition if available
    if (window.SpeechRecognitionManager) {
        setupSpeechRecognition();
    } else if (window.webkitSpeechRecognition) {
        setupFallbackSpeechRecognition();
    } else {
        console.error('Speech recognition not supported in this browser');
        updateStatus('Error: Speech recognition not supported in this browser', true);
    }
});

/**
 * Set up the speech recognition manager
 */
function setupSpeechRecognition() {
    const speechRecognition = new SpeechRecognitionManager();
    
    // Set up callbacks for speech recognition results
    speechRecognition.setOnFinalResult((text, confidence) => {
        console.log(`Final speech result: "${text}" (confidence: ${confidence})`);
        processRecognizedText(text);
    });
    
    speechRecognition.setOnInterimResult((text) => {
        console.log(`Interim speech result: "${text}"`);
        displayRecognizedText(text, true);
    });
    
    speechRecognition.setOnWordDetected((word, confidence, isFinal) => {
        console.log(`Word detected: "${word}" (confidence: ${confidence}, final: ${isFinal})`);
        if (word && word.length >= 2) {
            processRecognizedWord(word, isFinal);
        }
    });
    
    // Set up start/stop listeners
    document.getElementById('start-button')?.addEventListener('click', () => {
        speechRecognition.startListening();
        updateStatus('Listening...');
    });
    
    document.getElementById('stop-button')?.addEventListener('click', () => {
        speechRecognition.stopListening();
        updateStatus('Listening stopped');
    });
    
    // Start listening automatically if in a supported phase
    if (window.currentPhase === 'recording') {
        speechRecognition.startListening();
        updateStatus('Listening...');
    }
}

/**
 * Process a recognized word and display braille patterns
 */
function processRecognizedWord(word, isFinal = false) {
    if (!word || word.length === 0) return;
    
    // Process the word through the braille translation module
    const match = brailleTranslation.translateWord(word);
    
    if (match) {
        console.log(`Found braille pattern for: ${word}`);
        
        // Display visual braille pattern
        if (brailleOutputElement) {
            // Clear previous output for non-final results
            if (!isFinal) {
                brailleOutputElement.innerHTML = '';
            }
            
            // Create a container for this word
            const wordContainer = document.createElement('div');
            wordContainer.className = 'braille-word';
            
            // Add the word text
            const wordText = document.createElement('div');
            wordText.className = 'word-text';
            wordText.textContent = word;
            
            // Render the braille cells
            const cellsContainer = document.createElement('div');
            cellsContainer.className = 'cells-container';
            brailleTranslation.renderBrailleCells(match, cellsContainer);
            
            // Add all elements to the container
            wordContainer.appendChild(cellsContainer);
            wordContainer.appendChild(wordText);
            brailleOutputElement.appendChild(wordContainer);
            
            // Send to hardware if BLE connection is available
            if (window.bleConnection && typeof window.bleConnection.sendBraillePattern === 'function') {
                console.log('Sending to braille display:', match);
                window.bleConnection.sendBraillePattern(JSON.stringify(match));
            }
        }
    } else {
        console.log(`No braille pattern found for: ${word}`);
    }
}

/**
 * Process full recognized text
 */
function processRecognizedText(text) {
    if (!text || text.length === 0) return;
    
    // Display the recognized text
    displayRecognizedText(text, false);
    
    // Process through the braille translation
    const results = brailleTranslation.processRecognizedSpeech(text);
    
    if (results && results.length > 0) {
        // Display the most recent word with a pattern
        const matchingResults = results.filter(r => r.found);
        if (matchingResults.length > 0) {
            const lastMatch = matchingResults[matchingResults.length - 1];
            
            // Render the braille pattern for the matched word
            if (brailleOutputElement) {
                brailleOutputElement.innerHTML = '';
                
                const wordContainer = document.createElement('div');
                wordContainer.className = 'braille-word';
                
                const wordText = document.createElement('div');
                wordText.className = 'word-text';
                wordText.textContent = lastMatch.word;
                
                const cellsContainer = document.createElement('div');
                cellsContainer.className = 'cells-container';
                brailleTranslation.renderBrailleCells(lastMatch.array, cellsContainer);
                
                wordContainer.appendChild(cellsContainer);
                wordContainer.appendChild(wordText);
                brailleOutputElement.appendChild(wordContainer);
                
                // Send to hardware if available
                if (window.bleConnection && typeof window.bleConnection.sendBraillePattern === 'function') {
                    console.log('Sending to braille display:', lastMatch.array);
                    window.bleConnection.sendBraillePattern(JSON.stringify(lastMatch.array));
                }
            }
        }
    }
}

/**
 * Display recognized text in the UI
 */
function displayRecognizedText(text, isInterim = false) {
    if (!recognizedTextElement) return;
    
    if (isInterim) {
        recognizedTextElement.innerHTML = `<p>${text} <span class="interim-indicator">...</span></p>`;
    } else {
        recognizedTextElement.innerHTML = `<p>${text}</p>`;
    }
}

/**
 * Update status message
 */
function updateStatus(message, isError = false) {
    if (!statusElement) return;
    
    statusElement.textContent = message;
    statusElement.className = isError ? 'status error' : 'status';
}
