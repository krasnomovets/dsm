function fetchAndSaveNewDataTop() {
  var ss = SpreadsheetApp.openById('1P4AznA1gE1Ch_IXhhe6FyFVOoceeAbYBNp8IqdXJm2M');
  var sheet = ss.getSheetByName('Raw Data');

  var historyUrl = ''; 	//HISTORY ENDPOINT URL
  var historyResponse = UrlFetchApp.fetch(historyUrl);
  var historyData = JSON.parse(historyResponse.getContentText());

  var lastFetchedId = sheet.getRange("A2").getValue();

  var newIds = historyData.filter(function(item) {
    return String(item.id) > String(lastFetchedId);
  }).sort(function(a, b) {
    return b.id - a.id;
  });

  if (newIds.length > 0) {
    newIds.forEach(function(item) {
      var areaUrl = 'HISTORY ENDPOINT URL' + item.id + '/areas';
      var areaResponse = UrlFetchApp.fetch(areaUrl);
      var areaData = JSON.parse(areaResponse.getContentText());

      var rowData = {
        id: item.id,
        date: Utilities.formatDate(new Date(item.createdAt), Session.getScriptTimeZone(), "MM/dd/yyyy HH:mm:ss"),
        unspecifiedArea: 0, // Initialize unspecified area
        liberatedKm2: 0,
        liberatedPercent: 0,
        occupiedBeforeKm2: 42495.4112,
        occupiedBeforePercent: 7.04,
        occupiedAfterKm2: 0,
        occupiedAfterPercent: 0,
        currentlyOccupiedKm2: 0,
        currentlyOccupiedPercent: 0
      };

      areaData.forEach(function(area) {
        switch(area.type) {
          case 'liberated':
            rowData.liberatedKm2 = area.area;
            rowData.liberatedPercent = parseFloat(area.percent);
            break;
          case 'occupied_after_24_02_2022':
            rowData.occupiedAfterKm2 = area.area;
            rowData.occupiedAfterPercent = parseFloat(area.percent);
            break;
          case 'unspecified':
            rowData.unspecifiedArea = area.area; // Capture the unspecified area
            break;
        }
      });

      rowData.currentlyOccupiedKm2 = rowData.occupiedBeforeKm2 + rowData.occupiedAfterKm2;
      rowData.currentlyOccupiedPercent = rowData.occupiedBeforePercent + rowData.occupiedAfterPercent;

      var row = [
        rowData.id,
        rowData.date,
        rowData.unspecifiedArea, // Gray zone with contested territory control
        rowData.liberatedKm2,
        rowData.liberatedPercent,
        rowData.occupiedBeforeKm2,
        rowData.occupiedBeforePercent,
        rowData.occupiedAfterKm2,
        rowData.occupiedAfterPercent,
        rowData.currentlyOccupiedKm2,
        rowData.currentlyOccupiedPercent.toFixed(2)
      ];

      sheet.insertRowBefore(2);
      sheet.getRange('A2:K2').setValues([row]); // Adjusted range to 'A2:K2' to include the new column
    });

    sheet.getRange('B:B').setNumberFormat("MM/dd/yyyy HH:mm:ss");
  }
}
