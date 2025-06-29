// debug-ui.js - 调试页面UI交互脚本

/**
 * 获取外部请求头检查网站的链接HTML
 * @param {string} prefix - 链接前缀文本
 * @returns {string} 包含外部检查链接的HTML
 */
function getExternalCheckLinks(prefix = debugI18n.t('please_visit')) {
  return `<p>${prefix} <a href="https://webcha.cn/" target="_blank">https://webcha.cn/</a> ${debugI18n.t('or')} <a href="https://www.browserscan.net/zh" target="_blank">https://www.browserscan.net/zh</a> ${debugI18n.t('to_view')}</p>`;
}

document.addEventListener('DOMContentLoaded', function () {
  // 显示当前规则和匹配的规则详情
  document.getElementById('showRulesBtn').addEventListener('click', function () {
    const resultElement = document.getElementById('rulesResult');
    resultElement.innerHTML = debugI18n.t('getting_rule_info');

    // 获取动态规则
    chrome.declarativeNetRequest.getDynamicRules(function (rules) {
      let html = `<h5>${debugI18n.t('dynamic_rules')}</h5>`;

      if (rules.length === 0) {
        html += `<p class="error">${debugI18n.t('no_dynamic_rules')}</p>`;
      } else {
        html += '<ul>';
        rules.forEach(rule => {
          let priorityClass = rule.priority < 100 ? 'error' : 'success';
          html += `<li>${debugI18n.t('rule_id')} ${rule.id}, ${debugI18n.t('priority')} <span class="${priorityClass}">${rule.priority}</span></li>`;
          html += `<li>${debugI18n.t('action')} ${rule.action.type}</li>`;
          if (rule.action.requestHeaders) {
            html += `<li>${debugI18n.t('modify_headers')}`;
            html += '<ul>';
            rule.action.requestHeaders.forEach(header => {
              html += `<li>${header.header}: ${header.value} (${debugI18n.t('operation')} ${header.operation})</li>`;
            });
            html += '</ul></li>';
          }
          if (rule.condition) {
            html += `<li>${debugI18n.t('conditions')}`;
            html += '<ul>';
            if (rule.condition.urlFilter) html += `<li>${debugI18n.t('url_filter')} <code>${rule.condition.urlFilter}</code></li>`;
            if (rule.condition.resourceTypes && rule.condition.resourceTypes.length > 0) {
              html += `<li>${debugI18n.t('resource_types')} ${rule.condition.resourceTypes.join(', ')}</li>`;
            }
            html += '</ul></li>';
          }
          html += '<hr>'; // 分隔不同规则
        });
        html += '</ul>';
      }

      // 获取最近匹配的规则信息
      chrome.declarativeNetRequest.getMatchedRules({}, function (matchedRules) {
        html += `<h5>${debugI18n.t('recent_matched_rules')}</h5>`;
        if (matchedRules && matchedRules.rulesMatchedInfo && matchedRules.rulesMatchedInfo.length > 0) {
          html += '<ul>';
          matchedRules.rulesMatchedInfo.forEach(info => {
            // 提取并显示匹配规则和请求的更多细节
            // info 对象包含 rule 和 request 属性
            html += `<li>`;
            html += `${debugI18n.t('ruleset_id')} ${info.rule.rulesetId ? info.rule.rulesetId : debugI18n.t('dynamic_rules').replace(':', '')}, ${debugI18n.t('rule_id')} ${info.rule.ruleId}`;
            if (info.request) {
              html += `<div class="matched-rule-detail">`;
              html += `${debugI18n.t('matched_url')} <code>${info.request.url}</code><br>`;
              html += `${debugI18n.t('resource_type')} ${info.request.resourceType}`;
              // 可以根据需要添加更多 info.request 的属性
              html += `</div>`;
            }
            html += '</li>';
            html += '<hr>'; // 分隔不同匹配项
          });
          html += '</ul>';
          html += `<p class="text-muted">${debugI18n.t('recent_match_note')}</p>`;
        } else {
          html += `<p>${debugI18n.t('no_recent_matches')}</p>`;
        }

        resultElement.innerHTML = html;
      });
    });
  });

  // 实时日志功能
  const logOutput = document.getElementById('logOutput');
  const clearLogsBtn = document.getElementById('clearLogsBtn');

  // 存储所有日志消息，以便过滤
  let allLogMessages = [];

  // 添加日志消息到UI
  // 增加函数级注释
  /**
   * 添加日志消息到UI并存储
   * @param {string} message - 日志消息内容
   * @param {string} logType - 日志类型 (info, warning, error, success)
   */
  function addLogMessage(message, logType = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = { timestamp, message, logType };
    allLogMessages.push(logEntry);
    renderLogs(); // 重新渲染日志以应用过滤
    // 自动滚动到底部
    logOutput.scrollTop = logOutput.scrollHeight;
  }

  // 根据当前过滤器渲染日志
  // 增加函数级注释
  /**
   * 根据当前选中的过滤器渲染日志到UI
   */
  function renderLogs() {
    logOutput.innerHTML = ''; // 清空当前显示
    const activeFilters = getActiveFilters();

    allLogMessages.forEach(logEntry => {
      if (activeFilters.includes(logEntry.logType)) {
        const logElement = document.createElement('div');
        logElement.classList.add(`log-${logEntry.logType}`);
        logElement.textContent = `[${logEntry.timestamp}] ${logEntry.message}`;
        logOutput.appendChild(logElement);
      }
    });
  }

  // 获取当前激活的过滤器
  // 增加函数级注释
  /**
   * 获取当前选中的日志类型过滤器
   * @returns {string[]} - 激活的日志类型数组
   */
  function getActiveFilters() {
    const filters = [];
    if (document.getElementById('filterInfo').checked) filters.push('info');
    if (document.getElementById('filterWarning').checked) filters.push('warning');
    if (document.getElementById('filterError').checked) filters.push('error');
    if (document.getElementById('filterSuccess').checked) filters.push('success');
    return filters;
  }

  // 监听来自扩展其他部分的日志消息
  chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.type === 'DEBUG_LOG') {
      addLogMessage(request.message, request.logType);
    }
  });

  // 清除日志按钮功能
  clearLogsBtn.addEventListener('click', function () {
    allLogMessages = []; // 清空存储的日志
    renderLogs(); // 渲染空日志列表
  });

  // 监听过滤器变化
  document.querySelectorAll('.form-check-input[id^="filter"]').forEach(checkbox => {
    checkbox.addEventListener('change', renderLogs);
  });

  // Send a log when debug page loads
  addLogMessage(debugI18n.t('debug_log_started'), 'info');
  // 初始渲染日志 (虽然此时allLogMessages是空的)
  renderLogs();


  // 测试请求头
  document.getElementById('testHeaderBtn').addEventListener('click', async function () {
    const language = document.getElementById('testLanguage').value;
    const resultElement = document.getElementById('headerTestResult');
    resultElement.innerHTML = `${debugI18n.t('testing_language_header')} "${language}" ${debugI18n.t('header_test_multiple')}`;
    addLogMessage(`${debugI18n.t('start_header_test')} ${language}`, 'info');

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
            throw new Error(`${debugI18n.t('http_error_status_from')} ${response.status} ${debugI18n.t('from')} ${url}`);
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
          addLogMessage(`${debugI18n.t('request_failed')} ${url} ${debugI18n.t('failed')} ${error.message}`, 'warning');
          return { success: false, error }; // 返回失败标记和错误
        })
    );

    // 等待所有请求完成
    const results = await Promise.all(fetchPromises);

    let html = '';
    let firstSuccessfulResult = results.find(result => result.success);

    if (firstSuccessfulResult && firstSuccessfulResult.data && firstSuccessfulResult.data.headers) {
      receivedHeaders = firstSuccessfulResult.data.headers; // 保存第一个成功的头信息
      html += `<h5>${debugI18n.t('recent_successful_headers')}</h5>`;
      html += `<pre>${JSON.stringify(receivedHeaders, null, 2)}</pre>`;

      if (receivedHeaders['Accept-Language']) {
        foundAcceptLanguage = receivedHeaders['Accept-Language'];
        const acceptLanguageValue = foundAcceptLanguage.toLowerCase();
        const expectedLanguage = language.toLowerCase();

        if (acceptLanguageValue.includes(expectedLanguage)) {
          html += `<p class="success">${debugI18n.t('header_changed_success')} ${foundAcceptLanguage}</p>`;
          addLogMessage(`${debugI18n.t('header_test_success')} ${foundAcceptLanguage}`, 'success');
        } else {
          html += `<p class="error">${debugI18n.t('header_not_changed')}</p>`;
          html += `<p>${debugI18n.t('expected_contains')} ${expectedLanguage}, ${debugI18n.t('actually_detected')} ${acceptLanguageValue}</p>`;
          html += getExternalCheckLinks();
          addLogMessage(`${debugI18n.t('header_test_failed_not_expected')} ${expectedLanguage}, ${debugI18n.t('actual')} ${acceptLanguageValue}`, 'error');
        }
      } else {
        // 请求成功，但未检测到 Accept-Language
        html += `<p class="error">${debugI18n.t('no_accept_language_any_endpoint')}</p>`;
        html += getExternalCheckLinks();
        addLogMessage(debugI18n.t('header_test_failed_no_header'), 'error');
      }
    } else {
      // 所有请求均失败
      html += `<p class="error">${debugI18n.t('all_test_requests_failed')}</p>`;
      if (lastError) {
        html += `<p class="error">${debugI18n.t('last_error')} ${lastError.message}</p>`;
      }
      html += '<p>' + debugI18n.t('check_network_connection') + getExternalCheckLinks();
      addLogMessage(debugI18n.t('header_test_failed_all_endpoints'), 'error');
    }

    resultElement.innerHTML = html;
  });

  // 修复规则优先级
  document.getElementById('fixPriorityBtn').addEventListener('click', function () {
    const resultElement = document.getElementById('fixResult');
    resultElement.innerHTML = debugI18n.t('fixing_rule_priority');
    addLogMessage(debugI18n.t('try_fix_priority'), 'info');

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
          resultElement.innerHTML = `<p class="error">${debugI18n.t('fix_failed')} ${chrome.runtime.lastError.message}</p>`;
          addLogMessage(`${debugI18n.t('fix_priority_failed')} ${chrome.runtime.lastError.message}`, 'error');
        } else {
          resultElement.innerHTML = `<p class="success">${debugI18n.t('priority_updated_success')}</p>`;
          addLogMessage(debugI18n.t('priority_updated_log'), 'success');
        }
      });
    });
  });

  // 清除并重新应用规则
  document.getElementById('clearAllRulesBtn').addEventListener('click', function () {
    const resultElement = document.getElementById('fixResult');
    resultElement.innerHTML = debugI18n.t('clearing_rules_reapply');
    addLogMessage(debugI18n.t('try_clear_reapply'), 'info');

    chrome.declarativeNetRequest.getDynamicRules(function (existingRules) {
      const existingRuleIds = existingRules.map(rule => rule.id);

      chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: existingRuleIds
      }, function () {
        if (chrome.runtime.lastError) {
          resultElement.innerHTML = `<p class="error">${debugI18n.t('clear_failed')} ${chrome.runtime.lastError.message}</p>`;
          addLogMessage(`${debugI18n.t('clear_rules_failed')} ${chrome.runtime.lastError.message}`, 'error');
        } else {
          // 清除成功后，重新应用默认或存储的规则
          chrome.storage.local.get(['currentLanguage'], function (result) {
            const languageToApply = result.currentLanguage || 'zh-CN';
            // Send message to background.js to request rule update
            chrome.runtime.sendMessage({ type: 'UPDATE_RULES', language: languageToApply }, function (response) {
              if (chrome.runtime.lastError) {
                resultElement.innerHTML = `<p class="error">${debugI18n.t('reapply_rules_error')} ${chrome.runtime.lastError.message}</p>`;
                addLogMessage(`${debugI18n.t('request_background_reapply_failed')} ${chrome.runtime.lastError.message}`, 'error');
              } else if (response && response.status === 'success') {
                resultElement.innerHTML = `<p class="success">${debugI18n.t('rules_cleared_reapplied')} ${languageToApply}</p>`;
                addLogMessage(`${debugI18n.t('rules_cleared_reapplied_log')} ${languageToApply}`, 'success');
              } else if (response && response.status === 'error') {
                resultElement.innerHTML = `<p class="error">${debugI18n.t('background_reapply_failed')} ${response.message}</p>`;
                addLogMessage(`${debugI18n.t('background_reapply_failed_log')} ${response.message}`, 'error');
              } else {
                resultElement.innerHTML = `<p class="warning">${debugI18n.t('background_no_clear_response')}</p>`;
                addLogMessage(debugI18n.t('background_no_clear_response_log'), 'warning');
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
      customLangResult.innerHTML = `<p class="error">${debugI18n.t('enter_valid_language')}</p>`;
      addLogMessage(debugI18n.t('try_apply_custom_empty'), 'warning');
      customLangInput.classList.add('is-invalid');
      return;
    }

    // 简单的格式验证
    // 例如，检查是否包含不允许的字符，或者是否大致符合逗号分隔的模式
    // 这里只做非空检查
    customLangInput.classList.remove('is-invalid'); // 移除之前的错误状态

    customLangResult.innerHTML = `${debugI18n.t('applying_custom_language')} ${languageString}...`;
    addLogMessage(`${debugI18n.t('try_apply_custom')} ${languageString}`, 'info');

    // 发送消息到 background.js 请求更新规则
    chrome.runtime.sendMessage({ type: 'UPDATE_RULES', language: languageString }, function (response) {
      if (chrome.runtime.lastError) {
        customLangResult.innerHTML = `<p class="error">${debugI18n.t('apply_custom_failed')} ${chrome.runtime.lastError.message}</p>`;
        addLogMessage(`${debugI18n.t('apply_custom_failed')} ${chrome.runtime.lastError.message}`, 'error');
      } else if (response && response.status === 'success') {
        customLangResult.innerHTML = `<p class="success">${debugI18n.t('custom_language_applied')} ${languageString}</p>`;
        addLogMessage(`${debugI18n.t('custom_language_applied_log')} ${languageString}`, 'success');
        // 可选：更新存储中的语言，如果希望自定义设置持久化
        // chrome.storage.local.set({ currentLanguage: languageString });
      } else if (response && response.status === 'error') {
        customLangResult.innerHTML = `<p class="error">${debugI18n.t('apply_custom_failed_backend')} ${response.message}</p>`;
        addLogMessage(`${debugI18n.t('backend_apply_custom_failed')} ${response.message}`, 'error');
      } else {
        customLangResult.innerHTML = `<p class="warning">${debugI18n.t('background_no_clear_response')}</p>`;
        addLogMessage(debugI18n.t('backend_no_custom_response'), 'warning');
      }
    });
  });

  // 显示诊断信息
  document.getElementById('showDiagnosticsBtn').addEventListener('click', function () {
    const resultElement = document.getElementById('diagnosticsResult');
    resultElement.innerHTML = debugI18n.t('collecting_diagnostics');
    addLogMessage(debugI18n.t('try_show_diagnostics'), 'info');

    let html = '';
    try {
      html = `<h5>${debugI18n.t('extension_info')}</h5>`;
      html += `<p>${debugI18n.t('extension_id')} ${chrome.runtime.id}</p>`;

      // 获取清单文件信息
      const manifest = chrome.runtime.getManifest();
      html += `<h5>${debugI18n.t('manifest_info')}</h5>`;
      html += `<p>${debugI18n.t('name')} ${manifest.name}</p>`;
      html += `<p>${debugI18n.t('version')} ${manifest.version}</p>`;
      if (manifest.permissions) {
        html += `<p>${debugI18n.t('permissions')}</p><ul>`;
        manifest.permissions.forEach(permission => {
          html += `<li>${permission}</li>`;
        });
        html += '</ul>';
      } else {
        html += `<p>${debugI18n.t('no_permissions')}</p>`;
      }

      // 检查declarativeNetRequest配置
      if (manifest.declarative_net_request) {
        html += `<h5>${debugI18n.t('declarative_config')}</h5>`;
        const ruleResources = manifest.declarative_net_request.rule_resources;
        if (ruleResources && ruleResources.length > 0) {
          html += '<ul>';
          ruleResources.forEach(resource => {
            // 这里显示的是 manifest 中定义的默认状态。
            const enabledStatus = resource.enabled === false ? `<span class="success">${debugI18n.t('disabled_manifest')}</span>` : `<span class="error">${debugI18n.t('enabled_manifest')}</span>`;
            html += `<li>${debugI18n.t('ruleset_id')} ${resource.id}, ${debugI18n.t('path')} ${resource.path}, ${debugI18n.t('status')} ${enabledStatus}</li>`;
          });
          html += '</ul>';
        } else {
          html += `<p>${debugI18n.t('no_ruleset_found')}</p>`;
        }
        // 'reason' 字段已弃用，但仍可检查以兼容旧版
        if (manifest.declarative_net_request.hasOwnProperty('reason')) {
          html += `<p>${debugI18n.t('reason')} ${manifest.declarative_net_request.reason}</p>`;
        }
      } else {
        html += `<p>${debugI18n.t('no_declarative_config')}</p>`;
      }

      // 获取存储的语言设置和自动切换状态 (移入 try 块，确保在 manifest 读取成功后执行)
      chrome.storage.local.get(['currentLanguage', 'autoSwitchEnabled'], function (result) {
        try {
          if (chrome.runtime.lastError) {
            throw new Error(`${debugI18n.t('storage_failed')} ${chrome.runtime.lastError.message}`);
          }
          html += `<h5>${debugI18n.t('stored_language_settings')}</h5>`;
          if (result.currentLanguage) {
            html += `<p>${debugI18n.t('current_language')} ${result.currentLanguage}</p>`;
            addLogMessage(`${debugI18n.t('diagnostics_stored_language')} ${result.currentLanguage}.`, 'info');
          } else {
            html += `<p class="warning">${debugI18n.t('no_stored_language_found')}</p>`;
            addLogMessage(debugI18n.t('diagnostics_no_stored_language'), 'warning');
          }

          // 添加自动切换状态信息
          html += `<h5>${debugI18n.t('auto_switch_function')}</h5>`;
          const autoSwitchStatus = result.autoSwitchEnabled ?
            `<span class="success">${debugI18n.t('enabled')}</span>` :
            `<span class="error">${debugI18n.t('disabled')}</span>`;
          html += `<p>${debugI18n.t('status')} ${autoSwitchStatus}</p>`;

          resultElement.innerHTML = html;
          addLogMessage(debugI18n.t('diagnostics_complete'), 'info');

          // 同步更新自动切换开关状态
          document.getElementById('autoSwitchToggle').checked = !!result.autoSwitchEnabled;
        } catch (storageError) {
          console.error('Error collecting diagnostic information (storage):', storageError);
          addLogMessage(`${debugI18n.t('collect_diagnostics_storage_error')} ${storageError.message}`, 'error');
          resultElement.innerHTML = `<p class="error">${debugI18n.t('collect_storage_info_error')} ${storageError.message}</p>`;
        }
      });

    } catch (error) {
      console.error('Error collecting diagnostic information (manifest/id):', error);
      addLogMessage(`${debugI18n.t('collect_diagnostics_manifest_error')} ${error.message}`, 'error');
      resultElement.innerHTML = `<p class="error">${debugI18n.t('collect_basic_info_error')} ${error.message}</p>`;
    }
  });

  // 自动切换功能控制
  document.getElementById('autoSwitchToggle').addEventListener('change', function () {
    const isEnabled = this.checked;
    addLogMessage(`${debugI18n.t('try_enable_disable_auto')}${isEnabled ? debugI18n.t('enable') : debugI18n.t('disable')}${debugI18n.t('auto_switch_function_ellipsis')}`, 'info');

    // 发送消息到 background.js 更新自动切换状态
    chrome.runtime.sendMessage({
      type: 'AUTO_SWITCH_TOGGLED',
      enabled: isEnabled
    }, function (response) {
      if (chrome.runtime.lastError) {
        addLogMessage(`${debugI18n.t('update_auto_switch_failed')} ${chrome.runtime.lastError.message}`, 'error');
      } else if (response && response.status === 'success') {
        addLogMessage(isEnabled ? debugI18n.t('auto_switch_enabled') : debugI18n.t('auto_switch_disabled'), 'success');
        // 更新存储中的状态
        chrome.storage.local.set({ autoSwitchEnabled: isEnabled });
      } else {
        addLogMessage(debugI18n.t('unknown_response_auto_switch'), 'warning');
      }
    });
  });

  // 显示域名映射规则
  document.getElementById('showDomainRulesBtn').addEventListener('click', function () {
    const resultElement = document.getElementById('domainRulesResult');
    resultElement.innerHTML = debugI18n.t('getting_domain_rules');
    addLogMessage(debugI18n.t('try_get_domain_rules'), 'info');

    // 从 background.js 获取域名映射规则
    chrome.runtime.sendMessage({ type: 'GET_DOMAIN_RULES' }, function (response) {
      if (chrome.runtime.lastError) {
        resultElement.innerHTML = `<p class="error">${debugI18n.t('get_domain_rules_failed')} ${chrome.runtime.lastError.message}</p>`;
        addLogMessage(`${debugI18n.t('get_domain_rules_failed')} ${chrome.runtime.lastError.message}`, 'error');
        return;
      }

      // 响应检查
      console.log(debugI18n.t('received_domain_response'), response);
      addLogMessage(`${debugI18n.t('received_response')} ${JSON.stringify(response)}`, 'info');

      if (response && response.error) {
        resultElement.innerHTML = `<p class="error">${debugI18n.t('get_domain_rules_error')} ${response.error}</p>`;
        addLogMessage(`${debugI18n.t('get_domain_rules_error')} ${response.error}`, 'error');
        return;
      }

      if (response && response.domainRules) {
        const rules = response.domainRules;
        let html = `<h5>${debugI18n.t('domain_language_mapping')}</h5>`;

        // 按类别组织规则
        const categories = {
          [debugI18n.t('second_level_domain')]: {},
          [debugI18n.t('asia')]: {},
          [debugI18n.t('north_america')]: {},
          [debugI18n.t('south_america')]: {},
          [debugI18n.t('europe')]: {},
          [debugI18n.t('oceania')]: {},
          [debugI18n.t('middle_east')]: {},
          [debugI18n.t('other')]: {}
        };

        // 对规则进行分类（基于domain-rules.json中实际存在的域名）
        console.log(debugI18n.t('start_classify_domain_rules'), Object.keys(rules).length);
        Object.keys(rules).forEach(domain => {
          const language = rules[domain];

          if (domain.includes('.')) {
            categories[debugI18n.t('second_level_domain')][domain] = language;
          } else if ([
            'cn', 'tw', 'hk', 'jp', 'kr', 'in', 'id', 'my', 'sg', 
            'th', 'vn', 'ph', 'kz', 'uz', 'mn'
          ].includes(domain)) {
            categories[debugI18n.t('asia')][domain] = language;
          } else if ([
            'us', 'ca', 'mx', 'gt', 'cr', 'pa', 'cu', 'ht', 'jm', 'gov'
          ].includes(domain)) {
            categories[debugI18n.t('north_america')][domain] = language;
          } else if ([
            'ar', 'br', 'cl', 'co', 'ec', 'pe', 'bo', 'py', 'uy', 've'
          ].includes(domain)) {
            categories[debugI18n.t('south_america')][domain] = language;
          } else if ([
            'at', 'be', 'ch', 'cz', 'de', 'dk', 'es', 'eu', 'fi', 
            'fr', 'gr', 'hu', 'ie', 'it', 'nl', 'no', 'pl', 'pt', 
            'se', 'uk', 'tr', 'cy'
          ].includes(domain)) {
            categories[debugI18n.t('europe')][domain] = language;
          } else if ([
            'bh', 'ir', 'iq', 'il', 'jo', 'kw', 'lb', 'om', 'ps', 
            'qa', 'sa', 'sy', 'ae', 'ye'
          ].includes(domain)) {
            categories[debugI18n.t('middle_east')][domain] = language;
          } else if ([
            'au', 'nz', 'fj'
          ].includes(domain)) {
            categories[debugI18n.t('oceania')][domain] = language;
          } else {
            categories[debugI18n.t('other')][domain] = language;
          }
        });

        // 生成HTML（只显示有规则的分类）
        Object.keys(categories).forEach(category => {
          const categoryRules = categories[category];
          const ruleCount = Object.keys(categoryRules).length;

          if (ruleCount > 0) {
            html += `<div class="mt-3"><strong>${category}</strong> (${ruleCount}${debugI18n.t('rules_count')}):</div>`;
            html += '<div class="matched-rule-detail">';

            // 将规则按字母顺序排序
            const sortedDomains = Object.keys(categoryRules).sort();

            // 创建表格显示
            html += '<table class="table table-sm table-striped">';
            html += `<thead><tr><th>${debugI18n.t('domain')}</th><th>${debugI18n.t('language')}</th></tr></thead>`;
            html += '<tbody>';

            sortedDomains.forEach(domain => {
              html += `<tr><td>${domain}</td><td>${categoryRules[domain]}</td></tr>`;
            });

            html += '</tbody></table>';
            html += '</div>';
          }
        });

        resultElement.innerHTML = html;
        addLogMessage(`${debugI18n.t('successfully_got_displayed_rules')}${Object.keys(rules).length}${debugI18n.t('domain_mapping_rules')}`, 'success');
      } else {
        resultElement.innerHTML = `<p class="error">${debugI18n.t('failed_get_domain_rules_empty')}</p>`;
        addLogMessage(`${debugI18n.t('failed_get_domain_rules_response')} ${JSON.stringify(response)}`, 'warning');
      }
    });
  });

  // 监听来自 background.js 的自动切换UI更新消息
  chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.type === 'AUTO_SWITCH_UI_UPDATE') {
      // 更新自动切换开关状态
      const autoSwitchToggle = document.getElementById('autoSwitchToggle');
      if (autoSwitchToggle) {
        autoSwitchToggle.checked = !!request.autoSwitchEnabled;
        // 同时更新存储状态，确保一致性
        chrome.storage.local.set({ autoSwitchEnabled: !!request.autoSwitchEnabled });
      }
      addLogMessage(`${debugI18n.t('received_auto_switch_update')} ${request.autoSwitchEnabled ? debugI18n.t('enabled') : debugI18n.t('disabled')}, ${debugI18n.t('current_language_colon')} ${request.currentLanguage}`, 'info');
      
      if (sendResponse) {
        sendResponse({status: "Debug UI updated"});
      }
    }
    return true;
  });

}); // DOMContentLoaded 结束