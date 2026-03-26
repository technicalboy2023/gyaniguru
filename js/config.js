/**
 * GyaniGuru Configuration
 * Centralized configuration for all AI agents
 */

const CONFIG = {
    // App Info
    app: {
        name: 'GyaniGuru',
        version: '1.0.0',
        description: 'AI Chat, Image Generation & Blog Writing Platform',
    },
    
    // Agent Registry - Configure your n8n webhooks here
    agents: {
        chat: {
            id: 'chat',
            name: 'AI Chat',
            description: 'Intelligent conversation agent',
            icon: 'fa-comments',
            // REPLACE WITH YOUR N8N WEBHOOK URL
            webhookUrl: 'https://wuthering-ressie-subcarinated.ngrok-free.dev/webhook/mychatapp',
            inputType: 'textarea',
            placeholder: 'Ask me anything...',
        },
        image: {
            id: 'image',
            name: 'Image Generator',
            description: 'AI image generation agent',
            icon: 'fa-image',
            // REPLACE WITH YOUR N8N WEBHOOK URL
            webhookUrl: 'https://your-n8n-instance.com/webhook/image-agent',
            inputType: 'text',
            placeholder: 'Describe the image you want to generate...',
        },
        blog: {
            id: 'blog',
            name: 'Blog Writer',
            description: 'SEO blog post generation agent',
            icon: 'fa-blog',
            // REPLACE WITH YOUR N8N WEBHOOK URL
            webhookUrl: 'https://your-n8n-instance.com/webhook/blog-agent',
            inputType: 'textarea',
            placeholder: 'Enter blog topic...',
        }
    },
    
    // API Configuration
    api: {
        timeout: 60000,
        retryAttempts: 2,
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        },
        responseFields: ['response', 'output', 'result', 'text', 'message', 'content', 'answer'],
    },
    
    // Usage Limits
    limits: {
        free: {
            dailyRequests: 5,
            features: ['chat', 'image', 'blog']
        },
        pro: {
            dailyRequests: Infinity,
            features: ['chat', 'image', 'blog', 'priority']
        }
    },

    // Credits Configuration (used by services/credits.js)
    credits: {
        dailyLimit: 5,
        storageKey: 'gyaniguru_credits',
        dateKey: 'gyaniguru_credits_date',
    },

    // History Configuration (used by services/history.js)
    history: {
        storageKey: 'gyaniguru_history',
        maxItems: 50,
    },
    
    // Debug mode
    debug: false,
    
    // Utility methods
    isDebug() {
        return this.debug || localStorage.getItem('gyaniguru_debug') === 'true';
    },
    
    log(...args) {
        if (this.isDebug()) {
            console.log(`[${this.app.name}]`, ...args);
        }
    },
    
    error(...args) {
        console.error(`[${this.app.name}]`, ...args);
    },
    
    getAgent(agentId) {
        return this.agents[agentId] || null;
    },
    
    getWebhookUrl(agentId) {
        const agent = this.getAgent(agentId);
        return agent ? agent.webhookUrl : null;
    }
};

// Prevent modification
Object.freeze(CONFIG);
Object.freeze(CONFIG.app);
Object.freeze(CONFIG.agents);
Object.freeze(CONFIG.api);
Object.freeze(CONFIG.limits);
Object.freeze(CONFIG.credits);
Object.freeze(CONFIG.history);

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}
