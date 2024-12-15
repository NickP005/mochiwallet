import browser from 'webextension-polyfill';

// Listen for installation
browser.runtime.onInstalled.addListener((): void => {
  console.log('Extension installed');
});

// Listen for messages from the popup
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Received message:', message, 'from:', sender);
  // Handle different message types here
  sendResponse({ received: true });
  return true; // Keep the message channel open for async responses
});

// Example of a background task
async function initializeWallet() {
  try {
    // Check if wallet exists in storage
    const data = await browser.storage.local.get('wallet');
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