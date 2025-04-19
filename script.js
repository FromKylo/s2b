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

// BLE Variables
let bleDevice = null;
let bleServer = null;
let brailleService = null;
let brailleCharacteristic = null;
const BRAILLE_SERVICE_UUID = "19b10000-e8f2-537e-4f6c-d104768a1214";
const BRAILLE_CHARACTERISTIC_UUID = "19b10001-e8f2-537e-4f6c-d104768a1214";

// Phase constants
const PHASE_NOT_OUTPUT = 0;
const PHASE_OUTPUT = 1;

// Application state
let currentPhase = 'intro';
let recognition = null;
let recognitionActive = false;
let currentTranscript = '';
let introTimer = null;
let outputTimer = null;
let isConnectedToBLE = false;

/**
 * Initialize the application
 */
async function initApp() {
    // Load braille database
    await brailleDB.loadDatabase();
    
    // Setup Web Speech API if available
    setupSpeechRecognition();
    
    // Setup text-to-speech
    setupTextToSpeech();
    
    // Start the introduction phase
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
                    currentTranscript += event.results[i][0].transcript + ' ';
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
        
        // Set language based on current selection
        utterance.lang = currentLanguage === 'en' ? 'en-US' : 'fil-PH';
        
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
    
    displayBrailleOutput(brailleMatches);
    
    // Send braille data to BLE device if connected
    if (isConnectedToBLE && brailleMatches.length > 0) {
        sendBrailleToBLE(brailleMatches[0]);
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
    }
    
    return cellElem;
}

/**
 * Connect to BLE device
 */
async function connectToBLE() {
    try {
        console.log('Requesting BLE device...');
        bleDevice = await navigator.bluetooth.requestDevice({
            filters: [{
                name: 'Braille Display'
            }],
            optionalServices: [BRAILLE_SERVICE_UUID]
        });
        
        console.log('Connecting to GATT server...');
        bleServer = await bleDevice.gatt.connect();
        
        console.log('Getting primary service...');
        brailleService = await bleServer.getPrimaryService(BRAILLE_SERVICE_UUID);
        
        console.log('Getting characteristic...');
        brailleCharacteristic = await brailleService.getCharacteristic(BRAILLE_CHARACTERISTIC_UUID);
        
        isConnectedToBLE = true;
        updateBleStatus();
        
        bleDevice.addEventListener('gattserverdisconnected', onBleDisconnected);
        
        console.log('BLE connection established!');
        return true;
    } catch (error) {
        console.error('BLE connection error:', error);
        isConnectedToBLE = false;
        updateBleStatus();
        return false;
    }
}

/**
 * Handle BLE disconnection
 */
function onBleDisconnected() {
    console.log('BLE device disconnected');
    isConnectedToBLE = false;
    updateBleStatus();
}

/**
 * Send braille data to BLE device
 */
async function sendBrailleToBLE(brailleMatch) {
    if (!isConnectedToBLE || !brailleCharacteristic) {
        console.log('Cannot send to BLE: not connected');
        return;
    }
    
    try {
        // Format the data to match the ESP32 expectations
        let formatData;
        
        // If it's a nested array (multiple cells)
        if (Array.isArray(brailleMatch.array[0])) {
            // Send as JSON string with phase prefix
            formatData = 'O:' + JSON.stringify(brailleMatch.array);
        } else {
            // Send as JSON string for single cell
            formatData = 'O:[' + brailleMatch.array.join(',') + ']';
        }
        
        console.log('Sending to BLE:', formatData);
        const encoder = new TextEncoder();
        await brailleCharacteristic.writeValue(encoder.encode(formatData));
        console.log('Data sent successfully');
    } catch (error) {
        console.error('Error sending data to BLE device:', error);
    }
}

/**
 * Update BLE status display
 */
function updateBleStatus() {
    bleStatus.textContent = isConnectedToBLE ? 'BLE: Connected' : 'BLE: Disconnected';
    bleStatus.className = isConnectedToBLE ? 'status connected' : 'status';
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
        }
    }
}

/**
 * Initialize the app when the DOM is loaded
 */
document.addEventListener('DOMContentLoaded', () => {
    initApp();
    
    // Add BLE connect button
    const btnContainer = document.createElement('div');
    btnContainer.className = 'button-container';
    btnContainer.style.textAlign = 'center';
    btnContainer.style.margin = '20px 0';
    
    const bleButton = document.createElement('button');
    bleButton.innerText = 'Connect to Braille Device';
    bleButton.className = 'ble-button';
    bleButton.style.padding = '10px 20px';
    bleButton.style.backgroundColor = '#2196F3';
    bleButton.style.color = 'white';
    bleButton.style.border = 'none';
    bleButton.style.borderRadius = '4px';
    bleButton.style.cursor = 'pointer';
    
    bleButton.addEventListener('click', connectToBLE);
    
    btnContainer.appendChild(bleButton);
    document.querySelector('main').prepend(btnContainer);
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
