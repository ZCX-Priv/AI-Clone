/** 提供方顺序（根据 config.js 的 API_CONFIG 动态生成；启用项优先） */
const PROVIDER_ORDER = Object.keys(API_CONFIG || {}).sort((a, b) => {
  const ea = !!(API_CONFIG[a]?.enabled);
  const eb = !!(API_CONFIG[b]?.enabled);
  if (ea !== eb) return ea ? -1 : 1;
  return 0;
});

/** 依据指定 providerKey 返回提供方；若未传则用本地存储或默认启用项 */
function getActiveProvider(providerKey) {
    const keyFromStorage = providerKey || localStorage.getItem('api_provider');
    const selected = keyFromStorage && API_CONFIG[keyFromStorage] ? keyFromStorage
        : (PROVIDER_ORDER.find(k => API_CONFIG[k]?.enabled) || PROVIDER_ORDER[0]);
    return { key: selected, conf: API_CONFIG[selected] };
}

// 配置管理
class Config {
    constructor() {
        const { key, conf } = getActiveProvider();
        this.providerKey = localStorage.getItem('api_provider') || key;
        const { conf: conf2 } = getActiveProvider(this.providerKey);
        this.apiKey = localStorage.getItem(`${this.providerKey}_api_key`) || conf2.apiKey || '';
        this.endpoint = localStorage.getItem(`${this.providerKey}_endpoint`) || conf2.defaultModel;
        this.currentPersona = localStorage.getItem('current_persona') || 'companion';
        
        // 新增配置选项
        this.contextLength = parseInt(localStorage.getItem('context_length')) || 10;
        this.temperature = parseFloat(localStorage.getItem('temperature')) || 0.7;
        this.topP = parseFloat(localStorage.getItem('top_p')) || 1.0;
        this.mathRenderer = localStorage.getItem('math_renderer') || 'katex';
        
        this.personas = {};
        this.systemPrompt = ''; // 来自 personas/system.md 的系统提示词
    }

    async loadPersonas() {
        // 优先从全局 ROLES（role.js）加载；若不可用则回退到旧逻辑
        this.personas = {};
        const roles = Array.isArray(window.ROLES) ? window.ROLES : [];

        // 动态加载 role.js 中声明的 md 文件
        for (const role of roles) {
            const { key, name, md } = role || {};
            if (!key || !md || !md.endsWith('.md')) continue;

            // 当前项目 personas 目录下均为 .md，若某文件不存在会被捕获
            const path = `./personas/${md}`;

            try {
                const response = await fetch(path);
                if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
                const content = await response.text();
                const parsed = this.parsePersona(content);
                this.personas[key] = {
                    ...parsed,
                    name: name || parsed.name || '未知角色',
                    avatar: role.avatar || './avatars/avatar.jpg',
                    // 支持新的媒体字段，同时保持向后兼容
                    leftMedia: role.leftMedia || role.leftImage || './imgs/img.jpg',
                    mediaType: role.mediaType || 'image',
                    // 保持向后兼容的旧字段
                    leftImage: role.leftImage || role.leftMedia || './imgs/img.jpg',
                    // 直接使用整个角色 md 内容作为提示词，若无则回退到 role.js 的定义
                    rolePrompt: content || role.rolePrompt || '',
                    // 添加角色自定义开场白支持
                    greeting: role.greeting || '你好！我是你的AI陪伴，有什么想聊的吗？ 😊'
                };
            } catch (error) {
                console.error(`加载人格 ${key || md} 失败:`, error);
            }
        }

        // 回退方案：若通过 ROLES 未加载到任何人格，则使用旧的固定名单
        if (Object.keys(this.personas).length === 0) {
            const personaFiles = ['companion', 'friend', 'mentor'];
            for (const persona of personaFiles) {
                try {
                    const response = await fetch(`./personas/${persona}.md`);
                    if (!response.ok) continue;
                    const content = await response.text();
                    const parsed = this.parsePersona(content);
                    this.personas[persona] = {
                        ...parsed,
                        rolePrompt: content || ''
                    };
                } catch (error) {
                    // 忽略单项失败
                }
            }
        }

        // 统一加载系统提示词：personas/system.md
        try {
            const sysResp = await fetch('./personas/system.md');
            if (sysResp.ok) {
                const sysText = await sysResp.text();
                const parsed = this.parsePersona(sysText);
                this.systemPrompt = sysText;
            }
        } catch (e) {
            // 忽略系统提示词加载失败，后续使用默认降级
        }
    }

    parsePersona(content) {
        const lines = content.split('\n');
        let name = '';

        for (const line of lines) {
            if (line.startsWith('# ')) {
                name = line.substring(2).trim();
            }
        }

        return {
            name: name || '未知角色'
        };
    }

    save() {
        localStorage.setItem('api_provider', this.providerKey);
        localStorage.setItem(`${this.providerKey}_api_key`, this.apiKey);
        localStorage.setItem(`${this.providerKey}_endpoint`, this.endpoint);
        localStorage.setItem('current_persona', this.currentPersona);
        
        // 保存新增配置
        localStorage.setItem('context_length', this.contextLength.toString());
        localStorage.setItem('temperature', this.temperature.toString());
        localStorage.setItem('top_p', this.topP.toString());
        localStorage.setItem('math_renderer', this.mathRenderer);
    }
}

// 聊天界面管理器
class ChatUIManager {
    constructor() {
        this.config = new Config();
        this.messages = [];
        this.isGenerating = false;
        this.abortController = null;
        this.initialize();
    }

    async initialize() {
        // 更新loading状态
        this.updateLoadingStatus('加载配置中...');
        
        await this.config.loadPersonas();
        this.initTheme();
        this.updatePersonaVisuals();
        
        this.updateLoadingStatus('初始化界面...');
        await this.initializeUI();
        this.bindEvents();
        this.updateStatus();
        
        // 确保DOM完全加载后再绑定滚动事件
        this.updateLoadingStatus('绑定事件...');
        setTimeout(() => {
            this.bindScrollEvents();
        }, 100);
        
        // 页面加载完成后检测初始滚动位置并确保滚动到底部
        this.updateLoadingStatus('完成初始化...');
        setTimeout(() => {
            this.checkInitialScrollPosition();
            // 最终确保滚动到底部
            this.ensureScrollToBottom();
            
            // 等待所有资源加载完成后隐藏loading页面
            this.waitForAllResourcesLoaded();
        }, 500);
    }

    async initializeUI() {
        // 清空现有消息，但保留返回底部按钮
        const messagesContainer = document.getElementById('messages');
        const scrollToBottomBtn = document.getElementById('scrollToBottomBtn');
        
        // 清空消息，但保留按钮
        const messages = messagesContainer.querySelectorAll('.message');
        messages.forEach(msg => msg.remove());
        
        // 尝试加载最近的聊天记录
        await this.loadRecentMessages();
    }

    async loadRecentMessages() {
        try {
            // 等待chatManager初始化完成
            if (!window.chatManager || !window.chatManager.db) {
                // 如果chatManager还没初始化，等待一下再试
                setTimeout(() => this.loadRecentMessages(), 100);
                return;
            }

            // 获取最近的会话
            const sessions = await window.chatManager.getAllSessions();
            
            if (sessions.length > 0) {
                // 获取最近会话的消息
                const latestSession = sessions[0];
                const messages = await window.chatManager.getMessagesBySessionId(latestSession.sessionId);
                
                if (messages.length > 0) {
                    // 切换到最近的会话
                    window.chatManager.switchToSession(latestSession.sessionId);
                    
                    // 显示历史消息
                    for (const message of messages) {
                        await this.addMessage(
                            message.type === 'user' ? 'user' : 'assistant', 
                            message.message,
                            { skipSave: true } // 跳过保存，因为这些是已存在的消息
                        );
                        
                        // 同步到内存中的消息历史
                        this.messages.push({
                            role: message.type === 'user' ? 'user' : 'assistant',
                            content: message.message
                        });
                    }
                    
                    console.log(`已加载 ${messages.length} 条历史消息`);
                    
                    // 加载历史消息后强制滚动到底部
                    setTimeout(() => {
                        this.forceScrollToBottom();
                        console.log('历史消息加载完成，已滚动到底部');
                    }, 200);
                    return;
                }
            }
            
            // 如果没有历史记录，显示欢迎消息
            await this.showWelcomeMessage();
            
        } catch (error) {
            console.error('加载历史消息失败:', error);
            // 出错时显示欢迎消息
            await this.showWelcomeMessage();
        }
    }

    async showWelcomeMessage() {
        // 获取当前角色的自定义开场白
        const persona = this.config.personas[this.config.currentPersona];
        const greeting = persona?.greeting || (window.getRoleGreeting ? window.getRoleGreeting(this.config.currentPersona) : '你好！我是你的AI陪伴，有什么想聊的吗？ 😊');
        
        // 添加欢迎消息（首条使用机器人头像）
        await this.addMessage('assistant', greeting, { robotFirst: true });
        
        // 显示欢迎消息后确保滚动到底部
        setTimeout(() => {
            this.forceScrollToBottom();
            console.log('欢迎消息显示完成，已滚动到底部');
        }, 100);
    }

    async startNewChat() {
        // 确认是否开始新对话
        if (this.messages.length > 0) {
            const confirmed = await showConfirm(
                '确定要开始新对话吗？当前对话将被保存到历史记录中。',
                '开始新对话',
                { confirmText: '开始新对话', cancelText: '取消' }
            );
            if (!confirmed) {
                return;
            }
        }

        // 开始新会话
        if (window.chatManager) {
            window.chatManager.startNewSession();
        }

        // 清空当前消息
        this.messages = [];
        
        // 清空界面但保留返回底部按钮
        const messagesContainer = document.getElementById('messages');
        const messages = messagesContainer.querySelectorAll('.message');
        messages.forEach(msg => msg.remove());
        
        // 重置返回底部按钮状态
        this.resetScrollToBottomButton();
        
        // 重置发送按钮状态
        this.updateGeneratingState(false);
        
        await this.showWelcomeMessage();
        
        // 新对话开始后确保滚动到底部
        setTimeout(() => {
            this.forceScrollToBottom();
        }, 100);
        
        console.log('已开始新对话');
    }

    bindEvents() {
        // 发送/停止按钮
        const sendBtn = document.querySelector('.input-box button');
        sendBtn.addEventListener('click', () => {
            if (this.isGenerating) {
                this.stopGeneration();
            } else {
                this.sendMessage();
            }
        });

        // 回车键用于正常换行，不发送消息
        const input = document.getElementById('inputText');
        // 移除回车发送功能，允许回车正常换行

        // 设置按钮
        document.getElementById('settingsBtn').addEventListener('click', () => {
            this.showSettings();
        });

        // 新对话按钮
        document.getElementById('newChatBtn').addEventListener('click', () => {
            this.startNewChat();
        });

        // 聊天记录按钮
        document.getElementById('historyBtn').addEventListener('click', () => {
            if (window.chatHistoryUI) {
                window.chatHistoryUI.show();
            }
        });

        // 主题切换
        const themeBtn = document.getElementById('themeToggleBtn');
        if (themeBtn) {
            themeBtn.addEventListener('click', () => this.toggleTheme());
        }
        this.updateThemeIcon();

        // 停止按钮（可选存在）
        const stopBtn = document.getElementById('stopBtn');
        if (stopBtn) {
            stopBtn.addEventListener('click', () => {
                this.stopGeneration();
            });
        }

        // 手机端工具栏按钮事件绑定
        const newChatBtnMobile = document.getElementById('newChatBtnMobile');
        if (newChatBtnMobile) {
            newChatBtnMobile.addEventListener('click', () => {
                this.startNewChat();
            });
        }

        const historyBtnMobile = document.getElementById('historyBtnMobile');
        if (historyBtnMobile) {
            historyBtnMobile.addEventListener('click', () => {
                if (window.chatHistoryUI) {
                    window.chatHistoryUI.show();
                }
            });
        }

        const themeToggleBtnMobile = document.getElementById('themeToggleBtnMobile');
        if (themeToggleBtnMobile) {
            themeToggleBtnMobile.addEventListener('click', () => {
                this.toggleTheme();
            });
        }

        const settingsBtnMobile = document.getElementById('settingsBtnMobile');
        if (settingsBtnMobile) {
            settingsBtnMobile.addEventListener('click', () => {
                this.showSettings();
            });
        }

        // 媒体大小滑块
        const mediaSizeSlider = document.getElementById('mediaSizeSlider');
        const sizeValue = document.getElementById('sizeValue');
        if (mediaSizeSlider && sizeValue) {
            // 从本地存储加载媒体大小设置
            const savedSize = localStorage.getItem('media_size') || '75';
            mediaSizeSlider.value = savedSize;
            sizeValue.textContent = savedSize + '%';
            this.updateMediaSize(parseInt(savedSize));

            mediaSizeSlider.addEventListener('input', (e) => {
                const value = e.target.value;
                sizeValue.textContent = value + '%';
                this.updateMediaSize(parseInt(value));
                localStorage.setItem('media_size', value);
            });
        }

        // 返回底部按钮和滚动事件将在bindScrollEvents中绑定
    }

    // 更新媒体大小
    updateMediaSize(size) {
        const mediaContainer = document.getElementById('leftMediaContainer');
        if (mediaContainer) {
            mediaContainer.style.width = size + '%';
        }
    }

    updateStatus() {
        const personaSpan = document.getElementById('currentPersona');
        const endpointSpan = document.getElementById('currentEndpoint');
        const { conf } = getActiveProvider(this.config.providerKey);

        // 若状态栏不存在（已从UI移除），直接返回
        if (!personaSpan || !endpointSpan) return;

        const persona = this.config.personas[this.config.currentPersona];
        const modelAlias = conf.models[this.config.endpoint] || this.config.endpoint;

        personaSpan.textContent = `角色: ${persona ? persona.name : '加载中...'}`;
        endpointSpan.textContent = `端点: ${conf.name} · ${modelAlias}`;
    }

    async sendMessage() {
        const input = document.getElementById('inputText');
        const message = input.value.trim();
        
        if (!message || this.isGenerating) return;

        if (!this.config.apiKey) {
            await showWarning('请先在设置中配置API密钥', '配置提醒');
            this.showSettings();
            return;
        }

        // 添加用户消息
        await this.addMessage('user', message);
        input.value = '';

        // 添加到消息历史
        this.messages.push({ role: 'user', content: message });

        // 发送消息后强制滚动到底部
        this.forceScrollToBottom();

        // 开始生成回复
        await this.generateResponse();
    }

    async addMessage(role, content, options = {}) {
        const messagesContainer = document.getElementById('messages');
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role === 'user' ? 'self' : ''}`;

        // 渲染消息内容
        let renderedContent;
        if (role === 'user') {
            // 用户消息使用简单的HTML转义
            renderedContent = this.escapeHtml(content);
        } else {
            // AI消息使用富文本渲染器
            if (window.messageRenderer) {
                try {
                    renderedContent = await window.messageRenderer.render(content);
                } catch (error) {
                    console.error('渲染消息失败，使用降级方案:', error);
                    renderedContent = this.escapeHtml(content).replace(/\n/g, '<br>');
                }
            } else {
                // 降级方案
                renderedContent = this.escapeHtml(content).replace(/\n/g, '<br>');
            }
        }

        if (role === 'user') {
            messageDiv.innerHTML = `
                <div class="bubble">${renderedContent}</div>
                <i class="fa-solid fa-user avatar" aria-hidden="true"></i>
            `;
        } else {
            if (options.robotFirst) {
                messageDiv.innerHTML = `
                    <i class="fa-solid fa-robot avatar" aria-hidden="true"></i>
                    <div class="bubble rich-content">${renderedContent}</div>
                `;
            } else {
                const avatar = this.assistantAvatar || './avatars/avatar.jpg';
                messageDiv.innerHTML = `
                    <img src="${avatar}" alt="头像">
                    <div class="bubble rich-content">${renderedContent}</div>
                `;
            }
        }

        messagesContainer.appendChild(messageDiv);
        
        // 如果是AI消息且使用MathJax，需要重新渲染数学公式
        if (role !== 'user' && window.messageRenderer && window.messageRenderer.getMathRenderer() === 'mathjax') {
            setTimeout(() => {
                window.messageRenderer.renderMathJax(messageDiv);
            }, 100);
        }
        
        // 使用新的自动滚动方法
        this.autoScrollToBottom();
        
        // 保存消息到 IndexedDB（排除欢迎消息和历史消息）
        if (window.chatManager && !options.robotFirst && !options.skipSave) {
            const persona = this.config.personas[this.config.currentPersona];
            await window.chatManager.saveMessage(
                content, 
                role === 'user' ? 'user' : 'ai',
                persona ? persona.name : null
            );
        }
        
        // 更新按钮状态
        this.updateScrollButtonState();
        
        return messageDiv;
    }

    async generateResponse() {
        this.isGenerating = true;
        this.updateGeneratingState(true);

        // 创建临时消息用于流式显示（不保存到数据库）
        const tempMessage = await this.addMessage('assistant', '<div class="thinking-animation"><span class="dot"></span><span class="dot"></span><span class="dot"></span></div>', { skipSave: true });
        const bubble = tempMessage.querySelector('.bubble');

        try {
            // 按顺序组装：系统提示词(合并角色提示词) + 历史信息（含本次用户消息）
            const persona = this.config.personas[this.config.currentPersona];
            const systemMessage = this.config.systemPrompt;
            const roleMessage = persona?.rolePrompt;
            const history = this.messages.slice(-this.config.contextLength); // 根据配置保留历史消息
            const combinedSystem = roleMessage ? `${systemMessage}

${roleMessage}` : systemMessage;
            
            const requestMessages = [
                { role: 'system', content: combinedSystem },
                ...history
            ];

            // 创建AbortController用于取消请求
            this.abortController = new AbortController();

            const { conf } = getActiveProvider(this.config.providerKey);
            // 组装请求头：用配置模板替换 {API_KEY}/{REFERER}
            const headers = {};
            for (const [k, v] of Object.entries(conf.headers || {})) {
                headers[k] = String(v)
                    .replace('{API_KEY}', this.config.apiKey || '')
                    .replace('{REFERER}', window.location.origin);
            }

            const response = await fetch(conf.baseURL, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    model: this.config.endpoint,
                    messages: requestMessages,
                    stream: true,
                    temperature: this.config.temperature,
                    top_p: this.config.topP,
                    max_tokens: 1000
                }),
                signal: this.abortController.signal
            });

            if (!response.ok) {
                throw new Error(`API请求失败: ${response.status} ${response.statusText}`);
            }

            // 处理流式响应
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let assistantMessage = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6);
                        if (data === '[DONE]') continue;

                        try {
                            const parsed = JSON.parse(data);
                            const delta = parsed.choices?.[0]?.delta?.content;
                            if (delta) {
                                assistantMessage += delta;
                                // 实时渲染
                                if (window.messageRenderer) {
                                    const renderedContent = await window.messageRenderer.render(assistantMessage);
                                    bubble.innerHTML = renderedContent;
                                    bubble.classList.add('rich-content');
                                    
                                    // 如果使用MathJax，需要重新渲染数学公式
                                    if (window.messageRenderer.getMathRenderer() === 'mathjax') {
                                        setTimeout(() => {
                                            window.messageRenderer.renderMathJax(bubble);
                                        }, 50);
                                    }
                                } else {
                                    bubble.textContent = assistantMessage;
                                }
                                // 使用新的自动滚动方法
                                this.autoScrollToBottom();
                            }
                        } catch (e) {
                            // 忽略解析错误
                        }
                    }
                }
            }



            // 添加到消息历史
            if (assistantMessage) {
                this.messages.push({ role: 'assistant', content: assistantMessage });
                
                // 保存AI回复到 IndexedDB
                if (window.chatManager) {
                    const persona = this.config.personas[this.config.currentPersona];
                    await window.chatManager.saveMessage(
                        assistantMessage, 
                        'ai',
                        persona ? persona.name : null
                    );
                }
            }

        } catch (error) {
            if (error.name === 'AbortError') {
                bubble.textContent = '生成已停止';
            } else {
                console.error('生成回复失败:', error);
                bubble.textContent = `抱歉，生成回复时出现错误: ${error.message}`;
            }
        } finally {
            this.isGenerating = false;
            this.updateGeneratingState(false);
            this.abortController = null;
        }
    }

    stopGeneration() {
        if (this.abortController) {
            this.abortController.abort();
        }
        
        // 添加停止响应的消息
        this.addStoppedMessage();
    }

    async addStoppedMessage() {
        const messagesContainer = document.getElementById('messages');
        const lastMessage = messagesContainer.lastElementChild;
        
        // 如果最后一条消息是AI消息且正在生成，更新它
        if (lastMessage && !lastMessage.classList.contains('self')) {
            const bubble = lastMessage.querySelector('.bubble');
            if (bubble) {
                const currentContent = bubble.innerHTML;
                bubble.innerHTML = currentContent + '<br><em style="color: #888;">已停止响应</em>';
            }
        }
    }

    updateGeneratingState(generating) {
        const sendBtn = document.querySelector('.input-box button');
        const input = document.getElementById('inputText');
        
        if (sendBtn) {
            if (generating) {
                sendBtn.innerHTML = '<i class="fa-solid fa-stop"></i>';
                sendBtn.classList.add('stop-btn');
            } else {
                sendBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i>';
                sendBtn.classList.remove('stop-btn');
            }
        }
        
        input.disabled = generating;
        input.placeholder = generating ? '正在生成回复...' : '输入消息...';
    }

    initTheme() {
        const saved = localStorage.getItem('theme') || 'dark';
        this.applyTheme(saved);
        this.updateThemeIcon();
    }

    applyTheme(theme) {
        const isLight = theme === 'light';
        document.body.classList.toggle('light-mode', isLight);
        document.body.classList.toggle('dark-mode', !isLight);
        localStorage.setItem('theme', isLight ? 'light' : 'dark');
    }

    toggleTheme() {
        const isLight = document.body.classList.contains('light-mode');
        this.applyTheme(isLight ? 'dark' : 'light');
        this.updateThemeIcon();
    }

    updateThemeIcon() {
        const themeBtn = document.getElementById('themeToggleBtn');
        if (!themeBtn) return;
        const isLight = document.body.classList.contains('light-mode');
        // 显示当前模式图标：浅色=太阳，深色=月亮
        themeBtn.innerHTML = `<i class="fa-solid ${isLight ? 'fa-sun' : 'fa-moon'}" aria-hidden="true"></i>`;
        themeBtn.setAttribute('title', isLight ? '切换为夜间模式' : '切换为白昼模式');
        themeBtn.setAttribute('aria-label', isLight ? '切换为夜间模式' : '切换为白昼模式');
    }

    // 根据当前人格更新左侧大图和助手头像
    updatePersonaVisuals() {
        const persona = this.config.personas[this.config.currentPersona] || {};
        this.updateLeftMedia(persona);
        this.updateCharacterName(persona);
        this.assistantAvatar = persona.avatar || './avatars/avatar.jpg';
    }

    // 更新角色名称显示
    updateCharacterName(persona) {
        const characterNameElement = document.getElementById('characterName');
        const mobileCharacterNameElement = document.getElementById('mobileCharacterName');
        const name = persona.name || '未知角色';
        
        if (characterNameElement) {
            characterNameElement.textContent = name;
        }
        if (mobileCharacterNameElement) {
            mobileCharacterNameElement.textContent = name;
        }
    }

    // 更新左侧媒体显示（图片或视频）
    updateLeftMedia(persona) {
        const leftImg = document.getElementById('leftImage');
        const leftVideo = document.getElementById('leftVideo');
        const mediaContainer = document.getElementById('leftMediaContainer');
        
        // 获取媒体信息，支持新旧字段
        const mediaPath = persona.leftMedia || persona.leftImage || './imgs/img.jpg';
        const mediaType = persona.mediaType || (window.detectMediaType ? window.detectMediaType(mediaPath) : 'image');
        
        if (!leftImg || !leftVideo) {
            // 如果新的HTML结构不存在，回退到旧的方式
            const oldImg = document.querySelector('.left-panel img');
            if (oldImg) {
                oldImg.src = mediaPath;
            }
            return;
        }

        if (mediaType === 'video') {
            // 显示视频，隐藏图片
            leftImg.style.display = 'none';
            leftVideo.style.display = 'block';
            
            // 设置视频源
            const source = leftVideo.querySelector('source');
            if (source) {
                source.src = mediaPath;
                
                // 根据文件扩展名设置正确的MIME类型
                const extension = mediaPath.toLowerCase().split('.').pop();
                switch (extension) {
                    case 'mp4':
                        source.type = 'video/mp4';
                        break;
                    case 'webm':
                        source.type = 'video/webm';
                        break;
                    case 'ogg':
                        source.type = 'video/ogg';
                        break;
                    default:
                        source.type = 'video/mp4';
                }
            }
            
            // 添加视频加载错误处理
            leftVideo.onerror = () => {
                console.error('视频加载失败，回退到图片模式:', mediaPath);
                // 回退到图片模式
                leftVideo.style.display = 'none';
                leftImg.style.display = 'block';
                leftImg.src = persona.avatar || './imgs/img.jpg'; // 使用头像作为备用图片
            };
            
            // 重新加载视频
            leftVideo.load();
            
            // 尝试播放视频（静音自动播放）
            leftVideo.play().catch(error => {
                console.warn('视频自动播放失败:', error);
                // 如果自动播放失败，视频仍然会显示第一帧
            });
            
            console.log('已切换到视频模式:', mediaPath);
        } else {
            // 显示图片，隐藏视频
            leftVideo.style.display = 'none';
            leftImg.style.display = 'block';
            
            // 暂停视频（如果正在播放）
            if (!leftVideo.paused) {
                leftVideo.pause();
            }
            
            // 设置图片源
            leftImg.src = mediaPath;
            
            console.log('已切换到图片模式:', mediaPath);
        }
    }

    showSettings() {
        // 全屏设置视图
        const settingsView = document.createElement('div');
        settingsView.id = 'settingsView';

        // 顶部栏
        const header = document.createElement('div');
        header.className = 'settings-header';
        header.innerHTML = `
            <button id="backBtn" aria-label="返回"><i class="fa-solid fa-arrow-left" aria-hidden="true"></i></button>
            <span>设置</span>
        `;

        // 内容区域
        const content = document.createElement('div');
        content.className = 'settings-content';

        const providerOrder = PROVIDER_ORDER.filter(k => API_CONFIG[k]);
        const providerOptions = providerOrder
            .map(k => `<option value="${k}">${API_CONFIG[k].name}</option>`)
            .join('');
        const { conf } = getActiveProvider(this.config.providerKey);
        let modelOptions = Object.entries(conf.models || {})
            .map(([id, alias]) => `<option value="${id}">${alias}</option>`)
            .join('');
        const personaOptions = Object.keys(this.config.personas)
            .map(key => `<option value="${key}">${this.config.personas[key].name}</option>`)
            .join('');

        content.innerHTML = `
            <div class="form-group">
              <label for="providerSelect">提供方</label>
              <select id="providerSelect">${providerOptions}</select>
            </div>

            <div class="form-group">
              <label for="apiKeyInput">API密钥</label>
              <input type="password" id="apiKeyInput" value="${this.config.apiKey}">
            </div>

            <div class="form-group">
              <label for="endpointSelect">模型</label>
              <select id="endpointSelect">${modelOptions}</select>
            </div>

            <div class="form-group">
              <label for="personaSelect">角色人格</label>
              <select id="personaSelect">${personaOptions}</select>
            </div>

            <div class="form-group">
              <label for="contextLengthInput">上下文长度 (1-25)</label>
              <input type="range" id="contextLengthInput" min="1" max="25" value="${this.config.contextLength}">
              <span id="contextLengthValue">${this.config.contextLength}</span>
            </div>

            <div class="form-group">
              <label for="temperatureInput">Temperature (0-2)</label>
              <input type="range" id="temperatureInput" min="0" max="2" step="0.1" value="${this.config.temperature}">
              <span id="temperatureValue">${this.config.temperature}</span>
            </div>

            <div class="form-group">
              <label for="topPInput">Top P (0-1)</label>
              <input type="range" id="topPInput" min="0" max="1" step="0.1" value="${this.config.topP}">
              <span id="topPValue">${this.config.topP}</span>
            </div>

            <div class="form-group">
              <label for="mathRendererSelect">数学公式渲染</label>
              <select id="mathRendererSelect">
                <option value="katex" ${this.config.mathRenderer === 'katex' ? 'selected' : ''}>KaTeX</option>
                <option value="mathjax" ${this.config.mathRenderer === 'mathjax' ? 'selected' : ''}>MathJax</option>
              </select>
            </div>

            <div class="form-actions">
              <button id="forceRefreshBtn" class="btn-secondary">强制刷新</button>
              <button id="saveBtn" class="btn-primary">保存</button>
            </div>
        `;

        settingsView.appendChild(header);
        settingsView.appendChild(content);
        document.body.appendChild(settingsView);

        // 绑定元素
        const providerSelect = settingsView.querySelector('#providerSelect');
        const endpointSelect = settingsView.querySelector('#endpointSelect');
        const personaSelect = settingsView.querySelector('#personaSelect');
        const contextLengthInput = settingsView.querySelector('#contextLengthInput');
        const temperatureInput = settingsView.querySelector('#temperatureInput');
        const topPInput = settingsView.querySelector('#topPInput');
        const mathRendererSelect = settingsView.querySelector('#mathRendererSelect');
        const backBtn = settingsView.querySelector('#backBtn');
        const forceRefreshBtn = settingsView.querySelector('#forceRefreshBtn');

        // 设置当前值
        providerSelect.value = this.config.providerKey;
        endpointSelect.value = this.config.endpoint;
        personaSelect.value = this.config.currentPersona;

        // 绑定滑块事件
        contextLengthInput.addEventListener('input', (e) => {
            const value = e.target.value;
            settingsView.querySelector('#contextLengthValue').textContent = value;
        });

        temperatureInput.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value).toFixed(1);
            settingsView.querySelector('#temperatureValue').textContent = value;
        });

        topPInput.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value).toFixed(1);
            settingsView.querySelector('#topPValue').textContent = value;
        });

        // 返回键：不保存，关闭视图
        backBtn.onclick = () => {
            document.body.removeChild(settingsView);
        };

        // 强制刷新按钮
        forceRefreshBtn.onclick = async () => {
            const confirmed = await showConfirm(
                '确定要强制刷新页面吗？这将清除所有缓存并重新加载页面，未保存的设置将丢失。',
                '强制刷新',
                { confirmText: '刷新', cancelText: '取消' }
            );
            if (confirmed) {
                // 实现硬刷新，相当于 Ctrl+F5
                if ('serviceWorker' in navigator) {
                    // 清除 Service Worker 缓存
                    navigator.serviceWorker.getRegistrations().then(registrations => {
                        registrations.forEach(registration => registration.unregister());
                    });
                }
                
                // 清除各种缓存
                if ('caches' in window) {
                    caches.keys().then(names => {
                        names.forEach(name => caches.delete(name));
                    });
                }
                
                // 清除本地存储（可选，根据需要）
                // localStorage.clear();
                // sessionStorage.clear();
                
                // 使用 location.reload(true) 强制从服务器重新加载
                // 如果不支持，则添加随机参数强制刷新
                try {
                    location.reload(true);
                } catch (e) {
                    // 现代浏览器可能不支持 reload(true)，使用替代方案
                    window.location.href = window.location.href + '?_t=' + Date.now();
                }
            }
        };

        // 提供方变更：更新模型选项并应用默认模型
        providerSelect.onchange = () => {
            this.config.providerKey = providerSelect.value;
            const { conf: confSel } = getActiveProvider(this.config.providerKey);
            const opts = Object.entries(confSel.models || {})
                .map(([id, alias]) => `<option value="${id}">${alias}</option>`)
                .join('');
            endpointSelect.innerHTML = opts;
            endpointSelect.value = confSel.defaultModel;
        };

        // 保存
        settingsView.querySelector('#saveBtn').onclick = async () => {
            const oldPersona = this.config.currentPersona;
            
            this.config.apiKey = settingsView.querySelector('#apiKeyInput').value.trim();
            this.config.endpoint = endpointSelect.value;
            this.config.currentPersona = personaSelect.value;
            this.config.contextLength = parseInt(contextLengthInput.value);
            this.config.temperature = parseFloat(temperatureInput.value);
            this.config.topP = parseFloat(topPInput.value);
            this.config.mathRenderer = mathRendererSelect.value;
            this.config.save();
            this.updatePersonaVisuals();
            this.updateStatus();
            
            // 如果角色发生变化，询问是否开始新对话以体验新角色
            if (oldPersona !== this.config.currentPersona && this.messages.length > 0) {
                const confirmed = await showConfirm(
                    `角色已切换为"${this.config.personas[this.config.currentPersona]?.name || '未知角色'}"。是否开始新对话以体验新角色的开场白？`,
                    '角色已切换',
                    { confirmText: '开始新对话', cancelText: '继续当前对话' }
                );
                if (confirmed) {
                    // 延迟执行，确保设置窗口先关闭
                    setTimeout(() => {
                        this.startNewChat();
                    }, 100);
                }
            }
            
            // 如果数学渲染器发生变化，重新加载页面以应用新的渲染器
            const oldMathRenderer = localStorage.getItem('math_renderer');
            if (oldMathRenderer && oldMathRenderer !== this.config.mathRenderer) {
                await showAlert('数学公式渲染器已更改，页面将重新加载以应用更改。', '设置已保存');
                location.reload();
                return;
            }
            
            // 显示保存成功提示
            await showSuccess('设置已成功保存！', '保存成功');
            document.body.removeChild(settingsView);
        };
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // 绑定滚动相关事件
    bindScrollEvents() {
        const messagesContainer = document.getElementById('messages');
        const scrollToBottomBtn = document.getElementById('scrollToBottomBtn');
        
        console.log('尝试绑定滚动事件...');
        console.log('消息容器:', messagesContainer);
        console.log('返回底部按钮:', scrollToBottomBtn);
        
        if (!messagesContainer || !scrollToBottomBtn) {
            console.error('找不到消息容器或返回底部按钮，将在500ms后重试');
            setTimeout(() => {
                this.bindScrollEvents();
            }, 500);
            return;
        }

        // 返回底部按钮点击事件
        scrollToBottomBtn.addEventListener('click', () => {
            console.log('点击返回底部按钮');
            this.scrollToBottom();
        });

        // 监听消息容器滚动事件
        messagesContainer.addEventListener('scroll', () => {
            this.handleScroll();
        });

        console.log('滚动事件绑定成功！');
    }

    // 处理滚动事件，控制返回底部按钮的显示
    handleScroll() {
        const messagesContainer = document.getElementById('messages');
        const scrollToBottomBtn = document.getElementById('scrollToBottomBtn');
        
        if (!messagesContainer || !scrollToBottomBtn) {
            return;
        }

        // 计算是否接近底部（允许一些误差）
        const { scrollTop, scrollHeight, clientHeight } = messagesContainer;
        const isNearBottom = scrollHeight - scrollTop - clientHeight < 50;

        // 控制按钮显示/隐藏
        if (isNearBottom) {
            scrollToBottomBtn.classList.remove('show');
        } else {
            scrollToBottomBtn.classList.add('show');
        }
    }

    // 平滑滚动到底部
    scrollToBottom() {
        const messagesContainer = document.getElementById('messages');
        if (!messagesContainer) return;

        messagesContainer.scrollTo({
            top: messagesContainer.scrollHeight,
            behavior: 'smooth'
        });
    }

    // 自动滚动到底部（用于新消息）
    autoScrollToBottom() {
        const messagesContainer = document.getElementById('messages');
        if (!messagesContainer) return;

        // 检查用户是否已经在底部附近
        const { scrollTop, scrollHeight, clientHeight } = messagesContainer;
        const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;

        // 只有在用户接近底部时才自动滚动
        if (isNearBottom) {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
    }

    // 强制滚动到底部（用于发送消息时）
    forceScrollToBottom() {
        const messagesContainer = document.getElementById('messages');
        if (!messagesContainer) return;

        // 立即滚动到底部
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        
        // 隐藏返回底部按钮
        const scrollToBottomBtn = document.getElementById('scrollToBottomBtn');
        if (scrollToBottomBtn) {
            scrollToBottomBtn.classList.remove('show');
        }
        
        console.log('强制滚动到底部');
    }

    // 检查页面加载时的初始滚动位置
    checkInitialScrollPosition() {
        const messagesContainer = document.getElementById('messages');
        const scrollToBottomBtn = document.getElementById('scrollToBottomBtn');
        
        if (!messagesContainer || !scrollToBottomBtn) {
            console.log('初始位置检测：找不到必要元素，将重试');
            setTimeout(() => {
                this.checkInitialScrollPosition();
            }, 200);
            return;
        }

        // 检查是否有足够的内容可以滚动
        const { scrollHeight, clientHeight } = messagesContainer;
        const hasScrollableContent = scrollHeight > clientHeight;
        
        if (hasScrollableContent) {
            // 有可滚动内容，首先滚动到底部（确保初始状态在底部）
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
            
            // 然后检查当前位置
            const { scrollTop } = messagesContainer;
            const isNearBottom = scrollHeight - scrollTop - clientHeight < 50;
            
            if (!isNearBottom) {
                // 不在底部，显示返回底部按钮
                scrollToBottomBtn.classList.add('show');
                console.log('页面加载时检测到不在底部，显示返回底部按钮');
            } else {
                // 在底部，隐藏按钮
                scrollToBottomBtn.classList.remove('show');
                console.log('页面加载时已在底部，隐藏返回底部按钮');
            }
        } else {
            // 没有可滚动内容，隐藏按钮
            scrollToBottomBtn.classList.remove('show');
            console.log('页面无滚动内容，隐藏返回底部按钮');
        }
    }

    // 重置返回底部按钮状态
    resetScrollToBottomButton() {
        const scrollToBottomBtn = document.getElementById('scrollToBottomBtn');
        if (scrollToBottomBtn) {
            scrollToBottomBtn.classList.remove('show');
            console.log('重置返回底部按钮状态');
        }
    }

    // 实时检测并更新按钮状态（在添加消息后调用）
    updateScrollButtonState() {
        // 延迟一点时间让DOM更新完成
        setTimeout(() => {
            this.checkInitialScrollPosition();
        }, 100);
    }

    // 确保滚动到底部（用于页面初始化）
    ensureScrollToBottom() {
        const messagesContainer = document.getElementById('messages');
        if (!messagesContainer) {
            console.log('消息容器未找到，将重试');
            setTimeout(() => {
                this.ensureScrollToBottom();
            }, 200);
            return;
        }

        // 检查是否有内容
        const { scrollHeight, clientHeight } = messagesContainer;
        const hasContent = scrollHeight > clientHeight;
        
        if (hasContent) {
            // 有内容时强制滚动到底部
            this.forceScrollToBottom();
            console.log('页面初始化完成，已确保滚动到底部');
        } else {
            console.log('页面无滚动内容，无需滚动');
        }
    }

    // 处理当前对话被删除的情况
    async handleCurrentSessionDeleted() {
        console.log('当前对话已被删除，清空主页面并新建对话');
        
        // 清空当前消息
        this.messages = [];
        
        // 清空界面但保留返回底部按钮
        const messagesContainer = document.getElementById('messages');
        const messages = messagesContainer.querySelectorAll('.message');
        messages.forEach(msg => msg.remove());
        
        // 重置返回底部按钮状态
        this.resetScrollToBottomButton();
        
        // 重置发送按钮状态
        this.updateGeneratingState(false);
        
        // 开始新会话（不需要确认，因为当前会话已被删除）
        if (window.chatManager) {
            window.chatManager.startNewSession();
        }
        
        // 显示欢迎消息
        await this.showWelcomeMessage();
        
        console.log('已清空主页面并开始新对话');
    }

    // Loading页面控制方法
    updateLoadingStatus(status) {
        const loadingStatus = document.getElementById('loadingScreen')?.querySelector('.loading-status');
        if (loadingStatus) {
            loadingStatus.textContent = status;
        }
    }

    waitForAllResourcesLoaded() {
        this.updateLoadingStatus('加载资源中...');
        
        // 检查页面加载状态
        if (document.readyState === 'complete') {
            // 页面已完全加载，等待图片和其他资源
            this.waitForImages();
        } else {
            // 等待页面完全加载
            window.addEventListener('load', () => {
                this.waitForImages();
            });
        }
    }

    waitForImages() {
        this.updateLoadingStatus('加载图片资源...');
        
        const images = document.querySelectorAll('img');
        const videos = document.querySelectorAll('video');
        const allMedia = [...images, ...videos];
        
        if (allMedia.length === 0) {
            // 没有媒体资源，直接完成
            this.finishLoading();
            return;
        }
        
        let loadedCount = 0;
        const totalCount = allMedia.length;
        let hasFinished = false;
        
        const checkAllLoaded = () => {
            if (hasFinished) return;
            
            loadedCount++;
            this.updateLoadingStatus(`加载资源中... (${loadedCount}/${totalCount})`);
            
            if (loadedCount >= totalCount) {
                hasFinished = true;
                this.finishLoading();
            }
        };
        
        // 为每个媒体资源设置单独的超时
        allMedia.forEach((media, index) => {
            let mediaLoaded = false;
            
            const handleMediaLoad = () => {
                if (mediaLoaded) return;
                mediaLoaded = true;
                checkAllLoaded();
            };
            
            if (media.tagName === 'IMG') {
                if (media.complete && media.naturalHeight !== 0) {
                    // 图片已加载
                    handleMediaLoad();
                } else {
                    // 等待图片加载
                    media.addEventListener('load', handleMediaLoad);
                    media.addEventListener('error', handleMediaLoad);
                    
                    // 为每个图片设置3秒超时
                    setTimeout(() => {
                        if (!mediaLoaded) {
                            console.warn(`图片加载超时: ${media.src}`);
                            handleMediaLoad();
                        }
                    }, 3000);
                }
            } else if (media.tagName === 'VIDEO') {
                if (media.readyState >= 2) { // 降低要求，有元数据就算加载完成
                    // 视频已加载基本数据
                    handleMediaLoad();
                } else {
                    // 等待视频加载
                    media.addEventListener('loadedmetadata', handleMediaLoad);
                    media.addEventListener('canplay', handleMediaLoad);
                    media.addEventListener('error', handleMediaLoad);
                    
                    // 为每个视频设置5秒超时
                    setTimeout(() => {
                        if (!mediaLoaded) {
                            console.warn(`视频加载超时: ${media.src}`);
                            handleMediaLoad();
                        }
                    }, 5000);
                }
            }
        });
        
        // 设置全局超时，防止整体加载过久
        setTimeout(() => {
            if (!hasFinished) {
                console.warn(`资源加载全局超时，已加载 ${loadedCount}/${totalCount} 个资源`);
                hasFinished = true;
                this.finishLoading();
            }
        }, 8000); // 8秒全局超时
        
        // 如果大部分资源已加载，提前完成
        const checkProgress = () => {
            if (hasFinished) return;
            
            const progressPercent = loadedCount / totalCount;
            if (progressPercent >= 0.8 && loadedCount >= totalCount - 2) {
                // 如果80%以上资源已加载且只剩1-2个资源，等待2秒后强制完成
                setTimeout(() => {
                    if (!hasFinished && loadedCount >= totalCount - 2) {
                        console.log(`大部分资源已加载完成 (${loadedCount}/${totalCount})，提前完成`);
                        hasFinished = true;
                        this.finishLoading();
                    }
                }, 2000);
            }
        };
        
        // 每秒检查一次进度
        const progressInterval = setInterval(() => {
            if (hasFinished) {
                clearInterval(progressInterval);
                return;
            }
            checkProgress();
        }, 1000);
    }

    finishLoading() {
        this.updateLoadingStatus('加载完成');
        
        // 等待一小段时间让用户看到完成状态
        setTimeout(() => {
            this.hideLoadingScreen();
        }, 500);
    }

    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loadingScreen');
        const mainApp = document.getElementById('mainApp');
        
        if (loadingScreen && mainApp) {
            // 添加淡出效果
            loadingScreen.classList.add('fade-out');
            
            // 显示主应用
            mainApp.style.display = 'flex';
            
            // 等待动画完成后移除loading页面
            setTimeout(() => {
                if (loadingScreen.parentNode) {
                    loadingScreen.parentNode.removeChild(loadingScreen);
                }
            }, 500);
            
            console.log('Loading页面已隐藏，主应用已显示');
        }
    }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    // 在创建ChatUIManager之前先初始化主题，避免loading页面闪烁
    initializeThemeEarly();
    window.chatUIManager = new ChatUIManager();
});

// 提前初始化主题，避免loading页面主题闪烁
function initializeThemeEarly() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    const isLight = savedTheme === 'light';
    document.body.classList.toggle('light-mode', isLight);
    document.body.classList.toggle('dark-mode', !isLight);
    console.log('提前应用主题:', savedTheme);
}

