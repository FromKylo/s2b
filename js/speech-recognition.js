/**
 * Speech Recognition Module
 * Handles speech recognition using the Web Speech API
 * Enhanced for better mobile device support
 */

class SpeechRecognitionManager {
    constructor() {
        this.recognition = null;
        this.isListening = false;
        this.userStoppedListening = false;
        this.interimResult = '';
        this.finalResult = '';
        this.onInterimResultCallback = null;
        this.onFinalResultCallback = null;
        this.onStartListeningCallback = null;
        this.onStopListeningCallback = null;
        this.onPermissionChangeCallback = null;
        this.onNetworkStatusChangeCallback = null;
        this.synth = window.speechSynthesis;
        this.recognitionTimeout = null;
        this.permissionStatus = 'unknown'; // 'unknown', 'granted', 'denied', 'prompt'
        this.networkStatus = navigator.onLine ? 'online' : 'offline';
        this.recoveryAttempts = 0;
        this.maxRecoveryAttempts = 3;
        this.isUsingFallback = false;
        this.lastProcessedInterim = ''; // Track last processed interim result to avoid duplicates
        this.confidenceThreshold = 0.5; // Minimum confidence threshold for processing
        this.minWordLength = 2; // Minimum word length to process
        
        // Listen for network status changes
        window.addEventListener('online', () => this.handleNetworkChange('online'));
        window.addEventListener('offline', () => this.handleNetworkChange('offline'));
    }

    /**
     * Check if speech recognition is supported
     */
    isSpeechRecognitionSupported() {
        return 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
    }

    /**
     * Check microphone permission status
     */
    async checkMicrophonePermission() {
        try {
            // Try using the Permissions API first (more modern approach)
            if ('permissions' in navigator) {
                const permResult = await navigator.permissions.query({ name: 'microphone' });
                
                this.permissionStatus = permResult.state;
                console.log(`Microphone permission status: ${this.permissionStatus}`);
                
                // Monitor for permission changes
                permResult.addEventListener('change', () => {
                    this.permissionStatus = permResult.state;
                    if (this.onPermissionChangeCallback) {
                        this.onPermissionChangeCallback(this.permissionStatus);
                    }
                    console.log(`Permission status changed to: ${this.permissionStatus}`);
                });
                
                return this.permissionStatus;
            } else {
                // Fallback for browsers not supporting the Permissions API
                console.log('Permissions API not supported, using MediaDevices API');
                
                // Try to access the microphone to trigger the permission prompt
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                    stream.getTracks().forEach(track => track.stop());
                    this.permissionStatus = 'granted';
                    return 'granted';
                } catch (err) {
                    this.permissionStatus = 'denied';
                    console.error('Error accessing microphone:', err);
                    return 'denied';
                }
            }
        } catch (error) {
            console.error('Error checking microphone permission:', error);
            return 'unknown';
        }
    }

    /**
     * Request microphone access explicitly
     */
    async requestMicrophoneAccess() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.getTracks().forEach(track => track.stop());
            this.permissionStatus = 'granted';
            return true;
        } catch (error) {
            this.permissionStatus = 'denied';
            console.error('Error requesting microphone access:', error);
            return false;
        }
    }

    /**
     * Initialize speech recognition
     */
    initialize() {
        // Check if browser supports speech recognition
        if (!this.isSpeechRecognitionSupported()) {
            console.error('Speech recognition not supported in this browser.');
            this.isUsingFallback = true;
            return false;
        }
        
        // Create SpeechRecognition object
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        
        this.recognition = new SpeechRecognition();
        this.recognition.lang = 'en-US';
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        
        // Setup event handlers
        this.recognition.onstart = () => {
            this.isListening = true;
            this.userStoppedListening = false;
            console.log('Speech recognition started');
            if (this.onStartListeningCallback) this.onStartListeningCallback();
        };
        
        this.recognition.onend = () => {
            this.isListening = false;
            console.log('Speech recognition ended');
            
            if (this.onStopListeningCallback) this.onStopListeningCallback();
            
            // Auto restart if we didn't stop manually and still need to be listening
            if (!this.userStoppedListening && this.recoveryAttempts < this.maxRecoveryAttempts) {
                console.log(`Auto-recovery attempt ${this.recoveryAttempts + 1}/${this.maxRecoveryAttempts}`);
                this.recoveryAttempts++;
                
                // Add increasing delay between recovery attempts
                const delay = 500 * this.recoveryAttempts;
                console.log(`Attempting to restart recognition in ${delay}ms`);
                
                clearTimeout(this.recognitionTimeout);
                this.recognitionTimeout = setTimeout(() => {
                    try {
                        this.recognition.start();
                        console.log('Recognition restarted successfully');
                    } catch (e) {
                        console.error('Error restarting recognition:', e);
                    }
                }, delay);
            } else if (this.recoveryAttempts >= this.maxRecoveryAttempts) {
                console.error('Max recovery attempts reached. Please restart manually.');
            }
        };
        
        this.recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            
            // Handle specific errors
            switch(event.error) {
                case 'not-allowed':
                    this.permissionStatus = 'denied';
                    console.log('Microphone permission denied');
                    if (this.onPermissionChangeCallback) {
                        this.onPermissionChangeCallback('denied');
                    }
                    break;
                    
                case 'network':
                    console.log('Network error detected in speech recognition');
                    this.handleNetworkChange('unstable');
                    break;
                    
                case 'no-speech':
                    console.log('No speech detected');
                    // This is a normal condition, not a critical error
                    break;
                    
                case 'aborted':
                    console.log('Speech recognition aborted');
                    this.userStoppedListening = true;
                    break;
                    
                default:
                    // For other errors, increment recovery attempts
                    this.recoveryAttempts++;
            }
        };
        
        this.recognition.onresult = (event) => {
            // Reset recovery attempts on successful results
            this.recoveryAttempts = 0;
            
            let interim = '';
            let final = '';
            
            // Process results
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript.trim();
                const confidence = event.results[i][0].confidence;
                
                if (event.results[i].isFinal) {
                    final = transcript;
                    this.finalResult = transcript;
                    console.log('Final result:', final, 'Confidence:', confidence);
                    
                    if (this.onFinalResultCallback) {
                        this.onFinalResultCallback(final, confidence);
                    }
                } else {
                    interim = transcript;
                    
                    // Process individual words from interim results immediately
                    // This is key for better real-time word detection
                    if (interim !== this.lastProcessedInterim && confidence >= this.confidenceThreshold) {
                        this.lastProcessedInterim = interim;
                        
                        // Extract individual words for processing
                        const words = this.extractWords(interim);
                        if (words.length > 0) {
                            const lastWord = words[words.length - 1];
                            
                            // Only process words that are complete enough
                            if (lastWord && lastWord.length >= this.minWordLength) {
                                console.log('Potential interim word:', lastWord, 'Confidence:', confidence);
                                
                                // Use a separate callback for individual words
                                if (this.onWordDetectedCallback) {
                                    this.onWordDetectedCallback(lastWord, confidence, false); // false = interim
                                }
                            }
                        }
                    }
                }
            }
            
            if (interim !== '') {
                this.interimResult = interim;
                console.log('Interim result:', interim);
                
                if (this.onInterimResultCallback) {
                    this.onInterimResultCallback(interim);
                }
            }
        };
        
        // Check permission initially
        this.checkMicrophonePermission().then(permStatus => {
            if (this.onPermissionChangeCallback) {
                this.onPermissionChangeCallback(permStatus);
            }
        });
        
        return true;
    }

    /**
     * Extract individual words from a transcript
     * @param {string} text - The text to extract words from
     * @returns {Array} - Array of individual words
     */
    extractWords(text) {
        if (!text) return [];
        
        // Remove punctuation and split by whitespace
        return text.toLowerCase()
            .replace(/[.,!?;:]/g, '')
            .split(/\s+/)
            .filter(word => word.length > 0);
    }

    /**
     * Set callback for individual word detection
     * @param {Function} callback - Function to call when a word is detected
     */
    setOnWordDetected(callback) {
        this.onWordDetectedCallback = callback;
    }

    /**
     * Analyze interim result to extract meaningful words
     * This helps with more accurate word detection from partial speech
     * @param {string} text - The interim text to analyze
     * @returns {Array} - Array of potential complete words
     */
    analyzeInterimResult(text) {
        if (!text) return [];
        
        const words = this.extractWords(text);
        const potentialWords = [];
        
        // Filter for words that are likely complete
        for (const word of words) {
            if (word.length >= this.minWordLength) {
                potentialWords.push(word);
            }
        }
        
        return potentialWords;
    }

    /**
     * Start listening for speech with manual control
     */
    startListening() {
        if (this.isListening) {
            console.log('Already listening, ignoring start request');
            return true;
        }
        
        // Reset recovery attempts
        this.recoveryAttempts = 0;
        this.userStoppedListening = false;
        
        if (!this.recognition) {
            if (!this.initialize()) {
                console.error('Failed to initialize speech recognition');
                return false;
            }
        }
        
        // Check microphone permission status first
        return this.checkMicrophonePermission().then(status => {
            if (status === 'granted') {
                try {
                    this.recognition.start();
                    return true;
                } catch (error) {
                    console.error('Error starting speech recognition:', error);
                    
                    // Handle the "already running" error specifically
                    if (error.name === 'InvalidStateError') {
                        console.log('Recognition was already running, stopping and restarting');
                        this.recognition.stop();
                        setTimeout(() => {
                            try {
                                this.recognition.start();
                            } catch (e) {
                                console.error('Error on second start attempt:', e);
                            }
                        }, 200);
                        return true;
                    }
                    
                    return false;
                }
            } else if (status === 'prompt') {
                console.log('Microphone permission will be requested');
                try {
                    this.recognition.start(); // This will trigger the permission prompt
                    return true;
                } catch (error) {
                    console.error('Error starting speech recognition:', error);
                    return false;
                }
            } else {
                console.error('Microphone permission denied');
                if (this.onPermissionChangeCallback) {
                    this.onPermissionChangeCallback('denied');
                }
                return false;
            }
        }).catch(error => {
            console.error('Error checking microphone permission:', error);
            return false;
        });
    }

    /**
     * Start listening with a press-to-talk approach (more reliable on mobile)
     * @param {number} duration - Maximum duration in ms (0 for unlimited)
     */
    startListeningForDuration(duration = 0) {
        const startSuccess = this.startListening();
        
        if (startSuccess && duration > 0) {
            // Set a timeout to stop listening after the specified duration
            clearTimeout(this.recognitionTimeout);
            this.recognitionTimeout = setTimeout(() => {
                console.log(`Stopping recognition after ${duration}ms duration`);
                this.stopListening();
            }, duration);
        }
        
        return startSuccess;
    }

    /**
     * Stop listening for speech
     */
    stopListening() {
        if (!this.isListening || !this.recognition) {
            console.log('Not currently listening');
            return false;
        }
        
        try {
            // Mark as user-initiated stop to prevent auto-restart
            this.userStoppedListening = true;
            
            // Clear any pending timeouts
            clearTimeout(this.recognitionTimeout);
            
            this.recognition.stop();
            return true;
        } catch (error) {
            console.error('Error stopping speech recognition:', error);
            return false;
        }
    }

    /**
     * Reset the recognition system
     */
    reset() {
        this.stopListening();
        
        this.interimResult = '';
        this.finalResult = '';
        this.recoveryAttempts = 0;
        
        // Recreate the recognition object
        if (this.isSpeechRecognitionSupported()) {
            this.recognition = null;
            this.initialize();
        }
        
        console.log('Speech recognition reset');
    }

    /**
     * Handle network status changes
     * @param {string} status - Network status ('online', 'offline', 'unstable')
     */
    handleNetworkChange(status) {
        console.log(`Network status changed: ${status}`);
        this.networkStatus = status;
        
        if (this.onNetworkStatusChangeCallback) {
            this.onNetworkStatusChangeCallback(status);
        }
        
        // If speech recognition is active, handle the change
        if (this.isListening) {
            if (status === 'offline') {
                // Consider fallback methods when offline
                console.log('Network is offline, recognition may be limited');
            } else if (status === 'online') {
                // Restart recognition with online parameters
                console.log('Network is back online, resetting recognition');
                this.reset();
                if (this.isListening) {
                    setTimeout(() => this.startListening(), 500);
                }
            }
        }
    }

    /**
     * Set callback for interim recognition results
     * @param {Function} callback - Function to call with interim results
     */
    setOnInterimResult(callback) {
        this.onInterimResultCallback = callback;
    }

    /**
     * Set callback for final recognition results
     * @param {Function} callback - Function to call with final results
     */
    setOnFinalResult(callback) {
        this.onFinalResultCallback = callback;
    }

    /**
     * Set callback for when listening starts
     * @param {Function} callback - Function to call when listening starts
     */
    setOnStartListening(callback) {
        this.onStartListeningCallback = callback;
    }

    /**
     * Set callback for when listening stops
     * @param {Function} callback - Function to call when listening stops
     */
    setOnStopListening(callback) {
        this.onStopListeningCallback = callback;
    }

    /**
     * Set callback for permission status changes
     * @param {Function} callback - Function to call when permission status changes
     */
    setOnPermissionChange(callback) {
        this.onPermissionChangeCallback = callback;
    }

    /**
     * Set callback for network status changes
     * @param {Function} callback - Function to call when network status changes
     */
    setOnNetworkStatusChange(callback) {
        this.onNetworkStatusChangeCallback = callback;
    }

    /**
     * Get current permission status
     * @returns {string} Permission status ('unknown', 'granted', 'denied', 'prompt')
     */
    getPermissionStatus() {
        return this.permissionStatus;
    }

    /**
     * Get current network status
     * @returns {string} Network status ('online', 'offline', 'unstable')
     */
    getNetworkStatus() {
        return this.networkStatus;
    }

    /**
     * Use text-to-speech to speak the provided text
     * @param {string} text - Text to speak
     * @param {Object} options - TTS options
     */
    speak(text, options = {}) {
        if (!this.synth) return;
        
        // Cancel any ongoing speech
        this.synth.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = options.rate || 1.0;
        utterance.pitch = options.pitch || 1.0;
        utterance.volume = options.volume || 1.0;
        
        // Use default voice or specified voice
        if (options.voice) {
            const voices = this.synth.getVoices();
            const selectedVoice = voices.find(v => v.name === options.voice);
            if (selectedVoice) utterance.voice = selectedVoice;
        }
        
        this.synth.speak(utterance);
        return utterance;
    }
}

// Create global instance
const speechRecognition = new SpeechRecognitionManager();
