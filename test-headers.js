// 获取并显示当前请求头
function fetchAndDisplayHeaders() {
  const headerInfoElement = document.getElementById('headerInfo');
  headerInfoElement.textContent = '正在获取请求头信息...';
  
  // 使用随机参数避免缓存
  const timestamp = new Date().getTime();
  
  // 创建一个请求来获取请求头信息
  fetch(`https://httpbin.org/headers?_=${timestamp}`, {
    cache: 'no-store', // 完全禁用缓存
    credentials: 'omit' // 不发送cookies
  })
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP错误! 状态: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      // 格式化并显示请求头
      const headers = data.headers;
      let formattedHeaders = JSON.stringify(headers, null, 2);
      headerInfoElement.textContent = formattedHeaders;
      
      // 清除之前的语言设置信息
      const previousLanguageInfo = document.querySelector('.alert-info p.mt-2');
      if (previousLanguageInfo) {
        previousLanguageInfo.remove();
      }
      
      // 高亮显示Accept-Language头
      if (headers['Accept-Language']) {
        const acceptLanguage = headers['Accept-Language'];
        document.querySelector('.alert-info').innerHTML += 
          `<p class="mt-2 mb-0">检测到的语言设置: <strong class="text-success">${acceptLanguage}</strong></p>`;
        console.log('检测到的Accept-Language:', acceptLanguage);
      } else {
        console.log('未检测到Accept-Language请求头');
        document.querySelector('.alert-info').innerHTML += 
          `<p class="mt-2 mb-0 text-warning">未检测到Accept-Language请求头</p>`;
      }
    })
    .catch(error => {
      console.error('获取请求头失败:', error);
      headerInfoElement.textContent = '获取请求头信息失败: ' + error.message;
    });
}

// 页面加载完成后获取请求头
window.addEventListener('DOMContentLoaded', function() {
  // 延迟一秒执行，确保扩展规则已应用
  setTimeout(fetchAndDisplayHeaders, 1000);
  
  // 添加刷新按钮功能
  const refreshButton = document.createElement('button');
  refreshButton.className = 'btn btn-sm btn-outline-primary mt-3';
  refreshButton.textContent = '刷新请求头信息';
  refreshButton.onclick = function() {
    fetchAndDisplayHeaders();
  };
  document.querySelector('.header-info').appendChild(refreshButton);
});