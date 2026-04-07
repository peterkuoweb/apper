/**
 * API Communication Layer
 */

// Replace this with your actual deployed Google Apps Script Web App URL
const GAS_ENDPOINT = "YOUR_GAS_WEB_APP_URL";

const api = {
    /**
     * Helper to send POST requests to GAS
     */
    async gasPost(action, data = {}) {
        // Since GAS cross-origin POST often requires no-cors or JSONP tricks if not configured perfectly,
        // we use fetch with content-type text/plain to avoid preflight options errors on simple setups.
        // In a real production environment with GAS, you often stringify JSON and send it.
        try {
            const payload = {
                action: action,
                payload: data
            };

            // Note: If GAS endpoint is not ready, this will fail. We provide dummy fallback logic below for UI demo purposes if URL is dummy.
            if (GAS_ENDPOINT === "YOUR_GAS_WEB_APP_URL") {
                console.warn("GAS_ENDPOINT not configured. Using mock data for:", action);
                return this.mockResponse(action, data);
            }

            const response = await fetch(GAS_ENDPOINT, {
                method: "POST",
                headers: {
                    "Content-Type": "text/plain;charset=utf-8",
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) throw new Error("Network response was not ok");
            return await response.json();
        } catch (error) {
            console.error("API Error:", error);
            throw error;
        }
    },

    /**
     * Mock responses for UI testing without backend
     */
    async mockResponse(action, data) {
        return new Promise(resolve => {
            setTimeout(() => {
                switch (action) {
                    case 'login':
                        resolve({
                            success: true,
                            user: {
                                userId: 'u1', username: data.username, role: data.username === 'admin' ? 'admin' : 'user',
                                isPremium: false, credits: 5, apiProvider: 'Gemini', apiKey: ''
                            }
                        });
                        break;
                    case 'getSettings':
                        resolve({ success: true, settings: { upgradeUrl: "https://example.com/pay" }});
                        break;
                    case 'getCourses':
                        resolve({ success: true, courses: [
                            { id: 'c1', name: 'Python 基礎', desc: '從零開始學 Python', totalClasses: 10, prompt: 'You are a python tutor.' },
                            { id: 'c2', name: '網頁前端設計', desc: 'HTML, CSS, JS 實戰', totalClasses: 12, prompt: 'You are a web dev tutor.' }
                        ]});
                        break;
                    case 'updateSettings':
                        resolve({ success: true });
                        break;
                    case 'adminUpdateUser':
                        resolve({ success: true });
                        break;
                    case 'updateSystemSettings':
                        resolve({ success: true });
                        break;
                    case 'adminGetUsers':
                        resolve({ success: true, users: [
                            { userId: 'u1', username: 'testuser', isPremium: false, credits: 5 },
                            { userId: 'u2', username: 'pro', isPremium: true, credits: 30 }
                        ]});
                        break;
                    case 'chatPremium':
                        resolve({ success: true, reply: "這是官方 AI 回應：你好！這裡有段程式碼\n```html\n<h1>Hello</h1>\n```\n請看左邊白板！" });
                        break;
                    default:
                        resolve({ success: false, message: "Unknown mock action" });
                }
            }, 500);
        });
    },

    // Auth
    async login(username, password) {
        return this.gasPost('login', { username, password });
    },

    // User Data
    async getSettings() {
        return this.gasPost('getSettings', {});
    },

    async getCourses() {
        return this.gasPost('getCourses', {});
    },

    async updateUserSettings(provider, apiKey) {
        return this.gasPost('updateUserSettings', {
            userId: state.user.userId,
            provider,
            apiKey
        });
    },

    // Chat / AI Generation
    async generateChatResponse(messages, coursePrompt) {
        // Check if premium or free
        if (state.isPremium()) {
            // Premium uses official backend keys
            const res = await this.gasPost('chatPremium', {
                userId: state.user.userId,
                messages,
                systemPrompt: coursePrompt
            });
            if (!res.success) throw new Error(res.message);
            return res.reply;
        } else {
            // Free user: Direct Frontend Fetch (BYOK)
            const provider = state.user.apiProvider;
            const key = state.user.apiKey;

            if (!key) throw new Error("Free User Error: 尚未設定 API Key。請前往模型設定輸入。");

            return this.directAIFetch(provider, key, messages, coursePrompt);
        }
    },

    /**
     * Direct Fetch to AI providers using user's own key
     */
    async directAIFetch(provider, key, messages, systemPrompt) {
        // Construct standard messages array
        const formattedMessages = [
            { role: "system", content: systemPrompt },
            ...messages.map(m => ({ role: m.role, content: m.text }))
        ];

        try {
            if (provider === 'Gemini') {
                const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${key}`;
                const body = {
                    contents: formattedMessages.filter(m => m.role !== 'system').map(m => ({
                        role: m.role === 'assistant' ? 'model' : 'user',
                        parts: [{ text: m.content }]
                    }))
                };
                // Gemini currently requires system instructions differently, simplifying for BYOK fallback
                const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
                const data = await res.json();
                if (data.error) throw new Error(data.error.message);
                return data.candidates[0].content.parts[0].text;
            }
            else if (provider === 'OpenRouter') {
                const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${key}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        model: "google/gemini-pro", // default fallback openrouter model
                        messages: formattedMessages
                    })
                });
                const data = await res.json();
                if (data.error) throw new Error(data.error.message);
                return data.choices[0].message.content;
            }
            else if (provider === 'ChatGPT') {
                const res = await fetch("https://api.openai.com/v1/chat/completions", {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${key}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        model: "gpt-4o-mini", // fast default
                        messages: formattedMessages
                    })
                });
                const data = await res.json();
                if (data.error) throw new Error(data.error.message);
                return data.choices[0].message.content;
            }
            else if (provider === 'Ollama') {
                // Requires local ollama instance running with CORS enabled (e.g. OLLAMA_ORIGINS="*")
                // Uses localhost:11434 by default. Key is ignored as Ollama is local.
                const hostUrl = key || "http://localhost:11434";
                const res = await fetch(`${hostUrl}/api/chat`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        model: "llama3", // default fallback, user should specify in settings ideally
                        messages: formattedMessages,
                        stream: false
                    })
                });
                const data = await res.json();
                if (data.error) throw new Error(data.error);
                return data.message.content;
            }
            else if (provider === 'MiniMax') {
                const res = await fetch("https://api.minimax.chat/v1/text/chatcompletion_v2", {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${key}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        model: "abab6.5s-chat",
                        messages: formattedMessages
                    })
                });
                const data = await res.json();
                if (data.base_resp && data.base_resp.status_code !== 0) throw new Error(data.base_resp.status_msg);
                return data.choices[0].message.content;
            }
            else if (provider === 'Kimi') {
                const res = await fetch("https://api.moonshot.cn/v1/chat/completions", {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${key}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        model: "moonshot-v1-8k",
                        messages: formattedMessages
                    })
                });
                const data = await res.json();
                if (data.error) throw new Error(data.error.message);
                return data.choices[0].message.content;
            }
            else {
                throw new Error(`Provider ${provider} is not supported.`);
            }
        } catch (err) {
            console.error("Direct API Fetch Error", err);
            throw new Error("API 呼叫失敗，請檢查網路或 API Key 是否正確。");
        }
    }
};
