// 监听页面加载，初始化主题切换按钮和主题状态
document.addEventListener('DOMContentLoaded', () => {
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  const currentTheme = localStorage.getItem('theme') ? localStorage.getItem('theme') : null;
  const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');

  // 定义主题按钮的细节（图标和状态）
  const themeButtonDetails = {
    'dark': {
      icon: '<img src="images/sun.svg" alt="Light Mode" width="16" height="16">', // 浅色模式图标
      state: 'on'
    },
    'light': {
      icon: '<img src="images/moon.svg" alt="Dark Mode" width="16" height="16">', // 深色模式图标
      state: 'off'
    }
  };

  // 主题切换应用函数
  function applyTheme(theme) {
    // 设置文档根元素的主题属性
    document.documentElement.setAttribute('data-bs-theme', theme);
    // 将当前主题存储到本地存储
    localStorage.setItem('theme', theme);

    // 如果主题切换按钮存在，更新其内容和状态
    if (themeToggleBtn) {
      const details = themeButtonDetails[theme];
      if (details) {
        themeToggleBtn.innerHTML = details.icon;
        themeToggleBtn.setAttribute('data-state', details.state);
      }
    }
  }

  // 应用初始主题
  if (currentTheme) {
    applyTheme(currentTheme);
  } else if (prefersDarkScheme.matches) {
    applyTheme('dark');
  } else {
    applyTheme('light'); // 默认浅色主题
  }

  // 主题切换按钮监听器
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      // 根据当前主题确定新主题
      let newTheme = document.documentElement.getAttribute('data-bs-theme') === 'dark' ? 'light' : 'dark';
      // 应用新主题
      applyTheme(newTheme);
    });
  }

  // 监听操作系统主题变化
  prefersDarkScheme.addEventListener('change', (e) => {
    // 仅当用户未设置偏好时才更改
    if (!localStorage.getItem('theme')) {
        applyTheme(e.matches ? 'dark' : 'light');
    }
  });
});