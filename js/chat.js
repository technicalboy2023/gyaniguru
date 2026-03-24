/**
 * AI Tools Hub - Chat Tool Logic
 */

class ChatApp {
    constructor() {
        this.messagesContainer = document.getElementById('chat-messages');
        this.input = document.getElementById('chat-input');
        this.sendBtn = document.getElementById('send-btn');
        this.typingIndicator = document.getElementById('typing-indicator');
        this.historyList = document.getElementById('history-list');
        
        this.isGenerating = false;
        this.currentAssistantElement = null;
        this.messageHistory = [];
        
        this.init();
    }

    init() {
        this.input.addEventListener('input', () => this.autoResize());
        
        this.input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        this.renderHistory();
        historyService.subscribe(() => this.renderHistory());
        
        this.input.focus();
    }

    autoResize() {
        this.input.style.height = 'auto';
        this.input.style.height = Math.min(this.input.scrollHeight, 120) + 'px';
    }

    async sendMessage() {
        if (this.isGenerating) return;
        
        const message = this.input.value.trim();
        if (!message) return;

        if (!creditsService.canGenerate()) {
            Toast.error('Daily limit reached. Upgrade for unlimited access.');
            return;
        }

        this.addUserMessage(message);
        this.input.value = '';
        this.input.style.height = 'auto';
        
        this.setLoading(true);
        
        const creditResult = creditsService.useCredit();
        if (!creditResult.success) {
            Toast.error(creditResult.error);
            this.setLoading(false);
            return;
        }

        updateCreditDisplay();

        try {
            this.currentAssistantElement = this.createAssistantElement();
            
            let fullResponse = '';
            
            await apiService.request(message, {
                tool: 'chat',
                onStream: (chunk) => {
                    fullResponse = chunk;
                    this.updateAssistantContent(this.currentAssistantElement, chunk);
                },
            });

            this.finalizeAssistantContent(this.currentAssistantElement, fullResponse);
            historyService.add('chat', message, fullResponse);
            
            Toast.success('Response received');

        } catch (error) {
            CONFIG.error('Chat error:', error);
            
            creditsService.refundCredit();
            updateCreditDisplay();
            
            this.displayError(error);
        } finally {
            this.setLoading(false);
            this.currentAssistantElement = null;
        }
    }

    addUserMessage(text) {
        const div = document.createElement('div');
        div.className = 'chat-message user';
        div.innerHTML = `
            <div class="flex items-start gap-3 justify-end">
                <div class="bg-purple-600 text-white px-4 py-2 rounded-2xl rounded-br-sm max-w-[85%]">
                    <p class="text-sm">${this.escapeHtml(text)}</p>
                </div>
                <div class="w-8 h-8 bg-purple-700 rounded-full flex items-center justify-center flex-shrink-0">
                    <i class="fa-solid fa-user text-white text-sm"></i>
                </div>
            </div>
        `;
        this.messagesContainer.appendChild(div);
        this.scrollToBottom();
    }

    createAssistantElement() {
        const div = document.createElement('div');
        div.className = 'chat-message assistant';
        div.innerHTML = `
            <div class="flex items-start gap-3">
                <div class="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center flex-shrink-0">
                    <i class="fa-solid fa-robot text-purple-400 text-sm"></i>
                </div>
                <div class="bg-slate-800 border border-slate-700 text-slate-200 px-4 py-3 rounded-2xl rounded-bl-sm max-w-[85%] min-w-[60px]">
                    <span class="streaming-content"></span><span class="streaming-cursor"></span>
                </div>
            </div>
        `;
        this.messagesContainer.appendChild(div);
        this.scrollToBottom();
        return div.querySelector('.streaming-content');
    }

    updateAssistantContent(element, content) {
        if (element) {
            element.textContent = content;
            this.scrollToBottom();
        }
    }

    finalizeAssistantContent(element, content) {
        if (element) {
            const parent = element.closest('.chat-message');
            const container = parent.querySelector('.max-w-\\[85\\%\\]');
            container.innerHTML = this.formatMessage(content);
        }
    }

    formatMessage(text) {
        const escaped = this.escapeHtml(text);
        const withBreaks = escaped.replace(/\n/g, '<br>');
        const withBold = withBreaks.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        const withItalic = withBold.replace(/\*(.*?)\*/g, '<em>$1</em>');
        const withCode = withItalic.replace(/`([^`]+)`/g, '<code class="bg-slate-900 px-1 rounded text-sm">$1</code>');
        
        return withCode;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    displayError(error) {
        let message = 'Failed to get response';
        
        if (error.code === 'TIMEOUT') message = 'Request timed out. Please try again.';
        else if (error.code === 'NETWORK') message = 'Network error. Check your connection.';
        else if (error.code === 'RETRY_EXHAUSTED') message = 'Service temporarily unavailable.';
        else if (error.message) message = error.message;

        const div = document.createElement('div');
        div.className = 'chat-message assistant';
        div.innerHTML = `
            <div class="flex items-start gap-3">
                <div class="w-8 h-8 bg-red-900/50 rounded-full flex items-center justify-center flex-shrink-0">
                    <i class="fa-solid fa-exclamation text-red-400 text-sm"></i>
                </div>
                <div class="bg-red-900/20 border border-red-800 text-red-200 px-4 py-3 rounded-2xl rounded-bl-sm max-w-[85%]">
                    <p class="text-sm font-medium mb-1">Error</p>
                    <p class="text-sm opacity-90">${this.escapeHtml(message)}</p>
                    <button onclick="chatApp.retryLastMessage()" class="mt-2 text-xs underline hover:text-white transition">
                        Try again
                    </button>
                </div>
            </div>
        `;
        this.messagesContainer.appendChild(div);
        this.scrollToBottom();
    }

    setLoading(loading) {
        this.isGenerating = loading;
        this.sendBtn.disabled = loading;
        this.typingIndicator.style.opacity = loading ? '1' : '0';
        
        this.sendBtn.innerHTML = loading 
            ? '<div class="loader loader-sm"></div>'
            : '<i class="fa-solid fa-paper-plane"></i><span class="hidden sm:inline">Send</span>';
    }

    scrollToBottom() {
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }

    retryLastMessage() {
        const userMessages = this.messagesContainer.querySelectorAll('.chat-message.user');
        const lastUser = userMessages[userMessages.length - 1];
        if (lastUser) {
            const text = lastUser.querySelector('p').textContent;
            this.input.value = text;
            this.sendMessage();
        }
    }

    renderHistory() {
        const history = historyService.getByTool('chat').slice(0, 5);
        
        this.historyList.innerHTML = history.length 
            ? history.map(item => `
                <div class="history-item p-2 rounded bg-slate-800/50 border border-slate-700 hover:border-purple-500/50 transition cursor-pointer"
                     onclick="chatApp.loadHistory('${item.id}')">
                    <p class="text-sm text-slate-300 truncate">${this.escapeHtml(item.prompt)}</p>
                    <p class="text-xs text-slate-500">${historyService.formatDate(item.timestamp)}</p>
                </div>
            `).join('')
            : '<p class="text-slate-500 text-sm text-center py-2">No history yet</p>';
    }

    loadHistory(id) {
        const item = historyService.getAll().find(i => i.id === id);
        if (!item) return;

        this.messagesContainer.innerHTML = '';
        
        this.addUserMessage(item.prompt);
        
        const div = document.createElement('div');
        div.className = 'chat-message assistant';
        div.innerHTML = `
            <div class="flex items-start gap-3">
                <div class="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center flex-shrink-0">
                    <i class="fa-solid fa-robot text-purple-400 text-sm"></i>
                </div>
                <div class="bg-slate-800 border border-slate-700 text-slate-200 px-4 py-3 rounded-2xl rounded-bl-sm max-w-[85%]">
                    ${this.formatMessage(item.result)}
                </div>
            </div>
        `;
        this.messagesContainer.appendChild(div);
        this.scrollToBottom();
        
        Toast.info('Loaded from history');
    }

    clearHistory() {
        if (confirm('Clear all chat history?')) {
            historyService.clear();
            this.renderHistory();
            Toast.success('History cleared');
        }
    }
}

let chatApp;
document.addEventListener('DOMContentLoaded', () => {
    chatApp = new ChatApp();
});

function updateCreditDisplay() {
    const display = document.getElementById('credit-display');
    if (display) {
        const status = creditsService.getStatus();
        display.textContent = `${status.remaining} / ${status.max}`;
    }
}
