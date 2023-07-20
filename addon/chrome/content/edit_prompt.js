function log(debug_string) {
    window.arguments[0]["zotero"].debug("[ZBATCH] " + debug_string);
}

var edit_prompt = {
    onload : function()
    {
        var data = window.arguments[0];
        var zot = data["zotero"];
        log("onload() called");

        // find all fields that selected items have in common
        var valid_fields = [];
        var selected_items = zot.getActiveZoteroPane().getSelectedItems() || [];
        for(const item of selected_items) {
            var item_fields = zot.ItemFields.getItemTypeFields(item.itemTypeID);
            log(`fields for item ${item.getField("title")}: ${item_fields}`);
            valid_fields.push(item_fields);
        }
        var common_field_ids = valid_fields.reduce((a, b) => a.filter(ele => b.includes(ele)));
        common_fields = common_field_ids.map(a => zot.ItemFields.getName(a));

        if(common_fields.length == 0) {
            log("[ERROR] no common fields found");
            common_fields.push("[ERROR] no common fields found");
        } else {
            log(`common fields: ${common_fields}`);
        }
    
        // insert menuitems for each field that all selected items have in common
        var menupopup = document.getElementById('zbatch-edit-field-selector-menupopup')
        for(const menuitem_name of common_fields) {
            var menuitem = document.createElement('menuitem');
            var menuitem_xul_id = `zbatch-edit-field-selector-menuitem-${menuitem_name}-id`;
            menuitem.setAttribute('id', menuitem_xul_id);
            menuitem.setAttribute('label', `${menuitem_name}`)
            
            // add the new menuitem to the submenu
            menupopup.appendChild(menuitem);
        }

        var preview_button = document.getElementById("zbatch-edit-preview-button");
        preview_button.addEventListener('command', edit_prompt.on_preview, false);
        
        return true;
    },

    on_menulist_changed : function(event) 
    {
        var data = window.arguments[0];
        data["field name"] = event.target.label;
        log(`menulist changed to item: ${data["field name"]}`);
    },

    // main worker function that calculates the new field value from the user-defined substitution string
    // returns a preview of the substitutions that will be made
    populate_item_updates : function() 
    {
        var data = window.arguments[0];
        var zot = data["zotero"];
        var field_name = data["field name"];

        if(field_name == "") {
            alert("No field selected!");
            return "";
        }

        // obtain the current value of the update string to apply
        var edit_textbox = document.getElementById("zbatch-edit-textbox");
        var subst_string = edit_textbox.value;
        
        // apply the substitution string to each item in turn
        data["item updates"] = {}; // reset
        var selected_items = zot.getActiveZoteroPane().getSelectedItems() || [];
        var preview_text = `Updating field: "${field_name}" on ${selected_items.length} items using replacement \"${subst_string}\":\n`;
        for(const item of selected_items) {
            preview_text += `> ${item.getField("title")}\n`;
            
            var original = item.getField(field_name);
            var result = edit_prompt.apply_subst_string(item, subst_string, field_name);
            if(result["success"]) {
                preview_text += `    - "${original}" -> "${result["message"]}"\n`;
            } else {
                alert(`Error in applying the substitution string: "${result["message"]}"\n`);
                return "";
            }

            // set the return data so that the main zbatch instance can apply the edits to the Zotero database
            data["item updates"][item.id] = result["message"];
        }

        return preview_text.slice(0, -1);
    },

    // iterate through the substitution string to replace ${field_name} instances with their corresponding data
    apply_subst_string : function(item, str, field_name)
    {
        var data = window.arguments[0];
        var zot = data["zotero"];

        var out_str = "";
        var src_ptr = 0;
        
        let match;
        const regexp = /\${[a-zA-Z]+}/g;
        while((match = regexp.exec(str)) !== null) {
            var matched_str = match[0];

            if(matched_str.length <= 3) {
                return {"success" : false, "message" : `Field designation "${matched_str}" is invalid`};
            } 
            var matched_field_name = matched_str.slice(2, -1);
            if(!zot.ItemFields.isValidForType(matched_field_name, item.itemTypeID)) {
                return {"success" : false, "message" : `Invalid field name "${matched_field_name}" for item with title "${item.getField("title")}"`};
            }
            
            var src_start_idx = match.index;
            out_str += str.slice(src_ptr, src_start_idx);
            out_str += item.getField(matched_field_name); // might actually be empty
            src_ptr = src_start_idx + matched_str.length;
        }
        out_str += str.slice(src_ptr, str.length);

        return {"success" : true, "message" : out_str};
    },

    on_preview : function() {
        var preview_text = edit_prompt.populate_item_updates();
        if(preview_text.length > 0) {
            var ps = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
                .getService(Components.interfaces.nsIPromptService);
            ps.alert(null, "Preview of Edit", "Preview of expected changes:\n" + preview_text);
        }
    },

    on_accept : function()
    {
        var data = window.arguments[0];    
        
        // run a preview and confirm the changes
        var preview_text = edit_prompt.populate_item_updates();
        if(preview_text.length == 0) {
            log(`auto reject when preview text is empty`);
            data["accepted"] = false;
            return false;        
        }

        var ps = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
			.getService(Components.interfaces.nsIPromptService);
        var confirmed = ps.confirm(null, "Confirm Edit", "Confirm the following edit:\n" + preview_text);
        
        if(confirmed) {
            log(`dialog accepted`);
            data["accepted"] = true;
            return true;
        } else {
            log(`acceptance cancelled`);
            data["accepted"] = false;
            return false;
        }
    },

    on_cancel : function()
    {
        var data = window.arguments[0];    
        
        log("dialog cancelled");
        data["accepted"] = false;
        return true;
    }
};