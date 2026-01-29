/**
 * BuckyDrop Shipping Rate Calculator for Google Sheets (Proxy Version)
 * 
 * This script calls your proxy server (running on a fixed IP) instead of
 * calling BuckyDrop directly. The proxy server handles the HMAC authentication
 * and forwards requests to BuckyDrop.
 *
 * MAPPING:
 * INPUT: AF (Weight KG), AG (Height MM), AH (Diameter MM), AS (Category Code)
 * OUTPUT: AT (Shipping Rates)
 *
 * NOTE: This version includes detailed logging to a "Debug Log" sheet for troubleshooting.
 */

// --- CONFIGURATION ---
const CONFIG = {
  // Your Cloudflare Worker URL
  PROXY_URL: "https://spm-shipping-rates.mpmchugh91.workers.dev",
  
  TARGET_SHEET_NAME: "Products", // Assumes your main product data sheet is named "Products"
  DEBUG_SHEET_NAME: "Debug Log", 
  
  // Hardcoded destination for testing (Australia, Postcode 3189)
  DESTINATION: {
    lang: "en",
    country: "Australia",
    countryCode: "AU",
    provinceCode: "VIC", 
    province: "Victoria",
    detailAddress: "18 Joan St Moorabbin", 
    postCode: "3189",
  },
};

/**
 * Main function to read data, call proxy API, and write results.
 */
function calculateBuckyDropRates() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.TARGET_SHEET_NAME);
  if (!sheet) {
    SpreadsheetApp.getUi().alert("Error: Target Sheet not found. Check TARGET_SHEET_NAME in config.");
    return;
  }
  
  // Setup Debug Log Sheet
  let debugSheet = ss.getSheetByName(CONFIG.DEBUG_SHEET_NAME);
  if (!debugSheet) {
    debugSheet = ss.insertSheet(CONFIG.DEBUG_SHEET_NAME);
  }
  debugSheet.clear();
  debugSheet.appendRow(['Timestamp', 'Row #', 'Status', 'Request Body', 'Response Code', 'Response Text/Error']);
  
  
  // Define column indices: A=1, B=2... AF=32, AG=33, AH=34, AS=45.
  const START_COLUMN_INDEX = 32; // AF
  const NUM_COLUMNS = 14;        // From AF to AS (32 to 45)
  const OUTPUT_COLUMN_INDEX = 46; // AT
  
  // Read range from AF2 to AS[LastRow]. Data starts in Row 2.
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    SpreadsheetApp.getUi().alert("Error: No data found starting from Row 2.");
    return;
  }
  const dataRange = sheet.getRange(2, START_COLUMN_INDEX, lastRow - 1, NUM_COLUMNS);
  const data = dataRange.getValues();
  
  const results = [];
  
  // Loop through each product row
  for (let i = 0; i < data.length; i++) {
    const sheetRowNumber = i + 2;
    const row = data[i];
    
    // Array indexing is relative to the range read (AF-AS).
    const weight_kg = parseFloat(row[0]);    // AF (Index 0)
    const height_mm = parseFloat(row[1]);    // AG (Index 1)
    const diameter_mm = parseFloat(row[2]);  // AH (Index 2)
    const categoryCode = row[13] ? row[13].toString().trim() : 'other'; // AS (Index 13), defaults to 'other' if empty

    let logStatus = 'OK';
    let logError = '';
    
    if (isNaN(weight_kg) || isNaN(height_mm) || isNaN(diameter_mm) || !categoryCode) {
      const errorMessage = "Error: Missing or Invalid Data in Weight/Dimensions/Category Code.";
      results.push([errorMessage]);
      logStatus = 'DATA ERROR';
      logError = errorMessage;
    } else {

      // Convert MM to CM for API
      const length_cm = (diameter_mm / 10).toFixed(2);
      const width_cm = (diameter_mm / 10).toFixed(2);
      const height_cm = (height_mm / 10).toFixed(2);
      
      const productList = [{
        length: parseFloat(length_cm),
        width: parseFloat(width_cm),
        height: parseFloat(height_cm),
        weight: parseFloat(weight_kg.toFixed(3)),
        count: 1,
        categoryCode: categoryCode,
      }];
      
      // Request body for Cloudflare Worker
      // The worker expects the full payload structure that BuckyDrop needs
      const requestBody = {
        ...CONFIG.DESTINATION,
        productList: productList,
        size: 10,
        current: 1,
        orderBy: "price",
        orderType: "asc",
      };
      
      try {
        const rates = fetchShippingRatesViaProxy(requestBody, sheetRowNumber, debugSheet);
        results.push([rates]);
      } catch(e) {
        logStatus = 'API FAIL';
        logError = e.message;
        results.push(["API Error: " + e.message]);
      }
    }
    
    // Log the error/status to the debug sheet if it was a data error
    if (logStatus === 'DATA ERROR') {
       debugSheet.appendRow([
        new Date(), 
        sheetRowNumber, 
        logStatus, 
        'N/A', 
        'N/A', 
        logError
      ]);
    }
  }

  // Write results back to column AT (index 46) starting from Row 2
  if (results.length > 0) {
    sheet.getRange(2, OUTPUT_COLUMN_INDEX, results.length, 1).setValues(results);
    SpreadsheetApp.getUi().alert("Finished calculating shipping rates for " + results.length + " products. Check 'Debug Log' sheet for details.");
  }
}

/**
 * Calls the proxy server to fetch shipping rates.
 * The proxy server handles HMAC authentication and forwards to BuckyDrop.
 */
function fetchShippingRatesViaProxy(requestBody, sheetRowNumber, debugSheet) {
  const requestBodyStr = JSON.stringify(requestBody);
  
  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: requestBodyStr,
    muteHttpExceptions: true,
  };

  let response;
  try {
    response = UrlFetchApp.fetch(CONFIG.PROXY_URL, options);
  } catch (e) {
    // Log the network error
    debugSheet.appendRow([
      new Date(), 
      sheetRowNumber, 
      'NETWORK ERROR', 
      requestBodyStr, 
      'N/A', 
      e.toString()
    ]);
    throw new Error(`Network failed: ${e.message}`);
  }

  const responseCode = response.getResponseCode();
  const responseText = response.getContentText();
  let jsonResponse;
  
  try {
    jsonResponse = JSON.parse(responseText);
  } catch (e) {
    // Log parsing error
    debugSheet.appendRow([
      new Date(), 
      sheetRowNumber, 
      'JSON ERROR', 
      requestBodyStr, 
      responseCode, 
      responseText
    ]);
    throw new Error(`Failed to parse API response. Raw Text: ${responseText}`);
  }

  // Log the successful request and response for review
  debugSheet.appendRow([
    new Date(), 
    sheetRowNumber, 
    'SUCCESS/CHECK INFO', 
    requestBodyStr, 
    responseCode, 
    responseText
  ]);

  if (responseCode !== 200) {
    throw new Error(`HTTP Code ${responseCode}: ${jsonResponse.error || jsonResponse.info || 'Server Error'}`);
  }

  // Cloudflare Worker returns the raw BuckyDrop response
  if (!jsonResponse.success) {
    throw new Error(`BuckyDrop Error: ${jsonResponse.info || 'Unknown error'} (Code: ${jsonResponse.code || 'N/A'})`);
  }
  
  // Format the rates from BuckyDrop's response structure
  if (!jsonResponse.data || !jsonResponse.data.records || jsonResponse.data.records.length === 0) {
    return `No rates found. Info: ${jsonResponse.info || 'Check product dimensions/category code.'}`;
  }

  // Format the rates summary for Google Sheets
  const ratesSummary = jsonResponse.data.records.map(record => {
    const priceRMB = record.totalPrice ? record.totalPrice.toFixed(2) : 'N/A';
    const minTime = record.minTimeInTransit || 'N/A';
    const maxTime = record.maxTimeInTransit || 'N/A';
    return `${record.serviceName} (${minTime}-${maxTime} days): ¥${priceRMB}`;
  }).join(' | ');

  return ratesSummary;
}

/**
 * Creates a custom menu in Google Sheets to run the script easily.
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('SPM Tools')
      .addItem('Calculate Shipping Rates', 'calculateBuckyDropRates')
      .addToUi();
}

