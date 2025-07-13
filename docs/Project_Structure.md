# 项目结构

```
MultiLangSwitcher/
├── LICENSE                         - 许可证文件
├── README.md                       - 项目说明文档
├── _locales/                       - 扩展描述的国际化目录
│   ├── en/                         - 英文语言包
│   └── zh/                         - 中文语言包
├── docs/                           - 项目文档目录
│   └── README/                     - 多语言说明文档
├── shared/                         - 共享资源目录
│   ├── shared-actions.js           - 共享常量定义
│   ├── shared-utils.js             - 共享工具函数
│   └── shared-language-options.js  - 共享语言选项列表
├── fonts/                          - 字体资源目录
├── i18n/                           - 国际化文本资源目录
│   ├── background-en.js            - 后台页面英文文本
│   ├── background-i18n.js          - 后台页面国际化配置
│   ├── background-zh.js            - 后台页面中文文本
│   ├── domain-manager-en.js        - 域名管理页面英文文本
│   ├── domain-manager-i18n.js      - 域名管理页面国际化配置
│   ├── domain-manager-zh.js        - 域名管理页面中文文本
│   ├── debug-en.js                 - 调试页面英文文本
│   ├── debug-i18n.js               - 调试页面国际化配置
│   ├── debug-zh.js                 - 调试页面中文文本
│   ├── popup-en.js                 - 弹窗页面英文文本
│   ├── popup-i18n.js               - 弹窗页面国际化配置
│   ├── popup-zh.js                 - 弹窗页面中文文本
│   ├── test-en.js                  - 测试页面英文文本
│   ├── test-i18n.js                - 测试页面国际化配置
│   └── test-zh.js                  - 测试页面中文文本
├── images/                         - 图片资源目录
├── manifest.json                   - 扩展配置清单文件
├── .gitignore                      - Git 忽略文件
├── popup.html                      - 扩展弹窗页面
├── popup.js                        - 弹窗交互逻辑脚本
├── test-headers.html               - 请求头测试页面
├── test-headers.js                 - 请求头测试脚本
├── toggle.css                      - 切换按钮样式文件
├── toggle.js                       - 切换按钮交互脚本
├── domain-rules-manager.js         - 域名规则管理模块
├── domain-rules.json               - 域名规则配置文件
├── background.js                   - 扩展后台运行脚本
├── bootstrap.min.css               - Bootstrap CSS框架
├── debug-headers.js                - 调试页面请求头处理脚本
├── debug-ui.js                     - 调试页面UI交互脚本
└── debug.html                      - 扩展调试工具页面
```