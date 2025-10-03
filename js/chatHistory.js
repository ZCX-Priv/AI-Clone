/**
 * 聊天记录历史管理界面
 * 提供查看、搜索、导出和删除聊天记录的功能
 */
class ChatHistoryUI {
  constructor() {
    this.chatManager = window.chatManager;
    this.currentView = 'sessions'; // 'sessions' | 'messages' | 'search'
    this.currentSessionId = null;
  }

  /**
   * 显示聊天记录管理界面
   */
  async show() {
    const historyView = document.createElement('div');
    historyView.id = 'chatHistoryView';
    historyView.className = 'chat-history-view';

    // 创建头部
    const header = this.createHeader();
    historyView.appendChild(header);

    // 创建内容区域
    const content = document.createElement('div');
    content.className = 'history-content';
    content.id = 'historyContent';
    historyView.appendChild(content);

    // 添加到页面
    document.body.appendChild(historyView);

    // 显示会话列表
    await this.showSessions();
  }

  /**
   * 创建头部导航
   */
  createHeader() {
    const header = document.createElement('div');
    header.className = 'history-header';
    
    header.innerHTML = `
      <div class="header-left">
        <button id="backBtn" class="btn-icon" aria-label="返回">
          <i class="fa-solid fa-arrow-left"></i>
        </button>
        <h2 id="historyTitle">聊天记录</h2>
      </div>
      <div class="header-right">
        <button id="searchBtn" class="btn-icon" title="搜索">
          <i class="fa-solid fa-search"></i>
        </button>
        <button id="exportBtn" class="btn-icon" title="导出">
          <i class="fa-solid fa-download"></i>
        </button>
        <button id="clearBtn" class="btn-icon" title="清空所有记录">
          <i class="fa-solid fa-trash"></i>
        </button>
      </div>
    `;

    // 绑定事件
    header.querySelector('#backBtn').onclick = () => this.handleBackButton();
    header.querySelector('#searchBtn').onclick = () => this.showSearch();
    header.querySelector('#exportBtn').onclick = () => this.exportData();
    header.querySelector('#clearBtn').onclick = () => this.clearAllData();

    return header;
  }

  /**
   * 显示会话列表
   */
  async showSessions() {
    this.currentView = 'sessions';
    document.getElementById('historyTitle').textContent = '聊天记录';
    
    const content = document.getElementById('historyContent');
    content.innerHTML = '<div class="loading">加载中...</div>';

    try {
      // 检查 chatManager 是否可用
      if (!this.chatManager) {
        throw new Error('聊天管理器未初始化');
      }

      // 等待数据库初始化完成
      if (!this.chatManager.db) {
        content.innerHTML = '<div class="loading">正在初始化数据库...</div>';
        // 等待最多5秒让数据库初始化
        let retries = 50;
        while (!this.chatManager.db && retries > 0) {
          await new Promise(resolve => setTimeout(resolve, 100));
          retries--;
        }
        
        if (!this.chatManager.db) {
          throw new Error('数据库初始化超时');
        }
      }

      const sessions = await this.chatManager.getAllSessions();
      
      if (sessions.length === 0) {
        content.innerHTML = `
          <div class="empty-state">
            <i class="fa-solid fa-comments"></i>
            <p>暂无聊天记录</p>
          </div>
        `;
        return;
      }

      const sessionsList = document.createElement('div');
      sessionsList.className = 'sessions-list';

      sessions.forEach(session => {
        const sessionItem = this.createSessionItem(session);
        sessionsList.appendChild(sessionItem);
      });

      content.innerHTML = '';
      content.appendChild(sessionsList);

    } catch (error) {
      console.error('加载会话列表失败:', error);
      content.innerHTML = `
        <div class="error">
          <i class="fa-solid fa-exclamation-triangle"></i>
          <p>加载失败：${error.message}</p>
          <button class="btn-primary" onclick="chatHistoryUI.showSessions()">重试</button>
        </div>
      `;
    }
  }

  /**
   * 创建会话项
   */
  createSessionItem(session) {
    const item = document.createElement('div');
    item.className = 'session-item';
    
    const date = new Date(session.lastTimestamp).toLocaleString('zh-CN');
    const preview = session.firstMessage.length > 50 
      ? session.firstMessage.substring(0, 50) + '...' 
      : session.firstMessage;

    item.innerHTML = `
      <div class="session-info">
        <div class="session-preview">${this.escapeHtml(preview)}</div>
        <div class="session-meta">
          <span class="session-date">${date}</span>
          <span class="session-count">${session.messageCount} 条消息</span>
          ${session.persona ? `<span class="session-persona">${this.escapeHtml(session.persona)}</span>` : ''}
        </div>
      </div>
      <div class="session-actions">
        <button class="btn-icon" onclick="chatHistoryUI.viewSession('${session.sessionId}')" title="查看">
          <i class="fa-solid fa-eye"></i>
        </button>
        <button class="btn-icon" onclick="chatHistoryUI.deleteSession('${session.sessionId}')" title="删除">
          <i class="fa-solid fa-trash"></i>
        </button>
      </div>
    `;

    return item;
  }

  /**
   * 查看指定会话的消息
   */
  async viewSession(sessionId) {
    this.currentView = 'messages';
    this.currentSessionId = sessionId;
    document.getElementById('historyTitle').textContent = '会话详情';
    
    const content = document.getElementById('historyContent');
    content.innerHTML = '<div class="loading">加载中...</div>';

    try {
      // 检查 chatManager 是否可用
      if (!this.chatManager || !this.chatManager.db) {
        throw new Error('聊天管理器未就绪');
      }

      const messages = await this.chatManager.getMessagesBySessionId(sessionId);
      
      if (messages.length === 0) {
        content.innerHTML = `
          <div class="empty-state">
            <i class="fa-solid fa-comment-slash"></i>
            <p>该会话暂无消息</p>
            <button class="btn-primary" onclick="chatHistoryUI.showSessions()">返回会话列表</button>
          </div>
        `;
        return;
      }

      const messagesList = document.createElement('div');
      messagesList.className = 'messages-list';

      messages.forEach(message => {
        try {
          const messageItem = this.createMessageItem(message);
          messagesList.appendChild(messageItem);
        } catch (itemError) {
          console.error('创建消息项失败:', itemError, message);
          // 创建一个简单的错误消息项
          const errorItem = document.createElement('div');
          errorItem.className = 'message-item error';
          errorItem.innerHTML = `
            <div class="message-content">
              <div class="message-text">消息渲染失败</div>
              <div class="message-time">${new Date(message.timestamp).toLocaleString('zh-CN')}</div>
            </div>
          `;
          messagesList.appendChild(errorItem);
        }
      });

      content.innerHTML = '';
      content.appendChild(messagesList);

    } catch (error) {
      console.error('加载消息失败:', error);
      content.innerHTML = `
        <div class="error">
          <i class="fa-solid fa-exclamation-triangle"></i>
          <p>加载失败：${error.message}</p>
          <div class="error-actions">
            <button class="btn-primary" onclick="chatHistoryUI.viewSession('${sessionId}')">重试</button>
            <button class="btn-secondary" onclick="chatHistoryUI.showSessions()">返回列表</button>
          </div>
        </div>
      `;
    }
  }

  /**
   * 创建消息项
   */
  createMessageItem(message) {
    const item = document.createElement('div');
    item.className = `message-item ${message.type}`;
    
    const time = new Date(message.timestamp).toLocaleString('zh-CN');
    const avatar = message.type === 'user' 
      ? '<i class="fa-solid fa-user"></i>' 
      : '<i class="fa-solid fa-robot"></i>';

    // 创建消息内容容器
    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    
    // 创建消息文本容器
    const messageText = document.createElement('div');
    messageText.className = 'message-text';
    
    // 使用与主聊天页面相同的渲染器
    if (window.messageRenderer) {
      try {
        // 渲染消息内容（支持Markdown、代码块等）
        window.messageRenderer.render(message.message).then(renderedContent => {
          messageText.innerHTML = renderedContent;
          
          // 如果使用MathJax，需要重新渲染数学公式
          if (window.messageRenderer.getMathRenderer() === 'mathjax') {
            setTimeout(() => {
              window.messageRenderer.renderMathJax(messageText);
            }, 50);
          }
        }).catch(error => {
          console.error('消息渲染失败:', error);
          messageText.innerHTML = this.escapeHtml(message.message);
        });
      } catch (error) {
        console.error('渲染器调用失败:', error);
        messageText.innerHTML = this.escapeHtml(message.message);
      }
    } else {
      // 降级处理：如果渲染器不可用，使用简单的HTML转义
      messageText.innerHTML = this.escapeHtml(message.message);
    }
    
    // 创建时间显示
    const messageTime = document.createElement('div');
    messageTime.className = 'message-time';
    messageTime.textContent = time;
    
    // 组装消息内容
    messageContent.appendChild(messageText);
    messageContent.appendChild(messageTime);
    
    // 组装完整消息项
    item.innerHTML = `<div class="message-avatar">${avatar}</div>`;
    item.appendChild(messageContent);

    return item;
  }

  /**
   * 显示搜索界面
   */
  showSearch() {
    this.currentView = 'search';
    document.getElementById('historyTitle').textContent = '搜索聊天记录';
    
    const content = document.getElementById('historyContent');
    content.innerHTML = `
      <div class="search-container">
        <div class="search-input-group">
          <input type="text" id="searchInput" placeholder="输入关键词搜索..." />
          <button id="searchSubmitBtn" class="btn-primary">搜索</button>
        </div>
        <div id="searchResults" class="search-results"></div>
      </div>
    `;

    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchSubmitBtn');

    const performSearch = async () => {
      const keyword = searchInput.value.trim();
      if (!keyword) return;

      const resultsDiv = document.getElementById('searchResults');
      resultsDiv.innerHTML = '<div class="loading">搜索中...</div>';

      try {
        const results = await this.chatManager.searchMessages(keyword);
        
        if (results.length === 0) {
          resultsDiv.innerHTML = '<div class="empty-state"><p>未找到相关消息</p></div>';
          return;
        }

        const resultsList = document.createElement('div');
        resultsList.className = 'search-results-list';

        results.forEach(message => {
          const resultItem = this.createSearchResultItem(message, keyword);
          resultsList.appendChild(resultItem);
        });

        resultsDiv.innerHTML = '';
        resultsDiv.appendChild(resultsList);

      } catch (error) {
        console.error('搜索失败:', error);
        resultsDiv.innerHTML = '<div class="error">搜索失败，请重试</div>';
      }
    };

    searchBtn.onclick = performSearch;
    searchInput.onkeypress = (e) => {
      if (e.key === 'Enter') performSearch();
    };
  }

  /**
   * 创建搜索结果项
   */
  createSearchResultItem(message, keyword) {
    const item = document.createElement('div');
    item.className = `search-result-item ${message.type}`;
    
    const time = new Date(message.timestamp).toLocaleString('zh-CN');
    const highlightedText = this.highlightKeyword(message.message, keyword);

    item.innerHTML = `
      <div class="result-header">
        <span class="result-type">${message.type === 'user' ? '用户' : 'AI'}</span>
        <span class="result-time">${time}</span>
        ${message.persona ? `<span class="result-persona">${this.escapeHtml(message.persona)}</span>` : ''}
      </div>
      <div class="result-content">${highlightedText}</div>
      <button class="btn-link" onclick="chatHistoryUI.viewSession('${message.sessionId}')">
        查看完整对话
      </button>
    `;

    return item;
  }

  /**
   * 高亮关键词
   */
  highlightKeyword(text, keyword) {
    const escapedText = this.escapeHtml(text);
    const escapedKeyword = this.escapeHtml(keyword);
    const regex = new RegExp(`(${escapedKeyword})`, 'gi');
    return escapedText.replace(regex, '<mark>$1</mark>');
  }

  /**
   * 删除会话
   */
  async deleteSession(sessionId) {
    const confirmed = await showConfirm(
      '确定要删除这个会话吗？此操作不可撤销。',
      '删除会话',
      { confirmText: '删除', cancelText: '取消', confirmType: 'danger' }
    );
    if (!confirmed) {
      return;
    }

    try {
      // 检查是否删除的是当前对话
      const isCurrentSession = this.chatManager.getCurrentSessionId() === sessionId;
      
      await this.chatManager.deleteSession(sessionId);
      await showSuccess('会话已删除');
      
      // 如果删除的是当前对话，通知主页面清空并新建对话
      if (isCurrentSession && window.chatUIManager) {
        console.log('删除的是当前对话，主页面将清空并新建对话');
        await window.chatUIManager.handleCurrentSessionDeleted();
      }
      
      // 刷新当前视图
      if (this.currentView === 'sessions') {
        await this.showSessions();
      } else if (this.currentView === 'messages' && this.currentSessionId === sessionId) {
        await this.showSessions();
      }
    } catch (error) {
      console.error('删除会话失败:', error);
      await showError('删除失败，请重试');
    }
  }

  /**
   * 导出数据
   */
  async exportData() {
    try {
      const data = await this.chatManager.exportMessages();
      if (!data) {
        await showError('导出失败');
        return;
      }

      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chat-history-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      await showSuccess('聊天记录已导出');
    } catch (error) {
      console.error('导出失败:', error);
      await showError('导出失败，请重试');
    }
  }

  /**
   * 清空所有数据
   */
  async clearAllData() {
    const confirmed = await showConfirm(
      '确定要清空所有聊天记录吗？此操作不可撤销。',
      '清空所有记录',
      { confirmText: '清空', cancelText: '取消', confirmType: 'danger' }
    );
    if (!confirmed) {
      return;
    }

    try {
      await this.chatManager.clearAllMessages();
      await showSuccess('所有聊天记录已清空');
      
      // 清空所有记录后，主页面也要清空并新建对话
      if (window.chatUIManager) {
        console.log('所有聊天记录已清空，主页面将清空并新建对话');
        await window.chatUIManager.handleCurrentSessionDeleted();
      }
      
      await this.showSessions();
    } catch (error) {
      console.error('清空失败:', error);
      await showError('清空失败，请重试');
    }
  }

  /**
   * 处理返回按钮点击
   */
  handleBackButton() {
    if (this.currentView === 'messages') {
      // 如果在会话详情页面，返回到会话列表
      this.showSessions();
    } else if (this.currentView === 'search') {
      // 如果在搜索页面，返回到会话列表
      this.showSessions();
    } else {
      // 如果在会话列表页面，关闭整个历史记录界面
      this.close();
    }
  }

  /**
   * 关闭界面
   */
  close() {
    const historyView = document.getElementById('chatHistoryView');
    if (historyView) {
      document.body.removeChild(historyView);
    }
  }

  /**
   * HTML转义
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// 创建全局实例
window.chatHistoryUI = new ChatHistoryUI();