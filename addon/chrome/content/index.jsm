'use strict'
var EXPORTED_SYMBOLS = ["zbatch", "g_zot"];

// const {classes: Cc, interfaces: Ci, utils: Cu} = Components;
// Cu.import('resource://gre/modules/Services.jsm');

var g_zot = "undefined";

function log(text) {
    if(g_zot !== "undefined") {
        g_zot.debug("[ZBATCH] " + text);
    }
}

// zbatch namespace
class zbatch {
    constructor(Zotero) {
        this.zot = Zotero;
        
        if(g_zot === "undefined") {
            g_zot = Zotero;
        }   
    }

    init() {
        log("initializing zbatch instance");
        this.win = this.zot.getMainWindow();
        this.pane = this.zot.getActiveZoteroPane();
        this.doc = this.win.document;
        this.add_menuitem();
    }

    fini() {
        log("terminating zbatch instance");
        this.remove_menuitem();
    }

    on_click(event) {
        event.stopPropagation();

        // target XUL element should have our monkey patched variable
        var xul_element = event.currentTarget;
        if(!xul_element.hasOwnProperty('zbatch_operation_name')) {
            log("ERROR: zbatch invoked with invalid currentTarget");    
            return;
        }

        var operation = event.currentTarget.zbatch_operation_name;
        log(`zbatch invoked with operation: ${operation}`);

        // execute the relevant operation
        if(operation == "Clear \"Extra\" Field") {
            var items = this.win.ZoteroPane.getSelectedItems() || [];
            var num_items = items.length;
            if(num_items > 0) {
                log(`Clearing \"Extra\" field of ${num_items} items`);
                for(const item of items) {
                    log("    > Updating item: " + item.getField('title'));
                    item.setField("extra", "");
                    item.saveTx();
                }
            }
        } else if(operation == "Edit Field...") {
            this.win.addEventListener("load", function() {
                this.log("Window loaded!");
            });

            var data = {
                  "zotero" : this.zot
                , "field name" : ""
                , "item updates" : {}
                , "accepted" : false
            };

            var zbatch_edit_dialog = this.win.openDialog("chrome://zbatch/content/edit_prompt.xul"
                , "edit-dialog"
                , "centerscreen,chrome,modal"
                , data);
            
            if(data["accepted"]) {
                log(`edit accepted with field: "${data["field name"]}"`);
                for (const [item_id, replacement] of Object.entries(data["item updates"])) {
                    var item = this.zot.Items.get(item_id);
                    log(`replacing item "${item.getField("title")}" field with: "${replacement}"`);
                    item.setField(data["field name"], replacement);
                    item.saveTx();
                }
            }
        } else {
            log(`ERROR: Unhandled operation: ${operation}`);
        }
    }

    add_menuitem() {
        log("adding zbatch menuitem...");
        
        var zbatch_separator = this.doc.createElement('menuseparator');
        var zbatch_separator_xul_id = "zbatch-itemmenu-separator";
        zbatch_separator.setAttribute('id', zbatch_separator_xul_id);

        var zbatch_submenu = this.doc.createElement('menu');
        var zbatch_submenu_xul_id = "zbatch-submenu-id";
        zbatch_submenu.setAttribute('id', zbatch_submenu_xul_id)
        zbatch_submenu.setAttribute('label', "zbatch Operations")

        var zbatch_submenu_popup = this.doc.createElement('menupopup');
        var zbatch_submenu_popup_xul_id = "zbatch-submenu-id";
        zbatch_submenu_popup.setAttribute('id', zbatch_submenu_popup_xul_id);
        zbatch_submenu.appendChild(zbatch_submenu_popup);

        for(const menuitem_name of ["Clear \"Extra\" Field", "Edit Field..."]) {
            var zbatch_menuitem = this.doc.createElement('menuitem');
            var zbatch_menuitem_xul_id = `zbatch-menuitem-${menuitem_name}-id`;
            zbatch_menuitem.setAttribute('id', zbatch_menuitem_xul_id);
            zbatch_menuitem.setAttribute('label', `${menuitem_name}`)
            zbatch_menuitem.addEventListener('command', this.on_click.bind(this), false);
            zbatch_menuitem.zbatch_operation_name = menuitem_name; // monkey patch the XUL element
            
            // add the new menuitem to the submenu
            zbatch_submenu_popup.appendChild(zbatch_menuitem);
        }

        // add the submenu to the main itemmenu with a separator
        var zoteroMenu = this.doc.getElementById(`zotero-itemmenu`);
        zoteroMenu.appendChild(zbatch_separator);
        zoteroMenu.appendChild(zbatch_submenu);

        log("...zbatch menuitem added");
    }

    remove_menuitem() {
        log("removing zbatch menuitem...");
        
        // remove the separator
        var zbatch_separator_xul_id = "zbatch-itemmenu-separator";
        var zbatch_separator = this.doc.getElementById(zbatch_separator_xul_id);
        zbatch_separator.parentNode.removeChild(zbatch_separator);
        
        // remove the submenu: its children will be GC'ed
        var zbatch_submenu_xul_id = "zbatch-submenu-id";
        var zbatch_submenu = this.doc.getElementById(zbatch_submenu_xul_id);
        zbatch_submenu.parentNode.removeChild(zbatch_submenu);

        log("...zbatch menuitem removed");
    }
}
  