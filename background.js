// Description: This script handles the background functionality of the Chrome extension that solves captchas 
// making requests to the 2captcha's API. 


class CaptchaSolver {

  constructor() {
    this.baseUrl = 'https://2captcha.com';
    this.apiKey = null;
    this.enabled = false; // Flag to enable/disable the extension (set to false by default)
    this.init();
  }

  async init() {
    // Load API key and the enabled state from Chrome's storage
    const result = await chrome.storage.sync.get(['apiKey', 'enabled']);
    this.apiKey = result.apiKey;
    this.enabled = result.enabled || false;
  }

  // Method: send captcha for solving, expect object holding captcha id
  async submitCaptcha(captchaData) {
    if (!this.apiKey) {
      throw new Error('API key not set');
    }

    const formData = new FormData(); // create FormData object to hold body parameters 
    formData.append('key', this.apiKey);
    formData.append('method', captchaData.method || 'post');
    formData.append('json', '1');   // tell server to send the response as JSON response

    Object.keys(captchaData).forEach(key => {
      if (key !== 'method') {
        formData.append(key, captchaData[key]);
      }
    });

    // make POST request to 2captcha /in.php endpoint
    try {
      const response = await fetch(`${this.baseUrl}/in.php`, {
        method: 'POST',
        body: formData
      });

      const result = await response.json(); // {status: 0 or 1, request: "captcha_id"}

      // check if request was successful = 1
      if (result.status === 1) {
        return result.request; // return captcha ID
      } else {
        throw new Error(result.error_text || 'Failed to submit captcha');
      }
    } catch (error) {
      console.error('Error submitting captcha:', error);
      throw error;
    }
  }

  // Method: get captcha result, expect captcha solution

  async getCaptchaResult(captchaId) {
    if (!this.apiKey) {
      throw new Error('API key not set');
    }

    const maxAttempts = 60; //  (60 * 5 seconds) = 5 mins long timeout
    let attempts = 0;

    // LOOP polling for result
    while (attempts < maxAttempts) {
      try {
        const response = await fetch(`${this.baseUrl}/res.php?key=${this.apiKey}&action=get&id=${captchaId}&json=1`); // GET request to get captcha result
        const result = await response.json();

        if (result.status === 1) { // CAPTCHA solved successfully
          return result.request; // Returns solution
        } else if (result.error_text === 'CAPCHA_NOT_READY') {
          // Wait 5 seconds before trying again
          await new Promise(resolve => setTimeout(resolve, 5000));
          attempts++;
        } else {
          throw new Error(result.error_text || 'Failed to get captcha result');
        }
      } catch (error) {
        console.error('Error getting captcha result:', error);
        throw error;
      }
    } // try again after 5 seconds

    throw new Error('Maximum attempts reached');
  }

  async solveCaptcha(captchaData) {
    try {
      console.log('Submitting captcha to 2captcha API...');
      const captchaId = await this.submitCaptcha(captchaData); // call submitCaptcha to send captcha data

      // TIMEOUT 5 seconds (as said in the 2captcha documentation)
      await new Promise(resolve => setTimeout(resolve, 5000));

      console.log('Waiting for captcha solution...');
      const solution = await this.getCaptchaResult(captchaId); // get the captcha result using the captcha ID required

      console.log('Captcha solved!');
      return solution;
    } catch (error) {
      console.error('Error', error);
      throw error;
    }
  }
}

// create instance of CaptchaSolver class
const captchaSolver = new CaptchaSolver();

// event listener for messages from content script and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'toggleExtension') { // whether the user clicks the toggle ON -> update the enabled stat
    captchaSolver.enabled = request.enabled;
    console.log('Extension', request.enabled ? 'enabled' : 'disabled');
    return true;
  }

  if (request.action === 'solveCaptcha') {

    if (!captchaSolver.enabled) { // If extension disabled, do not process captcha
      sendResponse({ error: 'Extension is disabled' }); 
      return true;
    }

    // otherwise call solveCaptcha() 
    captchaSolver.solveCaptcha(request.captchaData)
      .then(solution => {
        sendResponse({ solution: solution });
      })
      .catch(error => {
        sendResponse({ error: error.message });
      });

    return true;
  }
});
