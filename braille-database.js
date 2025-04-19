/**
 * Braille Database Handler
 * 
 * Manages loading, parsing, and searching braille patterns from a CSV database.
 * Supports both single-cell and multi-cell braille patterns in UEB and Philippine formats.
 */
class BrailleDatabase {
    /**
     * Initialize an empty braille database
     */
    constructor() {
        this.database = [];
        this.loaded = false;
        this.wordMap = new Map(); // For faster word lookup
    }

    /**
     * Load and parse the braille database from CSV file
     * @returns {Promise<boolean>} True if database was loaded successfully
     */
    async loadDatabase() {
        try {
            // Fetch the CSV file
            const response = await fetch('braille-database.csv');
            
            // Check if the fetch was successful
            if (!response.ok) {
                throw new Error(`Failed to load database: ${response.status} ${response.statusText}`);
            }
            
            const csvData = await response.text();
            
            // Parse CSV data (skip the header)
            const lines = csvData.split('\n');
            if (lines.length > 0) {
                // Skip header and empty lines
                for (let i = 1; i < lines.length; i++) {
                    const line = lines[i].trim();
                    if (line) {
                        try {
                            // Split by comma but handle quoted fields properly
                            const [word, shortf, braille, array, lang] = line.split(',');
                            
                            if (!word || !array) continue; // Skip invalid entries
                            
                            // Clean up the array field by removing quotes
                            const cleanArray = array.replace(/"/g, '').trim();
                            
                            const entry = {
                                word: word.trim(),
                                shortf: shortf ? shortf.trim() : '',
                                braille: braille ? braille.trim() : '',
                                array: this.parseArrayString(cleanArray),
                                lang: lang ? lang.trim() : 'UEB' // Default to UEB if not specified
                            };
                            
                            // Only add valid entries with valid arrays
                            if (entry.array !== null) {
                                this.database.push(entry);
                                
                                // Also add to the word map for faster lookups
                                this.wordMap.set(entry.word.toLowerCase(), entry);
                            }
                        } catch (lineError) {
                            console.warn(`Error parsing line ${i}: ${line}`, lineError);
                            // Continue with next line instead of aborting the whole load
                        }
                    }
                }
                this.loaded = true;
                console.log(`Loaded ${this.database.length} braille entries`);
                return true;
            }
            
            return false;
        } catch (error) {
            console.error('Error loading braille database:', error);
            return false;
        }
    }

    /**
     * Parse a string representation of a braille dot array into actual arrays
     * @param {string} arrayStr - String representation of braille dot array 
     * @returns {Array|null} - Parsed array or null if invalid
     */
    parseArrayString(arrayStr) {
        if (!arrayStr) return null;
        
        try {
            // Handle nested arrays like {{1,2},{3,4}}
            if (arrayStr.startsWith('{{')) {
                const cellsStr = arrayStr.slice(2, -2).split('},{');
                return cellsStr.map(cell => 
                    cell.split(',')
                        .filter(num => num.trim() !== '') // Filter out empty entries
                        .map(num => {
                            const parsed = parseInt(num, 10);
                            return isNaN(parsed) ? null : parsed;
                        })
                        .filter(num => num !== null) // Remove invalid numbers
                );
            } 
            // Handle single arrays like {1,2,3}
            else if (arrayStr.startsWith('{')) {
                const numsStr = arrayStr.slice(1, -1).split(',');
                return numsStr
                    .filter(num => num.trim() !== '') // Filter out empty entries
                    .map(num => {
                        const parsed = parseInt(num, 10);
                        return isNaN(parsed) ? null : parsed;
                    })
                    .filter(num => num !== null); // Remove invalid numbers
            }
            return null;
        } catch (e) {
            console.error('Error parsing array string:', e, arrayStr);
            return null;
        }
    }

    /**
     * Find a braille entry by exact word match
     * @param {string} word - Word to find
     * @returns {Object|null} - Matching entry or null if not found
     */
    findWord(word) {
        if (!word || typeof word !== 'string') return null;
        
        const normalizedWord = word.toLowerCase().trim();
        
        // Use the map for faster lookup
        if (this.wordMap.has(normalizedWord)) {
            return this.wordMap.get(normalizedWord);
        }
        
        // Fallback to array search if not in map
        return this.database.find(entry => entry.word.toLowerCase() === normalizedWord);
    }

    /**
     * Search for braille patterns matching words in a text
     * @param {string} text - Text containing words to search for
     * @returns {Array} - Array of matching braille entries
     */
    searchWords(text) {
        if (!text || typeof text !== 'string') return [];
        
        const words = text.toLowerCase().split(/\s+/);
        const results = [];

        for (const word of words) {
            if (word) {
                const match = this.findWord(word);
                if (match) {
                    results.push(match);
                }
            }
        }

        return results;
    }
}

// Create global instance
const brailleDB = new BrailleDatabase();
