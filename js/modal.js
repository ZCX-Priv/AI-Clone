// 统一弹窗组件
class ModalManager {
    constructor() {
        this.currentModal = null;
        this.init();
    }

    init() {
        // 创建弹窗容器样式
        if (!document.getElementById('modal-styles')) {
            const style = document.createElement('style');
            style.id = 'modal-styles';
            style.textContent = `
                .modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.6);
                    backdrop-filter: blur(4px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 10000;
                    opacity: 0;
                    transition: opacity 0.3s ease;
                }

                .modal-overlay.show {
                    opacity: 1;
                }

                .modal-content {
                    background: #2a2a2a;
                    border-radius: 12px;
                    padding: 24px;
                    min-width: 320px;
                    max-width: 500px;
                    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
                    transform: scale(0.9) translateY(20px);
                    transition: transform 0.3s ease;
                    color: #fff;
                }

                .modal-overlay.show .modal-content {
                    transform: scale(1) translateY(0);
                }

                .modal-header {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    margin-bottom: 16px;
                }

                .modal-icon {
                    width: 24px;
                    height: 24px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 14px;
                    flex-shrink: 0;
                }

                .modal-icon.info {
                    background: #4a90e2;
                    color: #fff;
                }

                .modal-icon.warning {
                    background: #f5a623;
                    color: #fff;
                }

                .modal-icon.error {
                    background: #d0021b;
                    color: #fff;
                }

                .modal-icon.success {
                    background: #7ed321;
                    color: #fff;
                }

                .modal-title {
                    font-size: 16px;
                    font-weight: 600;
                    margin: 0;
                }

                .modal-message {
                    font-size: 14px;
                    line-height: 1.5;
                    margin-bottom: 24px;
                    color: #ccc;
                }

                .modal-actions {
                    display: flex;
                    gap: 12px;
                    justify-content: flex-end;
                }

                .modal-btn {
                    padding: 8px 16px;
                    border: none;
                    border-radius: 6px;
                    font-size: 14px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    min-width: 80px;
                }

                .modal-btn-primary {
                    background: #4a90e2;
                    color: #fff;
                }

                .modal-btn-primary:hover {
                    background: #357ab8;
                }

                .modal-btn-secondary {
                    background: transparent;
                    color: #ccc;
                    border: 1px solid #555;
                }

                .modal-btn-secondary:hover {
                    background: #333;
                    color: #fff;
                }

                .modal-btn-danger {
                    background: #d0021b;
                    color: #fff;
                }

                .modal-btn-danger:hover {
                    background: #b8001a;
                }

                /* 明亮模式适配 */
                body.light-mode .modal-content {
                    background: #fff;
                    color: #111;
                }

                body.light-mode .modal-message {
                    color: #666;
                }

                body.light-mode .modal-btn-secondary {
                    color: #666;
                    border-color: #ddd;
                }

                body.light-mode .modal-btn-secondary:hover {
                    background: #f5f5f5;
                    color: #111;
                }
            `;
            document.head.appendChild(style);
        }
    }

    // 显示提示框
    alert(message, title = '提示', type = 'info') {
        return new Promise((resolve) => {
            this.show({
                title,
                message,
                type,
                buttons: [
                    { text: '确定', type: 'primary', action: () => resolve() }
                ]
            });
        });
    }

    // 显示确认框
    confirm(message, title = '确认', options = {}) {
        return new Promise((resolve) => {
            const {
                confirmText = '确定',
                cancelText = '取消',
                confirmType = 'primary',
                type = 'warning'
            } = options;

            this.show({
                title,
                message,
                type,
                buttons: [
                    { text: cancelText, type: 'secondary', action: () => resolve(false) },
                    { text: confirmText, type: confirmType, action: () => resolve(true) }
                ]
            });
        });
    }

    // 显示成功提示
    success(message, title = '成功') {
        return this.alert(message, title, 'success');
    }

    // 显示错误提示
    error(message, title = '错误') {
        return this.alert(message, title, 'error');
    }

    // 显示警告提示
    warning(message, title = '警告') {
        return this.alert(message, title, 'warning');
    }

    // 通用显示方法
    show({ title, message, type = 'info', buttons = [] }) {
        // 如果已有弹窗，先关闭
        if (this.currentModal) {
            this.close();
        }

        // 创建弹窗元素
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';

        const iconMap = {
            info: 'fa-info',
            warning: 'fa-exclamation-triangle',
            error: 'fa-times',
            success: 'fa-check'
        };

        overlay.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <div class="modal-icon ${type}">
                        <i class="fa-solid ${iconMap[type]}" aria-hidden="true"></i>
                    </div>
                    <h3 class="modal-title">${title}</h3>
                </div>
                <div class="modal-message">${message}</div>
                <div class="modal-actions">
                    ${buttons.map((btn, index) => 
                        `<button class="modal-btn modal-btn-${btn.type}" data-action="${index}">${btn.text}</button>`
                    ).join('')}
                </div>
            </div>
        `;

        // 绑定按钮事件
        buttons.forEach((btn, index) => {
            const button = overlay.querySelector(`[data-action="${index}"]`);
            button.addEventListener('click', () => {
                this.close();
                if (btn.action) btn.action();
            });
        });

        // 点击遮罩关闭（仅对单按钮弹窗）
        if (buttons.length === 1) {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    this.close();
                    if (buttons[0].action) buttons[0].action();
                }
            });
        }

        // ESC键关闭
        const handleEsc = (e) => {
            if (e.key === 'Escape') {
                this.close();
                // 对于确认框，ESC相当于取消
                if (buttons.length > 1 && buttons[0].action) {
                    buttons[0].action();
                } else if (buttons.length === 1 && buttons[0].action) {
                    buttons[0].action();
                }
            }
        };
        document.addEventListener('keydown', handleEsc);

        // 显示弹窗
        document.body.appendChild(overlay);
        this.currentModal = { overlay, handleEsc };

        // 触发动画
        requestAnimationFrame(() => {
            overlay.classList.add('show');
        });

        // 聚焦到第一个按钮
        setTimeout(() => {
            const firstBtn = overlay.querySelector('.modal-btn');
            if (firstBtn) firstBtn.focus();
        }, 100);
    }

    // 关闭弹窗
    close() {
        if (!this.currentModal) return;

        const { overlay, handleEsc } = this.currentModal;
        
        // 移除事件监听
        document.removeEventListener('keydown', handleEsc);
        
        // 淡出动画
        overlay.classList.remove('show');
        
        // 动画结束后移除元素
        setTimeout(() => {
            if (overlay.parentNode) {
                overlay.parentNode.removeChild(overlay);
            }
        }, 300);

        this.currentModal = null;
    }
}

// 创建全局实例
window.modalManager = new ModalManager();

// 提供便捷的全局方法
window.showAlert = (message, title, type) => window.modalManager.alert(message, title, type);
window.showConfirm = (message, title, options) => window.modalManager.confirm(message, title, options);
window.showSuccess = (message, title) => window.modalManager.success(message, title);
window.showError = (message, title) => window.modalManager.error(message, title);
window.showWarning = (message, title) => window.modalManager.warning(message, title);