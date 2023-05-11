# agileben-jira-forecaster

This is the start of a chrome extension to analyse JIRA filters. 

It adds an "Analyse" button to the filter page in JIRA. 

When clicked loads the CSV data from your filter into memory. Data never leaves your computer.

The csv file is analysed using Python running *locally* in your browser using the amazing Pyodide library (Python in javascript / wasm).

The charts use the python library Bokeh.

Most of the code was written by ChatGPT over a weekend.

Licence:
- This work is licensed under a Creative Commons Attribution-NonCommercial 4.0 International License. (c) Ben Hogan 2023
- Free for non commercial use (You can't sell this)
- CC share alike: include attribution: "Based on https://github.com/agileben/agileben-jira-forecaster by Ben Hogan"



