/**
 * Braille Translation Module
 * Handles loading and translation of words to braille patterns
 */
class BrailleTranslator {
    constructor() {
        this.database = {};
        this.currentLanguage = 'UEB';
        this.isLoaded = false;
    }

    /**
     * Initialize the braille database from CSV
     */
    async initialize() {
        try {
            const response = await fetch('braille-database.csv');
            if (!response.ok) throw new Error('Failed to load braille database');
            
            const csvText = await response.text();
            this.parseCSV(csvText);
            this.isLoaded = true;
            logDebug('Braille database loaded successfully');
            return true;
        } catch (error) {
            logDebug('Error loading braille database: ' + error.message);
            return false;
        }
    }

    /**
     * Parse CSV data into a structured database
     */
    parseCSV(csvText) {
        const lines = csvText.split('\n');
        // Skip header row
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line) {
                const [word, shortf, braille, arrayStr, lang] = line.split(',');
                
                if (!this.database[lang]) {
                    this.database[lang] = {};
                }
                
                // Remove quotes if present
                let cleanArray = arrayStr.replace(/"/g, '');
                
                // Store both the word and its shortform if different
                this.database[lang][word] = {
                    braille: braille,
                    array: cleanArray
                };
                
                if (shortf && shortf !== word) {
                    this.database[lang][shortf] = {
                        braille: braille,
                        array: cleanArray
                    };
                }
            }
        }
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
