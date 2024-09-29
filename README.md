# DeepState Map Data Processing

This project automates the process of fetching, processing, and visualizing data from the DeepState Map, which tracks territorial changes in Ukraine. It consists of two main Google Apps Script files that work with Google Sheets to manage and analyze the data.

## Features

- Automated data fetching from the DeepState Map
- Data processing and storage in Google Sheets
- Calculation of various metrics related to territorial changes
- Flexible date range and time period selection for analysis
- Generation of charts and summary statistics

## Scripts

### 1. Data Fetching Script

This script (`fetchAndSaveNewDataTop`) is responsible for:

- Fetching new data from the DeepState Map
- Processing the raw data to extract relevant information
- Inserting new data rows into the 'Raw Data' sheet

### 2. Data Processing Script

This script contains several functions for processing and visualizing the data:

- `updateChartData`: Main function that orchestrates the data processing workflow
- `getRawData`: Retrieves and pre-processes raw data from the sheet
- `processData`: Applies filters and calculations based on user-selected parameters
- `calculateMetric`: Computes various metrics (e.g., Pace of change, Area change)
- `outputResults`: Formats and outputs the processed data to the sheet
- `updateSummaryStats`: Generates summary statistics
- `updateDatawrapperFields`: Prepares data for Datawrapper visualizations

## Setup

1. Create a new Google Sheets document
2. Set up the following sheets:
   - 'Raw Data': For storing the fetched data
   - 'Charts': For displaying processed data and controls
3. Open the Script Editor (Tools > Script editor)
4. Copy the contents of the two script files into separate script files in the Script Editor
5. Replace the placeholder API endpoints with the actual DeepState Map API URLs
6. Set up a time-based trigger for the `fetchAndSaveNewDataTop` function to run periodically

## Usage

1. The data fetching script will automatically run on the set schedule, populating the 'Raw Data' sheet
2. In the 'Charts' sheet, use the provided controls to select:
   - Date range
   - Time period (Daily, Weekly, Monthly)
   - Metric to calculate
3. Click the "Update" button to run the data processing and update the charts

## Metrics

The script can calculate the following metrics:

- Pace of change
- Area change
- Average pace
- Top 5 Changes

## Contributing

Contributions to improve the scripts or add new features are welcome. Please submit a pull request with your proposed changes.

## License

[Specify the license here]

## Disclaimer

This project is not officially affiliated with DeepState Map. It is an independent tool for processing and analyzing publicly available data.