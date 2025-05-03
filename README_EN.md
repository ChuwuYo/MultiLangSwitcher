<div align="center">
    <img src="images/icon128.png" alt="MultiLangSwitcher Icon" width="150" height="150"> <h1>MultiLangSwitcher</h1>
    <a href="https://github.com/ChuwuYo/MultiLangSwitcher/blob/main/README.md">简体中文</a> | <a href="https://github.com/ChuwuYo/MultiLangSwitcher/blob/main/README_EN.md">English</a> </div>

---

<div align="center">
Project Overview
</div>

---

MultiLangSwitcher is a Chrome browser extension that helps users quickly switch the `Accept-Language` HTTP request header sent by the browser.

The extension utilizes the efficient `chrome.declarativeNetRequest` API to modify the request header, ensuring performance and privacy.

<div align="center">
    <img src="https://github.com/user-attachments/assets/5d52f0a5-d012-4a5b-9884-ed839f8b400b" alt="MultiLangSwitcher Home">

</div>

---

At the same time, it is recommended to set the browser language settings as shown in the figure, this can confuse some simple navigators. languages detection.

<div align="center">
    <img src="https://github.com/user-attachments/assets/77b5a1e7-da33-4b36-a522-60ab6341a126" alt="Suggestion">

</div>

***

<div align="center">
Features
</div>

***

* **Quick Language Switching**: Provides a rich language list through the browser toolbar popup interface for you to choose and apply.
* **Persistent Settings**: Your last selected language preference will be automatically saved and loaded and applied each time the browser starts.
* **Efficient Header Modification**: Utilizes the `declarativeNetRequest` API to directly modify the request header, which is more efficient and does not affect performance compared to the WebRequest API.
* **Automatic Background Application**: The extension automatically reads and applies the saved language settings when the browser starts and when it is installed/updated.
* **Comprehensive Test Page**: Provides a `/test-headers.html` page to intuitively verify whether the `Accept-Language` header has been successfully changed, and to detect the language preferences exposed by the browser (`navigator.language`, `navigator.languages`), internationalization API (Intl), and other information. It also includes detection of WebRTC local IP leakage and possible browser fingerprinting information such as Canvas, WebGL, AudioContext, etc., helping you understand and control the information exposed by the browser.
* **Powerful Debugging Tools**: Provides an independent `/debug.html` page containing the following diagnostic and repair tools:
    * **Rule Information**: View the details of the dynamic rules currently set by the extension through `declarativeNetRequest`, including rule ID, priority, action, conditions, and recent matching rule information (matched URL, resource type, etc.).
    * **Header Testing**: Manually select a language and send a request to the test service to directly view the actual request header sent by the browser.
    * **Real-time Logs**: Receive and display log messages sent by the extension (including popup and background service) during runtime, helping to track code execution and issues.
    * **Common Issue Fixes**: Provides one-click operations, such as increasing rule priority to resolve potential conflicts with browser or other extension rules, or clearing and reapplying rules.
    * **Extension Diagnostic Information**: Displays the extension ID, version, Manifest configuration, permission status, and language settings saved in local storage, providing comprehensive runtime information for the extension.

***

<div align="center">
Installation Guide
</div>

***

### Install from Chrome Web Store (Not Published)

Currently, only installation from source code is supported.

### Install from Source Code

1.  **Download or Clone the Code**: Clone the project repository to your local computer. (Or download the ZIP from the release and unzip it)
    ```bash
    git clone https://github.com/ChuwuYo/MultiLangSwitcher.git
    ```
2.  **Open Chrome Extensions Management**: Enter `chrome://extensions/` in the Chrome browser address bar and press Enter to go to the Extensions management page.
3.  **Enable Developer Mode**: Turn on the "Developer mode" switch in the top right corner of the page.
4.  **Load Unpacked Extension**: Click the "Load unpacked" button in the top left corner of the page and select the MultiLangSwitcher project folder you downloaded.
5.  **Complete**: The extension will be successfully added to the Chrome browser, and you can start using it.

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

* `manifest.json`: Defines the basic information, permissions, and configuration of the extension.
* `popup.html` / `popup.js`: Implements the extension popup interface and interaction logic.
* `background.js`: Runs as a Service Worker in the background, handling extension lifecycle events and rule initialization application.
* `rules.json`: Contains static rules file, this project mainly manages language settings through dynamic rules.
* `test-headers.html` / `test-headers.js`: Page and script for testing browser language and fingerprinting information.
* `debug.html` / `debug-ui.js` / `debug-headers.js`: Implements the debugging page and its functions.
* `images/`: Stores extension icon files.
* `typefaces/`: Stores font files used by the project.

***

<div align="center">
Thanks to Contributors
</div>

<div align="center">
<a href="https://github.com/ChuwuYo/MultiLangSwitcher/graphs/contributors" target="_blank">
  <img src="https://contrib.rocks/image?repo=ChuwuYo/MultiLangSwitcher" alt="Contributors" />
</a>
</div>
