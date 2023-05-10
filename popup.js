let data;

async function displayDataTable(csvUrl) {
    const response = await fetch(csvUrl);
    const csvText = await response.text();
    // console.log('recieved csv text: ' + csvText)
    // trim any empty last row from the csvText
    const trimmedCsvText = csvText.replace(/\n$/, '');

    parsedData = Papa.parse(trimmedCsvText, {
      header: true,
      dynamicTyping: true
    });
    

    const columns = parsedData.meta.fields.map((field) => ({ title: field, data: field }));
    function replaceDef(columns, newColumnDef) {
        const columnIndex = columns.findIndex(column => column.data === newColumnDef.data);
        
        if (columnIndex !== -1) {
          columns[columnIndex] = newColumnDef;
        }
      }
    replaceDef(columns, { title: 'Resolved', data: 'Resolved', type: 'date', dateFormat: 'DD/MMM/YYYY H:mm'  });
    replaceDef(columns, { title: 'Created', data: 'Created', type: 'date', dateFormat: 'D/MMM/YYYY H:mm' });
      

    // drop a list of unneeded columns
    const dropList = ['Issue id','Assignee Id','Components', 'Components'];
    columns.forEach((column, index) => {
        if (dropList.includes(column.title)) {
          columns.splice(index, 1);
        }
      });
    console.log('New columns: ', columns)


    data=parsedData.data;


    useData(data);


    $('#csvDataTable').DataTable({
      paging: true,
      searching: true,
      ordering: true,
      order: [[1, "asc"]], 
      data: parsedData.data,
      columns: columns,
      deferRender: true,
      pageLength: 10,
      buttons: [
        'copyHtml5',
        'excelHtml5',
        'csvHtml5',
        'pdfHtml5'
      ]

    });


 


  }
  console.log('popup js loaded')
  
  async function main() {
      const urlParams = new URLSearchParams(window.location.search);
      // get id from query string as a number
      const id = Number(urlParams.get('current_tab'));
      console.log('Tab selected: ' + id)
      console.log('Sending message to get csv url');
      if (chrome.tabs === undefined) {
        console.log('chrome.tabs is undefined opening local test file');
        displayDataTable('/test/test2.csv');
      } else {

        chrome.tabs.sendMessage(id, { action: 'get_csv_url' }, async (response) => {
          if (response && response.csvUrl) {
            console.log('Received csv url: ' + response.csvUrl);
            displayDataTable(response.csvUrl);
          }
        });
        console.log('Message sent');
      }
}
  
main(); // Call the main function


