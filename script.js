/**
 * Speech-to-Braille Progressive Web App
 */

// DOM Elements
const introPhase = document.getElementById('intro-phase');
const recordingPhase = document.getElementById('recording-phase');
const outputPhase = document.getElementById('output-phase');
const introCountdown = document.getElementById('intro-countdown');
const outputCountdown = document.getElementById('output-countdown');
const recognizedText = document.getElementById('recognized-text');
const brailleOutput = document.getElementById('braille-output');
const audioWave = document.getElementById('audio-wave');
const bleStatus = document.getElementById('ble-status');
const phaseStatus = document.getElementById('phase-status');

// Phase constants
const PHASE_NOT_OUTPUT = 0;
const PHASE_OUTPUT = 1;

// Application state
let currentPhase = 'intro';
let currentLanguage = 'en';
let recognition = null;
let recognitionActive = false;
let currentTranscript = '';
let introTimer = null;
let outputTimer = null;
let isUsingVosk = false; // Flag for alternate speech recognition

/**
 * Initialize the application
 */
async function initApp() {
    // Load braille database
    await brailleDB.loadDatabase();
    
    // Setups
    setupAudioVisualization();
    setupSpeechRecognition();
    setupTextToSpeech();
    startIntroductionPhase();
}

/**
 * Setup Speech Recognition
 */
function setupSpeechRecognition() {
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';
        
        recognition.onstart = () => {
            recognitionActive = true;
            console.log('Speech recognition started');
        };
        
        recognition.onresult = (event) => {
            let interim = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                if (event.results[i].isFinal) {
                    // Get the complete recognized text
                    const recognizedText = event.results[i][0].transcript.trim();
                    // Add to transcript
                    currentTranscript += recognizedText + ' ';
                    
                    // Split into individual words for matching
                    const words = recognizedText.toLowerCase().split(/\s+/);
                    
                    // Only process the last word in the phrase
                    if (words.length > 0) {
                        const lastWord = words[words.length - 1];
                        if (lastWord) {
                            // Verify database is loaded
                            if (!brailleDB.loaded) {
                                console.warn('Cannot process word: Braille database not loaded');
                                continue;
                            }
                            
                            // Debug logging - BEFORE findWord call
                            console.group(`Debug findWord("${lastWord}")`);
                            console.log("Database loaded:", brailleDB.loaded);
                            console.log("Database entries:", brailleDB.database.length);
                            console.log("Word map entries:", brailleDB.wordMap.size);
                            
                            // Try to find a match for this specific word
                            const match = brailleDB.findWord(lastWord);
                            
                            // Debug logging - AFTER findWord call
                            console.log("Search result:", match);
                            console.groupEnd();
                            
                            if (match) {
                                console.log(`Found match for last word: ${lastWord}`, match);
                                // Display this specific match
                                displayBrailleOutput([match]);
                                
                                // Send to BLE if connected
                                if (window.bleHandler && window.bleHandler.isConnectedToBLE) {
                                    try {
                                        window.bleHandler.sendBrailleToBLE(match);
                                        // Visual feedback that a word was sent
                                        flashWordSent(lastWord);
                                    } catch (err) {
                                        console.error("BLE transmission error:", err);
                                    }
                                }
                                
                                // Clear after 8 seconds
                                setTimeout(() => {
                                    brailleOutput.innerHTML = '';
                                }, 8000);
                            } else {
                                // Add visual feedback for no match
                                console.log(`No match found for: ${lastWord}`);
                                const noMatchElement = document.createElement('div');
                                noMatchElement.className = 'no-match-feedback';
                                noMatchElement.textContent = `No braille pattern found for: ${lastWord}`;
                                noMatchElement.style.color = 'red';
                                noMatchElement.style.padding = '5px';
                                noMatchElement.style.margin = '5px 0';
                                recognizedText.appendChild(noMatchElement);
                                setTimeout(() => noMatchElement.remove(), 3000);
                                
                                // Play no-match audio cue
                                playAudioCue('no-match');
                            }
                        }
                    }
                } else {
                    interim += event.results[i][0].transcript;
                }
            }
            
            // Display the recognized text
            recognizedText.innerHTML = `
                <p>${currentTranscript}</p>
                <p><em>${interim}</em></p>
            `;
            
            // Animate the audio visualization
            animateAudioWave(event);
        };
        
        recognition.onerror = (event) => {
            console.error('Speech recognition error', event.error);
            if (event.error === 'no-speech') {
                audioWave.style.transform = 'scaleY(0.1)';
            }
        };
        
        recognition.onend = () => {
            recognitionActive = false;
            console.log('Speech recognition ended');
        };
    } else {
        recognizedText.innerHTML = '<p>Speech recognition is not supported in this browser.</p>';
        console.error('Speech Recognition API not supported');
    }
}

/**
 * Setup Text-to-Speech functionality
 */
function setupTextToSpeech() {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.onvoiceschanged = () => {
            window.speechSynthesis.getVoices();
        };
    } else {
        console.error('Text-to-Speech not supported');
    }
}

/**
 * Switch speech recognition language
 */
async function switchLanguage(lang) {
    if (lang !== 'en' && lang !== 'fil') {
        console.error('Unsupported language:', lang);
        return;
    }
    
    // Stop current recognition
    if (recognitionActive) {
        if (recognition) {
            recognition.stop();
        }
    }
    
    currentLanguage = lang;
    
    // Update Web Speech API language
    if (recognition) {
        recognition.lang = lang === 'en' ? 'en-US' : 'fil-PH';
    }
    
    // Restart recognition if currently in recording phase
    if (currentPhase === 'recording') {
        if (recognition && !isUsingVosk) {
            try {
                recognition.start();
            } catch (e) {
                console.error('Recognition restart error:', e);
            }
        }
    }
    
    // Update language indicator in UI
    updateLanguageUI();
}

/**
 * Update language indicator in UI
 */
function updateLanguageUI() {
    let langIndicator = document.getElementById('language-indicator');
    
    if (!langIndicator) {
        langIndicator = document.createElement('div');
        langIndicator.id = 'language-indicator';
        langIndicator.className = 'status';
        document.querySelector('.status-container').appendChild(langIndicator);
    }
    
    langIndicator.textContent = `Language: ${currentLanguage === 'en' ? 'English' : 'Filipino'}`;
}

/**
 * Speak text using Text-to-Speech
 */
function speakText(text) {
    if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        window.speechSynthesis.speak(utterance);
    }
}

/**
 * Start the introduction phase
 */
function startIntroductionPhase() {
    // Update UI
    currentPhase = 'intro';
    updatePhaseDisplay();
    setActivePhase(introPhase);
    
    // Reset countdown
    let countdown = 12;
    introCountdown.textContent = countdown;
    
    // Speak welcome message
    speakText('Welcome to Speech to Braille. Get ready to speak.');
    
    // Start countdown
    introTimer = setInterval(() => {
        countdown--;
        introCountdown.textContent = countdown;
        
        if (countdown <= 0) {
            clearInterval(introTimer);
            startRecordingPhase();
        }
    }, 1000);
}

/**
 * Start the recording phase
 */
function startRecordingPhase() {
    // Update UI
    currentPhase = 'recording';
    updatePhaseDisplay();
    setActivePhase(recordingPhase);
    currentTranscript = '';
    recognizedText.innerHTML = '<p>Speak now...</p>';
    
    // Play audio cue for recording mode
    playAudioCue('recording');
    
    // Start speech recognition
    if (recognition) {
        try {
            recognition.start();
        } catch (e) {
            console.error('Recognition already started:', e);
        }
    }
    
    // Add a click handler to manually transition to output phase (for testing)
    recordingPhase.addEventListener('click', startOutputPhase, { once: true });
}

/**
 * Start the output phase
 */
function startOutputPhase() {
    // Process the recognized text for braille matches
    const brailleMatches = brailleDB.searchWords(currentTranscript);
    
    // If no matches found, return to recording phase immediately
    if (brailleMatches.length === 0) {
        console.log('No braille matches found, returning to recording phase');
        startRecordingPhase();
        return;
    }
    
    // Update UI
    currentPhase = 'output';
    updatePhaseDisplay();
    setActivePhase(outputPhase);
    
    // Stop speech recognition
    if (recognition && recognitionActive) {
        recognition.stop();
    }
    
    // Play audio cue for output mode
    playAudioCue('output');
    
    // Display braille patterns
    displayBrailleOutput(brailleMatches);
    
    // Send braille data to BLE device if connected
    if (window.bleHandler && window.bleHandler.isConnectedToBLE && brailleMatches.length > 0) {
        window.bleHandler.sendBrailleToBLE(brailleMatches[0]);
    }
    
    // Reset countdown
    let countdown = 8;
    outputCountdown.textContent = countdown;
    
    // Start countdown
    outputTimer = setInterval(() => {
        countdown--;
        outputCountdown.textContent = countdown;
        
        if (countdown <= 0) {
            clearInterval(outputTimer);
            startRecordingPhase();
        }
    }, 1000);
}

/**
 * Display braille output on the screen
 */
function displayBrailleOutput(matches) {
    brailleOutput.innerHTML = '';
    
    if (matches.length === 0) {
        brailleOutput.innerHTML = '<div class="no-matches">No matching braille patterns found</div>';
        return;
    }
    
    matches.forEach(match => {
        const wordElem = document.createElement('div');
        wordElem.className = 'braille-word';
        
        const patternElem = document.createElement('div');
        patternElem.className = 'braille-pattern';
        
        // If it's a nested array (multiple cells)
        if (Array.isArray(match.array[0])) {
            match.array.forEach(cellArray => {
                patternElem.appendChild(createBrailleCell(cellArray));
            });
        } else {
            // Single braille cell
            patternElem.appendChild(createBrailleCell(match.array));
        }
        
        const textElem = document.createElement('div');
        textElem.className = 'word-text';
        textElem.textContent = match.word;
        
        wordElem.appendChild(patternElem);
        wordElem.appendChild(textElem);
        brailleOutput.appendChild(wordElem);
        
        // Speak the matched word
        speakText(match.word);
    });
}

/**
 * Create a visual braille cell representation
 */
function createBrailleCell(dotsArray) {
    const cellElem = document.createElement('div');
    cellElem.className = 'braille-cell';
    
    // Create 6 dots (2x3 grid)
    for (let i = 1; i <= 6; i++) {
        const dot = document.createElement('div');
        dot.className = 'braille-dot';
        
        if (dotsArray.includes(i)) {
            dot.classList.add('active');
        }
        
        cellElem.appendChild(dot);
        
        // Adjust layout for 1-4, 2-5, 3-6
        if (i === 3) {
            const spacer = document.createElement('div');
            spacer.style.flexBasis = '100%';
            cellElem.appendChild(spacer);
        }
    }
    
    return cellElem;
}

/**
 * Update phase status display
 */
function updatePhaseDisplay() {
    let phaseText = '';
    
    switch(currentPhase) {
        case 'intro':
            phaseText = 'Introduction';
            break;
        case 'recording':
            phaseText = 'Recording';
            break;
        case 'output':
            phaseText = 'Output';
            break;
        default:
            phaseText = 'Unknown';
    }
    
    phaseStatus.textContent = `Phase: ${phaseText}`;
}

/**
 * Set the active phase by showing/hiding phase elements
 */
function setActivePhase(phaseElement) {
    // Hide all phases
    introPhase.classList.remove('active');
    recordingPhase.classList.remove('active');
    outputPhase.classList.remove('active');
    
    // Show the active phase
    phaseElement.classList.add('active');
}

/**
 * Play audio cue for different phases
 */
function playAudioCue(type) {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    if (type === 'recording') {
        oscillator.type = 'sine';
        oscillator.frequency.value = 440; // A4 note
        gainNode.gain.value = 0.1;
        
        oscillator.start();
        setTimeout(() => {
            oscillator.stop();
        }, 300);
    } else if (type === 'output') {
        oscillator.type = 'triangle';
        oscillator.frequency.value = 659.25; // E5 note
        gainNode.gain.value = 0.1;
        
        oscillator.start();
        setTimeout(() => {
            oscillator.stop();
        }, 300);
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

/**
 * Animate the audio wave visualization based on speech input
 */
function animateAudioWave(event) {
    if (event && event.results && event.results.length > 0) {
        // Get the most recent result
        const result = event.results[event.results.length - 1];
        if (result.length > 0) {
            // Use the confidence to scale the wave
            const confidence = result[0].confidence || 0.5;
            const volume = Math.min(0.8, Math.max(0.1, confidence));
            audioWave.style.transform = `scaleY(${volume})`;
            updateMicLevel(volume);
        }
    }
}

/**
 * Update microphone level visualization
 */
function updateMicLevel(volume) {
    const micLevel = document.getElementById('mic-level');
    if (micLevel) {
        micLevel.style.width = `${volume * 100}%`;
    }
}

/**
 * Setup audio visualization
 */
function setupAudioVisualization() {
    const visualizationDiv = document.querySelector('.visualization');
    
    // Clear existing content
    visualizationDiv.innerHTML = '';
    
    // Create wave container
    const waveContainer = document.createElement('div');
    waveContainer.className = 'wave-container';
    
    // Create wave element
    const wave = document.createElement('div');
    wave.id = 'audio-wave';
    wave.className = 'wave';
    waveContainer.appendChild(wave);
    
    // Create mic level container
    const micLevelContainer = document.createElement('div');
    micLevelContainer.className = 'mic-level-container';
    
    // Create label
    const micLabel = document.createElement('div');
    micLabel.className = 'mic-level-label';
    micLabel.textContent = 'Mic Input:';
    
    // Create mic level bar
    const micLevelBar = document.createElement('div');
    micLevelBar.className = 'mic-level-bar';
    
    // Create the level indicator
    const micLevel = document.createElement('div');
    micLevel.id = 'mic-level';
    
    micLevelBar.appendChild(micLevel);
    micLevelContainer.appendChild(micLabel);
    micLevelContainer.appendChild(micLevelBar);
    
    // Add to visualization
    visualizationDiv.appendChild(waveContainer);
    visualizationDiv.appendChild(micLevelContainer);
}

// Add global debug function for testing brailleDB.findWord from the browser console
window.debugBrailleDB = function(word) {
    console.group(`Debug findWord("${word}")`);
    console.log("Database loaded:", brailleDB.loaded);
    console.log("Database entries:", brailleDB.database.length);
    console.log("Word map entries:", brailleDB.wordMap.size);
    
    const result = brailleDB.findWord(word);
    console.log("Search result:", result);
    
    if (!result) {
        console.log("Words in database (first 10):");
        const sampleWords = brailleDB.database.slice(0, 10).map(entry => entry.word);
        console.log(sampleWords);
    }
    
    console.groupEnd();
    return result;
};

/**
 * Initialize the app when the DOM is loaded
 */
document.addEventListener('DOMContentLoaded', () => {
    initApp();
    
    // Use the existing BLE connect button
    const bleButton = document.querySelector('.ble-button');
    if (bleButton && window.bleHandler) {
        bleButton.addEventListener('click', window.bleHandler.connectToBLE);
    }
    
    // Add event listener for the braille test button
    const testButton = document.getElementById('braille-test-button');
    if (testButton && window.bleHandler) {
        testButton.addEventListener('click', window.bleHandler.runBrailleTest);
    }
    
    // Create BLE speed test UI if BLE handler is available
    if (window.bleHandler) {
        window.bleHandler.createBleSpeedTestUI();
    }
});

// Handle page visibility changes to manage speech recognition
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        // Page is hidden, stop recognition if it's running
        if (recognition && recognitionActive) {
            recognition.stop();
        }
    } else if (currentPhase === 'recording') {
        // Page is visible again and we're in recording phase, restart recognition
        if (recognition && !recognitionActive) {
            try {
                recognition.start();
            } catch (e) {
                console.error('Recognition error on visibility change:', e);
            }
        }
    }
});

// Add this new function to provide visual feedback
function flashWordSent(word) {
    const feedbackDiv = document.createElement('div');
    feedbackDiv.textContent = `Sent "${word}" to braille display`;
    feedbackDiv.style.position = 'fixed';
    feedbackDiv.style.bottom = '20px';
    feedbackDiv.style.left = '50%';
    feedbackDiv.style.transform = 'translateX(-50%)';
    feedbackDiv.style.backgroundColor = 'rgba(76, 175, 80, 0.8)';
    feedbackDiv.style.color = 'white';
    feedbackDiv.style.padding = '10px 20px';
    feedbackDiv.style.borderRadius = '20px';
    feedbackDiv.style.zIndex = '1000';
    document.body.appendChild(feedbackDiv);
    
    // Fade out and remove
    setTimeout(() => {
        feedbackDiv.style.transition = 'opacity 1s';
        feedbackDiv.style.opacity = '0';
        setTimeout(() => feedbackDiv.remove(), 1000);
    }, 2000);
}
