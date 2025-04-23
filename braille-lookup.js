/**
 * Function to find a word or phrase in the braille database and return its details
 * @param {string} input - The word or phrase to look up
 * @param {string} csvData - Optional CSV data (not used when using embedded database)
 * @returns {Object|null} - Object with word, shortf, braille, array, and lang properties; null if not found
 */
function lookupBraille(input, csvData = null) {
  // Convert input to lowercase for case-insensitive matching
  input = input.toLowerCase().trim();
  
  // Use the embedded database if available
  if (typeof BRAILLE_WORD_MAP !== 'undefined' && BRAILLE_WORD_MAP.has(input)) {
    return BRAILLE_WORD_MAP.get(input);
  }
  
  // If the embedded database isn't available or didn't contain the word,
  // and CSV data was provided, fall back to parsing that
  if (csvData) {
    // Parse CSV data
    const lines = csvData.split('\n');
    const headers = lines[0].split(',');
    const entries = [];
    
    // Process each line (skipping header)
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue; // Skip empty lines
      
      // Properly parse CSV with quoted fields
      const values = parseCSVLine(lines[i]);
      if (values.length < headers.length) continue; // Skip invalid entries
      
      const entry = {};
      
      // Create object with properties from CSV
      headers.forEach((header, index) => {
        // Special handling for the array column
        if (header === 'array') {
          try {
            entry[header] = parseArrayString(values[index]);
          } catch (e) {
            entry[header] = values[index];
          }
        } else {
          entry[header] = values[index];
        }
      });
      
      entries.push(entry);
    }
    
    // Find all matches
    const matches = entries.filter(entry => entry.word === input);
    
    // Return the last match if found, otherwise null
    return matches.length > 0 ? matches[matches.length - 1] : null;
  }
  
  return null;
}

/**
 * Parse a CSV line properly handling quoted fields
 * @param {string} line - A line from the CSV file
 * @returns {Array} - Array of field values
 */
function parseCSVLine(line) {
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
function parseArrayString(arrayStr) {
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
    
    // Parse JSON
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
    // Try to salvage simple digit arrays
    if (/^\d+$/.test(arrayStr)) {
      const num = parseInt(arrayStr, 10);
      return [[num]]; // Return in proper nested format
    }
    
    return null;
  }
}

// Export the function for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { lookupBraille, parseCSVLine, parseArrayString };
}
