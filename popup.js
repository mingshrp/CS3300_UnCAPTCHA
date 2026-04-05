// popup.js
document.addEventListener('DOMContentLoaded', () => {
  const toggleButton = document.getElementById('toggleButton');
  const statusEl = document.getElementById('status');
  const detailsEl = document.getElementById('details');
  const scanButton = document.getElementById('scanButton');

  console.log("Popup loaded");

  // Load saved state
  chrome.storage.sync.get(['enabled', 'apiKey'], (result) => {
    const enabled = result.enabled ?? true;
    toggleButton.checked = enabled;

    if (!result.apiKey) {
      console.log("No API key set");
    }

    statusEl.innerHTML = "Click <strong>Scan Page</strong>";
    statusEl.style.color = "#333";
    detailsEl.textContent = "";
  });

  // Toggle ON/OFF
  toggleButton.addEventListener('change', () => {
    const enabled = toggleButton.checked;

    chrome.storage.sync.set({ enabled }, () => {
      console.log('UnCAPTCHA', enabled ? 'enabled' : 'disabled');

      chrome.runtime.sendMessage({
        action: 'toggleExtension',
        enabled
      });

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
              console.log('Content script not available');
            }
          }
        );
      });

      // Only refresh status (no scanning UI here)
      updateCaptchaStatus();
    });
  });

  // SCAN BUTTON
  if (scanButton) {
    scanButton.addEventListener('click', () => {
      console.log("Scan button clicked");

      // Update UI
      statusEl.textContent = "Scanning...";
      detailsEl.textContent = "";

      scanButton.textContent = "Scanning...";
      scanButton.disabled = true;

      updateCaptchaStatus();

      setTimeout(() => {
        scanButton.textContent = "Scan Page";
        scanButton.disabled = false;
      }, 1000);
    });
  } else {
    console.log("scanButton NOT found");
  }

  // MAIN FUNCTION
  function updateCaptchaStatus() {
    if (!statusEl || !detailsEl) return;

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs.length) {
        statusEl.textContent = 'No active tab';
        detailsEl.textContent = '';
        return;
      }

      console.log("Sending scan request...");

      chrome.tabs.sendMessage(
        tabs[0].id,
        { action: 'scanCaptcha' },
        (response) => {
          if (chrome.runtime.lastError) {
            console.log("Error:", chrome.runtime.lastError.message);

            statusEl.textContent = 'No response';
            detailsEl.textContent = 'Reload the page and try again.';
            return;
          }

          if (!response) {
            console.log("No response from content script");

            statusEl.textContent = 'No response';
            detailsEl.textContent = 'Content script not running.';
            return;
          }

          console.log("Response:", response);

          if (response.detected) {
            statusEl.textContent = 'CAPTCHA detected';
            statusEl.style.color = 'red';

            detailsEl.innerHTML = `
              Total: ${response.total}<br>
              Iframe: ${response.iframeCaptchas}<br>
              Image: ${response.imageCaptchas}
            `;
          } else {
            statusEl.textContent = 'No CAPTCHA found';
            statusEl.style.color = 'green';
            detailsEl.textContent = 'No CAPTCHA elements detected.';
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
});