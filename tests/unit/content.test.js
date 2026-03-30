// Mock chrome APIs before requiring the code
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
      get: jest.fn((keys, callback) => callback({})),
      set: jest.fn((data, callback) => callback && callback()),
    },
    onChanged: {
      addListener: jest.fn(),
    },
  },
};

const { ImageCaptchaDetector } = require('../../content.js');

describe('ImageCaptchaDetector', () => {
  let detector;

  beforeEach(() => {
    // Setup a clean environment for each test
    document.body.innerHTML = '';
    detector = new ImageCaptchaDetector();
  });

  test('isValidCaptchaImage returns true for likely captcha images', () => {
    const img = document.createElement('img');
    img.src = 'http://example.com/captcha.jpg';
    img.id = 'captchaImage';
    img.width = 250;
    img.height = 50;
    
    // Add an input field nearby (required by isValidCaptchaImage)
    const input = document.createElement('input');
    input.name = 'captcha_code';
    document.body.appendChild(img);
    document.body.appendChild(input);

    expect(detector.isValidCaptchaImage(img)).toBe(true);
  });

  test('isValidCaptchaImage returns false for images without keywords or nearby input', () => {
    const img = document.createElement('img');
    img.src = 'http://example.com/logo.png';
    img.width = 100;
    img.height = 100;
    document.body.appendChild(img);

    expect(detector.isValidCaptchaImage(img)).toBe(false);
  });
});