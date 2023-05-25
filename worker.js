// py-worker.js

importScripts("/lib/pyodide.js");

// importScripts('https://cdn.jsdelivr.net/pyodide/v0.23.2/full/pyodide.js');

// from js import initBokehPlot
// from js import heading

async function heading(heading, subheading, div){
  console.log('heading', heading, subheading)
  self.postMessage({ action: 'heading', heading, subheading, output: div});
}

async function plot(json, div){
  self.postMessage({ action: 'plot', params: json, output: div});
}


async function showTable(json, div){
  self.postMessage({ action: 'table', params: json, output: div});
}


async function loadPyodideAndPackages() {
    self.postMessage({ message: 'Loading Python environment (pyodide 0.23.2)'});
    self.pyodide = await loadPyodide();
    await self.pyodide.loadPackage(["numpy", "pytz"]);
    await self.pyodide.loadPackage(['micropip']);
    const micropip = await self.pyodide.pyimport('micropip');
    await micropip.install(['pandas', 'bokeh', 'numpy', 'pytz', 'xyzservices'], true);
    self.postMessage({ message: 'Python ready'});
}
  
let pyodideReadyPromise = loadPyodideAndPackages();


// let pythonLoading;
// async function loadPythonPackages(){
//     await languagePluginLoader;
//     console.log('Loading python packages')
//     pythonLoading = self.pyodide.loadPackage(['micropip']);
//     const micropip = await self.pyodide.pyimport('micropip');
//     await micropip.install(['pandas', 'bokeh', 'numpy', 'pytz', 'pandas', 'numpy', 'pytz']);
// }

self.onmessage = async (event) => {
    // make sure loading is done
    await pyodideReadyPromise;
    // Don't bother yet with this line, suppose our API is built in such a way:
    const { id, python, ...context } = event.data;
    // The worker copies the context in its own "memory" (an object mapping name to values)
    for (const key of Object.keys(context)) {
      self[key] = context[key];
    }
    // Now is the easy part, the one that is similar to working in the main thread:
    try {
      await self.pyodide.loadPackagesFromImports(python);
      let results = await self.pyodide.runPythonAsync(python);
      console.log('RESULTS', results)
      // if the results are a PyProxy object, convert them to a JS object
        if (results && results.toJs) {
            results = results.toJs();
        }
      self.postMessage({ results, id, resultsJson: JSON.stringify(results) });
    } catch (error) {
      self.postMessage({ error: error.message, id });
    }
  };


  