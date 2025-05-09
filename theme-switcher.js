// 监听页面加载，初始化主题切换按钮和主题状态
document.addEventListener('DOMContentLoaded', () => {
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  const currentTheme = localStorage.getItem('theme') ? localStorage.getItem('theme') : null;
  const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');

  // 主题切换应用函数
  function applyTheme(theme) {
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-bs-theme', 'dark');
      if (themeToggleBtn) {
        themeToggleBtn.innerHTML = '<img src="images/sun.svg" alt="Light Mode" width="16" height="16">'; // 浅色模式图标
        themeToggleBtn.setAttribute('data-state', 'on');
      }
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.setAttribute('data-bs-theme', 'light');
      if (themeToggleBtn) {
        themeToggleBtn.innerHTML = '<img src="images/moon.svg" alt="Dark Mode" width="16" height="16">'; // 深色模式图标
        themeToggleBtn.setAttribute('data-state', 'off');
      }
      localStorage.setItem('theme', 'light');
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
      let newTheme = document.documentElement.getAttribute('data-bs-theme') === 'dark' ? 'light' : 'dark';
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