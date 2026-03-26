/**
 * AI Tools Hub - API Service
 * Centralized API handler with retry logic, timeout, and error handling
 */

class ApiError extends Error {
    constructor(message, code) {
        super(message);
        this.name = 'ApiError';
        this.code = code;
    }
}

class ApiService {
    constructor() {
        // Defaults if CONFIG.api is not defined
        this.config = CONFIG.api || {
            timeout: 60000,
            retryAttempts: 2,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            responseFields: ['response', 'output', 'result', 'text', 'message', 'content', 'answer']
        };
        this.abortControllers = new Map();
    }

    generateRequestId() {
        return `req_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    }

    createFetchOptions(body, requestId) {
        const controller = new AbortController();
        this.abortControllers.set(requestId, controller);

        const timeoutId = setTimeout(() => {
            controller.abort();
            this.abortControllers.delete(requestId);
        }, this.config.timeout);

        return {
            options: {
                method: 'POST',
                headers: { 
                    ...this.config.headers,
                    'ngrok-skip-browser-warning': 'true'
                },
                body: JSON.stringify(body),
                signal: controller.signal,
                mode: 'cors',
                cache: 'no-cache',
            },
            timeoutId,
            controller
        };
    }

    clearRequest(requestId) {
        const controller = this.abortControllers.get(requestId);
        if (controller) {
            controller.abort();
            this.abortControllers.delete(requestId);
        }
    }

    extractResponse(data) {
        if (!data || typeof data !== 'object') {
            throw new ApiError('Invalid response: expected object', 'INVALID_FORMAT');
        }

        for (const field of this.config.responseFields) {
            if (field in data && typeof data[field] === 'string') {
                return data[field];
            }
        }

        if (typeof data === 'string') {
            return data;
        }

        if (CONFIG.error) {
            CONFIG.error('Unexpected response format:', data);
        }
        throw new ApiError('Invalid response: no recognized text field', 'INVALID_FORMAT');
    }

    async request(prompt, options = {}) {
        const { tool = 'chat', onStream } = options;
        const webhookUrl = CONFIG.getWebhookUrl(tool);
        
        if (!webhookUrl) {
            throw new ApiError(`No webhook URL configured for agent: ${tool}`, 'CONFIG_ERROR');
        }

        const maxAttempts = this.config.retryAttempts + 1;
        let lastError;

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            const requestId = this.generateRequestId();
            const body = { message: prompt, tool: tool };
            const { options: fetchOptions, timeoutId } = this.createFetchOptions(body, requestId);

            try {
                const response = await fetch(webhookUrl, fetchOptions);
                clearTimeout(timeoutId);
                this.abortControllers.delete(requestId);

                if (!response.ok) {
                    throw new ApiError(`HTTP Error: ${response.status}`, 'HTTP_ERROR');
                }

                // If stream is requested and supported by backend
                // Note: Standard n8n webhooks usually return complete JSON, but we leave the hook for streams.
                if (onStream) {
                    // Fallback to json if backend doesn't stream chunks properly
                }

                const data = await response.json();
                return this.extractResponse(data);

            } catch (error) {
                clearTimeout(timeoutId);
                this.abortControllers.delete(requestId);

                if (error.name === 'AbortError') {
                    throw new ApiError('Request timed out', 'TIMEOUT');
                }

                lastError = error;
                
                // Don't retry if it's an HTTP format error or we are out of attempts
                if (error.code === 'INVALID_FORMAT' || attempt === maxAttempts) {
                    break;
                }
            }
        }

        throw new ApiError(lastError?.message || 'Failed after multiple retries', lastError?.code || 'NETWORK');
    }
}

// Global instance
const apiService = new ApiService();
