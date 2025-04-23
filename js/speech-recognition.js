/**
 * Speech Recognition Module
 * Handles speech-to-text conversion using Web Speech API
 */

class SpeechRecognizer {
    constructor() {
        // Check for browser compatibility
        this.isSupported = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
        
        // Initialize speech recognition
        if (this.isSupported) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            this.recognition = new SpeechRecognition();
            
            // Configure recognition
            this.recognition.continuous = false;
            this.recognition.interimResults = true;
            this.recognition.maxAlternatives = 1;
            this.recognition.lang = 'en-US';
        } else {
            console.error('Speech recognition not supported in this browser');
        }
        
        // Internal state
        this.isListening = false;
        this.processingTimes = [];
        
        // Results
        this.interimResult = '';
        this.finalResult = '';
        this.allResults = [];
        
        // Callbacks
        this.onResultCallback = null;
        this.onStartCallback = null;
        this.onEndCallback = null;
        this.onErrorCallback = null;
        
        // Debug
        this.debug = {
            enabled: false,
            log: function(message) {
                if (this.enabled) {
                    console.log(`[Speech] ${message}`);
                }
            }
        };
        
        // Setup event handlers if supported
        if (this.isSupported) {
            this.setupEventHandlers();
        }
    }
    
    /**
     * Set up event handlers for the recognition object
     */
    setupEventHandlers() {
        // Result event
        this.recognition.onresult = (event) => {
            const result = event.results[0];
            const transcript = result[0].transcript;
            
            // Track interim/final results
            if (result.isFinal) {
                this.finalResult = transcript;
                this.interimResult = '';
                this.allResults.push(transcript);
                
                this.debug.log(`Final result: "${transcript}"`);
                
                // Calculate processing time
                const endTime = new Date().getTime();
                const startTime = this.startTime || endTime;
                const processingTime = endTime - startTime;
                this.processingTimes.push(processingTime);
                
                // Call result callback if defined
                if (typeof this.onResultCallback === 'function') {
                    this.onResultCallback({
                        text: transcript,
                        isFinal: true,
                        confidence: result[0].confidence,
                        processingTime
                    });
                }
            } else {
                this.interimResult = transcript;
                
                // Call result callback if defined
                if (typeof this.onResultCallback === 'function') {
                    this.onResultCallback({
                        text: transcript,
                        isFinal: false,
                        confidence: result[0].confidence
                    });
                }
            }
        };
        
        // Start event
        this.recognition.onstart = () => {
            this.isListening = true;
            this.startTime = new Date().getTime();
            this.debug.log('Recognition started');
            
            // Call start callback if defined
            if (typeof this.onStartCallback === 'function') {
                this.onStartCallback();
            }
        };
        
        // End event
        this.recognition.onend = () => {
            this.isListening = false;
            this.debug.log('Recognition ended');
            
            // Call end callback if defined
            if (typeof this.onEndCallback === 'function') {
                this.onEndCallback();
            }
        };
        
        // Error event
        this.recognition.onerror = (event) => {
            this.debug.log(`Recognition error: ${event.error}`);
            
            // Call error callback if defined
            if (typeof this.onErrorCallback === 'function') {
                this.onErrorCallback(event);
            }
        };
    }
    
    /**
     * Check if speech recognition is supported
     * @returns {boolean} Whether speech recognition is supported
     */
    isSpeechRecognitionSupported() {
        return this.isSupported;
    }
    
    /**
     * Start listening for speech
     * @param {Object} options - Options for recognition
     */
    startListening(options = {}) {
        if (!this.isSupported) {
            this.debug.log('Cannot start recognition: not supported');
            return false;
        }
        
        if (this.isListening) {
            this.debug.log('Already listening');
            return true;
        }
        
        // Apply options if provided
        if (options.language) {
            this.recognition.lang = options.language;
        }
        
        if (typeof options.continuous === 'boolean') {
            this.recognition.continuous = options.continuous;
        }
        
        // Clear previous results
        this.interimResult = '';
        this.finalResult = '';
        
        // Start recognition
        try {
            this.recognition.start();
            this.debug.log('Starting recognition...');
            return true;
        } catch (error) {
            this.debug.log(`Error starting recognition: ${error.message}`);
            return false;
        }
    }
    
    /**
     * Stop listening
     */
    stopListening() {
        if (!this.isSupported || !this.isListening) {
            return false;
        }
        
        try {
            this.recognition.stop();
            this.debug.log('Stopping recognition...');
            return true;
        } catch (error) {
            this.debug.log(`Error stopping recognition: ${error.message}`);
            return false;
        }
    }
    
    /**
     * Is currently listening
     * @returns {boolean} Whether currently listening
     */
    isCurrentlyListening() {
        return this.isListening;
    }
    
    /**
     * Get the current language
     * @returns {string} Current language
     */
    getLanguage() {
        if (!this.isSupported) return null;
        return this.recognition.lang;
    }
    
    /**
     * Set the recognition language
     * @param {string} language - BCP 47 language tag (e.g., 'en-US', 'es-ES', 'fr-FR')
     */
    setLanguage(language) {
        if (!this.isSupported) return false;
        
        this.recognition.lang = language;
        this.debug.log(`Language set to ${language}`);
        return true;
    }
    
    /**
     * Get all available recognition languages
     * @returns {Promise<Array>} Promise resolving to array of language objects
     */
    async getAvailableLanguages() {
        // Some browsers don't provide this information
        // This is a static list of common speech recognition languages
        const commonLanguages = [
            { code: 'en-US', name: 'English (US)' },
            { code: 'en-GB', name: 'English (UK)' },
            { code: 'es-ES', name: 'Spanish (Spain)' },
            { code: 'es-MX', name: 'Spanish (Mexico)' },
            { code: 'fr-FR', name: 'French (France)' },
            { code: 'fr-CA', name: 'French (Canada)' },
            { code: 'de-DE', name: 'German' },
            { code: 'it-IT', name: 'Italian' },
            { code: 'pt-BR', name: 'Portuguese (Brazil)' },
            { code: 'pt-PT', name: 'Portuguese (Portugal)' },
            { code: 'zh-CN', name: 'Chinese (Mandarin)' },
            { code: 'ja-JP', name: 'Japanese' },
            { code: 'ko-KR', name: 'Korean' },
            { code: 'ru-RU', name: 'Russian' },
            { code: 'nl-NL', name: 'Dutch' },
            { code: 'pl-PL', name: 'Polish' },
            { code: 'tr-TR', name: 'Turkish' },
            { code: 'ar-SA', name: 'Arabic' },
            { code: 'hi-IN', name: 'Hindi' },
        ];
        
        return commonLanguages;
    }
    
    /**
     * Get the current result (final and interim combined)
     * @returns {string} Current combined result
     */
    getCurrentResult() {
        if (this.finalResult && this.interimResult) {
            return `${this.finalResult} ${this.interimResult}`;
        }
        return this.finalResult || this.interimResult;
    }
    
    /**
     * Get final result
     * @returns {string} Final result
     */
    getFinalResult() {
        return this.finalResult;
    }
    
    /**
     * Get all results
     * @returns {Array} All final results
     */
    getAllResults() {
        return this.allResults;
    }
    
    /**
     * Clear all results
     */
    clearResults() {
        this.interimResult = '';
        this.finalResult = '';
        this.allResults = [];
    }
    
    /**
     * Get average processing time
     * @returns {number} Average processing time in ms
     */
    getAverageProcessingTime() {
        if (this.processingTimes.length === 0) return 0;
        
        const sum = this.processingTimes.reduce((a, b) => a + b, 0);
        return Math.round(sum / this.processingTimes.length);
    }
    
    /**
     * Set callback for results
     * @param {Function} callback - The callback function
     */
    onResult(callback) {
        this.onResultCallback = callback;
    }
    
    /**
     * Set callback for start event
     * @param {Function} callback - The callback function
     */
    onStart(callback) {
        this.onStartCallback = callback;
    }
    
    /**
     * Set callback for end event
     * @param {Function} callback - The callback function
     */
    onEnd(callback) {
        this.onEndCallback = callback;
    }
    
    /**
     * Set callback for error event
     * @param {Function} callback - The callback function
     */
    onError(callback) {
        this.onErrorCallback = callback;
    }
}

// Create global instance
window.speechRecognizer = new SpeechRecognizer();