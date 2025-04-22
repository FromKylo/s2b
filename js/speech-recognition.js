class SpeechRecognizer {
    constructor() {
        // Initialize SpeechRecognition with browser prefix
        this.SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = null;
        this.isListening = false;
        this.finalTranscript = '';
        this.interimTranscript = '';
        this.callbacks = {
            onStart: null,
            onResult: null,
            onEnd: null,
            onError: null,
            onFinal: null,
            onInterim: null
        };
    }

    init(lang = 'en-US') {
        // Check if browser supports speech recognition
        if (!this.SpeechRecognition) {
            console.error('Speech recognition not supported in this browser');
            return false;
        }

        this.recognition = new this.SpeechRecognition();
        this.recognition.continuous = false;
        this.recognition.interimResults = true;
        this.recognition.lang = lang;
        this.setupEventListeners();
        return true;
    }

    setupEventListeners() {
        this.recognition.onstart = () => {
            this.isListening = true;
            if (this.callbacks.onStart) this.callbacks.onStart();
        };

        this.recognition.onresult = (event) => {
            this.interimTranscript = '';
            this.finalTranscript = '';
            
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    this.finalTranscript += event.results[i][0].transcript;
                } else {
                    this.interimTranscript += event.results[i][0].transcript;
                }
            }

            // Send both types of results to callbacks
            if (this.finalTranscript && this.callbacks.onFinal) {
                this.callbacks.onFinal(this.finalTranscript);
            }
            
            if (this.interimTranscript && this.callbacks.onInterim) {
                this.callbacks.onInterim(this.interimTranscript);
            }
            
            if (this.callbacks.onResult) {
                this.callbacks.onResult({
                    finalTranscript: this.finalTranscript,
                    interimTranscript: this.interimTranscript
                });
            }
        };

        this.recognition.onend = () => {
            this.isListening = false;
            if (this.callbacks.onEnd) this.callbacks.onEnd();
        };

        this.recognition.onerror = (event) => {
            if (this.callbacks.onError) this.callbacks.onError(event.error);
            console.error('Speech recognition error:', event.error);
        };
    }

    start() {
        if (!this.recognition) {
            console.error('Speech recognition not initialized');
            return false;
        }
        
        try {
            this.recognition.start();
            return true;
        } catch (error) {
            console.error('Failed to start speech recognition:', error);
            return false;
        }
    }

    stop() {
        if (this.recognition && this.isListening) {
            this.recognition.stop();
            return true;
        }
        return false;
    }

    on(event, callback) {
        if (this.callbacks.hasOwnProperty(event)) {
            this.callbacks[event] = callback;
            return true;
        }
        return false;
    }
    
    checkPermission() {
        return new Promise((resolve, reject) => {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                reject(new Error('Media devices API not available'));
                return;
            }
            
            navigator.mediaDevices.getUserMedia({ audio: true })
                .then((stream) => {
                    // Clean up by stopping all audio tracks
                    stream.getTracks().forEach(track => track.stop());
                    resolve(true);
                })
                .catch((error) => {
                    console.error('Microphone permission error:', error);
                    reject(error);
                });
        });
    }
}

// Create and export a singleton instance
const speechRecognizer = new SpeechRecognizer();
