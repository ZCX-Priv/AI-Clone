<div align="center">
  <img src="favicon.png" alt="AI数字人Logo" width="120" height="120">
  
  # AI数字人应用
  
  一个功能丰富的前端AI聊天应用，支持多AI提供商、角色人格系统、富文本渲染和聊天记录管理。
</div>

## ✨ 主要特性

### 🤖 多AI提供商支持
### 👥 角色人格系统
### 💬 聊天功能
- **流式对话**: 实时显示AI回复过程
- **富文本渲染**: 支持Markdown、代码高亮、数学公式
- **聊天记录**: IndexedDB本地存储，支持搜索和导出
- **会话管理**: 多会话切换，历史记录查看
- **响应式设计**: 完美适配桌面和移动设备

### 🎨 界面特性
- **双主题**: 明亮/暗黑主题一键切换
- **加载动画**: 优雅的启动页面和资源加载
- **媒体支持**: 角色图片/视频展示，可调节大小
- **工具栏**: 新对话、历史记录、设置等快捷操作
- **滚动控制**: 智能滚动到底部按钮

## 📁 项目结构

```
AI陪伴/
├── index.html              # 主页面入口
├── favicon.png             # 网站图标
├── README.md              # 项目说明文档
│
├── css/                   # 样式文件
│   ├── style.css          # 主样式
│   ├── chatHistory.css    # 聊天记录样式
│   └── mobile-optimized.css # 移动端优化
│
├── js/                    # JavaScript模块
│   ├── app.js             # 主应用逻辑
│   ├── config.js          # AI提供商配置
│   ├── role.js            # 角色定义
│   ├── chatManager.js     # 聊天记录管理
│   ├── chatHistory.js     # 历史记录界面
│   ├── renderer.js        # 富文本渲染器
│   └── modal.js           # 弹窗组件
│
├── personas/              # 角色人格定义
│   ├── system.md          # 系统提示词
│   ├── lyt.md             
│   ├── zxw.md             
│   └── hjl.md             
│
├── avatars/               # 角色头像
│   ├── avatar01.jpg       
│   ├── avatar02.jpg       
│   └── avatar03.jpg       
│
└── imgs/                  # 角色展示图片
    ├── img01.jpg          
    ├── img02.jpg          
    └── img03.jpg          
```

## 🚀 快速开始

### 环境要求
- 现代浏览器（Chrome 88+, Firefox 85+, Safari 14+）
- 本地HTTP服务器（不支持file://协议）

### 启动方法

#### 方法一：Python内置服务器（推荐）
```bash
# 在项目根目录执行
python -m http.server 5500

# 浏览器访问
http://localhost:5500
```

#### 方法二：Node.js服务器
```bash
# 使用http-server
npx http-server . -p 8000

# 浏览器访问
http://localhost:8000
```

#### 方法三：VS Code Live Server
1. 安装Live Server扩展
2. 右键index.html选择"Open with Live Server"

#### 方法四：PHP内置服务器
```bash
php -S localhost:8000

# 浏览器访问
http://localhost:8000
```

## ⚙️ 配置说明

### AI提供商配置
在 `js/config.js` 中配置AI提供商：

```javascript
const API_CONFIG = {
  pollinations: {
    name: 'Pollinations',
    enabled: true,  // 设为true启用
    baseURL: 'https://text.pollinations.ai/openai/v1/chat/completions',
    apiKey: 'xxx',  // 内置密钥
    defaultModel: 'deepseek',
    models: {
      'deepseek': 'DeepSeek',
      'openai': 'OpenAI',
      // ...更多模型
    }
  }
  // ...其他提供商
};
```

### 角色配置
在 `js/role.js` 中定义角色：

```javascript
const ROLES = [
  { 
    key: 'teacher', 
    name: '老师', 
    md: 'teacher.md', 
    leftMedia: './imgs/img01.jpg',
    mediaType: 'image',
    avatar: './avatars/avatar01.jpg',
    greeting: '你好！我是老师，有什么想聊的吗？'
  }
  // ...更多角色
];
```

## 📖 使用指南

### 首次使用
1. 启动本地服务器并访问应用
2. 等待资源加载完成
3. 点击右上角设置按钮⚙️
4. 选择AI提供商和模型
5. 输入API密钥（如需要）
6. 选择喜欢的角色人格
7. 保存设置开始聊天

### 基本操作
- **发送消息**: 在输入框输入内容，点击发送按钮
- **新对话**: 点击➕按钮开始新的对话会话
- **查看历史**: 点击🕒按钮查看聊天历史记录
- **切换主题**: 点击🌙/☀️按钮切换明暗主题
- **调节角色大小**: 使用左侧滑块调节角色图片/视频大小

### 高级功能
- **数学公式**: 支持LaTeX语法，如 `$E=mc^2$` 或 `$$\int_0^1 x dx$$`
- **代码高亮**: 自动识别代码语言并高亮显示
- **表格渲染**: 支持Markdown表格语法
- **搜索历史**: 在历史记录中搜索特定内容
- **导出对话**: 将聊天记录导出为JSON格式

## 🛠️ 技术特性

### 前端技术栈
- **原生JavaScript**: 无框架依赖，轻量高效
- **CSS3**: 现代样式，支持动画和响应式
- **IndexedDB**: 本地数据存储
- **Web APIs**: Fetch、Stream、LocalStorage等

### 渲染引擎
- **Marked.js**: Markdown解析
- **Prism.js**: 代码语法高亮
- **KaTeX/MathJax**: 数学公式渲染
- **DOMPurify**: XSS防护

### 兼容性
- **OpenAI API**: 完全兼容Chat Completions格式
- **流式响应**: 支持Server-Sent Events
- **跨平台**: 支持Windows、macOS、Linux
- **移动端**: 响应式设计，触屏友好

## 🔧 自定义开发

### 添加新的AI提供商
1. 在 `js/config.js` 中添加配置
2. 确保API兼容OpenAI Chat Completions格式
3. 设置 `enabled: true` 启用

### 创建新角色
1. 在 `personas/` 目录创建Markdown文件
2. 在 `js/role.js` 中添加角色定义
3. 准备角色头像和展示图片
4. 重启应用即可使用

### 自定义样式
- 修改 `css/style.css` 调整主题色彩
- 编辑 `css/mobile-optimized.css` 优化移动端体验
- 在 `css/chatHistory.css` 中自定义历史记录样式

## 🐛 故障排查

### 常见问题

**页面空白或加载失败**
- 确保使用HTTP服务器访问，不要直接打开HTML文件
- 检查浏览器控制台是否有错误信息
- 确认所有资源文件完整

**AI无法回复**
- 检查API密钥是否正确配置
- 确认选择的AI提供商服务正常
- 查看网络连接是否稳定

**角色图片不显示**
- 确认图片文件路径正确
- 检查图片文件是否存在
- 验证图片格式是否支持

**聊天记录丢失**
- IndexedDB数据存储在浏览器本地
- 清除浏览器数据会删除聊天记录
- 建议定期导出重要对话

### 调试模式
打开浏览器开发者工具（F12）查看详细错误信息：
- Console标签页：查看JavaScript错误
- Network标签页：检查API请求状态
- Application标签页：查看本地存储数据

## 📄 许可证

MIT License - 详见LICENSE文件

## 🤝 贡献指南

欢迎提交Issue和Pull Request！

### 贡献方式
1. Fork本项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建Pull Request

### 开发建议
- 保持代码风格一致
- 添加必要的注释
- 测试新功能的兼容性
- 更新相关文档

## 📞 支持与反馈

如果您在使用过程中遇到问题或有改进建议，请：
- 提交GitHub Issue
- 发送邮件反馈
- 参与项目讨论

---

**享受与AI数字人的智能对话体验！** 🎉