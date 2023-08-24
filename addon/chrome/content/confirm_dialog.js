function log(debug_string) {
    window.arguments[0]["zotero"].debug("[ZBATCH] " + debug_string);
}

var confirm_dialog = {
    on_load : function () {
        log("confirm_dialog.on_load() called");
        var preview_text = window.arguments[0]["text"]
        
        var textarea = document.getElementById("zbatch-confirm-dialog-text")
        textarea.value = preview_text;
        return true;
    },

    on_ok : function() {
        log("confirm_dialog.on_ok() called");
        window.arguments[0]["accepted"] = true
        return true;
    },

    on_cancel : function()
    {
        log("confirm_dialog.on_cancel() called");
        window.arguments[0]["accepted"] = false
        return true;
    }
};