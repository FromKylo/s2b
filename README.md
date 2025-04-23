# Speech-to-Braille Web Application and Hardware

This project consists of a Progressive Web App (PWA) and corresponding ESP32 firmware to convert spoken words into Braille patterns displayed on a custom hardware device.

## Project Structure

```
s2b/
├── js/
│   ├── app.js                  # Main application logic, phase management, UI control
│   ├── ble-connection.js       # Handles Bluetooth Low Energy (BLE) communication
│   ├── braille-translation.js  # Loads database, translates words to Braille patterns
│   └── speech-recognition.js   # Manages Web Speech API for voice input
├── sounds/                     # Audio feedback files (recording start/stop, success/failure)
│   ├── recording-start.mp3
│   ├── recording-stop.mp3
│   ├── output-success.mp3
│   └── output-failure.mp3
├── img/                        # Icons for PWA
│   └── icons/
│       ├── icon-192x192.png
│       └── icon-512x512.png
├── index.html                  # Main HTML structure for the web application
├── styles.css                  # CSS styles for the web application
├── braille-database.csv        # Database mapping words/characters to Braille patterns
├── manifest.json               # PWA manifest file
├── service-worker.js           # Service worker for offline functionality (PWA)
├── speech_to_braille_ble.ino   # Arduino sketch for the ESP32 hardware
└── README.md                   # This documentation file
```

## File Descriptions

### Frontend (Web Application)

*   **`index.html`**: Defines the basic HTML structure, including containers for different application phases (Introduction, Recording, Output, Test), buttons, status indicators, and the debug console. It links the necessary CSS and JavaScript files.
*   **`styles.css`**: Contains all the CSS rules for styling the web application. It defines the layout, colors, fonts, animations, and appearance of different UI elements like buttons, phase containers, Braille cells, and status indicators.
*   **`js/app.js`**: The core JavaScript file that orchestrates the application.
    *   Manages application phases (Introduction, Recording, Output, Test).
    *   Initializes and coordinates other JavaScript modules (`ble-connection`, `braille-translation`, `speech-recognition`).
    *   Handles UI updates based on application state (e.g., showing/hiding phases, updating countdowns, displaying results).
    *   Binds event listeners for user interactions (button clicks, touch events).
    *   Manages timers for phase transitions.
    *   Provides logging functionality to the debug console.
    *   Handles mobile-specific UI adjustments (press-to-talk).
*   **`js/ble-connection.js`**: Manages the connection to the ESP32 hardware via Bluetooth Low Energy (BLE).
    *   Provides functions to connect, disconnect, and check connection status.
    *   Sends data (Braille patterns, commands) to the hardware device.
    *   Handles BLE events (connect, disconnect, error).
    *   Includes functionality for a BLE speed test.
*   **`js/braille-translation.js`**: Responsible for handling the Braille data.
    *   Loads the Braille mappings from `braille-database.csv`.
    *   Caches the database in `localStorage` for faster loading.
    *   Provides a function (`translateWord`) to find the Braille pattern (dot array) for a given word.
    *   Supports multiple languages (defined in the database).
    *   Includes functions to render Braille patterns visually in the HTML (`renderBrailleCells`).
    *   Contains a test function (`runAlphabetAndNumbersTest`) to cycle through and display/send patterns for letters and numbers.
*   **`js/speech-recognition.js`**: Interfaces with the browser's Web Speech API.
    *   Handles starting and stopping speech recognition.
    *   Processes interim and final speech recognition results.
    *   Detects individual words from the speech stream.
    *   Provides callbacks for events like `onWordDetected`, `onFinalResult`, `onStartListening`, `onStopListening`.
    *   Includes text-to-speech functionality (`speak`).
*   **`service-worker.js`**: Implements the service worker for the PWA, enabling offline caching of application assets.
*   **`manifest.json`**: The PWA manifest file, defining metadata like the app name, icons, start URL, and display mode, allowing the web app to be installed on devices.
*   **`sounds/`**: Contains MP3 files used for audio feedback during different application states.

### Data

*   **`braille-database.csv`**: A comma-separated value file containing the mapping between words or characters and their corresponding Braille representations. Each row typically includes the word, a short form (if any), the Unicode Braille character(s), the dot pattern array (e.g., `[[1,3],[2,4]]`), and the language (e.g., `UEB`).

### Hardware (ESP32 Firmware)

*   **`speech_to_braille_ble.ino`**: The Arduino sketch running on the ESP32 microcontroller.
    *   Sets up a BLE server with specific services and characteristics to communicate with the web app.
    *   Defines the GPIO pins connected to the Braille cell actuators.
    *   Receives data (commands and Braille patterns) from the web app via BLE.
    *   Parses the received data (expects JSON-like array strings, e.g., `O:[[1,2],[3,4]]`).
    *   Controls the GPIO pins to raise/lower the dots on the physical Braille display based on the received patterns.
    *   Includes logic for connection/disconnection handling, status LED indication, and an auto-timeout to lower dots after inactivity.
    *   Implements a BLE speed test characteristic for debugging.

## Application Workflow

The application follows a structured phase-based approach to convert speech to braille:

1. **Introduction Phase**:
   - Welcome message is displayed
   - Application introduces itself and its purpose
   - Automatic transition to Recording phase after countdown

2. **Recording Phase**:
   - Speech recognition is activated
   - On mobile devices: A "Press to Talk" button appears
   - On desktop: Continuous listening is enabled
   - Audio visualization provides feedback during speech
   - Words are detected and matched against the braille database in real-time
   - When a match is found, transitions to Output phase

3. **Output Phase**:
   - Displays the recognized word
   - Shows braille representation (visual dots)
   - Sends pattern to connected braille hardware device
   - Text-to-speech reads the matched word aloud
   - Countdown timer shows time remaining in Output phase
   - Automatic transition back to Recording phase

4. **Test Phase**:
   - Optional phase for testing braille patterns
   - Can run through alphabet, numbers, and common multi-cell patterns
   - Used for verifying hardware connectivity and functionality

## Hardware Setup

### Hardware Requirements

* Arduino-compatible ESP32 board
* 3 braille cells (each with 6 solenoids/actuators arranged in a 2x3 grid)
* Status LED
* 5V power supply (sufficient for driving solenoids)

### Pin Configuration

The firmware is configured to use the following pin layout:

```
Braille Cell 1: pins 13, 12, 11, 10, 9, 8
Braille Cell 2: pins 7, 6, 5, 4, 3, 2
Braille Cell 3: pins 24, 23, 22, 21, 20, 17
Status LED: pin 15
```

### Hardware Connection

1. Power on the braille hardware device
2. In the web app, click "Connect Braille Display"
3. Select the device from the Bluetooth pairing menu
4. Status indicator will show "Connected" when ready

## Braille Translation System

### Braille Database Format

The `braille-database.csv` file follows this format:

```
word,shortf,braille,array,lang
a,a,⠁,"[[1]]",UEB
b,b,⠃,"[[1,2]]",UEB
```

Where:
* `word`: The word or character to be translated
* `shortf`: Short form or abbreviation
* `braille`: Unicode braille character representation
* `array`: JSON array representing dot positions [1-6] for each cell
* `lang`: Language code (UEB = Unified English Braille)

### Database Caching

The application implements a caching system for the braille database:

* Database is loaded from CSV on first run
* Cached in `localStorage` for faster subsequent loads
* Cache expires after 24 hours or when version changes
* Can be manually cleared using the "Clear Database Cache" button

### Word Translation Logic

The `translateWord()` function follows these steps to find braille patterns:

1. Look for exact match in the database
2. If not found, search for multi-cell contractions/symbols
3. If still not found, attempt letter-by-letter translation
4. Return the dot patterns as arrays (single or multi-dimensional)

## BLE Communication Protocol

The web app communicates with the hardware using a simple protocol:

* **Service UUID**: `19b10000-e8f2-537e-4f6c-d104768a1214`
* **Characteristic UUID**: `19b10001-e8f2-537e-4f6c-d104768a1214`
* **Speed Test Characteristic UUID**: `19b10002-e8f2-537e-4f6c-d104768a1214`

### Message Format

Data is sent in the format: `O:[[1,2,3],[4,5,6]]` where:

* `O:` indicates Output phase (active braille)
* `N:` indicates Not Output phase (lower dots)
* The JSON array represents dot patterns for each braille cell
* Each inner array contains numbers 1-6 representing raised dots

## Debugging Features

### Debug Console

The debug console provides powerful tools for testing, debugging, and exploring the application's functionality.

#### Accessing the Debug Console

There are two ways to open the debug console:

1. Press the **F12** key on your keyboard
2. Click the **Debug Console** button in the application interface

#### Debug Console Commands

| Command | Example | Description |
|---------|---------|-------------|
| `O:[array]` | `O:[[1,2,3]]` | Send output pattern directly to the braille device |
| `N:[]` | `N:[]` | Clear display (lower all dots) |
| `pins:cell,pin,value` | `pins:0,2,1` | Control individual pin (cell 0-2, pin 0-5, value 0-1) |
| `test:character` | `test:a` | Test a specific character or word |
| `test:alphabet` | `test:alphabet` | Run through the entire alphabet |
| `test:numbers` | `test:numbers` | Test all number representations |
| `search:word` | `search:hello` | Search the database for a word |
| `language:code` | `language:UEB` | Set translation language |
| `language:` | `language:` | View available languages |
| `clear` | `clear` | Clear the console output |
| `help` | `help` | Display help information |

#### Testing Braille Patterns

The debug console allows you to test and visualize braille patterns:

**Testing Individual Characters:**

`test:a`

This will:
- Show the braille pattern for 'a' in the console
- Send the pattern to the braille display if connected

**Testing Multiple Characters:**

`test:he`

This will attempt to find and display the pattern for the entire word.

**Running the Alphabet Test:**

`test:alphabet`

This will:
- Cycle through all letters a-z
- Display each pattern in the console
- Send each pattern to the braille display (if connected)
- Show a progress indicator

**Testing Numbers:**

`test:numbers`

This runs through braille patterns for numbers 0-9.
- Display each number's braille pattern in the console
- Send the patterns to the braille display if connected
- Show progress as each number is tested

#### Searching the Braille Database

To search for specific words or characters in the database:

`search:the`

Search results include:
- The word found
- The language (e.g., UEB)
- The braille Unicode character
- The dot array representation
- Visual braille pattern
- A button to send the pattern to the connected device

#### Changing Language

To view available languages:

`language:`

This will display all supported languages in the database (e.g., UEB, Philippine).

To change the current translation language:

`language:UEB`

This sets the active language to Unified English Braille.

#### Direct Hardware Control

For direct control of the braille hardware:

**Send Patterns:**

`O:[[1,2,3],[4,5,6]]`

This raises dots 1, 2, and 3 on the first cell, and dots 4, 5, and 6 on the second cell.

**Clear Display:**

`N:[]`

**Control Individual Pins:**

`pins:0,2,1`

This sets cell 0, pin 2 to HIGH (raised).

#### BLE Speed Test

To test the communication speed with the braille device:
1. Click "Run BLE Speed Test" button in the debug console
2. The test sends multiple packets and measures throughput
3. Results show packets sent, bytes transferred, and speed (bytes/second)

### Common Debug Commands

* `O:[[1,2,3]]` - Raise specific dots in Output mode
* `N:[]` - Lower all dots (clear display)
* `pins:0,2,1` - Directly control a specific pin (cell, pin, value)
* `test:a` - Test the letter 'a'
* `search:and` - Find the braille pattern for 'and'

### BLE Speed Test

Tests the communication speed between the web app and the hardware:

1. Click "Run BLE Speed Test"
2. The app sends a series of packets to the device
3. The device measures receipt time and packet count
4. Results show bytes/second throughput

### Debug Output Phase

The system includes a debug function to test the output phase without requiring speech input. This is useful for testing specific words or troubleshooting the braille display.

#### Using the Debug Function

You can access this functionality through the browser console:

```javascript
// Test a specific word and show its braille pattern
brailleTranslation.debugSimulateOutput("hello");

// Test without activating output phase
brailleTranslation.debugSimulateOutput("world", false);

// Test and display in a specific container
brailleTranslation.debugSimulateOutput("test", true, document.getElementById('braille-output'));
```

#### Parameters

- `word` (string): The word to translate into braille
- `activateOutputPhase` (boolean, default: true): Whether to trigger the output phase UI
- `container` (Element, optional): DOM element to render the braille pattern

#### Adding a Debug Button

You can add a debug button to your interface with this code:

```javascript
function addOutputPhaseDebugButton() {
  const btn = document.createElement('button');
  btn.textContent = 'Debug Output Phase';
  btn.style.position = 'fixed';
  btn.style.bottom = '10px';
  btn.style.right = '10px';
  btn.style.zIndex = '1000';
  btn.style.backgroundColor = '#4CAF50';
  btn.style.color = 'white';
  btn.style.border = 'none';
  btn.style.borderRadius = '4px';
  btn.style.padding = '8px 12px';
  
  btn.addEventListener('click', () => {
    const word = prompt('Enter a word to test in output phase:');
    if (word) {
      brailleTranslation.debugSimulateOutput(word, true);
    }
  });
  
  document.body.appendChild(btn);
}

// Call this function to add the debug button
addOutputPhaseDebugButton();
```

#### Troubleshooting False Negatives

If you're experiencing words not being found in the output phase:

1. Use the debug function to test specific words directly
2. Check if the word exists in the database with `brailleTranslation.debugDumpDatabase()`
3. Try alternate spellings or forms of the word
4. Verify the correct language is set with `brailleTranslation.setPrimaryLanguage('UEB')` or `brailleTranslation.setPrimaryLanguage('Philippine')`

The system includes built-in fallback mechanisms:
- If a word isn't found, it will try common alternate forms (plurals, tense variations)
- If still not found, it will try to build the pattern character-by-character
- As a last resort, it will show a pattern using the first letter of the word

## Mobile-Specific Features

The application detects mobile devices and adapts the UI accordingly:

* Press-to-talk button for easier speech control
* Audio level visualization
* Network status indicator
* Touch-optimized button sizes and positioning

## Installation

### Web Application

1. Host the application on a secure server (HTTPS required for Web Speech API)
2. Access via Chrome or Edge browser on desktop or Android
3. For offline functionality, install as a PWA when prompted

### ESP32 Firmware

1. Open `speech_to_braille_ble.ino` in the Arduino IDE
2. Install required ESP32 board support and BLE libraries
3. Configure pin assignments if your hardware differs
4. Upload to ESP32 board

## Browser Compatibility

* **Recommended**: Google Chrome (desktop), Chrome for Android
* **Compatible**: Microsoft Edge, Samsung Internet
* **Limited support**: Firefox (no BLE support)
* **Not supported**: Safari (iOS), due to Web Bluetooth API limitations

## Troubleshooting

* **No speech recognition**: Check microphone permissions
* **BLE connection issues**: Ensure the device is powered on and in range
* **Braille patterns not displaying**: Try clearing database cache
* **Hardware not responding**: Check pin configuration in the Arduino sketch

## Acknowledgements

Created by kiloJoules³

## License

[Insert license information here]
