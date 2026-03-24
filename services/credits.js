/**
 * AI Tools Hub - Credits Service
 * Manages daily credit limits with auto-reset
 */

class CreditsService {
    constructor() {
        this.config = CONFIG.credits;
        this.listeners = [];
    }

    /**
     * Get current credit status
     */
    getStatus() {
        const savedDate = localStorage.getItem(this.config.dateKey);
        const today = new Date().toDateString();
        let credits = parseInt(localStorage.getItem(this.config.storageKey));

        // Initialize or reset if new day
        if (savedDate !== today || isNaN(credits)) {
            credits = this.config.dailyLimit;
            this.saveCredits(credits, today);
            CONFIG.log('Credits reset for new day');
        }

        return {
            credits,
            max: this.config.dailyLimit,
            remaining: credits,
            used: this.config.dailyLimit - credits,
            canGenerate: credits > 0,
            resetDate: new Date(Date.now() + 86400000).toDateString(), // Tomorrow
        };
    }

    /**
     * Save credits to storage
     */
    saveCredits(credits, date = new Date().toDateString()) {
        localStorage.setItem(this.config.storageKey, credits.toString());
        localStorage.setItem(this.config.dateKey, date);
        this.notifyListeners();
    }

    /**
     * Attempt to use a credit
     */
    useCredit() {
        const status = this.getStatus();

        if (status.credits <= 0) {
            return {
                success: false,
                remaining: 0,
                error: 'Daily limit reached',
            };
        }

        const newCredits = status.credits - 1;
        this.saveCredits(newCredits);

        CONFIG.log('Credit used:', { remaining: newCredits });

        return {
            success: true,
            remaining: newCredits,
        };
    }

    /**
     * Refund a credit (on failure)
     */
    refundCredit() {
        const status = this.getStatus();

        if (status.credits < this.config.dailyLimit) {
            const newCredits = status.credits + 1;
            this.saveCredits(newCredits);
            CONFIG.log('Credit refunded:', { remaining: newCredits });
            return true;
        }

        return false;
    }

    /**
     * Check if user can generate
     */
    canGenerate() {
        return this.getStatus().canGenerate;
    }

    /**
     * Get credits remaining
     */
    getRemaining() {
        return this.getStatus().remaining;
    }

    /**
     * Force reset (for testing)
     */
    forceReset() {
        this.saveCredits(this.config.dailyLimit);
        CONFIG.log('Credits force reset');
    }

    /**
     * Subscribe to credit changes
     */
    subscribe(callback) {
        this.listeners.push(callback);
        return () => {
            this.listeners = this.listeners.filter(cb => cb !== callback);
        };
    }

    /**
     * Notify listeners of changes
     */
    notifyListeners() {
        const status = this.getStatus();
        this.listeners.forEach(cb => {
            try {
                cb(status);
            } catch (e) {
                CONFIG.error('Credit listener error:', e);
            }
        });
    }

    /**
     * Get time until reset
     */
    getTimeUntilReset() {
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        
        const diff = tomorrow - now;
        const hours = Math.floor(diff / 3600000);
        const minutes = Math.floor((diff % 3600000) / 60000);
        
        return { hours, minutes, totalMs: diff };
    }
}

// Create global instance
const creditsService = new CreditsService();

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CreditsService, creditsService };
}