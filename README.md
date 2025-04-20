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

Press F12 or click "Debug Console" to access debugging tools:

* View application logs
* Send custom commands to the hardware
* Run a BLE speed test
* Monitor connection status

### Common Debug Commands

* `O:[[1,2,3]]` - Raise specific dots in Output mode
* `N:[]` - Lower all dots (clear display)
* `pins:0,2,1` - Directly control a specific pin (cell, pin, value)

### BLE Speed Test

Tests the communication speed between the web app and the hardware:

1. Click "Run BLE Speed Test"
2. The app sends a series of packets to the device
3. The device measures receipt time and packet count
4. Results show bytes/second throughput

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
