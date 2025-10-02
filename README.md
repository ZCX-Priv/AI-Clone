# AI陪伴聊天应用

一个简洁的前端本地运行聊天应用，支持多提供方与多模型，内置角色人格，流式输出。

## 近期变更

- 提供方顺序不再写死在脚本中，现由 `config.js` 的 `API_CONFIG` 动态生成，且“已启用(enabled=true)的提供方优先”。
- 新增或启用/停用提供方只需改 `config.js`，UI 会自动更新顺序与可选项。
- 默认示例中 `pollinations` 为启用状态，且无需 API Key，可开箱即用。

## 功能特点

- 多提供方与模型：OpenAI、Google、Anthropic、xAI、DeepSeek、OpenRouter、Pollinations 等
- 人格系统：从 `personas/*.md` 动态解析标题与“## 系统提示词”
- 流式对话：SSE data: 行级增量渲染
- 本地存储：保存当前提供方、API Key、模型与人格选择
- 主题切换：明/暗色一键切换

## 目录结构

```
AI陪伴/
├── index.html          # 页面入口（确保 config.js、role.js 在 script.js 之前引入）
├── style.css           # 样式
├── script.js           # 主逻辑（加载人格、聊天、设置、主题等）
├── role.js             # 角色清单（window.ROLES）
├── config.js           # 提供方与模型配置（动态驱动 UI 与调用）
├── config.json         # 简易静态服务配置（用于可选服务器）
├── FileServer.py       # 可选：简易静态文件服务器
├── personas/           # 人格 Markdown
│   ├── system.md
│   ├── companion.md
│   ├── friend.md
│   └── mentor.md
└── avatars/
    └── avatar.jpg
```

## 启动方式

请选择任一方式启动本地 HTTP 服务器（不要用 `file://` 直接打开 index.html，否则会因 CORS 无法加载 personas/*.md）。

- 方式一：Python 内置服务器（最简单）
  ```
  python -m http.server 5500
  # 浏览器访问 http://localhost:5500/index.html
  ```

- 方式二：VS Code Live Server / Node http-server / PHP 内置服务器
  ```
  # Node
  npx http-server . -p 8000
  # PHP
  php -S localhost:8000
  # 然后访问 http://localhost:8000/index.html
  ```

- 方式三：可选使用仓库中的简易服务器
  ```
  python FileServer.py
  # 若该脚本依赖 config.json，请按需调整端口与路径
  ```

## 配置提供方与模型

- 在 `config.js` 中维护 `API_CONFIG`。每个键为提供方 key，包含：
  - name：展示名
  - enabled：是否启用（启用项将排在下拉列表前面）
  - baseURL / headers：OpenAI Chat Completions 兼容端点与请求头模板（{API_KEY}/{REFERER} 会在运行时替换）
  - defaultModel：在设置界面默认选中的模型 ID
  - models：{ 模型ID: 模型别名 }（界面展示别名，提交使用模型ID）

- 动态顺序与默认选择
  - 顺序来源：`script.js` 中 `PROVIDER_ORDER = Object.keys(API_CONFIG).sort(...)`，启用项优先
  - 默认活跃提供方：用户未选择时，取顺序中首个 `enabled=true` 的提供方；若均未启用，则回退 `'openrouter'`
  - 新增提供方：向 `API_CONFIG` 添加一个键，即可自动出现在设置界面；设为 `enabled: true` 可置前

- API Key 说明
  - `pollinations` 示例中为启用状态且无需用户填写 Key（headers 模板会用内置值）
  - 其他提供方需在“设置”中填入对应 Key（UI 默认提示 OpenRouter，可忽略文案，按所选提供方填写即可）

## 使用指南

1. 启动本地服务器并打开页面
2. 点击右上角“设置”
   - 选择“提供方”（顺序已按启用优先）
   - 输入该提供方的 API Key（如需要）
   - 选择模型与人格
   - 保存后状态栏会更新“端点: 提供方名称 · 模型别名”
3. 聊天区域输入消息并发送，回复将以流式形式出现
4. 可随时切换主题、修改设置；设置保存在浏览器本地

## 角色与人格

- 定义在 `role.js` 的全局 `window.ROLES` 数组中：
  ```js
  [
    { key: 'system', name: '系统提示词', md: 'system.md' },
    { key: 'companion', name: '陪伴者', md: 'companion.md' },
    { key: 'friend', name: '朋友', md: 'friend.md' },
    { key: 'mentor', name: '导师', md: 'mentor.md' }
  ]
  ```
- 应用会据此从 `personas/` 目录逐个 `fetch` 对应 md，解析：
  - 标题行 `# xxx` 作为名称（若 `role.js` 已提供 name，则优先使用其 name）
  - “## 系统提示词”后的内容作为 system message

- 回退策略：若 `window.ROLES` 不可用，将尝试加载 `companion/friend/mentor` 三个固定文件

## 故障排查

- 页面空白或角色不加载：确认是通过 HTTP 服务访问，而不是直接双击打开；在控制台检查 `personas/*.md` 的网络状态
- 无法生成：检查设置中提供方/模型是否有效、API Key 是否正确、网络是否可用
- 流式响应解析错误：若使用非兼容端点，请确保其遵循 OpenAI Chat Completions SSE `data:` 事件格式

## 许可证

MIT License

## 贡献

欢迎提交 Issue / PR 改进文档、适配更多提供方或优化前端体验。