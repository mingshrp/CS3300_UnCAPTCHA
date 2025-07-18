// popup.js
document.addEventListener('DOMContentLoaded', function() {
  const toggleButton = document.getElementById('toggleButton');
  
  // Load saved state
  chrome.storage.sync.get(['enabled', 'apiKey'], function(result) {
    toggleButton.checked = result.enabled || false;
    
    // Check if API key is set
    if (!result.apiKey) {
      // Prompt for API key if not set
      promptForApiKey();
    }
  });
  
  // Handle toggle changes
  toggleButton.addEventListener('change', function() {
    const enabled = toggleButton.checked;
    
    chrome.storage.sync.set({enabled: enabled}, function() {
      console.log('UnCAPTCHA', enabled ? 'enabled' : 'disabled');
      
      // Send message to background script
      chrome.runtime.sendMessage({
        action: 'toggleExtension',
        enabled: enabled
      });
      
      // Notify all content scripts about the state change
      chrome.tabs.query({}, function(tabs) {
        tabs.forEach(tab => {
          chrome.tabs.sendMessage(tab.id, {
            action: 'toggleStateChanged',
            isEnabled: enabled
          }).catch(() => {
            // Ignore errors for tabs that don't have the content script
          });
        });
      });
    });
  });
  
  function promptForApiKey() {
    const apiKey = prompt('Please enter your 2captcha API key:');
    if (apiKey) {
      chrome.storage.sync.set({apiKey: apiKey}, function() {
        console.log('API key saved');
      });
    }
  }
  
  // Add context menu for API key management
  document.addEventListener('contextmenu', function(e) {
    e.preventDefault();
    if (confirm('Do you want to update your 2captcha API key?')) {
      promptForApiKey();
    }
  });
});