class BrailleTranslator {
    constructor() {
        this.database = {};
        this.currentLanguage = 'UEB'; // Default language
        this.loadingPromise = null;
    }

    async init() {
        if (!this.loadingPromise) {
            this.loadingPromise = this.loadDatabase();
        }
        return this.loadingPromise;
    }

    async loadDatabase() {
        try {
            // Try to load from CSV first
            const csvResponse = await fetch('braille-database.csv');
            if (csvResponse.ok) {
                const csvText = await csvResponse.text();
                this.parseCSV(csvText);
                console.log('Braille database loaded from CSV');
                return;
            }
        } catch (error) {
            console.warn('Failed to load CSV, trying JSON fallback', error);
        }

        try {
            // Fall back to JSON
            const jsonResponse = await fetch('braille-database.json');
            if (jsonResponse.ok) {
                this.database = await jsonResponse.json();
                console.log('Braille database loaded from JSON');
                return;
            }
        } catch (error) {
            console.error('Failed to load braille database', error);
            throw new Error('Could not load braille database');
        }
    }

    parseCSV(csvText) {
        const lines = csvText.split('\n');
        const header = lines[0].split(',');
        const languageIndex = {
            'UEB': header.indexOf('UEB'),
            'Philippine': header.indexOf('Philippine')
        };

        this.database = {
            UEB: {},
            Philippine: {}
        };

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            const columns = line.split(',');
            const word = columns[0].toLowerCase();
            
            for (const lang in languageIndex) {
                const idx = languageIndex[lang];
                if (idx >= 0 && columns[idx]) {
                    try {
                        const dotPattern = JSON.parse(columns[idx]);
                        this.database[lang][word] = dotPattern;
                    } catch (e) {
                        console.error(`Error parsing braille pattern for ${word} in ${lang}`, e);
                    }
                }
            }
        }
    }

    setLanguage(language) {
        if (this.database[language]) {
            this.currentLanguage = language;
            return true;
        }
        return false;
    }

    translateWord(word) {
        if (!word) return null;
        
        // Normalize the word
        const normalizedWord = word.toLowerCase().trim();
        
        // Check if we have a direct translation for the word
        if (this.database[this.currentLanguage][normalizedWord]) {
            return {
                text: word,
                pattern: this.database[this.currentLanguage][normalizedWord],
                language: this.currentLanguage
            };
        }
        
        // If no direct match, try to translate character by character
        const charPatterns = [];
        for (let i = 0; i < normalizedWord.length; i++) {
            const char = normalizedWord[i];
            if (this.database[this.currentLanguage][char]) {
                charPatterns.push(this.database[this.currentLanguage][char]);
            } else {
                // Skip unknown characters or use a placeholder
                console.warn(`Character '${char}' not found in braille database`);
            }
        }
        
        if (charPatterns.length > 0) {
            return {
                text: word,
                pattern: charPatterns,
                language: this.currentLanguage
            };
        }
        
        return null;
    }
    
    // Utility to convert pattern to Unicode braille
    patternToUnicode(pattern) {
        if (!pattern || pattern.length === 0) return '';
        
        // Braille Unicode starts at U+2800
        const brailleChars = [];
        
        for (const cell of pattern) {
            let code = 0x2800;
            for (const dot of cell) {
                // Map dot numbers (1-6) to bit positions
                switch (dot) {
                    case 1: code += 0x01; break;
                    case 2: code += 0x02; break;
                    case 3: code += 0x04; break;
                    case 4: code += 0x08; break;
                    case 5: code += 0x10; break;
                    case 6: code += 0x20; break;
                }
            }
            brailleChars.push(String.fromCodePoint(code));
        }
        
        return brailleChars.join('');
    }
}

// Create and export a singleton instance
const brailleTranslator = new BrailleTranslator();
