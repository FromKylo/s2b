/**
 * Speech Recognition Module
 * Handles voice input and recognition using Web Speech API
 */
class SpeechRecognizer {
    constructor() {
        this.recognition = null;
        this.isRecognizing = false;
        this.interimResult = '';
        this.finalResult = '';
        this.onResultCallback = null;
        this.onEndCallback = null;
        this.audioContext = null;
        this.audioAnalyser = null;
        this.microphoneStream = null;
        this.visualizerBars = document.querySelectorAll('.wave-bar');
        this.visualizerAnimationFrame = null;
        this.recognitionTimeout = null;
        this.isAndroid = /Android/i.test(navigator.userAgent);
        this.processingWord = false; // Prevent rapid processing of the same word
        this.lastProcessedWord = '';
        this.processingTimeout = null;
    }
    
    /**
     * Initialize speech recognition
     */
    initialize() {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            logDebug('Speech recognition not supported in this browser');
            return false;
        }
        
        // Create recognition instance
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();
        
        // Configure recognition options
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        
        // Use a more global language setting to handle both English and Filipino
        // This allows the browser to attempt to recognize either language
        if (this.isAndroid) {
            // On Android, better to use a specific language as fallback
            this.recognition.lang = 'en-US';
            logDebug('Using en-US for Android');
        } else {
            // On desktop, we can try to be more flexible
            this.recognition.lang = 'en-US'; // Default to English but will try to detect
        }
        
        // Set up recognition event handlers
        this.recognition.onresult = (event) => this.handleRecognitionResult(event);
        this.recognition.onerror = (event) => this.handleRecognitionError(event);
        this.recognition.onend = () => this.handleRecognitionEnd();
        
        logDebug('Speech recognition initialized');
        return true;
    }
    
    /**
     * Start speech recognition
     */
    start(onResultCallback, onEndCallback) {
        if (!this.recognition) {
            if (!this.initialize()) {
                return false;
            }
        }
        
        this.onResultCallback = onResultCallback;
        this.onEndCallback = onEndCallback;
        this.interimResult = '';
        this.finalResult = '';
        
        try {
            this.recognition.start();
            this.isRecognizing = true;
            logDebug('Speech recognition started');
            
            // Clear any existing timeout
            if (this.recognitionTimeout) {
                clearTimeout(this.recognitionTimeout);
            }
            
            // On Android, recognition often stops after a while, so restart it periodically
            if (this.isAndroid) {
                this.recognitionTimeout = setTimeout(() => {
                    logDebug('Android recognition timeout - restarting');
                    if (this.isRecognizing) {
                        try {
                            this.recognition.stop();
                            setTimeout(() => {
                                if (this.isRecognizing) {
                                    this.recognition.start();
                                    logDebug('Recognition restarted');
                                }
                            }, 300);
                        } catch (error) {
                            logDebug('Error in timeout restart: ' + error.message);
                        }
                    }
                }, 8000); // 8 seconds timeout
            }
            
            // Start audio visualization
            this.startAudioVisualization();
            
            // Update UI to show recording state
            this.updateVisualizerState(true);
            
            return true;
        } catch (error) {
            logDebug('Error starting speech recognition: ' + error.message);
            return false;
        }
    }
    
    /**
     * Stop speech recognition
     */
    stop() {
        if (this.recognitionTimeout) {
            clearTimeout(this.recognitionTimeout);
            this.recognitionTimeout = null;
        }
        
        if (this.recognition && this.isRecognizing) {
            try {
                this.recognition.stop();
                this.isRecognizing = false;
                logDebug('Speech recognition stopped');
                
                // Stop audio visualization
                this.stopAudioVisualization();
                
                // Update UI to show stopped state
                this.updateVisualizerState(false);
                
                return true;
            } catch (error) {
                logDebug('Error stopping recognition: ' + error.message);
            }
        }
        return false;
    }
    
    /**
     * Handle speech recognition results
     */
    handleRecognitionResult(event) {
        let interimTranscript = '';
        let finalTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            
            if (event.results[i].isFinal) {
                finalTranscript += transcript;
                logDebug('Final transcript: ' + transcript);
            } else {
                interimTranscript += transcript;
            }
        }
        
        if (interimTranscript) {
            this.interimResult = interimTranscript;
            document.getElementById('interim-text').textContent = interimTranscript;
            logDebug('Interim transcript: ' + interimTranscript);
            
            // Extract the last word from interim results for immediate processing
            this.processLastWord(interimTranscript, false);
        }
        
        if (finalTranscript) {
            this.finalResult = finalTranscript;
            document.getElementById('final-text').textContent += ' ' + finalTranscript;
            
            // Process the final transcript immediately
            this.processLastWord(finalTranscript, true);
            
            // Call result callback if provided
            if (this.onResultCallback) {
                this.onResultCallback(finalTranscript);
            }
        }
    }
    
    /**
     * Process the last word from a transcript
     */
    processLastWord(transcript, isFinal) {
        if (this.processingWord) return; // Avoid parallel processing
        
        const words = transcript.trim().split(/\s+/);
        if (words.length === 0) return;
        
        const lastWord = words[words.length - 1].toLowerCase().replace(/[^\w]/g, '');
        
        // Prevent processing very short words from interim results
        if (!isFinal && lastWord.length < 3) return;
        
        // Don't process the same word repeatedly
        if (lastWord === this.lastProcessedWord) return;
        
        // Don't process empty words
        if (!lastWord) return;
        
        // Set processing state
        this.processingWord = true;
        this.lastProcessedWord = lastWord;
        
        // Call the result callback with just the last word
        if (this.onResultCallback) {
            this.onResultCallback(lastWord);
        }
        
        // Reset processing state after a short delay
        if (this.processingTimeout) {
            clearTimeout(this.processingTimeout);
        }
        
        this.processingTimeout = setTimeout(() => {
            this.processingWord = false;
        }, 1000); // 1 second cooldown before processing another word
    }
    
    /**
     * Handle speech recognition errors
     */
    handleRecognitionError(event) {
        logDebug(`Recognition error: ${event.error}`);
        
        let errorMessage = '';
        switch (event.error) {
            case 'network':
                errorMessage = 'Network error occurred';
                break;
            case 'not-allowed':
                errorMessage = 'Microphone access denied';
                break;
            case 'no-speech':
                errorMessage = 'No speech detected';
                break;
            default:
                errorMessage = `Error: ${event.error}`;
        }
        
        logDebug(errorMessage);
        this.stopAudioVisualization();
        this.updateVisualizerState(false);
    }
    
    /**
     * Handle speech recognition end event
     */
    handleRecognitionEnd() {
        this.isRecognizing = false;
        logDebug('Recognition ended');
        
        // Stop audio visualization
        this.stopAudioVisualization();
        this.updateVisualizerState(false);
        
        // Call end callback if provided
        if (this.onEndCallback) {
            this.onEndCallback();
        }
    }
    
    /**
     * Start audio visualization
     */
    async startAudioVisualization() {
        try {
            // Create audio context
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Get microphone access
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.microphoneStream = stream;
            
            // Create audio analyzer
            const source = this.audioContext.createMediaStreamSource(stream);
            this.audioAnalyser = this.audioContext.createAnalyser();
            this.audioAnalyser.fftSize = 32;
            source.connect(this.audioAnalyser);
            
            // Start visualization
            this.visualizeAudio();
        } catch (error) {
            logDebug('Error setting up audio visualization: ' + error.message);
        }
    }
    
    /**
     * Visualize audio input
     */
    visualizeAudio() {
        if (!this.audioAnalyser || !this.isRecognizing) return;
        
        const bufferLength = this.audioAnalyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        this.audioAnalyser.getByteFrequencyData(dataArray);
        
        // Calculate average volume
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
            sum += dataArray[i];
        }
        const average = sum / bufferLength;
        
        // Update visualizer bars
        const bars = this.visualizerBars;
        const sensitivity = 1.5; // Adjust sensitivity
        
        for (let i = 0; i < bars.length; i++) {
            // Create some variation between bars
            const barHeight = Math.min(100, average * sensitivity * (0.8 + Math.random() * 0.5));
            bars[i].style.height = barHeight + 'px';
        }
        
        // Continue animation
        this.visualizerAnimationFrame = requestAnimationFrame(() => this.visualizeAudio());
    }
    
    /**
     * Stop audio visualization
     */
    stopAudioVisualization() {
        if (this.visualizerAnimationFrame) {
            cancelAnimationFrame(this.visualizerAnimationFrame);
            this.visualizerAnimationFrame = null;
        }
        
        if (this.microphoneStream) {
            this.microphoneStream.getTracks().forEach(track => track.stop());
            this.microphoneStream = null;
        }
        
        if (this.audioContext && this.audioContext.state !== 'closed') {
            this.audioContext.close();
            this.audioContext = null;
        }
        
        this.audioAnalyser = null;
    }
    
    /**
     * Update visualizer active state
     */
    updateVisualizerState(active) {
        this.visualizerBars.forEach(bar => {
            if (active) {
                bar.classList.add('active');
            } else {
                bar.classList.remove('active');
                bar.style.height = '20px'; // Reset to default height
            }
        });
    }
    
    /**
     * Clear recognition results
     */
    clear() {
        this.interimResult = '';
        this.finalResult = '';
        document.getElementById('interim-text').textContent = '';
        document.getElementById('final-text').textContent = '';
    }
    
    /**
     * Speak text using speech synthesis
     */
    speak(text) {
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(text);
            window.speechSynthesis.speak(utterance);
        }
    }
}

// Initialize global speech recognizer instance
window.speechRecognizer = new SpeechRecognizer();
