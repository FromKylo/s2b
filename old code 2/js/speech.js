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
        this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        this.processingWord = false; // Prevent rapid processing of the same word
        this.lastProcessedWord = '';
        this.processingTimeout = null;
        this.currentLanguage = 'en-US'; // Default language
        this.restartCount = 0;
        this.maxRestarts = 5;

        // Feature detection
        this.isSpeechRecognitionSupported = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
        this.isSpeechSynthesisSupported = 'speechSynthesis' in window;
        
        // If speech synthesis is supported, load voices when they change
        if (this.isSpeechSynthesisSupported) {
            window.speechSynthesis.onvoiceschanged = () => {
                this.voices = window.speechSynthesis.getVoices();
                logDebug(`Loaded ${this.voices.length} voices for speech synthesis`);
            };
            
            // Initial voice loading
            this.voices = window.speechSynthesis.getVoices();
            
            // Fix for mobile TTS - ensure speech synthesis doesn't get cut off
            if (this.isMobile) {
                setInterval(() => {
                    if (window.speechSynthesis.speaking) {
                        window.speechSynthesis.pause();
                        window.speechSynthesis.resume();
                    }
                }, 10000); // Keep synthesis alive every 10 seconds
            }
        }
    }
    
    /**
     * Initialize speech recognition
     */
    initialize() {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            logDebug('Speech recognition not supported in this browser');
            return false;
        }
        
        try {
            // Create recognition instance
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            this.recognition = new SpeechRecognition();
            
            // Configure recognition options
            this.recognition.continuous = true;
            this.recognition.interimResults = true;
            
            // Set language based on current state
            this.recognition.lang = this.currentLanguage;
            
            // Set up recognition event handlers
            this.recognition.onresult = (event) => this.handleRecognitionResult(event);
            this.recognition.onerror = (event) => this.handleRecognitionError(event);
            this.recognition.onend = () => this.handleRecognitionEnd();
            this.recognition.onstart = () => {
                logDebug('Recognition officially started');
                // For Android, try to "warm up" the recognition engine by starting audio
                if (this.isAndroid) {
                    this.startAudioVisualization();
                }
            };
            
            // Fix for Android permission issues - pre-request microphone permission
            if (this.isAndroid && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                navigator.mediaDevices.getUserMedia({ audio: true })
                    .then(stream => {
                        logDebug('Microphone permission pre-granted for Android');
                        // Just get the permission, don't need to keep the stream
                        stream.getTracks().forEach(track => track.stop());
                    })
                    .catch(err => {
                        logDebug('Microphone pre-permission failed: ' + err.message);
                    });
            }
            
            logDebug('Speech recognition initialized');
            return true;
        } catch (error) {
            logDebug('Error initializing speech recognition: ' + error.message);
            return false;
        }
    }
    
    /**
     * Set language for recognition
     */
    setLanguage(language) {
        // Map common language formats
        const langMap = {
            'en': 'en-US',
            'fil': 'fil-PH',
            'tl': 'fil-PH'  // Tagalog variant
        };
        
        const langCode = langMap[language] || language;
        this.currentLanguage = langCode;
        
        if (this.recognition) {
            this.recognition.lang = langCode;
            logDebug(`Speech recognition language set to: ${langCode}`);
            
            // For Android, need to restart recognition with new language
            if (this.isRecognizing && this.isAndroid) {
                this.stop();
                setTimeout(() => {
                    this.start(this.onResultCallback, this.onEndCallback);
                }, 500);
            }
        }
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
        this.restartCount = 0;
        
        try {
            // For iOS, ensure audio context is resumed after user interaction
            if (this.isMobile && window.AudioContext) {
                const tempContext = new (window.AudioContext || window.webkitAudioContext)();
                tempContext.resume().then(() => {
                    tempContext.close();
                    logDebug('Audio context resumed for mobile');
                });
            }
            
            // Clear any existing timeout
            if (this.recognitionTimeout) {
                clearTimeout(this.recognitionTimeout);
            }
            
            // Start recognition
            this.recognition.start();
            this.isRecognizing = true;
            logDebug('Speech recognition started');
            
            // On Android/mobile, recognition often stops after a while, so restart it periodically
            if (this.isMobile) {
                this.recognitionTimeout = setTimeout(() => {
                    this.setupAutoRestart();
                }, 5000); // Check every 5 seconds for mobile devices
            }
            
            // Update UI to show recording state
            this.updateVisualizerState(true);
            
            return true;
        } catch (error) {
            logDebug('Error starting speech recognition: ' + error.message);
            // Try to recover from common errors
            if (error.name === 'NotAllowedError') {
                alert('Please enable microphone access to use speech recognition');
            } else {
                // Try reinitializing and starting again after a short delay
                setTimeout(() => {
                    this.recognition = null;
                    this.initialize();
                    this.start(onResultCallback, onEndCallback);
                }, 1000);
            }
            return false;
        }
    }
    
    /**
     * Set up automatic restart for mobile devices
     */
    setupAutoRestart() {
        if (!this.isRecognizing || this.restartCount >= this.maxRestarts) return;
        
        logDebug(`Mobile recognition check - attempt ${this.restartCount + 1}`);
        
        try {
            // Only restart if we're still supposed to be recognizing
            if (this.isRecognizing) {
                this.recognition.stop();
                
                setTimeout(() => {
                    if (this.isRecognizing) {
                        try {
                            this.recognition.start();
                            this.restartCount++;
                            logDebug('Recognition restarted for mobile');
                            
                            // Schedule next restart check
                            this.recognitionTimeout = setTimeout(() => {
                                this.setupAutoRestart();
                            }, 5000);
                        } catch (error) {
                            logDebug('Error in recognition restart: ' + error.message);
                            // Try one more time after a longer delay
                            setTimeout(() => {
                                if (this.isRecognizing) {
                                    try {
                                        this.recognition.start();
                                    } catch (e) {
                                        // Give up after multiple failures
                                        logDebug('Failed to restart recognition after multiple attempts');
                                    }
                                }
                            }, 1000);
                        }
                    }
                }, 300);
            }
        } catch (error) {
            logDebug('Error in auto-restart: ' + error.message);
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
        
        // Don't process the same word repeatedly
        if (lastWord === this.lastProcessedWord) return;
        
        // Don't process empty words
        if (!lastWord) return;
        
        // Set processing state
        this.processingWord = true;
        this.lastProcessedWord = lastWord;
        
        // Reset processing state after a short delay
        if (this.processingTimeout) {
            clearTimeout(this.processingTimeout);
        }
        
        this.processingTimeout = setTimeout(() => {
            this.processingWord = false;
        }, 250); // quarter second cooldown 
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
                // On mobile, this often means permissions weren't granted properly
                if (this.isMobile) {
                    alert('Please grant microphone permission to use speech recognition');
                }
                break;
            case 'no-speech':
                errorMessage = 'No speech detected';
                // This is common and not critical - just retry automatically
                if (this.isMobile && this.isRecognizing) {
                    setTimeout(() => {
                        if (this.isRecognizing) {
                            try {
                                this.recognition.stop();
                                setTimeout(() => {
                                    if (this.isRecognizing) {
                                        this.recognition.start();
                                        logDebug('Recognition restarted after no-speech error');
                                    }
                                }, 300);
                            } catch (e) {
                                logDebug('Error restarting after no-speech: ' + e.message);
                            }
                        }
                    }, 500);
                }
                break;
            case 'aborted':
                // This happens sometimes when the page loses focus - just restart if needed
                if (this.isMobile && this.isRecognizing) {
                    setTimeout(() => {
                        if (this.isRecognizing) {
                            try {
                                this.recognition.start();
                                logDebug('Recognition restarted after abort error');
                            } catch (e) {
                                logDebug('Error restarting after abort: ' + e.message);
                            }
                        }
                    }, 500);
                }
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
            
            // On mobile devices, resume the audio context to ensure it's active
            if (this.isMobile && this.audioContext.state !== 'running') {
                await this.audioContext.resume();
            }
            
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
     * Check if speech recognition is supported in this browser
     */
    isRecognitionSupported() {
        return this.isSpeechRecognitionSupported;
    }
    
    /**
     * Check if speech synthesis is supported in this browser
     */
    isSynthesisSupported() {
        return this.isSpeechSynthesisSupported;
    }
    
    /**
     * Speak text using speech synthesis
     */
    speak(text, priority = false) {
        if (this.isSpeechSynthesisSupported) {
            // Cancel any ongoing speech if this is a priority message
            if (priority && window.speechSynthesis.speaking) {
                window.speechSynthesis.cancel();
            }
            
            const utterance = new SpeechSynthesisUtterance(text);
            
            // Configure speech properties
            utterance.rate = 1.0; // Normal speed
            utterance.pitch = 1.0; // Normal pitch
            utterance.volume = 1.0; // Full volume
            
            // On mobile devices, we need to ensure speedy response
            if (this.isMobile) {
                utterance.rate = 1.1; // Slightly faster on mobile
                
                // Fix for Chrome on Android cutting off speech
                utterance.onend = () => {
                    logDebug(`TTS completed: "${text}"`);
                };
                
                utterance.onerror = (e) => {
                    logDebug(`TTS error: ${e.error}`);
                };
            }
            
            // Try to set appropriate voice for the language
            if (this.voices && this.voices.length > 0) {
                const langCode = this.currentLanguage.split('-')[0].toLowerCase();
                // Find a matching voice for the language
                const matchingVoice = this.voices.find(voice => 
                    voice.lang.toLowerCase().startsWith(langCode)
                );
                if (matchingVoice) {
                    utterance.voice = matchingVoice;
                    logDebug(`Using voice: ${matchingVoice.name} for ${langCode}`);
                }
            }
            
            // Log what's being spoken for debugging
            logDebug(`Speaking: "${text}"`);
            
            window.speechSynthesis.speak(utterance);
            
            return utterance;
        }
        return null;
    }
}

// Initialize global speech recognizer instance
window.speechRecognizer = new SpeechRecognizer();
