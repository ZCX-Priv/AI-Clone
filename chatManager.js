/**
 * 聊天记录管理器
 * 使用 IndexedDB 存储聊天记录
 */
class ChatManager {
  constructor() {
    this.dbName = 'ChatHistoryDB';
    this.dbVersion = 1;
    this.storeName = 'chatRecords';
    this.db = null;
    this.currentSessionId = null;
    this.init();
  }

  /**
   * 初始化数据库
   */
  async init() {
    try {
      this.db = await this.openDatabase();
      this.currentSessionId = this.generateSessionId();
      console.log('聊天记录管理器初始化成功');
    } catch (error) {
      console.error('聊天记录管理器初始化失败:', error);
    }
  }

  /**
   * 打开数据库
   */
  openDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        reject(new Error('无法打开数据库'));
      };

      request.onsuccess = (event) => {
        resolve(event.target.result);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // 创建对象存储
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { 
            keyPath: 'id', 
            autoIncrement: true 
          });
          
          // 创建索引
          store.createIndex('sessionId', 'sessionId', { unique: false });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('type', 'type', { unique: false });
        }
      };
    });
  }

  /**
   * 生成会话ID
   */
  generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * 保存聊天消息
   * @param {string} message - 消息内容
   * @param {string} type - 消息类型 ('user' 或 'ai')
   * @param {string} persona - AI角色 (可选)
   */
  async saveMessage(message, type, persona = null) {
    if (!this.db) {
      console.error('数据库未初始化');
      return false;
    }

    try {
      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      
      const record = {
        sessionId: this.currentSessionId,
        message: message,
        type: type,
        persona: persona,
        timestamp: new Date().toISOString(),
        createdAt: Date.now()
      };

      await new Promise((resolve, reject) => {
        const request = store.add(record);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      console.log('消息保存成功:', record);
      return true;
    } catch (error) {
      console.error('保存消息失败:', error);
      return false;
    }
  }

  /**
   * 获取当前会话的聊天记录
   */
  async getCurrentSessionMessages() {
    return await this.getMessagesBySessionId(this.currentSessionId);
  }

  /**
   * 根据会话ID获取聊天记录
   * @param {string} sessionId - 会话ID
   */
  async getMessagesBySessionId(sessionId) {
    if (!this.db) {
      console.error('数据库未初始化');
      return [];
    }

    try {
      const transaction = this.db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const index = store.index('sessionId');

      return await new Promise((resolve, reject) => {
        const request = index.getAll(sessionId);
        request.onsuccess = () => {
          const messages = request.result.sort((a, b) => a.createdAt - b.createdAt);
          resolve(messages);
        };
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('获取聊天记录失败:', error);
      return [];
    }
  }

  /**
   * 获取所有会话列表
   */
  async getAllSessions() {
    if (!this.db) {
      console.error('数据库未初始化');
      return [];
    }

    try {
      const transaction = this.db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);

      return await new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => {
          const messages = request.result;
          const sessions = {};
          
          // 按会话ID分组
          messages.forEach(msg => {
            if (!sessions[msg.sessionId]) {
              sessions[msg.sessionId] = {
                sessionId: msg.sessionId,
                firstMessage: msg.message,
                lastTimestamp: msg.timestamp,
                messageCount: 0,
                persona: msg.persona
              };
            }
            sessions[msg.sessionId].messageCount++;
            if (msg.timestamp > sessions[msg.sessionId].lastTimestamp) {
              sessions[msg.sessionId].lastTimestamp = msg.timestamp;
            }
          });

          // 转换为数组并按时间排序
          const sessionList = Object.values(sessions).sort((a, b) => 
            new Date(b.lastTimestamp) - new Date(a.lastTimestamp)
          );
          
          resolve(sessionList);
        };
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('获取会话列表失败:', error);
      return [];
    }
  }

  /**
   * 删除指定会话的所有消息
   * @param {string} sessionId - 会话ID
   */
  async deleteSession(sessionId) {
    if (!this.db) {
      console.error('数据库未初始化');
      return false;
    }

    try {
      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const index = store.index('sessionId');

      return await new Promise((resolve, reject) => {
        const request = index.openCursor(sessionId);
        request.onsuccess = (event) => {
          const cursor = event.target.result;
          if (cursor) {
            cursor.delete();
            cursor.continue();
          } else {
            resolve(true);
          }
        };
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('删除会话失败:', error);
      return false;
    }
  }

  /**
   * 清空所有聊天记录
   */
  async clearAllMessages() {
    if (!this.db) {
      console.error('数据库未初始化');
      return false;
    }

    try {
      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);

      await new Promise((resolve, reject) => {
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });

      console.log('所有聊天记录已清空');
      return true;
    } catch (error) {
      console.error('清空聊天记录失败:', error);
      return false;
    }
  }

  /**
   * 搜索聊天记录
   * @param {string} keyword - 搜索关键词
   */
  async searchMessages(keyword) {
    if (!this.db || !keyword.trim()) {
      return [];
    }

    try {
      const transaction = this.db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);

      return await new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => {
          const messages = request.result;
          const filteredMessages = messages.filter(msg => 
            msg.message.toLowerCase().includes(keyword.toLowerCase())
          ).sort((a, b) => b.createdAt - a.createdAt);
          resolve(filteredMessages);
        };
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('搜索消息失败:', error);
      return [];
    }
  }

  /**
   * 导出聊天记录为JSON
   * @param {string} sessionId - 会话ID (可选，不提供则导出所有)
   */
  async exportMessages(sessionId = null) {
    try {
      let messages;
      if (sessionId) {
        messages = await this.getMessagesBySessionId(sessionId);
      } else {
        const transaction = this.db.transaction([this.storeName], 'readonly');
        const store = transaction.objectStore(this.storeName);
        messages = await new Promise((resolve, reject) => {
          const request = store.getAll();
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
      }

      const exportData = {
        exportTime: new Date().toISOString(),
        sessionId: sessionId,
        messageCount: messages.length,
        messages: messages
      };

      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      console.error('导出聊天记录失败:', error);
      return null;
    }
  }

  /**
   * 开始新会话
   */
  startNewSession() {
    this.currentSessionId = this.generateSessionId();
    console.log('开始新会话:', this.currentSessionId);
    return this.currentSessionId;
  }

  /**
   * 切换到指定会话
   * @param {string} sessionId - 会话ID
   */
  switchToSession(sessionId) {
    this.currentSessionId = sessionId;
    console.log('切换到会话:', sessionId);
  }

  /**
   * 获取当前会话ID
   */
  getCurrentSessionId() {
    return this.currentSessionId;
  }

  /**
   * 获取数据库统计信息
   */
  async getStatistics() {
    if (!this.db) {
      return null;
    }

    try {
      const sessions = await this.getAllSessions();
      const totalMessages = sessions.reduce((sum, session) => sum + session.messageCount, 0);
      
      return {
        totalSessions: sessions.length,
        totalMessages: totalMessages,
        currentSessionId: this.currentSessionId,
        dbName: this.dbName,
        dbVersion: this.dbVersion
      };
    } catch (error) {
      console.error('获取统计信息失败:', error);
      return null;
    }
  }
}

// 创建全局实例
window.chatManager = new ChatManager();

// 导出类以供其他模块使用
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ChatManager;
}