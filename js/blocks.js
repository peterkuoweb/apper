// js/blocks.js

Blockly.defineBlocksWithJsonArray([
    // --- UI Interaction ---
    {
        "type": "on_event",
        "message0": "當元素 %1 被 %2 時",
        "args0": [
            {
                "type": "field_dropdown",
                "name": "ELEMENT_ID",
                "options": [["選擇元素", "none"]]
            },
            {
                "type": "field_dropdown",
                "name": "EVENT_TYPE",
                "options": [
                    ["點擊 (Click)", "click"],
                    ["改變 (Change)", "change"],
                    ["滑鼠移入 (Mouseenter)", "mouseenter"],
                    ["滑鼠移出 (Mouseleave)", "mouseleave"]
                ]
            }
        ],
        "message1": "執行 %1",
        "args1": [
            {
                "type": "input_statement",
                "name": "DO"
            }
        ],
        "colour": 230,
        "tooltip": "為指定的元素添加事件監聽器",
        "helpUrl": ""
    },
    {
        "type": "set_property",
        "message0": "設定元素 %1 的 %2 為 %3",
        "args0": [
            {
                "type": "field_dropdown",
                "name": "ELEMENT_ID",
                "options": [["選擇元素", "none"]]
            },
            {
                "type": "field_dropdown",
                "name": "PROPERTY",
                "options": [
                    ["內容 (textContent)", "textContent"],
                    ["輸入值 (value)", "value"],
                    ["樣式 (style)", "style"],
                    ["圖片來源 (src)", "src"]
                ]
            },
            {
                "type": "input_value",
                "name": "VALUE"
            }
        ],
        "previousStatement": null,
        "nextStatement": null,
        "colour": 230,
        "tooltip": "改變元素的屬性",
        "helpUrl": ""
    },
    {
        "type": "get_property",
        "message0": "取得元素 %1 的 %2",
        "args0": [
            {
                "type": "field_dropdown",
                "name": "ELEMENT_ID",
                "options": [["選擇元素", "none"]]
            },
            {
                "type": "field_dropdown",
                "name": "PROPERTY",
                "options": [
                    ["內容 (textContent)", "textContent"],
                    ["輸入值 (value)", "value"],
                    ["樣式 (style)", "style"],
                    ["圖片來源 (src)", "src"]
                ]
            }
        ],
        "output": null,
        "colour": 230,
        "tooltip": "讀取元素的屬性",
        "helpUrl": ""
    },

    // --- Page Control ---
    {
        "type": "navigate_to_page",
        "message0": "前往頁面 %1",
        "args0": [
            {
                "type": "field_dropdown",
                "name": "PAGE_ID",
                "options": [["選擇頁面", "none"]]
            }
        ],
        "message1": "傳送資料 %1",
        "args1": [
            {
                "type": "input_value",
                "name": "DATA"
            }
        ],
        "previousStatement": null,
        "nextStatement": null,
        "colour": 160,
        "tooltip": "切換到另一個頁面並可選擇傳遞資料",
        "helpUrl": ""
    },
    {
        "type": "get_page_data",
        "message0": "取得傳入頁面的資料",
        "output": null,
        "colour": 160,
        "tooltip": "取得導航到此頁面時傳入的資料",
        "helpUrl": ""
    },
    {
        "type": "open_url",
        "message0": "開啟超連結 %1",
        "args0": [
            {
                "type": "input_value",
                "name": "URL",
                "check": "String"
            }
        ],
        "previousStatement": null,
        "nextStatement": null,
        "colour": 160,
        "tooltip": "在瀏覽器中開啟指定的網址",
        "helpUrl": ""
    }
]);

// Dynamic dropdown functions

Blockly.Extensions.register('dynamic_element_dropdown', function() {
  this.getInput('dummy_input_for_extension_do_not_use'); // Dummy, the extension is registered to mutate existing fields
});

// Since Blockly defines dropdowns at creation, we'll update them dynamically via a custom function
function updateDynamicBlocks() {
    if(!workspace) return;

    // Build options list for elements
    let elementOptions = [["選擇元素", "none"]];
    const currentPage = getCurrentPage();
    if (currentPage && currentPage.elements.length > 0) {
        elementOptions = currentPage.elements.map(el => [`${el.name} (${el.type})`, el.id]);
    }

    // Build options list for pages
    let pageOptions = [["選擇頁面", "none"]];
    if (apperState.pages.length > 0) {
        pageOptions = apperState.pages.map(p => [p.name, p.id]);
    }

    // Iterate through all blocks in workspace and update dropdowns
    const blocks = workspace.getAllBlocks(false);
    blocks.forEach(block => {
        if (['on_event', 'set_property', 'get_property'].includes(block.type)) {
            const field = block.getField('ELEMENT_ID');
            if (field) {
                const currentValue = field.getValue();
                field.menuGenerator_ = elementOptions;

                // Keep the current value if it still exists, otherwise reset to 'none'
                const valueExists = elementOptions.some(opt => opt[1] === currentValue);
                if (!valueExists && currentValue !== 'none') {
                    field.setValue('none');
                } else {
                     // Force re-render of text by setting value to itself
                    field.setValue(currentValue);
                }
            }
        }

        if (block.type === 'navigate_to_page') {
             const field = block.getField('PAGE_ID');
            if (field) {
                const currentValue = field.getValue();
                field.menuGenerator_ = pageOptions;

                const valueExists = pageOptions.some(opt => opt[1] === currentValue);
                if (!valueExists && currentValue !== 'none') {
                    field.setValue('none');
                } else {
                    field.setValue(currentValue);
                }
            }
        }
    });
}

// Ensure the extension is called when blocks are created by overriding init for these blocks dynamically
['on_event', 'set_property', 'get_property'].forEach(type => {
    const originalInit = Blockly.Blocks[type].init;
    Blockly.Blocks[type].init = function() {
        if (originalInit) originalInit.call(this);
        // We set the menuGenerator dynamically here as well for new blocks
        const field = this.getField('ELEMENT_ID');
        if(field) {
             field.menuGenerator_ = function() {
                 const currentPage = getCurrentPage();
                 if (currentPage && currentPage.elements.length > 0) {
                     return currentPage.elements.map(el => [`${el.name} (${el.type})`, el.id]);
                 }
                 return [["選擇元素", "none"]];
             };
        }
    };
});

const origNavInit = Blockly.Blocks['navigate_to_page'].init;
Blockly.Blocks['navigate_to_page'].init = function() {
     if (origNavInit) origNavInit.call(this);
     const field = this.getField('PAGE_ID');
     if(field) {
         field.menuGenerator_ = function() {
              if (apperState.pages.length > 0) {
                 return apperState.pages.map(p => [p.name, p.id]);
             }
             return [["選擇頁面", "none"]];
         };
     }
}


// --- Generators ---

javascript.javascriptGenerator.forBlock['on_event'] = function(block, generator) {
    const elementId = block.getFieldValue('ELEMENT_ID');
    const eventType = block.getFieldValue('EVENT_TYPE');
    const statements_do = generator.statementToCode(block, 'DO');

    if (elementId === 'none') return '';

    return `document.getElementById('${elementId}').addEventListener('${eventType}', function(event) {\n${statements_do}});\n`;
};

javascript.javascriptGenerator.forBlock['set_property'] = function(block, generator) {
    const elementId = block.getFieldValue('ELEMENT_ID');
    const property = block.getFieldValue('PROPERTY');
    const value = generator.valueToCode(block, 'VALUE', javascript.Order.ASSIGNMENT) || "''";

    if (elementId === 'none') return '';

    if (property === 'style') {
        return `document.getElementById('${elementId}').style.cssText = ${value};\n`;
    } else {
        return `document.getElementById('${elementId}').${property} = ${value};\n`;
    }
};

javascript.javascriptGenerator.forBlock['get_property'] = function(block, generator) {
    const elementId = block.getFieldValue('ELEMENT_ID');
    const property = block.getFieldValue('PROPERTY');

    if (elementId === 'none') return ['null', javascript.Order.ATOMIC];

    let code = `document.getElementById('${elementId}').${property}`;
    if(property === 'style') {
        code = `document.getElementById('${elementId}').style.cssText`;
    }

    return [code, javascript.Order.MEMBER];
};

javascript.javascriptGenerator.forBlock['navigate_to_page'] = function(block, generator) {
    const pageId = block.getFieldValue('PAGE_ID');
    const data = generator.valueToCode(block, 'DATA', javascript.Order.ASSIGNMENT) || 'null';

    if (pageId === 'none') return '';

    return `window.navigateToPage('${pageId}', ${data});\n`;
};

javascript.javascriptGenerator.forBlock['get_page_data'] = function(block, generator) {
    return ['window.getPageData()', javascript.Order.FUNCTION_CALL];
};

javascript.javascriptGenerator.forBlock['open_url'] = function(block, generator) {
    const url = generator.valueToCode(block, 'URL', javascript.Order.NONE) || "''";
    return `window.open(${url}, '_blank');\n`;
};
