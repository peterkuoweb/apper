// js/app.js

// Initialize the application
window.onload = function() {
    initAppState();
    initBlockly();
    initUI();

    // Add initial blocks to the workspace (optional)

    // Start interval to keep dynamic dropdowns updated
    setInterval(() => {
        if(typeof updateDynamicBlocks === 'function') {
            updateDynamicBlocks();
        }
    }, 1000);
};
