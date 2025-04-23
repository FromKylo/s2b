/**
 * Braille Translation Module
 * Handles loading the braille database and translating words to braille patterns
 */

class BrailleTranslation {
    constructor() {
        this.brailleDatabase = {};
        this.languages = ['UEB', 'Philippine'];
        this.currentLanguage = 'UEB';
        this.cacheKey = 'brailleDatabase_cache';
    }

    /**
     * Initialize the braille database
     */
    async initialize() {
        try {
            // Load from embedded CSV
            this.loadFromEmbeddedCSV();
            console.log('Braille database loaded from embedded CSV');
            return true;
        } catch (error) {
            console.error('Error loading braille database:', error);
            return false;
        }
    }

    /**
     * Load braille database from embedded CSV
     */
    loadFromEmbeddedCSV() {
        const embeddedCSV = `word,shortf,braille,array,lang
a,a,⠁,"[[1]]",UEB
b,b,⠃,"[[1,2]]",UEB
c,c,⠉,"[[1,4]]",UEB
d,d,⠙,"[[1,4,5]]",UEB
e,e,⠑,"[[1,5]]",UEB
f,f,⠋,"[[1,2,4]]",UEB
g,g,⠛,"[[1,2,4,5]]",UEB
h,h,⠓,"[[1,2,5]]",UEB
i,i,⠊,"[[2,4]]",UEB
j,j,⠚,"[[2,4,5]]",UEB
k,k,⠅,"[[1,3]]",UEB
l,l,⠇,"[[1,2,3]]",UEB
m,m,⠍,"[[1,3,4]]",UEB
n,n,⠝,"[[1,3,4,5]]",UEB
o,o,⠕,"[[1,3,5]]",UEB
p,p,⠏,"[[1,2,3,4]]",UEB
q,q,⠟,"[[1,2,3,4,5]]",UEB
r,r,⠗,"[[1,2,3,5]]",UEB
s,s,⠎,"[[2,3,4]]",UEB
t,t,⠞,"[[2,3,4,5]]",UEB
u,u,⠥,"[[1,3,6]]",UEB
v,v,⠧,"[[1,2,3,6]]",UEB
w,w,⠺,"[[2,4,5,6]]",UEB
x,x,⠭,"[[1,3,4,6]]",UEB
y,y,⠽,"[[1,3,4,5,6]]",UEB
z,z,⠵,"[[1,3,5,6]]",UEB
and,and,⠯,"[[1,2,3,4,6]]",UEB
the,the,⠮,"[[2,3,4,6]]",UEB
for,for,⠿,"[[1,2,3,4,5,6]]",UEB
with,with,⠾,"[[2,3,4,5,6]]",UEB
about,ab,⠁⠃,"[[1],[1,2]]",UEB
after,af,⠁⠋,"[[1],[1,2,4]]",UEB
been,bn,⠃⠝,"[[1,2],[1,3,4,5]]",UEB
beyond,bd,⠃⠙,"[[1,2],[1,4,5]]",UEB
before,bo,⠃⠕,"[[1,2],[1,3,5]]",UEB
children,cr,⠉⠗,"[[1,4],[1,2,3,5]]",UEB
done,dn,⠙⠝,"[[1,4,5],[1,3,4,5]]",UEB
friend,fr,⠋⠗,"[[1,2,4],[1,2,3,5]]",UEB
final,fn,⠋⠝,"[[1,2,4],[1,3,4,5]]",UEB
great,gr,⠛⠗,"[[1,2,4,5],[1,2,3,5]]",UEB
had,hd,⠓⠙,"[[1,2,5],[1,4,5]]",UEB
hand,ha,⠓⠁,"[[1,2,5],[1]]",UEB
man,mn,⠍⠝,"[[1,3,4],[1,3,4,5]]",UEB
character,5 16,⠐⠡,"[[5],[1,6]]",UEB
some,5 234,⠐⠎,"[[5],[2,3,4]]",UEB
where,5 156,⠐⠱,"[[5],[1,5,6]]",UEB
there,5 2346,⠐⠮,"[[5],[2,3,4,6]]",UEB
through,5 1456,⠐⠹,"[[5],[1,4,5,6]]",UEB
father,5 124,⠐⠋,"[[5],[1,2,4]]",UEB
day,5 145,⠐⠙,"[[5],[1,4,5]]",UEB
know,5 134,⠐⠅,"[[5],[1,3]]",UEB
here,5 125,⠐⠓,"[[5],[1,2,5]]",UEB
young,5 13456,⠐⠽,"[[5],[1,3,4,5,6]]",UEB
of,12356,⠷,"[[1,2,3,5,6]]",UEB
child,16,⠡,"[[1,6]]",UEB
rather,1235,⠗,"[[1,2,3,5]]",UEB
this,1456,⠹,"[[1,4,5,6]]",UEB
which,156,⠱,"[[1,5,6]]",UEB
out,1256,⠳,"[[1,2,5,6]]",UEB
people,1234,⠏,"[[1,2,3,4]]",UEB
about,1,⠁,"[[1]]",UEB
not,1345,⠝,"[[1,3,4,5]]",UEB
you,13456,⠽,"[[1,3,4,5,6]]",UEB
it,1346,⠭,"[[1,3,4,6]]",UEB
will,2456,⠺,"[[2,4,5,6]]",UEB
very,1236,⠧,"[[1,2,3,6]]",UEB
so,234,⠎,"[[2,3,4]]",UEB
quite,12345,⠟,"[[1,2,3,4,5]]",UEB
like,123,⠇,"[[1,2,3]]",UEB
more,mo,⠍⠕,"[[1,3,4],[1,3,5]]",UEB
place,pl,⠏⠇,"[[1,2,3,4],[1,2,3]]",UEB
receive,rc,⠗⠉,"[[1,2,3,5],[1,4]]",UEB
right,rt,⠗⠞,"[[1,2,3,5],[2,3,4,5]]",UEB
time,tm,⠞⠍,"[[2,3,4,5],[1,3,4]]",UEB
under,un,⠥⠝,"[[1,3,6],[1,3,4,5]]",UEB
work,wr,⠺⠗,"[[2,4,5,6],[1,2,3,5]]",UEB
your,yr,⠽⠗,"[[1,3,4,5,6],[1,2,3,5]]",UEB
according,ac,⠁⠉,"[[1],[1,4]]",UEB
again,ag,⠁⠛,"[[1],[1,2,4,5]]",UEB
also,al,⠁⠇,"[[1],[1,2,3]]",UEB
because,bc,⠃⠉,"[[1,2],[1,4]]",UEB
behind,bh,⠃⠓,"[[1,2],[1,2,5]]",UEB
below,bl,⠃⠇,"[[1,2],[1,2,3]]",UEB
beside,bs,⠃⠎,"[[1,2],[2,3,4]]",UEB
between,bt,⠃⠞,"[[1,2],[2,3,4,5]]",UEB
beyond,by,⠃⠽,"[[1,2],[1,3,4,5,6]]",UEB
could,cd,⠉⠙,"[[1,4],[1,4,5]]",UEB
day,dy,⠙⠽,"[[1,4,5],[1,3,4,5,6]]",UEB
declare,dc,⠙⠉,"[[1,4,5],[1,4]]",UEB
either,ei,⠑⠊,"[[1,5],[2,4]]",UEB
good,gd,⠛⠙,"[[1,2,4,5],[1,4,5]]",UEB
herself,hf,⠓⠋,"[[1,2,5],[1,2,4]]",UEB
himself,hm,⠓⠍,"[[1,2,5],[1,3,4]]",UEB
its,it,⠊⠞,"[[2,4],[2,3,4,5]]",UEB
much,mh,⠍⠓,"[[1,3,4],[1,2,5]]",UEB
myself,mf,⠍⠋,"[[1,3,4],[1,2,4]]",UEB
ng,ng,⠝⠛,"[[1,3,4,5],[1,2,4,5]]",Philippine
bakit,b,⠃,"[[1,2]]",Philippine
kanya/kaniya,c,⠉,"[[1,4]]",Philippine
dahil,d,⠙,"[[1,4,5]]",Philippine
paano,f,⠋,"[[1,2,4]]",Philippine
ganoon,g,⠛,"[[1,2,4,5]]",Philippine
ganon,g,⠛,"[[1,2,4,5]]",Philippine
hindi,h,⠓,"[[1,2,5]]",Philippine
ikaw,i,⠊,"[[2,4]]",Philippine
hakbang,j,⠚,"[[2,4,5]]",Philippine
kaya,k,⠅,"[[1,3]]",Philippine
lamang,l,⠇,"[[1,2,3]]",Philippine
mga,m,⠍,"[[1,3,4]]",Philippine
ngayon,n,⠝,"[[1,3,4,5]]",Philippine
para,p,⠏,"[[1,2,3,4]]",Philippine
kailan,q,⠟,"[[1,2,3,4,5]]",Philippine
rin,r,⠗,"[[1,2,3,5]]",Philippine
sang-ayon,s,⠎,"[[2,3,4]]",Philippine
tayo,t,⠞,"[[2,3,4,5]]",Philippine
upang,u,⠥,"[[1,3,6]]",Philippine
bagaman,v,⠧,"[[1,2,3,6]]",Philippine
wala,w,⠺,"[[2,4,5,6]]",Philippine
ito,x,⠭,"[[1,3,4,6]]",Philippine
yaman,y,⠽,"[[1,3,4,5,6]]",Philippine
sa,z,⠵,"[[1,3,5,6]]",Philippine
dakila,dl,⠙⠇,"[[1,4,5],[1,2,3]]",Philippine
palaisipan,pi,⠏⠊,"[[1,2,3,4],[2,4]]",Philippine
araw,araw,⠜,"[[3,4,5]]",Philippine
ingay,ingay,⠬,"[[3,4,6]]",Philippine
maging,maging,⠩,"[[1,4,6]]",Philippine
mahal,mahal,⣿,"[[1,2,3,4,5,6]]",Philippine
naging,naging,⠫,"[[1,2,4,6]]",Philippine
raw,raw,⠻,"[[1,2,4,5,6]]",Philippine
tunay,tunay,⠳,"[[1,2,5,6]]",Philippine
binata,binata,⠐⠃,"[[5],[1,2]]",Philippine
dalaga,dalaga,⠐⠙,"[[5],[1,4,5]]",Philippine
hapon,hapon,⠐⠓,"[[5],[1,2,5]]",Philippine
halaman,halaman,⠐⠚,"[[5],[2,4,5]]",Philippine
opo,opo,⠐⠕,"[[5],[1,3,5]]",Philippine
larawan,larawan,⠐⠇,"[[5],[1,2,3]]",Philippine
ugali,ugali,⠐⠥,"[[5],[1,3,6]]",Philippine
salita,salita,⠐⠵,"[[5],[1,3,5,6]]",Philippine
sinta,sinta,⠐⠌,"[[5],[3,4]]",Philippine
sabi,sabi,⠐⠱,"[[5],[1,5,6]]",Philippine
zero,zero,⠼⠚,"[[3,4,5,6],[2,4,5]]",UEB
one,one,⠼⠁,"[[3,4,5,6],[1]]",UEB
two,two,⠼⠃,"[[3,4,5,6],[1,2]]",UEB
three,three,⠼⠉,"[[3,4,5,6],[1,4]]",UEB
four,four,⠼⠙,"[[3,4,5,6],[1,4,5]]",UEB
five,five,⠼⠑,"[[3,4,5,6],[1,5]]",UEB
six,six,⠼⠋,"[[3,4,5,6],[1,2,4]]",UEB
seven,seven,⠼⠛,"[[3,4,5,6],[1,2,4,5]]",UEB
eight,eight,⠼⠓,"[[3,4,5,6],[1,2,5]]",UEB
nine,nine,⠼⠊,"[[3,4,5,6],[2,4]]",UEB`;

        this.brailleDatabase = this.parseCSV(embeddedCSV);
    }

    /**
     * Parse CSV data into a structured database
     * @param {string} csvText - The CSV text to parse
     * @returns {Object} - Parsed braille database
     */
    parseCSV(csvText) {
        const lines = csvText.trim().split('\n');
        const headers = lines[0].split(',');

        const database = {};

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const values = line.split(',');

            if (values.length >= 5) {
                const word = values[0].trim();
                const shortf = values[1].trim();
                const braille = values[2].trim();
                let array;

                try {
                    array = JSON.parse(values[3].trim().replace(/'/g, '"'));
                } catch (e) {
                    console.warn(`Could not parse array for ${word}:`, e);
                    array = [];
                }

                const lang = values[4].trim();

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
     * @returns {Object|null} - The braille pattern info or null if not found
     */
    translateWord(word) {
        if (!word) return null;
        
        // Clean and normalize the input word
        word = word.toLowerCase().trim();
        
        // First try to find the exact word in the database (using the more comprehensive method)
        const match = this.findWordInDatabase(word);
        if (match) {
            console.log(`Found exact match for "${word}": ${JSON.stringify(match.array)}`);
            return match;
        }
        
        // If no match found and word has multiple characters, try character by character
        if (word.length > 1) {
            const letterArrays = [];
            let allFound = true;
            
            for (const char of word) {
                // Try to find each character in the database
                const charMatch = this.findWordInDatabase(char);
                if (charMatch) {
                    // For multi-cell characters, we need to flatten or extract the specific cell
                    if (Array.isArray(charMatch.array[0])) {
                        letterArrays.push(charMatch.array[0]); // Get first cell of pattern
                    } else {
                        letterArrays.push(charMatch.array);
                    }
                } else {
                    allFound = false;
                    break;
                }
            }
            
            // Only return if we found patterns for all characters
            if (allFound && letterArrays.length === word.length) {
                console.log(`Built pattern for "${word}" character-by-character`);
                return {
                    word: word,
                    array: letterArrays,
                    braille: '', // No Unicode representation for character-by-character
                    shortf: '',
                    lang: this.currentLanguage,
                    isComposite: true
                };
            }
        }
        
        console.log(`No pattern found for "${word}"`);
        return null;
    }

    /**
     * Process recognized speech to find matching braille patterns
     * @param {string} text - The recognized speech text
     * @returns {Array} - Array of words with their matching braille patterns
     */
    processRecognizedSpeech(text) {
        if (!text || typeof text !== 'string') return [];
        
        // Split the text into words
        const words = text.trim().toLowerCase().split(/\s+/);
        const results = [];
        
        console.log(`Processing ${words.length} words from speech: "${text}"`);
        
        // If no words found, return a placeholder result to ensure output phase still shows
        if (words.length === 0 || (words.length === 1 && words[0] === '')) {
            return [{
                word: "no speech detected",
                found: false,
                isEmpty: true
            }];
        }
        
        for (const word of words) {
            // Skip empty words
            if (!word) continue;
            
            // Clean the word of punctuation
            const cleanWord = word.replace(/[^\w]/g, '');
            if (cleanWord.length === 0) continue;
            
            // Find the braille pattern
            const match = this.translateWord(cleanWord);
            
            // Add to results
            if (match) {
                results.push({
                    word: cleanWord,
                    array: match.array,
                    found: true,
                    lang: match.lang
                });
                console.log(`Found pattern for "${cleanWord}"`);
            } else {
                results.push({
                    word: cleanWord, 
                    found: false
                });
                console.log(`No pattern found for "${cleanWord}"`);
            }
        }
        
        return results;
    }

    /**
     * Get the best match from processed speech results
     * This helps the output phase always have something to display
     * @param {Array} speechResults - Results from processRecognizedSpeech
     * @returns {Object} - Best match or placeholder if no matches
     */
    getBestMatchForDisplay(speechResults) {
        if (!speechResults || speechResults.length === 0) {
            return { 
                word: "no speech detected",
                found: false,
                isEmpty: true
            };
        }
        
        // First try to find any matched word
        const foundMatch = speechResults.find(result => result.found);
        if (foundMatch) {
            return foundMatch;
        }
        
        // If no matches, return the first result
        return speechResults[0];
    }

    /**
     * Creates HTML for a visual braille cell representation
     * @param {Array} dotPattern - Array of dot numbers that are active
     * @returns {Element} - DOM element for the braille cell
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
                const match = this.translateWord(item);
                
                if (match) {
                    // Display pattern
                    this.renderBrailleCells(match.array, container);
                    
                    // Send to hardware if callback provided
                    if (sendCallback && typeof sendCallback === 'function') {
                        await sendCallback(match.array);
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
            const match = this.translateWord(char);
            if (match) {
                console.log(`Testing '${char}': ${JSON.stringify(match.array)}`);
                this.renderBrailleCells(match.array, container);
                
                // Send to hardware if callback provided
                if (sendCallback) {
                    await sendCallback(match.array);
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
        const languages = [this.currentLanguage, ...this.languages.filter(lang => lang !== this.currentLanguage)];
        
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
}

// Create global instance
const brailleTranslation = new BrailleTranslation();
