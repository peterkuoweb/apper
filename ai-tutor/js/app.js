/**
 * Main Application Controller (Routing and UI)
 */
const app = {
    views: ['loading', 'login', 'dashboard', 'settings', 'classroom', 'admin'],

    async init() {
        // Handle DOM elements
        this.nav = document.getElementById('top-nav');
        this.navCredits = document.getElementById('nav-credits');
        this.navUserStatus = document.getElementById('nav-user-status');
        this.navUpgradeBtn = document.getElementById('nav-upgrade-btn');
        this.adminBtn = document.getElementById('btn-admin-panel');

        // Bind Auth form
        document.getElementById('auth-form').addEventListener('submit', this.handleLogin.bind(this));

        // Bind Settings form
        document.getElementById('settings-form').addEventListener('submit', this.handleSettingsUpdate.bind(this));

        // Check Session
        if (state.loadSession()) {
            await this.loadAppContext();
        } else {
            this.showView('login');
        }
    },

    showView(viewId) {
        // Hide all views
        this.views.forEach(v => {
            document.getElementById(`view-${v}`).classList.add('hidden');
            document.getElementById(`view-${v}`).classList.remove('active');
        });

        // Show target view
        const target = document.getElementById(`view-${viewId}`);
        target.classList.remove('hidden');
        target.classList.add('active');

        // Manage Navigation visibility
        if (viewId === 'login' || viewId === 'loading') {
            this.nav.classList.add('hidden');
        } else {
            this.nav.classList.remove('hidden');
            this.updateNavUI();
        }

        // View specific initializations
        if (viewId === 'dashboard') {
            this.renderCourses();
        } else if (viewId === 'settings') {
            this.populateSettings();
        } else if (viewId === 'admin') {
            if(typeof admin !== 'undefined') admin.init();
        }
    },

    updateNavUI() {
        if (!state.user) return;

        this.navCredits.textContent = `剩餘堂數: ${state.user.credits}`;
        this.navUserStatus.textContent = state.user.isPremium ? "⭐ 進階會員" : "👤 免費會員";

        if (state.user.isPremium) {
            this.navUpgradeBtn.classList.add('hidden');
        } else {
            this.navUpgradeBtn.classList.remove('hidden');
        }

        if (state.isAdmin()) {
            this.adminBtn.classList.remove('hidden');
        } else {
            this.adminBtn.classList.add('hidden');
        }
    },

    async loadAppContext() {
        this.showView('loading');
        try {
            // Fetch global settings and courses
            const [settingsRes, coursesRes] = await Promise.all([
                api.getSettings(),
                api.getCourses()
            ]);

            if (settingsRes.success) state.systemSettings = settingsRes.settings;
            if (coursesRes.success) state.courses = coursesRes.courses;

            this.showView('dashboard');
        } catch (error) {
            console.error("Failed to load context", error);
            alert("載入系統資料失敗");
            this.logout();
        }
    },

    async handleLogin(e) {
        e.preventDefault();
        const userInp = document.getElementById('auth-username').value;
        const passInp = document.getElementById('auth-password').value;
        const errEl = document.getElementById('auth-error');

        errEl.classList.add('hidden');
        this.showView('loading');

        try {
            const res = await api.login(userInp, passInp);
            if (res.success) {
                state.user = res.user;
                state.saveSession();
                await this.loadAppContext();
            } else {
                throw new Error(res.message || "登入失敗");
            }
        } catch (err) {
            errEl.textContent = err.message;
            errEl.classList.remove('hidden');
            this.showView('login');
        }
    },

    logout() {
        state.clearSession();
        this.showView('login');
    },

    goToUpgrade() {
        if (state.systemSettings.upgradeUrl) {
            window.open(state.systemSettings.upgradeUrl, '_blank');
        }
    },

    // --- Dashboard logic ---
    renderCourses() {
        const grid = document.getElementById('course-list');
        grid.innerHTML = '';

        state.courses.forEach(course => {
            const card = document.createElement('div');
            card.className = 'course-card';
            card.onclick = () => this.enterCourse(course);

            card.innerHTML = `
                <h3>${course.name}</h3>
                <p>${course.desc}</p>
                <div class="course-meta">
                    <span>${course.totalClasses} 堂課</span>
                    <span>▶️ 開始學習</span>
                </div>
            `;
            grid.appendChild(card);
        });
    },

    enterCourse(course) {
        if (state.user.credits <= 0) {
            alert("扣打已用完！請升級進階方案。");
            return;
        }
        state.currentCourse = course;

        // Initialize classroom
        if(typeof classroom !== 'undefined') {
            classroom.init(course);
        }

        this.showView('classroom');
    },

    // --- Settings Logic ---
    populateSettings() {
        if (!state.user) return;
        document.getElementById('settings-provider').value = state.user.apiProvider || 'OpenRouter';
        document.getElementById('settings-api-key').value = state.user.apiKey || '';
        document.getElementById('settings-msg').classList.add('hidden');
    },

    async handleSettingsUpdate(e) {
        e.preventDefault();
        const provider = document.getElementById('settings-provider').value;
        const key = document.getElementById('settings-api-key').value;
        const msgEl = document.getElementById('settings-msg');

        try {
            await api.updateUserSettings(provider, key);
            state.user.apiProvider = provider;
            state.user.apiKey = key;
            state.saveSession();

            msgEl.textContent = "設定儲存成功！";
            msgEl.classList.remove('hidden');
        } catch (err) {
            alert("儲存失敗");
        }
    }
};

// Initialize app when DOM loads
document.addEventListener('DOMContentLoaded', () => {
    app.init();
});