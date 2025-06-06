<div align="center">
    <img src="images/icon128.png" alt="MultiLangSwitcher Icon" width="150" height="150"> <h1>MultiLangSwitcher</h1>
    <a href="https://github.com/ChuwuYo/MultiLangSwitcher/blob/main/README.md">简体中文</a> | <a href="https://github.com/ChuwuYo/MultiLangSwitcher/blob/main/README_EN.md">English</a> </div>

---

<div align="center">
Project Overview

</div>

---

[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/ChuwuYo/MultiLangSwitcher)

MultiLangSwitcher is a Chromium - based browser extension that helps users quickly switch the `Accept - Language` HTTP request header sent by the browser.Users can also customize the full `Accept - Language` string on the Debugging Tools page.

The extension utilizes the efficient `chrome.declarativeNetRequest` API to modify the request header, ensuring performance and privacy.

The website's layout and styling are built with Bootstrap.

If the built-in request header detection encounters an error or does not return results, you can manually navigate to [BrowserScan](https://www.browserscan.net) or [header-echo](https://header-echo.addr.tools/) for further inspection.

If you need to switch the browser UA, you can take a look at this project:[User-Agent Switcher and Manager](https://github.com/ray-lothian/UserAgent-Switcher)

<div align="center">
    <img src="https://github.com/user-attachments/assets/e44b6d72-b66c-4be5-a80d-a2de07fb86c6" alt="MultiLangSwitcher Home">

</div>

---

At the same time, it is recommended to set the browser language settings as shown in the figure, this can confuse some simple  `navigator.languages`  detection.

<div align="center">
    <img src="https://github.com/user-attachments/assets/c056e5ee-6c65-4786-98d4-ee33f4beef47" alt="Suggestion">
</div>

This is a demonstration of customizing the `Accept - Language` string.

<div align="center">
    <img src="https://github.com/user-attachments/assets/4136c601-5f02-467e-9f42-12eefb5a65dc" alt="Custom Accept-Language">
</div>

***

<div align="center">
Features
</div>

***

* **Quick Language Switching**: Provides a rich language list through the browser toolbar popup interface for you to choose and apply.
* **Automatic Language Switching by Domain**: Automatically switch languages based on domain. You can set default languages for specific domains (including top-level domains like `.com`, `.cn` and second-level domains like `com.cn`, `co.jp`). The extension will automatically apply the corresponding language settings when visiting these domains. When no domain rule is matched, English (`en`) is used by default.
* **Persistent Settings**: Your last selected language preference and the automatic language switching by domain state will be automatically saved and loaded and applied each time the browser starts.
* **Efficient Header Modification**: Utilizes the `declarativeNetRequest` API to directly modify the request header, which is more efficient and does not affect performance compared to the WebRequest API.
* **Automatic Background Application**: The extension automatically reads and applies the saved language settings and auto-switch state when the browser starts and when it is installed/updated.
* **Comprehensive Test Page**: Provides a `/test-headers.html` page to intuitively verify whether the `Accept-Language` header has been successfully changed, and to detect the language preferences exposed by the browser (`navigator.language`, `navigator.languages`), internationalization API (Intl), and other information. It also includes detection of WebRTC local IP leakage and possible browser fingerprinting information such as Canvas, WebGL, AudioContext, etc., helping you understand and control the information exposed by the browser.
* **Debugging Tools**: Provides an independent `/debug.html` page containing the following diagnostic and repair tools:
    * **Rule Information**: View the details of the dynamic rules currently set by the extension through `declarativeNetRequest`, including rule ID, priority, action, conditions, and recent matching rule information (matched URL, resource type, etc.).
    * **Header Testing**: Manually select a language and send a request to the test service to directly view the actual request header sent by the browser.
    * **Customize `Accept - Language` String**: To customize the language preference, enter the full `Accept - Language` string and save it.
    * **Real-time Logs**: Receive and display log messages sent by the extension (including popup and background service) during runtime, helping to track code execution and issues.
    * **Common Issue Fixes**: Provides one-click operations, such as increasing rule priority to resolve potential conflicts with browser or other extension rules, or clearing and reapplying rules.
    * **Extension Diagnostic Information**: Displays the extension ID, version, Manifest configuration, permission status, and language settings and auto-switch state saved in local storage, providing comprehensive runtime information for the extension.

***

<div align="center">
Installation Guide
</div>

***

### Install from Chrome Web Store / Microsoft Edge Extensions Home (Not Published)

Currently, only installation from source code is supported.

Why? Because Google developers need an international payment credit card and $5.

### Install from Source Code

1.  **Download or Clone the Code**: Clone the project repository to your local computer. (Or download the ZIP from the release and unzip it)
    ```bash
    git clone https://github.com/ChuwuYo/MultiLangSwitcher.git
    ```
2.  **Open Browser Extensions Management**: Enter `chrome://extensions/` / `edge://extensions/` in the Chrome browser address bar and press Enter to go to the Extensions management page.
3.  **Enable Developer Mode**: Turn on the "Developer mode" switch in the top right corner of the page.
4.  **Load Unpacked Extension**: Click the "Load unpacked" button in the top left corner of the page and select the MultiLangSwitcher project folder you downloaded.
5.  **Complete**: The extension will be successfully added to the browser, and you can start using it.

***

<div align="center">
Usage
</div>

***

1.  **Open the Extension Popup**: Click the MultiLangSwitcher extension icon in the browser toolbar.
2.  **Select Preferred Language**: In the popup dropdown menu, select the language you want the browser to simulate.
3.  **Apply Settings**: Click the "Apply Changes" button at the bottom of the interface. Your settings will be saved and immediately applied to new network requests.
4.  **Verification and Debugging**: Click the "Detection Page" or "Debugging Tools" links provided in the popup to verify if the language settings are effective, or to diagnose issues when they occur.

***

<div align="center">
File Structure
</div>

***

* `manifest.json`: Defines the basic information, permissions (including `storage` for saving settings, `declarativeNetRequest` for modifying request headers, `tabs` for detecting page URLs to implement automatic language switching by domain), and configuration of the extension.
* `popup.html` / `popup.js`: Implements the extension popup interface and interaction logic, including manual language switching and the toggle switch for automatic language switching by domain.
* `background.js`: Runs as a Service Worker in the background, handling extension lifecycle events (such as installation, startup), rule initialization and application, listening for storage changes, and implementing the core logic for automatic language switching by domain (including parsing domains, matching rules, updating request headers). Contains the `domainLanguageRules` object for defining domain-to-language mappings.
* `rules.json`: Contains static rules file; this project mainly manages language settings through dynamic rules.
* `test-headers.html` / `test-headers.js`: Page and script for testing browser language and fingerprinting information.
* `debug.html` / `debug-ui.js` / `debug-headers.js`: Implements the debugging page and its functions, helping to diagnose issues and view extension status.
* `images/`: Stores extension icon files.
* `typefaces/`: Stores font files used by the project.
* `README.md`: The project's documentation in Chinese.
* `README_EN.md`: The project's documentation in English.

***

<div align="center">
Thanks to Contributors
</div>

<div align="center">
<a href="https://github.com/ChuwuYo/MultiLangSwitcher/graphs/contributors" target="_blank">
  <img src="https://contrib.rocks/image?repo=ChuwuYo/MultiLangSwitcher" alt="Contributors" />
</a>
</div>
