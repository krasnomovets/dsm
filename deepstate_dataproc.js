/**
 * Fetches the description for a given ID from the API.
 *
 * @param {number} id The ID for which to fetch the description.
 * @return The description corresponding to the ID.
 * @customfunction
 */
function GetDescForID(id) {
  var url = ''; // HISTORY ENDPOINT URL
  var response = UrlFetchApp.fetch(url);
  var json = JSON.parse(response.getContentText());
  
  var description = json.find(item => item.id === id)?.descriptionEn;
  
  return description || "Description not found.";
}

function updateChartData() {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Charts");
    var rawDataSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Raw Data");
    
    // Read control values
    var dateFrom = sheet.getRange("B2").getValue();
    var dateTo = sheet.getRange("B3").getValue();
    var timePeriod = sheet.getRange("B4").getValue();
    var metric = sheet.getRange("B5").getValue();
    
    // Process raw data
    var rawData = getRawData(rawDataSheet);
    if (!rawData || rawData.length === 0) {
      throw new Error("No raw data available");
    }
    
    var processedData = processData(rawData, dateFrom, dateTo, timePeriod, metric);
    if (!processedData || processedData.length === 0) {
      throw new Error("Data processing resulted in empty dataset");
    }
    
    // Output results
    outputResults(sheet, processedData, metric, timePeriod);
    
    // Update summary stats and Datawrapper fields
//    updateSummaryStats(sheet, rawData);
//    updateDatawrapperFields(sheet, processedData, metric);
    
    sheet.getRange("A1").setValue("Sist oppdatert: " + new Date().toLocaleString());
  } catch (error) {
    Logger.log("Error in updateChartData: " + error.message);
    SpreadsheetApp.getActiveSpreadsheet().toast("En feil oppstod: " + error.message, "Feil", 30);
  }
}

function getRawData(sheet) {
  try {
    var lastRow = sheet.getLastRow();
    var data = sheet.getRange(2, 1, lastRow - 1, 11).getValues();
    
    // Filter out empty rows and parse dates
    data = data.filter(row => row[0] !== "").map(row => {
      row[1] = new Date(row[1]); // Convert date string to Date object
      return row;
    });
    
    // Sort data by date (latest first)
    data.sort((a, b) => b[1] - a[1]);
    
    // Keep only the latest entry for each day
    var latestData = {};
    data.forEach(row => {
      var dateKey = Utilities.formatDate(row[1], "GMT+3", "yyyy-MM-dd");
      if (!latestData[dateKey]) {
        latestData[dateKey] = row;
      }
    });
    
    // Convert back to array and sort by date (oldest first)
    return Object.values(latestData).sort((a, b) => a[1] - b[1]);
  } catch (error) {
    Logger.log("Error in getRawData: " + error.message);
    return null;
  }
}

function processData(rawData, dateFrom, dateTo, timePeriod, metric) {
  try {
    Logger.log("processData input: " + JSON.stringify({rawDataLength: rawData.length, dateFrom, dateTo, timePeriod, metric}));
    
    // Handle "23.02.2022 to date" option
    if (timePeriod === "23.02.2022 to date") {
      // Find the earliest and latest dates in the raw data
      let earliestDate = new Date(rawData[rawData.length - 1][1]);
      let latestDate = new Date(rawData[0][1]);
      
      // Ensure we start from 23.02.2022 or the earliest available date, whichever is later
      dateFrom = new Date(Math.max(new Date("2022-02-23"), earliestDate));
      dateTo = latestDate;
      timePeriod = "Daily"; // Use daily granularity for calculations
    }
    
    // Convert dates to Date objects if they're not already
    let fromDate = new Date(dateFrom);
    let toDate = new Date(dateTo);
    
    // Ensure fromDate is earlier than toDate
    if (fromDate > toDate) {
      [fromDate, toDate] = [toDate, fromDate];
    }
    
    // Adjust date range based on timePeriod
    let adjustedDates = adjustDateRange(fromDate, toDate, timePeriod);
    fromDate = adjustedDates.fromDate;
    toDate = adjustedDates.toDate;
    
    // For "23.02.2022 to date", we don't need to extend the from date
    let extendedFromDate = timePeriod === "23.02.2022 to date" ? fromDate : extendDateRange(fromDate, timePeriod, -1);
    
    Logger.log("Date range for filtering: " + JSON.stringify({from: extendedFromDate, to: toDate}));
    
    var filteredData = filterDataByDateRange(rawData, extendedFromDate, toDate);
    if (filteredData.length === 0) {
      throw new Error("No data in selected date range");
    }
    var groupedData = groupDataByTimePeriod(filteredData, timePeriod);
    Logger.log("Grouped data length: " + groupedData.length);
    
    var result = calculateMetric(groupedData, metric, fromDate, toDate, timePeriod);
    Logger.log("processData result: " + JSON.stringify(result));
    return result;
  } catch (error) {
    Logger.log("Error in processData: " + error.message);
    return null;
  }
}

function adjustDateRange(fromDate, toDate, timePeriod) {
  switch (timePeriod) {
    case "Weekly":
      fromDate.setDate(fromDate.getDate() - fromDate.getDay() + 1); // Set to Monday
      toDate.setDate(toDate.getDate() + (7 - toDate.getDay()) % 7); // Set to Sunday
      break;
    case "Monthly":
      fromDate.setDate(1); // Set to first day of the month
      toDate.setMonth(toDate.getMonth() + 1, 0); // Set to last day of the month
      break;
  }
  fromDate.setHours(0, 0, 0, 0);
  toDate.setHours(23, 59, 59, 999);
  return { fromDate, toDate };
}

function extendDateRange(date, timePeriod, direction) {
  var newDate = new Date(date);
  switch (timePeriod) {
    case "Daily":
      newDate.setDate(newDate.getDate() + direction);
      break;
    case "Weekly":
      newDate.setDate(newDate.getDate() + (direction * 7));
      break;
    case "Monthly":
      newDate.setMonth(newDate.getMonth() + direction);
      break;
  }
  return newDate;
}

function filterDataByDateRange(data, from, to) {
  Logger.log("filterDataByDateRange input: " + JSON.stringify({dataLength: data.length, from, to}));

  let filteredData = data.filter(row => {
    var rowDate = new Date(row[1]);
    return rowDate >= from && rowDate <= to;
  });

  Logger.log("filterDataByDateRange output: " + filteredData.length + " rows");
  return filteredData;
}

function groupDataByTimePeriod(data, timePeriod) {
  if (timePeriod === "Daily") {
    return groupByDay(data);
  } else if (timePeriod === "Weekly") {
    return groupByWeek(data);
  } else if (timePeriod === "Monthly") {
    return groupByMonth(data);
  }
  return data;
}

function groupByDay(data) {
  var grouped = {};
  data.forEach(row => {
    var dateKey = new Date(row[1]).toDateString();
    if (!grouped[dateKey] || new Date(row[1]) > new Date(grouped[dateKey][1])) {
      grouped[dateKey] = row;
    }
  });
  return Object.values(grouped).sort((a, b) => new Date(a[1]) - new Date(b[1]));
}

function groupByWeek(data) {
  var grouped = {};
  data.forEach(row => {
    var date = new Date(row[1]);
    var weekEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate() + (7 - date.getDay()));
    var weekKey = weekEnd.toISOString().split('T')[0];
    if (!grouped[weekKey] || date > new Date(grouped[weekKey][1])) {
      grouped[weekKey] = row;
    }
  });
  return Object.values(grouped).sort((a, b) => new Date(a[1]) - new Date(b[1]));
}

function groupByMonth(data) {
  var grouped = {};
  data.forEach(row => {
    var date = new Date(row[1]);
    var monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (!grouped[monthKey] || date > new Date(grouped[monthKey][1])) {
      grouped[monthKey] = row;
    }
  });
  return Object.values(grouped).sort((a, b) => new Date(a[1]) - new Date(b[1]));
}

function calculateMetric(data, metric, fromDate, toDate, timePeriod) {
  switch(metric) {
    case "Pace of change":
      return calculatePaceOfChange(data, fromDate, toDate, timePeriod);
    case "Area change":
      return calculateAreaChange(data, fromDate, toDate, timePeriod);
    case "Average pace":
      return calculateAveragePace(data, fromDate, toDate, timePeriod);
    case "Top 5 Changes":
      return calculateTop5Changes(data, fromDate, toDate, timePeriod);
    default:
      throw new Error("Unknown metric: " + metric);
  }
}

function calculatePaceOfChange(data, fromDate, toDate, timePeriod) {
  Logger.log("calculatePaceOfChange input: " + JSON.stringify({data: data.length + " rows", fromDate, toDate, timePeriod}));
  
  let result = [];
  for (let i = 1; i < data.length; i++) {
    let currentDate = new Date(data[i][1]);
    if (currentDate >= fromDate && currentDate <= toDate) {
      let change = data[i][9] - data[i-1][9];
      let displayDate = getDisplayDate(currentDate, timePeriod);
      result.push([displayDate, change]);
      Logger.log("Calculated change for " + displayDate + ": " + change);
    }
  }

  Logger.log("calculatePaceOfChange result: " + JSON.stringify(result));
  return result;
}

function calculateAreaChange(data, fromDate, toDate, timePeriod) {
  var initialArea = data.find(row => new Date(row[1]) >= fromDate)[9];
  return data
    .filter(row => {
      var rowDate = new Date(row[1]);
      return rowDate >= fromDate && rowDate <= toDate;
    })
    .map(row => [getDisplayDate(new Date(row[1]), timePeriod), row[9] - initialArea]);
}

function calculateAveragePace(data, fromDate, toDate, timePeriod) {
  var filteredData = data.filter(row => {
    var rowDate = new Date(row[1]);
    return rowDate >= fromDate && rowDate <= toDate;
  });
  var totalChange = filteredData[filteredData.length - 1][9] - filteredData[0][9];
  var timeDiff = getTimeDifference(fromDate, toDate, timePeriod);
  var averagePace = totalChange / timeDiff;
  
  return filteredData.map(row => [getDisplayDate(new Date(row[1]), timePeriod), averagePace]);
}

function calculateTop5Changes(data, fromDate, toDate, timePeriod) {
  var changes = calculatePaceOfChange(data, fromDate, toDate, timePeriod);
  changes.sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
  return changes.slice(0, 5);
}

function getTimeDifference(fromDate, toDate, timePeriod) {
  switch(timePeriod) {
    case "Daily":
      return (toDate - fromDate) / (1000 * 60 * 60 * 24);
    case "Weekly":
      return Math.round((toDate - fromDate) / (1000 * 60 * 60 * 24 * 7));
    case "Monthly":
      return (toDate.getFullYear() - fromDate.getFullYear()) * 12 + toDate.getMonth() - fromDate.getMonth();
    default:
      return (toDate - fromDate) / (1000 * 60 * 60 * 24);
  }
}

function getDisplayDate(date, timePeriod) {
  switch (timePeriod) {
    case "Weekly":
      let weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay() + 1);
      let weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      return `${formatDate(weekStart)} - ${formatDate(weekEnd)}`;
    case "Monthly":
      return `${String(date.getMonth() + 1).padStart(2, '0')}.${date.getFullYear()}`;
    case "23.02.2022 to date":
    case "Daily":
    default:
      return formatDate(date);
  }
}

function formatDate(date) {
  return `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}.${date.getFullYear()}`;
}

function outputResults(sheet, processedData, metric, timePeriod) {
  // Clear existing data
  var lastRow = sheet.getLastRow();
  var lastColumn = sheet.getLastColumn();
  if (lastRow > 9) {  // Assuming the table starts at row 10
    sheet.getRange(10, 1, lastRow - 9, lastColumn).clear();
  }

  if (!processedData || processedData.length === 0) {
    Logger.log("No processed data to output");
    sheet.getRange("A10").setValue("Ingen data tilgjengelig for de valgte kriteriene");
    return;
  }
  
  var headers = ["Dato", getMetricHeader(metric, timePeriod)];
  var outputData = [headers, ...processedData.map(row => [
    row[0], // Date is already formatted in getDisplayDate
    typeof row[1] === 'number' ? row[1].toFixed(2) : row[1]
  ])];
  
  // Sort the output data by date in descending order (latest date first)
  outputData.sort((a, b) => {
    if (a[0] === "Dato") return -1; // Keep header at the top
    return new Date(b[0].split(' - ')[0].split('.').reverse().join('-')) - 
           new Date(a[0].split(' - ')[0].split('.').reverse().join('-'));
  });
  
  var outputRange = sheet.getRange(10, 1, outputData.length, outputData[0].length);
  outputRange.setValues(outputData);
}

function getMetricHeader(metric, timePeriod) {
  if (metric === "Pace of change") {
    let periodText;
    switch (timePeriod) {
      case "Daily":
        periodText = "dag";
        break;
      case "Weekly":
        periodText = "uke";
        break;
      case "Monthly":
        periodText = "måned";
        break;
      case "Last 30 days":
        periodText = "siste 30 dagene";
        break;
      case "23.02.2022 to date":
        periodText = "dag";
        break;
      default:
        periodText = "periode";
    }
    return `Russisk-okkupert territorium per ${periodText}, km²`;
  }
  
  switch(metric) {
    case "Area change": return "Total Change (km²)";
    case "Average pace": return "Average Daily Change (km²)";
    case "Top 5 Changes": return "Change (km²)";
    default: return metric;
  }
}

function updateSummaryStats(sheet, rawData) {
  var latestData = rawData[rawData.length - 1];
  var summaryStats = [
    ["Total area currently occupied", Number(latestData[9]).toFixed(2) + " km²"],
    ["Percentage of Ukraine currently occupied", Number(latestData[10]).toFixed(2) + "%"],
    ["Historical maximum occupied", findMaxOccupied(rawData)],
    ["Total area of Ukraine", "603,548 km²"]
  ];
  sheet.getRange("E2:F6").setValues(summaryStats);
}

function findMaxOccupied(data) {
  var max = data.reduce((max, row) => {
    var percent = Number(row[10]);
    return !isNaN(percent) && percent > max.percent ? {percent: percent, date: row[1]} : max;
  }, {percent: 0, date: null});
  return max.percent.toFixed(2) + "% on " + convertToNorwegianDateFormat(max.date);
}

function findMinOccupied(data) {
  var min = data.reduce((min, row) => {
    var percent = Number(row[10]);
    return !isNaN(percent) && percent < min.percent ? {percent: percent, date: row[1]} : min;
  }, {percent: 100, date: null});
  return min.percent.toFixed(2) + "% on " + convertToNorwegianDateFormat(min.date);
}

function updateDatawrapperFields(sheet, processedData, metric) {
  var description = generateDescription(processedData, metric);
  sheet.getRange("E8:M8").setValue(description);
}

function generateDescription(data, metric) {
  var startDate = convertToNorwegianDateFormat(data[0][0]);
  var endDate = convertToNorwegianDateFormat(data[data.length - 1][0]);
  var totalChange = (data[data.length - 1][1] - data[0][1]).toFixed(2);
  
  return `Data shows ${metric} from ${startDate} to ${endDate}. ` +
         `Total change: ${totalChange} km².`;
}

function convertToNorwegianDateFormat(date) {
  if (!(date instanceof Date)) {
    Logger.log("Invalid date: " + date);
    return "Invalid Date";
  }
  return Utilities.formatDate(date, "GMT+2", "dd.MM.yyyy");
}

function onUpdateButtonClick() {
  updateChartData();
}