print ("Define the status mapping to the three groups")

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
grouped_issues = grouped_issues.sort_values(by='Open', ascending=False)


# Display the grouped issues
heading("Analysis of Epics", "Grouped by epic and type, sorted by Open")
show(data_table_from_dataframe(grouped_issues))
