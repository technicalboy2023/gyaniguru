/**
 * AI Tools Hub - Blog Tool Logic
 */

class BlogApp {
    constructor() {
        this.topicInput = document.getElementById('blog-topic');
        this.toneSelect = document.getElementById('blog-tone');
        this.lengthSelect = document.getElementById('blog-length');
        this.generateBtn = document.getElementById('generate-btn');
        this.resultSection = document.getElementById('result-section');
        this.contentElement = document.getElementById('blog-content');
        this.historyList = document.getElementById('history-list');
        
        this.currentContent = '';
        this.currentTopic = '';
        
        this.init();
    }

    init() {
        this.updateCreditDisplay();
        this.renderHistory();
        historyService.subscribe(() => this.renderHistory());
        
        this.topicInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.generate();
        });
    }

    updateCreditDisplay() {
        const display = document.getElementById('credit-display');
        if (display) {
            const status = creditsService.getStatus();
            display.textContent = `${status.remaining} / ${status.max}`;
        }
    }

    buildPrompt(topic, tone, length) {
        const lengthGuide = {
            short: '300-400 words',
            medium: '600-800 words',
            long: '1000-1200 words'
        };

        return `Write a comprehensive blog post about: "${topic}"

Requirements:
- Tone: ${tone}
- Length: ${lengthGuide[length]}
- Structure: Engaging introduction, 3-5 main sections with H2 headers, strong conclusion
- Format: Use markdown headers (##) for sections
- Style: Conversational yet informative, SEO-friendly

Please write the complete blog post now.`;
    }

    async generate() {
        const topic = this.topicInput.value.trim();
        if (!topic) {
            Toast.warning('Please enter a blog topic');
            this.topicInput.focus();
            return;
        }

        if (!creditsService.canGenerate()) {
            Toast.error('Daily limit reached. Upgrade for unlimited access.');
            return;
        }

        this.setLoading(true);
        this.resultSection.classList.add('hidden');

        const creditResult = creditsService.useCredit();
        if (!creditResult.success) {
            Toast.error(creditResult.error);
            this.setLoading(false);
            return;
        }

        this.updateCreditDisplay();

        const tone = this.toneSelect.value;
        const length = this.lengthSelect.value;
        const prompt = this.buildPrompt(topic, tone, length);

        try {
            const content = await apiService.request(prompt, { tool: 'blog' });
            
            this.currentContent = content;
            this.currentTopic = topic;
            this.displayContent(content);
            
            historyService.add('blog', topic, content, { tone, length });
            
            Toast.success('Blog post generated successfully');

        } catch (error) {
            CONFIG.error('Blog generation error:', error);
            
            creditsService.refundCredit();
            this.updateCreditDisplay();
            
            this.displayError(error);
        } finally {
            this.setLoading(false);
        }
    }

    displayContent(content) {
        const html = this.formatBlogContent(content);
        this.contentElement.innerHTML = html;
        this.resultSection.classList.remove('hidden');
        this.resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    formatBlogContent(text) {
        let html = this.escapeHtml(text);
        
        html = html
            .replace(/^## (.*$)/gim, '<h2 class="text-2xl font-bold text-white mt-8 mb-4 pb-2 border-b border-slate-700">$1</h2>')
            .replace(/^### (.*$)/gim, '<h3 class="text-xl font-semibold text-white mt-6 mb-3">$1</h3>')
            .replace(/^#### (.*$)/gim, '<h4 class="text-lg font-semibold text-slate-200 mt-4 mb-2">$1</h4>')
            .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`([^`]+)`/g, '<code class="bg-slate-900 text-purple-300 px-2 py-1 rounded text-sm font-mono">$1</code>')
            .replace(/^- (.*$)/gim, '<li class="ml-6 text-slate-300 mb-1 list-disc">$1</li>')
            .replace(/^(\d+)\. (.*$)/gim, '<li class="ml-6 text-slate-300 mb-1 list-decimal"><span class="font-semibold">$1.</span> $2</li>')
            .replace(/\n\n/g, '</p><p class="text-slate-300 mb-4 leading-relaxed">')
            .replace(/\n/g, '<br>');
        
        if (!html.startsWith('<h2') && !html.startsWith('<h3') && !html.startsWith('<p')) {
            html = '<p class="text-slate-300 mb-4 leading-relaxed">' + html + '</p>';
        }
        
        html = html.replace(/<\/li><br>/g, '</li>');
        html = html.replace(/(<li[^>]*>.*<\/li>)+/g, '<ul class="my-4 space-y-1">$&</ul>');
        
        return html;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    displayError(error) {
        let message = 'Failed to generate blog post';
        
        if (error.code === 'TIMEOUT') message = 'Generation timed out. Try a shorter length or try again.';
        else if (error.code === 'NETWORK') message = 'Network error. Please check your connection.';
        else if (error.code === 'RETRY_EXHAUSTED') message = 'Service temporarily unavailable. Please try later.';
        else if (error.message) message = error.message;

        this.contentElement.innerHTML = `
            <div class="bg-red-900/20 border border-red-800 rounded-lg p-6">
                <div class="flex items-center gap-3 mb-3">
                    <i class="fa-solid fa-circle-exclamation text-red-400 text-xl"></i>
                    <h3 class="text-lg font-semibold text-red-200">Generation Failed</h3>
                </div>
                <p class="text-red-200/80 mb-4">${this.escapeHtml(message)}</p>
                <button onclick="blogApp.retry()" class="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition text-sm font-medium">
                    <i class="fa-solid fa-rotate-right mr-2"></i>Try Again
                </button>
            </div>
        `;
        this.resultSection.classList.remove('hidden');
    }

    setLoading(loading) {
        this.generateBtn.disabled = loading;
        
        if (loading) {
            this.generateBtn.innerHTML = '<div class="loader loader-sm mr-2"></div> Generating...';
            this.generateBtn.classList.add('opacity-75');
        } else {
            this.generateBtn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles mr-2"></i> Generate Blog Post';
            this.generateBtn.classList.remove('opacity-75');
        }
    }

    retry() {
        this.generate();
    }

    copy() {
        if (!this.currentContent) return;
        
        navigator.clipboard.writeText(this.currentContent).then(() => {
            Toast.success('Copied to clipboard');
        }).catch(() => {
            Toast.error('Failed to copy');
        });
    }

    download() {
        if (!this.currentContent) return;
        
        const filename = this.currentTopic
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '') + '.md';
        
        const blob = new Blob([this.currentContent], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        Toast.success('Downloaded successfully');
    }

    renderHistory() {
        const history = historyService.getByTool('blog').slice(0, 5);
        
        this.historyList.innerHTML = history.length
            ? history.map(item => `
                <div class="history-item p-3 rounded-lg bg-slate-800/50 border border-slate-700 hover:border-green-500/50 transition cursor-pointer"
                     onclick="blogApp.loadHistory('${item.id}')">
                    <div class="flex justify-between items-start mb-1">
                        <p class="text-sm text-slate-200 font-medium truncate flex-1 pr-2">${this.escapeHtml(item.prompt)}</p>
                        <span class="text-xs text-slate-500 whitespace-nowrap">${historyService.formatDate(item.timestamp)}</span>
                    </div>
                    <div class="flex items-center gap-2 text-xs text-slate-500">
                        <span class="bg-slate-700 px-2 py-0.5 rounded">${item.metadata?.tone || 'professional'}</span>
                        <span class="bg-slate-700 px-2 py-0.5 rounded">${item.metadata?.length || 'medium'}</span>
                    </div>
                </div>
            `).join('')
            : '<p class="text-slate-500 text-sm">No blog posts generated yet</p>';
    }

    loadHistory(id) {
        const item = historyService.getAll().find(i => i.id === id);
        if (!item) return;

        this.topicInput.value = item.prompt;
        if (item.metadata?.tone) this.toneSelect.value = item.metadata.tone;
        if (item.metadata?.length) this.lengthSelect.value = item.metadata.length;
        
        this.currentContent = item.result;
        this.currentTopic = item.prompt;
        this.displayContent(item.result);
        
        window.scrollTo({ top: 0, behavior: 'smooth' });
        Toast.info('Loaded from history');
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

let blogApp;
document.addEventListener('DOMContentLoaded', () => {
    blogApp = new BlogApp();
});
