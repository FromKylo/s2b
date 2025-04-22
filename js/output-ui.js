class OutputUI {
    constructor() {
        this.brailleDisplay = document.getElementById('braille-display');
        this.recognizedWord = document.getElementById('recognized-word');
        this.outputCountdown = document.getElementById('output-countdown');
        this.countdownInterval = null;
        this.currentCountdown = 0;
    }

    init() {
        // Set up listener for braille translation events
        speechHandler.on('onTranslated', (translation) => {
            this.displayBraillePattern(translation);
        });
    }

    displayBraillePattern(translation) {
        if (!translation || !this.brailleDisplay) return;
        
        const { text, pattern, language } = translation;
        
        // Clear previous display
        this.brailleDisplay.innerHTML = '';
        
        // Set the recognized word text
        if (this.recognizedWord) {
            this.recognizedWord.innerHTML = `
                ${text}
                <div class="word-info">
                    <span class="language-badge">${language}</span>
                </div>
            `;
        }
        
        // Create Unicode braille representation
        const unicodeDisplay = document.createElement('div');
        unicodeDisplay.className = 'unicode-display';
        unicodeDisplay.textContent = brailleTranslator.patternToUnicode(pattern);
        this.brailleDisplay.appendChild(unicodeDisplay);
        
        // Create container for braille cells
        const cellsContainer = document.createElement('div');
        cellsContainer.className = 'braille-cells-container';
        
        // Create visual representation of braille pattern
        pattern.forEach(cell => {
            const brailleCell = document.createElement('div');
            brailleCell.className = 'braille-cell';
            
            // Create all 6 dots
            for (let i = 1; i <= 6; i++) {
                const dot = document.createElement('div');
                dot.className = cell.includes(i) ? 'braille-dot active' : 'braille-dot';
                dot.dataset.dot = i;
                brailleCell.appendChild(dot);
            }
            
            cellsContainer.appendChild(brailleCell);
        });
        
        this.brailleDisplay.appendChild(cellsContainer);
        
        // Add braille information
        const brailleInfo = document.createElement('div');
        brailleInfo.className = 'braille-info';
        brailleInfo.textContent = `${pattern.length} cell${pattern.length !== 1 ? 's' : ''} in ${language} braille`;
        this.brailleDisplay.appendChild(brailleInfo);
        
        // Start countdown timer
        this.startCountdown(8); // 8 seconds countdown
    }

    startCountdown(seconds) {
        // Clear any existing countdown
        this.stopCountdown();
        
        if (!this.outputCountdown) return;
        
        this.currentCountdown = seconds;
        this.outputCountdown.textContent = this.currentCountdown;
        
        this.countdownInterval = setInterval(() => {
            this.currentCountdown--;
            if (this.outputCountdown) {
                this.outputCountdown.textContent = this.currentCountdown;
            }
            
            if (this.currentCountdown <= 0) {
                this.stopCountdown();
                // Signal that we're done with the output phase
                document.dispatchEvent(new CustomEvent('outputPhaseComplete'));
            }
        }, 1000);
    }

    stopCountdown() {
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
            this.countdownInterval = null;
        }
    }

    clearDisplay() {
        if (this.brailleDisplay) {
            this.brailleDisplay.innerHTML = '';
        }
        
        if (this.recognizedWord) {
            this.recognizedWord.innerHTML = '';
        }
        
        this.stopCountdown();
    }
}

// Create and export a singleton instance
const outputUI = new OutputUI();
document.addEventListener('DOMContentLoaded', () => outputUI.init());
