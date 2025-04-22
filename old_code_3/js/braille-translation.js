/**
 * Braille Translation Module
 * Handles loading the braille database and translating words to braille patterns
 */

class BrailleTranslation {
    constructor() {
        this.brailleDatabase = {};
        this.languages = ['UEB', 'Philippine'];
        this.currentLanguage = 'UEB';
        this.cacheKey = 'braille_database_cache';
        this.cacheVersion = '1.0'; // Update this when database structure changes
    }

    /**
     * Initialize the braille database
     */
    async initialize() {
        try {
            // Try to load from cache first
            if (this.loadFromCache()) {
                console.log('Braille database loaded from cache');
                return true;
            }
            
            // If not in cache, load from CSV
            const database = await this.loadFromCSV('braille-database.csv');
            this.brailleDatabase = database;
            console.log('Braille database loaded from CSV');
            
            // Save to cache for future use
            this.saveToCache();
            
            return true;
        } catch (error) {
            console.error('Error loading braille database:', error);
            return false;
        }
    }
    
    /**
     * Load braille database from cache
     * @returns {boolean} - True if loaded from cache successfully
     */
    loadFromCache() {
        try {
            const cacheData = localStorage.getItem(this.cacheKey);
            if (!cacheData) return false;
            
            const cache = JSON.parse(cacheData);
            
            // Check if cache version matches
            if (cache.version !== this.cacheVersion) {
                console.log('Cache version mismatch, will reload from source');
                return false;
            }
            
            // Check if cache has expired (24 hours)
            const now = new Date().getTime();
            if (now - cache.timestamp > 24 * 60 * 60 * 1000) {
                console.log('Cache expired, will reload from source');
                return false;
            }
            
            this.brailleDatabase = cache.data;
            return true;
        } catch (error) {
            console.error('Error loading from cache:', error);
            return false;
        }
    }
    
    /**
     * Save braille database to cache
     */
    saveToCache() {
        try {
            const cache = {
                version: this.cacheVersion,
                timestamp: new Date().getTime(),
                data: this.brailleDatabase
            };
            
            localStorage.setItem(this.cacheKey, JSON.stringify(cache));
            console.log('Braille database saved to cache');
        } catch (error) {
            console.error('Error saving to cache:', error);
            // Cache errors are non-fatal, so we just log them
        }
    }

    /**
     * Load braille patterns from CSV file
     * @param {string} url - The URL of the CSV file
     * @returns {Promise<Object>} - The parsed braille database
     */
    async loadFromCSV(url) {
        const response = await fetch(url);
        const csvText = await response.text();
        
        // Parse CSV
        const lines = csvText.split('\n');
        const headers = lines[0].split(',');
        
        const database = {};
        
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            // Handle quoted fields properly (simple approach)
            const values = line.split(',');
            
            if (values.length >= 5) {
                const word = values[0].trim();
                const shortf = values[1].trim();
                const braille = values[2].trim();
                let array;
                
                try {
                    // Parse the array from the CSV
                    array = JSON.parse(values[3].trim().replace(/'/g, '"'));
                } catch (e) {
                    console.warn(`Could not parse array for ${word}:`, e);
                    array = [];
                }
                
                const lang = values[4].trim();
                
                // Add to appropriate language section
                if (!database[lang]) {
                    database[lang] = {};
                }
                
                database[lang][word] = {
                    shortf,
                    braille,
                    array
                };
            }
        }
        
        return database;
    }

    /**
     * Set the current language for braille translation
     * @param {string} language - The language to set ('UEB' or 'Philippine')
     */
    setLanguage(language) {
        if (this.languages.includes(language)) {
            this.currentLanguage = language;
            console.log(`Language set to ${language}`);
            return true;
        }
        return false;
    }

    /**
     * Get available languages
     * @returns {string[]} List of available languages
     */
    getLanguages() {
        return this.languages;
    }

    /**
     * Translates a word to its braille pattern
     * @param {string} word - The word to translate
     * @returns {Array|null} - The braille dot pattern or null if not found
     */
    translateWord(word) {
        if (!word) return null;
        
        // Try exact word match first
        word = word.toLowerCase().trim();
        const lang = this.currentLanguage;
        
        if (this.brailleDatabase[lang] && this.brailleDatabase[lang][word]) {
            return this.brailleDatabase[lang][word].array;
        }
        
        // If not found and word has multiple characters, try character by character
        if (word.length > 1) {
            const letterArrays = [];
            let allFound = true;
            
            for (const char of word) {
                if (this.brailleDatabase[lang] && this.brailleDatabase[lang][char]) {
                    letterArrays.push(this.brailleDatabase[lang][char].array[0]);
                } else {
                    allFound = false;
                    break;
                }
            }
            
            // Only return if we found patterns for all characters
            if (allFound && letterArrays.length === word.length) {
                return letterArrays;
            }
        }
        
        // Otherwise return null
        return null;
    }

    /**
     * Creates HTML for a visual braille cell representation
     * @param {Array} dotPattern - Array of dot numbers that are active
     * @returns {string} - HTML string for the braille cell
     */
    createBrailleCellHTML(dotPattern) {
        const cell = document.createElement('div');
        cell.className = 'braille-cell';
        
        // Create 6 dots (2 columns x 3 rows)
        for (let i = 1; i <= 6; i++) {
            const dot = document.createElement('div');
            dot.className = 'braille-dot';
            dot.dataset.dot = i;
            
            // Check if this dot should be active
            if (dotPattern && dotPattern.includes(i)) {
                dot.classList.add('active');
            }
            
            cell.appendChild(dot);
        }
        
        return cell;
    }

    /**
     * Render multiple braille cells
     * @param {Array} pattern - Pattern array (can be nested for multiple cells)
     * @param {Element} container - DOM element to render cells into
     */
    renderBrailleCells(pattern, container) {
        if (!pattern || !container) return;
        
        // Clear previous content
        container.innerHTML = '';
        
        // Create cells container
        const cellsContainer = document.createElement('div');
        cellsContainer.className = 'braille-cells-container';
        
        if (Array.isArray(pattern)) {
            if (pattern.length === 0) return;
            
            // Check if it's a multi-cell pattern
            if (Array.isArray(pattern[0])) {
                // Handle multi-cell pattern
                for (const cellPattern of pattern) {
                    const cellElement = this.createBrailleCellHTML(cellPattern);
                    cellsContainer.appendChild(cellElement);
                }
            } else {
                // Single cell pattern
                const cellElement = this.createBrailleCellHTML(pattern);
                cellsContainer.appendChild(cellElement);
            }
        }
        
        container.appendChild(cellsContainer);
    }

    /**
     * Run a comprehensive alphabet and numbers test
     * @param {Element} container - Container to display braille patterns
     * @param {Function} sendCallback - Function to send patterns to hardware
     * @returns {Promise<void>}
     */
    async runAlphabetAndNumbersTest(container, sendCallback) {
        const statusElement = document.createElement('div');
        statusElement.className = 'test-status';
        statusElement.textContent = 'Running braille test...';
        container.appendChild(statusElement);
        
        try {
            // Generate test sequence - all letters and numbers
            const letters = 'abcdefghijklmnopqrstuvwxyz'.split('');
            const numbers = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
            const testItems = [...letters, ...numbers];
            
            // Run the test sequence
            for (let i = 0; i < testItems.length; i++) {
                const item = testItems[i];
                statusElement.textContent = `Testing: ${item} (${i+1}/${testItems.length})`;
                
                // Get braille pattern
                const pattern = this.translateWord(item);
                
                if (pattern) {
                    // Display pattern
                    this.renderBrailleCells(pattern, container);
                    
                    // Send to hardware if callback provided
                    if (sendCallback && typeof sendCallback === 'function') {
                        await sendCallback(pattern);
                    }
                    
                    // Wait 0.5 seconds
                    await new Promise(resolve => setTimeout(resolve, 500));
                } else {
                    console.warn(`No pattern found for: ${item}`);
                }
            }
            
            // Test complete
            statusElement.textContent = 'Test complete!';
            statusElement.className = 'test-status success';
            setTimeout(() => {
                statusElement.remove();
                container.innerHTML = '';
            }, 2000);
        } catch (error) {
            console.error('Error during braille test:', error);
            statusElement.textContent = `Test error: ${error.message}`;
            statusElement.className = 'test-status error';
        }
    }

    /**
     * Run a test sequence showing all braille patterns
     * @param {Element} container - DOM element to render cells into
     * @param {Function} sendCallback - Callback to send patterns to hardware
     */
    async runBrailleTest(container, sendCallback) {
        const alphabet = 'abcdefghijklmnopqrstuvwxyz';
        const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
        
        // Test alphabet characters
        for (const char of alphabet) {
            const pattern = this.translateWord(char);
            if (pattern) {
                console.log(`Testing '${char}': ${JSON.stringify(pattern)}`);
                this.renderBrailleCells(pattern, container);
                
                // Send to hardware if callback provided
                if (sendCallback) {
                    await sendCallback(pattern);
                }
                
                await delay(800);
            }
        }
        
        // Clear at the end
        container.innerHTML = '';
    }

    /**
     * Clear cached database
     */
    clearCache() {
        try {
            localStorage.removeItem(this.cacheKey);
            console.log('Braille database cache cleared');
            return true;
        } catch (error) {
            console.error('Error clearing cache:', error);
            return false;
        }
    }

    /**
     * Find a word in the braille database
     * @param {string} word - Word to find
     * @returns {Object|null} - Matching entry or null if not found
     */
    findWordInDatabase(word) {
        if (!word || typeof word !== 'string') return null;
        
        const normalizedWord = word.toLowerCase().trim();
        
        // Check each language, starting with the current one
        const languages = [this.currentLanguage, ...Object.keys(this.brailleDatabase).filter(lang => lang !== this.currentLanguage)];
        
        for (const lang of languages) {
            if (this.brailleDatabase[lang] && this.brailleDatabase[lang][normalizedWord]) {
                // Return the entry with language information
                const entry = this.brailleDatabase[lang][normalizedWord];
                return {
                    word: normalizedWord,
                    shortf: entry.shortf,
                    braille: entry.braille,
                    array: entry.array,
                    lang: lang
                };
            }
        }
        
        return null;
    }

    /**
     * Filter words in the database based on a search term
     * @param {string} filterTerm - Term to search for within words
     * @param {number} limit - Maximum number of results to return
     * @returns {Array} - Array of matching entries
     */
    filterDatabase(filterTerm, limit = 20) {
        if (!filterTerm || typeof filterTerm !== 'string') return [];
        
        const normalizedTerm = filterTerm.toLowerCase().trim();
        const results = [];
        
        // Check each language for matching words
        for (const lang of this.languages) {
            if (!this.brailleDatabase[lang]) continue;
            
            // Find words that contain the filter term
            for (const word in this.brailleDatabase[lang]) {
                if (word.toLowerCase().includes(normalizedTerm)) {
                    results.push({
                        word: word,
                        lang: lang,
                        braille: this.brailleDatabase[lang][word].braille || '',
                        array: this.brailleDatabase[lang][word].array
                    });
                }
                
                // Limit the number of results
                if (results.length >= limit) break;
            }
            
            // Stop if we have enough results
            if (results.length >= limit) break;
        }
        
        return results;
    }

    /**
     * Display matching database entries in UI
     * @param {Array} entries - Array of matching database entries
     * @param {Element} container - Container to display results in
     * @returns {Element} The created results container
     */
    displayDatabaseResults(entries, container) {
        // Create results table
        const resultsTable = document.createElement('table');
        resultsTable.className = 'filter-results';
        
        // Add table header
        resultsTable.innerHTML = `
            <thead>
                <tr>
                    <th>Word</th>
                    <th>Language</th>
                    <th>Braille</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
            </tbody>
        `;
        
        // Add each result as a table row
        const tbody = resultsTable.querySelector('tbody');
        
        if (entries && entries.length > 0) {
            entries.forEach(entry => {
                const row = document.createElement('tr');
                
                row.innerHTML = `
                    <td>${entry.word}</td>
                    <td>${entry.lang || 'UEB'}</td>
                    <td>${entry.braille || ''}</td>
                    <td><button class="test-entry-btn" data-word="${entry.word}">Test</button></td>
                `;
                
                tbody.appendChild(row);
            });
        } else {
            // No results found
            const row = document.createElement('tr');
            row.innerHTML = `<td colspan="4" class="no-results">No matching entries found</td>`;
            tbody.appendChild(row);
        }
        
        // Append to container if provided
        if (container) {
            container.appendChild(resultsTable);
        }
        
        return resultsTable;
    }
    
}

// Create global instance
const brailleTranslation = new BrailleTranslation();
