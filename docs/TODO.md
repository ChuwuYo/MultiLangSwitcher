## 🔧 TODO

#### 性能优化

## 1. 全局变量耦合严重
**文件**: `shared-i18n-base.js`, `domain-rules-manager.js`, `popup.js` 等

组件通过全局变量通信（如 `domainManagerI18n`, `popupI18n`, `sendDebugLog`），而不是通过依赖注入或参数传递：

```20:26:domain-rules-manager.js
ensureI18n() {
    if (!this.i18n && typeof domainManagerI18n !== "undefined") {
        this.i18n = domainManagerI18n;
    }
    return this.i18n;
}
```

## 2. 重复的语言状态管理
**文件**: `toggle.js` 和 `shared-i18n-base.js`

两个独立的语言管理逻辑：
- `LanguageToggle` 类自己管理 `currentLang` 和 localStorage
- `BaseI18n` 也管理 `currentLang` 和 localStorage

## 3. 环境判断方式过时
**文件**: `shared-i18n-base.js`

```73:91:shared-i18n-base.js
_detectLanguage() {
    if (!this.isServiceWorker && typeof localStorage !== "undefined") {
        // ...
    }
}
```

现代做法应该分离 Service Worker 和浏览器环境的代码，而不是用标志位判断。

## 4. 动态脚本加载方式过时
**文件**: `shared-i18n-base.js`

```138:160:shared-i18n-base.js
_loadScriptForBrowser(src) {
    return new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = src;
        // ...
        document.head.appendChild(script);
    });
}
```

应该使用 ES Module 动态导入 `import()` 替代创建 script 标签。

## 5. 协议兼容层说明历史债务
**文件**: `shared-actions.js`

```27:51:shared-actions.js
// 新协议：{ ok: true, data } / { ok: false, error }
if (response.ok === true) {
    return response.data;
}
// 兼容旧协议：status/success 字段混用
if (response?.status === "success") return response;
if (response?.success === true) return response;
```

## 6. i18n 回调风格设计过时
**文件**: `shared-i18n-base.js`

```207:213:shared-i18n-base.js
ready(callback) {
    const promise = this._initPromise || this.init();
    if (typeof callback === "function") {
        promise.then(callback);
    }
    return promise;
}
```

现代 JS 直接使用 Promise，不需要回调风格。

## 7. 单例模式过度使用
**文件**: `domain-rules-manager.js`, `background.js`

```279:281:domain-rules-manager.js
const domainRulesManager = new DomainRulesManager();
```

单例难以测试，且导出的是实例而非类，限制了灵活性。

## 8. 状态分散管理
全局状态分散在各处：
- `background.js`: `autoSwitchEnabled`, `isInitialized`
- `popup.js`: `updateCheckInProgress`, `updateCheckController`
- `domain-rules-manager.js`: `domainCache`

没有统一的状态管理方案。

#### i18n 系统重构（待完成）
- [ ] **统一 i18n 实例命名**：将 `debugI18n`/`popupI18n`/`detectI18n`/`backgroundI18n` 统一为 `appI18n`
  - **原因**：简化 `getFallbackTranslation` 中的实例检测逻辑，去除多层 typeof 判断
  - **涉及文件**：
    - `i18n/debug-i18n.js` - 修改实例变量名
    - `i18n/popup-i18n.js` - 修改实例变量名
    - `i18n/detect-i18n.js` - 修改实例变量名  
    - `i18n/background-i18n.js` - 修改实例变量名
    - `i18n/domain-manager-i18n.js` - 修改实例变量名
    - `popup.js` - 更新所有 `popupI18n` 引用
    - `debug-ui.js` - 更新所有 `debugI18n` 引用
    - `detect.js` - 更新所有 `detectI18n` 引用
    - `background.js` - 更新所有 `backgroundI18n` 引用
    - `shared/shared-utils.js` - 简化 `getFallbackTranslation` 为直接读取 `appI18n.currentLang`
  - **注意**：需确保所有页面加载顺序正确，避免变量冲突
