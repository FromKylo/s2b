/**
 * Embedded braille database
 * Contains the braille patterns directly in JavaScript to avoid loading issues
 */

const BRAILLE_DATABASE = [
  {
    word: "a",
    shortf: "a",
    braille: "⠁",
    array: [[1]],
    lang: "UEB"
  },
  {
    word: "b",
    shortf: "b",
    braille: "⠃",
    array: [[1, 2]],
    lang: "UEB"
  },
  {
    word: "c",
    shortf: "c",
    braille: "⠉",
    array: [[1, 4]],
    lang: "UEB"
  },
  {
    word: "d",
    shortf: "d",
    braille: "⠙",
    array: [[1, 4, 5]],
    lang: "UEB"
  },
  {
    word: "e",
    shortf: "e",
    braille: "⠑",
    array: [[1, 5]],
    lang: "UEB"
  },
  {
    word: "f",
    shortf: "f",
    braille: "⠋",
    array: [[1, 2, 4]],
    lang: "UEB"
  },
  {
    word: "g",
    shortf: "g",
    braille: "⠛",
    array: [[1, 2, 4, 5]],
    lang: "UEB"
  },
  {
    word: "h",
    shortf: "h",
    braille: "⠓",
    array: [[1, 2, 5]],
    lang: "UEB"
  },
  {
    word: "i",
    shortf: "i",
    braille: "⠊",
    array: [[2, 4]],
    lang: "UEB"
  },
  {
    word: "j",
    shortf: "j",
    braille: "⠚",
    array: [[2, 4, 5]],
    lang: "UEB"
  },
  {
    word: "k",
    shortf: "k",
    braille: "⠅",
    array: [[1, 3]],
    lang: "UEB"
  },
  {
    word: "l",
    shortf: "l",
    braille: "⠇",
    array: [[1, 2, 3]],
    lang: "UEB"
  },
  {
    word: "m",
    shortf: "m",
    braille: "⠍",
    array: [[1, 3, 4]],
    lang: "UEB"
  },
  {
    word: "n",
    shortf: "n",
    braille: "⠝",
    array: [[1, 3, 4, 5]],
    lang: "UEB"
  },
  {
    word: "o",
    shortf: "o",
    braille: "⠕",
    array: [[1, 3, 5]],
    lang: "UEB"
  },
  {
    word: "p",
    shortf: "p",
    braille: "⠏",
    array: [[1, 2, 3, 4]],
    lang: "UEB"
  },
  {
    word: "q",
    shortf: "q",
    braille: "⠟",
    array: [[1, 2, 3, 4, 5]],
    lang: "UEB"
  },
  {
    word: "r",
    shortf: "r",
    braille: "⠗",
    array: [[1, 2, 3, 5]],
    lang: "UEB"
  },
  {
    word: "s",
    shortf: "s",
    braille: "⠎",
    array: [[2, 3, 4]],
    lang: "UEB"
  },
  {
    word: "t",
    shortf: "t",
    braille: "⠞",
    array: [[2, 3, 4, 5]],
    lang: "UEB"
  },
  {
    word: "u",
    shortf: "u",
    braille: "⠥",
    array: [[1, 3, 6]],
    lang: "UEB"
  },
  {
    word: "v",
    shortf: "v",
    braille: "⠧",
    array: [[1, 2, 3, 6]],
    lang: "UEB"
  },
  {
    word: "w",
    shortf: "w",
    braille: "⠺",
    array: [[2, 4, 5, 6]],
    lang: "UEB"
  },
  {
    word: "x",
    shortf: "x",
    braille: "⠭",
    array: [[1, 3, 4, 6]],
    lang: "UEB"
  },
  {
    word: "y",
    shortf: "y",
    braille: "⠽",
    array: [[1, 3, 4, 5, 6]],
    lang: "UEB"
  },
  {
    word: "z",
    shortf: "z",
    braille: "⠵",
    array: [[1, 3, 5, 6]],
    lang: "UEB"
  },
  {
    word: "and",
    shortf: "and",
    braille: "⠯",
    array: [[1, 2, 3, 4, 6]],
    lang: "UEB"
  },
  {
    word: "the",
    shortf: "the",
    braille: "⠮",
    array: [[2, 3, 4, 6]],
    lang: "UEB"
  },
  {
    word: "for",
    shortf: "for",
    braille: "⠿",
    array: [[1, 2, 3, 4, 5, 6]],
    lang: "UEB"
  },
  {
    word: "with",
    shortf: "with",
    braille: "⠾",
    array: [[2, 3, 4, 5, 6]],
    lang: "UEB"
  },
  {
    word: "about",
    shortf: "ab",
    braille: "⠁⠃",
    array: [[1], [1, 2]],
    lang: "UEB"
  },
  {
    word: "after",
    shortf: "af",
    braille: "⠁⠋",
    array: [[1], [1, 2, 4]],
    lang: "UEB"
  },
  {
    word: "been",
    shortf: "bn",
    braille: "⠃⠝",
    array: [[1, 2], [1, 3, 4, 5]],
    lang: "UEB"
  },
  {
    word: "beyond",
    shortf: "bd",
    braille: "⠃⠙",
    array: [[1, 2], [1, 4, 5]],
    lang: "UEB"
  },
  {
    word: "before",
    shortf: "bo",
    braille: "⠃⠕",
    array: [[1, 2], [1, 3, 5]],
    lang: "UEB"
  },
  {
    word: "children",
    shortf: "cr",
    braille: "⠉⠗",
    array: [[1, 4], [1, 2, 3, 5]],
    lang: "UEB"
  },
  {
    word: "done",
    shortf: "dn",
    braille: "⠙⠝",
    array: [[1, 4, 5], [1, 3, 4, 5]],
    lang: "UEB"
  },
  // Filipino words
  {
    word: "bakit",
    shortf: "b",
    braille: "⠃",
    array: [[1, 2]],
    lang: "Philippine"
  },
  {
    word: "kanya",
    shortf: "c",
    braille: "⠉",
    array: [[1, 4]],
    lang: "Philippine"
  },
  {
    word: "kaniya",
    shortf: "c",
    braille: "⠉",
    array: [[1, 4]],
    lang: "Philippine"
  },
  {
    word: "dahil",
    shortf: "d",
    braille: "⠙",
    array: [[1, 4, 5]],
    lang: "Philippine"
  },
  {
    word: "hindi",
    shortf: "h",
    braille: "⠓",
    array: [[1, 2, 5]],
    lang: "Philippine"
  },
  {
    word: "ikaw",
    shortf: "i",
    braille: "⠊",
    array: [[2, 4]],
    lang: "Philippine"
  },
  {
    word: "araw",
    shortf: "araw",
    braille: "⠜",
    array: [[3, 4, 5]],
    lang: "Philippine"
  },
  {
    word: "ingay",
    shortf: "ingay",
    braille: "⠬",
    array: [[3, 4, 6]],
    lang: "Philippine"
  },
  // Numbers
  {
    word: "zero",
    shortf: "zero",
    braille: "⠼⠚",
    array: [[3, 4, 5, 6], [2, 4, 5]],
    lang: "UEB"
  },
  {
    word: "one",
    shortf: "one",
    braille: "⠼⠁",
    array: [[3, 4, 5, 6], [1]],
    lang: "UEB"
  },
  {
    word: "two",
    shortf: "two",
    braille: "⠼⠃",
    array: [[3, 4, 5, 6], [1, 2]],
    lang: "UEB"
  },
  {
    word: "three",
    shortf: "three",
    braille: "⠼⠉",
    array: [[3, 4, 5, 6], [1, 4]],
    lang: "UEB"
  },
  {
    word: "four",
    shortf: "four",
    braille: "⠼⠙",
    array: [[3, 4, 5, 6], [1, 4, 5]],
    lang: "UEB"
  },
  {
    word: "five",
    shortf: "five",
    braille: "⠼⠑",
    array: [[3, 4, 5, 6], [1, 5]],
    lang: "UEB"
  },
  {
    word: "six",
    shortf: "six",
    braille: "⠼⠋",
    array: [[3, 4, 5, 6], [1, 2, 4]],
    lang: "UEB"
  },
  {
    word: "seven",
    shortf: "seven",
    braille: "⠼⠛",
    array: [[3, 4, 5, 6], [1, 2, 4, 5]],
    lang: "UEB"
  },
  {
    word: "eight",
    shortf: "eight",
    braille: "⠼⠓",
    array: [[3, 4, 5, 6], [1, 2, 5]],
    lang: "UEB"
  },
  {
    word: "nine",
    shortf: "nine",
    braille: "⠼⠊",
    array: [[3, 4, 5, 6], [2, 4]],
    lang: "UEB"
  }
];

// Create an indexed map for faster lookups
const BRAILLE_WORD_MAP = new Map();
BRAILLE_DATABASE.forEach(entry => {
  BRAILLE_WORD_MAP.set(entry.word.toLowerCase(), entry);
});

/**
 * Find a braille entry by exact word match using the embedded database
 * @param {string} word - Word to find
 * @returns {Object|null} - Matching entry or null if not found
 */
function findBrailleWord(word) {
  if (!word || typeof word !== 'string') return null;
  
  const normalizedWord = word.toLowerCase().trim();
  return BRAILLE_WORD_MAP.get(normalizedWord) || null;
}

// Make available in both browser and Node.js environments
if (typeof window !== 'undefined') {
  window.BRAILLE_DATABASE = BRAILLE_DATABASE;
  window.BRAILLE_WORD_MAP = BRAILLE_WORD_MAP;
  window.findBrailleWord = findBrailleWord;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    BRAILLE_DATABASE,
    BRAILLE_WORD_MAP,
    findBrailleWord
  };
}
