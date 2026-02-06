## 🔧 TODO

#### 性能优化

#### 代码结构
- [ ] 考虑将 background.js 拆分为多个模块
- [x] 统一错误处理模式，避免重复的 try-catch 块
- [x] 简化消息传递机制，减少冗余的响应检查
- [x] 简化 shared-resource-manager.js：在保留 RTCPeerConnection 管理的前提下优化实现
- [x] 简化资源跟踪系统：仅保留必要的定时器/控制器，并保留 RTCPeerConnection 的最小清理
- [x] 移除 getStats() 资源统计接口（无明确业务需求）
- [x] 评估是否可以依赖浏览器自动清理，减少全局资源管理器职责
