/**
 * Speech Handler Module
 * Handles speech recognition events and processes words
 */
class SpeechHandler {
    constructor(app) {
        this.app = app;
        this.recognizer = window.speechRecognizer;
        // Use brailleTranslation instead of window.brailleTranslator
        this.translator = window.brailleTranslation;
        this.noMatchFeedbackTimeout = null;
    }
    
    /**
     * Initialize speech recognition handlers
     */
    initialize() {
        // Handle word detection (both interim and final)
        this.recognizer.setOnWordDetected((word, confidence, isFinal) => {
            console.log(`Word detected: "${word}" (${isFinal ? 'final' : 'interim'}) with confidence ${confidence}`);
            
            // Only process words with sufficient length and confidence
            if (word.length >= 2 && confidence > 0.4) {
                // Try to find a match in the braille database
                const pattern = this.translator.translateWord(word);
                
                if (pattern) {
                    logDebug(`Found braille match for ${isFinal ? 'final' : 'interim'} word: ${word} (confidence: ${confidence.toFixed(2)})`);
                    
                    // Display the detected word and its confidence
                    document.getElementById('final-text').textContent = 
                        `Detected: ${word} (${(confidence * 100).toFixed(0)}%)`;
                    
                    // Visual feedback for match found
                    this.flashWordFound(word);
                    
                    // Transition to output phase
                    this.app.showOutputPhase(word, pattern);
                    
                    // Play success sound
                    playAudioCue('output');
                } else {
                    // No match found - handle only if final or confidence is high
                    if (isFinal || confidence > 0.7) {
                        logDebug(`No pattern found for: ${word}`);
                        this.showNoMatchFeedback(word);
                        playAudioCue('no-match');
                    }
                }
            }
        });
        
        // Handle final results
        this.recognizer.setOnFinalResult((result, confidence) => {
            document.getElementById('final-text').textContent = result;
            
            // Process individual words from final result
            const words = this.recognizer.extractWords(result);
            
            if (words.length > 0) {
                // Process the last word from the final result
                const lastWord = words[words.length - 1];
                
                // Only process if we haven't already transitioned for this word
                if (this.app.currentPhase === 'recording') {
                    // Try to find a match in the braille database
                    const pattern = this.translator.translateWord(lastWord);
                    
                    if (pattern) {
                        logDebug(`Found braille match for final word: ${lastWord} (confidence: ${confidence.toFixed(2)})`);
                        
                        // Visual feedback for match found
                        this.flashWordFound(lastWord);
                        
                        // Transition to output phase
                        this.app.showOutputPhase(lastWord, pattern);
                        
                        // Play success sound
                        playAudioCue('output');
                    } else {
                        // No match found for final word
                        logDebug(`No pattern found for final word: ${lastWord}`);
                        this.showNoMatchFeedback(lastWord);
                        playAudioCue('no-match');
                    }
                }
            }
        });
        
        return this;
    }
    
    /**
     * Show visual feedback when a word match is found
     * @param {string} word - The word that was found
     */
    flashWordFound(word) {
        const indicator = document.querySelector('.word-recognition-indicator');
        if (!indicator) return;
        
        // Add a flashing highlight
        indicator.textContent = `Match found: "${word}"`;
        indicator.classList.add('success');
        
        // Remove after a short delay
        setTimeout(() => {
            indicator.textContent = '';
            indicator.classList.remove('success');
        }, 2000);
    }
    
    /**
     * Show feedback when no pattern match is found
     * @param {string} word - Word that had no match
     */
    showNoMatchFeedback(word) {
        // Clear any existing timeout
        if (this.noMatchFeedbackTimeout) {
            clearTimeout(this.noMatchFeedbackTimeout);
        }
        
        // Get the feedback element
        const feedback = document.getElementById('no-match-feedback');
        if (!feedback) return;
        
        // Update and show feedback
        feedback.querySelector('.message').textContent = `No braille pattern found for "${word}"`;
        feedback.classList.remove('hidden');
        
        // Hide after a delay
        this.noMatchFeedbackTimeout = setTimeout(() => {
            feedback.classList.add('hidden');
        }, 3000);
    }
}

// Create and expose a global instance
window.speechHandler = new SpeechHandler(window.app);
