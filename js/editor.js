// js/editor.js

let workspace;

function initBlockly() {
    const blocklyArea = document.getElementById('blocklyArea');
    const blocklyDiv = document.getElementById('blocklyDiv');

    const toolbox = {
        "kind": "categoryToolbox",
        "contents": [
            {
                "kind": "category",
                "name": "邏輯",
                "colour": "%{BKY_LOGIC_HUE}",
                "contents": [
                    { "kind": "block", "type": "controls_if" },
                    { "kind": "block", "type": "logic_compare" },
                    { "kind": "block", "type": "logic_operation" },
                    { "kind": "block", "type": "logic_negate" },
                    { "kind": "block", "type": "logic_boolean" }
                ]
            },
            {
                "kind": "category",
                "name": "迴圈",
                "colour": "%{BKY_LOOPS_HUE}",
                "contents": [
                    { "kind": "block", "type": "controls_repeat_ext" },
                    { "kind": "block", "type": "controls_whileUntil" }
                ]
            },
            {
                "kind": "category",
                "name": "數學",
                "colour": "%{BKY_MATH_HUE}",
                "contents": [
                    { "kind": "block", "type": "math_number" },
                    { "kind": "block", "type": "math_arithmetic" }
                ]
            },
            {
                "kind": "category",
                "name": "文字",
                "colour": "%{BKY_TEXTS_HUE}",
                "contents": [
                    { "kind": "block", "type": "text" },
                    { "kind": "block", "type": "text_print" }
                ]
            },
            {
                "kind": "category",
                "name": "Apper 變數",
                "colour": "330",
                "custom": "VARIABLE"
            },
            {
                "kind": "category",
                "name": "Apper UI 互動",
                "colour": "230",
                "contents": [
                    { "kind": "block", "type": "on_event" },
                    { "kind": "block", "type": "set_property" },
                    { "kind": "block", "type": "get_property" }
                ]
            },
            {
                "kind": "category",
                "name": "Apper 頁面控制",
                "colour": "160",
                "contents": [
                    { "kind": "block", "type": "navigate_to_page" },
                    { "kind": "block", "type": "get_page_data" },
                    { "kind": "block", "type": "open_url" }
                ]
            }
        ]
    };

    workspace = Blockly.inject(blocklyDiv, {
        toolbox: toolbox,
        scrollbars: true,
        trashcan: true,
        renderer: 'zelos', // Native Scratch 3.0 block renderer
        grid: {
            spacing: 20,
            length: 3,
            colour: '#ccc',
            snap: true
        },
        zoom: {
            controls: true,
            wheel: true,
            startScale: 1.0,
            maxScale: 3,
            minScale: 0.3,
            scaleSpeed: 1.2
        }
    });

    const onresize = function(e) {
        let element = blocklyArea;
        let x = 0;
        let y = 0;
        do {
            x += element.offsetLeft;
            y += element.offsetTop;
            element = element.offsetParent;
        } while (element);

        blocklyDiv.style.left = x + 'px';
        blocklyDiv.style.top = y + 'px';
        blocklyDiv.style.width = blocklyArea.offsetWidth + 'px';
        blocklyDiv.style.height = blocklyArea.offsetHeight + 'px';
        Blockly.svgResize(workspace);
    };
    window.addEventListener('resize', onresize, false);
    onresize();
    Blockly.svgResize(workspace);

    // Initial empty state
    saveWorkspaceState();
}

// Override ui.js dummy functions
window.saveWorkspaceState = function() {
    if (!workspace) return;
    const currentPage = getCurrentPage();
    if (currentPage) {
        const xml = Blockly.Xml.workspaceToDom(workspace);
        currentPage.workspaceXml = Blockly.Xml.domToText(xml);
    }
};

window.loadWorkspaceState = function() {
    if (!workspace) return;
    workspace.clear();
    const currentPage = getCurrentPage();
    if (currentPage && currentPage.workspaceXml) {
        const xml = Blockly.Xml.textToDom(currentPage.workspaceXml);
        Blockly.Xml.domToWorkspace(xml, workspace);
    }
};
