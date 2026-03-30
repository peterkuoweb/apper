// js/ui.js

// --- Preview Section ---

function updatePreview() {
    const container = document.getElementById('preview-container');
    container.innerHTML = ''; // Clear current preview

    const currentPage = getCurrentPage();
    if (!currentPage) return;

    currentPage.elements.forEach(elementData => {
        const el = document.createElement(getTagName(elementData.type));

        // Apply ID
        el.id = elementData.id;

        // Apply attributes
        for (const [key, value] of Object.entries(elementData.attributes)) {
            el.setAttribute(key, value);
        }

        // Apply content
        if (elementData.type !== 'input' && elementData.type !== 'img') {
            el.textContent = elementData.content;
        }

        // Apply style
        el.style.cssText = elementData.style;

        // Special handling for spacer to make it visible in editor
        if (elementData.type === 'spacer') {
            el.classList.add('apper-spacer');
        }

        container.appendChild(el);
    });
}

function getTagName(type) {
    switch (type) {
        case 'div': return 'div';
        case 'button': return 'button';
        case 'text': return 'span';
        case 'input': return 'input';
        case 'img': return 'img';
        case 'spacer': return 'div';
        case 'link': return 'a';
        default: return 'div';
    }
}

// Handle Preview Size Change
document.getElementById('preview-size').addEventListener('change', (e) => {
    const container = document.getElementById('preview-container');
    container.className = `size-${e.target.value}`;
});

// Initialize Preview Size
document.getElementById('preview-container').className = `size-${document.getElementById('preview-size').value}`;


// --- Pages Section (Scratch Backdrops Style) ---

function renderPagesList() {
    const list = document.getElementById('pages-list');
    list.innerHTML = '';

    apperState.pages.forEach(page => {
        const item = document.createElement('div');
        item.className = 'page-item';
        if (page.id === apperState.currentPageId) {
            item.classList.add('active');
        }

        const icon = document.createElement('div');
        icon.className = 'item-icon';
        icon.textContent = '🖼️'; // Placeholder icon

        const label = document.createElement('div');
        label.className = 'item-label';
        label.textContent = page.name;

        // Edit and Delete buttons
        const editBtn = document.createElement('div');
        editBtn.className = 'item-edit';
        editBtn.textContent = '✎';
        editBtn.title = '重新命名';
        editBtn.onclick = (e) => {
            e.stopPropagation();
            const newName = prompt('請輸入新頁面名稱:', page.name);
            if(newName) {
                page.name = newName;
                renderPagesList();
                if(typeof updateDynamicBlocks === 'function') updateDynamicBlocks();
            }
        };

        const delBtn = document.createElement('div');
        delBtn.className = 'item-delete';
        delBtn.textContent = '×';
        delBtn.title = '刪除頁面';
        delBtn.onclick = (e) => {
            e.stopPropagation();
            if(apperState.pages.length <= 1) {
                alert('專案必須至少有一個頁面！');
                return;
            }
            if(confirm(`確定要刪除頁面「${page.name}」嗎?`)) {
                apperState.pages = apperState.pages.filter(p => p.id !== page.id);
                if(apperState.currentPageId === page.id) {
                    switchPage(apperState.pages[0].id);
                } else {
                    renderPagesList();
                    if(typeof updateDynamicBlocks === 'function') updateDynamicBlocks();
                }
            }
        };

        item.appendChild(editBtn);
        item.appendChild(delBtn);
        item.appendChild(icon);
        item.appendChild(label);

        item.addEventListener('click', () => switchPage(page.id));
        list.appendChild(item);
    });
}

document.getElementById('add-page-btn').addEventListener('click', () => {
    const pageName = prompt("請輸入頁面名稱:", `頁面 ${apperState.pageCounter + 1}`);
    if (pageName) {
        const newPageId = addPage(pageName);
        switchPage(newPageId);
    }
});

function switchPage(pageId) {
    if (apperState.currentPageId === pageId) return;

    // Save current workspace state before switching
    saveWorkspaceState();

    apperState.currentPageId = pageId;

    // Update UI
    renderPagesList();
    renderElementsList();
    updatePreview();

    // Load new workspace state
    loadWorkspaceState();

    // Update dynamic block dropdowns
    if (typeof updateDynamicBlocks === 'function') {
        updateDynamicBlocks();
    }
}


// --- Elements Section (Scratch Sprites Style) ---

let sortableElementsList;

function initElementsList() {
    const el = document.getElementById('elements-list');
    sortableElementsList = new Sortable(el, {
        animation: 150,
        ghostClass: 'blue-background-class',
        onEnd: function (evt) {
            reorderElements(evt.oldIndex, evt.newIndex);
            updatePreview();
        },
    });
}

function renderElementsList() {
    const list = document.getElementById('elements-list');
    list.innerHTML = '';

    const currentPage = getCurrentPage();
    if (!currentPage) return;

    currentPage.elements.forEach(element => {
        const item = document.createElement('div');
        item.className = 'element-item';
        item.dataset.id = element.id;

        const icon = document.createElement('div');
        icon.className = 'item-icon';
        icon.textContent = getElementIcon(element.type);

        const label = document.createElement('div');
        label.className = 'item-label';
        label.textContent = element.name;

        // Edit button
        const editBtn = document.createElement('div');
        editBtn.className = 'item-edit';
        editBtn.textContent = '✎';
        editBtn.title = '編輯屬性';
        editBtn.onclick = (e) => {
            e.stopPropagation();
            editElementProps(element.id);
        };

        // Delete button
        const delBtn = document.createElement('div');
        delBtn.className = 'item-delete';
        delBtn.textContent = '×';
        delBtn.title = '刪除元素';
        delBtn.onclick = (e) => {
            e.stopPropagation();
            if(confirm('確定要刪除此元素嗎?')) {
                removeElement(element.id);
                renderElementsList();
                updatePreview();
                if (typeof updateDynamicBlocks === 'function') updateDynamicBlocks();
            }
        };

        item.appendChild(editBtn);
        item.appendChild(delBtn);
        item.appendChild(icon);
        item.appendChild(label);

        list.appendChild(item);
    });
}

function getElementIcon(type) {
    switch(type) {
        case 'div': return '🔲';
        case 'button': return '🔘';
        case 'text': return '📝';
        case 'input': return '⌨️';
        case 'img': return '🖼️';
        case 'spacer': return '↕️';
        case 'link': return '🔗';
        default: return '🧩';
    }
}

document.getElementById('add-element-btn').addEventListener('click', () => {
    const type = document.getElementById('new-element-type').value;
    addElementToCurrentPage(type);
    renderElementsList();
    updatePreview();
    if (typeof updateDynamicBlocks === 'function') updateDynamicBlocks();
});

function editElementProps(id) {
    const page = getCurrentPage();
    const element = page.elements.find(e => e.id === id);
    if(!element) return;

    const newName = prompt('輸入新元素名稱 (用於積木識別):', element.name || '');
    if (newName) element.name = newName;

    const newContent = prompt('輸入新的內容/文字:', element.content || '');
    if (newContent !== null) element.content = newContent;

    const newStyle = prompt('輸入CSS樣式:', element.style || '');
    if (newStyle !== null) element.style = newStyle;

    renderElementsList();
    updatePreview();
    if(typeof updateDynamicBlocks === 'function') updateDynamicBlocks();
}

// Initial initialization when DOM loads (will be called from app.js)
function initUI() {
    initElementsList();
    renderPagesList();
    renderElementsList();
    updatePreview();
}
