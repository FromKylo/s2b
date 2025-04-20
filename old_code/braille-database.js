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
                            // Properly parse CSV with quoted fields
                            const fields = this.parseCSVLine(line);
                            if (fields.length < 4) continue; // Skip invalid entries
                            
                            const [word, shortf, braille, array, lang] = fields;
                            
                            if (!word || !array) continue; // Skip entries without word or array
                            
                            // Clean up the array field
                            const cleanArray = array.trim();
                            
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
                            } else {
                                console.warn(`Skipped entry with invalid array format: ${word}, array: ${array}`);
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
     * Parse a CSV line properly handling quoted fields
     * @param {string} line - A line from the CSV file
     * @returns {Array} - Array of field values
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
     * Parse a string representation of a braille dot array into actual arrays
     * @param {string} arrayStr - String representation of braille dot array 
     * @returns {Array|null} - Parsed array or null if invalid
     */
    parseArrayString(arrayStr) {
        if (!arrayStr) return null;
        
        try {
            // Clean and fix common formatting issues in array strings
            let cleanArrayStr = arrayStr.trim();
            
            // Remove any extra quotes that might have been missed
            cleanArrayStr = cleanArrayStr.replace(/^"|"$/g, '');
            
            // Fix incomplete arrays like [[1 -> [[1]]
            if (/\[\[\d+(?:,\d+)*$/.test(cleanArrayStr)) {
                cleanArrayStr += ']]';
            }
            // Fix incomplete arrays like [[1] -> [[1]]
            else if (/\[\[\d+(?:,\d+)*\]$/.test(cleanArrayStr)) {
                cleanArrayStr += ']';
            }
            
            // Handle single values that should be in nested array format
            if (/^\[\d+(?:,\d+)*\]$/.test(cleanArrayStr)) {
                // Convert [1,2,3] to [[1,2,3]]
                cleanArrayStr = '[' + cleanArrayStr + ']';
            }
            
            // Handle plain number arrays without brackets
            if (/^\d+(?:,\d+)*$/.test(cleanArrayStr)) {
                cleanArrayStr = '[[' + cleanArrayStr + ']]';
            }
            
            // Parse JSON - all arrays now use the same double-nested format:
            // [[1,2,3]] for single cell and [[1,2],[3,4]] for multi-cell
            const parsed = JSON.parse(cleanArrayStr);
            
            // Validate the array structure
            if (!Array.isArray(parsed) || parsed.length === 0) {
                return null;
            }
            
            // Ensure we have a properly nested array structure
            if (!Array.isArray(parsed[0])) {
                return [parsed]; // Wrap in an extra array
            }
            
            return parsed;
        } catch (e) {
            // More detailed error logging to debug console
            console.warn('Error parsing array string:', arrayStr, e.message);
            
            // Try to salvage simple digit arrays
            if (/^\d+$/.test(arrayStr)) {
                const num = parseInt(arrayStr, 10);
                return [[num]]; // Return in proper nested format
            }
            
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
     * @returns {Array} - Array of matching braille entries or null for words not found
     */
    searchWords(text) {
        if (!text || typeof text !== 'string') return [];
        
        const words = text.toLowerCase().split(/\s+/);
        const results = [];

        for (const word of words) {
            if (word) {
                const match = this.findWord(word);
                // Add the match if found, or add a null entry to indicate word wasn't found
                results.push(match || { word: word, found: false });
            }
        }

        return results;
    }
}

// Create global instance
const brailleDB = new BrailleDatabase();
