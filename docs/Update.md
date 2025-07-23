# v1.8.28（含迭代内容）

## 主要改动

### 1. 功能增强

- ✅ 完善HTML相关i18n的错误处理，增加回退机制（v1.8.27）
- ✅ 将test-headers相关文件重命名为detect，统一命名规范（v1.8.28）

### 2. 代码优化

- ✅ 优化HTML的i18n结构，不包含任何硬编码文本，使用 ID 属性标识需要国际化的元素（v1.8.27）
- ✅ 优化HTML相关i18n实现，均在页面加载前检测用户语言并加载相应的语言文件（v1.8.27）
- ✅ 更新所有相关引用，包括HTML、JavaScript和文档（v1.8.28）
- ✅ 优化i18n类名和变量名，从TestI18n改为DetectI18n（v1.8.28）

### 3. 文档完善

- ✅ TODO 更新（v1.8.27、v1.8.28）
- ✅ 更新项目结构文档（v1.8.27、v1.8.28）
- ✅ README 内容与引用图片同步更新（v1.8.27、v1.8.28）
- ✅ Update 更新文档内容更新（v1.8.27、v1.8.28）

## 文件变更清单

### 新增文件

- Update.md - 版本更新文档

### 重命名文件

- test-headers.html → detect.html - 检测页面HTML（v1.8.28）
- test-headers.js → detect.js - 检测页面JavaScript（v1.8.28）
- i18n/test-en.js → i18n/detect-en.js - 检测页面英文翻译（v1.8.28）
- i18n/test-i18n.js → i18n/detect-i18n.js - 检测页面国际化配置（v1.8.28）
- i18n/test-zh.js → i18n/detect-zh.js - 检测页面中文翻译（v1.8.28）

### 修改文件

- README.md/README_EN.md - 内容与引用图片同步更新（v1.8.27、v1.8.28）
- manifest.json - 版本号更新（v1.8.27、v1.8.28）
- docs/TODO.md - 更新任务完成状态（v1.8.27、v1.8.28）
- Project_Structure.md - 项目结构更新（v1.8.27、v1.8.28）
- Update.md - 更新文档内容更新（v1.8.27、v1.8.28）
- /images - icons更新（v1.8.27）
- detect.html - 更新脚本引用路径（v1.8.28）
- detect.js - 更新i18n对象引用（testI18n → detectI18n）（v1.8.28）
- i18n/detect-i18n.js - 更新类名和变量名（TestI18n → DetectI18n）（v1.8.28）
- i18n/detect-en.js - 更新变量名（testEn → detectEn）（v1.8.28）
- i18n/detect-zh.js - 更新变量名（testZh → detectZh）（v1.8.28）
- popup.html - 更新检测页面链接（v1.8.28）


### 移除内容

- 以 `test-headers` 命名的相关文件与引用（v1.8.28）