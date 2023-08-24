function log(debug_string) {
    window.arguments[0]["zotero"].debug("[ZBATCH] " + debug_string);
}

var edit_prompt = {
    onload : function()
    {
        var data = window.arguments[0];
        var zot = data["zotero"];
        log("edit_prompt.onload() called");

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

    // returns the index of the matching brace, accounting for escape sequences
    // e.g. "{l:\\\\\\{}st}lo" -> 7
    // e.g. "{l:\\\\{}st}lo" -> 9
    // e.g. "{l:\\{}st}lo" -> 5
    // e.g. "{l:{}st}lo" -> 7
    find_matching_brace : function(str) {
        if (str.length == 0 || str.charAt(0) != '{') {
            return -1;
        }

        var stack = [];
        var escaped = false;
        for (var i = 0; i < str.length; i++) {
            var c = str.charAt(i);
            
            // for the current charcter
            if (!escaped) {
                if (c === '{')
                    stack.push(i);
                else if (c === '}')
                    stack.pop();
            }

            if (stack.length == 0)
                return i;

            // for the next character
            if (escaped == false && c === '\\')
                escaped = true;
            else
                escaped = false;
        }

        return -1;
    },

    // iterate through the substitution string to replace ${field_name} instances with their corresponding data
    apply_subst_string : function(item, str, field_name)
    {
        var data = window.arguments[0];
        var zot = data["zotero"];

        var out_str = "";
        var src_ptr = 0;
        
        var match_start;
        while((match_start = str.slice(src_ptr).indexOf("\${")) !== -1) {
            var matching_brace_end = this.find_matching_brace(str.slice(match_start + 1))
            if(matching_brace_end <= 0) {
                return {"success" : false, "message" : `Unmatched brace starting at "${str.slice(match_start)}"`};
            }

            // get the field token
            var match_end = match_start + matching_brace_end + 1; // include the end brace
            var matched_str = str.slice(match_start, match_end + 1); // includes start and end braces
            if(matched_str.length <= 3) {
                return {"success" : false, "message" : `Field designation "${matched_str}" is empty`};
            } 

            // parse the field token
            var matched_field_colon_idx = matched_str.indexOf(':');
            var matched_field_name = matched_field_colon_idx == -1 ? matched_str : matched_str.slice(0, matched_field_colon_idx);
            var matched_field_regex = matched_field_colon_idx == -1 ? "" : matched_str.slice(matched_field_colon_idx + 1);
            if(!zot.ItemFields.isValidForType(matched_field_name, item.itemTypeID)) {
                return {"success" : false, "message" : `Invalid field name "${matched_field_name}" for item with title "${item.getField("title")}"`};
            }

            // get the field data and transform it according to the regex, if needed
            var field_data = item.getField(matched_field_name);
            if(matched_field_regex.length <= 0) { 
                return {"success" : false, "message" : `Empty regex "${matched_field_regex}" for item with title "${item.getField("title")}"`};
            } else {
                var regex;
                try {
                    regex = new RegExp(matched_field_regex);
                }
                catch(e) {
                    return {"success" : false, "message" : `Invalid regex "${matched_field_regex}" for item with title "${item.getField("title")}"`};
                }

                try {
                    field_data = field_data.replace(field_data, );
                }
                catch (e) {
                    return {"success" : false, "message" : `Failed to apply regex: "${matched_field_regex}" to field: "${matched_field_name}" with field data: "${field_data}" for item with title "${item.getField("title")}"`};
                }                
            }
            
            // update the output string
            out_str += str.slice(src_ptr, match_start);
            out_str += field_data; // might actually be empty
            src_ptr = match_end + 1;
        }
        out_str += str.slice(src_ptr, str.length);

        return {"success" : true, "message" : out_str};
    },

    on_preview : function() {
        var preview_text = edit_prompt.populate_item_updates();
        if(preview_text.length > 0) {
            // var ps = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
            //     .getService(Components.interfaces.nsIPromptService);
            // ps.alert(null, "Preview of Edit", "Preview of expected changes:\n" + preview_text);
            edit_prompt.show_confirm_dialog(preview_text)
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

        var accepted = edit_prompt.show_confirm_dialog(preview_text)
        if (accepted) {
            log(`dialog accepted`);
            data["accepted"] = true;
            return true;        
        } else {
            log(`acceptance cancelled`);
            data["accepted"] = false;
            return false;
        }


        // var ps = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
		// 	.getService(Components.interfaces.nsIPromptService);
        // var confirmed = ps.confirm(null, "Confirm Edit", "Confirm the following edit:\n" + preview_text);
        
        // if(confirmed) {
        //     log(`dialog accepted`);
        //     data["accepted"] = true;
        //     return true;
        // } else {
        //     log(`acceptance cancelled`);
        //     data["accepted"] = false;
        //     return false;
        // }
    },

    show_confirm_dialog: function(preview_text) {
        var params = {
              "zotero" : window.arguments[0]["zotero"]
            , "text" : preview_text
            , "accepted" : null
        };

        window.openDialog("chrome://zbatch/content/confirm_dialog.xul",
             "confirm-dialog", 
             "centerscreen,chrome,modal", 
             params).focus();
        return params["accepted"]
    },

    on_cancel : function()
    {
        var data = window.arguments[0];    
        
        log("dialog cancelled");
        data["accepted"] = false;
        return true;
    }
};