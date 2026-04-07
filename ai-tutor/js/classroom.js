/**
 * Interactive Classroom Controller
 * Handles Web Speech API, markdown rendering, iframe sandbox, and chat logic.
 */
const classroom = {
    course: null,
    messages: [], // Array of {role: 'user'|'assistant', text: '...'}
    recognition: null,
    isListening: false,
    synth: window.speechSynthesis,

    init(courseData) {
        this.course = courseData;
        this.messages = [];

        document.getElementById('classroom-title').textContent = this.course.name;
        document.getElementById('chat-history').innerHTML = '';
        document.getElementById('whiteboard-container').classList.add('hidden');
        document.getElementById('whiteboard-frame').srcdoc = '';
        document.getElementById('chat-input-text').value = '';

        this.initSpeechRecognition();
        this.bindEvents();

        // Welcome message
        this.addMessage('assistant', `歡迎來到 **${this.course.name}**！我們準備好開始了嗎？`);
    },

    bindEvents() {
        const btnRaise = document.getElementById('btn-raise-hand');
        // Clear old event listeners by cloning
        const newBtnRaise = btnRaise.cloneNode(true);
        btnRaise.parentNode.replaceChild(newBtnRaise, btnRaise);

        newBtnRaise.addEventListener('click', () => this.toggleListening());

        const btnSendText = document.getElementById('btn-send-text');
        const newBtnSend = btnSendText.cloneNode(true);
        btnSendText.parentNode.replaceChild(newBtnSend, btnSendText);

        newBtnSend.addEventListener('click', () => {
            const input = document.getElementById('chat-input-text');
            if (input.value.trim()) {
                this.handleUserInput(input.value.trim());
                input.value = '';
            }
        });
    },

    initSpeechRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            this.updateVoiceStatus("您的瀏覽器不支援語音辨識，請使用文字輸入。");
            document.getElementById('btn-raise-hand').style.display = 'none';
            return;
        }

        this.recognition = new SpeechRecognition();
        this.recognition.lang = 'zh-TW';
        this.recognition.interimResults = false;
        this.recognition.maxAlternatives = 1;

        this.recognition.onstart = () => {
            this.isListening = true;
            document.getElementById('btn-raise-hand').classList.add('listening');
            this.updateVoiceStatus("🎤 聆聽中... (請說話)");
        };

        this.recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            this.handleUserInput(transcript);
        };

        this.recognition.onerror = (event) => {
            console.error("Speech recognition error", event.error);
            this.updateVoiceStatus("語音辨識錯誤，請重試。");
            this.stopListening();
        };

        this.recognition.onend = () => {
            this.stopListening();
        };
    },

    toggleListening() {
        if (!this.recognition) return;

        if (this.isListening) {
            this.recognition.stop();
        } else {
            // Stop any ongoing TTS before listening
            if (this.synth.speaking) this.synth.cancel();
            try {
                this.recognition.start();
            } catch(e) {
                console.warn(e);
            }
        }
    },

    stopListening() {
        this.isListening = false;
        document.getElementById('btn-raise-hand').classList.remove('listening');
        this.updateVoiceStatus("");
    },

    updateVoiceStatus(msg) {
        document.getElementById('voice-status').textContent = msg;
    },

    async handleUserInput(text) {
        if (!text) return;

        // Stop any ongoing speech
        if(this.synth.speaking) this.synth.cancel();

        this.addMessage('user', text);
        this.messages.push({ role: 'user', text: text });

        document.getElementById('ai-typing').classList.remove('hidden');

        try {
            // OpenMAIC Style Prompt Construction:
            // We append a rigid structure rule to the course prompt to force AI to separate explanation from code
            const systemRule = `
                ${this.course.prompt}
                請使用繁體中文。若需要展示程式碼或畫面，請以 \`\`\`html 包裝完整的 HTML (包含 <style> 與 <script>)。
            `;

            const aiResponseText = await api.generateChatResponse(this.messages, systemRule);

            this.messages.push({ role: 'assistant', text: aiResponseText });
            this.processAIResponse(aiResponseText);

        } catch (error) {
            console.error(error);
            this.addMessage('assistant', `⚠️ 錯誤: ${error.message}`);
        } finally {
            document.getElementById('ai-typing').classList.add('hidden');
        }
    },

    processAIResponse(text) {
        // Parse out HTML code blocks for the whiteboard
        // Regex to match ```html ... ```
        const htmlRegex = /```html\n([\s\S]*?)```/g;
        let match;
        let extractedHtml = null;

        while ((match = htmlRegex.exec(text)) !== null) {
            extractedHtml = match[1];
        }

        // Add message to chat history
        this.addMessage('assistant', text);

        // Speak the text (stripping markdown/code blocks for cleaner speech)
        const textToSpeak = text.replace(/```[\s\S]*?```/g, '').replace(/[#*]/g, '');
        this.speak(textToSpeak);

        // Update whiteboard if HTML exists
        if (extractedHtml) {
            const container = document.getElementById('whiteboard-container');
            const frame = document.getElementById('whiteboard-frame');
            container.classList.remove('hidden');
            frame.srcdoc = extractedHtml;
        }
    },

    addMessage(role, text) {
        const history = document.getElementById('chat-history');
        const msgDiv = document.createElement('div');
        msgDiv.className = `chat-msg ${role}`;

        if (role === 'assistant') {
            // Parse Markdown and sanitize
            const rawHtml = marked.parse(text);
            const safeHtml = DOMPurify.sanitize(rawHtml);
            msgDiv.innerHTML = `<div class="markdown-body">${safeHtml}</div>`;

            // Apply highlight.js to code blocks
            msgDiv.querySelectorAll('pre code').forEach((block) => {
                hljs.highlightElement(block);
            });
        } else {
            msgDiv.textContent = text;
        }

        history.appendChild(msgDiv);
        history.scrollTop = history.scrollHeight;
    },

    speak(text) {
        if (!this.synth) return;

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'zh-TW';
        utterance.rate = 1.0;

        // Basic visual cue
        utterance.onstart = () => this.updateVoiceStatus("🔊 AI 說話中...");
        utterance.onend = () => this.updateVoiceStatus("");

        this.synth.speak(utterance);
    }
};