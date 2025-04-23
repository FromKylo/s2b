/**
 * Database loader for the braille application
 * Handles loading the braille database from multiple possible paths
 */

// Track the database loading state
let databaseLoadState = {
  loaded: false,
  csvData: null,
  error: null,
  lastAttempt: null
};

/**
 * Load the braille database with multiple path attempts
 * @returns {Promise<string>} - The CSV data as a string if successful
 */
async function loadBrailleDatabase() {
  if (databaseLoadState.loaded && databaseLoadState.csvData) {
    console.log('Using cached database data');
    return databaseLoadState.csvData;
  }
  
  // Track when we last tried to load
  databaseLoadState.lastAttempt = new Date();
  
  console.log('Attempting to load braille database...');
  
  // Define possible paths to try in order
  const paths = [
    'braille-database.csv',
    './braille-database.csv',
    '../braille-database.csv',
    '/braille-database.csv',
    'c:/Users/kylea/Downloads/s2b/s2b/braille-database.csv',
    window.location.origin + '/braille-database.csv',
    window.location.href.replace(/\/[^\/]*$/, '/') + 'braille-database.csv'
  ];
  
  // Create a status element to show loading progress
  const statusDiv = document.createElement('div');
  statusDiv.className = 'database-status loading';
  statusDiv.textContent = 'Loading database...';
  
  // Add to DOM if not already present
  const existingStatus = document.querySelector('.database-status');
  if (existingStatus) {
    existingStatus.replaceWith(statusDiv);
  } else {
    document.querySelector('main')?.insertBefore(
      statusDiv, 
      document.querySelector('main')?.firstChild
    );
  }
  
  // Try each path until one works
  for (let i = 0; i < paths.length; i++) {
    const path = paths[i];
    try {
      console.log(`Trying path (${i+1}/${paths.length}): ${path}`);
      
      // Update status
      statusDiv.textContent = `Loading database (attempt ${i+1}/${paths.length})...`;
      
      const response = await fetch(path, { 
        cache: 'no-store', 
        headers: { 'Content-Type': 'text/csv' }
      });
      
      if (!response.ok) {
        console.warn(`Path ${path} returned status ${response.status}`);
        continue; // Try next path
      }
      
      // We got a successful response
      const data = await response.text();
      
      // Validate that it looks like CSV
      if (!data || !data.includes(',') || data.length < 10) {
        console.warn(`Path ${path} returned invalid data`);
        continue; // Try next path
      }
      
      // Store the successful data
      databaseLoadState.csvData = data;
      databaseLoadState.loaded = true;
      databaseLoadState.error = null;
      
      // Update status
      statusDiv.className = 'database-status success';
      statusDiv.textContent = 'Database loaded successfully!';
      
      console.log(`Successfully loaded database from ${path}`);
      
      // Return the data
      return data;
    } catch (error) {
      console.warn(`Error loading from path ${path}:`, error);
    }
  }
  
  // If we get here, all paths failed
  const errorMsg = 'Failed to load database from all paths';
  console.error(errorMsg);
  
  // Update status
  statusDiv.className = 'database-status error';
  statusDiv.textContent = errorMsg;
  
  // Set error state
  databaseLoadState.error = new Error(errorMsg);
  
  throw databaseLoadState.error;
}

/**
 * Get a specific entry from the braille database
 * @param {string} word - The word to look up
 * @returns {Promise<Object|null>} The matching braille entry or null if not found
 */
async function getBrailleEntry(word) {
  if (!word) return null;
  
  try {
    // Make sure database is loaded
    const data = await loadBrailleDatabase();
    
    // Use the lookupBraille function to find the word
    // This assumes the braille-lookup.js file has been loaded
    if (typeof lookupBraille === 'function') {
      return lookupBraille(word, data);
    } else {
      console.error('lookupBraille function is not available');
      return null;
    }
  } catch (error) {
    console.error('Error getting braille entry:', error);
    return null;
  }
}

/**
 * Get the current database loading state
 * @returns {Object} The current state of database loading
 */
function getDatabaseState() {
  return {
    ...databaseLoadState,
    dataAvailable: Boolean(databaseLoadState.csvData)
  };
}

// Automatically try to load the database when the script loads
window.addEventListener('DOMContentLoaded', () => {
  // Delay slightly to allow other scripts to initialize
  setTimeout(() => {
    loadBrailleDatabase().catch(error => {
      console.error('Initial database load failed:', error);
    });
  }, 100);
});

// Export functions for use in other modules
if (typeof window !== 'undefined') {
  // Browser environment
  window.brailleDB = {
    loadBrailleDatabase,
    getBrailleEntry,
    getDatabaseState
  };
}

if (typeof module !== 'undefined' && module.exports) {
  // Node.js environment
  module.exports = {
    loadBrailleDatabase,
    getBrailleEntry,
    getDatabaseState
  };
}
