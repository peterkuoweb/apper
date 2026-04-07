/**
 * Admin Panel Controller
 */
const admin = {
    tabs: ['users', 'system', 'courses'],
    users: [],

    init() {
        if (!state.isAdmin()) {
            app.showView('dashboard');
            return;
        }
        this.switchTab('users');
    },

    switchTab(tabId) {
        // Update tab buttons UI
        document.querySelectorAll('.admin-tabs .tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        event.target.classList.add('active');

        // Render content
        const contentDiv = document.getElementById('admin-content');
        contentDiv.innerHTML = '<div class="spinner"></div>';

        if (tabId === 'users') this.renderUsersTab(contentDiv);
        else if (tabId === 'system') this.renderSystemTab(contentDiv);
        else if (tabId === 'courses') this.renderCoursesTab(contentDiv);
    },

    async renderUsersTab(container) {
        try {
            const res = await api.gasPost('adminGetUsers', {});
            if (res.success) {
                this.users = res.users;

                let html = `
                    <section>
                        <h3>使用者管理</h3>
                        <table class="admin-table">
                            <thead>
                                <tr>
                                    <th>帳號</th>
                                    <th>會員狀態</th>
                                    <th>剩餘扣打</th>
                                    <th>操作</th>
                                </tr>
                            </thead>
                            <tbody>
                `;

                this.users.forEach(u => {
                    html += `
                        <tr>
                            <td>${u.username}</td>
                            <td>${u.isPremium ? '⭐ 進階' : '免費'}</td>
                            <td>${u.credits}</td>
                            <td>
                                <button onclick="admin.togglePremium('${u.userId}', ${!u.isPremium})">
                                    切換進階狀態
                                </button>
                            </td>
                        </tr>
                    `;
                });

                html += `</tbody></table></section>`;
                container.innerHTML = html;
            } else {
                throw new Error(res.message);
            }
        } catch (e) {
            container.innerHTML = `<p class="error-text">載入失敗: ${e.message}</p>`;
        }
    },

    async togglePremium(userId, makePremium) {
        try {
            const contentDiv = document.getElementById('admin-content');
            contentDiv.innerHTML = '<div class="spinner"></div><p>更新中...</p>';

            const res = await api.gasPost('adminUpdateUser', { userId, isPremium: makePremium });
            if (!res.success) throw new Error(res.message);

            this.switchTab('users'); // reload
        } catch(e) {
            alert(`更新失敗: ${e.message}`);
            this.switchTab('users');
        }
    },

    renderSystemTab(container) {
        container.innerHTML = `
            <section>
                <h3>系統與付費設定</h3>
                <form class="admin-form" id="admin-sys-form">
                    <label>預設售價 (Premium_Price_Original)</label>
                    <input type="number" id="sys-price-orig" value="${state.systemSettings.originalPrice || 1200}">

                    <label>特價 (Premium_Price_Current)</label>
                    <input type="number" id="sys-price-cur" value="${state.systemSettings.currentPrice || 990}">

                    <label>升級跳轉連結 (Upgrade_Redirect_URL)</label>
                    <input type="url" id="sys-upgrade-url" value="${state.systemSettings.upgradeUrl || ''}">

                    <hr style="margin: 1rem 0; border:0; border-top:1px solid #eaeaea;">

                    <h3>官方 AI 設定 (付費版專用)</h3>
                    <label>官方供應商 (Official_AI_Provider)</label>
                    <select id="sys-provider">
                        <option value="Gemini">Gemini</option>
                        <option value="OpenAI">OpenAI</option>
                    </select>

                    <label>多組 API Keys (用逗號分隔，實現自動輪替 Fallback)</label>
                    <input type="password" id="sys-api-keys" placeholder="key1,key2,key3">

                    <button type="submit" class="primary-btn" style="margin-top:1rem;">儲存設定</button>
                    <p id="sys-msg" class="success-text hidden"></p>
                </form>
            </section>
        `;

        document.getElementById('admin-sys-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const msgEl = document.getElementById('sys-msg');
            msgEl.classList.add('hidden');

            const payload = {
                originalPrice: document.getElementById('sys-price-orig').value,
                currentPrice: document.getElementById('sys-price-cur').value,
                upgradeUrl: document.getElementById('sys-upgrade-url').value,
                provider: document.getElementById('sys-provider').value,
                keys: document.getElementById('sys-api-keys').value
            };

            try {
                const res = await api.gasPost('updateSystemSettings', payload);
                if (!res.success) throw new Error(res.message);

                msgEl.textContent = "系統設定已更新！";
                msgEl.classList.remove('hidden');
            } catch(err) {
                alert(`更新失敗: ${err.message}`);
            }
        });
    },

    renderCoursesTab(container) {
        container.innerHTML = `
            <section>
                <h3>公開課程管理</h3>
                <table class="admin-table">
                    <thead>
                        <tr>
                            <th>課程名稱</th>
                            <th>總堂數</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${state.courses.map(c => `
                            <tr>
                                <td>${c.name}</td>
                                <td>${c.totalClasses}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                <p style="margin-top:1rem; font-size:0.875rem; color:var(--text-secondary);">
                    提示：新增或編輯課程請直接至 Google Sheets 的「Courses」工作表操作，前台會自動同步。
                </p>
            </section>
        `;
    }
};