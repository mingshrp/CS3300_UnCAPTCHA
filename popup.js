// popup.js
document.addEventListener('DOMContentLoaded', () => {
  const toggleButton = document.getElementById('toggleButton');
  const statusEl = document.getElementById('status');
  const detailsEl = document.getElementById('details');

  // Load saved state
  chrome.storage.sync.get(['enabled', 'apiKey'], (result) => {
    const enabled = result.enabled ?? true;
    toggleButton.checked = enabled;

    if (!result.apiKey) {
      promptForApiKey();
    }

    updateCaptchaStatus();
  });

  // Handle toggle changes
  toggleButton.addEventListener('change', () => {
    const enabled = toggleButton.checked;

    chrome.storage.sync.set({ enabled }, () => {
      console.log('UnCAPTCHA', enabled ? 'enabled' : 'disabled');

      // Notify background script
      chrome.runtime.sendMessage({
        action: 'toggleExtension',
        enabled: enabled
      });

      // Notify active tab content script
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs.length) return;

        chrome.tabs.sendMessage(
          tabs[0].id,
          {
            action: 'toggleStateChanged',
            isEnabled: enabled
          },
          () => {
            if (chrome.runtime.lastError) {
              // Ignore pages where content script is not available
              console.log('Content script not available on this tab.');
            }
          }
        );
      });

      updateCaptchaStatus();
    });
  });

  function updateCaptchaStatus() {
    if (!statusEl || !detailsEl) return;

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs.length) {
        statusEl.textContent = 'No active tab ❌';
        detailsEl.textContent = '';
        return;
      }

      chrome.tabs.sendMessage(
        tabs[0].id,
        { action: 'scanCaptcha' },
        (response) => {
          if (chrome.runtime.lastError || !response) {
            statusEl.textContent = 'No response ❌';
            detailsEl.textContent = 'Open a webpage to scan for CAPTCHA.';
            return;
          }

          if (response.detected) {
            statusEl.textContent = 'CAPTCHA detected ✅';
            statusEl.style.color = 'red';
            detailsEl.innerHTML = `
              Total: ${response.total}<br>
              Iframe: ${response.iframeCaptchas}<br>
              Image: ${response.imageCaptchas}
            `;
          } else {
            statusEl.textContent = 'No CAPTCHA found 🎉';
            statusEl.style.color = 'green';
            detailsEl.textContent = 'No CAPTCHA elements detected on this page.';
          }
        }
      );
    });
  }

  function promptForApiKey() {
    const apiKey = prompt('Please enter your 2captcha API key:');
    if (apiKey && apiKey.trim()) {
      chrome.storage.sync.set({ apiKey: apiKey.trim() }, () => {
        console.log('API key saved');
      });
    }
  }

  // Right click popup to update API key
  document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    if (confirm('Do you want to update your 2captcha API key?')) {
      promptForApiKey();
    }
  });
});