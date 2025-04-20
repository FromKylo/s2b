/**
 * Speech-to-Braille Bluetooth Low Energy (BLE) Handler
 * Manages BLE connections, data transfer, and testing functions
 */

// BLE Variables
let bleDevice = null;
let bleServer = null;
let brailleService = null;
let brailleCharacteristic = null;
let speedTestCharacteristic = null; // Speed test characteristic
const BRAILLE_SERVICE_UUID = "19b10000-e8f2-537e-4f6c-d104768a1214";
const BRAILLE_CHARACTERISTIC_UUID = "19b10001-e8f2-537e-4f6c-d104768a1214";
const SPEED_TEST_CHARACTERISTIC_UUID = "19b10002-e8f2-537e-4f6c-d104768a1214"; // UUID for speed testing

// Speed test variables
let speedTestActive = false;
let speedTestStartTime = 0;
let speedTestPacketSize = 20; // Default packet size in bytes
let speedTestPacketCount = 100; // Default number of packets to send
let speedTestInterval = 10; // Default interval between packets in ms

// Connection state
let isConnectedToBLE = false;

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
        
        // Handle both found and not-found matches
        if (!brailleMatch.array && brailleMatch.found === false) {
            // This is a word that wasn't found in the database
            console.log(`No braille pattern for word: ${brailleMatch.word}`);
            return;
        }
        
        // If it's a nested array (multiple cells)
        if (Array.isArray(brailleMatch.array) && Array.isArray(brailleMatch.array[0])) {
            // Send as JSON string with phase prefix
            formatData = 'O:' + JSON.stringify(brailleMatch.array);
        } else if (Array.isArray(brailleMatch.array)) {
            // For single cell patterns, we need to convert to a two-cell format
            // where the pattern is in the first cell and the second cell is empty
            const twoCellArray = [brailleMatch.array, []];
            formatData = 'O:' + JSON.stringify(twoCellArray);
        } else {
            console.error('Invalid braille pattern:', brailleMatch);
            return;
        }
        
        // Log data being sent for debugging
        console.log(`Sending to BLE device: word="${brailleMatch.word}", data=${formatData}`);
        
        // Send to device
        const encoder = new TextEncoder();
        await brailleCharacteristic.writeValue(encoder.encode(formatData));
        
        // Add transmission confirmation
        console.log('Data sent successfully to Arduino');
        
        // Add a simple visual feedback that data was sent
        const bleStatus = document.getElementById('ble-status');
        if (bleStatus) {
            const originalText = bleStatus.textContent;
            bleStatus.textContent = 'Sending data...';
            setTimeout(() => {
                bleStatus.textContent = originalText;
            }, 500);
        }
    } catch (error) {
        console.error('Error sending data to BLE device:', error);
        // Visual feedback for error
        const bleStatus = document.getElementById('ble-status');
        if (bleStatus) {
            bleStatus.textContent = 'BLE Error!';
            setTimeout(() => {
                updateBleStatus();
            }, 2000);
        }
    }
}

/**
 * Update BLE status display
 */
function updateBleStatus() {
    const bleStatus = document.getElementById('ble-status');
    if (bleStatus) {
        bleStatus.textContent = isConnectedToBLE ? 'BLE: Connected' : 'BLE: Disconnected';
        bleStatus.className = isConnectedToBLE ? 'status connected' : 'status';
    }
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
        document.getElementById('braille-output').innerHTML = '';
        
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

// Export functions and variables needed by script.js
window.bleHandler = {
    connectToBLE,
    isConnectedToBLE,
    sendBrailleToBLE,
    createBleSpeedTestUI,
    runBrailleTest
};