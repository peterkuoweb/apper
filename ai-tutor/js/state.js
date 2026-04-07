/**
 * Global State Management
 */
const state = {
    user: null, // { userId, role, isPremium, credits, apiProvider, apiKey }
    systemSettings: {
        upgradeUrl: "https://example.com/upgrade"
    },
    courses: [],
    currentCourse: null,

    // Check if user is logged in
    isLoggedIn() {
        return this.user !== null;
    },

    // Check if user is admin
    isAdmin() {
        return this.user && this.user.role === 'admin';
    },

    // Check if user has premium access
    isPremium() {
        return this.user && this.user.isPremium;
    },

    // Save state to localStorage for persistence
    saveSession() {
        if (this.user) {
            localStorage.setItem('ai_tutor_user', JSON.stringify(this.user));
        }
    },

    // Load state from localStorage
    loadSession() {
        const saved = localStorage.getItem('ai_tutor_user');
        if (saved) {
            try {
                this.user = JSON.parse(saved);
                return true;
            } catch (e) {
                console.error("Failed to parse saved session", e);
                localStorage.removeItem('ai_tutor_user');
            }
        }
        return false;
    },

    clearSession() {
        this.user = null;
        localStorage.removeItem('ai_tutor_user');
    }
};