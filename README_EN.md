<div align="center">
    <img src="images/icon128.png" alt="MultiLangSwitcher Icon" width="150" height="150"> <h1>MultiLangSwitcher</h1>
    <a href="https://github.com/ChuwuYo/MultiLangSwitcher/blob/main/README.md">简体中文</a> | <a href="https://github.com/ChuwuYo/MultiLangSwitcher/blob/main/README_EN.md">English</a> </div>

---

<div align="center">
Project Overview
</div>

---

MultiLangSwitcher is a Chrome browser extension that helps users quickly switch the `Accept-Language` HTTP request header sent by the browser. It is very useful for front-end developers, testers, and users who want to customize the language display of websites.

The extension utilizes the efficient `chrome.declarativeNetRequest` API to modify headers, ensuring performance and privacy.

***

<div align="center">
Features
</div>

***

* **Quick Language Switching**: Select and apply your preferred language easily through the browser toolbar's popup interface, offering a rich list of languages.
* **Persistent Settings**: Your last selected language preference is automatically saved and applied upon every browser startup.
* **Efficient Header Modification**: Uses the `declarativeNetRequest` API to directly modify request headers, which is more efficient than the WebRequest API and doesn't impact performance.
* **Automatic Background Application**: The extension automatically reads and applies the saved language settings when the browser starts or the extension is installed/updated.
* **Comprehensive Test Page**: Provides a `/test-headers.html` page to visually verify if the `Accept-Language` header has been correctly changed. It also detects browser-exposed JavaScript language preferences (`navigator.language`, `navigator.languages`), Internationalization API (Intl), WebRTC local IP leaks, and potential browser fingerprinting information like Canvas, WebGL, and AudioContext, helping you understand and control the information your browser exposes.
* **Powerful Debugging Tools**: Offers a dedicated `/debug.html` page with diagnostic and fixing tools:
    * **Rule Information**: View details of the dynamic rules currently applied by `declarativeNetRequest`, including rule ID, priority, action, conditions, and recent matched rule information (matched URL, resource type, etc.).
    * **Header Test**: Manually select a language and send a request to a test service to directly view the actual request headers sent by the browser.
    * **Real-time Logs**: Receive and display log messages sent by the extension (including popup and background scripts) in real-time, aiding in tracking code execution and issues.
    * **Common Issue Fixes**: Provides one-click operations to resolve common problems, such as increasing rule priority to avoid conflicts with other rules or clearing and reapplying rules.
    * **Extension Diagnostics**: Displays basic extension information, declared permissions, Manifest configuration, and stored language settings, offering a comprehensive view of the extension's state.

***

<div align="center">
Installation Guide
</div>

***

### Install from Chrome Web Store (Not Published)

Currently only supports installation from source.

### Install from Source Code

1.  **Download or Clone**: Clone or download the project repository to your local computer.(Or download the ZIP from release and unzip it)
    ```bash
    git clone https://github.com/ChuwuYo/MultiLangSwitcher.git
    ```
2.  **Open Extensions Management**: In the Chrome browser address bar, type `chrome://extensions/` and press Enter to go to the extensions management page.
3.  **Enable Developer Mode**: Turn on the "Developer mode" toggle in the top right corner of the page.
4.  **Load Unpacked**: Click the "Load unpacked" button in the top left corner of the page, and select the MultiLangSwitcher project folder you downloaded.
5.  **Done**: The extension will appear in your extensions list, indicating successful installation.

***

<div align="center">
Usage
</div>

***

1.  **Open Extension Popup**: Click the MultiLangSwitcher icon in the browser toolbar.
2.  **Select Preferred Language**: Choose the language you want the browser to simulate from the dropdown menu.
3.  **Apply Settings**: Click the "应用更改" (Apply Changes) button at the bottom of the interface. Your settings will be saved and immediately applied to new network requests.
4.  **Verify and Debug**: Click the "检测页面" (Test Page) or "调试工具" (Debug Tools) links provided in the popup to verify if the language settings are effective or to diagnose issues.

***

<div align="center">
File Structure
</div>

***

* `manifest.json`: Defines the basic information, permissions, and configuration of the extension.
* `popup.html` / `popup.js`: Implement the extension's popup interface and interaction logic.
* `background.js`: Runs as a Service Worker in the background, handling extension lifecycle events and initial rule application.
* `rules.json`: Contains static rules. This project primarily uses dynamic rules for language management.
* `test-headers.html` / `test-headers.js`: Page and script used for testing browser language and fingerprint information.
* `debug.html` / `debug-ui.js` / `debug-headers.js`: Files related to the debugging page and its functionalities.
* `images/`: Folder containing extension icon files.
* `typefaces/`: Folder containing fonts used by the project.

***

<div align="center">
Acknowledgements
</div>

<div align="center">
<a href="https://github.com/ChuwuYo/MultiLangSwitcher/graphs/contributors" target="_blank">
  <img src="https://contrib.rocks/image?repo=ChuwuYo/MultiLangSwitcher" alt="Contributors" />
</a>
</div>
