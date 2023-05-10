print("setup step 1")
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
