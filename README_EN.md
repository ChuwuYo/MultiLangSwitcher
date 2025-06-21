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

* **Language Switching**: Popup interface for selecting languages and modifying `Accept-Language` request headers
* **Domain-Based Auto-Switching**: Automatically applies corresponding language settings based on visited domains
  - Supports top-level domains (e.g., `.cn`, `.jp`) and second-level domains (e.g., `com.cn`, `co.jp`)
  - Built-in domain rules covering major countries and regions
  - Defaults to English for unmatched domains
* **Persistent Settings**: Language preferences and auto-switch status saved to local storage
* **Efficient Header Modification**: Uses `declarativeNetRequest` API for better performance than WebRequest API
* **Background Auto-Application**: Extension automatically loads settings on startup with error retry mechanism
* **Theme Switching**: Support for light/dark theme switching
* **Detection Page**: `test-headers.html` for verifying request header modifications, detecting:
  - `Accept-Language` request headers
  - JavaScript language preferences (`navigator.language`, `navigator.languages`)
  - Internationalization API (Intl) information
  - WebRTC local IP leakage
  - Canvas, WebGL, AudioContext fingerprinting information
* **Debugging Tools**: `debug.html` provides debugging and diagnostic features:
  - View `declarativeNetRequest` dynamic rule details
  - Multi-endpoint request header testing
  - Custom `Accept-Language` strings (e.g., `en-US,en;q=0.9,zh-CN;q=0.8`)
  - Real-time log display with category filtering
  - Rule priority fixes and rule rebuilding
  - Extension diagnostic information (version, permissions, configuration, storage status)
  - Domain-language mapping rules viewer

***

<div align="center">
Installation Guide
</div>

***

### Install from Chrome Web Store / Microsoft Edge Extensions Home (Not Published)

Currently, only installation from source code is supported.

Why? Because I didn't register as a Google developer

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
Thanks to Contributors(Welcome to submit PRs)
</div>

<div align="center">
<a href="https://github.com/ChuwuYo/MultiLangSwitcher/graphs/contributors" target="_blank">
  <img src="https://contrib.rocks/image?repo=ChuwuYo/MultiLangSwitcher" alt="Contributors" />
</a>
</div>
