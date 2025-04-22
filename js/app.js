class SpeechToBrailleApp {
    constructor() {
        // Phase elements
        this.introPhase = document.getElementById('introduction-phase');
        this.recordingPhase = document.getElementById('recording-phase');
        this.outputPhase = document.getElementById('output-phase');
        this.permissionPhase = document.getElementById('permission-phase');
        
        // Countdown elements
        this.introCountdown = document.getElementById('intro-countdown');
        
        // Audio visualization elements
        this.audioWave = document.querySelector('.audio-wave');
        this.audioVisualizationBars = document.querySelectorAll('.audio-wave .bar');
        
        // Other elements
        this.interimResult = document.getElementById('interim-result');
        this.finalResult = document.getElementById('final-result');
        this.speechStatus = document.getElementById('speech-status');
        
        // Language selector
        this.languageButtons = document.querySelectorAll('.language-btn');
        
        // State management
        this.currentPhase = 'intro';
        this.countdownInterval = null;
        this.visualizationInterval = null;
        this.micPermissionGranted = false;
    }

    async init() {
        // Check for microphone permission first
        try {
            await this.checkMicrophonePermission();
        } catch (error) {
            console.error('Microphone permission check failed:', error);
            this.showPermissionPhase();
            return;
        }
        
        // Initialize modules
        try {
            await brailleTranslator.init();
            speechHandler.init();
            
            // Add event listeners
            this.setupEventListeners();
            
            // Start intro phase with countdown
            this.showIntroPhase();
            
        } catch (error) {
            console.error('Application initialization error:', error);
            debugManager.error('App initialization failed', error);
            alert('Failed to initialize application. Please refresh the page and try again.');
        }
    }

    async checkMicrophonePermission() {
        try {
            await speechRecognizer.checkPermission();
            this.micPermissionGranted = true;
            return true;
        } catch (error) {
            this.micPermissionGranted = false;
            throw error;
        }
    }

    setupEventListeners() {
        // Listen for permission button click
        const permissionButton = document.getElementById('grant-permission');
        if (permissionButton) {
            permissionButton.addEventListener('click', () => this.handlePermissionRequest());
        }
        
        // Listen for output phase completion
        document.addEventListener('outputPhaseComplete', () => {
            this.changePhase('recording');
        });
        
        // Listen for speech events
        speechHandler.on('onWordRecognized', (word) => {
            if (this.finalResult) {
                this.finalResult.textContent = word;
            }
        });
        
        // Listen for debug button
        const clearCacheButton = document.getElementById('clear-cache-btn');
        if (clearCacheButton) {
            clearCacheButton.addEventListener('click', () => this.clearDatabaseCache());
        }
        
        // Set up language buttons
        this.languageButtons.forEach(button => {
            button.addEventListener('click', () => this.setLanguage(button.dataset.language));
        });
        
        // Speech status updates
        speechRecognizer.on('onStart', () => this.updateSpeechStatus('active'));
        speechRecognizer.on('onEnd', () => this.updateSpeechStatus('inactive'));
        speechRecognizer.on('onError', () => this.updateSpeechStatus('error'));
    }

    setLanguage(language) {
        if (!language) return;
        
        // Update UI
        this.languageButtons.forEach(button => {
            if (button.dataset.language === language) {
                button.classList.add('active');
            } else {
                button.classList.remove('active');
            }
        });
        
        // Update translator
        brailleTranslator.setLanguage(language);
        debugManager.log(`Language changed to: ${language}`);
    }

    updateSpeechStatus(status) {
        if (!this.speechStatus) return;
        
        // Remove all status classes
        this.speechStatus.classList.remove('active', 'inactive', 'error');
        
        // Add appropriate class
        this.speechStatus.classList.add(status);
        
        // Update text
        const statusText = this.speechStatus.querySelector('.status-text');
        if (statusText) {
            statusText.textContent = `Speech: ${status.charAt(0).toUpperCase() + status.slice(1)}`;
        }
    }

    async handlePermissionRequest() {
        const permissionStatus = document.getElementById('permission-status');
        if (permissionStatus) {
            permissionStatus.textContent = 'Requesting permission...';
        }
        
        try {
            await this.checkMicrophonePermission();
            if (permissionStatus) {
                permissionStatus.textContent = 'Permission granted!';
            }
            
            // Wait a moment and then proceed to intro phase
            setTimeout(() => {
                this.showIntroPhase();
            }, 1500);
            
        } catch (error) {
            if (permissionStatus) {
                permissionStatus.textContent = 'Permission denied. Please allow microphone access.';
            }
            console.error('Permission request failed:', error);
        }
    }

    showIntroPhase() {
        this.changePhase('intro');
        this.startIntroCountdown(8); // 8 second countdown
    }

    showRecordingPhase() {
        this.changePhase('recording');
        this.startAudioVisualization();
        speechHandler.start();
        this.updateSpeechStatus('active');
    }

    showOutputPhase() {
        this.changePhase('output');
        speechHandler.stop();
        this.stopAudioVisualization();
        this.updateSpeechStatus('inactive');
        
        // The countdown is handled by OutputUI
    }

    showPermissionPhase() {
        // Create permission phase if it doesn't exist
        if (!this.permissionPhase) {
            this.permissionPhase = document.createElement('div');
            this.permissionPhase.id = 'permission-phase';
            this.permissionPhase.className = 'phase';
            
            this.permissionPhase.innerHTML = `
                <div class="phase-content">
                    <h2>Microphone Permission Required</h2>
                    <p>This app needs microphone access to convert your speech to braille.</p>
                    <div class="permission-image">
                        <!-- Image will be added dynamically or created in images folder -->
                    </div>
                    <p>Please click "Allow" when prompted for microphone access.</p>
                    <button id="grant-permission" class="primary-btn">Enable Microphone</button>
                    <div id="permission-status" class="status-message">Waiting for permission...</div>
                </div>
            `;
            
            document.querySelector('main').appendChild(this.permissionPhase);
            
            // Add event listener to the newly created button
            const permissionButton = document.getElementById('grant-permission');
            if (permissionButton) {
                permissionButton.addEventListener('click', () => this.handlePermissionRequest());
            }
        }
        
        this.changePhase('permission');
    }

    changePhase(phase) {
        // Stop any ongoing countdowns
        this.stopIntroCountdown();
        
        // Remove active class from all phases
        [this.introPhase, this.recordingPhase, this.outputPhase, this.permissionPhase].forEach(elem => {
            if (elem) elem.classList.remove('active');
        });
        
        // Add active class to selected phase
        switch (phase) {
            case 'intro':
                if (this.introPhase) this.introPhase.classList.add('active');
                break;
                
            case 'recording':
                if (this.recordingPhase) this.recordingPhase.classList.add('active');
                break;
                
            case 'output':
                if (this.outputPhase) this.outputPhase.classList.add('active');
                break;
                
            case 'permission':
                if (this.permissionPhase) this.permissionPhase.classList.add('active');
                break;
        }
        
        this.currentPhase = phase;
        debugManager.log(`Phase changed to: ${phase}`);
    }

    startIntroCountdown(seconds) {
        let count = seconds;
        
        if (this.introCountdown) {
            this.introCountdown.textContent = count;
        }
        
        this.stopIntroCountdown();
        
        this.countdownInterval = setInterval(() => {
            count--;
            
            if (this.introCountdown) {
                this.introCountdown.textContent = count;
            }
            
            if (count <= 0) {
                this.stopIntroCountdown();
                this.showRecordingPhase();
            }
        }, 1000);
    }

    stopIntroCountdown() {
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
            this.countdownInterval = null;
        }
    }

    startAudioVisualization() {
        // Stop existing visualization
        this.stopAudioVisualization();
        
        // Only start if we have bars to animate
        if (!this.audioVisualizationBars || this.audioVisualizationBars.length === 0) return;
        
        this.visualizationInterval = setInterval(() => {
            // Generate random heights for the bars
            this.audioVisualizationBars.forEach(bar => {
                const height = Math.floor(Math.random() * 100) + 10;
                bar.style.height = `${height}%`;
            });
        }, 100);
    }

    stopAudioVisualization() {
        if (this.visualizationInterval) {
            clearInterval(this.visualizationInterval);
            this.visualizationInterval = null;
        }
    }

    async clearDatabaseCache() {
        try {
            await brailleTranslator.init();
            alert('Braille database reloaded');
        } catch (error) {
            console.error('Failed to reload database:', error);
            alert('Failed to reload database: ' + error.message);
        }
    }
}

// Start the application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const app = new SpeechToBrailleApp();
    app.init();
});
