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
