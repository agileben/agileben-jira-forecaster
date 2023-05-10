function initBokehPlot(docs_json) {
  // convert docs_json string to an object
  docs_json = JSON.parse(docs_json);
  const container = document.getElementById("bokeh_plot");
  const plotDiv = document.createElement("div");
  plotDiv.setAttribute("id", docs_json.root_id);
  container.appendChild(plotDiv);
  let attempts = 0;
  const timer = setInterval(function () {
    if (window.Bokeh !== undefined) {
      clearInterval(timer);
      console.log("Bokeh is defined, embedding plot");
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

function heading(title, subtitle) {
  const container = document.getElementById("bokeh_plot");
  const plotDiv = document.createElement("div");
  plotDiv.innerHTML = `<h1>${title}</h1><p>${subtitle}</p>`;
  container.appendChild(plotDiv);
}

async function runPy(pyodide, file) {
  console.log("Running: " + file);
  const script = await fetch(file).then((response) => response.text());
  await pyodide.runPythonAsync(script);
}

async function useData(data) {
  let py = await loadPyodide();
  await py.loadPackage("micropip");
  const micropip = py.pyimport("micropip");
  await micropip.install(["pandas", "bokeh", "xyzservices"]);
  py.globals.set("json_data", JSON.stringify(data)); // Pass the serialized JavaScript data to the Python environment

  await runPy(py, "1-setup.py");
  await runPy(py, "2-map.py");
  await runPy(py, "3-issue_summary.py");
  await runPy(py, "4-simulation.py");
  // await runPy(py, "5-histogram.py");
  await runPy(py, "6-burnup.py");
  await runPy(py, "7-open.py");

}
