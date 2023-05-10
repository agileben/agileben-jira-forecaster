function addButton(selector) {
    const targetElement = document.querySelector(selector);
  
    if (targetElement) {
      const button = document.createElement('li');
      button.textContent = 'Analyse';
      button.style.cursor = 'pointer';
      button.style.padding = '4px 10px';
      button.style.lineHeight = '24px';
      button.style.backgroundColor = 'yellow';
  
      button.addEventListener('click', () => {
        console.log('Button clicked, sending message to open tab');
        chrome.runtime.sendMessage({ action: 'open_tab', current_tab: window.location.href });
      });
      
      
  
      if (targetElement.nextElementSibling) {
        targetElement.parentNode.insertBefore(button, targetElement.nextElementSibling);
      } else {
        targetElement.parentNode.appendChild(button);
      }
    } else {
      console.error('Target element not found');
    }
  }
  
  
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('content.js received message: ' + request.action);
    if (request.action === 'get_csv_url') {
      const jiraExportTriggerElement = document.querySelector('#jira-export-trigger');
      if (jiraExportTriggerElement) {
        jiraExportTriggerElement.click();
  
        setTimeout(() => {
          const currentCsvFieldsElement = document.querySelector('#currentCsvFields');
          if (currentCsvFieldsElement) {
            sendResponse({ csvUrl: currentCsvFieldsElement.href });
          } else {
            console.error('Element with ID #currentCsvFields not found');
          }
        }, 500);
      } else {
        console.error('Element with ID #jira-export-trigger not found');
      }
    }
  
    return true; // Required to use sendResponse asynchronously
  });
  
  const selector = 'ul.operations > li:nth-of-type(6)';
  addButton(selector);
  