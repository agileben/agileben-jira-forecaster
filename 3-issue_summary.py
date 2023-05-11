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


# Replace NaN values with 0 in the 'Number Created' and 'Number Resolved' columns and convert to integers
issue_summary_daily['Number Created'] = issue_summary_daily['Number Created'].fillna(0).astype(int)  # Updated here
issue_summary_daily['Number Resolved'] = issue_summary_daily['Number Resolved'].fillna(0).astype(int)  # Updated here
issue_summary_daily['Net'] = issue_summary_daily['Net'].astype(int)  # Updated here


# Reorder columns
issue_summary_daily = issue_summary_daily[['Date', 'Number Created', 'Number Resolved', 'Net']]

# Group by date to create a summary DataFrame
issue_summary_weekly = issue_summary_daily.groupby('Date').agg({'Number Created': 'sum', 'Number Resolved': 'sum', 'Net': 'sum'}).reset_index()

# Sort the DataFrame by 'Week' and then 'Day'
issue_summary_daily = issue_summary_daily.sort_values(['Date'], ascending=False)
#show(data_table_from_dataframe(issue_summary_daily))

