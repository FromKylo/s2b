class SpeechHandler {
    constructor() {
        this.isActive = false;
        this.lastRecognizedWord = '';
        this.speechSynthesis = window.speechSynthesis;
        this.callbacks = {
            onWordRecognized: null,
            onTranslated: null,
            onError: null
        };
    }

    init() {
        // Initialize speech recognition and braille translator
        speechRecognizer.init();
        
        // Set up event listeners for speech recognition
        speechRecognizer.on('onFinal', (transcript) => this.handleFinalTranscript(transcript));
        speechRecognizer.on('onInterim', (transcript) => this.handleInterimTranscript(transcript));
        speechRecognizer.on('onError', (error) => {
            if (this.callbacks.onError) this.callbacks.onError(error);
        });
    }

    async start() {
        try {
            // Make sure braille translator is initialized first
            await brailleTranslator.init();
            
            // Start speech recognition
            this.isActive = true;
            return speechRecognizer.start();
        } catch (error) {
            console.error('Failed to start speech handler:', error);
            if (this.callbacks.onError) this.callbacks.onError(error);
            return false;
        }
    }

    stop() {
        this.isActive = false;
        return speechRecognizer.stop();
    }

    handleFinalTranscript(transcript) {
        if (!transcript || !this.isActive) return;
        
        // Get the last word from the transcript
        const words = transcript.trim().split(/\s+/);
        const lastWord = words[words.length - 1];
        
        if (lastWord) {
            this.lastRecognizedWord = lastWord;
            
            // Notify of word recognition
            if (this.callbacks.onWordRecognized) {
                this.callbacks.onWordRecognized(lastWord);
            }
            
            // Translate to braille
            this.translateToBraille(lastWord);
        }
    }

    handleInterimTranscript(transcript) {
        // This could be used for real-time visual feedback
        // But we'll primarily use final results for braille translation
    }

    async translateToBraille(word) {
        if (!word) return;
        
        try {
            const translation = brailleTranslator.translateWord(word);
            
            if (translation) {
                console.log(`Translated "${word}" to braille:`, translation.pattern);
                
                // Speak the word for audio confirmation
                this.speakWord(word);
                
                // Send to the connected braille display if available
                if (bleConnection.isConnected) {
                    try {
                        await bleConnection.sendBraillePattern(translation.pattern);
                    } catch (bleError) {
                        console.error('Failed to send pattern to display:', bleError);
                    }
                }
                
                // Notify of translation
                if (this.callbacks.onTranslated) {
                    this.callbacks.onTranslated(translation);
                }
            } else {
                console.warn(`No translation found for "${word}"`);
                if (this.callbacks.onError) {
                    this.callbacks.onError(new Error(`No translation found for "${word}"`));
                }
            }
        } catch (error) {
            console.error('Translation error:', error);
            if (this.callbacks.onError) {
                this.callbacks.onError(error);
            }
        }
    }

    speakWord(word) {
        if (!this.speechSynthesis) return;
        
        // Cancel any ongoing speech
        this.speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(word);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;
        
        this.speechSynthesis.speak(utterance);
    }

    on(event, callback) {
        if (this.callbacks.hasOwnProperty(event)) {
            this.callbacks[event] = callback;
            return true;
        }
        return false;
    }
}

// Create and export a singleton instance
const speechHandler = new SpeechHandler();
