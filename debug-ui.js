// debug-ui.js - 调试页面UI交互脚本

document.addEventListener('DOMContentLoaded', function () {
  // 显示当前规则和匹配的规则详情
  document.getElementById('showRulesBtn').addEventListener('click', function () {
    const resultElement = document.getElementById('rulesResult');
    resultElement.innerHTML = '正在获取规则信息...';

    // 获取动态规则
    chrome.declarativeNetRequest.getDynamicRules(function (rules) {
      let html = '<h5>动态规则:</h5>';

      if (rules.length === 0) {
        html += '<p class="error">没有发现动态规则!</p>';
      } else {
        html += '<ul>';
        rules.forEach(rule => {
          let priorityClass = rule.priority < 100 ? 'error' : 'success';
          html += `<li>规则ID: ${rule.id}, 优先级: <span class="${priorityClass}">${rule.priority}</span></li>`;
          html += `<li>操作: ${rule.action.type}</li>`;
          if (rule.action.requestHeaders) {
            html += `<li>修改头:`;
            html += '<ul>';
            rule.action.requestHeaders.forEach(header => {
              html += `<li>${header.header}: ${header.value} (操作: ${header.operation})</li>`;
            });
            html += '</ul></li>';
          }
          if (rule.condition) {
            html += `<li>条件:`;
            html += '<ul>';
            if (rule.condition.urlFilter) html += `<li>URL 过滤: <code>${rule.condition.urlFilter}</code></li>`;
            if (rule.condition.resourceTypes && rule.condition.resourceTypes.length > 0) {
              html += `<li>资源类型: ${rule.condition.resourceTypes.join(', ')}</li>`;
            }
            html += '</ul></li>';
          }
          html += '<hr>'; // 分隔不同规则
        });
        html += '</ul>';
      }

      // 获取最近匹配的规则信息
      chrome.declarativeNetRequest.getMatchedRules({}, function (matchedRules) {
        html += '<h5>最近匹配的规则:</h5>';
        if (matchedRules && matchedRules.rulesMatchedInfo && matchedRules.rulesMatchedInfo.length > 0) {
          html += '<ul>';
          matchedRules.rulesMatchedInfo.forEach(info => {
            // 提取并显示匹配规则和请求的更多细节
            // info 对象包含 rule 和 request 属性
            html += `<li>`;
            html += `规则集ID: ${info.rule.rulesetId ? info.rule.rulesetId : '动态规则'}, 规则ID: ${info.rule.ruleId}`;
            if (info.request) {
              html += `<div class="matched-rule-detail">`;
              html += `匹配的 URL: <code>${info.request.url}</code><br>`;
              html += `资源类型: ${info.request.resourceType}`;
              // 可以根据需要添加更多 info.request 的属性
              html += `</div>`;
            }
            html += '</li>';
            html += '<hr>'; // 分隔不同匹配项
          });
          html += '</ul>';
          html += '<p class="text-muted">注意：这里显示的是最近一次或几次页面加载中匹配到的规则，不一定是全部规则匹配历史。</p>';
        } else {
          html += '<p>最近没有匹配到规则</p>';
        }

        resultElement.innerHTML = html;
      });
    });
  });

  // 实时日志功能
  const logOutput = document.getElementById('logOutput');
  const clearLogsBtn = document.getElementById('clearLogsBtn');

  // 添加日志消息到UI
  function addLogMessage(message, logType = 'info') {
    const logElement = document.createElement('div');
    logElement.classList.add(`log-${logType}`);
    logElement.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    logOutput.appendChild(logElement);
    // 自动滚动到底部
    logOutput.scrollTop = logOutput.scrollHeight;
  }

  // 监听来自扩展其他部分的日志消息
  chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.type === 'DEBUG_LOG') {
      addLogMessage(request.message, request.logType);
    }
  });

  // 清除日志按钮功能
  clearLogsBtn.addEventListener('click', function () {
    logOutput.innerHTML = ''; // 清空日志输出区域
  });

  // 调试页面加载时发送一条日志
  addLogMessage('调试日志已启动', 'info');


  // 测试请求头
  document.getElementById('testHeaderBtn').addEventListener('click', async function () {
    const language = document.getElementById('testLanguage').value;
    const resultElement = document.getElementById('headerTestResult');
    resultElement.innerHTML = `正在测试语言 "${language}" 的请求头... (将尝试多个检测点)`;
    addLogMessage(`开始测试请求头，语言: ${language}`, 'info');

    const timestamp = new Date().getTime();
    const testUrls = [
      `https://httpbin.org/headers?_=${timestamp}`,
      `https://postman-echo.com/headers?_=${timestamp}`
      // 您可以添加更多测试URL
    ];

    let foundAcceptLanguage = null;
    let allRequestsFailed = true;
    let lastError = null;
    let receivedHeaders = null; // 用于存储第一个成功请求的头信息

    const fetchPromises = testUrls.map(url =>
      fetch(url, { cache: 'no-store', credentials: 'omit' })
        .then(response => {
          if (!response.ok) {
            throw new Error(`HTTP错误! 状态: ${response.status} 从 ${url}`);
          }
          return response.json();
        })
        .then(data => {
          allRequestsFailed = false; // 至少有一个请求成功
          if (!receivedHeaders) receivedHeaders = data.headers; // 保存第一个成功的头信息
          if (data.headers && data.headers['Accept-Language']) {
            if (!foundAcceptLanguage) { // 只记录第一个找到的
              foundAcceptLanguage = data.headers['Accept-Language'];
            }
          }
          return { success: true, data }; // 返回成功标记和数据
        })
        .catch(error => {
          lastError = error; // 记录最后一个错误
          addLogMessage(`请求 ${url} 失败: ${error.message}`, 'warning');
          return { success: false, error }; // 返回失败标记和错误
        })
    );

    // 等待所有请求完成
    await Promise.all(fetchPromises);

    let html = '';

    if (receivedHeaders) {
        html += '<h5>最近一次成功收到的请求头 (来自首个成功响应的检测点):</h5>';
        html += `<pre>${JSON.stringify(receivedHeaders, null, 2)}</pre>`;
    }

    if (foundAcceptLanguage) {
      const acceptLanguageValue = foundAcceptLanguage.toLowerCase();
      const expectedLanguage = language.toLowerCase();

      if (acceptLanguageValue.includes(expectedLanguage)) {
        html += `<p class="success">✓ 请求头已成功更改! 检测到的值: ${foundAcceptLanguage}</p>`;
        addLogMessage(`请求头测试成功: Accept-Language 为 ${foundAcceptLanguage}`, 'success');
      } else {
        html += `<p class="error">✗ 请求头未成功更改!</p>`;
        html += `<p>预期包含: ${expectedLanguage}, 实际检测到: ${acceptLanguageValue}</p>`;
        html += '<p>请自行跳转到 <a href="https://webcha.cn/" target="_blank">https://webcha.cn/</a> 或 <a href="https://www.browserscan.net/zh" target="_blank">https://www.browserscan.net/zh</a> 进行查看。</p>';
        addLogMessage(`请求头测试失败: Accept-Language 未按预期设置. 预期包含: ${expectedLanguage}, 实际: ${acceptLanguageValue}`, 'error');
      }
    } else if (allRequestsFailed) {
      html += `<p class="error">✗ 所有测试请求均失败。</p>`;
      if (lastError) {
        html += `<p class="error">最后一次错误: ${lastError.message}</p>`;
      }
      html += '<p>请检查您的网络连接，或尝试自行跳转到 <a href="https://webcha.cn/" target="_blank">https://webcha.cn/</a> 或 <a href="https://www.browserscan.net/zh" target="_blank">https://www.browserscan.net/zh</a> 进行查看。</p>';
      addLogMessage('请求头测试失败: 所有检测点均未能成功获取请求头.', 'error');
    } else {
      // 请求成功，但未检测到 Accept-Language
      html += '<p class="error">✗ 未在任何检测点检测到Accept-Language请求头!</p>';
      html += '<p>请自行跳转到 <a href="https://webcha.cn/" target="_blank">https://webcha.cn/</a> 或 <a href="https://www.browserscan.net/zh" target="_blank">https://www.browserscan.net/zh</a> 进行查看。</p>';
      addLogMessage('请求头测试失败: 未检测到 Accept-Language 请求头.', 'error');
    }

    resultElement.innerHTML = html;
  });

  // 修复规则优先级
  document.getElementById('fixPriorityBtn').addEventListener('click', function () {
    const resultElement = document.getElementById('fixResult');
    resultElement.innerHTML = '正在修复规则优先级...';
    addLogMessage('尝试修复规则优先级...', 'info'); // 记录操作

    chrome.declarativeNetRequest.getDynamicRules(function (existingRules) {
      const existingRuleIds = existingRules.map(rule => rule.id);
      const updatedRules = existingRules.map(rule => {
        return {
          ...rule,
          priority: 100 // 设置更高优先级
        };
      });

      chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: existingRuleIds,
        addRules: updatedRules
      }, function () {
        if (chrome.runtime.lastError) {
          resultElement.innerHTML = `<p class="error">修复失败: ${chrome.runtime.lastError.message}</p>`;
          addLogMessage(`修复规则优先级失败: ${chrome.runtime.lastError.message}`, 'error'); // 记录失败
        } else {
          resultElement.innerHTML = '<p class="success">规则优先级已成功更新为100</p>';
          addLogMessage('规则优先级已成功更新为100.', 'success'); // 记录成功
        }
      });
    });
  });

  // 清除并重新应用规则
  document.getElementById('clearAllRulesBtn').addEventListener('click', function () {
    const resultElement = document.getElementById('fixResult');
    resultElement.innerHTML = '正在清除所有动态规则并重新应用...';
    addLogMessage('尝试清除所有动态规则并重新应用...', 'info'); // 记录操作

    chrome.declarativeNetRequest.getDynamicRules(function (existingRules) {
      const existingRuleIds = existingRules.map(rule => rule.id);

      chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: existingRuleIds
      }, function () {
        if (chrome.runtime.lastError) {
          resultElement.innerHTML = `<p class="error">清除失败: ${chrome.runtime.lastError.message}</p>`;
          addLogMessage(`清除规则失败: ${chrome.runtime.lastError.message}`, 'error'); // 记录失败
        } else {
          // 清除成功后，重新应用默认或存储的规则
          chrome.storage.local.get(['currentLanguage'], function (result) {
            const languageToApply = result.currentLanguage || 'zh-CN'; // 使用存储的或默认语言
            // 发送消息给 background.js 请求更新规则
            chrome.runtime.sendMessage({ type: 'UPDATE_RULES', language: languageToApply }, function (response) {
              if (chrome.runtime.lastError) {
                resultElement.innerHTML = `<p class="error">重新应用规则时出错: ${chrome.runtime.lastError.message}</p>`;
                addLogMessage(`请求后台重新应用规则失败: ${chrome.runtime.lastError.message}`, 'error');
              } else if (response && response.status === 'success') {
                resultElement.innerHTML = `<p class="success">所有规则已清除，并已重新应用语言: ${languageToApply}</p>`;
                addLogMessage(`规则已清除并重新应用语言: ${languageToApply}`, 'success');
              } else if (response && response.status === 'error') {
                resultElement.innerHTML = `<p class="error">后台重新应用规则失败: ${response.message}</p>`;
                addLogMessage(`后台重新应用规则失败: ${response.message}`, 'error');
              } else {
                resultElement.innerHTML = `<p class="warning">后台未明确响应成功或失败。</p>`;
                addLogMessage('后台未明确响应成功或失败。', 'warning');
              }
            });
          });
        }
      });
    });
  });

  // 应用自定义语言设置
  document.getElementById('applyCustomLangBtn').addEventListener('click', function () {
    const customLangInput = document.getElementById('customLanguageInput');
    const customLangResult = document.getElementById('customLangResult');
    const languageString = customLangInput.value.trim();

    customLangResult.innerHTML = ''; // 清除旧结果

    if (!languageString) {
      customLangResult.innerHTML = '<p class="error">请输入有效的语言字符串。</p>';
      addLogMessage('尝试应用自定义语言，但输入为空。', 'warning');
      customLangInput.classList.add('is-invalid');
      return;
    }

    // 简单的格式验证 (可以根据需要增强)
    // 例如，检查是否包含不允许的字符，或者是否大致符合逗号分隔的模式
    // 这里只做非空检查
    customLangInput.classList.remove('is-invalid'); // 移除之前的错误状态

    customLangResult.innerHTML = `正在应用自定义语言: ${languageString}...`;
    addLogMessage(`尝试应用自定义语言: ${languageString}`, 'info');

    // 发送消息到 background.js 请求更新规则
    chrome.runtime.sendMessage({ type: 'UPDATE_RULES', language: languageString }, function (response) {
      if (chrome.runtime.lastError) {
        customLangResult.innerHTML = `<p class="error">应用自定义语言失败: ${chrome.runtime.lastError.message}</p>`;
        addLogMessage(`应用自定义语言失败: ${chrome.runtime.lastError.message}`, 'error');
      } else if (response && response.status === 'success') {
        customLangResult.innerHTML = `<p class="success">✓ 自定义语言已成功应用: ${languageString}</p>`;
        addLogMessage(`自定义语言已成功应用: ${languageString}`, 'success');
        // 可选：更新存储中的语言，如果希望自定义设置持久化
        // chrome.storage.local.set({ currentLanguage: languageString });
      } else if (response && response.status === 'error') {
        customLangResult.innerHTML = `<p class="error">✗ 应用自定义语言失败: ${response.message}</p>`;
        addLogMessage(`后台应用自定义语言失败: ${response.message}`, 'error');
      } else {
        customLangResult.innerHTML = `<p class="warning">后台未明确响应成功或失败。</p>`;
        addLogMessage('后台未明确响应自定义语言应用的成功或失败。', 'warning');
      }
    });
  });

  // 显示诊断信息
  document.getElementById('showDiagnosticsBtn').addEventListener('click', function () {
    const resultElement = document.getElementById('diagnosticsResult');
    resultElement.innerHTML = '正在收集诊断信息...';
    addLogMessage('尝试显示诊断信息...', 'info'); // 记录操作

    let html = '';
    try {
      html = '<h5>扩展信息:</h5>';
      html += `<p>扩展ID: ${chrome.runtime.id}</p>`;

      // 获取清单文件信息
      const manifest = chrome.runtime.getManifest();
      html += '<h5>清单文件信息:</h5>';
      html += `<p>名称: ${manifest.name}</p>`;
      html += `<p>版本: ${manifest.version}</p>`;
      if (manifest.permissions) {
        html += `<p>权限:</p><ul>`;
        manifest.permissions.forEach(permission => {
          html += `<li>${permission}</li>`;
        });
        html += '</ul>';
      } else {
        html += '<p>未声明权限.</p>';
      }

      // 检查declarativeNetRequest配置
      if (manifest.declarative_net_request) {
        html += '<h5>declarativeNetRequest 配置:</h5>';
        const ruleResources = manifest.declarative_net_request.rule_resources;
        if (ruleResources && ruleResources.length > 0) {
          html += '<ul>';
          ruleResources.forEach(resource => {
            // 注意：静态规则的 enabled 状态在 manifest.json 中定义，运行时通常不可直接修改或读取其当前生效状态。
            // 这里显示的是 manifest 中定义的默认状态。
            const enabledStatus = resource.enabled === false ? '<span class="success">禁用 (manifest)</span>' : '<span class="error">启用 (manifest)</span>';
            html += `<li>规则集ID: ${resource.id}, 路径: ${resource.path}, 状态: ${enabledStatus}</li>`;
          });
          html += '</ul>';
        } else {
          html += '<p>未找到静态规则集配置.</p>';
        }
        // 'reason' 字段已弃用，但仍可检查以兼容旧版
        if (manifest.declarative_net_request.hasOwnProperty('reason')) {
          html += `<p>原因 (Reason): ${manifest.declarative_net_request.reason}</p>`;
        }
      } else {
        html += '<p>未找到 declarativeNetRequest 配置.</p>';
      }

      // 获取存储的语言设置 (移入 try 块，确保在 manifest 读取成功后执行)
      chrome.storage.local.get(['currentLanguage'], function (result) {
        try {
          if (chrome.runtime.lastError) {
            throw new Error(`获取存储失败: ${chrome.runtime.lastError.message}`);
          }
          html += '<h5>存储的语言设置:</h5>';
          if (result.currentLanguage) {
            html += `<p>当前语言: ${result.currentLanguage}</p>`;
            addLogMessage(`诊断信息: 存储的语言设置为 ${result.currentLanguage}.`, 'info'); // 记录信息
          } else {
            html += '<p class="warning">未找到存储的语言设置 (可能使用默认值)</p>';
            addLogMessage('诊断信息: 未找到存储的语言设置.', 'warning'); // 记录警告
          }
          resultElement.innerHTML = html;
          addLogMessage('诊断信息显示完成.', 'info'); // 记录完成
        } catch (storageError) {
          console.error('收集诊断信息时出错 (storage):', storageError);
          addLogMessage(`收集诊断信息时出错 (storage): ${storageError.message}`, 'error');
          resultElement.innerHTML = `<p class="error">收集存储信息时出错: ${storageError.message}</p>`;
        }
      });

    } catch (error) {
      console.error('收集诊断信息时出错 (manifest/id):', error);
      addLogMessage(`收集诊断信息时出错 (manifest/id): ${error.message}`, 'error');
      resultElement.innerHTML = `<p class="error">收集基本信息时出错: ${error.message}</p>`;
    }
  });

}); // DOMContentLoaded 结束

// 禁用静态规则说明
document.getElementById('disableStaticRulesBtn').addEventListener('click', function () {
  const resultElement = document.getElementById('fixResult');
  resultElement.innerHTML = '<p class="error">此功能需要修改manifest.json文件，无法在运行时完成</p>';
  resultElement.innerHTML += '<p>请按照以下步骤手动修改:</p>';
  resultElement.innerHTML += '<ol>';
  resultElement.innerHTML += '<li>打开manifest.json文件</li>';
  resultElement.innerHTML += '<li>找到 "declarative_net_request" 部分</li>';
  resultElement.innerHTML += '<li>在 rule_resources 中找到对应的规则集</li>';
  resultElement.innerHTML += '<li>将该规则集的 "enabled" 值从 true 改为 false</li>';
  resultElement.innerHTML += '<li>保存文件并重新加载扩展</li>';
  resultElement.innerHTML += '</ol>';
  resultElement.innerHTML += '<p>示例:</p>';
  resultElement.innerHTML += '<pre>"declarative_net_request": {\n  "rule_resources": [{\n    "id": "ruleset_1",\n    "enabled": false, // 将这里改为 false\n    "path": "rules.json"\n  }]\n}</pre>';
  addLogMessage('显示禁用静态规则说明.', 'info'); // 记录操作
});