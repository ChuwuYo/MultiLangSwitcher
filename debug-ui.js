// debug-ui.js - 调试页面UI交互脚本

document.addEventListener('DOMContentLoaded', function() {
  // 显示当前规则
  document.getElementById('showRulesBtn').addEventListener('click', function() {
    const resultElement = document.getElementById('rulesResult');
    resultElement.innerHTML = '正在获取规则信息...';
    
    chrome.declarativeNetRequest.getDynamicRules(function(rules) {
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
            rule.action.requestHeaders.forEach(header => {
              html += `<li>修改头: ${header.header}, 操作: ${header.operation}, 值: ${header.value}</li>`;
            });
          }
        });
        html += '</ul>';
      }
      
      // 获取匹配的规则
      chrome.declarativeNetRequest.getMatchedRules({}, function(matchedRules) {
        html += '<h5>当前匹配的规则:</h5>';
        if (matchedRules && matchedRules.rulesMatchedInfo && matchedRules.rulesMatchedInfo.length > 0) {
          html += '<ul>';
          matchedRules.rulesMatchedInfo.forEach(info => {
            html += `<li>规则ID: ${info.rule.ruleId}, 类型: ${info.rule.rulesetId ? '静态' : '动态'}</li>`;
          });
          html += '</ul>';
        } else {
          html += '<p>没有匹配的规则</p>';
        }
        
        resultElement.innerHTML = html;
      });
    });
  });
  
  // 测试请求头
  document.getElementById('testHeaderBtn').addEventListener('click', function() {
    const language = document.getElementById('testLanguage').value;
    const resultElement = document.getElementById('headerTestResult');
    resultElement.innerHTML = `正在测试语言 "${language}" 的请求头...`;
    
    // 使用随机参数避免缓存
    const timestamp = new Date().getTime();
    
    fetch(`https://httpbin.org/headers?_=${timestamp}`, {
      cache: 'no-store',
      credentials: 'omit'
    })
      .then(response => response.json())
      .then(data => {
        const headers = data.headers;
        let html = '<h5>收到的请求头:</h5>';
        html += `<pre>${JSON.stringify(headers, null, 2)}</pre>`;
        
        if (headers['Accept-Language']) {
          const acceptLanguage = headers['Accept-Language'].toLowerCase();
          const expectedLanguage = language.toLowerCase();
          
          if (acceptLanguage.includes(expectedLanguage)) {
            html += `<p class="success">✓ 请求头已成功更改! 当前值: ${headers['Accept-Language']}</p>`;
          } else {
            html += `<p class="error">✗ 请求头未成功更改!</p>`;
            html += `<p>预期: ${expectedLanguage}, 实际: ${acceptLanguage}</p>`;
          }
        } else {
          html += '<p class="error">✗ 未检测到Accept-Language请求头!</p>';
        }
        
        resultElement.innerHTML = html;
      })
      .catch(error => {
        resultElement.innerHTML = `<p class="error">测试失败: ${error.message}</p>`;
      });
  });
  
  // 修复规则优先级
  document.getElementById('fixPriorityBtn').addEventListener('click', function() {
    const resultElement = document.getElementById('fixResult');
    resultElement.innerHTML = '正在修复规则优先级...';
    
    chrome.declarativeNetRequest.getDynamicRules(function(existingRules) {
      // 获取所有现有规则ID和规则
      const existingRuleIds = existingRules.map(rule => rule.id);
      const updatedRules = existingRules.map(rule => {
        // 复制规则并更新优先级
        return {
          ...rule,
          priority: 100 // 设置更高优先级
        };
      });
      
      // 更新规则
      chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: existingRuleIds,
        addRules: updatedRules
      }, function() {
        if (chrome.runtime.lastError) {
          resultElement.innerHTML = `<p class="error">修复失败: ${chrome.runtime.lastError.message}</p>`;
        } else {
          resultElement.innerHTML = '<p class="success">规则优先级已成功更新为100</p>';
        }
      });
    });
  });
  
  // 清除所有规则
  document.getElementById('clearAllRulesBtn').addEventListener('click', function() {
    const resultElement = document.getElementById('fixResult');
    resultElement.innerHTML = '正在清除所有动态规则...';
    
    chrome.declarativeNetRequest.getDynamicRules(function(existingRules) {
      const existingRuleIds = existingRules.map(rule => rule.id);
      
      chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: existingRuleIds
      }, function() {
        if (chrome.runtime.lastError) {
          resultElement.innerHTML = `<p class="error">清除失败: ${chrome.runtime.lastError.message}</p>`;
        } else {
          resultElement.innerHTML = '<p class="success">所有动态规则已清除</p>';
          
          // 获取当前语言并重新应用
          chrome.storage.local.get(['currentLanguage'], function(result) {
            if (result.currentLanguage) {
              // 创建新规则
              chrome.declarativeNetRequest.updateDynamicRules({
                addRules: [{
                  "id": 1,
                  "priority": 100,
                  "action": {
                    "type": "modifyHeaders",
                    "requestHeaders": [
                      {
                        "header": "Accept-Language",
                        "operation": "set",
                        "value": result.currentLanguage
                      }
                    ]
                  },
                  "condition": {
                    "urlFilter": "*",
                    "resourceTypes": ["main_frame", "sub_frame", "stylesheet", "script", "image", "font", "object", "xmlhttprequest", "ping", "csp_report", "media", "websocket", "other"]
                  }
                }]
              }, function() {
                if (chrome.runtime.lastError) {
                  resultElement.innerHTML += `<p class="error">重新应用规则失败: ${chrome.runtime.lastError.message}</p>`;
                } else {
                  resultElement.innerHTML += `<p class="success">已重新应用语言规则: ${result.currentLanguage}</p>`;
                }
              });
            }
          });
        }
      });
    });
  });
  
  // 显示诊断信息
  document.getElementById('showDiagnosticsBtn').addEventListener('click', function() {
    const resultElement = document.getElementById('diagnosticsResult');
    resultElement.innerHTML = '正在收集诊断信息...';
    
    let html = '<h5>扩展信息:</h5>';
    html += `<p>扩展ID: ${chrome.runtime.id}</p>`;
    
    // 获取清单文件信息
    const manifest = chrome.runtime.getManifest();
    html += '<h5>清单文件信息:</h5>';
    html += `<p>名称: ${manifest.name}</p>`;
    html += `<p>版本: ${manifest.version}</p>`;
    html += `<p>权限:</p><ul>`;
    manifest.permissions.forEach(permission => {
      html += `<li>${permission}</li>`;
    });
    html += '</ul>';
    
    // 检查declarativeNetRequest配置
    if (manifest.declarative_net_request) {
      html += '<h5>declarativeNetRequest配置:</h5>';
      const ruleResources = manifest.declarative_net_request.rule_resources;
      if (ruleResources && ruleResources.length > 0) {
        html += '<ul>';
        ruleResources.forEach(resource => {
          const enabledStatus = resource.enabled ? '<span class="error">启用</span>' : '<span class="success">禁用</span>';
          html += `<li>规则集ID: ${resource.id}, 路径: ${resource.path}, 状态: ${enabledStatus}</li>`;
        });
        html += '</ul>';
      }
    }
    
    // 获取存储的语言设置
    chrome.storage.local.get(['currentLanguage'], function(result) {
      html += '<h5>存储的语言设置:</h5>';
      if (result.currentLanguage) {
        html += `<p>当前语言: ${result.currentLanguage}</p>`;
      } else {
        html += '<p class="error">未找到存储的语言设置</p>';
      }
      
      resultElement.innerHTML = html;
    });
  });
  
  // 禁用静态规则
  document.getElementById('disableStaticRulesBtn').addEventListener('click', function() {
    const resultElement = document.getElementById('fixResult');
    resultElement.innerHTML = '<p class="error">此功能需要修改manifest.json文件，无法在运行时完成</p>';
    resultElement.innerHTML += '<p>请按照以下步骤手动修改:</p>';
    resultElement.innerHTML += '<ol>';
    resultElement.innerHTML += '<li>打开manifest.json文件</li>';
    resultElement.innerHTML += '<li>找到declarative_net_request部分</li>';
    resultElement.innerHTML += '<li>将enabled值从true改为false</li>';
    resultElement.innerHTML += '<li>保存文件并重新加载扩展</li>';
    resultElement.innerHTML += '</ol>';
    resultElement.innerHTML += '<pre>"declarative_net_request": {\n  "rule_resources": [{\n    "id": "ruleset_1",\n    "enabled": false,\n    "path": "rules.json"\n  }]\n}</pre>';
  });
});