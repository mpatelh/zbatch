const {utils: Cu} = Components;

/*
 * The Zotero initialization code is taken from the Zotero official Make It Red example v1.2
 * https://github.com/zotero/make-it-red/blob/main/src-1.2/bootstrap.js
 */
if (typeof Zotero == "undefined") {
    var Zotero;
}

var zbatch_instance;

function log(text) {
    Zotero.debug("[ZBATCH] " + text);
}

// In Zotero 6, bootstrap methods are called before Zotero is initialized, and using include.js
// to get the Zotero XPCOM service would risk breaking Zotero startup. Instead, wait for the main
// Zotero window to open and get the Zotero object from there.
//
// In Zotero 7, bootstrap methods are not called until Zotero is initialized, and the 'Zotero' is
// automatically made available.
async function waitForZotero() {
	if (typeof Zotero != 'undefined') {
		await Zotero.initializationPromise;
		return;
	}
	
	var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
	var windows = Services.wm.getEnumerator('navigator:browser');
	var found = false;
	while (windows.hasMoreElements()) {
		let win = windows.getNext();
		if (win.Zotero) {
			Zotero = win.Zotero;
			found = true;
			break;
		}
	}
	if (!found) {
		await new Promise((resolve) => {
			var listener = {
				onOpenWindow: function (aWindow) {
					// Wait for the window to finish loading
					let domWindow = aWindow.QueryInterface(Ci.nsIInterfaceRequestor)
						.getInterface(Ci.nsIDOMWindowInternal || Ci.nsIDOMWindow);
					domWindow.addEventListener("load", function () {
						domWindow.removeEventListener("load", arguments.callee, false);
						if (domWindow.Zotero) {
							Services.wm.removeListener(listener);
							Zotero = domWindow.Zotero;
							resolve();
						}
					}, false);
				}
			};
			Services.wm.addListener(listener);
		});
	}
	await Zotero.initializationPromise;
}

/*
 * the four basic functions for a Bootstrap plugin
 */
async function startup({ id, version, resourceURI, rootURI }, reason) {
    await waitForZotero();
    Zotero.debug("[ZBATCH] startup() called - version: " + Zotero.platformMajorVersion);
    
    Cu.import("chrome://zbatch/content/index.jsm");
    zbatch_instance = new zbatch(Zotero);
    zbatch_instance.init();
}

function shutdown({ id, version, resourceURI, rootURI }, reason) {
    Zotero.debug("[ZBATCH] shutdown() called");
    zbatch_instance.fini();
    Cu.unload(`${rootURI}/src/index.js`);
}

function install(data, reason) {}

function uninstall(data, reason) {}  