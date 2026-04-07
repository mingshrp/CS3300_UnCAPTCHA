// content.js - CAPTCHA detection for image and iframe-based CAPTCHAs
class ImageCaptchaDetector {
  constructor() {
    this.processedImages = new Set();
    this.isEnabled = true; // default, updated from storage
    this.observer = null;
    console.log("Content script loaded");
    this.init();
  }

  init() {
    this.checkExtensionState();

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'toggleStateChanged') {
        this.handleToggleChange(request.isEnabled);
      }
    });
  }

  checkExtensionState() {
    chrome.storage.sync.get(['enabled'], (result) => {
      const enabled = result.enabled ?? true;
      this.isEnabled = enabled;

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

    // Initial iframe scan
    this.findAndProcessIframeCaptchas(document.body);

    // Delayed scan for dynamically loaded CAPTCHA iframes
    setTimeout(() => {
      if (this.isEnabled) {
        this.findAndProcessIframeCaptchas(document.body);
      }
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

  highlightElement(el) {
    el.style.outline = "3px solid red";
  }

  findAndProcessCaptchaImages(container) {
    if (!this.isEnabled) return;

    const images = [];
    if (container.matches && container.matches("img")) {
      images.push(container);
    }
    images.push(...container.querySelectorAll("img"));

    images.forEach((img) => {
      if (!this.processedImages.has(img.src) && this.isValidCaptchaImage(img)) {
        this.processedImages.add(img.src);
        this.highlightElement(img);
        this.handleImageCaptcha(img);
      }
    });
  }

  findAndProcessIframeCaptchas(container) {
    if (!this.isEnabled) return;

    const iframes = [];
    if (container.matches && container.matches("iframe")) {
      iframes.push(container);
    }
    iframes.push(...container.querySelectorAll("iframe"));

    console.log("Scanning iframes:", iframes.length);

    iframes.forEach((frame) => {
      const src = (frame.src || "").toLowerCase();
      const score = this.getIframeCaptchaScore(frame);

      console.log("Iframe CAPTCHA score:", score, src);

      if (score >= 3) {
        console.log("UnCAPTCHA: Iframe CAPTCHA detected");
        frame.style.outline = "5px solid red";
        frame.style.zIndex = "9999";
      }
    });
  }

  getImageCaptchaScore(img) {
    let score = 0;

    const src = (img.src || '').toLowerCase();
    const alt = (img.alt || '').toLowerCase();
    const id = (img.id || '').toLowerCase();
    const className = (img.className || '').toLowerCase();

    const captchaKeywords = [
      'captcha', 'verify', 'verification', 'code', 'security',
      'challenge', 'puzzle', 'auth', 'validation', 'robot'
    ];

    // +2 if keyword found
    const hasKeyword = captchaKeywords.some(keyword =>
      src.includes(keyword) ||
      alt.includes(keyword) ||
      id.includes(keyword) ||
      className.includes(keyword)
    );
    if (hasKeyword) score += 2;

    // +2 if near input
    const hasNearbyInput = this.findCaptchaInput(img) !== null;
    if (hasNearbyInput) score += 2;

    // +1 if reasonable size
    const hasReasonableSize =
      img.width >= 50 && img.height >= 20 &&
      img.width <= 500 && img.height <= 200;

    if (hasReasonableSize) score += 1;

    console.log("Image CAPTCHA score:", score, src);

    return score;
  }

  isValidCaptchaImage(img) {
    return this.getImageCaptchaScore(img) >= 4;
  }

  getIframeCaptchaScore(frame) {
    let score = 0;

    const src = (frame.src || "").toLowerCase();
    const title = (frame.title || "").toLowerCase();
    const combined = src + title;

    // +3 if iframe source strongly suggests CAPTCHA
    if (
      src.includes("recaptcha") ||
      src.includes("google.com/recaptcha") ||
      src.includes("hcaptcha")
    ) {
      score += 3;
    }

    // +1 if challenge keyword appears
    if (combined.includes("challenge")) {
      score += 1;
    }

    return score;
  }

  getConfidenceLabel(score) {
    if (score >= 4) return "High";
    if (score >= 3) return "Medium";
    if (score >= 1) return "Low";
    return "None";
  }

  processExistingCaptchas() {
    if (!this.isEnabled) return;

    this.findAndProcessCaptchaImages(document.body);
    this.findAndProcessIframeCaptchas(document.body);
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
      if (img.complete) {
        resolve();
      } else {
        img.onload = () => resolve();
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
    // Strategy 1: same form
    const form = imgElement.closest('form');
    if (form) {
      const inputs = form.querySelectorAll(
        'input[type="text"], input[type="password"], input:not([type])'
      );

      for (const input of inputs) {
        if (this.isCaptchaInput(input)) {
          return input;
        }
      }

      if (inputs.length > 0) {
        return inputs[0];
      }
    }

    // Strategy 2: same parent containers
    let parent = imgElement.parentElement;
    while (parent && parent !== document.body) {
      const inputs = parent.querySelectorAll(
        'input[type="text"], input[type="password"], input:not([type])'
      );

      for (const input of inputs) {
        if (this.isCaptchaInput(input)) {
          return input;
        }
      }

      parent = parent.parentElement;
    }

    // Strategy 3: closest nearby input
    const allInputs = document.querySelectorAll(
      'input[type="text"], input[type="password"], input:not([type])'
    );

    let closestInput = null;
    let closestDistance = Infinity;

    const imgRect = imgElement.getBoundingClientRect();

    for (const input of allInputs) {
      const inputRect = input.getBoundingClientRect();
      const distance = Math.sqrt(
        Math.pow(imgRect.left - inputRect.left, 2) +
        Math.pow(imgRect.top - inputRect.top, 2)
      );

      if (distance < closestDistance && distance < 300) {
        closestDistance = distance;
        closestInput = input;
      }
    }

    return closestInput;
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
      chrome.runtime.sendMessage(
        {
          action: 'solveCaptcha',
          captchaData
        },
        (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else if (response && response.error) {
            reject(new Error(response.error));
          } else {
            resolve(response);
          }
        }
      );
    });
  }
}

class RecaptchaV2Detector {
  constructor() {
    this.processedWidgets = new Set();
    this.isEnabled = false;
    this.observer = null;
  }

  init() {
    this.checkExtensionState();
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
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
    console.log('UnCAPTCHA: reCAPTCHA v2 detector started');
    this.watchForRecaptcha();
    this.processExistingRecaptchas();
  }

  stopDetection() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    this.processedWidgets.clear();
  }

  watchForRecaptcha() {
    if (this.observer) return;
    this.observer = new MutationObserver((mutations) => {
      if (!this.isEnabled) return;
      this.processExistingRecaptchas();
    });
    this.observer.observe(document.body, { childList: true, subtree: true });
  }

  processExistingRecaptchas() {
    if (!this.isEnabled) return;
    
    // Look for reCAPTCHA v2 containers
    const widgets = document.querySelectorAll('.g-recaptcha, [data-sitekey]');
    widgets.forEach(widget => {
      const sitekey = widget.getAttribute('data-sitekey');
      if (sitekey && !this.processedWidgets.has(widget)) {
        this.handleRecaptcha(widget, sitekey);
      }
    });

    // Also look for iframes
    const iframes = document.querySelectorAll('iframe[src*="google.com/recaptcha/api2/anchor"]');
    iframes.forEach(iframe => {
      const url = new URL(iframe.src);
      const sitekey = url.searchParams.get('k');
      if (sitekey && !this.processedWidgets.has(iframe)) {
        this.handleRecaptcha(iframe, sitekey);
      }
    });
  }

  async handleRecaptcha(element, sitekey) {
    this.processedWidgets.add(element);
    console.log('UnCAPTCHA: reCAPTCHA v2 detected, sitekey:', sitekey);

    try {
      const captchaData = {
        method: 'userrecaptcha',
        googlekey: sitekey,
        pageurl: window.location.href
      };

      const response = await this.solveCaptcha(captchaData);
      if (response.solution) {
        this.applySolution(element, response.solution);
      }
    } catch (error) {
      console.error('UnCAPTCHA: Failed to solve reCAPTCHA v2:', error);
    }
  }

  applySolution(element, solution) {
    const textarea = document.getElementById('g-recaptcha-response') || 
                     element.querySelector('#g-recaptcha-response') ||
                     document.querySelector('[name="g-recaptcha-response"]');
    
    if (textarea) {
      textarea.innerHTML = solution;
      textarea.value = solution;
      
      // Fire change event
      textarea.dispatchEvent(new Event('change', { bubbles: true }));
      textarea.dispatchEvent(new Event('input', { bubbles: true }));

      // Check for callback
      const callback = element.getAttribute('data-callback') || 
                       element.getAttribute('callback');
      if (callback && typeof window[callback] === 'function') {
        window[callback](solution);
      }
    }
  }

  async solveCaptcha(captchaData) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({
        action: 'solveCaptcha',
        captchaData: captchaData
      }, (response) => {
        if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
        else if (response.error) reject(new Error(response.error));
        else resolve(response);
      });
    });
  }
}

const imageCaptchaDetector = new ImageCaptchaDetector();
const recaptchaV2Detector = new RecaptchaV2Detector();
recaptchaV2Detector.init();

// Export for unit testing in Node.js environment
if (typeof module !== 'undefined') {
  module.exports = { ImageCaptchaDetector, RecaptchaV2Detector };
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "scanCaptcha") {
    const iframes = document.querySelectorAll("iframe");
    const images = document.querySelectorAll("img");

    let iframeCount = 0;
    let imageCount = 0;
    let highestScore = 0;

    iframes.forEach((frame) => {
      const score = imageCaptchaDetector.getIframeCaptchaScore(frame);
      if (score >= 3) {
        iframeCount++;
        highestScore = Math.max(highestScore, score);
      }
    });

    images.forEach((img) => {
      const score = imageCaptchaDetector.getImageCaptchaScore(img);
      if (score >= 4) {
        imageCount++;
        highestScore = Math.max(highestScore, score);
      }
    });

    // Also check for reCAPTCHA v2 widgets that might not be in iframes yet or have specific markers
    const recaptchaWidgets = document.querySelectorAll('.g-recaptcha, [data-sitekey]');
    if (recaptchaWidgets.length > 0) {
        // If we found widgets, ensure iframeCount reflects them if they haven't been counted via iframes
        // This is a bit redundant but ensures we don't miss them during scanning
        if (iframeCount === 0) iframeCount = recaptchaWidgets.length;
        highestScore = Math.max(highestScore, 3); // reCAPTCHA v2 is at least Medium (3)
    }

    const detected = iframeCount > 0 || imageCount > 0;

    sendResponse({
      detected,
      iframeCaptchas: iframeCount,
      imageCaptchas: imageCount,
      total: iframeCount + imageCount,
      detectionScore: highestScore,
      confidence: detected
        ? imageCaptchaDetector.getConfidenceLabel(highestScore)
        : "None"
    });
  }
});