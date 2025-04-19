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
let speedTestCharacteristic = null; // New speed test characteristic
const BRAILLE_SERVICE_UUID = "19b10000-e8f2-537e-4f6c-d104768a1214";
const BRAILLE_CHARACTERISTIC_UUID = "19b10001-e8f2-537e-4f6c-d104768a1214";
const SPEED_TEST_CHARACTERISTIC_UUID = "19b10002-e8f2-537e-4f6c-d104768a1214"; // New UUID for speed testing

// Speed test variables
let speedTestActive = false;
let speedTestStartTime = 0;
let speedTestPacketSize = 20; // Default packet size in bytes
let speedTestPacketCount = 100; // Default number of packets to send
let speedTestInterval = 10; // Default interval between packets in ms

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
let isConnectedToBLE = false;
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
                            
                            // Try to find a match for this specific word
                            const match = brailleDB.findWord(lastWord);
                            if (match) {
                                console.log(`Found match for last word: ${lastWord}`, match);
                                // Display this specific match
                                displayBrailleOutput([match]);
                                
                                // Send to BLE if connected
                                if (isConnectedToBLE) {
                                    sendBrailleToBLE(match);
                                }
                                
                                // Clear after 8 seconds
                                setTimeout(() => {
                                    brailleOutput.innerHTML = '';
                                }, 8000);
                            } else {
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
        
        console.log('Getting braille characteristic...');
        brailleCharacteristic = await brailleService.getCharacteristic(BRAILLE_CHARACTERISTIC_UUID);
        
        // Also get the speed test characteristic
        try {
            console.log('Getting speed test characteristic...');
            speedTestCharacteristic = await brailleService.getCharacteristic(SPEED_TEST_CHARACTERISTIC_UUID);
            console.log('Speed test characteristic found');
        } catch (err) {
            console.warn('Speed test characteristic not available:', err);
            // Non-critical if not available
        }
        
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
            // For single cell patterns, we need to convert to a two-cell format
            // where the pattern is in the first cell and the second cell is empty
            const twoCellArray = [brailleMatch.array, []];
            formatData = 'O:' + JSON.stringify(twoCellArray);
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

/**
 * Run a BLE speed test to measure how fast data travels through the connection
 */
async function runBleSpeedTest() {
    if (!isConnectedToBLE) {
        alert('Please connect to a BLE device first.');
        return;
    }
    
    try {
        // Check if speed test is available on this device
        if (!speedTestCharacteristic) {
            // Try to get the characteristic or create a fallback
            try {
                speedTestCharacteristic = await brailleService.getCharacteristic(SPEED_TEST_CHARACTERISTIC_UUID);
            } catch (err) {
                // If not found, we'll use the main braille characteristic instead with a special prefix
                console.log('Speed test characteristic not found, using main characteristic as fallback');
                speedTestCharacteristic = brailleCharacteristic;
            }
        }
        
        // Update UI to show test is running
        const speedTestResultsDiv = document.getElementById('ble-speed-test-results');
        speedTestResultsDiv.innerHTML = '<p>Running speed test...</p>';
        
        // Generate test data
        const packetSize = parseInt(document.getElementById('ble-packet-size')?.value) || speedTestPacketSize;
        const packetCount = parseInt(document.getElementById('ble-packet-count')?.value) || speedTestPacketCount;
        const interval = parseInt(document.getElementById('ble-packet-interval')?.value) || speedTestInterval;
        
        // Create a buffer with random data of the specified size
        const testData = new Uint8Array(packetSize);
        for (let i = 0; i < packetSize; i++) {
            testData[i] = Math.floor(Math.random() * 256);
        }
        
        speedTestActive = true;
        speedTestStartTime = Date.now();
        let sentPackets = 0;
        let totalSent = 0;
        
        // Function to send a single packet
        const sendPacket = async () => {
            if (!speedTestActive || sentPackets >= packetCount) {
                // Test complete
                const duration = (Date.now() - speedTestStartTime) / 1000; // in seconds
                const totalBytes = sentPackets * packetSize;
                const speedBps = totalBytes / duration;
                const speedKbps = speedBps / 1024;
                
                // Update results in UI
                speedTestResultsDiv.innerHTML = `
                    <h3>Speed Test Results</h3>
                    <p>Sent ${sentPackets} packets (${totalBytes} bytes) in ${duration.toFixed(2)} seconds</p>
                    <p>Speed: ${speedBps.toFixed(2)} bytes/sec (${speedKbps.toFixed(2)} KB/sec)</p>
                    <p>Average packet time: ${(duration * 1000 / sentPackets).toFixed(2)} ms</p>
                `;
                
                speedTestActive = false;
                return;
            }
            
            try {
                // Add a special prefix to the packet if we're using the main characteristic as fallback
                const dataToSend = speedTestCharacteristic === brailleCharacteristic
                    ? new TextEncoder().encode('S:' + Array.from(testData).join(','))
                    : testData;
                
                await speedTestCharacteristic.writeValue(dataToSend);
                sentPackets++;
                totalSent += packetSize;
                
                // Update progress
                const progress = (sentPackets / packetCount) * 100;
                speedTestResultsDiv.innerHTML = `
                    <p>Running speed test: ${sentPackets}/${packetCount} packets sent (${progress.toFixed(1)}%)</p>
                    <p>Total sent: ${totalSent} bytes</p>
                    <progress value="${sentPackets}" max="${packetCount}"></progress>
                `;
                
                // Schedule next packet
                setTimeout(sendPacket, interval);
            } catch (error) {
                console.error('Error sending test packet:', error);
                speedTestResultsDiv.innerHTML = `
                    <p>Error during speed test: ${error.message}</p>
                    <p>Sent ${sentPackets}/${packetCount} packets before error</p>
                `;
                speedTestActive = false;
            }
        };
        
        // Start sending packets
        sendPacket();
    } catch (error) {
        console.error('Error setting up BLE speed test:', error);
        alert(`Failed to run speed test: ${error.message}`);
    }
}

/**
 * Create the BLE speed test UI
 */
function createBleSpeedTestUI() {
    // Create the container
    const container = document.createElement('div');
    container.id = 'ble-speed-test-container';
    container.className = 'ble-tools-container';
    container.style.margin = '20px 0';
    container.style.padding = '15px';
    container.style.backgroundColor = '#f5f5f5';
    container.style.borderRadius = '8px';
    
    // Create header
    const header = document.createElement('h3');
    header.textContent = 'BLE Speed Test Tool';
    header.style.marginBottom = '10px';
    container.appendChild(header);
    
    // Create form
    const form = document.createElement('div');
    form.className = 'ble-speed-test-form';
    form.style.display = 'grid';
    form.style.gridTemplateColumns = 'repeat(auto-fit, minmax(200px, 1fr))';
    form.style.gap = '10px';
    form.style.marginBottom = '15px';
    
    // Packet size input
    const sizeGroup = document.createElement('div');
    const sizeLabel = document.createElement('label');
    sizeLabel.htmlFor = 'ble-packet-size';
    sizeLabel.textContent = 'Packet Size (bytes):';
    const sizeInput = document.createElement('input');
    sizeInput.type = 'number';
    sizeInput.id = 'ble-packet-size';
    sizeInput.value = speedTestPacketSize;
    sizeInput.min = '1';
    sizeInput.max = '512';
    sizeInput.style.width = '100%';
    sizeInput.style.padding = '5px';
    sizeGroup.appendChild(sizeLabel);
    sizeGroup.appendChild(sizeInput);
    form.appendChild(sizeGroup);
    
    // Packet count input
    const countGroup = document.createElement('div');
    const countLabel = document.createElement('label');
    countLabel.htmlFor = 'ble-packet-count';
    countLabel.textContent = 'Number of Packets:';
    const countInput = document.createElement('input');
    countInput.type = 'number';
    countInput.id = 'ble-packet-count';
    countInput.value = speedTestPacketCount;
    countInput.min = '1';
    countInput.max = '1000';
    countInput.style.width = '100%';
    countInput.style.padding = '5px';
    countGroup.appendChild(countLabel);
    countGroup.appendChild(countInput);
    form.appendChild(countGroup);
    
    // Interval input
    const intervalGroup = document.createElement('div');
    const intervalLabel = document.createElement('label');
    intervalLabel.htmlFor = 'ble-packet-interval';
    intervalLabel.textContent = 'Packet Interval (ms):';
    const intervalInput = document.createElement('input');
    intervalInput.type = 'number';
    intervalInput.id = 'ble-packet-interval';
    intervalInput.value = speedTestInterval;
    intervalInput.min = '0';
    intervalInput.max = '1000';
    intervalInput.style.width = '100%';
    intervalInput.style.padding = '5px';
    intervalGroup.appendChild(intervalLabel);
    intervalGroup.appendChild(intervalInput);
    form.appendChild(intervalGroup);
    
    container.appendChild(form);
    
    // Create run button
    const runButton = document.createElement('button');
    runButton.textContent = 'Run Speed Test';
    runButton.className = 'ble-speed-test-button';
    runButton.style.backgroundColor = '#2196F3';
    runButton.style.color = 'white';
    runButton.style.border = 'none';
    runButton.style.borderRadius = '4px';
    runButton.style.padding = '8px 15px';
    runButton.style.cursor = 'pointer';
    runButton.style.marginBottom = '15px';
    runButton.addEventListener('click', runBleSpeedTest);
    container.appendChild(runButton);
    
    // Create results div
    const resultsDiv = document.createElement('div');
    resultsDiv.id = 'ble-speed-test-results';
    resultsDiv.className = 'ble-speed-test-results';
    resultsDiv.innerHTML = '<p>Click "Run Speed Test" to measure BLE transfer speed</p>';
    container.appendChild(resultsDiv);
    
    // Add to the main element
    const insertPoint = document.querySelector('.app-container');
    insertPoint.appendChild(container);
}

/**
 * Run a test sequence sending braille patterns for alphabet and numbers
 */
async function runBrailleTest() {
    if (!isConnectedToBLE) {
        alert('Please connect to a BLE device first.');
        return;
    }
    
    // Disable the button during the test
    const testButton = document.getElementById('braille-test-button');
    testButton.disabled = true;
    testButton.style.opacity = '0.6';
    testButton.textContent = 'Testing...';
    
    try {
        // Get all alphabet letters and numbers from the database
        const alphabetAndNumbers = brailleDB.database.filter(entry => 
            /^[a-z]$|^(one|two|three|four|five|six|seven|eight|nine|zero)$/.test(entry.word)
        );
        
        // Sort them - letters first, then numbers
        alphabetAndNumbers.sort((a, b) => {
            const aIsLetter = /^[a-z]$/.test(a.word);
            const bIsLetter = /^[a-z]$/.test(b.word);
            
            if (aIsLetter && !bIsLetter) return -1;
            if (!aIsLetter && bIsLetter) return 1;
            
            // Both are letters or both are numbers
            if (aIsLetter && bIsLetter) {
                return a.word.localeCompare(b.word);
            } else {
                // For numbers, we need to convert the words to actual numbers for comparison
                const numberWords = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
                return numberWords.indexOf(a.word) - numberWords.indexOf(b.word);
            }
        });
        
        console.log(`Starting braille test with ${alphabetAndNumbers.length} patterns`);
        
        // Process each pattern
        for (let i = 0; i < alphabetAndNumbers.length; i++) {
            const entry = alphabetAndNumbers[i];
            
            // Create a pattern that alternates between cells for each character
            const cellIndex = i % 2; // Alternate between 0 and 1
            let pattern;
            
            // Create a 2-cell array with the current pattern in the appropriate cell
            if (cellIndex === 0) {
                pattern = [entry.array, []]; // First cell active, second cell empty
            } else {
                pattern = [[], entry.array]; // First cell empty, second cell active
            }
            
            // Display in the UI
            displayBrailleOutput([{
                word: entry.word,
                array: pattern
            }]);
            
            // Send to BLE
            await sendBrailleTestPattern(pattern);
            
            // Display status
            testButton.textContent = `Testing: ${entry.word}`;
            
            // Wait 0.5 seconds before next pattern
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        // Clear display and reset button when done
        brailleOutput.innerHTML = '';
        
    } catch (error) {
        console.error('Error in braille test:', error);
        alert(`Test failed: ${error.message}`);
    } finally {
        // Re-enable button
        testButton.disabled = false;
        testButton.style.opacity = '1';
        testButton.textContent = 'Test Braille Display';
    }
}

/**
 * Send a test pattern to the BLE device
 */
async function sendBrailleTestPattern(patternArray) {
    if (!isConnectedToBLE || !brailleCharacteristic) {
        console.log('Cannot send test pattern: not connected');
        return;
    }
    
    try {
        // Format the data as a two-cell array
        const formatData = 'O:' + JSON.stringify(patternArray);
        
        console.log('Sending test pattern:', formatData);
        const encoder = new TextEncoder();
        await brailleCharacteristic.writeValue(encoder.encode(formatData));
    } catch (error) {
        console.error('Error sending test pattern:', error);
        throw error;
    }
}

/**
 * Initialize the app when the DOM is loaded
 */
document.addEventListener('DOMContentLoaded', () => {
    initApp();
    
    // Use the existing BLE connect button
    const bleButton = document.querySelector('.ble-button');
    if (bleButton) {
        bleButton.addEventListener('click', connectToBLE);
    }
    
    // Add event listener for the braille test button
    const testButton = document.getElementById('braille-test-button');
    if (testButton) {
        testButton.addEventListener('click', runBrailleTest);
    }
    
    // Create BLE speed test UI
    createBleSpeedTestUI();
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
