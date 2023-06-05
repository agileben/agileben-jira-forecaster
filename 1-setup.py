from bokeh.plotting import figure, output_notebook
from bokeh.models import ColumnDataSource, DataTable, DateFormatter, NumberFormatter, TableColumn
from bokeh.embed import components

import re
import json
from bokeh.embed import json_item
import js
from js import plot
from js import heading as heading_with_id
from js import output as output_div

print("setup py called with output div:", output_div)

def show(p):
    from js import output as output_div
    print("show called with div", output_div)
    plot_json = json.dumps(json_item(p))
    # print("plot json", plot_json)
    plot(plot_json, output_div)

def heading(big, small):
    from js import output as output_div
    heading_with_id(big, small, output_div)

import pandas as pd
from io import StringIO

# import csv data 
from js import data
dataIO = StringIO(data)
df = pd.read_csv(dataIO)
# List of columns to drop
cols_to_drop = ['Issue id', 'Assignee Id', 'Components', 'Custom', 'Watchers', 'Attachment', 'Description', 'Comment', 'Inward', 'Outward', 'Project', 'estimate','Estimate', 'Id', 'Time Spent','Work Ratio', 'Security Level', 'Environment', 'Labels','Sprint','Satisfaction', 'Votes']

# Drop any column that includes the text in the cols_to_drop list
df = df[df.columns.drop([col for col in df.columns if any(substring in col for substring in cols_to_drop)])]

# order the first columns using the following list then add the remaining columns: Created,Resolved,Issue Type,Issue key,Issue id,Summary,Assignee
col_order = ['Created', 'Resolved', 'Issue Type', 'Issue key', 'Summary', 'Assignee', 'Status', 'Epic Link Summary', 'Parent summary']

# Reorder the columns
df = df[[col for col in col_order if col in df.columns] + [col for col in df.columns if col not in col_order]]


df['Created'] = pd.to_datetime(df['Created'], infer_datetime_format=True)
df['Resolved'] = pd.to_datetime(df['Resolved'], infer_datetime_format=True)

#sort the dataframe by the 'resolved' column descending
df = df.sort_values(by='Resolved', ascending=False) 

# Use blanks for missing values
df = df.fillna('')


# Define a function to create a TableColumn with the appropriate formatter
def create_table_column(column_name, field, dtype):
    # print("creating table column", column_name, field, dtype)
    new_width = 100
    if pd.api.types.is_datetime64_any_dtype(dtype):
        formatter = DateFormatter()
        new_width = 30
    elif pd.api.types.is_numeric_dtype(dtype):
        formatter = NumberFormatter(format="0")
        new_width = 10
    else:
        return TableColumn(field=field, title=column_name, width=new_width)

    return TableColumn(field=field, title=column_name, formatter=formatter, width=new_width)


def data_table_from_dataframe(df):
    # Create a Bokeh ColumnDataSource from the pandas DataFrame
    source = ColumnDataSource(df)
    # Create a list of TableColumn objects based on the columns in the DataFrame
    table_columns = [create_table_column(column_name, field, dtype)
                      for column_name, (field, dtype) in zip(df.columns, df.dtypes.items())]
    
    # make the first table column wider
    table_columns[0].width = 200

    # Calculate height based on 30 * number of rows
    calc_height = 30 * min(10, len(df))

    # Create the DataTable with the specified columns
    return DataTable(source=source, columns=table_columns, width=900, height=calc_height)


def show_table(df):
    from js import showTable
    from js import output as output_div
    showTable(df.to_html(), output_div)

heading("Loading Data", "Data loaded from CSV file")
# show(data_table_from_dataframe(df))
show_table(df)