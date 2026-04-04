// content.js - Focused on Image CAPTCHAs with distorted text only
class ImageCaptchaDetector {
  constructor() {
    this.processedImages = new Set();
    this.isEnabled = true; // Default to enabled, will be updated from storage
    this.observer = null;
    console.log(" Content script loaded");
    
    
    this.startDetection();  
  }

  highlightElement(el) {
    el.style.outline = "3px solid red";
  }

  findAndProcessIframeCaptchas(container) {
    const iframes = container.querySelectorAll("iframe");

    console.log("Scanning iframes:", iframes.length);

    iframes.forEach((frame) => {
      const src = (frame.src || "").toLowerCase();
      const title = (frame.title || "").toLowerCase();
      const combined = src + title;

      console.log("iframe src:", src);

      if (
        src.includes("recaptcha") ||
        src.includes("google.com/recaptcha") ||
        src.includes("hcaptcha") ||
        combined.includes("challenge")
      ) {
        console.log("UnCAPTCHA: Iframe CAPTCHA detected");

        frame.style.outline = "5px solid red";
        frame.style.zIndex = "9999";
      }
    });
  }

  init() {
    this.checkExtensionState();

    chrome.runtime.onMessage.addListener((request) => {
      if (request.action === 'toggleStateChanged') {
        this.handleToggleChange(request.isEnabled);
      }
    });
  }

  checkExtensionState() {
    chrome.storage.sync.get(['enabled'], (result) => {
      this.isEnabled = result.enabled || false;
      if (this.isEnabled) {
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

    this.watchForImageCaptcha();
    this.processExistingCaptchas();

    // Initial scan
    this.findAndProcessIframeCaptchas(document.body);

    // Delayed scan (important for recaptcha)
    setTimeout(() => {
      this.findAndProcessIframeCaptchas(document.body);
    }, 2000);
  }

  stopDetection() {
    console.log('UnCAPTCHA: Image CAPTCHA detector stopped');

    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }

    this.processedImages.clear();
  }

  watchForImageCaptcha() {
    if (this.observer) return;

    this.observer = new MutationObserver((mutations) => {
      if (!this.isEnabled) return;

      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            this.findAndProcessCaptchaImages(node);
            this.findAndProcessIframeCaptchas(node);
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

    this.findAndProcessCaptchaImages(document.body);
    this.findAndProcessIframeCaptchas(document.body);
  }

  findAndProcessCaptchaImages(container) {
    if (!this.isEnabled) return;

    const images = container.querySelectorAll("img");

    images.forEach((img) => {
      if (!this.processedImages.has(img.src) && this.isValidCaptchaImage(img)) {
        this.processedImages.add(img.src);
        this.highlightElement(img);
        this.handleImageCaptcha(img);
      }
    });
  }

  isValidCaptchaImage(img) {
    const src = (img.src || '').toLowerCase();
    const alt = (img.alt || '').toLowerCase();
    const id = (img.id || '').toLowerCase();
    const className = (img.className || '').toLowerCase();

    const captchaKeywords = [
      'captcha', 'verify', 'verification', 'code', 'security',
      'challenge', 'puzzle', 'auth', 'validation', 'robot'
    ];

    const hasKeyword = captchaKeywords.some(keyword =>
      src.includes(keyword) ||
      alt.includes(keyword) ||
      id.includes(keyword) ||
      className.includes(keyword)
    );

    const hasReasonableSize =
      img.width >= 50 && img.height >= 20 &&
      img.width <= 500 && img.height <= 200;

    const hasNearbyInput = this.findCaptchaInput(img) !== null;

    return hasKeyword && hasReasonableSize && hasNearbyInput;
  }

  async handleImageCaptcha(imgElement) {
    if (!this.isEnabled) return;

    console.log('UnCAPTCHA: Image CAPTCHA detected', imgElement.src);

    try {
      await this.waitForImageLoad(imgElement);

      const base64 = await this.imageToBase64(imgElement);
      if (!base64) return;

      const response = await this.solveCaptcha({
        method: 'base64',
        body: base64
      });

      if (response.solution) {
        const inputField = this.findCaptchaInput(imgElement);
        if (inputField) {
          this.fillCaptchaInput(inputField, response.solution);
        }
      }
    } catch (error) {
      console.error('UnCAPTCHA: Failed to solve image captcha:', error);
    }
  }

  waitForImageLoad(img) {
    return new Promise((resolve, reject) => {
      if (img.complete) resolve();
      else {
        img.onload = resolve;
        img.onerror = () => reject(new Error('Image failed to load'));
        setTimeout(() => reject(new Error('Image load timeout')), 10000);
      }
    });
  }

  async imageToBase64(imgElement) {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      canvas.width = imgElement.naturalWidth || imgElement.width;
      canvas.height = imgElement.naturalHeight || imgElement.height;

      ctx.drawImage(imgElement, 0, 0);

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

      for (let input of inputs) {
        if (this.isCaptchaInput(input)) return input;
      }

      if (inputs.length > 0) return inputs[0];
    }

    let parent = imgElement.parentElement;
    while (parent && parent !== document.body) {
      const inputs = parent.querySelectorAll('input[type="text"], input[type="password"], input:not([type])');

      for (let input of inputs) {
        if (this.isCaptchaInput(input)) return input;
      }

      parent = parent.parentElement;
    }

    return null;
  }

  isCaptchaInput(input) {
    const text = (
      input.id +
      input.name +
      input.placeholder +
      input.className
    ).toLowerCase();

    return ['captcha', 'verify', 'code', 'challenge'].some(k => text.includes(k));
  }

  fillCaptchaInput(inputField, solution) {
    inputField.value = solution;

    ['input', 'change', 'keyup', 'blur'].forEach(type =>
      inputField.dispatchEvent(new Event(type, { bubbles: true }))
    );

    inputField.focus();
    setTimeout(() => inputField.blur(), 100);
  }

  async solveCaptcha(captchaData) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({
        action: 'solveCaptcha',
        captchaData
      }, (response) => {
        if (chrome.runtime.lastError) reject();
        else resolve(response);
      });
    });
  }
}

const imageCaptchaDetector = new ImageCaptchaDetector();

if (typeof module !== 'undefined') {
  module.exports = { ImageCaptchaDetector };
}