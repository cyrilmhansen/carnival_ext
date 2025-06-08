// background.js (modified)
console.log("Background script loaded.");

chrome.runtime.onInstalled.addListener(() => {
  console.log("Extension installed.");
  chrome.contextMenus.create({
    id: "fill-form-with-identity",
    title: "Fill Form with Identity",
    contexts: ["page"]
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "fill-form-with-identity" && tab.id) {
    // Retrieve the first stored identity from chrome.storage.sync
    chrome.storage.sync.get({ identities: [] }, (result) => {
      if (chrome.runtime.lastError) {
        console.error("Error retrieving identities from sync storage for context menu:", chrome.runtime.lastError);
        // Notify the user or log appropriately
        return;
      }
      if (result.identities && result.identities.length > 0) {
        const identityToUse = result.identities[0]; // Use the first identity
        chrome.tabs.sendMessage(tab.id, {
          action: "fill_form_from_context_menu",
          data: identityToUse
        }, (response) => {
          if (chrome.runtime.lastError) {
            console.warn("Could not send message to content script:", chrome.runtime.lastError.message);
          } else if (response) {
            console.log("Form fill response:", response.message || response.status);
          } else {
            console.warn("Content script did not send a response.");
          }
        });
      } else {
        console.warn("No identities stored in sync storage to fill the form.");
        // Optionally notify user (e.g. via chrome.notifications)
      }
    });
  }
});

// Listen for messages from popup (e.g., if popup needs to tell background to refresh something)
// This specific listener might not be strictly necessary for identity sync using chrome.storage.sync
// but good to have if other interactions are needed.
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "get_identities") { // Example: if popup ever asks background for identities
    chrome.storage.sync.get({ identities: [] }, (result) => {
      if (chrome.runtime.lastError) {
        console.error("Error getting identities in background:", chrome.runtime.lastError);
        sendResponse({ error: chrome.runtime.lastError.message });
        return;
      }
      sendResponse({ identities: result.identities });
    });
    return true; // Indicates that the response is sent asynchronously
  }
});
