<p align="center">
  <img src="images/icons.png" alt="UnCAPTCHA Logo" width="100" />
</p>

<h1 align="center">UnCAPTCHA</h1>


## Description
A Chrome extension that automatically solves normal CAPTCHAs using the 2Captcha API.

## Installation

**Note**: This extension is not yet published on the Chrome Web Store.
You must install it manually in Developer Mode using the steps below:

Clone or download the repository, then load the extension manually in Chrome:

1. Open `chrome://extensions/`
2. Toggle **Developer mode** on top right
3. Click **Load unpacked**
4. Select the root folder of this project

## Setup

Before using UnCAPTCHA, make sure to add your **2Captcha API key** to the environment:

1. Create a `.env` file in the project root
2. Add your API key:


## Testing
You can test UnCAPTCHA on the following public CAPTCHA demo pages:
- [2Captcha Normal Demo](https://2captcha.com/demo/normal)
- [Captcha.com Demo](https://captcha.com/demos/features/captcha-demo.aspx)

### How to Test:
1. Open one of the demo pages above in a new browser tab
2. Right-click anywhere on the page and select "**Inspect**" to open DevTools
3. Go to **Console** tab to view logs from the extension
4. Click the UnCAPTCHA icon in your toolbar and toggle the extension **ON**
5. Watch console for success or error messages

## License

[MIT](https://choosealicense.com/licenses/mit/)
