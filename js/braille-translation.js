/**
 * Braille Translation Module
 * Handles loading the braille database and translating words to braille patterns
 */

class BrailleTranslation {
    constructor() {
        this.brailleDatabase = {};
        this.languages = ['UEB', 'Philippine'];
        this.currentLanguage = 'UEB';
    }

    /**
     * Initialize the braille database
     */
    async initialize() {
        try {
            // Try to load from CSV first
            const database = await this.loadFromCSV('braille-database.csv');
            this.brailleDatabase = database;
            console.log('Braille database loaded from CSV');
            return true;
        } catch (error) {
            console.error('Error loading braille database from CSV:', error);
            // Fallback to embedded data if necessary
            // Currently this is just a placeholder - in a real app you'd have
            // a fallback JSON embedded in the code
            return false;
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
            for (const char of word) {
                if (this.brailleDatabase[lang] && this.brailleDatabase[lang][char]) {
                    letterArrays.push(this.brailleDatabase[lang][char].array[0]);
                }
            }
            
            // Only return if we found patterns for all characters
            if (letterArrays.length === word.length) {
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
        // Clear the container
        container.innerHTML = '';
        
        if (!pattern) return;
        
        // Check if it's a nested array (multiple cells)
        const isNestedArray = Array.isArray(pattern[0]);
        
        if (isNestedArray) {
            // Render each cell
            pattern.forEach(cellPattern => {
                const cellElement = this.createBrailleCellHTML(cellPattern);
                container.appendChild(cellElement);
            });
        } else {
            // Single cell
            const cellElement = this.createBrailleCellHTML(pattern);
            container.appendChild(cellElement);
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
}

// Create global instance
const brailleTranslation = new BrailleTranslation();
