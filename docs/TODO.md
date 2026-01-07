## 🔧 TODO

#### 性能优化

##### DocumentFragment 批量 DOM 更新优化
**目标**: 减少页面 reflow 次数，提升 DOM 操作性能

###### Phase 1: 关键优化 (高优先级 🔴)
- [x] **popup.js - showUpdateError()** (行495-526)
  - 最多5次 appendChild，改用 DocumentFragment
  - 影响: 更新错误显示和重试功能
  
- [x] **popup.js - performHeaderCheck()** 成功分支 (行214-219)
  - 3次 appendChild (Accept-Language 显示)
  - 影响: 请求头快速检查成功时的显示
  
- [x] **popup.js - performHeaderCheck()** 失败分支 (行228-235)
  - 3次 appendChild (错误 + 外部链接)
  - 影响: 所有检测点失败时的显示
  
- [x] **popup.js - performHeaderCheck()** 异常分支 (行240-247)
  - 3次 appendChild (错误 + 外部链接)
  - 影响: 检测异常时的显示

###### Phase 2: 中等优化 (建议修复 🟡)
- [x] **detect.js - fetchAndDisplayHeaders()** 失败分支 (行363-376)
  - 3次 appendChild (警告 + 外部链接)
  - 影响: 检测页面未找到 Accept-Language 时
  
- [x] **detect.js - fetchAndDisplayHeaders()** 错误分支 (行391-410)
  - 4次 appendChild (错误信息 + 详情 + 外部链接)
  - 影响: 检测页面所有尝试失败时
  
- [x] **debug-ui.js - testHeaderBtn** 失败分支 (行286-325)
  - 最多6次 appendChild
  - 影响: 调试页面请求头测试失败时
  
- [x] **debug-ui.js - testHeaderBtn** 异常分支 (行368-387)
  - 4次 appendChild
  - 影响: 调试页面请求头测试异常时

- [x] **debug-ui.js - testDomainCache()** (行970-1013)
  - 最多7次 appendChild
  - 影响: 调试页面域名缓存测试结果显示

###### Phase 3: innerHTML 模板优化 (可选 🟢)
- [ ] **popup.js** - 更新通知相关 (4处)
  - 行554-561: showUpdateLoadingState()
  - 行584-601: showUpdateNotification() 回退模式
  - 行639: showUpdateNotification() 更新可用
  - 行644-654: showUpdateNotification() 无更新
  
- [ ] **detect.js** - 检测结果显示 (17处)
  - Canvas/WebGL/Audio/Intl/WebRTC/Fingerprint 检测
  - 虽然安全(仅 i18n 文本)，但用 DocumentFragment 更现代
  
- [ ] **debug-ui.js** - 调试信息显示 (9处)
  - 规则显示、诊断信息等
  - 使用 DocumentFragment 替代 innerHTML 模板

###### 示例
popup.js
Comment on lines +495 to +526  为了进一步提升性能，建议使用 DocumentFragment 来批量更新DOM。这样可以将多次 appendChild 操作合并为一次，从而减少DOM操作次数，避免不必要的页面重排（reflow），使代码更高效。

    updateErrorMessage.innerHTML = '';
    const fragment = document.createDocumentFragment();
    
    // 添加主要错误消息
    fragment.appendChild(document.createTextNode(message));
    
    // 如果提供了回退建议，则添加
    if (fallbackMessage) {
      fragment.appendChild(document.createElement('br'));
      const small = document.createElement('small');
      small.className = 'text-muted mt-1';
      small.textContent = fallbackMessage;
      fragment.appendChild(small);
    }
    
    // 如果适用，添加重试选项
    if (showRetryOption) {
      fragment.appendChild(document.createElement('br'));
      const smallContainer = document.createElement('small');
      smallContainer.className = 'mt-2';
      
      const retryLink = document.createElement('a');
      retryLink.href = '#';
      retryLink.className = 'text-primary';
      retryLink.textContent = popupI18n.t('retry_update_check');
      retryLink.addEventListener('click', (e) => {
        e.preventDefault();
        debouncedUpdateCheck();
      });
      
      smallContainer.appendChild(retryLink);
      fragment.appendChild(smallContainer);
    }
    updateErrorMessage.appendChild(fragment);


#### 代码结构
- [ ] 考虑将 background.js 拆分为多个模块
- [ ] 统一错误处理模式，避免重复的 try-catch 块
- [ ] 简化消息传递机制，减少冗余的响应检查