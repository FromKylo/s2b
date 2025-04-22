/**
 * Speech Handler Module
 * Handles speech recognition events and processes words
 */

/**
 * Generate audio feedback cues using Web Audio API
 * @param {string} type - The type of audio cue to play ('recording', 'output', 'no-match')
 * @param {string} variant - Optional variant of the cue ('success', 'failure')
 */
function playAudioCue(type, variant) {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    if (type === 'recording') {
        // Recording start/stop sounds
        if (variant === 'stop') {
            oscillator.type = 'sine';
            oscillator.frequency.value = 587.33; // D5 note
            gainNode.gain.value = 0.1;
            
            oscillator.start();
            // Frequency ramp down for stop sound
            oscillator.frequency.linearRampToValueAtTime(440, audioContext.currentTime + 0.2); // Back to A4
            
            setTimeout(() => {
                oscillator.stop();
            }, 300);
        } else {
            // Default recording start sound
            oscillator.type = 'sine';
            oscillator.frequency.value = 440; // A4 note
            gainNode.gain.value = 0.1;
            
            oscillator.start();
            // Frequency ramp up for start sound
            oscillator.frequency.linearRampToValueAtTime(587.33, audioContext.currentTime + 0.15); // D5 note
            
            setTimeout(() => {
                oscillator.stop();
            }, 300);
        }
    } else if (type === 'output') {
        if (variant === 'failure') {
            // Error/failure sound - falling tone
            oscillator.type = 'triangle';
            oscillator.frequency.value = 330; // E4 note
            gainNode.gain.value = 0.1;
            
            oscillator.start();
            // Frequency ramp down for failure sound
            oscillator.frequency.linearRampToValueAtTime(220, audioContext.currentTime + 0.2); // A3 note
            
            setTimeout(() => {
                oscillator.stop();
            }, 300);
        } else {
            // Success sound - chime up
            oscillator.type = 'triangle';
            oscillator.frequency.value = 659.25; // E5 note
            gainNode.gain.value = 0.1;
            
            oscillator.start();
            setTimeout(() => {
                oscillator.stop();
            }, 300);
            
            // Play a second tone after a short delay
            setTimeout(() => {
                const secondOscillator = audioContext.createOscillator();
                secondOscillator.connect(gainNode);
                secondOscillator.type = 'triangle';
                secondOscillator.frequency.value = 783.99; // G5 note
                
                secondOscillator.start();
                setTimeout(() => {
                    secondOscillator.stop();
                }, 300);
            }, 200);
        }
    } else if (type === 'no-match') {
        oscillator.type = 'sawtooth';
        oscillator.frequency.value = 330; // E4 note
        gainNode.gain.value = 0.1;
        
        oscillator.start();
        setTimeout(() => {
            oscillator.stop();
        }, 200);
        
        // Play a second tone after a short delay for a distinctive "no match" sound
        setTimeout(() => {
            const secondOscillator = audioContext.createOscillator();
            secondOscillator.connect(gainNode);
            secondOscillator.type = 'sawtooth';
            secondOscillator.frequency.value = 220; // A3 note
            
            secondOscillator.start();
            setTimeout(() => {
                secondOscillator.stop();
            }, 200);
        }, 250);
    }
}

class SpeechHandler {
    constructor(app) {
        this.app = app;
        this.recognizer = window.speechRecognizer;
        this.translator = window.brailleTranslation; // Fixed: Changed from brailleTranslator to brailleTranslation
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
