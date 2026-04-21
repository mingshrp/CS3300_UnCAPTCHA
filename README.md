# UnCAPTCHA 2.0

UnCAPTCHA 2.0 is a Chrome extension that detects CAPTCHAs on a page and helps solve supported challenges through the 2Captcha service. The project is focused on improving usability and accessibility by flagging CAPTCHA barriers and offering a smoother solving workflow.

## Features

- Detects likely CAPTCHA elements on the current page
- Supports manual page scanning from the popup
- Highlights accessibility impact when CAPTCHAs are found
- Solves supported CAPTCHA types through 2Captcha
- Supports automatic solving when enabled by the user
- Lets users store and update their 2Captcha API key in extension settings
- Includes unit and end-to-end test setup with Jest and Playwright

## Currently Supported

### Detection

- Image-based CAPTCHA candidates
- iframe-based CAPTCHA candidates
- reCAPTCHA v2 widgets

### Solving

- Image CAPTCHAs through 2Captcha image submission
- reCAPTCHA v2 through 2Captcha token solving

## Tech Stack

- Chrome Extension Manifest V3
- JavaScript
- Chrome Storage API
- 2Captcha API
- Jest for unit tests
- Playwright for end-to-end tests

## Project Structure

```text
.
├── background.js          # Background service worker, 2Captcha integration
├── content.js             # CAPTCHA detection and in-page solving flow
├── injected.js            # Injected script for reCAPTCHA token delivery/callbacks
├── popup.html             # Extension popup UI
├── popup.js               # Popup logic and settings handling
├── style.css              # Popup styling
├── manifest.json          # Chrome extension manifest
├── jest.config.js         # Jest configuration
├── playwright.config.js   # Playwright configuration
└── tests/
    └── unit/              # Unit tests
```

## How It Works

1. The extension runs a content script on pages you visit.
2. It scans the DOM for signs of CAPTCHA widgets such as suspicious images, CAPTCHA-related iframes, and reCAPTCHA v2 containers.
3. From the popup, you can scan the current page and view detection details.
4. If solving is enabled and a supported CAPTCHA is found, the content script sends a solve request to the background service worker.
5. The background worker submits the challenge to 2Captcha, polls for a result, and returns the solution.
6. The content script applies the solution to the page. For reCAPTCHA v2, an injected page-world script fills the response token and triggers site callbacks when possible.

## Setup

### Prerequisites

- Google Chrome
- Node.js and npm
- A 2Captcha account and API key

### Install dependencies

```bash
npm install
```

### Load the extension in Chrome

1. Open `chrome://extensions/`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select the project folder

## Configuration

1. Click the extension icon to open the popup.
2. Enter your 2Captcha API key.
3. Toggle the extension on or off.
4. Optionally enable **Auto-solve CAPTCHAs**.
5. Use **Scan Page** to manually check the current tab.

## Development

### Run unit tests

```bash
npm run test:unit
```

### Run coverage

```bash
npm run test:unit:coverage
```

### Run end-to-end tests

```bash
npm run test:e2e
```

### Run all tests

```bash
npm test
```

## Permissions Used

The extension requests the following permissions:

- `activeTab` — interact with the currently active tab
- `storage` — save settings such as enabled state, auto-solve preference, and API key
- `scripting` — inject helper logic into the page when needed
- Host permissions for web pages and `https://2captcha.com/*`

## Notes and Limitations

- Solving CAPTCHAs requires a valid 2Captcha API key and account balance.
- Auto-solve is off by default to avoid unintended credit usage.
- Detection is heuristic-based, so false positives or missed CAPTCHAs are possible.
- This version is primarily built around image CAPTCHAs and reCAPTCHA v2.
- Some sites may block or customize CAPTCHA flows in ways that limit reliable automation.

## Accessibility Motivation

CAPTCHAs can create barriers for users with disabilities. This project aims to identify those barriers and reduce friction by giving users clearer visibility into CAPTCHA presence and a supported solve workflow.

## Repository

GitHub repository: <https://github.com/aaron730/CS5340_UnCAPTCHA_2.0>

## License

MIT License (Open Source)

Powerpoint: https://uccsoffice365-my.sharepoint.com/:p:/g/personal/aelofson_uccs_edu/IQDCR79QcBOQQLeXUwWkci8vAaXvE9eoYPAw0YKC3_l5wkI?e=4E59ty
