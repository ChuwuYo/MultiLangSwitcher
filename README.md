<div align="center">
    <img src="images/icon256.png" alt="MultiLangSwitcher Icon" width="150" height="150"> <h1>MultiLangSwitcher</h1>
    <a href="README.md">English</a> | <a href="docs/README/README.zh-CN.md">简体中文</a> </div>

---

<div align="center">

 <a href="https://deepwiki.com/ChuwuYo/MultiLangSwitcher"><img src="https://deepwiki.com/badge.svg" alt="Ask DeepWiki"></a>
 <a href="https://zread.ai/ChuwuYo/MultiLangSwitcher" target="_blank"><img src="https://img.shields.io/badge/Ask_Zread-_.svg?style=flat&color=00b0aa&labelColor=000000&logo=data%3Aimage%2Fsvg%2Bxml%3Bbase64%2CPHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTQuOTYxNTYgMS42MDAxSDIuMjQxNTZDMS44ODgxIDEuNjAwMSAxLjYwMTU2IDEuODg2NjQgMS42MDE1NiAyLjI0MDFWNC45NjAxQzEuNjAxNTYgNS4zMTM1NiAxLjg4ODEgNS42MDAxIDIuMjQxNTYgNS42MDAxSDQuOTYxNTZDNS4zMTUwMiA1LjYwMDEgNS42MDE1NiA1LjMxMzU2IDUuNjAxNTYgNC45NjAxVjIuMjQwMUM1LjYwMTU2IDEuODg2NjQgNS4zMTUwMiAxLjYwMDEgNC45NjE1NiAxLjYwMDFaIiBmaWxsPSIjZmZmIi8%2BCjxwYXRoIGQ9Ik00Ljk2MTU2IDEwLjM5OTlIMi4yNDE1NkMxLjg4ODEgMTAuMzk5OSAxLjYwMTU2IDEwLjY4NjQgMS42MDE1NiAxMS4wMzk5VjEzLjc1OTlDMS42MDE1NiAxNC4xMTM0IDEuODg4MSAxNC4zOTk5IDIuMjQxNTYgMTQuMzk5OUg0Ljk2MTU2QzUuMzE1MDIgMTQuMzk5OSA1LjYwMTU2IDE0LjExMzQgNS42MDE1NiAxMy43NTk5VjExLjAzOTlDNS42MDE1NiAxMC42ODY0IDUuMzE1MDIgMTAuMzk5OSA0Ljk2MTU2IDEwLjM5OTlaIiBmaWxsPSIjZmZmIi8%2BCjxwYXRoIGQ9Ik0xMy43NTg0IDEuNjAwMUgxMS4wMzg0QzEwLjY4NSAxLjYwMDEgMTAuMzk4NCAxLjg4NjY0IDEwLjM5ODQgMi4yNDAxVjQuOTYwMUMxMC4zOTg0IDUuMzEzNTYgMTAuNjg1IDUuNjAwMSAxMS4wMzg0IDUuNjAwMUgxMy43NTg0QzE0LjExMTkgNS42MDAxIDE0LjM5ODQgNS4zMTM1NiAxNC4zOTg0IDQuOTYwMVYyLjI0MDFDMTQuMzk4NCAxLjg4NjY0IDE0LjExMTkgMS42MDAxIDEzLjc1ODQgMS42MDAxWiIgZmlsbD0iI2ZmZiIvPgo8cGF0aCBkPSJNNCAxMkwxMiA0TDQgMTJaIiBmaWxsPSIjZmZmIi8%2BCjxwYXRoIGQ9Ik00IDEyTDEyIDQiIHN0cm9rZT0iI2ZmZiIgc3Ryb2tlLXdpZHRoPSIxLjUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPgo8L3N2Zz4K&logoColor=ffffff" alt="zread"/></a>
 <a href="https://app.fossa.com/projects/git%2Bgithub.com%2FChuwuYo%2FMultiLangSwitcher?ref=badge_shield" alt="FOSSA Status"><img src="https://app.fossa.com/api/projects/git%2Bgithub.com%2FChuwuYo%2FMultiLangSwitcher.svg?type=shield"/></a>
</div>

<div align="center">
Project Overview

</div>

---

MultiLangSwitcher is a Chromium-based browser extension that helps users quickly switch the `Accept-Language` HTTP request header sent by the browser. Users can also customize the full `Accept-Language` string on the debugging tools page.

The extension utilizes the `chrome.declarativeNetRequest` API to modify the request header, ensuring performance and privacy.

### Note: This extension is not suitable for websites that determine language based on IP address.

The website's layout and styling are built with Bootstrap.

If the built-in request header detection fails or returns no results, you can manually navigate to [BrowserScan](https://www.browserscan.net) or [header-echo](https://header-echo.addr.tools/) for further verification.

If you need to switch the browser UA, you can take a look at this project: [User-Agent Switcher and Manager](https://github.com/ray-lothian/UserAgent-Switcher)

<center>
    <table>
        <tr>
            <td>
                <img src="https://github.com/user-attachments/assets/b5f35aef-ef5a-4f9b-bcaa-d6e05ae3ccd3" alt="CN_Light">
            </td>
            <td>
                <img src="https://github.com/user-attachments/assets/acea080d-cf67-47ca-9989-144a334a602c" alt="EN_Dark">
            </td>
        </tr>
    </table>
</center>

---

Additionally, you can configure browser language settings as shown to confuse simple `navigator.languages` detection (though this will increase the uniqueness of your browser fingerprint).

<div align="center">
    <img src="https://github.com/user-attachments/assets/db34383a-f75a-4d6d-8237-99363823cb66" alt="Suggestion">
</div>

This is a demonstration of customizing the `Accept-Language` string.

<div align="center">
    <img src="https://github.com/user-attachments/assets/7af03711-2164-4f60-ada0-30c4d882be4a" alt="Custom Accept-Language">
</div>

***

<div align="center">
Features
</div>

***

* **Language Request Header Switching**: Popup interface for selecting languages and modifying `Accept-Language` request headers
* **Domain-Based Auto-Switching**: Automatically applies corresponding language settings based on visited domains
  - Supports top-level domains (e.g., `.cn`, `.jp`) and second-level domains (e.g., `com.cn`, `co.jp`)
  - Built-in domain rules covering major countries and regions
  - Defaults to English for unmatched domains
* **Persistent Settings**: Language preferences and auto-switch status saved to local storage
* **Efficient Header Modification**: Uses `chrome.declarativeNetRequest` API for better performance than the WebRequest API
* **Background Auto-Application**: Extension automatically loads settings on startup with error retry mechanism
* **Theme Switching**: Support for light/dark theme switching
* **Update Checker**: Automatically checks GitHub Releases for the latest version information
* **Reset Function**: One-click reset of the Accept-Language request header
* **Detection Page**: `detect.html` for verifying request header modifications, which detects:
  - `Accept-Language` request headers
  - JavaScript language preferences (`navigator.language`, `navigator.languages`)
  - Internationalization API (Intl) information
  - WebRTC local IP leakage
  - Canvas, WebGL, and AudioContext fingerprinting information
* **Debugging Tools**: `debug.html` provides debugging and diagnostic features, including:
  - View `declarativeNetRequest` dynamic rule details
  - Multi-endpoint request header testing
  - Custom `Accept-Language` strings (e.g., `en-US,en;q=0.9,zh-CN;q=0.8`)
  - Real-time log display with category filtering
  - Rule priority fixes and rule rebuilding
  - Extension diagnostic information (version, permissions, configuration, storage status)
  - Domain-language mapping rules viewer
  - Reset Accept-Language request header

***

<div align="center">
Installation Guide
</div>

***

### Install from Chrome Web Store / Microsoft Edge Extensions Home (Not Published)

Currently, only installation from source code is supported.

Note: This extension has not been published to the Chrome Web Store due to the developer not registering a Google developer account.

### Install from Source Code

1.  **Download or Clone the Code**: Clone the project repository to your local computer (Or download the ZIP from the release and unzip it)
    
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
Thanks to Contributors (Welcome to Submit PRs)
</div>

<div align="center">
<a href="https://github.com/ChuwuYo/MultiLangSwitcher/graphs/contributors" target="_blank">
  <img src="https://contrib.rocks/image?repo=ChuwuYo/MultiLangSwitcher" alt="Contributors" />
</a>
</div>

***

<div align="center">
License
</div>

***

<div align="center">

[![FOSSA Status](https://app.fossa.com/api/projects/git%2Bgithub.com%2FChuwuYo%2FMultiLangSwitcher.svg?type=large)](https://app.fossa.com/projects/git%2Bgithub.com%2FChuwuYo%2FMultiLangSwitcher?ref=badge_large)

</div>
