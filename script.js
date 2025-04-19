/**
 * Speech-to-Braille Progressive Web App
 */

// DOM Elementsplementation
const introPhase = document.getElementById('intro-phase');
const recordingPhase = document.getElementById('recording-phase');
const outputPhase = document.getElementById('output-phase');
const introCountdown = document.getElementById('intro-countdown');
const outputCountdown = document.getElementById('output-countdown');
const recognizedText = document.getElementById('recognized-text');
const brailleOutput = document.getElementById('braille-output');
const audioWave = document.getElementById('audio-wave');built-in data
const bleStatus = document.getElementById('ble-status');son').catch(() => null);
const phaseStatus = document.getElementById('phase-status');
            if (response && response.ok) {
// BLE Variables// If external file exists, use it
let bleDevice = null;database = await response.json();
let bleServer = null;
let brailleService = null;se use built-in database
let brailleCharacteristic = null;his.getBuiltInDatabase();
let speedTestCharacteristic = null; // New speed test characteristic
const BRAILLE_SERVICE_UUID = "19b10000-e8f2-537e-4f6c-d104768a1214";
const BRAILLE_CHARACTERISTIC_UUID = "19b10001-e8f2-537e-4f6c-d104768a1214";h} entries`);
const SPEED_TEST_CHARACTERISTIC_UUID = "19b10002-e8f2-537e-4f6c-d104768a1214"; // New UUID for speed testing
            return true;
// Speed test variables {
let speedTestActive = false;ailed to load Braille database:', error);
let speedTestStartTime = 0; database as fallback
let speedTestPacketSize = 20; // Default packet size in bytes
let speedTestPacketCount = 100; // Default number of packets to send
let speedTestInterval = 10; // Default interval between packets in ms
        }
// Phase constants
const PHASE_NOT_OUTPUT = 0;
const PHASE_OUTPUT = 1;
        if (!this.loaded) {
// Application statewarn('Braille database not loaded yet');
let currentPhase = 'intro';
let recognition = null;
let recognitionActive = false;
let currentTranscript = '';ord.toLowerCase().trim();
let introTimer = null;tabase.find(entry => entry.word.toLowerCase() === cleanWord);
let outputTimer = null;
let isConnectedToBLE = false;
    searchWords(text) {
/**     if (!this.loaded) {
 * Initialize the applicationille database not loaded yet');
 */         return [];
async function initApp() {
    // Load braille database
    await brailleDB.loadDatabase();w => w.length > 0);
        await brailleDB.loadDatabase();    const matches = [];
    // Setupsle.log('Braille database loaded successfully');
    setupAudioVisualization();
    setupSpeechRecognition(); to load Braille database:', error);s.findWord(word);
    setupTextToSpeech();Braille database could not be loaded completely. Some features may be limited.');atches.push(match);
    startIntroductionPhase();
}          
    // Setups        return matches;
/** setupAudioVisualization(); },
 * Setup Speech Recognition);
 */ setupTextToSpeech(); getBuiltInDatabase() {
function setupSpeechRecognition() {lish alphabet and some common words
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US'; 5] },
        'SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {    { word: "f", array: [1, 2, 4] },
        recognition.onstart = () => {dow.SpeechRecognition || window.webkitSpeechRecognition;, 4, 5] },
            recognitionActive = true;nition();, 5] },
            console.log('Speech recognition started');
        };cognition.interimResults = true;  { word: "j", array: [2, 4, 5] },
        recognition.lang = 'en-US';    { word: "k", array: [1, 3] },
        recognition.onresult = (event) => {
            let interim = ''; () => {y: [1, 3, 4] },
            for (let i = event.resultIndex; i < event.results.length; i++) {
                if (event.results[i].isFinal) {rted');
                    // Get the complete recognized text
                    const recognizedText = event.results[i][0].transcript.trim();
                    // Add to transcript> {, 5] },
                    currentTranscript += recognizedText + ' ';
                     i = event.resultIndex; i < event.results.length; i++) {"t", array: [2, 3, 4, 5] },
                    // Split into individual words for matching
                    const words = recognizedText.toLowerCase().split(/\s+/);
                    const recognizedText = event.results[i][0].transcript.trim();"w", array: [2, 4, 5, 6] },
                    // Only process the last word in the phrase
                    if (words.length > 0) {cognizedText + ' ';, 6] },
                        const lastWord = words[words.length - 1];
                        if (lastWord) {idual words for matching5, 6] },
                            // Verify database is loaded/);
                            if (!brailleDB.loaded) {
                                console.warn('Cannot process word: Braille database not loaded');last word in the phrase5] },
                                continue;
                            }1];
                            
                            // Try to find a match for this specific wordry to find a match for this specific worday: [2, 3, 5, 6] },
                            const match = brailleDB.findWord(lastWord);d(lastWord);
                            if (match) {
                                console.log(`Found match for last word: ${lastWord}`, match); last word: ${lastWord}`, match);
                                // Display this specific match/ Display this specific match [[1, 2, 3, 4], [1, 3, 4, 5], [1, 4, 5]] },
                                displayBrailleOutput([match]);displayBrailleOutput([match]);: [[2, 3, 4, 5], [1, 2, 5], [1, 5]] },
                                
                                // Send to BLE if connectedconnected, [1, 3, 5], [1, 3, 6]] }
                                if (isConnectedToBLE) {
                                    sendBrailleToBLE(match);railleToBLE(match);
                                }
                                
                                // Clear after 8 seconds
                                setTimeout(() => {   setTimeout(() => {etElementById('intro-phase');
                                    brailleOutput.innerHTML = '';           brailleOutput.innerHTML = '';cument.getElementById('recording-phase');
                                }, 8000);           }, 8000);ocument.getElementById('output-phase');
                            } else {    } else {ocument.getElementById('intro-countdown');
                                // Play no-match audio cue);
                                playAudioCue('no-match');               playAudioCue('no-match');ext = document.getElementById('recognized-text');
                            }               }Output = document.getElementById('braille-output');
                        }                        }const audioWave = document.getElementById('audio-wave');
                    }
                } else {s');
                    interim += event.results[i][0].transcript;s[i][0].transcript;
                }
            } null;
let bleServer = null;
            // Display the recognized text
            recognizedText.innerHTML = ` = `
                <p>${currentTranscript}</p>      <p>${currentTranscript}</p>estCharacteristic = null; // New speed test characteristic
                <p><em>${interim}</em></p>        <p><em>${interim}</em></p>AILLE_SERVICE_UUID = "19b10000-e8f2-537e-4f6c-d104768a1214";
            `;214";

            // Animate the audio visualization
            animateAudioWave(event);
        };ive = false;
        tStartTime = 0;
        recognition.onerror = (event) => {recognition.onerror = (event) => {dTestPacketSize = 20; // Default packet size in bytes
            console.error('Speech recognition error', event.error);ecognition error', event.error);Default number of packets to send
            if (event.error === 'no-speech') {eech') { interval between packets in ms
                audioWave.style.transform = 'scaleY(0.1)';0.1)';
            }  }onstants
        };T_OUTPUT = 0;
        
        recognition.onend = () => {
            recognitionActive = false;       recognitionActive = false;plication state
            console.log('Speech recognition ended');           console.log('Speech recognition ended');et currentPhase = 'intro';
        };        };let recognition = null;
    } else { } else { recognitionActive = false;
        recognizedText.innerHTML = '<p>Speech recognition is not supported in this browser.</p>';p>Speech recognition is not supported in this browser.</p>';
        console.error('Speech Recognition API not supported');     console.error('Speech Recognition API not supported'); introTimer = null;
    }
}

/**
 * Setup Text-to-Speech functionalityext-to-Speech functionalityize the application
 */
function setupTextToSpeech() {
    if ('speechSynthesis' in window) {f ('speechSynthesis' in window) {/ Load braille database
        window.speechSynthesis.onvoiceschanged = () => {       window.speechSynthesis.onvoiceschanged = () => {   await brailleDB.loadDatabase();
            window.speechSynthesis.getVoices();            window.speechSynthesis.getVoices();    
        };     }; // Setups
    } else {
        console.error('Text-to-Speech not supported');     console.error('Text-to-Speech not supported'); setupSpeechRecognition();
    }
}

/**
 * Switch speech recognition languageitch speech recognition language
 */tup Speech Recognition
async function switchLanguage(lang) {ang) {
    if (lang !== 'en' && lang !== 'fil') {g !== 'fil') {ion() {
        console.error('Unsupported language:', lang);upported language:', lang);' in window || 'webkitSpeechRecognition' in window) {
        return;Recognition || window.webkitSpeechRecognition;
    }nition = new SpeechRecognition();
      recognition.continuous = true;
    // Stop current recognition// Stop current recognition    recognition.interimResults = true;
    if (recognitionActive) {{'en-US';
        if (recognition) {    if (recognition) {    
            recognition.stop();
        }e;
    }
      };
    currentLanguage = lang;currentLanguage = lang;    
    
    // Update Web Speech API language
    if (recognition) {length; i++) {
        recognition.lang = lang === 'en' ? 'en-US' : 'fil-PH';on.lang = lang === 'en' ? 'en-US' : 'fil-PH';f (event.results[i].isFinal) {
    }
    nt.results[i][0].transcript.trim();
    // Restart recognition if currently in recording phase
    if (currentPhase === 'recording') {ntPhase === 'recording') {       currentTranscript += recognizedText + ' ';
        if (recognition && !isUsingVosk) {f (recognition && !isUsingVosk) {           
            try {       try {               // Split into individual words for matching
                recognition.start();            recognition.start();                const words = recognizedText.toLowerCase().split(/\s+/);
            } catch (e) {
                console.error('Recognition restart error:', e);.error('Recognition restart error:', e);Only process the last word in the phrase
            }           }                   if (words.length > 0) {
        }        }                        const lastWord = words[words.length - 1];
    } }                     if (lastWord) {
    ific word
    // Update language indicator in UI // Update language indicator in UI                         const match = brailleDB.findWord(lastWord);
    updateLanguageUI();ch) {
}
                        // Display this specific match
/**utput([match]);
 * Update language indicator in UI
 */
function updateLanguageUI() {
    let langIndicator = document.getElementById('language-indicator');
                              }
    if (!langIndicator) {if (!langIndicator) {                            
        langIndicator = document.createElement('div');
        langIndicator.id = 'language-indicator';       langIndicator.id = 'language-indicator';                               setTimeout(() => {
        langIndicator.className = 'status';        langIndicator.className = 'status';                                    brailleOutput.innerHTML = '';
        document.querySelector('.status-container').appendChild(langIndicator);     document.querySelector('.status-container').appendChild(langIndicator);                             }, 8000);
    }
                                  // Play no-match audio cue
    langIndicator.textContent = `Language: ${currentLanguage === 'en' ? 'English' : 'Filipino'}`;ent = `Language: ${currentLanguage === 'en' ? 'English' : 'Filipino'}`;      playAudioCue('no-match');
}

/**
 * Speak text using Text-to-Speecheak text using Text-to-Speech           } else {
 */*/                   interim += event.results[i][0].transcript;
function speakText(text) {function speakText(text) {                }
    if ('speechSynthesis' in window) { if ('speechSynthesis' in window) {         }
        const utterance = new SpeechSynthesisUtterance(text);peechSynthesisUtterance(text);
        window.speechSynthesis.speak(utterance);     window.speechSynthesis.speak(utterance);         // Display the recognized text
    }
}nscript}</p>

/**
 * Start the introduction phase
 */       // Animate the audio visualization
function startIntroductionPhase() {tionPhase() {ioWave(event);
    // Update UI
    currentPhase = 'intro';
    updatePhaseDisplay();updatePhaseDisplay();    recognition.onerror = (event) => {
    setActivePhase(introPhase);e);peech recognition error', event.error);
    
    // Reset countdown// Reset countdown            audioWave.style.transform = 'scaleY(0.1)';
    let countdown = 12;;
    introCountdown.textContent = countdown;ntdown;
    
    // Speak welcome message
    speakText('Welcome to Speech to Braille. Get ready to speak.');kText('Welcome to Speech to Braille. Get ready to speak.');    recognitionActive = false;
    
    // Start countdown
    introTimer = setInterval(() => { {
        countdown--;ountdown--;ecognizedText.innerHTML = '<p>Speech recognition is not supported in this browser.</p>';
        introCountdown.textContent = countdown;Countdown.textContent = countdown;le.error('Speech Recognition API not supported');
                  }
        if (countdown <= 0) {        if (countdown <= 0) {}
            clearInterval(introTimer);         clearInterval(introTimer);
            startRecordingPhase();ase();
        }     }Setup Text-to-Speech functionality
    }, 1000);
}

/**= () => {
 * Start the recording phasees();
 */
function startRecordingPhase() {
    // Update UI// Update UI    console.error('Text-to-Speech not supported');
    currentPhase = 'recording';
    updatePhaseDisplay();
    setActivePhase(recordingPhase);setActivePhase(recordingPhase);
    currentTranscript = '';
    recognizedText.innerHTML = '<p>Speak now...</p>';erHTML = '<p>Speak now...</p>';nition language
    
    // Play audio cue for recording modeing modeng) {
    playAudioCue('recording');ording'); && lang !== 'fil') {
    
    // Start speech recognitionart speech recognitioneturn;
    if (recognition) {f (recognition) {
        try {    try {
            recognition.start();
        } catch (e) {
            console.error('Recognition already started:', e);           console.error('Recognition already started:', e);       if (recognition) {
        }        }            recognition.stop();
    } }     }
    
    // Add a click handler to manually transition to output phase (for testing) // Add a click handler to manually transition to output phase (for testing) 
    recordingPhase.addEventListener('click', startOutputPhase, { once: true });stener('click', startOutputPhase, { once: true });
}

/**    console.warn('Cannot process text: Braille database not loaded');f (recognition) {
 * Start the output phase
 */
function startOutputPhase() {
    // Process the recognized text for braille matchesurrently in recording phase
    const brailleMatches = brailleDB.searchWords(currentTranscript);illeDB.searchWords(currentTranscript);Phase === 'recording') {
    / Process the recognized text for braille matches  if (recognition && !isUsingVosk) {
    // If no matches found, return to recording phase immediatelyconst brailleMatches = brailleDB.searchWords(currentTranscript);// If no matches found, return to recording phase immediately        try {
    if (brailleMatches.length === 0) {h === 0) {recognition.start();
        console.log('No braille matches found, returning to recording phase');return to recording phase immediatelylle matches found, returning to recording phase');
        startRecordingPhase();ngth === 0) {se();rror('Recognition restart error:', e);
        return;matches found, returning to recording phase');
    }    startRecordingPhase();}    }
    
    // Update UI
    currentPhase = 'output';
    updatePhaseDisplay();/ Update UIpdatePhaseDisplay();pdateLanguageUI();
    setActivePhase(outputPhase);currentPhase = 'output';setActivePhase(outputPhase);
    
    // Stop speech recognitionase);ion
    if (recognition && recognitionActive) {if (recognition && recognitionActive) {pdate language indicator in UI
        recognition.stop();
    }if (recognition && recognitionActive) {}tion updateLanguageUI() {
    
    // Play audio cue for output mode
    playAudioCue('output');
    / Play audio cue for output mode  langIndicator = document.createElement('div');
    displayBrailleOutput(brailleMatches);playAudioCue('output');displayBrailleOutput(brailleMatches);    langIndicator.id = 'language-indicator';
    
    // Send braille data to BLE device if connectedut(brailleMatches);ta to BLE device if connectedSelector('.status-container').appendChild(langIndicator);
    if (isConnectedToBLE && brailleMatches.length > 0) {
        sendBrailleToBLE(brailleMatches[0]);// Send braille data to BLE device if connected    sendBrailleToBLE(brailleMatches[0]);
    }LE && brailleMatches.length > 0) {ge: ${currentLanguage === 'en' ? 'English' : 'Filipino'}`;
    es[0]);
    // Reset countdown
    let countdown = 8;
    outputCountdown.textContent = countdown;eset countdownutCountdown.textContent = countdown; text using Text-to-Speech
    
    // Start countdowndown;
    outputTimer = setInterval(() => {
        countdown--;art countdownountdown--;onst utterance = new SpeechSynthesisUtterance(text);
        outputCountdown.textContent = countdown;er = setInterval(() => {tCountdown.textContent = countdown;w.speechSynthesis.speak(utterance);
               countdown--;          }
        if (countdown <= 0) {        outputCountdown.textContent = countdown;        if (countdown <= 0) {}
            clearInterval(outputTimer);              clearInterval(outputTimer);
            startRecordingPhase();
        }         clearInterval(outputTimer);     }Start the introduction phase
    }, 1000);
}
}, 1000);pdate UI
/**
 * Display braille output on the screen
 */
function displayBrailleOutput(matches) {splay braille output on the screenion displayBrailleOutput(matches) {
    brailleOutput.innerHTML = '';railleOutput.innerHTML = '';// Reset countdown
    matches) {
    if (matches.length === 0) {
        brailleOutput.innerHTML = '<div class="no-matches">No matching braille patterns found</div>';rns found</div>';
        return;matches.length === 0) {return;peak welcome message
    }>No matching braille patterns found</div>';
    
    matches.forEach(match => {.forEach(match => {tart countdown
        const wordElem = document.createElement('div');
        wordElem.className = 'braille-word';
        t('div');
        const patternElem = document.createElement('div');
        patternElem.className = 'braille-pattern';assName = 'braille-pattern';ntdown <= 0) {
        tternElem = document.createElement('div');l(introTimer);
        // If it's a nested array (multiple cells)raille-pattern';(multiple cells)
        if (Array.isArray(match.array[0])) {
            match.array.forEach(cellArray => {/ If it's a nested array (multiple cells)   match.array.forEach(cellArray => {00);
                patternElem.appendChild(createBrailleCell(cellArray));if (Array.isArray(match.array[0])) {        patternElem.appendChild(createBrailleCell(cellArray));
            });
        } else {reateBrailleCell(cellArray));
            // Single braille cell
            patternElem.appendChild(createBrailleCell(match.array));} else {    patternElem.appendChild(createBrailleCell(match.array));
        }
        ateBrailleCell(match.array));
        const textElem = document.createElement('div');
        textElem.className = 'word-text';textElem.className = 'word-text';tePhaseDisplay();
        textElem.textContent = match.word;.createElement('div');tch.word;);
        word-text';
        wordElem.appendChild(patternElem); textElem.textContent = match.word; wordElem.appendChild(patternElem);ognizedText.innerHTML = '<p>Speak now...</p>';
        wordElem.appendChild(textElem);              wordElem.appendChild(textElem);   
        brailleOutput.appendChild(wordElem);        wordElem.appendChild(patternElem);        brailleOutput.appendChild(wordElem);    // Play audio cue for recording mode
             wordElem.appendChild(textElem);      playAudioCue('recording');
        // Speak the matched word
        speakText(match.word);          speakText(match.word); // Start speech recognition
    });
}

/**
 * Create a visual braille cell representation * Create a visual braille cell representation            console.error('Recognition already started:', e);
 */
// Corrected the braille dot layout to match the 1-4, 2-5, 3-6 configurationpresentationt to match the 1-4, 2-5, 3-6 configuration
function createBrailleCell(dotsArray) {
    const cellElem = document.createElement('div'); match the 1-4, 2-5, 3-6 configurationement('div'); transition to output phase (for testing)
    cellElem.className = 'braille-cell';) {ll';'click', startOutputPhase, { once: true });
ent('div');
    // Create 6 dots (2x3 grid)lem.className = 'braille-cell';eate 6 dots (2x3 grid)
    for (let i = 1; i <= 6; i++) {
        const dot = document.createElement('div');    // Create 6 dots (2x3 grid)        const dot = document.createElement('div'); * Start the output phase
        dot.className = 'braille-dot';
        if (dotsArray.includes(i)) {cument.createElement('div');includes(i)) {ase() {
            dot.classList.add('active');
        }
        cellElem.appendChild(dot);
es found, return to recording phase immediately
        // Adjust layout for 1-4, 2-5, 3-6   cellElem.appendChild(dot);   // Adjust layout for 1-4, 2-5, 3-6f (brailleMatches.length === 0) {
        if (i === 3) {        if (i === 3) {        console.log('No braille matches found, returning to recording phase');
            const spacer = document.createElement('div');yout for 1-4, 2-5, 3-6acer = document.createElement('div');ngPhase();
            spacer.style.flexBasis = '100%';       if (i === 3) {           spacer.style.flexBasis = '100%';       return;
            cellElem.appendChild(spacer);            const spacer = document.createElement('div');            cellElem.appendChild(spacer);    }
        }         spacer.style.flexBasis = '100%';     } 
    }endChild(spacer);
     }rrentPhase = 'output';
    return cellElem;
}hase);

/**
 * Connect to BLE device
 */
async function connectToBLE() {LE deviceconnectToBLE() {
    try {
        console.log('Requesting BLE device...');ion connectToBLE() {sole.log('Requesting BLE device...'); audio cue for output mode
        bleDevice = await navigator.bluetooth.requestDevice({{bleDevice = await navigator.bluetooth.requestDevice({AudioCue('output');
            filters: [{
                name: 'Braille Display'stDevice({
            }],    filters: [{    }],
            optionalServices: [BRAILLE_SERVICE_UUID]
        });
            optionalServices: [BRAILLE_SERVICE_UUID]sendBrailleToBLE(brailleMatches[0]);
        console.log('Connecting to GATT server...');
        bleServer = await bleDevice.gatt.connect();
        console.log('Connecting to GATT server...');eset countdown
        console.log('Getting primary service...'););;
        brailleService = await bleServer.getPrimaryService(BRAILLE_SERVICE_UUID);vice = await bleServer.getPrimaryService(BRAILLE_SERVICE_UUID);ntdown.textContent = countdown;
        
        console.log('Getting braille characteristic...');
        brailleCharacteristic = await brailleService.getCharacteristic(BRAILLE_CHARACTERISTIC_UUID);
        tting braille characteristic...');
        // Also get the speed test characteristicILLE_CHARACTERISTIC_UUID);
        try {
            console.log('Getting speed test characteristic...');/ Also get the speed test characteristic   console.log('Getting speed test characteristic...');f (countdown <= 0) {
            speedTestCharacteristic = await brailleService.getCharacteristic(SPEED_TEST_CHARACTERISTIC_UUID);try {    speedTestCharacteristic = await brailleService.getCharacteristic(SPEED_TEST_CHARACTERISTIC_UUID);    clearInterval(outputTimer);
            console.log('Speed test characteristic found'); speed test characteristic...');est characteristic found'););
        } catch (err) {cteristic = await brailleService.getCharacteristic(SPEED_TEST_CHARACTERISTIC_UUID);
            console.warn('Speed test characteristic not available:', err);    console.log('Speed test characteristic found');    console.warn('Speed test characteristic not available:', err);000);
            // Non-critical if not available
        }    console.warn('Speed test characteristic not available:', err);}
        
        isConnectedToBLE = true;;utput on the screen
        updateBleStatus();
        
        bleDevice.addEventListener('gattserverdisconnected', onBleDisconnected);serverdisconnected', onBleDisconnected);
        
        console.log('BLE connection established!');EventListener('gattserverdisconnected', onBleDisconnected);BLE connection established!');h === 0) {
        return true;      return true;   brailleOutput.innerHTML = '<div class="no-matches">No matching braille patterns found</div>';
    } catch (error) {       console.log('BLE connection established!');   } catch (error) {       return;
        console.error('BLE connection error:', error);        return true;        console.error('BLE connection error:', error);    }
        isConnectedToBLE = false; } catch (error) {     isConnectedToBLE = false; 
        updateBleStatus();connection error:', error); {
        return false;     isConnectedToBLE = false;     return false;     const wordElem = document.createElement('div');
    }
}

/**
 * Handle BLE disconnection Handle BLE disconnection       
 *//** */        // If it's a nested array (multiple cells)
function onBleDisconnected() {Handle BLE disconnectionction onBleDisconnected() {     if (Array.isArray(match.array[0])) {
    console.log('BLE device disconnected');
    isConnectedToBLE = false;ction onBleDisconnected() { isConnectedToBLE = false;             patternElem.appendChild(createBrailleCell(cellArray));
    updateBleStatus();
}

/**eBrailleCell(match.array));
 * Send braille data to BLE deviceaille data to BLE device   }
 */  
async function sendBrailleToBLE(brailleMatch) {raille data to BLE devicection sendBrailleToBLE(brailleMatch) {onst textElem = document.createElement('div');
    if (!isConnectedToBLE || !brailleCharacteristic) {
        console.log('Cannot send to BLE: not connected');lleToBLE(brailleMatch) {nnot send to BLE: not connected');ntent = match.word;
        return;!isConnectedToBLE || !brailleCharacteristic) {return;
    }cted');
    
    try {
        // Format the data to match the ESP32 expectations
        let formatData; the matched word
        
        // If it's a nested array (multiple cells)
        if (Array.isArray(brailleMatch.array[0])) {
            // Send as JSON string with phase prefix
            formatData = 'O:' + JSON.stringify(brailleMatch.array);f (Array.isArray(brailleMatch.array[0])) {   formatData = 'O:' + JSON.stringify(brailleMatch.array);
        } else {    // Send as JSON string with phase prefix} else {e a visual braille cell representation
            // For single cell patterns, we need to convert to a two-cell formatlleMatch.array); convert to a two-cell format
            // where the pattern is in the first cell and the second cell is empty cell is emptych the 1-4, 2-5, 3-6 configuration
            const twoCellArray = [brailleMatch.array, []];ormat
            formatData = 'O:' + JSON.stringify(twoCellArray);st cell and the second cell is empty(twoCellArray);iv');
        }CellArray = [brailleMatch.array, []];-cell';
        
        console.log('Sending to BLE:', formatData);   }   console.log('Sending to BLE:', formatData);/ Create 6 dots (2x3 grid)
        const encoder = new TextEncoder();              const encoder = new TextEncoder();   for (let i = 1; i <= 6; i++) {
        await brailleCharacteristic.writeValue(encoder.encode(formatData));        console.log('Sending to BLE:', formatData);        await brailleCharacteristic.writeValue(encoder.encode(formatData));        const dot = document.createElement('div');
        console.log('Data sent successfully');     const encoder = new TextEncoder();     console.log('Data sent successfully');     dot.className = 'braille-dot';
    } catch (error) {eristic.writeValue(encoder.encode(formatData));{
        console.error('Error sending data to BLE device:', error);     console.log('Data sent successfully');     console.error('Error sending data to BLE device:', error);         dot.classList.add('active');
    }
}

/****       // Adjust layout for 1-4, 2-5, 3-6
 * Update BLE status display * Update BLE status display        if (i === 3) {
 */         const spacer = document.createElement('div');
function updateBleStatus() { = '100%';
    bleStatus.textContent = isConnectedToBLE ? 'BLE: Connected' : 'BLE: Disconnected'; bleStatus.textContent = isConnectedToBLE ? 'BLE: Connected' : 'BLE: Disconnected';         cellElem.appendChild(spacer);
    bleStatus.className = isConnectedToBLE ? 'status connected' : 'status';tedToBLE ? 'status connected' : 'status';
}nt = isConnectedToBLE ? 'BLE: Connected' : 'BLE: Disconnected';
bleStatus.className = isConnectedToBLE ? 'status connected' : 'status';
/**
 * Update phase status display
 */
function updatePhaseDisplay() {atus displayseDisplay() {
    let phaseText = '';
    
    switch(currentPhase) {= '';Phase) {nectToBLE() {
        case 'intro':
            phaseText = 'Introduction';E device...');
            break;o':= await navigator.bluetooth.requestDevice({
        case 'recording':eText = 'Introduction';cording':ers: [{
            phaseText = 'Recording';
            break;   case 'recording':       break;       }],
        case 'output':        phaseText = 'Recording';    case 'output':        optionalServices: [BRAILLE_SERVICE_UUID]
            phaseText = 'Output';
            break;       case 'output':           break;       
        default:            phaseText = 'Output';        default:        console.log('Connecting to GATT server...');
            phaseText = 'Unknown';         break;         phaseText = 'Unknown';     bleServer = await bleDevice.gatt.connect();
    }
             phaseText = 'Unknown';      console.log('Getting primary service...');
    phaseStatus.textContent = `Phase: ${phaseText}`;RAILLE_SERVICE_UUID);
}
aseText}`;
/**
 * Set the active phase by showing/hiding phase elements
 */  // Also get the speed test characteristic
function setActivePhase(phaseElement) {howing/hiding phase elementseElement) {
    // Hide all phases
    introPhase.classList.remove('active');unction setActivePhase(phaseElement) {   introPhase.classList.remove('active');           speedTestCharacteristic = await brailleService.getCharacteristic(SPEED_TEST_CHARACTERISTIC_UUID);
    recordingPhase.classList.remove('active');    // Hide all phases    recordingPhase.classList.remove('active');            console.log('Speed test characteristic found');
    outputPhase.classList.remove('active'); introPhase.classList.remove('active'); outputPhase.classList.remove('active');     } catch (err) {
    ctive'););
    // Show the active phase outputPhase.classList.remove('active'); // Show the active phase         // Non-critical if not available
    phaseElement.classList.add('active');
}

/**
 * Play audio cue for different phasesaudio cue for different phases    
 */
function playAudioCue(type) {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();onst audioContext = new (window.AudioContext || window.webkitAudioContext)();    console.log('BLE connection established!');
    const oscillator = audioContext.createOscillator();xt.createOscillator();
    const gainNode = audioContext.createGain();dow.AudioContext || window.webkitAudioContext)();.createGain();
    ();
    oscillator.connect(gainNode);createGain();
    gainNode.connect(audioContext.destination);.connect(audioContext.destination);updateBleStatus();
    Node);
    if (type === 'recording') {Context.destination);g') {
        oscillator.type = 'sine';
        oscillator.frequency.value = 440; // A4 note 'recording') {or.frequency.value = 440; // A4 note
        gainNode.gain.value = 0.1;
        440; // A4 note
        oscillator.start();
        setTimeout(() => {
            oscillator.stop();oscillator.start();    oscillator.stop();ole.log('BLE device disconnected');
        }, 300);
    } else if (type === 'output') {p();utput') {
        oscillator.type = 'triangle';
        oscillator.frequency.value = 659.25; // E5 noteype === 'output') {or.frequency.value = 659.25; // E5 note
        gainNode.gain.value = 0.1;
        659.25; // E5 note
        oscillator.start();
        setTimeout(() => {
            oscillator.stop();oscillator.start();    oscillator.stop();!isConnectedToBLE || !brailleCharacteristic) {
        }, 300);: not connected');
    } else if (type === 'no-match') {p();o-match') {
        oscillator.type = 'sawtooth';
        oscillator.frequency.value = 330; // E4 noteype === 'no-match') {or.frequency.value = 330; // E4 note
        gainNode.gain.value = 0.1;oscillator.type = 'sawtooth';gainNode.gain.value = 0.1;{
        
        oscillator.start();e = 0.1;;
        setTimeout(() => {
            oscillator.stop();
        }, 200);
        
        // Play a second tone after a short delay for a distinctive "no match" sound00);lay a second tone after a short delay for a distinctive "no match" soundformatData = 'O:' + JSON.stringify(brailleMatch.array);
        setTimeout(() => {
            const secondOscillator = audioContext.createOscillator();after a short delay for a distinctive "no match" soundator = audioContext.createOscillator(); patterns, we need to convert to a two-cell format
            secondOscillator.connect(gainNode);t cell and the second cell is empty
            secondOscillator.type = 'sawtooth';condOscillator = audioContext.createOscillator();cillator.type = 'sawtooth';oCellArray = [brailleMatch.array, []];
            secondOscillator.frequency.value = 220; // A3 notendOscillator.connect(gainNode);ndOscillator.frequency.value = 220; // A3 noteatData = 'O:' + JSON.stringify(twoCellArray);
                   secondOscillator.type = 'sawtooth';          }
            secondOscillator.start();           secondOscillator.frequency.value = 220; // A3 note           secondOscillator.start();       
            setTimeout(() => {                        setTimeout(() => {        console.log('Sending to BLE:', formatData);
                secondOscillator.stop();         secondOscillator.start();             secondOscillator.stop();     const encoder = new TextEncoder();
            }, 200);
        }, 250);             secondOscillator.stop();     }, 250);     console.log('Data sent successfully');
    }
}

/**
 * Animate the audio wave visualization based on speech input
 */
function animateAudioWave(event) {ut
    if (event && event.results && event.results.length > 0) {
        // Get the most recent result
        const result = event.results[event.results.length - 1];vent.results.length > 0) {s[event.results.length - 1];ctedToBLE ? 'BLE: Connected' : 'BLE: Disconnected';
        if (result.length > 0) {/ Get the most recent resultf (result.length > 0) {atus.className = isConnectedToBLE ? 'status connected' : 'status';
            // Use the confidence to scale the wave   const result = event.results[event.results.length - 1];       // Use the confidence to scale the wave
            const confidence = result[0].confidence || 0.5;       if (result.length > 0) {           const confidence = result[0].confidence || 0.5;
            const volume = Math.min(0.8, Math.max(0.1, confidence));            // Use the confidence to scale the wave            const volume = Math.min(0.8, Math.max(0.1, confidence));/**
            audioWave.style.transform = `scaleY(${volume})`;         const confidence = result[0].confidence || 0.5;         audioWave.style.transform = `scaleY(${volume})`;Update phase status display
            updateMicLevel(volume); Math.max(0.1, confidence));
        }         audioWave.style.transform = `scaleY(${volume})`;     }ction updatePhaseDisplay() {
    });
}

/**
 * Update microphone level visualizationmicrophone level visualization       phaseText = 'Introduction';
 */***/           break;
function updateMicLevel(volume) { * Update microphone level visualizationfunction updateMicLevel(volume) {        case 'recording':
    const micLevel = document.getElementById('mic-level');
    if (micLevel) {
        micLevel.style.width = `${volume * 100}%`;
    }if (micLevel) {}        phaseText = 'Output';
}= `${volume * 100}%`;

// Replace the inline microphone level creation with a structured versionace the inline microphone level creation with a structured version        phaseText = 'Unknown';
function setupAudioVisualization() {
    const visualizationDiv = document.querySelector('.visualization');tructured versionsualization');
    
    // Clear existing contentconst visualizationDiv = document.querySelector('.visualization');// Clear existing content
    visualizationDiv.innerHTML = '';
    
    // Create wave containerTML = '';rshowing/hiding phase elements
    const waveContainer = document.createElement('div');v');
    waveContainer.className = 'wave-container';r';) {
    const waveContainer = document.createElement('div');// Hide all phases
    // Create wave elementve-container';);
    const wave = document.createElement('div');
    wave.id = 'audio-wave';
    wave.className = 'wave';const wave = document.createElement('div');wave.className = 'wave';
    waveContainer.appendChild(wave);o-wave';ppendChild(wave);ive phase
    
    // Create mic level container
    const micLevelContainer = document.createElement('div');
    micLevelContainer.className = 'mic-level-container';// Create mic level containermicLevelContainer.className = 'mic-level-container';
     = document.createElement('div');
    // Create label';
    const micLabel = document.createElement('div');
    micLabel.className = 'mic-level-label';// Create labelmicLabel.className = 'mic-level-label';const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    micLabel.textContent = 'Mic Input:';ateElement('div');nput:';xt.createOscillator();
    
    // Create mic level barc Input:';
    const micLevelBar = document.createElement('div');const micLevelBar = document.createElement('div');oscillator.connect(gainNode);
    micLevelBar.className = 'mic-level-bar';on);
    nt('div');
    // Create the level indicator
    const micLevel = document.createElement('div');const micLevel = document.createElement('div');    oscillator.type = 'sine';
    micLevel.id = 'mic-level';icatorl';y.value = 440; // A4 note
    ');
    micLevelBar.appendChild(micLevel);
    micLevelContainer.appendChild(micLabel);      micLevelContainer.appendChild(micLabel);       oscillator.start();
    micLevelContainer.appendChild(micLevelBar);    micLevelBar.appendChild(micLevel);    micLevelContainer.appendChild(micLevelBar);        setTimeout(() => {
     micLevelContainer.appendChild(micLabel);          oscillator.stop();
    // Add to visualization
    visualizationDiv.appendChild(waveContainer);  visualizationDiv.appendChild(waveContainer); } else if (type === 'output') {
    visualizationDiv.appendChild(micLevelContainer);Container);e';
}hild(waveContainer);

/**
 * Run a BLE speed test to measure how fast data travels through the connectionLE speed test to measure how fast data travels through the connection   oscillator.start();
 */  setTimeout(() => {
async function runBleSpeedTest() {BLE speed test to measure how fast data travels through the connectionction runBleSpeedTest() {   oscillator.stop();
    if (!isConnectedToBLE) {
        alert('Please connect to a BLE device first.');e first.');
        return;
    }ease connect to a BLE device first.');value = 330; // E4 note
    
    try {
        // Check if speed test is available on this device
        if (!speedTestCharacteristic) {
            // Try to get the characteristic or create a fallback
            try {speedTestCharacteristic) {ry {0);
                speedTestCharacteristic = await brailleService.getCharacteristic(SPEED_TEST_CHARACTERISTIC_UUID);   // Try to get the characteristic or create a fallback       speedTestCharacteristic = await brailleService.getCharacteristic(SPEED_TEST_CHARACTERISTIC_UUID);
            } catch (err) {    try {    } catch (err) {// Play a second tone after a short delay for a distinctive "no match" sound
                // If not found, we'll use the main braille characteristic instead with a special prefixait brailleService.getCharacteristic(SPEED_TEST_CHARACTERISTIC_UUID);he main braille characteristic instead with a special prefix
                console.log('Speed test characteristic not found, using main characteristic as fallback');
                speedTestCharacteristic = brailleCharacteristic;tic instead with a special prefix
            }        console.log('Speed test characteristic not found, using main characteristic as fallback');    }    secondOscillator.type = 'sawtooth';
        }acteristic = brailleCharacteristic;0; // A3 note
        
        // Update UI to show test is running
        const speedTestResultsDiv = document.getElementById('ble-speed-test-results');
        speedTestResultsDiv.innerHTML = '<p>Running speed test...</p>';// Update UI to show test is runningspeedTestResultsDiv.innerHTML = '<p>Running speed test...</p>';        secondOscillator.stop();
        speed-test-results');
        // Generate test dataspeed test...</p>';
        const packetSize = parseInt(document.getElementById('ble-packet-size').value) || speedTestPacketSize;) || speedTestPacketSize;
        const packetCount = parseInt(document.getElementById('ble-packet-count').value) || speedTestPacketCount; || speedTestPacketCount;
        const interval = parseInt(document.getElementById('ble-packet-interval').value) || speedTestInterval;onst packetSize = parseInt(document.getElementById('ble-packet-size').value) || speedTestPacketSize;onst interval = parseInt(document.getElementById('ble-packet-interval').value) || speedTestInterval;
        const packetCount = parseInt(document.getElementById('ble-packet-count').value) || speedTestPacketCount;
        // Create a buffer with random data of the specified sizent(document.getElementById('ble-packet-interval').value) || speedTestInterval; random data of the specified sizelization based on speech input
        const testData = new Uint8Array(packetSize);
        for (let i = 0; i < packetSize; i++) {ith random data of the specified sizepacketSize; i++) {ent) {
            testData[i] = Math.floor(Math.random() * 256);ew Uint8Array(packetSize);Math.floor(Math.random() * 256);ults && event.results.length > 0) {
        }for (let i = 0; i < packetSize; i++) {}// Get the most recent result
        andom() * 256);
        speedTestActive = true;
        speedTestStartTime = Date.now();
        let sentPackets = 0;[0].confidence || 0.5;
        let totalSent = 0;
        
        // Function to send a single packet
        const sendPacket = async () => {
            if (!speedTestActive || sentPackets >= packetCount) {ion to send a single packet!speedTestActive || sentPackets >= packetCount) {
                // Test complete{
                const duration = (Date.now() - speedTestStartTime) / 1000; // in seconds= packetCount) {eedTestStartTime) / 1000; // in seconds
                const totalBytes = sentPackets * packetSize;
                const speedBps = totalBytes / duration;
                const speedKbps = speedBps / 1024;
                
                // Update results in UInst speedKbps = speedBps / 1024; Update results in UI = document.getElementById('mic-level');
                speedTestResultsDiv.innerHTML = `speedTestResultsDiv.innerHTML = `) {
                    <h3>Speed Test Results</h3>s</h3> * 100}%`;
                    <p>Sent ${sentPackets} packets (${totalBytes} bytes) in ${duration.toFixed(2)} seconds</p>stResultsDiv.innerHTML = `Sent ${sentPackets} packets (${totalBytes} bytes) in ${duration.toFixed(2)} seconds</p>
                    <p>Speed: ${speedBps.toFixed(2)} bytes/sec (${speedKbps.toFixed(2)} KB/sec)</p>       <h3>Speed Test Results</h3>       <p>Speed: ${speedBps.toFixed(2)} bytes/sec (${speedKbps.toFixed(2)} KB/sec)</p>
                    <p>Average packet time: ${(duration * 1000 / sentPackets).toFixed(2)} ms</p>        <p>Sent ${sentPackets} packets (${totalBytes} bytes) in ${duration.toFixed(2)} seconds</p>        <p>Average packet time: ${(duration * 1000 / sentPackets).toFixed(2)} ms</p>
                `;   <p>Speed: ${speedBps.toFixed(2)} bytes/sec (${speedKbps.toFixed(2)} KB/sec)</p>;line microphone level creation with a structured version
                
                speedTestActive = false;
                return;
            } = false;
            return;.innerHTML = '';
            try {
                // Add a special prefix to the packet if we're using the main characteristic as fallbackacket if we're using the main characteristic as fallback
                const dataToSend = speedTestCharacteristic === brailleCharacteristic brailleCharacteristic eElement('div');
                    ? new TextEncoder().encode('S:' + Array.from(testData).join(','))// Add a special prefix to the packet if we're using the main characteristic as fallback    ? new TextEncoder().encode('S:' + Array.from(testData).join(','))r.className = 'wave-container';
                    : testData; speedTestCharacteristic === brailleCharacteristic 
                stData).join(','))
                await speedTestCharacteristic.writeValue(dataToSend););
                sentPackets++;
                totalSent += packetSize;dataToSend);
                
                // Update progresstalSent += packetSize; Update progress
                const progress = (sentPackets / packetCount) * 100;const progress = (sentPackets / packetCount) * 100;c level container
                speedTestResultsDiv.innerHTML = `L = `createElement('div');
                    <p>Running speed test: ${sentPackets}/${packetCount} packets sent (${progress.toFixed(1)}%)</p>acketCount) * 100;Packets}/${packetCount} packets sent (${progress.toFixed(1)}%)</p>ainer';
                    <p>Total sent: ${totalSent} bytes</p>ltsDiv.innerHTML = `sent: ${totalSent} bytes</p>
                    <progress value="${sentPackets}" max="${packetCount}"></progress>ount} packets sent (${progress.toFixed(1)}%)</p>ount}"></progress>
                `;ytes</p>
                unt}"></progress>
                // Schedule next packet
                setTimeout(sendPacket, interval);imeout(sendPacket, interval);
            } catch (error) {
                console.error('Error sending test packet:', error);   setTimeout(sendPacket, interval);   console.error('Error sending test packet:', error);LevelBar = document.createElement('div');
                speedTestResultsDiv.innerHTML = `  } catch (error) {      speedTestResultsDiv.innerHTML = `elBar.className = 'mic-level-bar';
                    <p>Error during speed test: ${error.message}</p>        console.error('Error sending test packet:', error);            <p>Error during speed test: ${error.message}</p>
                    <p>Sent ${sentPackets}/${packetCount} packets before error</p>Div.innerHTML = `ntPackets}/${packetCount} packets before error</p>r
                `;p>Error during speed test: ${error.message}</p>ument.createElement('div');
                speedTestActive = false;            <p>Sent ${sentPackets}/${packetCount} packets before error</p>        speedTestActive = false;evel.id = 'mic-level';
            }
        };
        
        // Start sending packets   };   // Start sending packetsicLevelContainer.appendChild(micLevelBar);
        sendPacket();              sendPacket();   
                // Start sending packets            // Add to visualization
    } catch (error) {     sendPacket(); } catch (error) { visualizationDiv.appendChild(waveContainer);
        console.error('Error setting up BLE speed test:', error);:', error);d(micLevelContainer);
        alert(`Failed to run speed test: ${error.message}`); } catch (error) {     alert(`Failed to run speed test: ${error.message}`);
    }ing up BLE speed test:', error);
}n speed test: ${error.message}`);

/**
 * Create the BLE speed test UI
 */
function createBleSpeedTestUI() {irst.');
    // Create the container
    const container = document.createElement('div');');
    container.id = 'ble-speed-test-container';// Create the containercontainer.id = 'ble-speed-test-container';
    container.className = 'ble-tools-container';= document.createElement('div');ame = 'ble-tools-container';
    container.style.margin = '20px 0';
    container.style.padding = '15px';;
    container.style.backgroundColor = '#f5f5f5';f5f5f5';istic or create a fallback
    container.style.borderRadius = '8px';x'; '8px';
    container.style.backgroundColor = '#f5f5f5';            speedTestCharacteristic = await brailleService.getCharacteristic(SPEED_TEST_CHARACTERISTIC_UUID);
    // Create headere.borderRadius = '8px';erh (err) {
    const header = document.createElement('h3'); special prefix
    header.textContent = 'BLE Speed Test Tool';nd, using main characteristic as fallback');
    header.style.marginBottom = '10px';teElement('h3');'10px';eristic = brailleCharacteristic;
    container.appendChild(header);
    m = '10px';
    // Create form
    const form = document.createElement('div');const form = document.createElement('div');    // Update UI to show test is running
    form.className = 'ble-speed-test-form';d-test-form';esultsDiv = document.getElementById('ble-speed-test-results');
    form.style.display = 'grid';
    form.style.gridTemplateColumns = 'repeat(auto-fit, minmax(200px, 1fr))';px, 1fr))';
    form.style.gap = '10px';
    form.style.marginBottom = '15px';it, minmax(200px, 1fr))';packet-size').value) || speedTestPacketSize;
    
    // Packet size input'15px';cument.getElementById('ble-packet-interval').value) || speedTestInterval;
    const sizeGroup = document.createElement('div');
    const sizeLabel = document.createElement('label');he specified size
    sizeLabel.htmlFor = 'ble-packet-size';cument.createElement('div');'ble-packet-size'; new Uint8Array(packetSize);
    sizeLabel.textContent = 'Packet Size (bytes):';ment.createElement('label');= 'Packet Size (bytes):';< packetSize; i++) {
    const sizeInput = document.createElement('input');-size';teElement('input');r(Math.random() * 256);
    sizeInput.type = 'number';Size (bytes):';
    sizeInput.id = 'ble-packet-size';Element('input');
    sizeInput.value = speedTestPacketSize;
    sizeInput.min = '1';ize';
    sizeInput.max = '512';sizeInput.value = speedTestPacketSize;sizeInput.max = '512';    let sentPackets = 0;
    sizeInput.style.width = '100%';= '100%';;
    sizeInput.style.padding = '5px';
    sizeGroup.appendChild(sizeLabel);
    sizeGroup.appendChild(sizeInput);
    form.appendChild(sizeGroup);
    
    // Packet count input;e.now() - speedTestStartTime) / 1000; // in seconds
    const countGroup = document.createElement('div');
    const countLabel = document.createElement('label');on;
    countLabel.htmlFor = 'ble-packet-count';cument.createElement('div');'ble-packet-count';edKbps = speedBps / 1024;
    countLabel.textContent = 'Number of Packets:';ent.createElement('label'); 'Number of Packets:';
    const countInput = document.createElement('input');-count';teElement('input'); UI
    countInput.type = 'number';of Packets:';ML = `
    countInput.id = 'ble-packet-count';lement('input');lts</h3>
    countInput.value = speedTestPacketCount; packets (${totalBytes} bytes) in ${duration.toFixed(2)} seconds</p>
    countInput.min = '1';ount';toFixed(2)} bytes/sec (${speedKbps.toFixed(2)} KB/sec)</p>
    countInput.max = '1000';countInput.value = speedTestPacketCount;countInput.max = '1000';                <p>Average packet time: ${(duration * 1000 / sentPackets).toFixed(2)} ms</p>
    countInput.style.width = '100%';'1';width = '100%';
    countInput.style.padding = '5px';
    countGroup.appendChild(countLabel);
    countGroup.appendChild(countInput);
    form.appendChild(countGroup);
    
    // Interval input
    const intervalGroup = document.createElement('div');in characteristic as fallback
    const intervalLabel = document.createElement('label');istic === brailleCharacteristic 
    intervalLabel.htmlFor = 'ble-packet-interval';cument.createElement('div');'ble-packet-interval';xtEncoder().encode('S:' + Array.from(testData).join(','))
    intervalLabel.textContent = 'Packet Interval (ms):';ent.createElement('label'); 'Packet Interval (ms):';
    const intervalInput = document.createElement('input');-interval';teElement('input');
    intervalInput.type = 'number';Interval (ms):';writeValue(dataToSend);
    intervalInput.id = 'ble-packet-interval';ent('input');
    intervalInput.value = speedTestInterval;
    intervalInput.min = '0';nterval';
    intervalInput.max = '1000';intervalInput.value = speedTestInterval;intervalInput.max = '1000';            // Update progress
    intervalInput.style.width = '100%';%'; (sentPackets / packetCount) * 100;
    intervalInput.style.padding = '5px';intervalInput.max = '1000';intervalInput.style.padding = '5px';            speedTestResultsDiv.innerHTML = `
    intervalGroup.appendChild(intervalLabel);width = '100%';Child(intervalLabel);unning speed test: ${sentPackets}/${packetCount} packets sent (${progress.toFixed(1)}%)</p>
    intervalGroup.appendChild(intervalInput);
    form.appendChild(intervalGroup);ax="${packetCount}"></progress>
    
    container.appendChild(form);
    
    // Create run button
    const runButton = document.createElement('button');
    runButton.textContent = 'Run Speed Test';et:', error);
    runButton.className = 'ble-speed-test-button';ement('button');st-button';erHTML = `
    runButton.style.backgroundColor = '#2196F3';t';96F3';test: ${error.message}</p>
    runButton.style.color = 'white';
    runButton.style.border = 'none'; '#2196F3';
    runButton.style.borderRadius = '4px';runButton.style.color = 'white';runButton.style.borderRadius = '4px';            speedTestActive = false;
    runButton.style.padding = '8px 15px';r = 'none';ng = '8px 15px';
    runButton.style.cursor = 'pointer';
    runButton.style.marginBottom = '15px';
    runButton.addEventListener('click', runBleSpeedTest);
    container.appendChild(runButton);
    , runBleSpeedTest);
    // Create results divcontainer.appendChild(runButton);// Create results div} catch (error) {
    const resultsDiv = document.createElement('div');ing up BLE speed test:', error);
    resultsDiv.id = 'ble-speed-test-results';
    resultsDiv.className = 'ble-speed-test-results';lement('div');est-results';
    resultsDiv.innerHTML = '<p>Click "Run Speed Test" to measure BLE transfer speed</p>';   resultsDiv.id = 'ble-speed-test-results';   resultsDiv.innerHTML = '<p>Click "Run Speed Test" to measure BLE transfer speed</p>';
    container.appendChild(resultsDiv);    resultsDiv.className = 'ble-speed-test-results';    container.appendChild(resultsDiv);
     resultsDiv.innerHTML = '<p>Click "Run Speed Test" to measure BLE transfer speed</p>'; 
    // Add to the main element
    const insertPoint = document.querySelector('.app-container');  const insertPoint = document.querySelector('.app-container');
    insertPoint.appendChild(container);r);
}ment.querySelector('.app-container');

/**ner';
 * Run a test sequence sending braille patterns for alphabet and numbersest sequence sending braille patterns for alphabet and numbersontainer.className = 'ble-tools-container';
 */ntainer.style.margin = '20px 0';
async function runBrailleTest() {tterns for alphabet and numbers
    if (!isConnectedToBLE) {
        alert('Please connect to a BLE device first.'); {o a BLE device first.');s = '8px';
        return;
    }ice first.');
        return;const header = document.createElement('h3');
    // Disable the button during the teste the button during the testr.textContent = 'BLE Speed Test Tool';
    const testButton = document.getElementById('braille-test-button');
    testButton.disabled = true;
    testButton.style.opacity = '0.6';
    testButton.textContent = 'Testing...';tton.disabled = true;tton.textContent = 'Testing...';ate form
    Button.style.opacity = '0.6';rm = document.createElement('div');
    try {
        // Get all alphabet letters and numbers from the database
        const alphabetAndNumbers = brailleDB.database.filter(entry => 
            /^[a-z]$|^(one|two|three|four|five|six|seven|eight|nine|zero)$/.test(entry.word)the databaseven|eight|nine|zero)$/.test(entry.word)
        );t alphabetAndNumbers = brailleDB.database.filter(entry => .marginBottom = '15px';
        seven|eight|nine|zero)$/.test(entry.word)
        // Sort them - letters first, then numbers
        alphabetAndNumbers.sort((a, b) => {AndNumbers.sort((a, b) => {zeGroup = document.createElement('div');
            const aIsLetter = /^[a-z]$/.test(a.word);;');
            const bIsLetter = /^[a-z]$/.test(b.word); {est(b.word);;
            ;
            if (aIsLetter && !bIsLetter) return -1;sLetter = /^[a-z]$/.test(b.word);etter && !bIsLetter) return -1;= document.createElement('input');
            if (!aIsLetter && bIsLetter) return 1;
            
            // Both are letters or both are numbers
            if (aIsLetter && bIsLetter) { (aIsLetter && bIsLetter) {.min = '1';
                return a.word.localeCompare(b.word); // Both are letters or both are numbers     return a.word.localeCompare(b.word);ut.max = '512';
            } else {    if (aIsLetter && bIsLetter) {    } else {Input.style.width = '100%';
                // For numbers, we need to convert the words to actual numbers for comparison
                const numberWords = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];    } else {        const numberWords = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];Group.appendChild(sizeLabel);
                return numberWords.indexOf(a.word) - numberWords.indexOf(b.word); we need to convert the words to actual numbers for comparisonrds.indexOf(a.word) - numberWords.indexOf(b.word);nput);
            }hree', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
        });d) - numberWords.indexOf(b.word);
        }unt input
        console.log(`Starting braille test with ${alphabetAndNumbers.length} patterns`);
        
        // Process each patternrting braille test with ${alphabetAndNumbers.length} patterns`);pattern 'ble-packet-count';
        for (let i = 0; i < alphabetAndNumbers.length; i++) { i = 0; i < alphabetAndNumbers.length; i++) {el.textContent = 'Number of Packets:';
            const entry = alphabetAndNumbers[i];
            etAndNumbers.length; i++) {
            // Create a pattern that alternates between cells for each character
            const cellIndex = i % 2; // Alternate between 0 and 1= i % 2; // Alternate between 0 and 1 = speedTestPacketCount;
            let pattern;
            onst cellIndex = i % 2; // Alternate between 0 and 1.max = '1000';
            // Create a 2-cell array with the current pattern in the appropriate celllet pattern;// Create a 2-cell array with the current pattern in the appropriate cellut.style.width = '100%';
            if (cellIndex === 0) {
                pattern = [entry.array, []]; // First cell active, second cell emptyy with the current pattern in the appropriate cellray, []]; // First cell active, second cell emptyel);
            } else {{
                pattern = [[], entry.array]; // First cell empty, second cell activery.array, []]; // First cell active, second cell empty entry.array]; // First cell empty, second cell activep);
            }se {
                pattern = [[], entry.array]; // First cell empty, second cell activeval input
            // Display in the UIt.createElement('div');
            displayBrailleOutput([{
                word: entry.word,// Display in the UI    word: entry.word,Label.htmlFor = 'ble-packet-interval';
                array: patternput([{n = 'Packet Interval (ms):';
            }]);
                array: patternInput.type = 'number';
            // Send to BLE
            await sendBrailleTestPattern(pattern);
               // Send to BLE   valInput.min = '0';
            // Display status    await sendBrailleTestPattern(pattern);    // Display statusrvalInput.max = '1000';
            testButton.textContent = `Testing: ${entry.word}`;
            
            // Wait 0.5 seconds before next pattern    testButton.textContent = `Testing: ${entry.word}`;    // Wait 0.5 seconds before next patternrvalGroup.appendChild(intervalLabel);
            await new Promise(resolve => setTimeout(resolve, 500));resolve => setTimeout(resolve, 500));endChild(intervalInput);
        }
        eout(resolve, 500));
        // Clear display and reset button when donelay and reset button when doneppendChild(form);
        brailleOutput.innerHTML = '';
        utton when done
    } catch (error) {
        console.error('Error in braille test:', error);
        alert(`Test failed: ${error.message}`); catch (error) {   alert(`Test failed: ${error.message}`);unButton.className = 'ble-speed-test-button';
    } finally {       console.error('Error in braille test:', error);   } finally {   runButton.style.backgroundColor = '#2196F3';
        // Re-enable button        alert(`Test failed: ${error.message}`);        // Re-enable button    runButton.style.color = 'white';
        testButton.disabled = false; } finally {     testButton.disabled = false; runButton.style.border = 'none';
        testButton.style.opacity = '1';
        testButton.textContent = 'Test Braille Display';     testButton.disabled = false;     testButton.textContent = 'Test Braille Display'; runButton.style.padding = '8px 15px';
    }
}';

/**
 * Send a test pattern to the BLE devicetest pattern to the BLE device
 */ Create results div
async function sendBrailleTestPattern(patternArray) { test pattern to the BLE devicection sendBrailleTestPattern(patternArray) { resultsDiv = document.createElement('div');
    if (!isConnectedToBLE || !brailleCharacteristic) {
        console.log('Cannot send test pattern: not connected');
        return;!isConnectedToBLE || !brailleCharacteristic) {return;ltsDiv.innerHTML = '<p>Click "Run Speed Test" to measure BLE transfer speed</p>';
    }ted');
    
    try {
        // Format the data as a two-cell arrayll array = document.querySelector('.app-container');
        const formatData = 'O:' + JSON.stringify(patternArray);
        e data as a two-cell array
        console.log('Sending test pattern:', formatData);   const formatData = 'O:' + JSON.stringify(patternArray);   console.log('Sending test pattern:', formatData);
        const encoder = new TextEncoder();              const encoder = new TextEncoder();**
        await brailleCharacteristic.writeValue(encoder.encode(formatData));        console.log('Sending test pattern:', formatData);        await brailleCharacteristic.writeValue(encoder.encode(formatData)); * Run a test sequence sending braille patterns for alphabet and numbers
    } catch (error) {     const encoder = new TextEncoder(); } catch (error) {
        console.error('Error sending test pattern:', error);ue(encoder.encode(formatData));ttern:', error);
        throw error; } catch (error) {     throw error; if (!isConnectedToBLE) {
    }error);
}error;
}
/**
 * Initialize the app when the DOM is loaded
 */e-test-button');
document.addEventListener('DOMContentLoaded', () => {
    initApp();tApp();estButton.style.opacity = '0.6';
    ment.addEventListener('DOMContentLoaded', () => {testButton.textContent = 'Testing...';
    // Use the existing BLE connect button
    const bleButton = document.querySelector('.ble-button');
    if (bleButton) {ng BLE connect buttonhabet letters and numbers from the database
        bleButton.addEventListener('click', connectToBLE);y => 
    }f (bleButton) {       /^[a-z]$|^(one|two|three|four|five|six|seven|eight|nine|zero)$/.test(entry.word)
        bleButton.addEventListener('click', connectToBLE);    );
    // Add event listener for the braille test button
    const testButton = document.getElementById('braille-test-button');aille-test-button');ers first, then numbers
    if (testButton) { // Add event listener for the braille test button if (testButton) {     alphabetAndNumbers.sort((a, b) => {
        testButton.addEventListener('click', runBrailleTest);    const testButton = document.getElementById('braille-test-button');        testButton.addEventListener('click', runBrailleTest);            const aIsLetter = /^[a-z]$/.test(a.word);
    }
    leTest);
    // Create BLE speed test UIeturn -1;
    createBleSpeedTestUI();
});

// Handle page visibility changes to manage speech recognitionvisibility changes to manage speech recognition   if (aIsLetter && bIsLetter) {
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        // Page is hidden, stop recognition if it's running => {t's runningrt the words to actual numbers for comparison
        if (recognition && recognitionActive) {hidden) {nition && recognitionActive) {onst numberWords = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
            recognition.stop();gnition if it's runningf(a.word) - numberWords.indexOf(b.word);
        }& recognitionActive) {
    } else if (currentPhase === 'recording') {
        // Page is visible again and we're in recording phase, restart recognitions visible again and we're in recording phase, restart recognition
        if (recognition && !recognitionActive) {e if (currentPhase === 'recording') {f (recognition && !recognitionActive) {onsole.log(`Starting braille test with ${alphabetAndNumbers.length} patterns`);
            try {   // Page is visible again and we're in recording phase, restart recognition       try {   
                recognition.start();     if (recognition && !recognitionActive) {             recognition.start();     // Process each pattern
            } catch (e) {            try {            } catch (e) {        for (let i = 0; i < alphabetAndNumbers.length; i++) {






});    }        }            }                console.error('Recognition error on visibility change:', e);







});    }        }            }                console.error('Recognition error on visibility change:', e);            } catch (e) {                recognition.start();





});    }        }            }                console.error('Recognition error on visibility change:', e);            const entry = alphabetAndNumbers[i];
            
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
