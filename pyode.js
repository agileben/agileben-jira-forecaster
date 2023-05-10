

function initBokehPlot(docs_json) {
  // convert docs_json string to an object
  docs_json = JSON.parse(docs_json);
  const container = document.getElementById("bokeh_plot");
  const plotDiv = document.createElement("div");
  plotDiv.setAttribute("id",docs_json.root_id)
  container.appendChild(plotDiv);
  let attempts = 0;
  const timer = setInterval(function() {
    if (window.Bokeh !== undefined) {
      clearInterval(timer);
      console.log('Bokeh is defined, embedding plot')
      window.Bokeh.embed.embed_item(docs_json, docs_json.root_id);
    } else {
      attempts++;
      if (attempts > 100) {
        clearInterval(timer);
        console.log("Bokeh: ERROR: Unable to run BokehJS code because BokehJS library is missing");
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


function display_plot(script, div) {
    // Get the container where the plot should be displayed
    const container = document.getElementById("bokeh_plot");
  
    // Clear the container's current content
    // container.innerHTML = "";
  
    // Create a new div element and set its innerHTML to the received div
    const plotDiv = document.createElement("div");
    plotDiv.innerHTML = div;
  
    // Append the new div element to the container
    container.appendChild(plotDiv);
    console.log('script: ', script)
    // Remove the opening and closing <script> tags from the received script
    const scriptContent = script.slice(
      script.indexOf("<script type=\"text/javascript\">") + 31,
      script.lastIndexOf("</script>")
    );
  


    // Create a new script element, set its content to the scriptContent, and append it to the container
    const plotScript = document.createElement("script");
    plotScript.innerHTML = scriptContent;
    container.appendChild(plotScript);
  }
  



async function useData(data) {
  let pyodide = await loadPyodide();
  await pyodide.loadPackage("micropip");
  const micropip = pyodide.pyimport("micropip");
  await micropip.install(["pandas", "bokeh", "xyzservices"]);
  pyodide.globals.set("json_data", JSON.stringify(data)); // Pass the serialized JavaScript data to the Python environment
 
  pyodide.runPythonAsync(`


from bokeh.plotting import figure, output_notebook
from bokeh.models import ColumnDataSource, DataTable, DateFormatter, NumberFormatter, TableColumn
from bokeh.embed import components

import re
import json
from bokeh.embed import json_item
import js
from js import initBokehPlot
from js import heading

def show(plot):
    plot_json = json.dumps(json_item(plot))
    # print("plot json", plot_json)
    initBokehPlot(plot_json)


import pandas as pd
import json
data = json.loads(json_data)
df = pd.DataFrame(data)

df['Created'] = pd.to_datetime(df['Created'], infer_datetime_format=True)
df['Resolved'] = pd.to_datetime(df['Resolved'], infer_datetime_format=True)

#sort the dataframe by the 'resolved' column descending
df = df.sort_values(by='Resolved', ascending=False) 

#show(df)

# Define the status mapping to the three groups
status_mapping = {
    'New': 'To Do',
    'Backlog': 'To Do',
    'In Development': 'In Progress',
    'Ready for Development': 'To Do',
    'Logged': 'To Do',
    'Ready for Testing': 'In Progress',
    'In Testing': 'In Progress',
    'Ready for Decision': 'In Progress',
    'PO Requirements Sign off': 'To Do',
    'PO Sign Off': 'Closed',
    'Define': 'To Do',
    'To Do': 'To Do',
    'In Progress': 'In Progress',
    'Open': 'To Do',
    'Ready for Review': 'In Progress',
    'Closed': 'Closed',
    'In Analysis': 'In Progress',
    'In Review': 'In Progress',
    'Done': 'Closed',
    'Retest': 'In Progress',
    'Success': 'In Progress',
    'CR': 'In Progress',
    'Blocked': 'In Progress',
    'On Hold': 'In Progress',
    'Withdrawn': 'In Progress',
    'Closed - Not needed': 'Closed',
    'Invalid': 'Closed'
}

def map_status(status):
    if status not in status_mapping:
        print(f"Warning: Unmapped status '{status}' found. Mapping it to 'Unknown'.")
        return "Unknown"
    return status_mapping[status]

# Add a new column 'Status Group' to the DataFrame using the custom mapping function
df['Status Group'] = df['Status'].apply(map_status)

# Define the base URL format
base_url = 'https://myseek.atlassian.net/browse/'

# Create a new column 'Epic URL' by concatenating the base URL with the 'Epic Link' column
df['Epic URL'] = base_url + df['Custom field (Epic Link)']


# Group by Epic Link Summary, Issue Type, and Status Group
grouped_issues = df.groupby(['Epic Link Summary', 'Issue Type', 'Status Group']).size().reset_index(name='count')

# Pivot the 'Status Group' column to create separate columns for each group
grouped_issues = grouped_issues.pivot_table(index=['Epic Link Summary', 'Issue Type'], columns='Status Group', values='count', fill_value=0).reset_index()

# Remove the column index
grouped_issues.columns.index = None


# Add a total column
grouped_issues['Open'] = grouped_issues['To Do'] + grouped_issues['In Progress']
grouped_issues['Total'] = grouped_issues['To Do'] + grouped_issues['In Progress'] + grouped_issues['Closed']



# Calculate the total row
total_row = pd.Series({
    'Epic Link Summary': 'Total',
    'Issue Type': '',
    'To Do': grouped_issues['To Do'].sum(),
    'In Progress': grouped_issues['In Progress'].sum(),
    'Open': grouped_issues['Open'].sum(),
    'Closed': grouped_issues['Closed'].sum(),
    'Total': grouped_issues['Total'].sum()
})

# Reorder columns
grouped_issues = grouped_issues[['Epic Link Summary', 'Issue Type', 'To Do', 'In Progress', 'Closed', 'Open', 'Total']]


# Append the total row to the DataFrame
grouped_issues = grouped_issues.append(total_row, ignore_index=True)
grouped_issues = grouped_issues.sort_values(by='Total', ascending=False)


# Define a function to create a TableColumn with the appropriate formatter
def create_table_column(column_name, field, dtype):
    # print("creating table column", column_name, field, dtype)
    if pd.api.types.is_datetime64_any_dtype(dtype):
        formatter = DateFormatter()
    elif pd.api.types.is_numeric_dtype(dtype):
        formatter = NumberFormatter(format="0")
    else:
        return TableColumn(field=field, title=column_name)

    return TableColumn(field=field, title=column_name, formatter=formatter)


def data_table_from_dataframe(df):
    # Create a Bokeh ColumnDataSource from the pandas DataFrame
    source = ColumnDataSource(df)
    # Create a list of TableColumn objects based on the columns in the DataFrame
    table_columns = [create_table_column(column_name, field, dtype)
                      for column_name, (field, dtype) in zip(df.columns, df.dtypes.items())]
    
    # Create the DataTable with the specified columns
    return DataTable(source=source, columns=table_columns, width=900, height=400)

# Display the grouped issues
heading("Analysis of Epics", "Grouped by epic and type, sorted by total")
show(data_table_from_dataframe(grouped_issues))


`);

// sleep to let the main thread run for a bit
await new Promise(r => setTimeout(r, 500));

pyodide.runPythonAsync(`
# ## Issue Summary by Date

# Count created issues by date
created_issues_daily = df[df['Created'].notna()].groupby(df['Created'].dt.to_period('D')).size().reset_index(name='Number Created')

# Count resolved issues by date
resolved_issues_daily = df[df['Resolved'].notna()].groupby(df['Resolved'].dt.to_period('D')).size().reset_index(name='Number Resolved')

# Merge created and resolved issues into a single DataFrame
issue_summary_daily = created_issues_daily.merge(resolved_issues_daily, how='outer', left_on='Created', right_on='Resolved').fillna(pd.NaT)
issue_summary_daily['Net'] = issue_summary_daily['Number Created'].fillna(0) - issue_summary_daily['Number Resolved'].fillna(0)

# Combine 'Created' and 'Resolved' columns into a single 'Date' column
issue_summary_daily['Date'] = issue_summary_daily['Created'].combine_first(issue_summary_daily['Resolved'])

# Convert 'Date' column to datetime format
issue_summary_daily['Date'] = issue_summary_daily['Date'].dt.to_timestamp()

# Drop the original 'Created' and 'Resolved' columns
issue_summary_daily = issue_summary_daily.drop(columns=['Created', 'Resolved'])

min_date = issue_summary_daily['Date'].min()
max_date = issue_summary_daily['Date'].max()

date_range = pd.date_range(min_date, max_date, freq='D')
continuous_issue_summary_daily = pd.DataFrame(date_range, columns=['Date'])

issue_summary_daily = continuous_issue_summary_daily.merge(issue_summary_daily, on='Date', how='left')
issue_summary_daily.fillna(0, inplace=True)


# Extract year, week, and day information
issue_summary_daily['Year'] = issue_summary_daily['Date'].dt.year
issue_summary_daily['Week'] = issue_summary_daily['Date'].dt.to_period('W')
issue_summary_daily['Day'] = issue_summary_daily['Date'].dt.day
issue_summary_daily['Week Name'] = issue_summary_daily['Week'].apply(lambda x: f"{x.start_time.date()} - {x.end_time.date()}")

# Replace NaN values with 0 in the 'Number Created' and 'Number Resolved' columns and convert to integers
issue_summary_daily['Number Created'] = issue_summary_daily['Number Created'].fillna(0).astype(int)  # Updated here
issue_summary_daily['Number Resolved'] = issue_summary_daily['Number Resolved'].fillna(0).astype(int)  # Updated here
issue_summary_daily['Net'] = issue_summary_daily['Net'].astype(int)  # Updated here


# Reorder columns
issue_summary_daily = issue_summary_daily[['Year', 'Week Name', 'Week', 'Day', 'Date', 'Number Created', 'Number Resolved', 'Net']]

# Group by date to create a summary DataFrame
issue_summary_weekly = issue_summary_daily.groupby('Date').agg({'Number Created': 'sum', 'Number Resolved': 'sum', 'Net': 'sum'}).reset_index()

# Sort the DataFrame by 'Week' and then 'Day'
issue_summary_daily = issue_summary_daily.sort_values(['Date'], ascending=False)
#show(data_table_from_dataframe(issue_summary_daily))



# ## Monte Carlo Simulation

import numpy as np

# Function to run the Monte Carlo simulation
def monte_carlo_simulation_from_data(created_data, resolved_data, days, simulations):
    # Calculate 5% lower and upper bounds for created_data and resolved_data
    upper_bound_created = np.percentile(created_data, [97.5])
    upper_bound_resolved = np.percentile(resolved_data, [97.5])

    # Filter out samples that are outside the 5% confidence bounds
    created_data_filtered = created_data #[(created_data <= upper_bound_created)]
    resolved_data_filtered = resolved_data #[(resolved_data <= upper_bound_resolved)]

    created_results = []
    resolved_results = []
    for _ in range(simulations):
        created_count = np.random.choice(created_data_filtered, days, replace=True)
        resolved_count = np.random.choice(resolved_data_filtered, days, replace=True)
        created_results.append(created_count)
        resolved_results.append(resolved_count)
    return created_results, resolved_results

num_simulations = 10000
days_history = 14
forecast_weeks = 15


def run_simulation(weeks_to_forecast):
    days_to_forecast = weeks_to_forecast * 7
    print("running simulation with weeks_to_forecast", weeks_to_forecast)

    # Filter issue_summary_daily to consider only the last X days  
    last_X_days =  issue_summary_daily.sort_values(['Week', 'Day'], ascending=False).head(days_history)
    # Select the 'Number Created' and 'Number Resolved' columns from the filtered data
    last_X_days_created = last_X_days['Number Created'].values
    last_X_days_resolved = last_X_days['Number Resolved'].values
    heading("Inputs to simulation", "Last X days of data used to forecast the next Y days")

    show(data_table_from_dataframe(last_X_days))

    # Run the Monte Carlo simulation using actual historical completion counts
    created_simulation_results, resolved_simulation_results = monte_carlo_simulation_from_data(
        last_X_days_created, last_X_days_resolved, days_to_forecast, num_simulations
    )

    # Convert simulation results to DataFrames
    created_simulation_results_df = pd.DataFrame(
        created_simulation_results, columns=[f'Day {i+1}' for i in range(days_to_forecast)]
    )
    resolved_simulation_results_df = pd.DataFrame(
        resolved_simulation_results, columns=[f'Day {i+1}' for i in range(days_to_forecast)]
    )

    # Add a total column to the simulation results DataFrames
    created_simulation_results_df['Total'] = created_simulation_results_df.sum(axis=1)
    resolved_simulation_results_df['Total'] = resolved_simulation_results_df.sum(axis=1)

    return created_simulation_results_df, resolved_simulation_results_df


created_simulation_results_df, resolved_simulation_results_df = run_simulation(forecast_weeks)

# Calculate total number of stories completed in N weeks at different confidence levels
confidence_levels = [0.25, 0.5, 0.75, 0.8, 0.9]

created_percentiles = {int(confidence * 100): np.percentile(created_simulation_results_df['Total'], [100 * (1 - confidence) / 2, 100 * (1 + confidence) / 2]) for confidence in confidence_levels}
resolved_percentiles = {int(confidence * 100): np.percentile(resolved_simulation_results_df['Total'], [100 * (1 - confidence) / 2, 100 * (1 + confidence) / 2]) for confidence in confidence_levels}

lower_bound_created, upper_bound_created = created_percentiles[80]
lower_bound_resolved, upper_bound_resolved = resolved_percentiles[80]

created_filtered = created_simulation_results_df[(created_simulation_results_df['Total'] >= lower_bound_created) & (created_simulation_results_df['Total'] <= upper_bound_created)]
resolved_filtered = resolved_simulation_results_df[(resolved_simulation_results_df['Total'] >= lower_bound_resolved) & (resolved_simulation_results_df['Total'] <= upper_bound_resolved)]

created_filtered_no_total = created_filtered.drop(columns='Total')
resolved_filtered_no_total = resolved_filtered.drop(columns='Total')

print("Total Number of Stories Created in simulation:")
for confidence, (lower_bound, upper_bound) in created_percentiles.items():
    print(f"{confidence}% Confidence: {lower_bound:.0f} - {upper_bound:.0f}")

print("Total Number of Stories Resolved in simulation:")
for confidence, (lower_bound, upper_bound) in resolved_percentiles.items():
    print(f"{confidence}% Confidence: {lower_bound:.0f} - {upper_bound:.0f}")


# ## Simulation Histogram

from bokeh.layouts import row
from bokeh.plotting import figure

# Prepare data for plotting
bins = np.linspace(min(created_simulation_results_df['Total'].min(), resolved_simulation_results_df['Total'].min()),
                   max(created_simulation_results_df['Total'].max(), resolved_simulation_results_df['Total'].max()), 30)

created_counts, created_edges = np.histogram(created_simulation_results_df['Total'], bins=bins)
resolved_counts, resolved_edges = np.histogram(resolved_simulation_results_df['Total'], bins=bins)

created_left = created_edges[:-1]
created_right = created_edges[1:]
resolved_left = resolved_edges[:-1]
resolved_right = resolved_edges[1:]

# Set up the histogram chart
p_hist = figure(title='Simulated Histogram of Created and Resolved Issues', x_axis_label='Number of Issues', y_axis_label='Frequency', width=900, height=400)

# Plot bars for created and resolved issues
p_hist.quad(top=created_counts, bottom=0, left=created_left, right=created_right, fill_color='blue', line_color='blue', alpha=0.5, legend_label='Created')
p_hist.quad(top=-resolved_counts, bottom=0, left=resolved_left, right=resolved_right, fill_color='red', line_color='red', alpha=0.5, legend_label='Resolved')

# Add a legend
p_hist.legend.location = 'top_right'

# Show the plot
show(p_hist)


# ## Simulation Burn-Up with Forecast

import numpy as np
from bokeh.layouts import column
from bokeh.models import ColumnDataSource, CustomJS, Div

# Convert 'Date' back to datetime object
issue_summary_daily['Date'] = pd.to_datetime(issue_summary_daily['Date'])

# Sort issue_summary_daily in ascending order by 'Date'
issue_summary_daily = issue_summary_daily.sort_values(by='Date', ascending=True)

# Calculate the cumulative sum of 'Number Created' and 'Number Resolved' columns
issue_summary_daily['Cumulative Created'] = issue_summary_daily['Number Created'].cumsum()
issue_summary_daily['Cumulative Resolved'] = issue_summary_daily['Number Resolved'].cumsum()

# Prepare data for plotting
issue_summary_daily['DateStr'] = issue_summary_daily['Date'].dt.strftime('%Y-%m-%d')
source = ColumnDataSource(issue_summary_daily)

# Create the plot
p = figure(x_axis_type="datetime", width=900, height=400, title="Cumulative Number of Stories Created and Resolved")
p.line(x='Date', y='Cumulative Created', source=source, legend_label="Cumulative Created", line_width=3)
p.line(x='Date', y='Cumulative Resolved', source=source, legend_label="Cumulative Resolved", line_color="orange", line_width=1)

# Add markers for Created and Resolved
p.circle(x='Date', y='Cumulative Created', source=source, legend_label="Cumulative Created", size=4)
p.circle(x='Date', y='Cumulative Resolved', source=source, legend_label="Cumulative Resolved", color="orange", size=3)

# Plot the forecasts within the 80% confidence interval for both created and resolved issues
for i in range(100):
    created_sample = created_filtered_no_total.iloc[i]
    resolved_sample = resolved_filtered_no_total.iloc[i]

    forecasted_created = issue_summary_daily['Cumulative Created'].iloc[-1] + created_sample.cumsum()
    forecasted_resolved = issue_summary_daily['Cumulative Resolved'].iloc[-1] + resolved_sample.cumsum()

    forecasted_dates = pd.date_range(issue_summary_daily['Date'].iloc[-1], periods=len(created_sample) + 1, inclusive='right')

    # Extend historical data to the start of the forecast data
    extended_created = np.append(issue_summary_daily['Cumulative Created'].values[:-1], forecasted_created)
    extended_resolved = np.append(issue_summary_daily['Cumulative Resolved'].values[:-1], forecasted_resolved)
    extended_dates = np.append(issue_summary_daily['Date'].values[:-1], forecasted_dates)

    p.line(extended_dates, extended_created, line_color='blue', line_alpha=0.05, line_width=1)
    p.line(extended_dates, extended_resolved, line_color='orange', line_alpha=0.05, line_width=1)



# Add lower bound created and resolved lines
forecasted_dates = pd.date_range(issue_summary_daily['Date'].iloc[-1], periods=len(created_sample) + 1, inclusive='right')
upper_bound_created_line = issue_summary_daily['Cumulative Created'].iloc[-1] + np.linspace(0, upper_bound_created, len(created_sample))
lower_bound_resolved_line = issue_summary_daily['Cumulative Resolved'].iloc[-1] + np.linspace(0, lower_bound_resolved, len(resolved_sample))


lower_bound_data = pd.DataFrame({
    'Date': forecasted_dates,
    'UpperBoundCreated': upper_bound_created_line,
    'LowerBoundResolved': lower_bound_resolved_line
})
lower_bound_data['DateStr'] = lower_bound_data['Date'].dt.strftime('%Y-%m-%d')
lower_bound_source = ColumnDataSource(lower_bound_data)

p.line(x='Date', y='LowerBoundResolved', source=lower_bound_source, legend_label='Lower Bound Resolved', line_color='orange', line_dash='dashed', line_width=2)
p.line(x='Date', y='UpperBoundCreated', source=lower_bound_source, legend_label='Upper Bound Created', line_color='green', line_dash='dashed', line_width=2)


# Set appropriate axis labels
p.xaxis.axis_label = 'Date'
p.yaxis.axis_label = 'Cumulative Stories'

# Add a legend
p.legend.location = "top_left"

# Show the plot
show(p)


# ## Simulation Open Issues with Forecast

from bokeh.models import ColumnDataSource
from bokeh.plotting import figure
from datetime import timedelta






# Prepare data for plotting
issue_summary_daily['Net'] = issue_summary_daily['Number Created'] - issue_summary_daily['Number Resolved']
issue_summary_daily['Open'] = issue_summary_daily['Cumulative Created'] - issue_summary_daily['Cumulative Resolved']
issue_summary_daily['DateStr'] = issue_summary_daily['Date'].dt.strftime('%Y-%m-%d')
issue_summary_daily['Negative Number Resolved'] = -issue_summary_daily['Number Resolved']
source = ColumnDataSource(issue_summary_daily)

# Set up the bar chart
p_bar = figure(x_axis_type='datetime', y_axis_label='Daily Issues', title='Daily Issues Created, Resolved, and Open', width=900, height=400)

# Create a ColumnDataSource object for the daily issue data
source = ColumnDataSource(issue_summary_daily)

# Plot bars for created and negative resolved issues
p_bar.vbar(x='Date', top='Number Created', width=timedelta(days=1)*0.5, color='blue', source=source, legend_label='Created')
p_bar.vbar(x='Date', bottom=0, top='Negative Number Resolved', width=timedelta(days=1)*0.5, color='red', source=source, legend_label='Resolved')

# Create a line chart for open issues
p_bar.line(x='Date', y='Open', source=source, legend_label='Open Issues', line_color='green')

# Plot the forecasts within the 80% confidence interval for open issues
for i in range(100):
    created_sample = created_filtered_no_total.iloc[i]
    resolved_sample = resolved_filtered_no_total.iloc[i]

    forecasted_created = issue_summary_daily['Cumulative Created'].iloc[-1] + created_sample.cumsum()
    forecasted_resolved = issue_summary_daily['Cumulative Resolved'].iloc[-1] + resolved_sample.cumsum()
    forecasted_open = forecasted_created - forecasted_resolved

    forecasted_dates = pd.date_range(issue_summary_daily['Date'].iloc[-1], periods=len(created_sample) + 1, inclusive='right')

    p_bar.line(forecasted_dates, forecasted_open, line_color='green', alpha=0.1)

# Calculate the upper and lower bounds for open issues
forecasted_dates = pd.date_range(issue_summary_daily['Date'].iloc[-1], periods=len(created_sample) + 1, inclusive='right')
upper_bound_open_line = issue_summary_daily['Open'].iloc[-1] + np.linspace(0, upper_bound_created - lower_bound_resolved, len(created_sample))
lower_bound_open_line = issue_summary_daily['Open'].iloc[-1] + np.linspace(0, lower_bound_created - upper_bound_resolved, len(resolved_sample))

# Prepare data for plotting upper and lower bounds
bounds_data = pd.DataFrame({
    'Date': forecasted_dates,
    'UpperBoundOpen': upper_bound_open_line,
    'LowerBoundOpen': lower_bound_open_line
})
bounds_data['DateStr'] = bounds_data['Date'].dt.strftime('%Y-%m-%d')
bounds_source = ColumnDataSource(bounds_data)

# Plot the upper and lower bounds for open issues
p_bar.line(x='Date', y='UpperBoundOpen', source=bounds_source, legend_label='90% Confidence', line_color='green', line_dash='dashed', line_width=2)
p_bar.line(x='Date', y='LowerBoundOpen', source=bounds_source, legend_label='10% Confidence', line_color='orange', line_dash='dashed', line_width=2)


show(p_bar)

`);
}