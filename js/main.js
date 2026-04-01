/**
 * GyaniGuru Main JavaScript
 * Core functionality and utilities
 */

// ==========================================
// Toast Notification System
// ==========================================

const Toast = {
    container: null,
    
    init() {
        if (this.container) return;
        this.container = document.createElement('div');
        this.container.className = 'toast-container';
        document.body.appendChild(this.container);
    },
    
    show(message, type = 'info', duration = 4000) {
        this.init();
        
        const icons = {
            success: 'fa-circle-check',
            error: 'fa-circle-xmark',
            warning: 'fa-triangle-exclamation',
            info: 'fa-circle-info',
        };
        
        const colors = {
            success: 'text-green-400',
            error: 'text-red-400',
            warning: 'text-yellow-400',
            info: 'text-brand-400',
        };
        
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <i class="fa-solid ${icons[type]} ${colors[type]} text-lg"></i>
            <div class="flex-1">
                <p class="text-sm font-medium text-white">${message}</p>
            </div>
            <button onclick="this.parentElement.remove()" class="text-slate-400 hover:text-white transition-colors">
                <i class="fa-solid fa-xmark"></i>
            </button>
        `;
        
        this.container.appendChild(toast);
        
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => toast.remove(), 300);
        }, duration);
        
        return toast;
    },
    
    success(msg, duration) { return this.show(msg, 'success', duration); },
    error(msg, duration) { return this.show(msg, 'error', duration); },
    warning(msg, duration) { return this.show(msg, 'warning', duration); },
    info(msg, duration) { return this.show(msg, 'info', duration); },
};

// API Service logic has been moved to services/api.js
// ==========================================
// UI Utilities
// ==========================================

const UI = {
    updateStatus(element, status) {
        if (!element) return;
        
        const classes = {
            idle: 'status-idle',
            running: 'status-running',
            success: 'status-success',
            error: 'status-error',
        };
        
        Object.values(classes).forEach(c => element.classList.remove(c));
        element.classList.add(classes[status] || classes.idle);
        
        const icons = {
            idle: '<i class="fa-solid fa-circle text-xs"></i>',
            running: '<span class="spinner spinner-sm"></span>',
            success: '<i class="fa-solid fa-check text-xs"></i>',
            error: '<i class="fa-solid fa-xmark text-xs"></i>',
        };
        
        const texts = {
            idle: 'Idle',
            running: 'Running',
            success: 'Completed',
            error: 'Error',
        };
        
        element.innerHTML = `${icons[status] || icons.idle} ${texts[status] || status}`;
    },
    
    formatText(text) {
        if (!text) return '';
        
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`([^`]+)`/g, '<code class="bg-slate-800 px-1.5 py-0.5 rounded text-brand-300 font-mono text-sm">$1</code>')
            .replace(/\n/g, '<br>');
    },
    
    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            Toast.success('Copied to clipboard');
            return true;
        } catch (err) {
            // Fallback
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            
            try {
                document.execCommand('copy');
                Toast.success('Copied to clipboard');
                return true;
            } catch (e) {
                Toast.error('Failed to copy');
                return false;
            } finally {
                document.body.removeChild(textarea);
            }
        }
    },
    
    downloadText(text, filename = 'output.txt') {
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        Toast.success('Downloaded successfully');
    },
    
    autoResize(textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 400) + 'px';
    }
};

// ==========================================
// Loading State Manager
// ==========================================

class LoadingState {
    constructor(element, options = {}) {
        this.element = element;
        this.options = {
            loadingText: 'Processing...',
            ...options
        };
        this.originalContent = element ? element.innerHTML : '';
    }
    
    start(text = this.options.loadingText) {
        if (!this.element) return;
        this.element.disabled = true;
        this.element.innerHTML = `<span class="spinner spinner-sm mr-2"></span><span>${text}</span>`;
        this.element.classList.add('opacity-75');
    }
    
    stop() {
        if (!this.element) return;
        this.element.disabled = false;
        this.element.innerHTML = this.originalContent;
        this.element.classList.remove('opacity-75');
    }
    
    success(text = 'Done!', duration = 1500) {
        if (!this.element) return;
        this.element.innerHTML = `<i class="fa-solid fa-check mr-2"></i><span>${text}</span>`;
        this.element.classList.add('text-green-400');
        setTimeout(() => {
            this.element.classList.remove('text-green-400');
            this.stop();
        }, duration);
    }
}

// ==========================================
// Check Usage and Show Upgrade
// ==========================================

function checkUsageAndProceed(callback) {
    if (!usageTracker.canUse()) {
        Toast.warning('Daily limit reached. Upgrade to Pro for unlimited access.');
        setTimeout(() => {
            document.getElementById('upgrade-modal')?.classList.remove('hidden');
        }, 500);
        return false;
    }
    return callback();
}

// ==========================================
// Initialize
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    CONFIG.log('GyaniGuru initialized');
});

// Export globals
window.Toast = Toast;
window.UI = UI;
window.LoadingState = LoadingState;
// Removed window.apiService export as ApiService is now handled separately
window.checkUsageAndProceed = checkUsageAndProceed;
