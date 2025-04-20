/*
 * Speech-to-Braille ESP32 BLE Integration
 * 
 * This sketch receives braille array data from the Speech-to-Braille web app
 * via Bluetooth Low Energy (BLE) and controls braille pins accordingly.
 */

#include <BLEDevice.h>
#include <BLEUtils.h>
#include <BLEServer.h>
#include <BLE2902.h>

// BLE service and characteristic UUIDs (must match web app)
#define BRAILLE_SERVICE_UUID        "19b10000-e8f2-537e-4f6c-d104768a1214"
#define BRAILLE_CHARACTERISTIC_UUID "19b10001-e8f2-537e-4f6c-d104768a1214"
// BLE troubleshooting speed test - added measurement UUID
#define SPEED_TEST_CHARACTERISTIC_UUID "19b10002-e8f2-537e-4f6c-d104768a1214"

// BLE speed test variables
unsigned long testStartTime = 0;
unsigned long lastPacketTime = 0;
unsigned long packetCount = 0;
unsigned long totalBytesReceived = 0;
bool speedTestActive = false;
const unsigned long SPEED_TEST_TIMEOUT = 5000; // 5 seconds timeout

const int braillePins[3][6] = {
  {13, 12, 11, 10, 9, 8}, // Braille Cell 1
  {7, 6, 5, 4, 3, 2},    // Braille Cell 2
  {24, 23, 22, 21, 20, 17}  // Braille Cell 3
};
const int NUM_CELLS = 3;
const int NUM_PINS = 6;

// Heartbeat
const int STATUS_LED_PIN = 15; // Green LED status indicator
const int HEARTBEAT_INTERVAL = 1200;
unsigned long lastHeartbeatTime = 0;
bool ledState = false;

// Phase constants
const uint8_t PHASE_NOT_OUTPUT = 0;
const uint8_t PHASE_OUTPUT = 1;
uint8_t currentPhase = PHASE_NOT_OUTPUT;

// Auto-reset timeout for braille output
const unsigned long OUTPUT_TIMEOUT = 7000; 
unsigned long lastOutputTime = 0;
bool outputActive = false;

// BLE objects
BLEServer* pServer = NULL;
BLECharacteristic* pCharacteristic = NULL;
BLECharacteristic* pSpeedTestCharacteristic = NULL; // Speed test characteristic
bool deviceConnected = false;
bool oldDeviceConnected = false;
uint8_t currentBrailleState = 0;

// Function to lower all braille dots
void lowerAllDots() {
  for (int cell = 0; cell < NUM_CELLS; cell++) {
    for (int i = 0; i < NUM_PINS; i++) {
      digitalWrite(braillePins[cell][i], LOW);
    }
  }
  currentBrailleState = 0;
  Serial.println("Lowered all dots");
}

/**
 * Process array string from JSON format
 * Can handle both single arrays [1,3,4] and nested arrays [[1,2],[3,4]]
 */
void processArrayString(std::string arrayString) {
  // Add detailed logging to help diagnose issues
  Serial.print("Received array string: ");
  Serial.println(arrayString.c_str());
  
  // Add a visual indication on the physical device
  digitalWrite(STATUS_LED_PIN, LOW);
  delay(50);
  digitalWrite(STATUS_LED_PIN, HIGH);
  
  // Check for speed test packets from main characteristic (fallback mode)
  if (arrayString.length() > 2 && arrayString.substr(0, 2) == "S:") {
    // This is a speed test packet using the main characteristic as fallback
    // Just log it and update speed test variables
    String dataStr = arrayString.substr(2).c_str();
    Serial.print("Received speed test data (fallback mode): ");
    Serial.println(dataStr);
    
    // Update speed test variables
    if (!speedTestActive) {
      speedTestActive = true;
      testStartTime = millis();
      packetCount = 0;
      totalBytesReceived = 0;
    }
    
    packetCount++;
    totalBytesReceived += arrayString.length();
    lastPacketTime = millis();
    
    // Don't process as braille data
    return;
  }
  
  // Process normal braille data
  // Check for empty array
  if (arrayString == "[]" || arrayString.length() <= 2) {
    lowerAllDots();
    Serial.println("Received empty or invalid array - lowering all dots");
    return;
  }
  
  // Add better error handling for malformed JSON
  // Trim any whitespace from the string
  arrayString.erase(0, arrayString.find_first_not_of(" \t\r\n"));
  arrayString.erase(arrayString.find_last_not_of(" \t\r\n") + 1);
  
  // Fix common JSON formatting issues coming from JavaScript
  if (arrayString[0] != '[') {
    Serial.println("Missing opening bracket, adding it");
    arrayString = "[" + arrayString;
  }
  
  if (arrayString[arrayString.length() - 1] != ']') {
    Serial.println("Missing closing bracket, adding it");
    arrayString += "]";
  }
  
  // Check if it's a nested array (first non-bracket character after opening bracket is another bracket)
  int firstCharPos = arrayString.find_first_not_of(" \t\n", 1);
  bool isNestedArray = (firstCharPos != std::string::npos && arrayString[firstCharPos] == '[');
  
  if (isNestedArray) {
    // Handle nested array format: [[1,2],[3,4]]
    Serial.println("Processing nested array format");
    processNestedArrays(arrayString);
  } else {
    // Handle single array format: [1,2,3]
    Serial.println("Processing single array format");
    processSingleCell(arrayString, 0);
  }
  
  // Update tracking variables
  outputActive = true;
  lastOutputTime = millis();
  Serial.println("Braille pattern activated successfully");
}

/**
 * Process nested array format: [[1,2],[3,4]]
 * Each inner array represents a braille cell
 */
void processNestedArrays(std::string arrayString) {
  // Start with all dots lowered
  int allDots[NUM_CELLS][NUM_PINS] = {0};
  
  // Find pairs of square brackets
  size_t pos = 0;
  int cellIndex = 0;
  
  while ((pos = arrayString.find('[', pos + 1)) != std::string::npos && cellIndex < NUM_CELLS) {
    // Find closing bracket for this cell
    size_t endPos = findClosingBracket(arrayString, pos);
    if (endPos == std::string::npos) break;
    
    // Extract the cell array string
    std::string cellArrayStr = arrayString.substr(pos, endPos - pos + 1);
    Serial.print("Cell ");
    Serial.print(cellIndex);
    Serial.print(" array: ");
    Serial.println(cellArrayStr.c_str());
    
    // Process this cell
    processSingleCell(cellArrayStr, cellIndex);
    
    // Move to next cell
    cellIndex++;
    pos = endPos;
  }
}

/**
 * Find the position of the closing bracket that matches the opening bracket at startPos
 */
size_t findClosingBracket(std::string& str, size_t startPos) {
  if (startPos >= str.length() || str[startPos] != '[') return std::string::npos;
  
  int depth = 1;
  for (size_t i = startPos + 1; i < str.length(); i++) {
    if (str[i] == '[') depth++;
    else if (str[i] == ']') {
      depth--;
      if (depth == 0) return i;
    }
  }
  return std::string::npos; // No matching closing bracket
}

/**
 * Process a single cell array: [1,2,3] or 1,2,3
 * Activates the corresponding braille pins for the specified cell
 */
void processSingleCell(std::string cellStr, int cellIndex) {
  if (cellIndex < 0 || cellIndex >= NUM_CELLS) {
    Serial.println("Invalid cell index");
    return;
  }
  
  // Initialize dots array for this cell
  int dots[NUM_PINS] = {0};
  
  // Remove brackets if present
  if (cellStr.length() > 0 && cellStr[0] == '[') {
    cellStr = cellStr.substr(1, cellStr.length() - 2);
  }
  
  // Parse comma-separated values
  size_t pos = 0;
  std::string token;
  while ((pos = cellStr.find(',')) != std::string::npos) {
    token = cellStr.substr(0, pos);
    activateDotFromString(token, dots);
    cellStr.erase(0, pos + 1);
  }
  
  // Process the last token
  activateDotFromString(cellStr, dots);
  
  // Activate the pins for this cell
  Serial.print("Setting cell ");
  Serial.print(cellIndex);
  Serial.print(" dots: [");
  for (int i = 0; i < NUM_PINS; i++) {
    digitalWrite(braillePins[cellIndex][i], dots[i] ? HIGH : LOW);
    Serial.print(dots[i]);
    if (i < NUM_PINS - 1) Serial.print(",");
  }
  Serial.println("]");
}

/**
 * Activate a dot based on its string representation
 */
void activateDotFromString(std::string& dotStr, int dots[]) {
  // Trim whitespace
  dotStr.erase(0, dotStr.find_first_not_of(" \t\n"));
  dotStr.erase(dotStr.find_last_not_of(" \t\n") + 1);
  
  if (dotStr.empty()) return;
  
  // Convert to integer
  int dotNum = atoi(dotStr.c_str());
  if (dotNum >= 1 && dotNum <= NUM_PINS) {
    dots[dotNum - 1] = 1; // Activate this dot (1-based to 0-based)
  }
}

// Custom callback for BLE connections
class ServerCallbacks: public BLEServerCallbacks {
  void onConnect(BLEServer* pServer) {
    deviceConnected = true;
    Serial.println("Device connected");
    digitalWrite(STATUS_LED_PIN, HIGH); // Turn on LED when connected
  }

  void onDisconnect(BLEServer* pServer) {
    deviceConnected = false;
    Serial.println("Device disconnected");
    digitalWrite(STATUS_LED_PIN, LOW); // Turn off LED when disconnected
    
    // Reset all pins to off state
    lowerAllDots();
    currentPhase = PHASE_NOT_OUTPUT;
  }
};

// Custom callback for BLE characteristic operations
class CharacteristicCallbacks: public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic* pCharacteristic) {
    std::string value = pCharacteristic->getValue();
    
    if (value.length() > 0) {
      Serial.print("Received data (");
      Serial.print(value.length());
      Serial.print(" bytes): '");
      
      // Print the raw data with hex values for non-printable characters
      for (size_t i = 0; i < value.length(); i++) {
        if (value[i] >= 32 && value[i] <= 126) {
          Serial.print(value[i]);
        } else {
          Serial.print("[0x");
          if (value[i] < 16) Serial.print("0");
          Serial.print((uint8_t)value[i], HEX);
          Serial.print("]");
        }
      }
      Serial.println("'");
      
      // Special handling for test message
      if (value.find("BLE:HELLO") != std::string::npos) {
        Serial.println("Received test message - BLE connection working!");
        
        // Visual confirmation on device
        for (int i = 0; i < 3; i++) {
          digitalWrite(STATUS_LED_PIN, HIGH);
          delay(100);
          digitalWrite(STATUS_LED_PIN, LOW);
          delay(100);
        }
        digitalWrite(STATUS_LED_PIN, HIGH);
        return;
      }
      
      // Check if we have a direct pin control command (P:cell,pin,value)
      if (value.length() >= 2 && value[0] == 'P' && value[1] == ':') {
        // Extract the pin control part (skip the "P:" prefix)
        std::string controlString = value.substr(2);
        
        // Parse the parameters: cell, pin, value
        int cell = -1, pin = -1, pinValue = -1;
        size_t firstComma = controlString.find(',');
        
        if (firstComma != std::string::npos) {
          std::string cellStr = controlString.substr(0, firstComma);
          cell = atoi(cellStr.c_str());
          
          size_t secondComma = controlString.find(',', firstComma + 1);
          if (secondComma != std::string::npos) {
            std::string pinStr = controlString.substr(firstComma + 1, secondComma - firstComma - 1);
            pin = atoi(pinStr.c_str());
            
            std::string valueStr = controlString.substr(secondComma + 1);
            pinValue = atoi(valueStr.c_str());
          }
        }
        
        // Validate parameters
        if (cell >= 0 && cell < NUM_CELLS && pin >= 0 && pin < NUM_PINS && 
            (pinValue == 0 || pinValue == 1)) {
          // Valid parameters, control the pin
          digitalWrite(braillePins[cell][pin], pinValue ? HIGH : LOW);
          
          // Update tracking variables for auto-reset
          outputActive = true;
          lastOutputTime = millis();
          
          Serial.print("[DEBUG PIN] Setting cell ");
          Serial.print(cell);
          Serial.print(" pin ");
          Serial.print(pin);
          Serial.print(" to ");
          Serial.println(pinValue ? "HIGH" : "LOW");
          
          // Flash LED to indicate command received
          digitalWrite(STATUS_LED_PIN, LOW);
          delay(20);
          digitalWrite(STATUS_LED_PIN, HIGH);
        } else {
          Serial.println("Invalid pin control parameters: cell must be 0-2, pin must be 0-5, value must be 0 or 1");
        }
      }
      // Check if we have phase information (starts with O: or N:)
      else if (value.length() >= 2 && value[1] == ':') {
        // Extract phase
        char phaseChar = value[0];
        currentPhase = (phaseChar == 'O') ? PHASE_OUTPUT : PHASE_NOT_OUTPUT;
        
        // Extract the array part (skip the phase prefix "X:")
        std::string arrayString = value.substr(2);
        
        // Log the phase and array portion
        Serial.print("Phase: ");
        Serial.println(phaseChar);
        Serial.print("Array portion: ");
        Serial.println(arrayString.c_str());
        
        // Process the array string
        if (currentPhase == PHASE_OUTPUT) {
          // Flash the status LED to visually confirm data received
          digitalWrite(STATUS_LED_PIN, LOW);
          delay(50);
          digitalWrite(STATUS_LED_PIN, HIGH);
          
          processArrayString(arrayString);
        } else {
          // If not in output phase, lower all dots
          lowerAllDots();
        }
      } else {
        // Legacy single byte phase format
        if (value.length() == 1) {
          uint8_t phaseValue = value[0];
          currentPhase = phaseValue;
          
          if (currentPhase != PHASE_OUTPUT) {
            lowerAllDots();
          }
          
          Serial.print("Received legacy phase update: ");
          Serial.println(currentPhase == PHASE_OUTPUT ? "OUTPUT" : "NOT OUTPUT");
        } else {
          // Try to be more forgiving with invalid formats
          Serial.println("Invalid format - trying to process as array data anyway");
          if (value.find('[') != std::string::npos) {
            processArrayString(value);
          } else {
            Serial.println("Cannot process data: no valid array format detected");
          }
        }
      }
      
      // Add more robust error handling for array parsing
      if (value.find("[") != std::string::npos && currentPhase == PHASE_OUTPUT) {
        // Blink LED rapidly to indicate data being processed
        digitalWrite(STATUS_LED_PIN, LOW);
        delay(10);
        digitalWrite(STATUS_LED_PIN, HIGH);
        
        // Log each step of processing
        Serial.println("Processing as braille pattern array");
        size_t bracketPos = value.find("[");
        if (bracketPos != std::string::npos) {
          std::string arrayPortion = value.substr(bracketPos);
          Serial.print("Extracted array portion: ");
          Serial.println(arrayPortion.c_str());
          processArrayString(arrayPortion);
        } else {
          Serial.println("No opening bracket found in data");
        }
      }
    }
  }
};

// Custom callback for BLE speed test characteristic operations
class SpeedTestCharacteristicCallbacks: public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic* pCharacteristic) {
    std::string value = pCharacteristic->getValue();
    
    if (value.length() > 0) {
      if (!speedTestActive) {
        // Start speed test
        speedTestActive = true;
        testStartTime = millis();
        lastPacketTime = testStartTime;
        packetCount = 0;
        totalBytesReceived = 0;
        Serial.println("Speed test started");
      }
      
      // Update speed test variables
      packetCount++;
      totalBytesReceived += value.length();
      lastPacketTime = millis();
      
      // Print speed test progress
      Serial.print("Packet ");
      Serial.print(packetCount);
      Serial.print(" received: ");
      Serial.print(value.length());
      Serial.print(" bytes, Total: ");
      Serial.print(totalBytesReceived);
      Serial.println(" bytes");
      
      // Provide instant feedback if we're getting close to completion
      if (packetCount % 10 == 0) {
        unsigned long currentDuration = millis() - testStartTime;
        float currentSpeed = (totalBytesReceived * 1000.0) / currentDuration;
        Serial.print("Current speed: ");
        Serial.print(currentSpeed);
        Serial.println(" bytes/second");
      }
    }
  }
};

/**
 * Activate braille dots based on array inputs
 */
void activateDots(int dots[6]) {
  // For now, we'll just set the first cell with the pattern
  Serial.print("[");
  Serial.print(millis()/1000.0, 3);
  Serial.print("s] Setting dots [");
  for (int i = 0; i < NUM_PINS; i++) {
    digitalWrite(braillePins[0][i], dots[i] ? HIGH : LOW);
    Serial.print(dots[i] ? "1" : "0");
    if (i < NUM_PINS - 1) Serial.print(",");
  }
  Serial.println("]");
  
  // Update tracking variables
  outputActive = true;
  lastOutputTime = millis();
  currentPhase = PHASE_OUTPUT;
  Serial.println("Braille dots activated");
}

/**
 * Process binary braille array format
 * Only accepts the 2-byte format (phase byte + 6-bit dots byte)
 */
void processBrailleArray(const uint8_t* data, size_t length) {
  Serial.print("[");
  Serial.print(millis()/1000.0, 3);
  Serial.print("s] Received ");
  Serial.print(length);
  Serial.print(" bytes: ");
  for (size_t i = 0; i < length; i++) {
    Serial.print("0x");
    if (data[i] < 16) Serial.print("0");
    Serial.print(data[i], HEX);
    if (i < length - 1) Serial.print(" ");
  }
  Serial.println();
  
  // Only accept 2-byte format: first byte is phase, second byte has dot states in bits
  if (length == 2) {
    uint8_t phase = data[0];
    uint8_t dotBits = data[1];
    int dots[6];
    
    // Extract individual bits for each dot (bit 0 = dot 1, bit 1 = dot 2, etc.)
    for (int i = 0; i < 6; i++) {
      dots[i] = (dotBits & (1 << i)) ? 1 : 0;
    }
    
    // Update phase if provided
    currentPhase = phase;
    
    // Activate dots
    Serial.print("Processing 2-byte format - Phase: ");
    Serial.print(phase == PHASE_OUTPUT ? "OUTPUT" : "NOT_OUTPUT");
    Serial.print(", Packed bits: 0b");
    for (int i = 5; i >= 0; i--) {
      Serial.print((dotBits & (1 << i)) ? "1" : "0");
    }
    Serial.println();
    activateDots(dots);
  }
  else {
    Serial.print("Invalid data format length: ");
    Serial.println(length);
    Serial.println("Only 2-byte format (phase byte + 6-bit data byte) is supported");
  }
}

void setup() {
  // Initialize serial with higher baud rate for faster logging
  Serial.begin(115200);
  
  // Wait for serial to connect for debugging purposes
  delay(1000);
  
  Serial.println("\n\n=== Speech-to-Braille BLE Device ===");
  Serial.println("Build version: " __DATE__ " " __TIME__);
  
  Serial.println("Starting Speech-to-Braille BLE Device with JSON Array Format");

  // Initialize braille pins as outputs and set to LOW
  for (int cell = 0; cell < NUM_CELLS; cell++) {
    for (int i = 0; i < NUM_PINS; i++) {
      pinMode(braillePins[cell][i], OUTPUT);
      digitalWrite(braillePins[cell][i], LOW);
    }
  }

  // Initialize LED pin as output and set to LOW
  pinMode(STATUS_LED_PIN, OUTPUT);
  digitalWrite(STATUS_LED_PIN, LOW);

  // Initialize BLE device
  BLEDevice::init("Braille Display");
  
  // Create BLE server and set callbacks
  pServer = BLEDevice::createServer();
  pServer->setCallbacks(new ServerCallbacks());

  // Create BLE service
  BLEService* pService = pServer->createService(BRAILLE_SERVICE_UUID);

  // Create BLE characteristic with explicit properties
  pCharacteristic = pService->createCharacteristic(
    BRAILLE_CHARACTERISTIC_UUID,
    BLECharacteristic::PROPERTY_READ |
    BLECharacteristic::PROPERTY_WRITE |
    BLECharacteristic::PROPERTY_WRITE_NR |  // Add write without response property
    BLECharacteristic::PROPERTY_NOTIFY |
    BLECharacteristic::PROPERTY_INDICATE
  );
  
  // Set callbacks for characteristic
  pCharacteristic->setCallbacks(new CharacteristicCallbacks());
  
  // Add client characteristic descriptor
  pCharacteristic->addDescriptor(new BLE2902());

  // Create BLE speed test characteristic
  pSpeedTestCharacteristic = pService->createCharacteristic(
    SPEED_TEST_CHARACTERISTIC_UUID,
    BLECharacteristic::PROPERTY_WRITE
  );
  
  // Set callbacks for speed test characteristic
  pSpeedTestCharacteristic->setCallbacks(new SpeedTestCharacteristicCallbacks());

  // Start the service
  pService->start();

  // Start advertising
  BLEAdvertising* pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(BRAILLE_SERVICE_UUID);
  pAdvertising->setScanResponse(true);
  pAdvertising->setMinPreferred(0x06);  // helps with iPhone connections issue
  pAdvertising->setMinPreferred(0x12);
  BLEDevice::startAdvertising();
  
  // Add debugging outputs
  Serial.println("Braille pins configured:");
  for (int cell = 0; cell < NUM_CELLS; cell++) {
    Serial.print("  Cell ");
    Serial.print(cell);
    Serial.print(": Pins [");
    for (int pin = 0; pin < NUM_PINS; pin++) {
      Serial.print(braillePins[cell][pin]);
      if (pin < NUM_PINS - 1) Serial.print(", ");
    }
    Serial.println("]");
  }
  
  Serial.println("BLE server ready. Waiting for connections...");
  
  // Visual indicator that setup is complete
  for (int i = 0; i < 5; i++) {
    digitalWrite(STATUS_LED_PIN, HIGH);
    delay(100);
    digitalWrite(STATUS_LED_PIN, LOW);
    delay(100);
  }
}

void loop() {
  // Disconnection handling
  if (!deviceConnected && oldDeviceConnected) {
    delay(500); // Give the Bluetooth stack time to get ready
    pServer->startAdvertising(); // Restart advertising
    Serial.println("Restarting BLE advertising");
    oldDeviceConnected = deviceConnected;
  }
  
  // Connection handling
  if (deviceConnected && !oldDeviceConnected) {
    Serial.println("Device connected - ready to receive braille data");
    oldDeviceConnected = deviceConnected;
  }
  
  // Sequential pin activation when not connected - loop through all braille pins
  if (!deviceConnected) {
    unsigned long currentTime = millis();
    if (currentTime - lastHeartbeatTime >= HEARTBEAT_INTERVAL) {
      // Calculate which pin to activate based on sequence
      static int sequence = 0;
      int totalPins = NUM_CELLS * NUM_PINS;
      
      // Turn off all pins
      for (int cell = 0; cell < NUM_CELLS; cell++) {
        for (int pin = 0; pin < NUM_PINS; pin++) {
          digitalWrite(braillePins[cell][pin], LOW);
        }
      }
      
      // Calculate which pin to light up
      int cellIndex = sequence / NUM_PINS;
      int pinIndex = sequence % NUM_PINS;
      
      // Turn on just this pin
      digitalWrite(braillePins[cellIndex][pinIndex], HIGH);
      
      // Move to next in sequence
      sequence = (sequence + 1) % totalPins;
      
      // Toggle the status LED
      ledState = !ledState;
      digitalWrite(STATUS_LED_PIN, ledState ? HIGH : LOW);
      
      lastHeartbeatTime = currentTime;
    }
  }
  
  // Auto-reset braille output if no new data received within timeout
  if (outputActive && (millis() - lastOutputTime >= OUTPUT_TIMEOUT)) {
    unsigned long idleTime = millis() - lastOutputTime;
    Serial.print("[");
    Serial.print(millis()/1000.0, 3);
    Serial.print("s] Output timeout after ");
    Serial.print(idleTime);
    Serial.println("ms - lowering all dots");
    outputActive = false;
    lowerAllDots();
  }
  
  // Speed test timeout handling
  if (speedTestActive && (millis() - lastPacketTime >= SPEED_TEST_TIMEOUT)) {
    unsigned long testDuration = millis() - testStartTime;
    float speed = (totalBytesReceived * 1000.0) / testDuration; // bytes per second
    Serial.print("Speed test completed: ");
    Serial.print(totalBytesReceived);
    Serial.print(" bytes in ");
    Serial.print(testDuration);
    Serial.print(" ms, Speed: ");
    Serial.print(speed);
    Serial.println(" bytes/second");
    speedTestActive = false;
  }
  
  // Brief delay in the loop
  delay(100);
}