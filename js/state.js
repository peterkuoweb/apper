// js/state.js

// Global state for the Apper project
const apperState = {
    pages: [],
    currentPageId: null,
    elementCounter: 0,
    pageCounter: 0,
    dataContext: {}, // Used for passing data between pages
};

// Initialize the first page
function initAppState() {
    addPage("首頁");
    apperState.currentPageId = apperState.pages[0].id;
}

// Page Management
function addPage(name) {
    apperState.pageCounter++;
    const pageId = `page_${apperState.pageCounter}`;
    const newPage = {
        id: pageId,
        name: name || `頁面 ${apperState.pageCounter}`,
        elements: [], // Array of element objects
        workspaceXml: null // Blockly workspace state string
    };
    apperState.pages.push(newPage);
    return pageId;
}

function getPage(id) {
    return apperState.pages.find(p => p.id === id);
}

function getCurrentPage() {
    return getPage(apperState.currentPageId);
}

// Element Management
function addElementToCurrentPage(type) {
    apperState.elementCounter++;
    const elementId = `elem_${apperState.elementCounter}`;

    // Default properties based on type
    const defaultProps = {
        id: elementId,
        type: type,
        name: `${type}_${apperState.elementCounter}`,
        content: '',
        style: '',
        attributes: {}
    };

    switch(type) {
        case 'div':
            defaultProps.content = '區塊';
            defaultProps.style = 'padding: 10px; border: 1px solid #ccc; background-color: #f9f9f9; width: 100%;';
            break;
        case 'button':
            defaultProps.content = '按鈕';
            defaultProps.style = 'padding: 8px 16px; margin: 4px; background-color: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer;';
            break;
        case 'text':
            defaultProps.content = '文字內容';
            defaultProps.style = 'margin: 4px 0; font-size: 16px;';
            break;
        case 'input':
            defaultProps.style = 'padding: 8px; margin: 4px; border: 1px solid #ccc; border-radius: 4px; width: calc(100% - 16px);';
            defaultProps.attributes.placeholder = '請輸入內容';
            break;
        case 'img':
            defaultProps.attributes.src = 'https://via.placeholder.com/150';
            defaultProps.style = 'max-width: 100%; height: auto; display: block;';
            break;
        case 'spacer':
            defaultProps.style = 'height: 50px; width: 100%;';
            defaultProps.content = ''; // Empty for spacer
            break;
        case 'link':
            defaultProps.content = '超連結';
            defaultProps.attributes.href = '#';
            defaultProps.style = 'color: #0066cc; text-decoration: underline; cursor: pointer; display: inline-block; margin: 4px;';
            break;
    }

    const currentPage = getCurrentPage();
    if (currentPage) {
        currentPage.elements.push(defaultProps);
    }
    return defaultProps;
}

function removeElement(id) {
    const page = getCurrentPage();
    if (page) {
        page.elements = page.elements.filter(e => e.id !== id);
    }
}

function updateElementContent(id, content) {
    const page = getCurrentPage();
    if(page) {
        const el = page.elements.find(e => e.id === id);
        if(el) el.content = content;
    }
}

// Reorder elements
function reorderElements(oldIndex, newIndex) {
    const page = getCurrentPage();
    if (page) {
        const elements = page.elements;
        if (oldIndex >= 0 && oldIndex < elements.length && newIndex >= 0 && newIndex < elements.length) {
            const [movedElement] = elements.splice(oldIndex, 1);
            elements.splice(newIndex, 0, movedElement);
        }
    }
}
