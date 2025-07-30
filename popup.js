// Description: This script handles the popup UI for UnCAPTCHA and adds functionality to toggle the extension on and off.

document.addEventListener('DOMContentLoaded', function() {
  const toggleButton = document.getElementById('toggleButton'); // reference to popup.html element with id toggleButton
  
  // Grab the current state (enabled/disabled) and API key from Chrome's storage
  chrome.storage.sync.get(['enabled', 'apiKey'], function(result) {
    toggleButton.checked = result.enabled || false;
    
    // Check if API key is set
    if (!result.apiKey) {
      // If not set, prompt user to set it 
      promptForApiKey();
    }
  });
  
  // Event listener for when user clicks the toggle button
  toggleButton.addEventListener('change', function() {
    const enabled = toggleButton.checked;
    
    chrome.storage.sync.set({enabled: enabled}, function() {
      console.log('UnCAPTCHA', enabled ? 'enabled' : 'disabled');
      
      // Send message to background of action type and state change
      chrome.runtime.sendMessage({
        action: 'toggleExtension',
        enabled: enabled
      });
    
    });
  });

  function promptForApiKey() {
    const apiKey = prompt('Please make sure your 2captcha API key is set. Check the GitHub repository for instructions.');
    if (apiKey) {
      chrome.storage.sync.set({apiKey: apiKey}, function() {
        console.log('API key saved');
      });
    }
  }

});