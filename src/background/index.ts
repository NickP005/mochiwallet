// Listen for installation
console.log('Background script loaded');
console.log(chrome.runtime)

// Check if we're in a Chrome extension context
if (typeof chrome !== 'undefined' && chrome.runtime) {
  // Initialize storage and handle messages
  chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
    console.log('Received message:', message, 'from:', sender);

    if (message.type === 'OPEN_SIDE_PANEL' && chrome.sidePanel) {

      chrome.sidePanel.open({ tabId: message.tabId })
        .then(() => {
          console.log('Side panel opened successfully');
          chrome.storage.local.set({ viewMode: 'panel' })
          sendResponse({ success: true });
        })
        .catch((error) => {
          console.error('Failed to open side panel:', error);
          sendResponse({ success: false, error: error.message });
        });
      return true; // Keep the message channel open
    }

    // For other message types
    return false; // Don't keep the message channel open
  });

  chrome.runtime.onConnect.addListener(function (port) {
    if (port.name === 'mochimo_side_panel') {
      port.onDisconnect.addListener(async () => {
        console.log('Sidepanel closed.');
        const currViewMode = await chrome.storage.local.get('viewMode')
        if (currViewMode.viewMode === 'panel') {
          chrome.storage.local.set({ viewMode: 'popup' })
        }
      });
    }
  });

  // Example of a background task
  async function initializeWallet() {
    try {
      // Check if wallet exists in storage
      const data = await chrome.storage.local.get('wallet');
      if (!data.wallet) {
        console.log('No wallet found');
        // Initialize wallet logic here
      }
    } catch (error) {
      console.error('Error initializing wallet:', error);
    }
  }



  // Run initialization
  initializeWallet();
}

// Export empty object to make this a module
export {}
