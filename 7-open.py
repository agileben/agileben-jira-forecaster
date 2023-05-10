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
p_bar.line(x='Date', y='Open', source=source, legend_label='Open Issues', line_color='green', line_width=2)

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