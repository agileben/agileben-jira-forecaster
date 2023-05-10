console.log('background js loaded');

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('background.js received message: ' + request.action);
    console.log("sender: ", sender);
    if (request.action === 'open_tab') {
      chrome.tabs.create({ url: chrome.runtime.getURL('popup.html')+`?current_tab=${sender.tab.id}` });
    }
  });
  