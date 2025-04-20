/**
 * Braille Translation Module
 * Handles loading and translation of words to braille patterns
 */
class BrailleTranslator {
    constructor() {
        this.database = {};
        this.currentLanguage = 'UEB';
        this.isLoaded = false;
        this.loadAttempted = false;
        this.totalEntries = 0;
    }

    /**
     * Initialize the braille database from CSV
     */
    async initialize() {
        try {
            logDebug('Attempting to load braille database...');
            
            // First try CSV
            const success = await this.loadFromCSV();
            
            if (!success) {
                logDebug('CSV loading failed, trying JSON fallback...');
                // Try JSON fallback
                return await this.loadFromJSON();
            }
            
            return true;
        } catch (error) {
            logDebug('Error initializing braille database: ' + error.message);
            console.error('Database initialization error:', error);
            return false;
        }
    }
    
    /**
     * Load the database from CSV file
     */
    async loadFromCSV() {
        try {
            const response = await fetch('./braille-database.csv');
            
            if (!response.ok) {
                logDebug(`Failed to load CSV file: ${response.status} ${response.statusText}`);
                return false;
            }
            
            const csvText = await response.text();
            
            if (!csvText || csvText.trim().length === 0) {
                logDebug('CSV file is empty');
                return false;
            }
            
            logDebug(`CSV loaded: ${csvText.length} bytes, parsing...`);
            
            // Show the first 100 characters to check format
            logDebug(`CSV preview: ${csvText.substring(0, 100)}...`);
            
            this.parseCSV(csvText);
            
            // Validate loaded data
            this.validateDatabase();
            
            return this.isLoaded;
        } catch (error) {
            logDebug('Error loading CSV: ' + error.message);
            console.error('CSV loading error:', error);
            return false;
        }
    }
    
    /**
     * Load the database from JSON fallback
     */
    async loadFromJSON() {
        try {
            const response = await fetch('./braille-data.json');
            
            if (!response.ok) {
                logDebug(`Failed to load JSON file: ${response.status} ${response.statusText}`);
                return false;
            }
            
            const json = await response.json();
            
            if (!json || !Array.isArray(json)) {
                logDebug('Invalid JSON format');
                return false;
            }
            
            logDebug(`JSON loaded with ${json.length} entries, parsing...`);
            
            // Convert JSON format to our database format
            this.database = { 'UEB': {}, 'Philippine': {} };
            
            for (const entry of json) {
                if (!entry.word || !entry.array) continue;
                
                const language = entry.lang || 'UEB';
                
                if (!this.database[language]) {
                    this.database[language] = {};
                }
                
                // Format array as string if it's an actual array
                const arrayStr = Array.isArray(entry.array) ? 
                    JSON.stringify(entry.array) : 
                    entry.array;
                
                // For backward compatibility, wrap single cell arrays in an extra array
                let finalArrayStr = arrayStr;
                if (arrayStr.startsWith('[') && !arrayStr.startsWith('[[')) {
                    finalArrayStr = `[${arrayStr}]`;
                }
                
                this.database[language][entry.word] = {
                    braille: entry.braille || '',
                    array: finalArrayStr
                };
                
                this.totalEntries++;
            }
            
            this.isLoaded = this.totalEntries > 0;
            this.loadAttempted = true;
            
            logDebug(`JSON loaded successfully with ${this.totalEntries} entries`);
            return this.isLoaded;
        } catch (error) {
            logDebug('Error loading JSON: ' + error.message);
            console.error('JSON loading error:', error);
            return false;
        }
    }

    /**
     * Parse CSV data into a structured database
     */
    parseCSV(csvText) {
        try {
            const lines = csvText.split('\n');
            logDebug(`CSV contains ${lines.length} lines`);
            
            if (lines.length < 2) {
                logDebug('CSV has too few lines');
                return false;
            }
            
            // Initialize database
            this.database = {};
            this.totalEntries = 0;
            
            // Get header to determine column positions
            const header = lines[0].toLowerCase().split(',');
            const wordIdx = header.indexOf('word');
            const shortfIdx = header.indexOf('shortf');
            const brailleIdx = header.indexOf('braille');
            const arrayIdx = header.indexOf('array');
            const langIdx = header.indexOf('lang');
            
            if (wordIdx === -1 || arrayIdx === -1) {
                logDebug('CSV is missing required columns: word or array');
                return false;
            }
            
            // Skip header row
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;
                
                // Handle potential quoted fields properly
                const fields = this.parseCSVLine(line);
                
                if (fields.length <= Math.max(wordIdx, arrayIdx, langIdx)) {
                    continue; // Skip invalid lines
                }
                
                const word = fields[wordIdx].trim();
                const shortf = shortfIdx >= 0 && fields[shortfIdx] ? fields[shortfIdx].trim() : '';
                const braille = brailleIdx >= 0 && fields[brailleIdx] ? fields[brailleIdx].trim() : '';
                let array = arrayIdx >= 0 ? fields[arrayIdx].trim() : '';
                const lang = langIdx >= 0 && fields[langIdx] ? fields[langIdx].trim() : 'UEB';
                
                if (!word || !array) continue;
                
                // Remove surrounding quotes from array if present
                if (array.startsWith('"') && array.endsWith('"')) {
                    array = array.substring(1, array.length - 1);
                }
                
                // Initialize language object if not exists
                if (!this.database[lang]) {
                    this.database[lang] = {};
                }
                
                // Store both the word and its shortform if different
                this.database[lang][word] = {
                    braille: braille,
                    array: array
                };
                
                this.totalEntries++;
                
                if (shortf && shortf !== word) {
                    this.database[lang][shortf] = {
                        braille: braille,
                        array: array
                    };
                    this.totalEntries++;
                }
            }
            
            this.isLoaded = this.totalEntries > 0;
            this.loadAttempted = true;
            
            logDebug(`CSV parsing complete. Loaded ${this.totalEntries} entries across ${Object.keys(this.database).length} languages`);
            
            return true;
        } catch (error) {
            logDebug(`Error parsing CSV: ${error.message}`);
            console.error('CSV parsing error:', error);
            return false;
        }
    }
    
    /**
     * Parse a CSV line properly handling quoted fields
     */
    parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                // Toggle quote mode
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                // End of field
                result.push(current);
                current = '';
            } else {
                current += char;
            }
        }
        
        // Don't forget the last field
        result.push(current);
        
        // Clean up any remaining quotes
        return result.map(field => field.replace(/"/g, '').trim());
    }
    
    /**
     * Validate the loaded database and log statistics
     */
    validateDatabase() {
        if (!this.database) {
            logDebug('Database is null or undefined');
            this.isLoaded = false;
            return;
        }
        
        const languages = Object.keys(this.database);
        logDebug(`Database contains ${languages.length} languages: ${languages.join(', ')}`);
        
        let totalEntries = 0;
        for (const lang of languages) {
            const entries = Object.keys(this.database[lang]).length;
            totalEntries += entries;
            logDebug(`Language "${lang}" has ${entries} entries`);
            
            // Log a few sample entries
            const samples = Object.keys(this.database[lang]).slice(0, 3);
            for (const word of samples) {
                const entry = this.database[lang][word];
                logDebug(`Sample "${word}": array=${entry.array}, braille=${entry.braille}`);
            }
        }
        
        this.totalEntries = totalEntries;
        this.isLoaded = totalEntries > 0;
        logDebug(`Database validation complete: ${totalEntries} total entries, isLoaded=${this.isLoaded}`);
    }

    /**
     * Set the active language for translation
     */
    setLanguage(language) {
        if (this.database[language]) {
            this.currentLanguage = language;
            logDebug(`Language set to ${language}`);
            return true;
        }
        logDebug(`Language ${language} not available`);
        return false;
    }

    /**
     * Translate a word to braille pattern array
     */
    translateWord(word) {
        word = word.toLowerCase().trim();
        
        if (!this.isLoaded) {
            logDebug('Database not loaded yet');
            return null;
        }
        
        // Check if word exists in current language
        if (this.database[this.currentLanguage][word]) {
            return {
                word: word,
                array: this.database[this.currentLanguage][word].array,
                braille: this.database[this.currentLanguage][word].braille
            };
        }
        
        // Check if word exists in UEB as fallback
        if (this.currentLanguage !== 'UEB' && this.database['UEB'][word]) {
            return {
                word: word,
                array: this.database['UEB'][word].array,
                braille: this.database['UEB'][word].braille
            };
        }
        
        logDebug(`Word "${word}" not found in database`);
        return null;
    }
    
    /**
     * Split a sentence into individual words and translate each
     */
    translateSentence(sentence) {
        const words = sentence.toLowerCase().split(/\s+/);
        const translations = [];
        
        for (const word of words) {
            if (word.length > 0) {
                const cleanWord = word.replace(/[^\w]/g, '');
                const translation = this.translateWord(cleanWord);
                if (translation) {
                    translations.push(translation);
                }
            }
        }
        
        return translations;
    }
}

/**
 * Create and render visual braille cells
 */
class BrailleCellRenderer {
    constructor(container) {
        this.container = container;
    }
    
    /**
     * Clear all cells from container
     */
    clear() {
        this.container.innerHTML = '';
    }
    
    /**
     * Render an array of braille cells
     * @param {string} arrayStr - JSON array string like '[[1,2],[3,4]]'
     */
    renderBrailleCells(arrayStr) {
        this.clear();
        
        try {
            // Parse array string to actual array
            let cellsArray;
            try {
                cellsArray = JSON.parse(arrayStr);
            } catch (e) {
                // If parsing fails, try to fix common issues
                const fixedStr = this.fixArrayString(arrayStr);
                cellsArray = JSON.parse(fixedStr);
            }
            
            // Handle flat array vs nested array
            if (!Array.isArray(cellsArray[0])) {
                // Convert flat array to nested array with one cell
                cellsArray = [cellsArray];
            }
            
            // Create each braille cell
            cellsArray.forEach(dots => {
                const cell = document.createElement('div');
                cell.className = 'braille-cell';
                
                // Create 6 dots in each cell
                for (let i = 1; i <= 6; i++) {
                    const dot = document.createElement('div');
                    dot.className = 'braille-dot';
                    dot.dataset.position = i;
                    
                    // Check if this dot should be active
                    if (dots.includes(i)) {
                        dot.classList.add('active');
                    }
                    
                    cell.appendChild(dot);
                }
                
                this.container.appendChild(cell);
            });
            
            return true;
        } catch (error) {
            logDebug('Error rendering braille cells: ' + error.message);
            return false;
        }
    }
    
    /**
     * Fix common issues with array strings
     */
    fixArrayString(arrayStr) {
        // Remove any comments or filepath markers
        arrayStr = arrayStr.replace(/\/\/.*$/gm, '');
        
        // Ensure it starts and ends with brackets
        if (!arrayStr.trim().startsWith('[')) {
            arrayStr = '[' + arrayStr;
        }
        if (!arrayStr.trim().endsWith(']')) {
            arrayStr = arrayStr + ']';
        }
        
        return arrayStr;
    }
    
    /**
     * Render alphabet test pattern (for testing purposes)
     */
    renderAlphabetTest() {
        const alphabet = 'abcdefghijklmnopqrstuvwxyz'.split('');
        let index = 0;
        
        const testInterval = setInterval(() => {
            if (index >= alphabet.length) {
                clearInterval(testInterval);
                return;
            }
            
            const letter = alphabet[index];
            document.getElementById('recognized-word').textContent = letter;
            
            // Get the pattern for this letter
            const brailleTranslator = window.brailleTranslator;
            const translation = brailleTranslator.translateWord(letter);
            
            if (translation) {
                this.renderBrailleCells(translation.array);
                if (window.bleConnection && window.bleConnection.isConnected()) {
                    window.bleConnection.sendBraillePattern(translation.array);
                }
            }
            
            index++;
        }, 1000);
    }
}

/**
 * Debug logging utility
 */
function logDebug(message) {
    const debugOutput = document.getElementById('debug-output');
    if (debugOutput) {
        const timestamp = new Date().toLocaleTimeString();
        debugOutput.innerHTML += `[${timestamp}] ${message}\n`;
        debugOutput.scrollTop = debugOutput.scrollHeight;
    }
    console.log(message);
}

// Initialize global instances
window.brailleTranslator = new BrailleTranslator();
