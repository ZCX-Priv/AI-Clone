/**
 * 消息渲染器模块
 * 支持 Markdown、代码高亮、数学公式、表格等富文本渲染
 */
class MessageRenderer {
    constructor() {
        this.isInitialized = false;
        this.initPromise = this.initialize();
    }

    /**
     * 初始化渲染器，等待所有依赖库加载完成
     */
    async initialize() {
        if (this.isInitialized) return;

        // 等待所有依赖库加载完成
        await this.waitForDependencies();
        
        // 配置 marked.js
        if (typeof marked !== 'undefined') {
            marked.setOptions({
                breaks: true,
                gfm: true,
                tables: true,
                sanitize: false, // 我们使用 DOMPurify 来清理
                highlight: (code, lang) => {
                    if (typeof Prism !== 'undefined' && lang && Prism.languages[lang]) {
                        return Prism.highlight(code, Prism.languages[lang], lang);
                    }
                    return code;
                }
            });
        }

        this.isInitialized = true;
    }

    /**
     * 等待依赖库加载完成
     */
    async waitForDependencies() {
        const maxWaitTime = 10000; // 最大等待10秒
        const checkInterval = 100; // 每100ms检查一次
        let waitTime = 0;

        return new Promise((resolve) => {
            const checkDependencies = () => {
                const markedLoaded = typeof marked !== 'undefined';
                const prismLoaded = typeof Prism !== 'undefined';
                const katexLoaded = typeof katex !== 'undefined';
                const mathjaxLoaded = typeof MathJax !== 'undefined';
                const dompurifyLoaded = typeof DOMPurify !== 'undefined';

                // 至少需要markdown和代码高亮
                const basicLoaded = markedLoaded && prismLoaded && dompurifyLoaded;
                // 数学渲染器至少需要一个
                const mathLoaded = katexLoaded || mathjaxLoaded;

                if (basicLoaded && mathLoaded) {
                    resolve();
                    return;
                }

                waitTime += checkInterval;
                if (waitTime >= maxWaitTime) {
                    console.warn('部分依赖库未能及时加载，将使用降级渲染');
                    resolve();
                    return;
                }

                setTimeout(checkDependencies, checkInterval);
            };

            checkDependencies();
        });
    }

    /**
     * 获取当前数学渲染器配置
     */
    getMathRenderer() {
        return localStorage.getItem('math_renderer') || 'katex';
    }

    /**
     * 检查MathJax是否可用
     */
    isMathJaxReady() {
        return typeof MathJax !== 'undefined' && MathJax.typesetPromise;
    }

    /**
     * 渲染消息内容
     * @param {string} content - 原始消息内容
     * @param {Object} options - 渲染选项
     * @returns {string} 渲染后的HTML
     */
    async render(content, options = {}) {
        await this.initPromise;

        if (!content || typeof content !== 'string') {
            return '';
        }

        try {
            // 1. 使用marked.js解析markdown
            let html = '';
            if (typeof marked !== 'undefined') {
                html = marked.parse(content);
            } else {
                // 降级处理：简单的换行转换
                html = this.escapeHtml(content).replace(/\n/g, '<br>');
            }

            // 2. 直接渲染数学公式
            html = this.renderMathFormulas(html);

            // 3. 为代码块添加预览和复制按钮（在DOMPurify之前）
            html = this.addCodeBlockButtons(html);

            // 4. 使用DOMPurify清理HTML（如果可用）
            if (typeof DOMPurify !== 'undefined') {
                html = DOMPurify.sanitize(html, {
                    ALLOWED_TAGS: [
                        'p', 'br', 'strong', 'em', 'u', 'del', 'code', 'pre',
                        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
                        'ul', 'ol', 'li', 'blockquote',
                        'table', 'thead', 'tbody', 'tr', 'th', 'td',
                        'a', 'img', 'span', 'div', 'button', 'i',
                        'math', 'annotation', 'semantics', 'mrow', 'mi', 'mo', 'mn', 'msup', 'msub', 'mfrac', 'msqrt', 'mroot'
                    ],
                    ALLOWED_ATTR: [
                        'href', 'src', 'alt', 'title', 'class', 'id',
                        'colspan', 'rowspan', 'align',
                        'mathvariant', 'displaystyle', 'data-action', 'data-code-id'
                    ]
                });
            }

            return html;

        } catch (error) {
            console.error('渲染消息时出错:', error);
            // 降级到简单的HTML转义
            return this.escapeHtml(content).replace(/\n/g, '<br>');
        }
    }

    /**
     * 直接渲染数学公式
     */
    renderMathFormulas(html) {
        const mathRenderer = this.getMathRenderer();
        
        if (mathRenderer === 'katex' && typeof katex !== 'undefined') {
            // 使用KaTeX渲染
            return this.renderWithKaTeX(html);
        } else if (mathRenderer === 'mathjax') {
            // 使用MathJax渲染 - 保持原始格式，让MathJax后续处理
            return html; // MathJax会自动处理$$和$符号
        } else if (typeof katex !== 'undefined') {
            // 降级到KaTeX
            return this.renderWithKaTeX(html);
        }
        
        return html;
    }

    /**
     * 使用KaTeX渲染数学公式
     */
    renderWithKaTeX(html) {
        try {
            // 渲染块级数学公式 $$...$$
            html = html.replace(/\$\$([\s\S]*?)\$\$/g, (match, formula) => {
                try {
                    return katex.renderToString(formula.trim(), {
                        displayMode: true,
                        throwOnError: false,
                        strict: false
                    });
                } catch (error) {
                    console.error('KaTeX块级公式渲染失败:', error);
                    return match; // 保持原始格式
                }
            });

            // 渲染行内数学公式 $...$
            html = html.replace(/\$([^$\n]+?)\$/g, (match, formula) => {
                try {
                    return katex.renderToString(formula.trim(), {
                        displayMode: false,
                        throwOnError: false,
                        strict: false
                    });
                } catch (error) {
                    console.error('KaTeX行内公式渲染失败:', error);
                    return match; // 保持原始格式
                }
            });

            // 渲染LaTeX风格的块级公式 \[...\]
            html = html.replace(/\\\[([\s\S]*?)\\\]/g, (match, formula) => {
                try {
                    return katex.renderToString(formula.trim(), {
                        displayMode: true,
                        throwOnError: false,
                        strict: false
                    });
                } catch (error) {
                    console.error('KaTeX LaTeX块级公式渲染失败:', error);
                    return match; // 保持原始格式
                }
            });

            // 渲染LaTeX风格的行内公式 \(...\)
            html = html.replace(/\\\(([\s\S]*?)\\\)/g, (match, formula) => {
                try {
                    return katex.renderToString(formula.trim(), {
                        displayMode: false,
                        throwOnError: false,
                        strict: false
                    });
                } catch (error) {
                    console.error('KaTeX LaTeX行内公式渲染失败:', error);
                    return match; // 保持原始格式
                }
            });

        } catch (error) {
            console.error('KaTeX渲染过程中出错:', error);
        }

        return html;
    }

    /**
     * 使用MathJax重新渲染页面中的数学公式
     */
    async renderMathJax(element) {
        if (!this.isMathJaxReady()) {
            console.warn('MathJax 未准备就绪，跳过渲染');
            return;
        }

        try {
            // 等待MathJax完全初始化
            await MathJax.startup.promise;
            
            // 渲染指定元素或整个文档
            await MathJax.typesetPromise([element || document.body]);
            console.log('MathJax 渲染完成');
        } catch (error) {
            console.error('MathJax渲染失败:', error);
        }
    }

    /**
     * HTML转义函数
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * 为代码块添加预览和复制按钮
     */
    addCodeBlockButtons(html) {
        // 创建临时DOM元素来解析HTML
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;

        // 查找所有代码块
        const codeBlocks = tempDiv.querySelectorAll('pre > code');
        
        codeBlocks.forEach((codeElement, index) => {
            const preElement = codeElement.parentElement;
            const codeContent = codeElement.textContent || codeElement.innerText;
            const codeId = `code-block-${Date.now()}-${index}`;
            
            // 检测代码类型
            const codeType = this.detectCodeType(codeContent);
            
            // 创建代码块容器
            const codeBlockContainer = document.createElement('div');
            codeBlockContainer.className = 'code-block-container';
            codeBlockContainer.setAttribute('data-code-id', codeId);
            
            // 创建工具栏
            const toolbar = document.createElement('div');
            toolbar.className = 'code-block-toolbar';
            
            // 添加语言类型标签（左侧）
            const languageLabel = document.createElement('span');
            languageLabel.className = 'code-language-label';
            languageLabel.textContent = codeType.toUpperCase();
            toolbar.appendChild(languageLabel);
            
            // 创建按钮容器（右侧）
            const buttonContainer = document.createElement('div');
            buttonContainer.className = 'code-block-buttons';
            
            // 只有HTML代码才显示预览按钮
            if (codeType === 'html') {
                const previewBtn = document.createElement('button');
                previewBtn.className = 'code-block-btn preview-btn';
                previewBtn.innerHTML = '<i class="fa-solid fa-eye"></i> 预览';
                previewBtn.setAttribute('data-action', 'preview');
                previewBtn.setAttribute('data-code-id', codeId);
                buttonContainer.appendChild(previewBtn);
            }
            
            // 复制按钮（所有代码都显示）
            const copyBtn = document.createElement('button');
            copyBtn.className = 'code-block-btn copy-btn';
            copyBtn.innerHTML = '<i class="fa-solid fa-copy"></i> 复制';
            copyBtn.setAttribute('data-action', 'copy');
            copyBtn.setAttribute('data-code-id', codeId);
            buttonContainer.appendChild(copyBtn);
            
            // 将按钮容器添加到工具栏
            toolbar.appendChild(buttonContainer);
            
            // 将工具栏和代码块添加到容器
            codeBlockContainer.appendChild(toolbar);
            codeBlockContainer.appendChild(preElement.cloneNode(true));
            
            // 替换原来的pre元素
            preElement.parentNode.replaceChild(codeBlockContainer, preElement);
            
            // 存储代码内容到全局对象中
            if (!window.codeBlockData) {
                window.codeBlockData = {};
            }
            window.codeBlockData[codeId] = codeContent;
        });

        return tempDiv.innerHTML;
    }

    /**
     * 预览代码功能
     */
    previewCode(code) {
        // 检测代码类型
        const codeType = this.detectCodeType(code);
        
        // 仅预览HTML代码
        if (codeType === 'html') {
            this.showPreviewModal(code, codeType, this.renderHTMLPreview(code));
        }
    }

    /**
     * 检测代码类型
     */
    detectCodeType(code) {
        const trimmedCode = code.trim().toLowerCase();
        
        if (trimmedCode.includes('<!doctype') || trimmedCode.includes('<html') || 
            trimmedCode.includes('<div') || trimmedCode.includes('<span') ||
            trimmedCode.includes('<p>') || trimmedCode.includes('<h1')) {
            return 'html';
        }
        
        if (trimmedCode.includes('function') || trimmedCode.includes('const ') || 
            trimmedCode.includes('let ') || trimmedCode.includes('var ') ||
            trimmedCode.includes('console.log') || trimmedCode.includes('=>')) {
            return 'javascript';
        }
        
        if (trimmedCode.includes('{') && (trimmedCode.includes('color:') || 
            trimmedCode.includes('background:') || trimmedCode.includes('margin:') ||
            trimmedCode.includes('padding:') || trimmedCode.includes('font-'))) {
            return 'css';
        }
        
        return 'text';
    }

    /**
     * 显示预览模态框
     */
    showPreviewModal(code, type, previewContent) {
        // 移除已存在的模态框
        const existingModal = document.getElementById('code-preview-modal');
        if (existingModal) {
            existingModal.remove();
        }

        // 获取标题
        let title = `${type.toUpperCase()} 代码预览`;
        if (type === 'html') {
            const htmlTitle = this.extractHTMLTitle(code);
            if (htmlTitle) {
                title = htmlTitle;
            }
        }

        // 创建模态框
        const modal = document.createElement('div');
        modal.id = 'code-preview-modal';
        modal.className = 'code-preview-modal';
        
        modal.innerHTML = `
            <div class="code-preview-overlay" onclick="this.parentElement.remove()"></div>
            <div class="code-preview-content">
                <div class="code-preview-header">
                    <h3>${this.escapeHtml(title)}</h3>
                    <button class="code-preview-close" onclick="this.closest('.code-preview-modal').remove()">
                        <i class="fa-solid fa-times"></i>
                    </button>
                </div>
                <div class="code-preview-body">
                    ${previewContent}
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        
        // 如果是JavaScript代码，执行代码并显示结果
        if (type === 'javascript') {
            this.executeJavaScriptInModal(code, modal);
        }
    }

    /**
     * 渲染HTML预览
     */
    renderHTMLPreview(htmlCode) {
        // 直接使用iframe进行HTML预览
        const previewId = `html-preview-${Date.now()}`;
        
        setTimeout(() => {
            const iframe = document.getElementById(previewId);
            if (iframe) {
                // 写入HTML内容
                const doc = iframe.contentDocument || iframe.contentWindow.document;
                const fullHTML = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        /* 隐藏滚动条 */
        * {
            scrollbar-width: none; /* Firefox */
            -ms-overflow-style: none; /* IE 和 Edge */
        }
        *::-webkit-scrollbar {
            display: none; /* Chrome, Safari, Opera */
        }
        
        body { 
            font-family: Arial, sans-serif; 
            margin: 20px; 
            background: white;
            color: black;
        }
    </style>
</head>
<body>
    ${htmlCode}
</body>
</html>`;
                
                doc.open();
                doc.write(fullHTML);
                doc.close();
            }
        }, 100);

        return `
            <div class="preview-section">
                <iframe id="${previewId}" style="width: 100%; height: 400px; border: none; background: #fff; border-radius: 4px;"></iframe>
            </div>
        `;
    }

    /**
     * 提取HTML代码中的title标签内容
     */
    extractHTMLTitle(htmlCode) {
        try {
            // 使用正则表达式匹配title标签
            const titleMatch = htmlCode.match(/<title[^>]*>(.*?)<\/title>/i);
            if (titleMatch && titleMatch[1]) {
                return titleMatch[1].trim();
            }
            
            // 如果没有title标签，尝试匹配h1标签作为标题
            const h1Match = htmlCode.match(/<h1[^>]*>(.*?)<\/h1>/i);
            if (h1Match && h1Match[1]) {
                // 移除HTML标签，只保留文本内容
                const textContent = h1Match[1].replace(/<[^>]*>/g, '').trim();
                if (textContent) {
                    return textContent;
                }
            }
            
            return null;
        } catch (error) {
            console.error('提取HTML标题时出错:', error);
            return null;
        }
    }

    /**
     * 在模态框中执行JavaScript代码
     */
    executeJavaScriptInModal(jsCode, modal) {
        const outputElement = modal.querySelector('#js-output');
        if (!outputElement) return;

        // 清空输出
        outputElement.textContent = '';
        
        // 创建安全的执行环境
        const originalLog = console.log;
        const originalError = console.error;
        const originalWarn = console.warn;
        
        const logs = [];
        
        // 重写console方法
        console.log = (...args) => {
            logs.push({ type: 'log', content: args.join(' ') });
            originalLog.apply(console, args);
        };
        
        console.error = (...args) => {
            logs.push({ type: 'error', content: args.join(' ') });
            originalError.apply(console, args);
        };
        
        console.warn = (...args) => {
            logs.push({ type: 'warn', content: args.join(' ') });
            originalWarn.apply(console, args);
        };

        try {
            // 执行代码
            const result = eval(jsCode);
            
            // 如果有返回值，显示它
            if (result !== undefined) {
                logs.push({ type: 'result', content: `返回值: ${result}` });
            }
            
        } catch (error) {
            logs.push({ type: 'error', content: `错误: ${error.message}` });
        } finally {
            // 恢复原始console方法
            console.log = originalLog;
            console.error = originalError;
            console.warn = originalWarn;
        }

        // 显示结果
        if (logs.length === 0) {
            outputElement.textContent = '代码执行完成，无输出';
        } else {
            outputElement.innerHTML = logs.map(log => {
                const className = `js-log-${log.type}`;
                return `<div class="${className}">${this.escapeHtml(log.content)}</div>`;
            }).join('');
        }
    }

    /**
     * 复制代码到剪贴板
     */
    async copyCode(code, button) {
        try {
            await navigator.clipboard.writeText(code);
            
            // 更新按钮状态
            const originalHTML = button.innerHTML;
            button.innerHTML = '<i class="fa-solid fa-check"></i> 已复制';
            button.classList.add('copied');
            
            // 2秒后恢复原状
            setTimeout(() => {
                button.innerHTML = originalHTML;
                button.classList.remove('copied');
            }, 2000);
            
        } catch (err) {
            console.error('复制失败:', err);
            
            // 降级方案：使用旧的复制方法
            const textArea = document.createElement('textarea');
            textArea.value = code;
            document.body.appendChild(textArea);
            textArea.select();
            
            try {
                document.execCommand('copy');
                button.innerHTML = '<i class="fa-solid fa-check"></i> 已复制';
                button.classList.add('copied');
                
                setTimeout(() => {
                    button.innerHTML = '<i class="fa-solid fa-copy"></i> 复制';
                    button.classList.remove('copied');
                }, 2000);
            } catch (fallbackErr) {
                console.error('降级复制也失败:', fallbackErr);
                button.innerHTML = '<i class="fa-solid fa-times"></i> 复制失败';
                setTimeout(() => {
                    button.innerHTML = '<i class="fa-solid fa-copy"></i> 复制';
                }, 2000);
            }
            
            document.body.removeChild(textArea);
        }
    }

    /**
     * 检查是否支持特定功能
     */
    isFeatureSupported(feature) {
        switch (feature) {
            case 'markdown':
                return typeof marked !== 'undefined';
            case 'math':
                return typeof katex !== 'undefined';
            case 'highlight':
                return typeof Prism !== 'undefined';
            case 'sanitize':
                return typeof DOMPurify !== 'undefined';
            default:
                return false;
        }
    }

    /**
     * 获取支持的功能列表
     */
    getSupportedFeatures() {
        return {
            markdown: this.isFeatureSupported('markdown'),
            math: this.isFeatureSupported('math'),
            highlight: this.isFeatureSupported('highlight'),
            sanitize: this.isFeatureSupported('sanitize')
        };
    }
}

// 创建全局渲染器实例
window.messageRenderer = new MessageRenderer();

// 全局事件委托处理代码块按钮点击
document.addEventListener('click', function(event) {
    const target = event.target.closest('.code-block-btn');
    if (!target) return;
    
    const action = target.getAttribute('data-action');
    const codeId = target.getAttribute('data-code-id');
    
    if (!action || !codeId || !window.codeBlockData || !window.codeBlockData[codeId]) {
        return;
    }
    
    const code = window.codeBlockData[codeId];
    
    if (action === 'preview') {
        window.messageRenderer.previewCode(code);
    } else if (action === 'copy') {
        window.messageRenderer.copyCode(code, target);
    }
});

// 导出渲染器类（如果使用模块系统）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MessageRenderer;
}