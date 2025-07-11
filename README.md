<div align="center">
    <img src="images/icon128.png" alt="MultiLangSwitcher Icon" width="150" height="150"> <h1>MultiLangSwitcher</h1>
    <a href="README.md">简体中文</a> | <a href="docs/README/README_EN.md">English</a> </div>

---

<div align="center">
项目概述

 <a href="https://deepwiki.com/ChuwuYo/MultiLangSwitcher"><img src="https://deepwiki.com/badge.svg" alt="Ask DeepWiki"></a>

</div>

---

MultiLangSwitcher 是一个 Chromium 内核浏览器扩展，帮助用户快速切换浏览器发送的 `Accept-Language` HTTP 请求头。用户也可以在调试工具页面自定义完整的 `Accept - Language` 字符串。

扩展利用 `chrome.declarativeNetRequest` API 来修改请求头，确保性能和隐私。

### 注意：本拓展不适用于通过检测IP地址来确定语言的网站。

页面样式采用Bootstrap框架。

如果拓展自带的请求头检测报错或不返回结果，可以自行跳转到 [浏览器检测](https://webcha.cn/) 、 [BrowserScan](https://www.browserscan.net/zh) 、 [header-echo](https://header-echo.addr.tools/) 进行查看。

如果需要切换浏览器UA可以看一下这个项目：[User-Agent Switcher and Manager](https://github.com/ray-lothian/UserAgent-Switcher)


<center>
    <table>
        <tr>
            <td>
                <img src="https://github.com/user-attachments/assets/e1ec3c75-d149-420d-a43c-adc48d1111fb" alt="CN_Light">
            </td>
            <td>
                <img src="https://github.com/user-attachments/assets/0e4a355d-5157-4873-b7f7-11173e1a79f7" alt="EN_Dark">
            </td>
        </tr>
    </table>
</center>

---

同时可以在浏览器语言设置中进行相应配置，这样可以混淆一些简单的 `navigator.languages` 检测。(但是也会提高您的浏览器指纹唯一性)

<div align="center">
    <img src="https://github.com/user-attachments/assets/c056e5ee-6c65-4786-98d4-ee33f4beef47" alt="Suggestion">
</div>

这是自定义 `Accept - Language` 字符串的演示。

<div align="center">
    <img src="https://github.com/user-attachments/assets/4136c601-5f02-467e-9f42-12eefb5a65dc" alt="Custom Accept-Language">
</div>

***

<div align="center">
功能特性
</div>

***

* **语言请求头切换**: 弹出界面选择语言，修改 `Accept-Language` 请求头
* **域名自动切换**: 根据访问域名自动应用对应语言设置
  - 支持顶级域名（如 `.cn`、`.jp`）和二级域名（如 `com.cn`、`co.jp`）
  - 内置域名规则覆盖主要国家和地区
  - 未匹配域名默认使用英语
* **设置持久化**: 语言偏好和自动切换状态保存到本地存储
* **高效请求头修改**: 使用 `declarativeNetRequest` API，性能优于 WebRequest API
* **后台自动应用**: 扩展启动时自动加载设置，支持错误重试机制
* **主题切换**: 支持明暗主题切换
* **检测页面**: `test-headers.html` 用于验证请求头修改效果，检测：
  - `Accept-Language` 请求头
  - JavaScript 语言偏好（`navigator.language`、`navigator.languages`）
  - 国际化 API (Intl) 信息
  - WebRTC 本地 IP 泄露
  - Canvas、WebGL、AudioContext 指纹信息
* **调试工具**: `debug.html` 提供调试和诊断功能：
  - 查看 `declarativeNetRequest` 动态规则详情
  - 多端点请求头测试
  - 自定义 `Accept-Language` 字符串（如 `en-US,en;q=0.9,zh-CN;q=0.8`）
  - 实时日志显示，支持分类过滤
  - 规则优先级修复、规则重建等问题修复
  - 扩展诊断信息（版本、权限、配置、存储状态）
  - 域名语言映射规则查看

***

<div align="center">
安装指南
</div>

***

### 从 Chrome Web Store / Microsoft Edge Extensions Home 安装 (未发布)

目前仅支持从源代码安装。

为什么？因为我没注册谷歌开发者

### 从源代码安装

1.  **下载或克隆代码**: 将本项目仓库克隆到您的本地计算机。(或者从release下载ZIP解压)
    ```bash
    git clone https://github.com/ChuwuYo/MultiLangSwitcher.git
    ```
2.  **打开浏览器扩展管理**: 在 Chrome 浏览器地址栏输入 `chrome://extensions/` / `edge://extensions/` 并回车，进入扩展程序管理页面。
3.  **开启开发者模式**: 打开页面右上角的“开发者模式”开关。
4.  **加载已解压的扩展程序**: 点击页面左上角的“加载已解压的扩展程序”按钮，选择您下载的 MultiLangSwitcher 项目文件夹。
5.  **完成**: 扩展程序将成功添加到浏览器中，您可以开始使用了。

***

<div align="center">
使用方法
</div>

***

1.  **打开扩展弹出页**: 点击浏览器工具栏上的 MultiLangSwitcher 扩展图标。
2.  **选择偏好语言**: 在弹出的下拉菜单中选择您希望浏览器模拟的语言。
3.  **应用设置**: 点击界面底部的“应用更改”按钮。您的设置将被保存，并立即应用于新的网络请求。
4.  **验证和调试**: 点击弹出页中提供的“检测页面”或“调试工具”链接，以验证语言设置是否生效，或在遇到问题时进行诊断。

***

<div align="center">
感谢贡献者（欢迎提交PR）
</div>

<div align="center">
<a href="https://github.com/ChuwuYo/MultiLangSwitcher/graphs/contributors" target="_blank">
  <img src="https://contrib.rocks/image?repo=ChuwuYo/MultiLangSwitcher" alt="Contributors" />
</a>
</div>
