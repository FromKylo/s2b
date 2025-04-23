/**
 * Start the output phase
 */
function startOutputPhase() {
    // Process the recognized text for braille matches
    const brailleMatches = brailleTranslation.processRecognizedSpeech(currentTranscript);
    
    // Update UI - Always proceed with output phase regardless of matches
    currentPhase = 'output';
    updatePhaseDisplay();
    setActivePhase(outputPhase);
    
    // Stop speech recognition
    if (recognition && recognitionActive) {
        recognition.stop();
    }
    
    // Play audio cue for output mode
    playAudioCue('output');
    
    // Display braille patterns (will handle empty matches gracefully)
    displayBrailleOutput(brailleMatches);
    
    // Send braille data to BLE device if connected
    if (window.bleHandler && window.bleHandler.isConnectedToBLE && brailleMatches.length > 0) {
        // Get best match for display
        const bestMatch = brailleTranslation.getBestMatchForDisplay(brailleMatches);
        if (bestMatch && bestMatch.found) {
            window.bleHandler.sendBrailleToBLE(bestMatch);
        }
    }
    
    // Reset countdown - Changed to 3 seconds as requested
    let countdown = 3;
    outputCountdown.textContent = countdown;
    
    // Start countdown
    outputTimer = setInterval(() => {
        countdown--;
        outputCountdown.textContent = countdown;
        
        if (countdown <= 0) {
            clearInterval(outputTimer);
            startRecordingPhase();
        }
    }, 1000);
}
