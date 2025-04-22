/**
 * Debug UI Components and Functionality
 * Handles debug console, command processing, and database search UI
 */

class DebugUI {
    constructor(app) {
        this.app = app;
        this.elements = {
            debugToggle: document.getElementById('toggle-debug'),
            debugConsole: document.getElementById('debug-console'),
            debugOutput: document.getElementById('debug-output'),
            debugCommand: document.getElementById('debug-command'),
            sendCommand: document.getElementById('send-command')
        };
        
        // Check if elements were found
        if (!this.elements.debugToggle) {
            console.error('Debug toggle button not found with ID "toggle-debug"');
        }
        if (!this.elements.debugConsole) {
            console.error('Debug console element not found with ID "debug-console"');
        }
        
        this.bindEvents();
        this.setupUIControls();
    }

    /**
     * Bind UI event handlers for debug
     */
    bindEvents() {
        // Debug console toggle
        if (this.elements.debugToggle) {
            this.elements.debugToggle.addEventListener('click', () => {
                if (this.elements.debugConsole) {
                    this.elements.debugConsole.classList.toggle('hidden');
                    this.app.log('Debug console toggled', 'debug');
                }
            });
        }
        
        // Send debug command
        if (this.elements.sendCommand) {
            this.elements.sendCommand.addEventListener('click', () => {
                const command = this.elements.debugCommand.value.trim();
                if (command) {
                    this.sendDebugCommand(command);
                    this.elements.debugCommand.value = '';
                }
            });
        }
        
        // Debug command input enter key
        if (this.elements.debugCommand) {
            this.elements.debugCommand.addEventListener('keyup', (event) => {
                if (event.key === 'Enter') {
                    const command = this.elements.debugCommand.value.trim();
                    if (command) {
                        this.sendDebugCommand(command);
                        this.elements.debugCommand.value = '';
                    }
                }
            });
        }
    }

    /**
     * Set up additional UI controls for debugging
     */
    setupUIControls() {
        // Add database search UI to debug console
        this.createDatabaseSearchUI();
    }

    /**
     * Create UI elements for database search
     */
    createDatabaseSearchUI() {
        // Create search container if it doesn't exist
        let searchContainer = document.getElementById('db-search-container');
        if (!searchContainer) {
            searchContainer = document.createElement('div');
            searchContainer.id = 'db-search-container';
            searchContainer.className = 'debug-section';
            
            searchContainer.innerHTML = `
                <h3>Database Search</h3>
                <div class="search-form">
                    <input type="text" id="db-search-input" placeholder="Type a word to search">
                    <button id="db-search-button">Search</button>
                </div>
            `;
            
            // Add to debug console before the debug output
            this.elements.debugConsole.insertBefore(
                searchContainer, 
                this.elements.debugOutput
            );
            
            // Add event listener to the search button
            const searchButton = document.getElementById('db-search-button');
            const searchInput = document.getElementById('db-search-input');
            
            if (searchButton && searchInput) {
                // Search on button click
                searchButton.addEventListener('click', () => {
                    const term = searchInput.value.trim();
                    if (term) {
                        const result = this.searchDatabase(term);
                        this.displayDatabaseResult(result, term);
                    }
                });

                // Search on Enter key
                searchInput.addEventListener('keyup', (event) => {
                    if (event.key === 'Enter') {
                        const term = searchInput.value.trim();
                        if (term) {
                            const result = this.searchDatabase(term);
                            this.displayDatabaseResult(result, term);
                        }
                    }
                });
            }
        }
    }

    /**
     * Search the braille database for a word
     * @param {string} word - The word to search for
     * @returns {Object|null} - The matching database entry or null if not found
     */
    searchDatabase(word) {
        this.app.log(`Searching database for: ${word}`);
        
        if (!word || typeof word !== 'string') {
            this.app.log('Invalid search term', 'error');
            return null;
        }
        
        const result = brailleTranslation.findWordInDatabase(word);
        
        if (result) {
            this.app.log(`Found match for "${word}" in database`, 'success');
            return result;
        } else {
            this.app.log(`No match found for "${word}"`, 'warning');
            return null;
        }
    }
 
    /**
     * Display database search result in the UI
     * @param {Object} result - The database search result
     */ 
    displayDatabaseResult(result, searchTerm) {
        // Create or get result container
        let resultContainer = document.getElementById('db-search-result');
        if (!resultContainer) {
            resultContainer = document.createElement('div');
            resultContainer.id = 'db-search-result';
            resultContainer.className = 'search-result';
            this.elements.debugConsole.appendChild(resultContainer);
        }
        
        if (!result) {
            resultContainer.innerHTML = `<div class="not-found">No match found for "${searchTerm}"</div>`;
            return;
        }
        
        // Format and display the result
        let html = `
            <div class="result-item">
                <h4>Found Match: "${result.word}"</h4>
                <ul>
                    <li><strong>Short Form:</strong> ${result.shortf || 'None'}</li>
                    <li><strong>Braille:</strong> ${result.braille || 'None'}</li>
                    <li><strong>Language:</strong> ${result.lang || 'UEB'}</li>
                </ul>
                <div class="braille-preview"></div>
            </div>
        `;
        
        resultContainer.innerHTML = html;
        
        // Render braille pattern if available
        if (result.array) {
            const previewElement = resultContainer.querySelector('.braille-preview');
            brailleTranslation.renderBrailleCells(result.array, previewElement);
        }
    }

    /**
     * Send a debug command to the BLE device
     * @param {string} command - The command to send
     */
    async sendDebugCommand(command) {
        if (!command) return;
        
        // Log the command
        this.app.log(`> ${command}`, 'command');
        
        // Process different command types
        if (command.toLowerCase().startsWith('o:') || 
            command.toLowerCase().startsWith('n:')) {
            // Direct BLE commands
            if (!bleConnection.isConnected) {
                this.app.log('Cannot send command: BLE not connected', 'error');
                return;
            }
            
            try {
                // Add detailed logging before sending
                this.app.log(`Sending ${command.startsWith('O:') ? 'OUTPUT' : 'CLEAR'} command to device...`, 'debug');
                this.app.log(`Command data: ${command}`, 'debug');
                
                // Send the command
                await bleConnection.sendData(command);
                this.app.log('Command sent successfully', 'success');
                
                // Show current phase for debugging
                this.app.log(`Current phase: ${this.app.currentPhase}`, 'debug');
            } catch (error) {
                this.app.log(`Error sending command: ${error.message}`, 'error');
            }
        } 
        else if (command.toLowerCase().startsWith('pins:')) {
            // Pin control command
            if (!bleConnection.isConnected) {
                this.app.log('Cannot send pin command: BLE not connected', 'error');
                return;
            }
            
            try {
                const params = command.substring(5).split(',').map(p => parseInt(p.trim()));
                
                if (params.length !== 3 || isNaN(params[0]) || isNaN(params[1]) || isNaN(params[2])) {
                    this.app.log('Invalid format. Use: pins:cell,pin,value (e.g., pins:0,2,1)', 'error');
                    return;
                }
                
                const [cell, pin, value] = params;
                
                if (cell < 0 || cell > 2 || pin < 0 || pin > 5 || (value !== 0 && value !== 1)) {
                    this.app.log('Invalid parameters. Cell: 0-2, Pin: 0-5, Value: 0-1', 'error');
                    return;
                }
                
                // Create direct pin command and send it using sendData
                const pinCommand = `P:${cell},${pin},${value}`;
                await bleConnection.sendData(pinCommand);
                this.app.log(`Set cell ${cell} pin ${pin} to ${value}`, 'success');
            } catch (error) {
                this.app.log(`Error sending pin command: ${error.message}`, 'error');
            }
        }
        else if (command.toLowerCase().startsWith('debug:')) {
            // Debug specific commands
            const debugParam = command.substring(6).trim().toLowerCase();
            
            if (debugParam === 'phase') {
                // Show current application phase state
                this.app.log(`Current phase: ${this.app.currentPhase}`, 'info');
                this.app.log(`Containers active states:`, 'info');
                
                // Inspect phase containers
                Object.keys(this.app.elements.phaseContainers).forEach(phase => {
                    const container = this.app.elements.phaseContainers[phase];
                    if (container) {
                        this.app.log(`- ${phase}: ${container.classList.contains('active') ? 'ACTIVE' : 'inactive'}`, 'debug');
                    }
                });
            }
            else if (debugParam === 'output') {
                // Debug output phase specifically
                this.app.log('Output Phase Debug Information:', 'info');
                this.app.log(`Current countdown value: ${this.app.countdownValue}`, 'debug');
                this.app.log(`Output timer active: ${this.app.outputTimer !== null}`, 'debug');
                this.app.log(`BLE connected: ${bleConnection.isConnected}`, 'debug');
                this.app.log(`Current word displayed: "${this.app.elements.recognizedWord.textContent}"`, 'debug');
                this.app.log(`Current display element contents: ${this.app.elements.brailleDisplay.children.length} cells`, 'debug');
            }
            else if (debugParam.startsWith('simulate')) {
                // Simulate output phase with test data
                const word = debugParam.split(':')[1] || 'test';
                this.app.log(`Simulating output phase with word: "${word}"`, 'info');
                
                // Find pattern for word
                const pattern = brailleTranslation.translateWord(word);
                if (pattern) {
                    this.app.transitionToOutputPhase(word, pattern);
                } else {
                    this.app.log(`No pattern found for word: ${word}`, 'error');
                }
            }
            else {
                this.app.log(`Unknown debug command: ${debugParam}`, 'error');
                this.app.log(`Available debug commands: phase, output, simulate:word`, 'info');
            }
        }
        else if (command.toLowerCase().startsWith('test:')) {
            // Test commands
            const testParam = command.substring(5).trim().toLowerCase();
            
            if (!testParam) {
                this.app.log('Please specify a test parameter (e.g., test:a, test:alphabet, test:numbers)', 'error');
                return;
            }
            
            try {
                if (testParam === 'alphabet') {
                    this.app.log('Running alphabet test...', 'info');
                    const container = document.createElement('div');
                    container.className = 'debug-braille-output';
                    this.elements.debugOutput.appendChild(container);
                    
                    await brailleTranslation.runAlphabetAndNumbersTest(
                        container, 
                        bleConnection.isConnected ? pattern => bleConnection.sendBraillePattern(pattern) : null
                    );
                    
                    this.app.log('Alphabet test complete', 'success');
                } 
                else if (testParam === 'numbers') {
                    this.app.log('Running numbers test...', 'info');
                    const container = document.createElement('div');
                    container.className = 'debug-braille-output';
                    this.elements.debugOutput.appendChild(container);
                    
                    const numbers = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
                    
                    for (const num of numbers) {
                        const pattern = brailleTranslation.translateWord(num);
                        if (pattern) {
                            this.app.log(`Testing number: ${num}`, 'info');
                            brailleTranslation.renderBrailleCells(pattern, container);
                            
                            if (bleConnection.isConnected) {
                                await bleConnection.sendBraillePattern(pattern);
                            }
                            
                            await new Promise(resolve => setTimeout(resolve, 800));
                        }
                    }
                    
                    this.app.log('Numbers test complete', 'success');
                } 
                else {
                    // Test a single character or word
                    const pattern = brailleTranslation.translateWord(testParam);
                    
                    if (pattern) {
                        this.app.log(`Testing pattern for: ${testParam}`, 'info');
                        
                        const container = document.createElement('div');
                        container.className = 'debug-braille-output';
                        
                        // Create word label
                        const label = document.createElement('div');
                        label.className = 'debug-braille-label';
                        label.textContent = testParam;
                        container.appendChild(label);
                        
                        // Render braille pattern
                        brailleTranslation.renderBrailleCells(pattern, container);
                        
                        this.elements.debugOutput.appendChild(container);
                        
                        // Send to hardware if connected
                        if (bleConnection.isConnected) {
                            await bleConnection.sendBraillePattern(pattern);
                        }
                    } else {
                        this.app.log(`No pattern found for: ${testParam}`, 'error');
                        
                        // Suggest using the search command for more details
                        this.app.log(`Tip: Use 'search:${testParam}' to search the database with more details`, 'info');
                    }
                }
            } catch (error) {
                this.app.log(`Test error: ${error.message}`, 'error');
            }
        }
        else if (command.toLowerCase().startsWith('search:')) {
            const searchTerm = command.substring(7).trim();
            
            if (!searchTerm) {
                this.app.log('Please specify a search term (e.g., search:hello)', 'error');
                return;
            }
            
            // Use brailleTranslation instead of brailleDB
            const result = brailleTranslation.findWordInDatabase(searchTerm);
            
            if (result) {
                const container = document.createElement('div');
                container.className = 'debug-braille-output';
                
                // Format search result
                const resultHTML = `
                    <div class="search-result">
                        <h3>${result.word}</h3>
                        <ul>
                            <li><strong>Language:</strong> ${result.lang}</li>
                            <li><strong>Braille:</strong> ${result.braille || 'None'}</li>
                            <li><strong>Array:</strong> ${JSON.stringify(result.array)}</li>
                        </ul>
                    </div>
                `;
                
                container.innerHTML = resultHTML;
                
                // Add braille pattern visualization
                const patternContainer = document.createElement('div');
                patternContainer.className = 'braille-preview';
                container.appendChild(patternContainer);
                brailleTranslation.renderBrailleCells(result.array, patternContainer);
                
                this.elements.debugOutput.appendChild(container);
                
                // Send pattern to device if connected
                if (bleConnection.isConnected) {
                    const sendButton = document.createElement('button');
                    sendButton.className = 'debug-send-btn';
                    sendButton.textContent = 'Send to Device';
                    sendButton.onclick = async () => {
                        try {
                            await bleConnection.sendBraillePattern(result.array);
                            this.app.log('Pattern sent to device', 'success');
                        } catch (error) {
                            this.app.log(`Error sending pattern: ${error.message}`, 'error');
                        }
                    };
                    container.appendChild(sendButton);
                }
            } else {
                this.app.log(`No database entry found for: ${searchTerm}`, 'error');
            }
        }
        else if (command.toLowerCase().startsWith('language:')) {
            const language = command.substring(9).trim();
            
            if (!language) {
                const languages = brailleTranslation.getLanguages();
                this.app.log(`Current language: ${brailleTranslation.currentLanguage}`, 'info');
                this.app.log(`Available languages: ${languages.join(', ')}`, 'info');
                return;
            }
            
            if (brailleTranslation.setLanguage(language)) {
                this.app.log(`Switched to language: ${language}`, 'success');
            } else {
                this.app.log(`Invalid language: ${language}`, 'error');
                const languages = brailleTranslation.getLanguages();
                this.app.log(`Available languages: ${languages.join(', ')}`, 'info');
            }
        }
        else {
            this.app.log(`Unknown command: ${command}`, 'error');
        }
        
        // Scroll to bottom after command execution
        this.elements.debugOutput.scrollTop = this.elements.debugOutput.scrollHeight;
    }
}

// Export the module
window.DebugUI = DebugUI;