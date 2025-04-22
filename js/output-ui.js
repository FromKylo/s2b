/**
 * Output UI Components and Functionality
 * Handles output phase rendering, controls, favorites, and related functions
 */

class OutputUI {
    constructor(app) {
        this.app = app;
        this.elements = {
            recognizedWord: document.getElementById('recognized-word'),
            brailleDisplay: document.getElementById('braille-display'),
            outputCountdown: document.getElementById('output-countdown')
        };
        this.outputTimer = null;
        this.countdownValue = 8; // seconds
    }

    /**
     * Transition to output phase
     * @param {string} word - The recognized word
     * @param {Array} pattern - The braille pattern
     */
    transitionToOutputPhase(word, pattern) {
        // Debug logging for troubleshooting
        this.app.log(`BEGIN OUTPUT PHASE TRANSITION for word: "${word}"`, 'debug');
        
        // Guard against null patterns
        if (!pattern) {
            this.app.log("ERROR: Null pattern provided to output phase", 'error');
            console.error("Attempted to transition to output phase with null pattern");
            
            // Show a user-friendly error with fallback option
            this.showOutputError(word);
            return;
        }
        
        this.app.log(`Pattern details: ${JSON.stringify(pattern)}`, 'debug');
        
        // Clear any existing timers
        if (this.app.introTimer) {
            clearInterval(this.app.introTimer);
            this.app.log("Intro timer cleared", 'debug');
        }
        if (this.outputTimer) {
            clearInterval(this.outputTimer);
            this.app.log("Output timer cleared", 'debug');
        }
        
        // Stop speech recognition temporarily
        speechRecognition.stopListening();
        this.app.log("Speech recognition stopped for output phase", 'debug');
        
        // Play output sound
        if (pattern) {
            playAudioCue('output', 'success');
            this.app.log("Output success sound played", 'debug');
        } else {
            playAudioCue('output', 'failure');
            this.app.log("Output failure sound played", 'debug');
        }
        
        // Switch to output phase
        this.app.log(`Switching to OUTPUT phase`, 'debug');
        this.app.switchPhase(PHASE.OUTPUT);
        
        // Clear previous display content
        this.elements.recognizedWord.innerHTML = '';
        this.elements.brailleDisplay.innerHTML = '';
        
        // Display word and pattern
        this.elements.recognizedWord.textContent = word;
        this.app.log(`Word text set in UI: "${word}"`, 'debug');
        
        // Enhance word display with extra information
        const wordInfo = document.createElement('div');
        wordInfo.className = 'word-info';
        wordInfo.innerHTML = `<span class="word-language">${brailleTranslation.currentLanguage}</span>`;
        this.elements.recognizedWord.appendChild(wordInfo);
        this.app.log(`Word language info added: ${brailleTranslation.currentLanguage}`, 'debug');
        
        // Add pronunciation button if available
        if ('speechSynthesis' in window) {
            const pronunciationBtn = document.createElement('button');
            pronunciationBtn.className = 'pronunciation-btn';
            pronunciationBtn.innerHTML = '<span class="icon">🔊</span> Say Word';
            pronunciationBtn.addEventListener('click', () => {
                speechRecognition.speak(word, { rate: 0.8 });
            });
            wordInfo.appendChild(pronunciationBtn);
        }
        
        // Add favorite button
        const favoriteBtn = document.createElement('button');
        favoriteBtn.className = 'favorite-btn';
        favoriteBtn.innerHTML = this.isWordFavorite(word) ? 
            '<span class="icon">★</span> Favorited' : 
            '<span class="icon">☆</span> Favorite';
        
        favoriteBtn.addEventListener('click', () => {
            this.toggleFavoriteWord(word, pattern, favoriteBtn);
        });
        wordInfo.appendChild(favoriteBtn);
        
        // Add view details button (to show more information)
        const detailsBtn = document.createElement('button');
        detailsBtn.className = 'details-btn';
        detailsBtn.innerHTML = '<span class="icon">ⓘ</span> Details';
        detailsBtn.addEventListener('click', () => {
            this.togglePatternDetails();
        });
        wordInfo.appendChild(detailsBtn);
        
        // Log the pattern for debugging
        console.log("Braille pattern for output:", pattern);
        
        // Create container for braille cells with animation sequence
        const brailleContainer = document.createElement('div');
        brailleContainer.className = 'braille-cells-container';
        this.elements.brailleDisplay.appendChild(brailleContainer);
        
        // Create debug information section in output display (hidden by default)
        const debugInfo = document.createElement('div');
        debugInfo.className = 'debug-info hidden';
        debugInfo.id = 'pattern-details';
        debugInfo.innerHTML = `
            <div class="debug-label">Pattern Data:</div>
            <pre>${JSON.stringify(pattern, null, 2)}</pre>
        `;
        this.elements.brailleDisplay.appendChild(debugInfo);
        
        // Render braille cells with animation
        this.app.log(`Rendering braille pattern to display`, 'debug');
        this.renderBrailleCellsWithAnimation(pattern, brailleContainer);
        
        // Send to BLE device if connected
        if (bleConnection.isConnected) {
            this.app.log(`Sending pattern to BLE device...`, 'debug');
            bleConnection.sendBraillePattern(pattern)
                .then(() => {
                    this.app.log(`Pattern successfully sent to BLE device`, 'success');
                    
                    // Add visual indicator that pattern was sent to device
                    const sentIndicator = document.createElement('div');
                    sentIndicator.className = 'sent-to-device';
                    sentIndicator.innerHTML = '<span class="icon">✓</span> Sent to device';
                    this.elements.brailleDisplay.appendChild(sentIndicator);
                    
                    // Animate the indicator
                    setTimeout(() => {
                        sentIndicator.classList.add('active');
                    }, 100);
                })
                .catch(error => {
                    this.app.log(`ERROR sending pattern to BLE: ${error.message}`, 'error');
                    
                    // Show error to user
                    const errorIndicator = document.createElement('div');
                    errorIndicator.className = 'error-indicator';
                    errorIndicator.innerHTML = '<span class="icon">⚠️</span> Failed to send to device';
                    this.elements.brailleDisplay.appendChild(errorIndicator);
                });
        } else {
            this.app.log(`Not sending to BLE - device not connected`, 'warning');
            
            // Show gentle reminder to connect device
            const reminderElement = document.createElement('div');
            reminderElement.className = 'device-reminder';
            reminderElement.innerHTML = 'Connect a braille device to feel the pattern';
            this.elements.brailleDisplay.appendChild(reminderElement);
        }
        
        // Speak the word
        speechRecognition.speak(word, { rate: 1.0 });
        this.app.log(`TTS started for word: "${word}"`, 'debug');
        
        // Add output phase control buttons
        this.addOutputPhaseControls();
        
        // Reset countdown
        this.countdownValue = 8;
        this.elements.outputCountdown.textContent = this.countdownValue;
        this.app.log(`Output countdown reset to ${this.countdownValue}`, 'debug');
        
        // Start countdown
        this.app.log(`Starting output countdown timer`, 'debug');
        this.outputTimer = setInterval(() => {
            this.countdownValue--;
            this.elements.outputCountdown.textContent = this.countdownValue;
            
            // Add visual indication when time is running low
            if (this.countdownValue <= 3) {
                this.elements.outputCountdown.parentElement.classList.add('ending-soon');
            }
            
            if (this.countdownValue <= 0) {
                this.app.log(`Output countdown reached zero, cleaning up...`, 'debug');
                clearInterval(this.outputTimer);
                
                // Clear BLE display if connected
                if (bleConnection.isConnected) {
                    this.app.log(`Clearing BLE display...`, 'debug');
                    bleConnection.clearDisplay()
                        .then(() => {
                            this.app.log(`BLE display cleared successfully`, 'success');
                        })
                        .catch(error => {
                            this.app.log(`Error clearing BLE display: ${error.message}`, 'error');
                        });
                }
                
                this.app.log(`Transitioning back to recording phase`, 'debug');
                this.app.transitionToRecordingPhase();
            }
        }, 1000);
        
        this.app.log(`OUTPUT PHASE TRANSITION COMPLETE`, 'debug');
    }

    /**
     * Shows an error when a pattern couldn't be displayed
     * @param {string} word - The word that failed to match
     */
    showOutputError(word) {
        // Switch to output phase to show error
        this.app.switchPhase(PHASE.OUTPUT);
        
        // Play failure sound
        playAudioCue('output', 'failure');
        
        // Clear previous content
        this.elements.recognizedWord.innerHTML = '';
        this.elements.brailleDisplay.innerHTML = '';
        
        // Display word with error
        this.elements.recognizedWord.textContent = word;
        
        // Add error indicator
        const errorInfo = document.createElement('div');
        errorInfo.className = 'word-info error';
        errorInfo.innerHTML = `<span class="error-text">⚠️ No braille pattern found</span>`;
        this.elements.recognizedWord.appendChild(errorInfo);
        
        // Show letter by letter option for multi-character words
        if (word && word.length > 1) {
            const letterByLetterBtn = document.createElement('button');
            letterByLetterBtn.className = 'letter-by-letter-btn';
            letterByLetterBtn.textContent = 'Try Letter by Letter';
            letterByLetterBtn.addEventListener('click', () => {
                this.showLetterByLetterView(word);
            });
            this.elements.brailleDisplay.appendChild(letterByLetterBtn);
        }
        
        // Add button to return to listening
        const returnButton = document.createElement('button');
        returnButton.className = 'return-button';
        returnButton.textContent = 'Return to Listening';
        returnButton.addEventListener('click', () => {
            clearInterval(this.outputTimer);
            this.app.transitionToRecordingPhase();
        });
        this.elements.brailleDisplay.appendChild(returnButton);
        
        // Set short countdown
        this.countdownValue = 5;
        this.elements.outputCountdown.textContent = this.countdownValue;
        
        // Start countdown
        this.outputTimer = setInterval(() => {
            this.countdownValue--;
            this.elements.outputCountdown.textContent = this.countdownValue;
            
            if (this.countdownValue <= 0) {
                clearInterval(this.outputTimer);
                this.app.transitionToRecordingPhase();
            }
        }, 1000);
    }
    
    /**
     * Show a letter-by-letter view for words without a whole pattern
     * @param {string} word - The word to break down
     */
    showLetterByLetterView(word) {
        // Clear display
        this.elements.brailleDisplay.innerHTML = '';
        
        // Create container for letters
        const lettersContainer = document.createElement('div');
        lettersContainer.className = 'letters-container';
        
        // Process each letter
        let hasValidLetters = false;
        
        // Add header
        const header = document.createElement('h3');
        header.textContent = 'Individual Letters';
        lettersContainer.appendChild(header);
        
        // Process each letter
        for (let i = 0; i < word.length; i++) {
            const letter = word[i];
            const pattern = brailleTranslation.translateWord(letter);
            
            // Create letter container
            const letterBox = document.createElement('div');
            letterBox.className = 'letter-box';
            
            // Add letter label
            const letterLabel = document.createElement('div');
            letterLabel.className = 'letter-label';
            letterLabel.textContent = letter;
            letterBox.appendChild(letterLabel);
            
            // Add braille pattern if available
            const patternContainer = document.createElement('div');
            patternContainer.className = 'letter-pattern';
            
            if (pattern) {
                hasValidLetters = true;
                brailleTranslation.renderBrailleCells(pattern, patternContainer);
            } else {
                patternContainer.innerHTML = '<span class="not-found">?</span>';
            }
            
            letterBox.appendChild(patternContainer);
            lettersContainer.appendChild(letterBox);
        }
        
        this.elements.brailleDisplay.appendChild(lettersContainer);
        
        // Add guidance text
        const guidanceText = document.createElement('p');
        guidanceText.className = 'guidance-text';
        
        if (hasValidLetters) {
            guidanceText.textContent = 'Some letters have braille patterns available. You can explore them individually.';
        } else {
            guidanceText.textContent = 'None of these letters have braille patterns in the current language.';
        }
        
        this.elements.brailleDisplay.appendChild(guidanceText);
        
        // Reset countdown to give more time to explore
        clearInterval(this.outputTimer);
        this.countdownValue = 12;
        this.elements.outputCountdown.textContent = this.countdownValue;
        
        // Restart countdown
        this.outputTimer = setInterval(() => {
            this.countdownValue--;
            this.elements.outputCountdown.textContent = this.countdownValue;
            
            if (this.countdownValue <= 0) {
                clearInterval(this.outputTimer);
                this.app.transitionToRecordingPhase();
            }
        }, 1000);
    }
    
    /**
     * Toggle display of pattern details
     */
    togglePatternDetails() {
        const detailsElement = document.getElementById('pattern-details');
        if (detailsElement) {
            detailsElement.classList.toggle('hidden');
        }
    }
    
    /**
     * Add control buttons for the output phase
     */
    addOutputPhaseControls() {
        // Check if controls already exist
        if (document.getElementById('output-controls')) return;
        
        // Create controls container
        const controls = document.createElement('div');
        controls.id = 'output-controls';
        controls.className = 'output-controls';
        
        // Add extend time button
        const extendButton = document.createElement('button');
        extendButton.className = 'extend-time-btn';
        extendButton.innerHTML = '<span class="icon">⏱</span> +5 Seconds';
        extendButton.addEventListener('click', () => {
            // Add 5 seconds to countdown
            this.countdownValue += 5;
            this.elements.outputCountdown.textContent = this.countdownValue;
            
            // Remove "ending soon" warning if present
            this.elements.outputCountdown.parentElement.classList.remove('ending-soon');
            
            // Provide feedback
            extendButton.classList.add('clicked');
            setTimeout(() => {
                extendButton.classList.remove('clicked');
            }, 300);
        });
        
        // Add return button
        const returnButton = document.createElement('button');
        returnButton.className = 'return-btn';
        returnButton.innerHTML = '<span class="icon">🔙</span> Return to Listening';
        returnButton.addEventListener('click', () => {
            clearInterval(this.outputTimer);
            
            // Clear BLE display if connected
            if (bleConnection.isConnected) {
                bleConnection.clearDisplay()
                    .catch(error => {
                        console.error('Error clearing display:', error);
                    });
            }
            
            this.app.transitionToRecordingPhase();
        });
        
        // Add repeat button
        const repeatButton = document.createElement('button');
        repeatButton.className = 'repeat-btn';
        repeatButton.innerHTML = '<span class="icon">🔁</span> Repeat Pattern';
        repeatButton.addEventListener('click', async () => {
            // Get the current word
            const word = this.elements.recognizedWord.textContent;
            
            // Try to find pattern for the word
            const pattern = brailleTranslation.translateWord(word);
            
            if (pattern && bleConnection.isConnected) {
                // Visual feedback for button
                repeatButton.classList.add('active');
                
                try {
                    await bleConnection.clearDisplay();
                    await new Promise(resolve => setTimeout(resolve, 300));
                    await bleConnection.sendBraillePattern(pattern);
                    playAudioCue('output', 'success');
                } catch (error) {
                    console.error('Error repeating pattern:', error);
                }
                
                setTimeout(() => {
                    repeatButton.classList.remove('active');
                }, 500);
            } else {
                // Speak the word again as fallback
                speechRecognition.speak(word, { rate: 1.0 });
            }
        });
        
        // Add buttons to container
        controls.appendChild(extendButton);
        controls.appendChild(repeatButton);
        controls.appendChild(returnButton);
        
        // Add controls to output phase
        const outputContent = document.app.elements.phaseContainers[PHASE.OUTPUT].querySelector('.phase-content');
        outputContent.appendChild(controls);
    }
    
    /**
     * Check if a word is in favorites
     * @param {string} word - The word to check
     * @returns {boolean} - Whether the word is favorited
     */
    isWordFavorite(word) {
        try {
            const favorites = JSON.parse(localStorage.getItem('brailleFavorites')) || {};
            return !!favorites[word];
        } catch (e) {
            console.error('Error checking favorites:', e);
            return false;
        }
    }
    
    /**
     * Toggle favorite status for a word
     * @param {string} word - The word to favorite/unfavorite
     * @param {Array} pattern - The braille pattern
     * @param {HTMLElement} button - The button element
     */
    toggleFavoriteWord(word, pattern, button) {
        try {
            const favorites = JSON.parse(localStorage.getItem('brailleFavorites')) || {};
            
            if (favorites[word]) {
                // Remove from favorites
                delete favorites[word];
                button.innerHTML = '<span class="icon">☆</span> Favorite';
                this.app.log(`Removed "${word}" from favorites`, 'info');
            } else {
                // Add to favorites
                favorites[word] = {
                    pattern,
                    language: brailleTranslation.currentLanguage,
                    timestamp: Date.now()
                };
                button.innerHTML = '<span class="icon">★</span> Favorited';
                this.app.log(`Added "${word}" to favorites`, 'success');
                
                // Animate the button
                button.classList.add('favorited');
                setTimeout(() => {
                    button.classList.remove('favorited');
                }, 700);
            }
            
            localStorage.setItem('brailleFavorites', JSON.stringify(favorites));
        } catch (e) {
            console.error('Error toggling favorite:', e);
            this.app.log(`Error saving favorites: ${e.message}`, 'error');
        }
    }
    
    /**
     * Render braille cells with animation
     * @param {Array} pattern - The braille pattern
     * @param {HTMLElement} container - The container element
     */
    renderBrailleCellsWithAnimation(pattern, container) {
        // If pattern is empty or invalid, show error
        if (!pattern || !Array.isArray(pattern) || pattern.length === 0) {
            const errorElement = document.createElement('div');
            errorElement.className = 'braille-error';
            errorElement.textContent = 'Invalid braille pattern';
            container.appendChild(errorElement);
            return;
        }
        
        // Create cells container
        const cellsContainer = document.createElement('div');
        cellsContainer.className = 'braille-cells';
        
        // Render each cell with animation
        pattern.forEach((cell, cellIndex) => {
            // Create cell
            const cellElement = document.createElement('div');
            cellElement.className = 'braille-cell';
            cellElement.setAttribute('data-cell-index', cellIndex);
            
            // Add animation delay based on index
            cellElement.style.animationDelay = `${cellIndex * 0.1}s`;
            
            // Create dots
            const dotsContainer = document.createElement('div');
            dotsContainer.className = 'dots-container';
            
            // Position the dots in 2x3 grid (standard braille cell)
            for (let i = 0; i < 6; i++) {
                const dot = document.createElement('div');
                dot.className = 'dot';
                dot.setAttribute('data-dot-index', i);
                
                // Check if this dot is active
                const isActive = cell.includes(i + 1); // +1 because braille dots are 1-indexed
                if (isActive) {
                    dot.classList.add('active');
                    
                    // Add animation delay for each dot
                    dot.style.animationDelay = `${cellIndex * 0.1 + i * 0.05}s`;
                }
                
                dotsContainer.appendChild(dot);
            }
            
            cellElement.appendChild(dotsContainer);
            cellsContainer.appendChild(cellElement);
        });
        
        // Add to container with animation
        container.appendChild(cellsContainer);
        
        // Add animation class after a small delay to trigger the animation
        setTimeout(() => {
            cellsContainer.classList.add('animated');
        }, 50);
    }
}

// Export the module
window.OutputUI = OutputUI;