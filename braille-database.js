/**
 * Braille Database Handler
 */
class BrailleDatabase {
    constructor() {
        this.database = [];
        this.loaded = false;
    }

    async loadDatabase() {
        try {
            const response = await fetch('braille-database.csv');
            const csvData = await response.text();
            
            // Parse CSV data (skip the header)
            const lines = csvData.split('\n');
            if (lines.length > 0) {
                // Skip header and empty lines
                for (let i = 1; i < lines.length; i++) {
                    const line = lines[i].trim();
                    if (line) {
                        const [word, shortf, braille, array, lang] = line.split(',');
                        
                        // Clean up the array field by removing quotes
                        const cleanArray = array.replace(/"/g, '').trim();
                        
                        this.database.push({
                            word: word.trim(),
                            shortf: shortf.trim(),
                            braille: braille.trim(),
                            array: this.parseArrayString(cleanArray),
                            lang: lang.trim()
                        });
                    }
                }
                this.loaded = true;
                console.log(`Loaded ${this.database.length} braille entries`);
                return true;
            }
        } catch (error) {
            console.error('Error loading braille database:', error);
            return false;
        }
    }

    parseArrayString(arrayStr) {
        try {
            // Handle nested arrays like {{1,2},{3,4}}
            if (arrayStr.startsWith('{{')) {
                const cellsStr = arrayStr.slice(2, -2).split('},{');
                return cellsStr.map(cell => 
                    cell.split(',').map(num => parseInt(num, 10))
                );
            } 
            // Handle single arrays like {1,2,3}
            else if (arrayStr.startsWith('{')) {
                const numsStr = arrayStr.slice(1, -1).split(',');
                return numsStr.map(num => parseInt(num, 10));
            }
            return null;
        } catch (e) {
            console.error('Error parsing array string:', e);
            return null;
        }
    }

    findWord(word) {
        const normalizedWord = word.toLowerCase().trim();
        return this.database.find(entry => entry.word.toLowerCase() === normalizedWord);
    }

    searchWords(text) {
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
