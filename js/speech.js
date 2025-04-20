/**
 * Speech Recognition Module
 * Handles voice input and recognition using Web Speech API
 */
class SpeechRecognizer {
    constructor() {
        this.recognition = null;
        this.isRecognizing = false;
        this.currentLanguage = 'en-US';
        this.interimResult = '';
        this.finalResult = '';
        this.onResultCallback = null;
        this.onEndCallback = null;
        this.audioContext = null;
        this.audioAnalyser = null;
        this.microphoneStream = null;
        this.visualizerBars = document.querySelectorAll('.wave-bar');
        this.visualizerAnimationFrame = null;
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
        this.recognition.lang = this.currentLanguage;
        
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
        if (this.recognition && this.isRecognizing) {
            this.recognition.stop();
            this.isRecognizing = false;
            logDebug('Speech recognition stopped');
            
            // Stop audio visualization
            this.stopAudioVisualization();
            
            // Update UI to show stopped state
            this.updateVisualizerState(false);
            
            return true;
        }
        return false;
    }
    
    /**
     * Set recognition language
     */
    setLanguage(langCode) {
        this.currentLanguage = langCode;
        if (this.recognition) {
            this.recognition.lang = langCode;
            logDebug(`Recognition language set to ${langCode}`);
        }
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
            } else {
                interimTranscript += transcript;
            }
        }
        
        if (interimTranscript) {
            this.interimResult = interimTranscript;
            document.getElementById('interim-text').textContent = interimTranscript;
        }
        
        if (finalTranscript) {
            this.finalResult = finalTranscript;
            document.getElementById('final-text').textContent += ' ' + finalTranscript;
            
            // Call result callback if provided
            if (this.onResultCallback) {
                this.onResultCallback(finalTranscript);
            }
        }
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
            utterance.lang = this.currentLanguage;
            window.speechSynthesis.speak(utterance);
        }
    }
}

// Initialize global speech recognizer instance
window.speechRecognizer = new SpeechRecognizer();
