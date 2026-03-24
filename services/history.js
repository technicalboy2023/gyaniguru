/**
 * AI Tools Hub - History Service
 * Manages generation history across all tools
 */

class HistoryService {
    constructor() {
        this.config = CONFIG.history;
        this.listeners = [];
    }

    /**
     * Get all history items
     */
    getAll() {
        try {
            const data = localStorage.getItem(this.config.storageKey);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            CONFIG.error('History parse error:', e);
            return [];
        }
    }

    /**
     * Get history for specific tool
     */
    getByTool(toolType) {
        return this.getAll().filter(item => item.tool === toolType);
    }

    /**
     * Add new history item
     */
    add(tool, prompt, result, metadata = {}) {
        const history = this.getAll();
        
        const item = {
            id: this.generateId(),
            tool,
            prompt,
            result,
            timestamp: Date.now(),
            date: new Date().toISOString(),
            metadata: {
                ...metadata,
                url: window.location.href,
                userAgent: navigator.userAgent.substring(0, 100),
            },
        };

        // Add to beginning
        history.unshift(item);

        // Trim to max items
        if (history.length > this.config.maxItems) {
            history.pop();
        }

        this.save(history);
        CONFIG.log('History item added:', { tool, id: item.id });
        
        return item;
    }

    /**
     * Delete history item by ID
     */
    delete(id) {
        const history = this.getAll().filter(item => item.id !== id);
        this.save(history);
        return true;
    }

    /**
     * Clear all history
     */
    clear() {
        localStorage.removeItem(this.config.storageKey);
        this.notifyListeners();
        CONFIG.log('History cleared');
    }

    /**
     * Save history to storage
     */
    save(history) {
        try {
            localStorage.setItem(this.config.storageKey, JSON.stringify(history));
            this.notifyListeners();
        } catch (e) {
            if (e.name === 'QuotaExceededError') {
                // Remove oldest items if storage is full
                history.pop();
                this.save(history);
            } else {
                throw e;
            }
        }
    }

    /**
     * Generate unique ID
     */
    generateId() {
        return `hist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Format timestamp for display
     */
    formatDate(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        
        // Less than 1 hour
        if (diff < 3600000) {
            const mins = Math.floor(diff / 60000);
            return mins < 1 ? 'Just now' : `${mins}m ago`;
        }
        
        // Less than 24 hours
        if (diff < 86400000) {
            const hours = Math.floor(diff / 3600000);
            return `${hours}h ago`;
        }
        
        // Otherwise show date
        return date.toLocaleDateString(undefined, { 
            month: 'short', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    /**
     * Get formatted history for display
     */
    getFormatted(limit = null) {
        const history = this.getAll();
        const items = limit ? history.slice(0, limit) : history;
        
        return items.map(item => ({
            ...item,
            displayDate: this.formatDate(item.timestamp),
            preview: this.createPreview(item),
        }));
    }

    /**
     * Create preview text from result
     */
    createPreview(item) {
        const maxLength = 100;
        let text = '';
        
        if (typeof item.result === 'string') {
            text = item.result;
        } else if (item.result && typeof item.result === 'object') {
            text = JSON.stringify(item.result);
        }
        
        return text.length > maxLength 
            ? text.substring(0, maxLength) + '...' 
            : text;
    }

    /**
     * Subscribe to history changes
     */
    subscribe(callback) {
        this.listeners.push(callback);
        // Return unsubscribe function
        return () => {
            this.listeners = this.listeners.filter(cb => cb !== callback);
        };
    }

    /**
     * Notify listeners
     */
    notifyListeners() {
        const data = this.getFormatted();
        this.listeners.forEach(cb => {
            try {
                cb(data);
            } catch (e) {
                CONFIG.error('History listener error:', e);
            }
        });
    }

    /**
     * Export history as JSON
     */
    export() {
        return JSON.stringify(this.getAll(), null, 2);
    }

    /**
     * Import history from JSON
     */
    import(jsonString) {
        try {
            const data = JSON.parse(jsonString);
            if (Array.isArray(data)) {
                this.save(data);
                return true;
            }
            return false;
        } catch {
            return false;
        }
    }
}

// Create global instance
const historyService = new HistoryService();

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { HistoryService, historyService };
}