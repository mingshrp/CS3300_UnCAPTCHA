// Mock MutationObserver
global.MutationObserver = class {
  constructor(callback) {
    this.callback = callback;
  }
  disconnect() {}
  observe(element, options) {}
};

global.chrome = {
  runtime: {
    onMessage: {
      addListener: jest.fn(),
    },
    sendMessage: jest.fn(),
    lastError: null,
  },
  storage: {
    sync: {
      get: jest.fn((keys, callback) => callback({ enabled: true })),
      set: jest.fn((data, callback) => callback && callback()),
    },
    onChanged: {
      addListener: jest.fn(),
    },
  },
};

const { ImageCaptchaDetector, RecaptchaV2Detector } = require('../../content.js');

describe('ImageCaptchaDetector', () => {
  let detector;

  beforeEach(() => {
    document.body.innerHTML = '';
    detector = new ImageCaptchaDetector();
  });

  test('isCaptchaInput returns true for captcha input fields', () => {
    const input = document.createElement('input');
    input.id = 'captcha_code';
    expect(detector.isCaptchaInput(input)).toBe(true);
  });
});

describe('RecaptchaV2Detector', () => {
  let detector;

  beforeEach(() => {
    document.body.innerHTML = '';
    detector = new RecaptchaV2Detector();
    detector.isEnabled = true;
  });

  test('processExistingRecaptchas finds g-recaptcha elements', () => {
    const widget = document.createElement('div');
    widget.className = 'g-recaptcha';
    widget.setAttribute('data-sitekey', '6LeOeSkUAAAAAAs_FByOFeC0kiY94_N9HOA95_3S');
    document.body.appendChild(widget);

    const handleSpy = jest.spyOn(detector, 'handleRecaptcha');
    detector.processExistingRecaptchas();
    
    expect(handleSpy).toHaveBeenCalledWith(widget, '6LeOeSkUAAAAAAs_FByOFeC0kiY94_N9HOA95_3S');
  });

  test('processExistingRecaptchas finds recaptcha iframes', () => {
    const iframe = document.createElement('iframe');
    iframe.src = 'https://www.google.com/recaptcha/api2/anchor?k=6LeOeSkUAAAAAAs_FByOFeC0kiY94_N9HOA95_3S';
    document.body.appendChild(iframe);

    const handleSpy = jest.spyOn(detector, 'handleRecaptcha');
    detector.processExistingRecaptchas();
    
    expect(handleSpy).toHaveBeenCalledWith(iframe, '6LeOeSkUAAAAAAs_FByOFeC0kiY94_N9HOA95_3S');
  });
});