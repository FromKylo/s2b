/**
 * Braille Translation Module
 * Handles loading and translating words to braille patterns
 */

class BrailleTranslator {
    constructor() {
        // Braille database
        this.database = [];
        this.databaseLoaded = false;
        this.databaseUrl = '../braille-database.csv';
        
        // Language support
        this.languages = ['en', 'es', 'fr']; // English, Spanish, French
        
        // Alphabet and numbers for testing
        this.alphabetAndNumbers = [];
        
        // Statistics
        this.stats = {
            totalWords: 0,
            matchedWords: 0,
            missedWords: 0
        };
        
        // Debug logging
        this.debug = {
            enabled: false,
            log: function(message) {
                if (this.enabled) {
                    console.log(`[Braille] ${message}`);
                }
            }
        };
        
        // Load database on initialization
        this.loadDatabase();
    }
    
    /**
     * Load the braille pattern database
     * @returns {Promise<boolean>} Promise resolving to load success
     */
    async loadDatabase() {
        try {
            this.debug.log('Loading braille database...');
            
            // Fetch the CSV file
            const response = await fetch(this.databaseUrl);
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            
            const csvText = await response.text();
            
            // Parse CSV
            this.database = this.parseCSV(csvText);
            
            // Mark as loaded
            this.databaseLoaded = true;
            
            // Create alphabet and numbers list for testing
            this.createAlphabetAndNumbersList();
            
            this.debug.log(`Database loaded: ${this.database.length} entries`);
            return true;
        } catch (error) {
            this.debug.log(`Error loading database: ${error.message}`);
            return false;
        }
    }
    
    /**
     * Parse CSV text into structured database
     * @param {string} csvText - The CSV text to parse
     * @returns {Array} Array of braille entries
     */
    parseCSV(csvText) {
        const entries = [];
        
        // Split into lines
        const lines = csvText.split(/\r?\n/);
        
        // Parse header
        const header = lines[0].split(',');
        
        // Process each line
        for (let i = 1; i < lines.length; i++) {
            // Skip empty lines
            if (!lines[i].trim()) continue;
            
            const fields = this.splitCSVLine(lines[i]);
            if (fields.length < 3) continue; // Skip invalid entries
            
            // Create entry object
            const entry = {
                word: fields[0].toLowerCase().trim(),
                language: fields[1].toLowerCase().trim(),
                array: this.parseBrailleArray(fields[2])
            };
            
            entries.push(entry);
        }
        
        return entries;
    }
    
    /**
     * Split CSV line handling quotes
     * @param {string} line - The CSV line to split
     * @returns {Array} Array of fields
     */
    splitCSVLine(line) {
        const fields = [];
        let currentField = "";
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                fields.push(currentField);
                currentField = "";
            } else {
                currentField += char;
            }
        }
        
        // Add the last field
        fields.push(currentField);
        
        return fields;
    }
    
    /**
     * Parse braille array from string representation
     * @param {string} arrayString - The string representation of the braille array
     * @returns {Array} Braille pattern array
     */
    parseBrailleArray(arrayString) {
        try {
            // Clean up the string and parse it
            const cleanedString = arrayString
                .replace(/'/g, '"') // Replace single quotes with double quotes
                .replace(/\(/g, '[') // Replace parentheses with square brackets
                .replace(/\)/g, ']');
            
            return JSON.parse(cleanedString);
        } catch (error) {
            this.debug.log(`Error parsing array: ${arrayString}`);
            return [];
        }
    }
    
    /**
     * Create list of alphabet and numbers for testing
     */
    createAlphabetAndNumbersList() {
        const alphabet = 'abcdefghijklmnopqrstuvwxyz'.split('');
        const numbers = '0123456789'.split('');
        
        // Get English alphabet and numbers
        this.alphabetAndNumbers = this.database.filter(entry =>
            entry.language === 'en' && 
            (alphabet.includes(entry.word) || numbers.includes(entry.word))
        ).sort((a, b) => {
            // Sort letters first, then numbers
            const isALetter = alphabet.includes(a.word);
            const isBLetter = alphabet.includes(b.word);
            
            if (isALetter && !isBLetter) return -1;
            if (!isALetter && isBLetter) return 1;
            
            return a.word.localeCompare(b.word);
        });
        
        this.debug.log(`Created alphabet and numbers list: ${this.alphabetAndNumbers.length} entries`);
    }
    
    /**
     * Check if the database is loaded
     * @returns {boolean} Whether database is loaded
     */
    isDatabaseLoaded() {
        return this.databaseLoaded;
    }
    
    /**
     * Get the number of entries in the database
     * @returns {number} Number of entries
     */
    getDatabaseSize() {
        return this.database.length;
    }
    
    /**
     * Find braille pattern for a word
     * @param {string} word - The word to translate
     * @param {string} preferredLanguage - The preferred language (optional)
     * @returns {object} Braille match object
     */
    findBraillePattern(word, preferredLanguage = 'en') {
        if (!this.databaseLoaded || !word) {
            return { word, found: false };
        }
        
        // Normalize input
        word = word.toLowerCase().trim();
        preferredLanguage = preferredLanguage.toLowerCase().trim();
        
        // Update statistics
        this.stats.totalWords++;
        
        // Try exact match in preferred language
        let match = this.database.find(entry => 
            entry.word === word && entry.language === preferredLanguage
        );
        
        // If not found, try exact match in any language
        if (!match) {
            match = this.database.find(entry => entry.word === word);
        }
        
        // If found, return the match
        if (match) {
            this.stats.matchedWords++;
            return { 
                word,
                found: true, 
                array: match.array,
                language: match.language
            };
        }
        
        // Not found
        this.stats.missedWords++;
        return { word, found: false };
    }
    
    /**
     * Translate a sentence to braille patterns
     * @param {string} sentence - The sentence to translate
     * @param {string} preferredLanguage - The preferred language (optional)
     * @returns {Array} Array of braille match objects
     */
    translateSentence(sentence, preferredLanguage = 'en') {
        if (!this.databaseLoaded || !sentence) {
            return [];
        }
        
        // Split the sentence into words
        const words = sentence.split(/\s+/)
            .filter(word => word.trim().length > 0)
            .map(word => word.toLowerCase().trim());
        
        // Translate each word
        const translations = words.map(word => 
            this.findBraillePattern(word, preferredLanguage)
        );
        
        return translations;
    }
    
    /**
     * Get statistics
     * @returns {object} Statistics object
     */
    getStatistics() {
        const matchRate = this.stats.totalWords > 0 
            ? (this.stats.matchedWords / this.stats.totalWords * 100).toFixed(2) 
            : 0;
        
        return {
            ...this.stats,
            matchRate: `${matchRate}%`
        };
    }
    
    /**
     * Get alphabet and numbers list
     * @returns {Array} Alphabet and numbers list
     */
    getAlphabetAndNumbers() {
        return this.alphabetAndNumbers;
    }
    
    /**
     * Reset statistics
     */
    resetStatistics() {
        this.stats = {
            totalWords: 0,
            matchedWords: 0,
            missedWords: 0
        };
    }
    
    /**
     * Get supported languages
     * @returns {Array} Array of supported languages
     */
    getSupportedLanguages() {
        return this.languages;
    }
    
    /**
     * Search database for partial matches
     * @param {string} query - The search query
     * @returns {Array} Array of matching entries
     */
    searchDatabase(query) {
        if (!this.databaseLoaded || !query) {
            return [];
        }
        
        query = query.toLowerCase().trim();
        
        return this.database
            .filter(entry => entry.word.includes(query))
            .sort((a, b) => a.word.localeCompare(b.word))
            .slice(0, 25); // Limit results
    }
}

// Create global instance
window.brailleTranslator = new BrailleTranslator();