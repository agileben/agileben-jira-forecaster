const pyodideWorker = new Worker("./worker.js");

const callbacks = {};

function plot(docs_json, id) {
  // convert docs_json string to an object
  console.log("client plot with div", id);
  docs_json = JSON.parse(docs_json);
  const container = document.getElementById(id);
  const plotDiv = document.createElement("div");
  plotDiv.setAttribute("id", docs_json.root_id);
  container.appendChild(plotDiv);
  let attempts = 0;
  const timer = setInterval(function () {
    if (window.Bokeh !== undefined) {
      clearInterval(timer);
      console.log(
        "Bokeh is defined, embedding plot ",
        docs_json.root_id,
        " in div ",
        id
      );
      window.Bokeh.embed.embed_item(docs_json, docs_json.root_id);
    } else {
      attempts++;
      if (attempts > 100) {
        clearInterval(timer);
        console.log(
          "Bokeh: ERROR: Unable to run BokehJS code because BokehJS library is missing"
        );
      }
    }
  }, 10);
}

function heading(title, subtitle, id) {
  const container = document.getElementById(id);
  const plotDiv = document.createElement("div");
  plotDiv.innerHTML = `<h1>${title}</h1><p>${subtitle}</p>`;
  container.appendChild(plotDiv);
}

function showTable(data, id) {
  const container = document.getElementById(id);
  const tableDiv = document.createElement("div");
  tableDiv.innerHTML = `${data}`;
  container.appendChild(tableDiv);
  const table = tableDiv.getElementsByTagName("table")[0];
  table.id = 'datatable';
  table.classList.add('compact');
  table.classList.add('display');
  table.classList.add('nowrap');
  
  $('#datatable').DataTable({
    paging: true,
    searching: true,
    ordering: true,
    order: [[1, "desc"]], 
    deferRender: true,
    pageLength: 10

  });
}

pyodideWorker.onmessage = (event) => {
  if (event.data.action === "heading") {
    // console.log('heading', event.data.heading, event.data.subheading, event.data.output)
    heading(event.data.heading, event.data.subheading, event.data.output);
    return;
  }

  if (event.data.action === "plot") {
    // console.log('plot', event.data.params, event.data.output)
    plot(event.data.params, event.data.output);
    return;
  }

  if (event.data.action === "table") {
    console.log('table', event.data.params, event.data.output)
    showTable(event.data.params, event.data.output);
    return;
  }


  //console.log("message from worker: ", event)
  if (event.data && event.data.message) {
    addMessage(event.data.message, "messages");
  } else {
    const { id, ...data } = event.data;
    const onSuccess = callbacks[id];
    delete callbacks[id];
    onSuccess(data);
  }
};

const asyncRun = (() => {
  let id = 0; // identify a Promise
  return (script, context) => {
    // the id could be generated more carefully
    id = (id + 1) % Number.MAX_SAFE_INTEGER;
    return new Promise((onSuccess) => {
      callbacks[id] = onSuccess;
      pyodideWorker.postMessage({
        ...context,
        python: script,
        id,
      });
    });
  };
})();

async function runFile(context, file) {
  console.log("Running: " + file);
  const script = await fetch("/" + file).then((response) => response.text());
  var outputDiv = await addTextArea(file, script, context);
  console.log("running ", file, "with output div ", outputDiv);
  var results = await runPy({ ...context, output: outputDiv }, script);
  addMessage(results, outputDiv);

  // await runPy(context, script);
}

async function runPy(context, script) {
  // console.log("Running: " + script);
  // console.log("Context", context);
  const { results, error } = await asyncRun(script, { ...context });
  if (results) {
    addMessage("results: " + results, context.output);
    return results;
  }
  if (error) {
    addMessage("error: " + error, context.output);
    console.error(error);
    return error;
  }
}

async function runAll() {
  getCSV()
}

async function loadData(csvUrl) {
  console.log("Loading data from ", csvUrl);
  const response = await fetch(csvUrl);
  const csvText = await response.text();
  console.log('csvText: ', csvText);
  // py.globals.set("json_data", JSON.stringify(data)); // Pass the serialized JavaScript data to the Python environment
  var context = {
    data: csvText,
  };
  await runFile(context, "1-setup.py");
  //await runFile({}, "test/test.py");
  await runFile({}, "2-map.py");
  await runFile({}, "3-issue_summary.py");
  await runFile({}, "4-simulation.py");
  await runFile({}, "5-histogram.py");
  await runFile({}, "6-burnup.py");
  await runFile({}, "7-open.py");
}

async function go() {
  // runPy({}, script);
  runAll();
}

async function addMessage(text, location) {
  const messages = document.getElementById(location);
  const li = document.createElement("div");
  li.textContent = text;
  messages.appendChild(li);
}

let divCounter = 0;

async function addTextArea(name, script, context) {
  const messages = document.getElementById("notebook");
  const outputId = "div-" + ++divCounter;

  // Create the elements using a template string
  const template = `
        <div class="bg-gray-100 rounded-md p-3">
        <details><summary><span class="">
        <span> ${name}</span>
        <span class="float-right ">
        <button id="button-${outputId}" class="bg-green-400 hover:bg-green-600 cursor-pointer p-1 rounded-md text-xs">Re-Run</button></span></span>
        </summary>
        <textarea class="p-1 w-full h-40 text-xs bg-slate-500 scroll-m-2 text-green-700 font-mono">${script}</textarea>
        </details></div>
        <div id="${outputId}"></div>
    `;

  // Append the new elements to the document
  messages.insertAdjacentHTML("beforeend", template);

  // Add the onclick event listener to the new button
  document.getElementById(`button-${outputId}`).onclick = (event) => {
    console.log("clicked run with div id: ", outputId);
    var results = runPy({ ...context, output: outputId }, script);
    addMessage(results, outputId);
  };

  return outputId;
}

async function getCSV() {
  const urlParams = new URLSearchParams(window.location.search);
  // get id from query string as a number
  const id = Number(urlParams.get('current_tab'));
  console.log('Got current tab from query params: ' + id)
  console.log('Sending message to get csv url');
  if (chrome.tabs === undefined) {
    console.log('chrome.tabs is undefined using local test file');
    loadData('/test/test2.csv');
  } else {

    chrome.tabs.sendMessage(id, { action: 'get_csv_url' }, async (response) => {
      if (response && response.csvUrl) {
        console.log('Received csv url: ' + response.csvUrl);
        loadData(response.csvUrl);
      }
    });
  }
}


document.addEventListener("DOMContentLoaded", function () {
  go();
});
