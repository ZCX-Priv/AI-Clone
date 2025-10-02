# 变更日志

所有值得注意的更改都会记录在此文件中。

## 2025-10-01
- 新增 role.js，定义全局 `window.ROLES`（首项 `system.md`），用于驱动人物角色加载。
- 调整 script.js：`loadPersonas()` 改为基于 `window.ROLES` 动态加载，并在失败时回退到原有固定名单。
- 更新 index.html：在 `script.js` 之前引入 `role.js`，确保加载顺序正确。
- 新增 `personas/system.md` 占位，避免 404。
- 文档更新：
  - README 增补“本地启动（避免 CORS）”、“role.js 用法”、“如何新增角色”。
  - 项目结构中补充 `role.js` 和 `personas/system.md`。
- 启动说明补充：提供 `python -m http.server 5500` 作为快速本地服务器方案，避免 `file://` 导致的 CORS 问题。