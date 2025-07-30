// Description: This script detects image captchas on web pages and interacts with the DOM (read, write, and monitor). 
// Injects javascript onto the page and communicates with the background script to solve captchas using 2captcha API.

class ImageCaptchaDetector {
  constructor() {
    this.processedImages = new Set(); // Track processed images to avoid duplicates
    this.isEnabled = false; // Track if the extension is enabled
    this.observer = null; //  Monitor for changes in the DOM
    this.init();
  }

  init() {
    // Check initial state of extension ON/OFF
    this.checkExtensionState();

    // Listen for state changes from popup
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'toggleStateChanged') {
        this.handleToggleChange(request.isEnabled);
      }
    });
  }

  checkExtensionState() {
    // Get the current state from storage
    chrome.storage.sync.get(['enabled'], (result) => {
      this.isEnabled = result.enabled || false;
      if (this.isEnabled) { // if enabled, start detection
        this.startDetection();
      }
    });
  }

  handleToggleChange(isEnabled) {
    this.isEnabled = isEnabled;

    if (isEnabled) {
      this.startDetection();
    } else {
      this.stopDetection();
    }
  }

  startDetection() {
    console.log('UnCAPTCHA: Image CAPTCHA detector started');

    // Watch for new captcha images added to the page
    this.watchForImageCaptcha();

    // Process existing captcha images on page load
    this.processExistingCaptchas();
  }

  // method to STOP detection
  stopDetection() {
    console.log('UnCAPTCHA: Image CAPTCHA detector disabled');

    // Disconnect the observer if exists
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    this.processedImages.clear();
  }

  watchForImageCaptcha() {
    if (this.observer) {
      return;
    }

    this.observer = new MutationObserver((mutations) => {
      if (!this.isEnabled) return; // must double check if still enabled

      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            // Look for captcha images in the added node
            this.findAndProcessCaptchaImages(node);
          }
        });
      });
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  processExistingCaptchas() {
    if (!this.isEnabled) return;

    // Process captcha images that are already on the page
    this.findAndProcessCaptchaImages(document.body);
  }

  findAndProcessCaptchaImages(container) {
    if (!this.isEnabled) return;

    // querySelector to isolate only image elements that are likely captchas 
    const captchaImage = document.querySelector("img[src*='base64'], img[id*='captchaImage'], img[id*='CaptchaImage'], img[class*='captchaImage'], img[class*='CaptchaImage'], img[width='250'][height='50']");

    if (captchaImage && !this.processedImages.has(captchaImage.src)) {
      this.processedImages.add(captchaImage.src); //mark as already processed
      this.handleImageCaptcha(captchaImage); 
    }
  }

  isValidCaptchaImage(img) {
    // validate if image is likely a normal captcha 
    const src = (img.src || '').toLowerCase();
    const alt = (img.alt || '').toLowerCase();
    const id = (img.id || '').toLowerCase();
    const className = (img.className || '').toLowerCase();

    // Some keywords that indicate if it is captcha image (improve later)
    const captchaKeywords = [
      'captcha', 'verify', 'verification', 'code', 'security',
      'challenge', 'puzzle', 'auth', 'validation'
    ];

    // Check if any of those keywords are present
    const hasKeyword = captchaKeywords.some(keyword =>
      src.includes(keyword) || alt.includes(keyword) ||
      id.includes(keyword) || className.includes(keyword)
    );

    // Extra check dimensions (standard captcha size)
    const hasReasonableSize = img.width >= 50 && img.height >= 20 &&
      img.width <= 500 && img.height <= 200;

    // check for input field nearby the captcha image (usually underneath or next to it)
    const hasNearbyInput = this.findCaptchaInput(img) !== null;

    return hasKeyword && hasReasonableSize && hasNearbyInput;
  }

  async handleImageCaptcha(imgElement) {
    if (!this.isEnabled) return;

    console.log('UnCAPTCHA: Image CAPTCHA detected', imgElement.src);

    try {
      // Wait for image to fully load
      await this.waitForImageLoad(imgElement);

      // Must convert image to base64 format (API only accepts base64 or multipart/form-data)
      const base64 = await this.imageToBase64(imgElement);

      if (!base64) {
        console.error('UnCAPTCHA: Failed to convert image to base64');
        return;
      }

      const captchaData = {
        method: 'base64',
        body: base64
      };

      console.log('UnCAPTCHA: Sending image to 2captcha for solving...');

      const response = await this.solveCaptcha(captchaData); // send to background script to solve captcha

      if (response.solution) {
        console.log('UnCAPTCHA: Captcha solved:', response.solution);

        // Find the input field in DOM and autofill with captcha answer
        const inputField = this.findCaptchaInput(imgElement);
        if (inputField) {
          this.fillCaptchaInput(inputField, response.solution);
        } else {
          console.warn('UnCAPTCHA: Input field not found.');
        }
      }
    } catch (error) {
      console.error('UnCAPTCHA: Failed to solve image captcha:', error);
    }
  }

  waitForImageLoad(img) {
    return new Promise((resolve, reject) => {
      if (img.complete) {
        resolve();
      } else {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Image failed to load'));
        setTimeout(() => reject(new Error('Image load timeout')), 5000);
      }
    });
  }

  async imageToBase64(imgElement) {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      // Use naturalWidth and naturalHeight to get the real image size vs the size of image shown on web page
      canvas.width = imgElement.naturalWidth || imgElement.width;
      canvas.height = imgElement.naturalHeight || imgElement.height;

      // Draw the image onto the canvas
      ctx.drawImage(imgElement, 0, 0);

      // Get base64 data (remove the data:image/png;base64, prefix)
      const dataURL = canvas.toDataURL('image/png');
      return dataURL.split(',')[1];

    } catch (error) {
      console.error('UnCAPTCHA: Error converting image to base64:', error);
      return null;
    }
  }

  findCaptchaInput(imgElement) {
    const form = imgElement.closest('form');
    if (form) {
      const inputs = form.querySelectorAll('input[type="text"], input[type="password"], input:not([type])');

      // First, try to find input with captcha-related attributes
      for (let input of inputs) {
        if (this.isCaptchaInput(input)) {
          return input;
        }
      }

      // If no specific captcha input found, return the first text input
      if (inputs.length > 0) {
        return inputs[0];
      }
    }

    // Strategy 2: Look for input in the same parent container
    let parent = imgElement.parentElement;
    while (parent && parent !== document.body) {
      const inputs = parent.querySelectorAll('input[type="text"], input[type="password"], input:not([type])');

      for (let input of inputs) {
        if (this.isCaptchaInput(input)) {
          return input;
        }
      }

      parent = parent.parentElement;
    }

    // Strategy 3: Look for nearby inputs (within reasonable distance)
    const allInputs = document.querySelectorAll('input[type="text"], input[type="password"], input:not([type])');
    let closestInput = null;
    let closestDistance = Infinity;

    const imgRect = imgElement.getBoundingClientRect();

    for (let input of allInputs) {
      const inputRect = input.getBoundingClientRect();
      const distance = Math.sqrt(
        Math.pow(imgRect.left - inputRect.left, 2) +
        Math.pow(imgRect.top - inputRect.top, 2)
      );

      if (distance < closestDistance && distance < 300) { // Within 300px
        closestDistance = distance;
        closestInput = input;
      }
    }

    return closestInput;
  }

  isCaptchaInput(input) {
    const id = (input.id || '').toLowerCase();
    const name = (input.name || '').toLowerCase();
    const placeholder = (input.placeholder || '').toLowerCase();
    const className = (input.className || '').toLowerCase();

    const captchaKeywords = [
      'captcha', 'verify', 'verification', 'code', 'security',
      'challenge', 'auth', 'validation'
    ];

    return captchaKeywords.some(keyword =>
      id.includes(keyword) || name.includes(keyword) ||
      placeholder.includes(keyword) || className.includes(keyword)
    );
  }

  fillCaptchaInput(inputField, solution) {
    // Clear any existing value
    inputField.value = '';

    // Set the solution
    inputField.value = solution;

    // Trigger various events to ensure the form recognizes the input
    const events = [
      new Event('input', { bubbles: true }),
      new Event('change', { bubbles: true }),
      new Event('keyup', { bubbles: true }),
      new Event('blur', { bubbles: true })
    ];

    events.forEach(event => {
      inputField.dispatchEvent(event);
    });

    // Focus on the input briefly to make it more visible
    inputField.focus();
    setTimeout(() => inputField.blur(), 100);
  }

  async solveCaptcha(captchaData) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({
        action: 'solveCaptcha',
        captchaData: captchaData
      }, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else if (response.error) {
          reject(new Error(response.error));
        } else {
          resolve(response);
        }
      });
    });
  }
}

// Initialize the image captcha detector when the page loads
const imageCaptchaDetector = new ImageCaptchaDetector();