// A mapping from Hebrew month number to its Gregorian equivalent (for sorting)
const HEBREW_MONTH_DATA = {
  "01": ["Tishrei", 9], "02": ["Cheshvan", 10], "03": ["Kislev", 11], 
  "04": ["Teves", 12], "05": ["Shevat", 1], "06": ["Adar", 2], 
  "06a": ["Adar I", 2], "06b": ["Adar II", 3], "07": ["Nissan", 4], 
  "08": ["Iyar", 5], "09": ["Sivan", 6], "10": ["Tammuz", 7], 
  "11": ["Av", 8], "12": ["Elul", 9]
};

function getConfig() {
  const properties = PropertiesService.getScriptProperties();
  return {
    INCOMING_FOLDER_ID: '1vBpHXAWRNieFedontBuWAej63R6juzvf',
    PROCESSED_FOLDER_ID: '1qFrN5FutbvU6FmN5bjol1CGHVXh0-q99',
    SUPABASE_URL: 'https://qvoxpfigbukidlmshiei.supabase.co',
    SUPABASE_SERVICE_KEY: properties.getProperty('SUPABASE_SERVICE_KEY'),
  };
}

function processNewPdfsForDownload() {
  Logger.log('--- Script starting: Checking for new files... ---');
  const CONFIG = getConfig();
  const incomingFolder = DriveApp.getFolderById(CONFIG.INCOMING_FOLDER_ID);
  const processedFolder = DriveApp.getFolderById(CONFIG.PROCESSED_FOLDER_ID);
  const files = incomingFolder.getFilesByType(MimeType.PDF);

  if (!files.hasNext()) {
    Logger.log('No new files found. Script finished.');
    return;
  }

  while (files.hasNext()) {
    const file = files.next();
    const fileName = file.getName();
    Logger.log(`Processing file: ${fileName}`);

    try {
      // Step 1: Make the file public and get its download URL
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      const downloadUrl = `https://drive.google.com/uc?export=download&id=${file.getId()}`;
      
      // Step 2: Perform an "UPSERT" operation on the database.
      // This will UPDATE the record if it exists, or INSERT it if it doesn't.
      upsertToSupabase(fileName, downloadUrl);

      // Step 3: Move the file after successful processing
      file.moveTo(processedFolder);
      Logger.log(`--- ✅ Successfully processed and moved ${fileName} ---`);

    } catch (e) {
      Logger.log(`--- ❌ An error occurred for ${fileName}: ${e.toString()} ---`);
    }
  }
}

/**
 * =================================================================
 * HELPER FUNCTIONS
 * =================================================================
 */

function calculateSortDate(hebrewYearStr, monthNumber) {
  const hebrewYear = parseInt(hebrewYearStr, 10);
  const gregorianMonth = HEBREW_MONTH_DATA[monthNumber][1];
  let gregorianYear = hebrewYear - 3761;
  if (gregorianMonth < 9) {
    gregorianYear = hebrewYear - 3760;
  }
  return `${gregorianYear}-${String(gregorianMonth).padStart(2, '0')}-01`;
}

// *** NEW AND IMPROVED UPSERT FUNCTION ***
function upsertToSupabase(fileName, downloadUrl) {
  const CONFIG = getConfig();
  
  // Prepare all the data from the file name
  const baseName = fileName.replace('.pdf', '');
  const parts = baseName.split('_');
  const hebrewYear = parts[0];
  const monthNumber = parts[1];
  const hebrewMonthName = HEBREW_MONTH_DATA[monthNumber] ? HEBREW_MONTH_DATA[monthNumber][0] : "Unknown";
  const displayName = `${hebrewMonthName} ${hebrewYear}`;
  const sortableDate = calculateSortDate(hebrewYear, monthNumber);

  const dataToUpsert = {
    file_name: displayName,       // This will be the unique key
    year_hebrew: hebrewYear,
    file_path: downloadUrl,
    sortable_date: sortableDate
  };
  
  // Supabase REST API has a special header for performing an upsert.
  // We tell it to use the 'file_name' column to check for duplicates.
  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'apikey': CONFIG.SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${CONFIG.SUPABASE_SERVICE_KEY}`,
      'Prefer': 'resolution=merge-duplicates' // This is the magic header for upsert
    },
    payload: JSON.stringify(dataToUpsert),
    muteHttpExceptions: true,
  };
  
  // We specify the unique column in the URL using 'on_conflict'
  const upsertUrl = `${CONFIG.SUPABASE_URL}/rest/v1/schedules?on_conflict=file_name`;
  
  Logger.log(`Upserting data for "${displayName}" to Supabase.`);
  const response = UrlFetchApp.fetch(upsertUrl, options);
  
  if (response.getResponseCode() >= 400) {
    throw new Error(`Supabase API Error during upsert: ${response.getContentText()}`);
  } else {
    Logger.log(`Successfully upserted data for "${displayName}".`);
  }
}

function runTest() {
  processNewPdfsForDownload();
}