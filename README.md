
# zbatch
zbatch is a [Zotero 6](http://www.zotero.org) bootstrap plugin that enables batch editing a field across all items currently selected in the item pane.

> **Warning: Use at your own risk!**
Back up your database before using zbatch. Batch editing can potentially clobber data across many items at once if unexpected behavior occurs.

# Installing zbatch

Download the release xpi file and install using Zotero's native `Tools -> Add-Ons` menu.

### Building zbatch.xpi yourself

The zbatch source code within the `addon` folder simply needs to be put in a Zip file with extension `xpi` to be installed using Zotero's Add-Ons interface. I have provided a Windows batch script `build.bat` to achieve this. On other platforms, simply use a Zip utility to do the same (e.g., linux `zip` utility). 

# Using zbatch

zbatch inserts a new submenu into the item pane context menu. Currently supported options are:

 - **Clear the `Extra` field of all selected items**
Equivalent to editing the `Extra` field and replacing it with an empty string.
 
 - **Edit any one common field across selected items**
Replace a single field that is common across all selected items with a user-defined string. The string may contain one or more substitutions in the form `${field_name}`, which sources the requested field individually for each item. All substitutions will be validated and prompted for acceptance before performing the edit.

# Examples
### Clear  the `Extra` field of two items

 1. Select both items in the Item Pane
 2. Right-click -> `zbatch Operations` -> `Clear "Extra" Field`

### Concatenate several fields into `Extra`

 1. Select all desired items in the Item Pane
 2. Right-lick -> `zbatch Operations` -> `Edit Field...`
 3. Select the target field (e.g., `extra`) in the dropdown field selection menu.
 4. Enter the desired replacement string (e.g., `title: ${title}; date: ${date}`)
 5. Press the `Preview` button to validate the string and preview any expected changes.
 6. Press `Accept` to confirm the edit or `Cancel` to stop.
