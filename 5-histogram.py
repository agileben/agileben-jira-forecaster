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
