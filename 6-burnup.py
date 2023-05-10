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