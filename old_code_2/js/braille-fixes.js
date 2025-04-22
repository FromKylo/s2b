/**
 * Braille Display Multi-Cell Fixes
 * Ensures proper formatting of braille patterns for multi-cell displays
 */

(function() {
  // Fix for BLE connection sendBraillePattern method
  const originalSendBraillePattern = window.bleConnection.sendBraillePattern;
  
  window.bleConnection.sendBraillePattern = async function(arrayStr) {
    // Debug the array string being sent
    logDebug(`Original array being sent: ${arrayStr}`);
    
    try {
      // Ensure we're sending an array
      let brailleArray;
      
      try {
        // Try to parse if it's a string
        if (typeof arrayStr === 'string') {
          brailleArray = JSON.parse(arrayStr);
        } else {
          brailleArray = arrayStr;
        }
      } catch (e) {
        logDebug(`Error parsing array string: ${e.message}`);
        // If parsing fails, try to clean up common issues
        const cleanedStr = arrayStr.replace(/\s+/g, '')
          .replace(/^\[?|\]?$/g, '')
          .replace(/\]\[/g, '],[');
          
        if (!cleanedStr.startsWith('[')) {
          brailleArray = JSON.parse(`[[${cleanedStr}]]`);
        } else {
          brailleArray = JSON.parse(`[${cleanedStr}]`);
        }
      }
      
      // Check if this is already a properly formatted multi-cell array
      if (!Array.isArray(brailleArray[0])) {
        // It's a flat array - convert to multi-cell format with just one cell
        brailleArray = [brailleArray];
        logDebug("Converted single array to multi-cell format");
      }
      
      // Ensure we have at least one cell
      if (brailleArray.length === 0) {
        brailleArray.push([]);
      }
      
      // Fill in any undefined cells with empty arrays
      while (brailleArray.length < 2) {
        brailleArray.push([]);
      }
      
      // Convert back to string for transmission
      const formattedArray = JSON.stringify(brailleArray);
      logDebug(`Sending fixed multi-cell array: ${formattedArray}`);
      
      // Call the original method with the fixed format
      return originalSendBraillePattern.call(this, formattedArray);
      
    } catch (error) {
      logDebug(`Error in multi-cell fix: ${error.message}`);
      // Fall back to original behavior
      return originalSendBraillePattern.call(this, arrayStr);
    }
  };
  
  // Fix for BrailleCellRenderer to ensure proper rendering of multiple cells
  if (window.BrailleCellRenderer) {
    const originalRenderBrailleCells = window.BrailleCellRenderer.prototype.renderBrailleCells;
    
    window.BrailleCellRenderer.prototype.renderBrailleCells = function(arrayStr) {
      logDebug(`Rendering cells with array: ${arrayStr}`);
      
      try {
        // Parse and fix the array structure similar to the BLE fix
        let brailleArray;
        
        if (typeof arrayStr === 'string') {
          try {
            brailleArray = JSON.parse(arrayStr);
          } catch (e) {
            logDebug(`Error parsing cell array: ${e.message}`);
            // Apply formatting fixes
            const cleanedStr = arrayStr.replace(/\s+/g, '')
              .replace(/^\[?|\]?$/g, '')
              .replace(/\]\[/g, '],[');
              
            if (!cleanedStr.startsWith('[')) {
              brailleArray = JSON.parse(`[[${cleanedStr}]]`);
            } else {
              brailleArray = JSON.parse(`[${cleanedStr}]`);
            }
          }
        } else {
          brailleArray = arrayStr;
        }
        
        // Ensure multi-cell format
        if (!Array.isArray(brailleArray[0])) {
          brailleArray = [brailleArray];
        }
        
        // Call the original method with the fixed format
        return originalRenderBrailleCells.call(this, JSON.stringify(brailleArray));
        
      } catch (error) {
        logDebug(`Error fixing render cells: ${error.message}`);
        // Fall back to original behavior
        return originalRenderBrailleCells.call(this, arrayStr);
      }
    };
  }
  
  logDebug("Multi-cell braille display fixes loaded");
})();
