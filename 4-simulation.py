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

num_simulations = 5000
days_history = 14
forecast_weeks = 12


def run_simulation(weeks_to_forecast):
    days_to_forecast = weeks_to_forecast * 7
    print("running simulation with weeks_to_forecast", weeks_to_forecast)

    # Filter issue_summary_daily to consider only the last X days  
    last_X_days =  issue_summary_daily.sort_values(['Date'], ascending=False).head(days_history)
    # Select the 'Number Created' and 'Number Resolved' columns from the filtered data
    last_X_days_created = last_X_days['Number Created'].values
    last_X_days_resolved = last_X_days['Number Resolved'].values
    # template the forecast_weeks into the heading
    heading("Forecasting the next {} weeks".format(forecast_weeks), "Using the last {} days of data. This table shows the input to the monte-carlo simulation with {} runs.".format(days_history,num_simulations))

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

# print("Total Number of Stories Created in simulation:")
# for confidence, (lower_bound, upper_bound) in created_percentiles.items():
#     print(f"{confidence}% Confidence: {lower_bound:.0f} - {upper_bound:.0f}")

# print("Total Number of Stories Resolved in simulation:")
# for confidence, (lower_bound, upper_bound) in resolved_percentiles.items():
#     print(f"{confidence}% Confidence: {lower_bound:.0f} - {upper_bound:.0f}")


# TODO convert data from format
# { "50": [ 100, 200 ], "80": [50, 250]}
# into 
# Confidence level | Lower bound | Upper Bound
# 50 | 100 | 200
# 80 | 50 | 250
created_confidence_df = pd.DataFrame(list(created_percentiles.items()), columns=["Confidence level", "Bounds"])
created_confidence_df[['Lower bound', 'Upper Bound']] = pd.DataFrame(created_confidence_df['Bounds'].tolist(), index=created_confidence_df.index)
created_confidence_df = created_confidence_df.drop(['Bounds'], axis=1)
print(created_confidence_df)
heading("","Created items: simulated number of items at various confidence levels")
show(data_table_from_dataframe(created_confidence_df))

resolved_confidence_df = pd.DataFrame(list(resolved_percentiles.items()), columns=["Confidence level", "Bounds"])
resolved_confidence_df[['Lower bound', 'Upper Bound']] = pd.DataFrame(resolved_confidence_df['Bounds'].tolist(), index=resolved_confidence_df.index)
resolved_confidence_df = resolved_confidence_df.drop(['Bounds'], axis=1)
print(resolved_confidence_df)
heading("","Resolved items: simulated number of items at various confidence levels")
show(data_table_from_dataframe(resolved_confidence_df))
