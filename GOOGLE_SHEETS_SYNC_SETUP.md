# Google Sheets Sync Setup Guide

## Overview
This guide will help you set up bidirectional sync between your Supabase database and Google Sheets.

## Setup Instructions

### Step 1: Open Your Google Sheet
Open your Google Sheet: https://docs.google.com/spreadsheets/d/1MChpuy2HJ2YRvmNNMHNSmTSxxbOI3sWgfyCaxae8uMY/edit

### Step 2: Open Apps Script Editor
1. Click on **Extensions** → **Apps Script**
2. Delete any existing code
3. Copy and paste the Apps Script code below

### Step 3: Configure Your Credentials
In the Apps Script code, update these values:
```javascript
const SUPABASE_URL = 'https://coacymsqarronnlytceu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvYWN5bXNxYXJyb25ubHl0Y2V1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIxMzAxNzIsImV4cCI6MjA2NzcwNjE3Mn0.0Cw2EZ6jkBEMMLZ4qsdErYJesp6VjoQ1tQvbY27qIe8';
const USER_EMAIL = 'your-email@example.com'; // Your Supabase login email
const USER_PASSWORD = 'your-password'; // Your Supabase password
```

### Step 4: Apps Script Code

```javascript
// ===========================
// CONFIGURATION
// ===========================
const SUPABASE_URL = 'https://coacymsqarronnlytceu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvYWN5bXNxYXJyb25ubHl0Y2V1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIxMzAxNzIsImV4cCI6MjA2NzcwNjE3Mn0.0Cw2EZ6jkBEMMLZ4qsdErYJesp6VjoQ1tQvbY27qIe8';

// UPDATE THESE WITH YOUR CREDENTIALS
const USER_EMAIL = 'your-email@example.com';
const USER_PASSWORD = 'your-password';

// Sheet configuration
const SHEET_CONFIG = {
  'Orders': { table: 'orders', dateColumn: 'order_date' },
  'Expenses': { table: 'expenses', dateColumn: 'expense_date' },
  'Deposits': { table: 'deposits', dateColumn: 'deposit_date' },
  'Withdrawals': { table: 'withdrawals', dateColumn: 'withdrawal_date' },
  'Charging': { table: 'charging_sessions', dateColumn: 'session_date' },
  'Savings': { table: 'cooperative_savings', dateColumn: 'contribution_date' },
  'Daily Summary': { table: 'daily_summary', dateColumn: 'summary_date' }
};

// ===========================
// AUTHENTICATION
// ===========================
function getAccessToken() {
  const scriptProperties = PropertiesService.getScriptProperties();
  let token = scriptProperties.getProperty('access_token');
  const expiresAt = scriptProperties.getProperty('token_expires_at');
  
  // Check if token is still valid
  if (token && expiresAt && new Date().getTime() < parseInt(expiresAt)) {
    return token;
  }
  
  // Login to get new token
  const loginUrl = `${SUPABASE_URL}/auth/v1/token?grant_type=password`;
  const loginOptions = {
    method: 'post',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Content-Type': 'application/json'
    },
    payload: JSON.stringify({
      email: USER_EMAIL,
      password: USER_PASSWORD
    }),
    muteHttpExceptions: true
  };
  
  const response = UrlFetchApp.fetch(loginUrl, loginOptions);
  const data = JSON.parse(response.getContentText());
  
  if (data.access_token) {
    token = data.access_token;
    const expiresIn = data.expires_in || 3600;
    const expiresAt = new Date().getTime() + (expiresIn * 1000);
    
    scriptProperties.setProperty('access_token', token);
    scriptProperties.setProperty('token_expires_at', expiresAt.toString());
    
    return token;
  }
  
  throw new Error('Failed to authenticate: ' + JSON.stringify(data));
}

// ===========================
// SYNC FROM DATABASE TO SHEETS
// ===========================
function syncFromDatabase() {
  const token = getAccessToken();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  Object.keys(SHEET_CONFIG).forEach(sheetName => {
    const config = SHEET_CONFIG[sheetName];
    let sheet = ss.getSheetByName(sheetName);
    
    // Create sheet if it doesn't exist
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
    }
    
    // Fetch data from Supabase
    const url = `${SUPABASE_URL}/functions/v1/sync-to-sheets`;
    const options = {
      method: 'post',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify({
        table: config.table
      }),
      muteHttpExceptions: true
    };
    
    try {
      const response = UrlFetchApp.fetch(url, options);
      const result = JSON.parse(response.getContentText());
      
      if (result.error) {
        Logger.log(`Error syncing ${sheetName}: ${result.error}`);
        return;
      }
      
      const data = result.data;
      
      if (data && data.length > 0) {
        // Clear existing data (except header row)
        if (sheet.getLastRow() > 1) {
          sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).clear();
        }
        
        // Write headers
        const headers = Object.keys(data[0]);
        sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
        sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
        
        // Write data
        const rows = data.map(row => headers.map(header => row[header] || ''));
        sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
        
        Logger.log(`Synced ${rows.length} rows to ${sheetName}`);
      }
    } catch (error) {
      Logger.log(`Error syncing ${sheetName}: ${error.message}`);
    }
  });
  
  SpreadsheetApp.getActiveSpreadsheet().toast('Sync from database completed!');
}

// ===========================
// SYNC FROM SHEETS TO DATABASE
// ===========================
function syncToDatabase() {
  const token = getAccessToken();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const activeSheet = ss.getActiveSheet();
  const sheetName = activeSheet.getName();
  
  if (!SHEET_CONFIG[sheetName]) {
    SpreadsheetApp.getUi().alert('This sheet is not configured for sync. Please check SHEET_CONFIG.');
    return;
  }
  
  const config = SHEET_CONFIG[sheetName];
  const lastRow = activeSheet.getLastRow();
  const lastCol = activeSheet.getLastColumn();
  
  if (lastRow < 2) {
    SpreadsheetApp.getUi().alert('No data to sync.');
    return;
  }
  
  // Get headers and data
  const headers = activeSheet.getRange(1, 1, 1, lastCol).getValues()[0];
  const data = activeSheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
  
  let successCount = 0;
  let errorCount = 0;
  
  // Process each row
  data.forEach((row, index) => {
    const rowData = {};
    headers.forEach((header, colIndex) => {
      if (row[colIndex] !== '') {
        rowData[header] = row[colIndex];
      }
    });
    
    // Skip empty rows
    if (Object.keys(rowData).length === 0) return;
    
    // Determine operation (insert if no ID, update if ID exists)
    const operation = rowData.id ? 'update' : 'insert';
    const id = rowData.id;
    
    // Remove id from data for insert
    if (operation === 'insert') {
      delete rowData.id;
    }
    
    // Call sync-from-sheets function
    const url = `${SUPABASE_URL}/functions/v1/sync-from-sheets`;
    const options = {
      method: 'post',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify({
        table: config.table,
        operation: operation,
        data: rowData,
        id: id
      }),
      muteHttpExceptions: true
    };
    
    try {
      const response = UrlFetchApp.fetch(url, options);
      const result = JSON.parse(response.getContentText());
      
      if (result.error) {
        Logger.log(`Error syncing row ${index + 2}: ${result.error}`);
        errorCount++;
      } else {
        successCount++;
        
        // Update ID in sheet if it was an insert
        if (operation === 'insert' && result.data && result.data[0] && result.data[0].id) {
          const idColIndex = headers.indexOf('id');
          if (idColIndex !== -1) {
            activeSheet.getRange(index + 2, idColIndex + 1).setValue(result.data[0].id);
          }
        }
      }
    } catch (error) {
      Logger.log(`Error syncing row ${index + 2}: ${error.message}`);
      errorCount++;
    }
  });
  
  SpreadsheetApp.getActiveSpreadsheet().toast(
    `Sync completed! Success: ${successCount}, Errors: ${errorCount}`
  );
}

// ===========================
// MENU FUNCTIONS
// ===========================
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('🔄 Database Sync')
    .addItem('⬇️ Sync FROM Database', 'syncFromDatabase')
    .addItem('⬆️ Sync TO Database', 'syncToDatabase')
    .addSeparator()
    .addItem('⚙️ Setup Auto Sync', 'setupAutoSync')
    .addToUi();
}

// ===========================
// AUTO SYNC TRIGGER
// ===========================
function setupAutoSync() {
  // Delete existing triggers
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => ScriptApp.deleteTrigger(trigger));
  
  // Create new trigger - sync from database every hour
  ScriptApp.newTrigger('syncFromDatabase')
    .timeBased()
    .everyHours(1)
    .create();
  
  SpreadsheetApp.getUi().alert('Auto sync enabled! Data will sync from database every hour.');
}
```

### Step 5: First Time Setup
1. Save the script (Ctrl+S or Cmd+S)
2. Click on **onOpen** function and run it to create the menu
3. Authorize the script when prompted
4. Refresh your Google Sheet
5. You should see a new menu "🔄 Database Sync"

### Step 6: Using the Sync
1. **Sync FROM Database** (⬇️): Pulls all data from Supabase to Google Sheets
2. **Sync TO Database** (⬆️): Pushes changes from the active sheet to Supabase
3. **Setup Auto Sync** (⚙️): Enables hourly automatic sync from database

## Sheet Structure
The script will create/update these sheets:
- **Orders**: All order transactions
- **Expenses**: All expense records
- **Deposits**: All deposit records
- **Withdrawals**: All withdrawal records
- **Charging**: All charging sessions
- **Savings**: Cooperative savings contributions
- **Daily Summary**: Daily financial summaries

## Important Notes
1. **Authentication**: Make sure to update USER_EMAIL and USER_PASSWORD with your actual credentials
2. **Security**: This script stores your credentials in Script Properties. Keep your sheet private.
3. **Auto Sync**: Auto sync only works FROM database TO sheets. Manual sync is required for sheets TO database.
4. **ID Column**: Never delete the 'id' column - it's used to match records between sheets and database
5. **Date Formats**: Make sure dates are in YYYY-MM-DD format

## Troubleshooting
- If sync fails, check the execution log: **View** → **Execution log**
- Make sure your Supabase credentials are correct
- Ensure your user account has the necessary permissions in the database
- Check that RLS policies allow your user to access the data

## Edge Functions
Two edge functions have been created:
1. `sync-to-sheets`: Exports data from Supabase to Google Sheets
2. `sync-from-sheets`: Imports data from Google Sheets to Supabase

These functions are automatically deployed and secured with authentication.
