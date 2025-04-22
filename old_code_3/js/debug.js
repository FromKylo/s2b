/**
 * Debug Module
 * Handles debug console features and logging functionality
 */

class DebugConsole {
    constructor() {
        // DOM elements
        this.elements = {
            debugToggle: document.getElementById('toggle-debug'),
            debugConsole: document.getElementById('debug-console'),
            debugOutput: document.getElementById('debug-output'),
            debugCommand: document.getElementById('debug-command'),
            sendCommand: document.getElementById('send-command'),
        };
        
        this.bindEvents();
    }
    
    /**
     * Bind UI event handlers for debug console
     */
    bindEvents() {
        // Only bind if we have the necessary elements
        if (!this.elements.debugToggle || !this.elements.debugConsole) return;
        
        // Debug console toggle
        this.elements.debugToggle.addEventListener('click', () => {
            this.elements.debugConsole.classList.toggle('hidden');
        });
        
        // Send debug command
        if (this.elements.sendCommand && this.elements.debugCommand) {
            this.elements.sendCommand.addEventListener('click', () => {
                const command = this.elements.debugCommand.value.trim();
                if (command) {
                    this.processCommand(command);
                    this.elements.debugCommand.value = '';
                }
            });
            
            // Debug command input enter key
            this.elements.debugCommand.addEventListener('keyup', (event) => {
                if (event.key === 'Enter') {
                    const command = this.elements.debugCommand.value.trim();
                    if (command) {
                        this.processCommand(command);
                        this.elements.debugCommand.value = '';
                    }
                }
            });
        }
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (event) => {
            // F12 to toggle debug console
            if (event.key === 'F12') {
                event.preventDefault();
                this.elements.debugConsole.classList.toggle('hidden');
            }
        });
    }
    
    /**
     * Process a debug command
     * @param {string} command - Command to process
     */
    processCommand(command) {
        if (!command) return;
        
        // Log the command
        this.log(`> ${command}`, 'command');
        
        // Process different command types
        if (command.toLowerCase().startsWith('o:') || 
            command.toLowerCase().startsWith('n:')) {
            // Direct BLE commands
            this.handleBLECommand(command);
        } 
        else if (command.toLowerCase().startsWith('pins:')) {
            // Pin control command
            this.handlePinCommand(command);
        }
        else if (command.toLowerCase().startsWith('debug:')) {
            // Debug specific commands
            this.handleDebugCommand(command);
        }
        else if (command.toLowerCase().startsWith('test:')) {
            // Test commands
            this.handleTestCommand(command);
        }
        else if (command.toLowerCase().startsWith('search:')) {
            this.handleSearchCommand(command);
        }
        else if (command.toLowerCase().startsWith('filter:')) {
            // Database filter command
            this.handleFilterCommand(command);
        }
        else if (command.toLowerCase().startsWith('language:')) {
            this.handleLanguageCommand(command);
        }
        else if (command.toLowerCase() === 'help') {
            // Display help information
            this.displayHelp();
        }
        else if (command.toLowerCase() === 'clear') {
            this.elements.debugOutput.innerHTML = '';
        }
        else {
            this.log(`Unknown command: ${command}`, 'error');
            this.log('Type "help" to see available commands', 'info');
        }
        
        // Scroll to bottom after command execution
        this.elements.debugOutput.scrollTop = this.elements.debugOutput.scrollHeight;
    }
    
    /**
     * Handle BLE related commands (O: or N: prefixed)
     * @param {string} command - Command to handle
     */
    async handleBLECommand(command) {
        if (!window.bleConnection.isConnected) {
            this.log('Cannot send command: BLE not connected', 'error');
            return;
        }
        
        try {
            // Add detailed logging before sending
            this.log(`Sending ${command.startsWith('O:') ? 'OUTPUT' : 'CLEAR'} command to device...`, 'debug');
            this.log(`Command data: ${command}`, 'debug');
            
            // Send the command
            await window.bleConnection.sendData(command);
            this.log('Command sent successfully', 'success');
        } catch (error) {
            this.log(`Error sending command: ${error.message}`, 'error');
        }
    }
    
    /**
     * Handle pin control commands (pins: prefixed)
     * @param {string} command - Command to handle
     */
    async handlePinCommand(command) {
        if (!window.bleConnection.isConnected) {
            this.log('Cannot send pin command: BLE not connected', 'error');
            return;
        }
        
        try {
            const params = command.substring(5).split(',').map(p => parseInt(p.trim()));
            
            if (params.length !== 3 || isNaN(params[0]) || isNaN(params[1]) || isNaN(params[2])) {
                this.log('Invalid format. Use: pins:cell,pin,value (e.g., pins:0,2,1)', 'error');
                return;
            }
            
            const [cell, pin, value] = params;
            
            if (cell < 0 || cell > 2 || pin < 0 || pin > 5 || (value !== 0 && value !== 1)) {
                this.log('Invalid parameters. Cell: 0-2, Pin: 0-5, Value: 0-1', 'error');
                return;
            }
            
            // Create direct pin command and send it using sendData
            const pinCommand = `P:${cell},${pin},${value}`;
            await window.bleConnection.sendData(pinCommand);
            this.log(`Set cell ${cell} pin ${pin} to ${value}`, 'success');
        } catch (error) {
            this.log(`Error sending pin command: ${error.message}`, 'error');
        }
    }
    
    /**
     * Handle debug commands (debug: prefixed)
     * @param {string} command - Command to handle
     */
    handleDebugCommand(command) {
        const debugParam = command.substring(6).trim().toLowerCase();
        
        if (debugParam === 'phase') {
            // Show current application phase state
            if (window.app && window.app.currentPhase) {
                this.log(`Current phase: ${window.app.currentPhase}`, 'info');
                
                // Inspect phase containers if available
                if (window.app.elements && window.app.elements.phaseContainers) {
                    this.log(`Containers active states:`, 'info');
                    
                    Object.keys(window.app.elements.phaseContainers).forEach(phase => {
                        const container = window.app.elements.phaseContainers[phase];
                        if (container) {
                            this.log(`- ${phase}: ${container.classList.contains('active') ? 'ACTIVE' : 'inactive'}`, 'debug');
                        }
                    });
                }
            } else {
                this.log('Cannot access app state', 'error');
            }
        }
        else if (debugParam === 'output') {
            // Debug output phase specifically
            if (window.app) {
                this.log('Output Phase Debug Information:', 'info');
                this.log(`Current countdown value: ${window.app.countdownValue || 'N/A'}`, 'debug');
                this.log(`Output timer active: ${window.app.outputTimer !== null}`, 'debug');
                this.log(`BLE connected: ${window.bleConnection.isConnected}`, 'debug');
                
                const wordElement = document.getElementById('recognized-word');
                const displayElement = document.getElementById('braille-display');
                
                if (wordElement) {
                    this.log(`Current word displayed: "${wordElement.textContent}"`, 'debug');
                }
                
                if (displayElement) {
                    this.log(`Current display element contents: ${displayElement.children.length} cells`, 'debug');
                }
            } else {
                this.log('Cannot access app state', 'error');
            }
        }
        else if (debugParam.startsWith('simulate')) {
            // Simulate output phase with test data
            const parts = debugParam.split(':');
            const word = parts.length > 1 ? parts[1] : 'test';
            
            this.log(`Simulating output phase with word: "${word}"`, 'info');
            
            // Find pattern for word
            const pattern = window.brailleTranslation.translateWord(word);
            if (pattern && window.app && window.app.transitionToOutputPhase) {
                window.app.transitionToOutputPhase(word, pattern);
            } else if (!pattern) {
                this.log(`No pattern found for word: ${word}`, 'error');
            } else {
                this.log(`Cannot access app.transitionToOutputPhase method`, 'error');
            }
        }
        else {
            this.log(`Unknown debug command: ${debugParam}`, 'error');
            this.log(`Available debug commands: phase, output, simulate:word`, 'info');
        }
    }
    
    /**
     * Handle test commands (test: prefixed)
     * @param {string} command - Command to handle
     */
    async handleTestCommand(command) {
        const testParam = command.substring(5).trim().toLowerCase();
        
        if (!testParam) {
            this.log('Please specify a test parameter (e.g., test:a, test:alphabet, test:numbers)', 'error');
            return;
        }
        
        try {
            if (testParam === 'alphabet') {
                this.log('Running alphabet test...', 'info');
                const container = document.createElement('div');
                container.className = 'debug-braille-output';
                this.elements.debugOutput.appendChild(container);
                
                await window.brailleTranslation.runAlphabetAndNumbersTest(
                    container, 
                    window.bleConnection.isConnected ? 
                        pattern => window.bleConnection.sendBraillePattern(pattern) : 
                        null
                );
                
                this.log('Alphabet test complete', 'success');
            } 
            else if (testParam === 'numbers') {
                this.log('Running numbers test...', 'info');
                const container = document.createElement('div');
                container.className = 'debug-braille-output';
                this.elements.debugOutput.appendChild(container);
                
                const numbers = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
                
                for (const num of numbers) {
                    const pattern = window.brailleTranslation.translateWord(num);
                    if (pattern) {
                        this.log(`Testing number: ${num}`, 'info');
                        window.brailleTranslation.renderBrailleCells(pattern, container);
                        
                        if (window.bleConnection.isConnected) {
                            await window.bleConnection.sendBraillePattern(pattern);
                        }
                        
                        await new Promise(resolve => setTimeout(resolve, 800));
                    }
                }
                
                this.log('Numbers test complete', 'success');
            } 
            else {
                // Test a single character or word
                const pattern = window.brailleTranslation.translateWord(testParam);
                
                if (pattern) {
                    this.log(`Testing pattern for: ${testParam}`, 'info');
                    
                    const container = document.createElement('div');
                    container.className = 'debug-braille-output';
                    
                    // Create word label
                    const label = document.createElement('div');
                    label.className = 'debug-braille-label';
                    label.textContent = testParam;
                    container.appendChild(label);
                    
                    // Render braille pattern
                    window.brailleTranslation.renderBrailleCells(pattern, container);
                    
                    this.elements.debugOutput.appendChild(container);
                    
                    // Send to hardware if connected
                    if (window.bleConnection.isConnected) {
                        await window.bleConnection.sendBraillePattern(pattern);
                    }
                } else {
                    this.log(`No pattern found for: ${testParam}`, 'error');
                    
                    // Try to be more helpful with suggestions
                    this.log(`Trying to find alternative options...`, 'info');
                    
                    // Try letter by letter if it's a multi-character word
                    if (testParam.length > 1) {
                        this.log(`Breaking down "${testParam}" into individual letters:`, 'info');
                        let foundAny = false;
                        
                        for (const letter of testParam) {
                            const letterPattern = window.brailleTranslation.translateWord(letter);
                            if (letterPattern) {
                                foundAny = true;
                                this.log(`- Letter "${letter}" found in database`, 'success');
                            } else {
                                this.log(`- Letter "${letter}" not found in database`, 'warning');
                            }
                        }
                        
                        if (foundAny) {
                            this.log(`Tip: Try testing individual letters (e.g., test:${testParam[0]})`, 'info');
                        }
                    }
                    
                    // Suggest using the search command for more details
                    this.log(`Tip: Use 'search:${testParam}' to search the database with more details`, 'info');
                    
                    // Try to find similar words as suggestions
                    const languages = window.brailleTranslation.getLanguages();
                    this.log(`Currently using language: ${window.brailleTranslation.currentLanguage}`, 'info');
                    this.log(`Try switching language with 'language:[${languages.join('|')}]'`, 'info');
                }
            }
        } catch (error) {
            this.log(`Test error: ${error.message}`, 'error');
        }
    }
    
    /**
     * Handle search commands (search: prefixed)
     * @param {string} command - Command to handle
     */
    handleSearchCommand(command) {
        const searchTerm = command.substring(7).trim();
        
        if (!searchTerm) {
            this.log('Please specify a search term (e.g., search:hello)', 'error');
            return;
        }
        
        // Use brailleTranslation to search
        const result = window.brailleTranslation.findWordInDatabase(searchTerm);
        
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
            window.brailleTranslation.renderBrailleCells(result.array, patternContainer);
            
            this.elements.debugOutput.appendChild(container);
            
            // Send pattern to device if connected
            if (window.bleConnection.isConnected) {
                const sendButton = document.createElement('button');
                sendButton.className = 'debug-send-btn';
                sendButton.textContent = 'Send to Device';
                sendButton.onclick = async () => {
                    await window.bleConnection.sendBraillePattern(result.array);
                    this.log(`Pattern sent: ${result.word}`, 'success');
                };
                container.appendChild(sendButton);
            }
        } else {
            this.log(`No database entry found for: ${searchTerm}`, 'error');
            
            // Try to find similar entries using partial matching
            const similarWords = [];
            const languages = window.brailleTranslation.getLanguages();
            
            // Check each language for similar words
            for (const lang of languages) {
                const langDb = window.brailleTranslation.brailleDatabase[lang] || {};
                
                // Look for words containing the search term
                for (const word in langDb) {
                    if (word.includes(searchTerm)) {
                        similarWords.push({ word, lang });
                        if (similarWords.length >= 10) break; // Limit to 10 suggestions
                    }
                }
                if (similarWords.length >= 10) break;
            }
            
            if (similarWords.length > 0) {
                this.log(`Found ${similarWords.length} similar entries:`, 'info');
                const matchList = document.createElement('div');
                matchList.className = 'similar-matches';
                matchList.innerHTML = '<ul>' + 
                    similarWords.map(m => `<li>${m.word} (${m.lang})</li>`).join('') + 
                    '</ul>';
                this.elements.debugOutput.appendChild(matchList);
            }
        }
    }
    
    /**
     * Handle filter commands (filter: prefixed)
     * @param {string} command - Command to handle
     */
    handleFilterCommand(command) {
        const filterTerm = command.substring(7).trim().toLowerCase();
        
        if (!filterTerm) {
            this.log('Please specify a filter term (e.g., filter:a)', 'error');
            return;
        }
        
        // Use brailleTranslation to filter database
        const filteredEntries = window.brailleTranslation.filterDatabase(filterTerm);
        
        if (filteredEntries && filteredEntries.length > 0) {
            this.log(`Found ${filteredEntries.length} entries containing "${filterTerm}":`, 'info');
            
            // Display results
            const resultsTable = window.brailleTranslation.displayDatabaseResults(filteredEntries, this.elements.debugOutput);
            
            // Add event listeners to the test buttons
            if (resultsTable) {
                resultsTable.querySelectorAll('.test-entry-btn').forEach(btn => {
                    btn.addEventListener('click', async () => {
                        const wordToTest = btn.getAttribute('data-word');
                        if (wordToTest) {
                            // Use existing test command functionality
                            await this.processCommand(`test:${wordToTest}`);
                        }
                    });
                });
                
                // If there are more results than we displayed
                if (filteredEntries.length > 20) {
                    this.log(`Showing 20 of ${filteredEntries.length} total matches. Refine your filter for more specific results.`, 'info');
                }
            }
        } else {
            this.log(`No entries found containing "${filterTerm}"`, 'error');
        }
    }
    
    /**
     * Handle language commands (language: prefixed)
     * @param {string} command - Command to handle
     */
    handleLanguageCommand(command) {
        const language = command.substring(9).trim();
        
        if (!language) {
            // Just show available languages
            const languages = window.brailleTranslation.getLanguages();
            this.log(`Available languages: ${languages.join(', ')}`, 'info');
            this.log(`Current language: ${window.brailleTranslation.currentLanguage}`, 'info');
            return;
        }
        
        if (window.brailleTranslation.setLanguage(language)) {
            this.log(`Language set to: ${language}`, 'success');
        } else {
            const languages = window.brailleTranslation.getLanguages();
            this.log(`Invalid language: ${language}. Available options: ${languages.join(', ')}`, 'error');
        }
    }
    
    /**
     * Display help information for debug commands
     */
    displayHelp() {
        const helpText = `
            <div class="debug-help">
                <h3>Debug Console Commands:</h3>
                <ul>
                    <li><code>O:[[1,2,3]]</code> - Send output pattern directly</li>
                    <li><code>N:[]</code> - Clear display (lower all dots)</li>
                    <li><code>pins:cell,pin,value</code> - Control individual pin (e.g., pins:0,2,1)</li>
                    <li><code>test:x</code> - Test character or word (e.g., test:a)</li>
                    <li><code>test:alphabet</code> - Run through entire alphabet</li>
                    <li><code>test:numbers</code> - Test all number representations</li>
                    <li><code>search:word</code> - Search database for exact word</li>
                    <li><code>filter:term</code> - Filter database for entries containing term</li>
                    <li><code>language:X</code> - Set or view language (e.g., language:UEB)</li>
                    <li><code>debug:phase</code> - Show current app phase state</li>
                    <li><code>debug:output</code> - Show output phase debug info</li>
                    <li><code>debug:simulate:word</code> - Simulate output phase with word</li>
                    <li><code>clear</code> - Clear the console</li>
                    <li><code>help</code> - Show this help text</li>
                </ul>
            </div>
        `;
        const helpElement = document.createElement('div');
        helpElement.innerHTML = helpText;
        this.elements.debugOutput.appendChild(helpElement);
    }
    
    /**
     * Add a log message to the debug console
     * @param {string} message - The message to log
     * @param {string} type - Log type (info, error, warning, debug)
     */
    log(message, type = 'info') {
        if (!this.elements.debugOutput) return;
        
        const timestamp = new Date().toLocaleTimeString();
        const logElement = document.createElement('div');
        logElement.className = `log-entry ${type}`;
        
        // For debug messages, add detailed timestamp with milliseconds
        if (type === 'debug') {
            const detailedTime = new Date().toISOString().split('T')[1].split('Z')[0];
            logElement.innerHTML = `<span class="timestamp">[${detailedTime}]</span> ${message}`;
        } else {
            logElement.innerHTML = `<span class="timestamp">[${timestamp}]</span> ${message}`;
        }
        
        this.elements.debugOutput.appendChild(logElement);
        this.elements.debugOutput.scrollTop = this.elements.debugOutput.scrollHeight;
        
        // Also log to console with appropriate method
        switch(type) {
            case 'error':
                console.error(`[${type}] ${message}`);
                break;
            case 'warning':
                console.warn(`[${type}] ${message}`);
                break;
            case 'debug':
                console.debug(`[${type}] ${message}`);
                break;
            default:
                console.log(`[${type}] ${message}`);
        }
    }
}

// Create global instance
window.debugConsole = new DebugConsole();

// Add global logging function for convenience
function logDebug(message, type = 'info') {
    if (window.debugConsole) {
        window.debugConsole.log(message, type);
    } else {
        console.log(`[${type}] ${message}`);
    }
}