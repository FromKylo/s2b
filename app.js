// Main application code for Speech to Braille PWA

// DOM elements
const toggleRecognitionButton = document.getElementById('toggle-recognition');
const recognizedTextElement = document.getElementById('recognized-text');
const listeningStatusElement = document.getElementById('listening-status');
const listeningPhaseElement = document.getElementById('listening-phase');
const outputPhaseElement = document.getElementById('output-phase');
const brailleOutputElement = document.getElementById('braille-output');
const wordDetailsElement = document.getElementById('word-details');
const backButton = document.getElementById('back-button');
const searchInput = document.getElementById('search-input');
const searchButton = document.getElementById('search-button');
const installPrompt = document.getElementById('install-prompt');
const installButton = document.getElementById('install-button');
const dismissInstallButton = document.getElementById('dismiss-install');
const loadingIndicator = document.getElementById('loading-indicator');

// App state
let isRecording = false;
let recognitionInstance = null;
let deferredPrompt = null;
let currentPhase = 'listening'; // 'listening' or 'output'
let finalTranscript = '';

// Initialize speech recognition
function initSpeechRecognition() {
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    alert('Your browser does not support speech recognition. Please use Chrome or Edge.');
    toggleRecognitionButton.disabled = true;
    return;
  }

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognitionInstance = new SpeechRecognition();
  
  // Configure speech recognition
  recognitionInstance.continuous = true;
  recognitionInstance.interimResults = true;
  recognitionInstance.lang = 'en-US'; // Default to English, but it will detect Filipino words too
  
  // Speech recognition event handlers
  recognitionInstance.onstart = () => {
    isRecording = true;
    listeningStatusElement.textContent = 'Listening...';
    toggleRecognitionButton.textContent = 'Stop & Process';
    toggleRecognitionButton.classList.add('recording-active');
    toggleRecognitionButton.classList.add('pulsating');
  };
  
  recognitionInstance.onend = () => {
    isRecording = false;
    toggleRecognitionButton.textContent = 'Start Listening';
    toggleRecognitionButton.classList.remove('recording-active');
    toggleRecognitionButton.classList.remove('pulsating');
    
    // Only switch to output phase if we have a final transcript and user clicked to stop
    if (finalTranscript && currentPhase === 'listening') {
      switchToOutputPhase();
    } else {
      listeningStatusElement.textContent = 'Press button to start listening';
    }
  };
  
  recognitionInstance.onresult = (event) => {
    let interimTranscript = '';
    
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      
      if (event.results[i].isFinal) {
        finalTranscript += transcript + ' ';
      } else {
        interimTranscript += transcript;
      }
    }
    
    // Display recognized text
    recognizedTextElement.innerHTML = `
      <div class="final">${finalTranscript}</div>
      <div class="interim" style="color: grey;">${interimTranscript}</div>
    `;
  };
  
  recognitionInstance.onerror = (event) => {
    console.error('Speech recognition error:', event.error);
    listeningStatusElement.textContent = `Error: ${event.error}`;
    toggleRecognitionButton.textContent = 'Start Listening';
    toggleRecognitionButton.classList.remove('recording-active');
    toggleRecognitionButton.classList.remove('pulsating');
    isRecording = false;
  };
}

// Toggle speech recognition
function toggleSpeechRecognition() {
  if (isRecording) {
    recognitionInstance.stop();
    listeningStatusElement.textContent = 'Processing...';
  } else {
    finalTranscript = '';
    recognizedTextElement.innerHTML = '';
    recognitionInstance.start();
  }
}

// Switch to output phase
function switchToOutputPhase() {
  currentPhase = 'output';
  listeningPhaseElement.classList.remove('active');
  outputPhaseElement.classList.add('active');
  
  // Process the final transcript and display braille
  processTextToBraille(finalTranscript.trim());
}

// Switch to listening phase
function switchToListeningPhase() {
  currentPhase = 'listening';
  outputPhaseElement.classList.remove('active');
  listeningPhaseElement.classList.add('active');
  
  // Clear previous output
  brailleOutputElement.innerHTML = '';
  wordDetailsElement.innerHTML = '';
}

// Process text to braille
function processTextToBraille(text) {
  if (!text) return;
  
  // Show loading indicator
  loadingIndicator.classList.remove('hidden');
  
  const words = text.split(/\s+/);
  let lastWord = '';
  
  if (words.length > 0) {
    // Get the last word that has a match in the database
    for (let i = words.length - 1; i >= 0; i--) {
      const word = words[i].toLowerCase().replace(/[.,!?;:]/g, '');
      if (!word) continue;
      
      // Use findBrailleWord from embedded database
      const result = findBrailleWord(word);
      if (result) {
        lastWord = word;
        displayBrailleResult(result);
        break;
      }
    }
    
    // If no match found for any word
    if (!lastWord) {
      wordDetailsElement.innerHTML = `<p>No braille matches found for any word in your speech.</p>`;
    }
  }
  
  // Hide loading indicator
  loadingIndicator.classList.add('hidden');
}

// Create a visual braille cell representation
function createBrailleCell(dotsArray) {
  const cellElem = document.createElement('div');
  cellElem.className = 'braille-cell';
  
  // Create 6 dots (2x3 grid)
  for (let i = 1; i <= 6; i++) {
    const dot = document.createElement('div');
    dot.className = 'braille-dot';
    dot.setAttribute('data-dot', i);
    
    if (dotsArray.includes(i)) {
      dot.classList.add('active');
    }
    
    cellElem.appendChild(dot);
    
    // Adjust layout for 1-4, 2-5, 3-6 (add a spacer after dot 3)
    if (i === 3) {
      const spacer = document.createElement('div');
      spacer.style.flexBasis = '100%';
      cellElem.appendChild(spacer);
    }
  }
  
  return cellElem;
}

// Display braille result
function displayBrailleResult(result) {
  brailleOutputElement.innerHTML = '';
  wordDetailsElement.innerHTML = '';
  
  // Create word display
  const wordDisplay = document.createElement('div');
  wordDisplay.className = 'word-display';
  wordDisplay.textContent = result.word;
  
  // Create language badge
  const langBadge = document.createElement('div');
  langBadge.className = 'language-badge';
  langBadge.textContent = result.lang;
  
  // Create unicode display
  const unicodeDisplay = document.createElement('div');
  unicodeDisplay.className = 'unicode-display';
  unicodeDisplay.textContent = result.braille;
  
  // Add braille cells
  let brailleCells;
  if (Array.isArray(result.array) && Array.isArray(result.array[0])) {
    // Multiple cells
    brailleCells = result.array.map(cellArray => createBrailleCell(cellArray));
  } else {
    // Single cell
    brailleCells = [createBrailleCell(result.array)];
  }
  
  brailleOutputElement.appendChild(wordDisplay);
  wordDisplay.appendChild(langBadge);
  brailleOutputElement.appendChild(unicodeDisplay);
  
  // Add cells to output
  const cellsContainer = document.createElement('div');
  cellsContainer.className = 'braille-cells-container';
  brailleCells.forEach(cell => cellsContainer.appendChild(cell));
  brailleOutputElement.appendChild(cellsContainer);
  
  // Add details to word details
  const detailsHTML = `
    <div class="braille-info">
      <p><strong>Word:</strong> ${result.word}</p>
      <p><strong>Short Form:</strong> ${result.shortf}</p>
      <p><strong>Language:</strong> ${result.lang}</p>
      <p><strong>Pattern:</strong> ${JSON.stringify(result.array)}</p>
    </div>
  `;
  
  wordDetailsElement.innerHTML = detailsHTML;
}

// Handle search
function handleSearch() {
  const searchTerm = searchInput.value.trim();
  if (!searchTerm) return;
  
  // Show loading indicator
  loadingIndicator.classList.remove('hidden');
  
  // Use the embedded database function
  const result = findBrailleWord(searchTerm);
  
  if (result) {
    switchToOutputPhase();
    displayBrailleResult(result);
  } else {
    alert(`No match found for "${searchTerm}"`);
  }
  
  // Hide loading indicator
  loadingIndicator.classList.add('hidden');
}

// PWA installation
window.addEventListener('beforeinstallprompt', (e) => {
  // Prevent Chrome 67 and earlier from automatically showing the prompt
  e.preventDefault();
  // Stash the event so it can be triggered later
  deferredPrompt = e;
  // Show the install button
  installPrompt.classList.remove('hidden');
});

installButton.addEventListener('click', () => {
  if (!deferredPrompt) return;
  
  // Show the install prompt
  deferredPrompt.prompt();
  
  // Wait for the user to respond to the prompt
  deferredPrompt.userChoice.then((choiceResult) => {
    if (choiceResult.outcome === 'accepted') {
      console.log('User accepted the install prompt');
    } else {
      console.log('User dismissed the install prompt');
    }
    deferredPrompt = null;
    installPrompt.classList.add('hidden');
  });
});

dismissInstallButton.addEventListener('click', () => {
  installPrompt.classList.add('hidden');
});

// Register service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js')
      .then(registration => {
        console.log('Service Worker registered with scope:', registration.scope);
      })
      .catch(error => {
        console.error('Service Worker registration failed:', error);
      });
  });
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
  // Initialize features
  initSpeechRecognition();
  
  // Add event listeners
  toggleRecognitionButton.addEventListener('click', toggleSpeechRecognition);
  backButton.addEventListener('click', switchToListeningPhase);
  searchButton.addEventListener('click', handleSearch);
  searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSearch();
  });
  
  // Display database status
  const mainElement = document.querySelector('main');
  const statusDiv = document.createElement('div');
  statusDiv.className = 'database-status success';
  statusDiv.textContent = 'Braille database loaded successfully!';
  mainElement.insertBefore(statusDiv, mainElement.firstChild);
  
  // Hide status after a few seconds
  setTimeout(() => {
    statusDiv.remove();
  }, 3000);
});
