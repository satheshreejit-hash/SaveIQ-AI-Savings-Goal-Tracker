/**
 * SaveIQ - AI Savings Goal Tracker
 * Google Apps Script Backend (Code.js)
 * 
 * Features:
 * - Google Sheet automated database management (Goals & Deposits)
 * - RESTful Web App API (doGet / doPost)
 * - Groq AI Integration (LLaMA-3.3-70b / LLaMA-3.1-8b)
 * - Daily Automated Deadline Audits & Gmail Alert Dispatcher
 */

// ==========================================
// CONFIGURATION & CONSTANTS
// ==========================================
const CONFIG = {
  SHEET_NAMES: {
    GOALS: 'Goals',
    DEPOSITS: 'Deposits',
    AUDIT_LOGS: 'AuditLogs'
  },
  GROQ: {
    ENDPOINT: 'https://api.groq.com/openai/v1/chat/completions',
    MODEL: 'llama-3.3-70b-versatile',
    FALLBACK_MODEL: 'llama-3.1-8b-instant'
  },
  ALERT_THRESHOLDS: {
    APPROACHING_DAYS: 7,
    CRITICAL_DAYS: 3,
    OVERDUE_DAYS: 0
  },
  APP_NAME: 'SaveIQ',
  APP_URL: 'https://saveiq.app'
};

// ==========================================
// WEB APP ENTRY POINTS (REST API & UI)
// ==========================================

/**
 * Handle HTTP GET Requests
 * Supports both JSON API query parameters and HTML UI delivery
 */
function doGet(e) {
  try {
    const action = e && e.parameter ? e.parameter.action : null;

    // Handle JSON API Actions
    if (action === 'getGoals') {
      return createJsonResponse({ status: 'success', data: getGoals() });
    } else if (action === 'getDeposits') {
      const goalId = e.parameter.goalId || null;
      return createJsonResponse({ status: 'success', data: getDeposits(goalId) });
    } else if (action === 'getAiInsight') {
      const goalId = e.parameter.goalId;
      const userApiKey = e.parameter.apiKey || null;
      if (!goalId) {
        return createJsonResponse({ status: 'error', message: 'Missing goalId parameter' }, 400);
      }
      return createJsonResponse({ status: 'success', data: getGroqRecommendation(goalId, userApiKey) });
    } else if (action === 'triggerAudit') {
      const auditResult = dailyDeadlineAudit();
      return createJsonResponse({ status: 'success', data: auditResult });
    } else if (action === 'ping') {
      return createJsonResponse({
        status: 'success',
        message: 'SaveIQ API is active',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      });
    }

    // Default: Return Web App HTML (if index.html exists in project)
    return HtmlService.createHtmlOutputFromFile('index')
      .setTitle('SaveIQ – AI Savings Goal Tracker')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');

  } catch (err) {
    Logger.log('Error in doGet: ' + err.toString());
    return createJsonResponse({ status: 'error', message: err.toString() }, 500);
  }
}

/**
 * Handle HTTP POST Requests
 * Accepts JSON payloads for creating goals, logging deposits, updating, and deleting
 */
function doPost(e) {
  try {
    let payload;
    if (e.postData && e.postData.contents) {
      payload = JSON.parse(e.postData.contents);
    } else if (e.parameter) {
      payload = e.parameter;
    } else {
      return createJsonResponse({ status: 'error', message: 'No payload provided' }, 400);
    }

    const action = payload.action;

    switch (action) {
      case 'createGoal':
        const newGoal = addGoal(payload.data);
        return createJsonResponse({ status: 'success', message: 'Goal created successfully', data: newGoal });

      case 'updateGoal':
        const updatedGoal = updateGoal(payload.goalId, payload.data);
        return createJsonResponse({ status: 'success', message: 'Goal updated successfully', data: updatedGoal });

      case 'deleteGoal':
        const deleteResult = deleteGoal(payload.goalId);
        return createJsonResponse({ status: 'success', message: 'Goal deleted successfully', data: deleteResult });

      case 'addDeposit':
        const depositResult = addDeposit(payload.goalId, payload.amount, payload.note);
        return createJsonResponse({ status: 'success', message: 'Deposit recorded successfully', data: depositResult });

      case 'getAiInsight':
        const aiInsight = getGroqRecommendation(payload.goalId, payload.apiKey);
        return createJsonResponse({ status: 'success', data: aiInsight });

      case 'setupSheet':
        setupSheet();
        return createJsonResponse({ status: 'success', message: 'Google Sheet initialized with schema & sample data' });

      default:
        return createJsonResponse({ status: 'error', message: 'Unknown action: ' + action }, 400);
    }
  } catch (err) {
    Logger.log('Error in doPost: ' + err.toString());
    return createJsonResponse({ status: 'error', message: err.toString() }, 500);
  }
}

/**
 * Helper to construct JSON response with CORS headers
 */
function createJsonResponse(data, statusCode) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ==========================================
// GOOGLE SHEETS DATABASE INITIALIZATION
// ==========================================

/**
 * Initializes the required Sheet tabs, headers, formatting, and sample goals.
 * Can be run manually from the Apps Script editor or via API action.
 */
function setupSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // 1. Setup 'Goals' sheet
  let goalsSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.GOALS);
  if (!goalsSheet) {
    goalsSheet = ss.insertSheet(CONFIG.SHEET_NAMES.GOALS);
  }
  goalsSheet.clear();

  const goalHeaders = [
    'Goal ID',
    'Goal Name',
    'Target Amount',
    'Current Savings',
    'Deadline',
    'Email Alerts',
    'Alert Email',
    'Purpose',
    'Status',
    'Created At',
    'Last Updated'
  ];

  goalsSheet.getRange(1, 1, 1, goalHeaders.length).setValues([goalHeaders]);
  formatHeaderRow(goalsSheet, goalHeaders.length);

  // Sample initial goals
  const today = new Date();
  const datePlusDays = (days) => {
    const d = new Date(today);
    d.setDate(d.getDate() + days);
    return Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  };

  const sampleGoals = [
    [
      'GOAL-1001',
      'Emergency Fund',
      5000,
      3200,
      datePlusDays(45),
      'TRUE',
      Session.getActiveUser().getEmail() || 'user@example.com',
      'Emergency Fund',
      'Active',
      new Date().toISOString(),
      new Date().toISOString()
    ],
    [
      'GOAL-1002',
      'M3 MacBook Pro',
      2400,
      1800,
      datePlusDays(14),
      'TRUE',
      Session.getActiveUser().getEmail() || 'user@example.com',
      'Tech & Gadgets',
      'Active',
      new Date().toISOString(),
      new Date().toISOString()
    ],
    [
      'GOAL-1003',
      'Japan Cherry Blossom Vacation',
      3500,
      950,
      datePlusDays(5), // Approaching deadline for alert testing
      'TRUE',
      Session.getActiveUser().getEmail() || 'user@example.com',
      'Travel & Vacation',
      'Active',
      new Date().toISOString(),
      new Date().toISOString()
    ]
  ];

  goalsSheet.getRange(2, 1, sampleGoals.length, goalHeaders.length).setValues(sampleGoals);

  // 2. Setup 'Deposits' sheet
  let depositsSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.DEPOSITS);
  if (!depositsSheet) {
    depositsSheet = ss.insertSheet(CONFIG.SHEET_NAMES.DEPOSITS);
  }
  depositsSheet.clear();

  const depositHeaders = [
    'Deposit ID',
    'Goal ID',
    'Goal Name',
    'Amount',
    'Date',
    'Note'
  ];
  depositsSheet.getRange(1, 1, 1, depositHeaders.length).setValues([depositHeaders]);
  formatHeaderRow(depositsSheet, depositHeaders.length);

  const sampleDeposits = [
    ['DEP-501', 'GOAL-1001', 'Emergency Fund', 1200, datePlusDays(-20), 'Initial deposit'],
    ['DEP-502', 'GOAL-1001', 'Emergency Fund', 2000, datePlusDays(-10), 'Monthly salary transfer'],
    ['DEP-503', 'GOAL-1002', 'M3 MacBook Pro', 1800, datePlusDays(-5), 'Freelance bonus'],
    ['DEP-504', 'GOAL-1003', 'Japan Cherry Blossom Vacation', 950, datePlusDays(-2), 'Tax refund allocation']
  ];
  depositsSheet.getRange(2, 1, sampleDeposits.length, depositHeaders.length).setValues(sampleDeposits);

  // 3. Setup 'AuditLogs' sheet
  let auditSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.AUDIT_LOGS);
  if (!auditSheet) {
    auditSheet = ss.insertSheet(CONFIG.SHEET_NAMES.AUDIT_LOGS);
  }
  auditSheet.clear();

  const auditHeaders = [
    'Timestamp',
    'Total Goals Checked',
    'Alerts Sent',
    'Details'
  ];
  auditSheet.getRange(1, 1, 1, auditHeaders.length).setValues([auditHeaders]);
  formatHeaderRow(auditSheet, auditHeaders.length);

  Logger.log('SaveIQ Sheet initialized successfully.');
}

function formatHeaderRow(sheet, numColumns) {
  const headerRange = sheet.getRange(1, 1, 1, numColumns);
  headerRange.setBackground('#1e1b4b'); // Deep indigo
  headerRange.setFontColor('#ffffff');
  headerRange.setFontWeight('bold');
  headerRange.setFontFamily('Inter');
  sheet.setFrozenRows(1);
  for (let i = 1; i <= numColumns; i++) {
    sheet.autoResizeColumn(i);
  }
}

// ==========================================
// SAVINGS GOAL MANAGEMENT (CRUD)
// ==========================================

/**
 * Retrieve all goals with computed analytics
 */
function getGoals() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEET_NAMES.GOALS);
  if (!sheet) return [];

  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  const headers = data[0];
  const goals = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[0]) continue; // Skip empty rows

    const goalId = String(row[0]);
    const goalName = String(row[1]);
    const targetAmount = Number(row[2]) || 0;
    const currentSavings = Number(row[3]) || 0;
    const deadlineStr = formatDateString(row[4]);
    const emailAlerts = String(row[5]).toUpperCase() === 'TRUE';
    const alertEmail = String(row[6]);
    const purpose = String(row[7]);
    let status = String(row[8]);

    // Computed properties
    const remainingAmount = Math.max(0, targetAmount - currentSavings);
    const progressPct = targetAmount > 0 ? Math.min(100, Math.round((currentSavings / targetAmount) * 100)) : 0;

    const deadlineDate = new Date(deadlineStr);
    deadlineDate.setHours(0, 0, 0, 0);
    const diffTime = deadlineDate.getTime() - today.getTime();
    const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // Dynamic status determination
    if (currentSavings >= targetAmount) {
      status = 'Completed';
    } else if (daysRemaining < 0) {
      status = 'Overdue';
    } else if (daysRemaining <= CONFIG.ALERT_THRESHOLDS.APPROACHING_DAYS) {
      status = 'Approaching';
    } else {
      status = 'Active';
    }

    const requiredDaily = daysRemaining > 0 ? (remainingAmount / daysRemaining).toFixed(2) : remainingAmount.toFixed(2);
    const requiredWeekly = daysRemaining > 0 ? ((remainingAmount / daysRemaining) * 7).toFixed(2) : (remainingAmount * 7).toFixed(2);

    goals.push({
      id: goalId,
      name: goalName,
      targetAmount: targetAmount,
      currentSavings: currentSavings,
      remainingAmount: remainingAmount,
      progressPct: progressPct,
      deadline: deadlineStr,
      daysRemaining: daysRemaining,
      emailAlerts: emailAlerts,
      alertEmail: alertEmail,
      purpose: purpose,
      status: status,
      requiredDaily: Number(requiredDaily),
      requiredWeekly: Number(requiredWeekly),
      createdAt: row[9] || new Date().toISOString(),
      lastUpdated: row[10] || new Date().toISOString()
    });
  }

  return goals;
}

/**
 * Add a new savings goal
 */
function addGoal(goalData) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(CONFIG.SHEET_NAMES.GOALS);
  if (!sheet) {
    setupSheet();
    sheet = ss.getSheetByName(CONFIG.SHEET_NAMES.GOALS);
  }

  const newId = 'GOAL-' + Math.floor(1000 + Math.random() * 9000);
  const now = new Date().toISOString();
  const deadline = formatDateString(goalData.deadline);
  const initialSavings = Number(goalData.initialSavings || goalData.currentSavings || 0);
  const targetAmount = Number(goalData.targetAmount);

  const status = initialSavings >= targetAmount ? 'Completed' : 'Active';

  const newRow = [
    newId,
    goalData.name,
    targetAmount,
    initialSavings,
    deadline,
    goalData.emailAlerts ? 'TRUE' : 'FALSE',
    goalData.alertEmail || Session.getActiveUser().getEmail() || '',
    goalData.purpose || 'General',
    status,
    now,
    now
  ];

  sheet.appendRow(newRow);

  // If initial savings > 0, log as initial deposit
  if (initialSavings > 0) {
    logDepositEntry(newId, goalData.name, initialSavings, 'Initial goal allocation');
  }

  return {
    id: newId,
    name: goalData.name,
    targetAmount: targetAmount,
    currentSavings: initialSavings,
    deadline: deadline,
    emailAlerts: goalData.emailAlerts,
    alertEmail: goalData.alertEmail,
    purpose: goalData.purpose,
    status: status
  };
}

/**
 * Update an existing savings goal
 */
function updateGoal(goalId, updateData) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEET_NAMES.GOALS);
  if (!sheet) throw new Error('Goals sheet not found');

  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(goalId)) {
      const rowIndex = i + 1;

      if (updateData.name !== undefined) sheet.getRange(rowIndex, 2).setValue(updateData.name);
      if (updateData.targetAmount !== undefined) sheet.getRange(rowIndex, 3).setValue(Number(updateData.targetAmount));
      if (updateData.currentSavings !== undefined) sheet.getRange(rowIndex, 4).setValue(Number(updateData.currentSavings));
      if (updateData.deadline !== undefined) sheet.getRange(rowIndex, 5).setValue(formatDateString(updateData.deadline));
      if (updateData.emailAlerts !== undefined) sheet.getRange(rowIndex, 6).setValue(updateData.emailAlerts ? 'TRUE' : 'FALSE');
      if (updateData.alertEmail !== undefined) sheet.getRange(rowIndex, 7).setValue(updateData.alertEmail);
      if (updateData.purpose !== undefined) sheet.getRange(rowIndex, 8).setValue(updateData.purpose);
      if (updateData.status !== undefined) sheet.getRange(rowIndex, 9).setValue(updateData.status);

      sheet.getRange(rowIndex, 11).setValue(new Date().toISOString());
      return { success: true, goalId: goalId };
    }
  }

  throw new Error('Goal not found: ' + goalId);
}

/**
 * Delete a goal by ID
 */
function deleteGoal(goalId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEET_NAMES.GOALS);
  if (!sheet) throw new Error('Goals sheet not found');

  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(goalId)) {
      sheet.deleteRow(i + 1);
      return { success: true, deletedGoalId: goalId };
    }
  }

  throw new Error('Goal not found: ' + goalId);
}

/**
 * Add a deposit to a goal, updating current savings and logging deposit
 */
function addDeposit(goalId, amount, note) {
  const depositAmount = Number(amount);
  if (isNaN(depositAmount) || depositAmount <= 0) {
    throw new Error('Invalid deposit amount');
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const goalsSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.GOALS);
  const data = goalsSheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(goalId)) {
      const rowIndex = i + 1;
      const goalName = data[i][1];
      const targetAmount = Number(data[i][2]);
      const currentSavings = Number(data[i][3]) + depositAmount;

      goalsSheet.getRange(rowIndex, 4).setValue(currentSavings);
      goalsSheet.getRange(rowIndex, 11).setValue(new Date().toISOString());

      let newStatus = data[i][8];
      if (currentSavings >= targetAmount) {
        newStatus = 'Completed';
        goalsSheet.getRange(rowIndex, 9).setValue('Completed');
      }

      // Log in deposits sheet
      logDepositEntry(goalId, goalName, depositAmount, note || 'Manual deposit');

      return {
        goalId: goalId,
        depositAmount: depositAmount,
        newSavingsTotal: currentSavings,
        targetAmount: targetAmount,
        status: newStatus,
        isCompleted: currentSavings >= targetAmount
      };
    }
  }

  throw new Error('Goal not found: ' + goalId);
}

function logDepositEntry(goalId, goalName, amount, note) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(CONFIG.SHEET_NAMES.DEPOSITS);
  if (!sheet) {
    setupSheet();
    sheet = ss.getSheetByName(CONFIG.SHEET_NAMES.DEPOSITS);
  }

  const depositId = 'DEP-' + Math.floor(1000 + Math.random() * 9000);
  const dateStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm');

  sheet.appendRow([depositId, goalId, goalName, amount, dateStr, note || '']);
}

function getDeposits(goalId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEET_NAMES.DEPOSITS);
  if (!sheet) return [];

  const data = sheet.getDataRange().getValues();
  const deposits = [];

  for (let i = 1; i < data.length; i++) {
    if (!goalId || String(data[i][1]) === String(goalId)) {
      deposits.push({
        id: data[i][0],
        goalId: data[i][1],
        goalName: data[i][2],
        amount: data[i][3],
        date: data[i][4],
        note: data[i][5]
      });
    }
  }

  return deposits.reverse(); // latest first
}

// ==========================================
// GROQ AI INTEGRATION & RECOMMENDATIONS
// ==========================================

/**
 * Calls the Groq API to generate personalized financial advice for a specific savings goal
 */
function getGroqRecommendation(goalId, userApiKey) {
  const goals = getGoals();
  const goal = goals.find(g => String(g.id) === String(goalId));

  if (!goal) {
    throw new Error('Goal not found for ID: ' + goalId);
  }

  // Get API Key from ScriptProperties or user parameter
  const apiKey = userApiKey || PropertiesService.getScriptProperties().getProperty('GROQ_API_KEY');

  // If no API key is configured, return an intelligent heuristic recommendation
  if (!apiKey) {
    return generateFallbackRecommendation(goal);
  }

  const systemPrompt = `You are SaveIQ Financial AI, an expert behavioral economist and personal finance coach.
Your mission is to provide sharp, encouraging, mathematically accurate, and highly actionable advice to help the user achieve their savings goal.
Provide your response strictly in the following JSON format:
{
  "feasibilityScore": <number between 1 and 100>,
  "feasibilityStatus": "<Realistic | Ambitious | High Risk | Ahead of Schedule>",
  "dailyTarget": <number>,
  "weeklyTarget": <number>,
  "summary": "<1-2 sentence motivating summary>",
  "milestones": [
    {"checkpoint": "<Milestone name>", "targetAmount": <number>, "eta": "<relative time>"}
  ],
  "actionableHacks": [
    "<3-4 highly specific tactical suggestions relevant to this specific purpose/deadline>"
  ],
  "behavioralNudge": "<psychological tip to avoid impulse spending>"
}`;

  const userPrompt = `Analyze this savings goal:
- Goal Name: ${goal.name}
- Purpose / Category: ${goal.purpose}
- Target Amount: $${goal.targetAmount}
- Current Savings: $${goal.currentSavings}
- Remaining Amount: $${goal.remainingAmount}
- Progress: ${goal.progressPct}%
- Deadline: ${goal.deadline} (${goal.daysRemaining} days remaining)
- Status: ${goal.status}

Calculate daily/weekly velocity required, assess timeline feasibility, and provide high-impact recommendations.`;

  try {
    const payload = {
      model: CONFIG.GROQ.MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.6,
      response_format: { type: 'json_object' }
    };

    const options = {
      method: 'post',
      contentType: 'application/json',
      headers: {
        'Authorization': 'Bearer ' + apiKey
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch(CONFIG.GROQ.ENDPOINT, options);
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();

    if (responseCode === 200) {
      const parsed = JSON.parse(responseText);
      const aiContent = parsed.choices[0].message.content;
      return JSON.parse(aiContent);
    } else {
      Logger.log('Groq API Error: ' + responseCode + ' - ' + responseText);
      // Fallback gracefully on rate limit or invalid key
      return generateFallbackRecommendation(goal, 'Groq API notice: ' + responseCode);
    }
  } catch (e) {
    Logger.log('Exception calling Groq API: ' + e.toString());
    return generateFallbackRecommendation(goal, e.toString());
  }
}

/**
 * Intelligent heuristic fallback recommendation generator
 * Ensures zero downtime even if Groq API is offline or key is unconfigured
 */
function generateFallbackRecommendation(goal, notice) {
  const days = Math.max(1, goal.daysRemaining);
  const remaining = goal.remainingAmount;
  const daily = Number((remaining / days).toFixed(2));
  const weekly = Number((daily * 7).toFixed(2));

  let score = 85;
  let status = 'Realistic';

  if (goal.status === 'Completed') {
    score = 100;
    status = 'Ahead of Schedule';
  } else if (goal.daysRemaining <= 0) {
    score = 30;
    status = 'High Risk';
  } else if (daily > 100) {
    score = 55;
    status = 'Ambitious';
  }

  const milestones = [
    {
      checkpoint: '25% Milestone',
      targetAmount: Math.round(goal.targetAmount * 0.25),
      eta: goal.daysRemaining > 4 ? `Day ${Math.round(days * 0.25)}` : 'Immediate'
    },
    {
      checkpoint: 'Halfway Mark (50%)',
      targetAmount: Math.round(goal.targetAmount * 0.50),
      eta: goal.daysRemaining > 4 ? `Day ${Math.round(days * 0.50)}` : 'Approaching'
    },
    {
      checkpoint: 'Final Stretch (75%)',
      targetAmount: Math.round(goal.targetAmount * 0.75),
      eta: goal.daysRemaining > 4 ? `Day ${Math.round(days * 0.75)}` : 'Final Week'
    }
  ];

  let hacks = [
    `Automate an auto-transfer of $${weekly} each Monday directly into your dedicated savings envelope.`,
    `Audit recurring subscription services this week; diverting 2 unused services can save $30-$50 monthly.`,
    `Apply the 48-Hour Rule: delay non-essential purchases over $50 to redirect discretionary funds toward "${goal.name}".`
  ];

  if (goal.purpose === 'Tech & Gadgets') {
    hacks.push('Check for certified refurbished models or educational/trade-in discounts to lower your target amount by 10-15%.');
  } else if (goal.purpose === 'Emergency Fund') {
    hacks.push('Keep this in a High-Yield Savings Account (HYSA) earning 4-5% APY to let compounding interest accelerate your goal.');
  } else if (goal.purpose === 'Travel & Vacation') {
    hacks.push('Set flight price trackers and book off-peak dates to lock in lower total trip expenditure.');
  }

  return {
    feasibilityScore: score,
    feasibilityStatus: status,
    dailyTarget: daily,
    weeklyTarget: weekly,
    summary: `To conquer "${goal.name}" within ${days} days, save $${daily}/day ($${weekly}/week). You have already achieved ${goal.progressPct}%!`,
    milestones: milestones,
    actionableHacks: hacks,
    behavioralNudge: 'Visualize the satisfaction of meeting this goal without relying on high-interest credit card debt.',
    engine: notice ? 'Heuristic Rule Engine (' + notice + ')' : 'SaveIQ Smart Financial Engine'
  };
}

// ==========================================
// AUTOMATED DEADLINE AUDIT & GMAIL REMINDERS
// ==========================================

/**
 * Scheduled trigger function: Audits all active goals daily.
 * Dispatches HTML reminder emails for approaching or overdue deadlines.
 */
function dailyDeadlineAudit() {
  const goals = getGoals();
  let alertsSent = 0;
  const logEntries = [];

  goals.forEach(goal => {
    // Only check goals with email alerts enabled and not already completed
    if (goal.emailAlerts && goal.alertEmail && goal.status !== 'Completed') {
      const days = goal.daysRemaining;

      // Condition: Due in 7 days, 3 days, 1 day, or overdue
      const isApproaching = (days <= CONFIG.ALERT_THRESHOLDS.APPROACHING_DAYS && days >= 0);
      const isOverdue = (days < 0);

      if (isApproaching || isOverdue) {
        try {
          sendGoalReminderEmail(goal, days, isOverdue);
          alertsSent++;
          logEntries.push(`Sent alert to ${goal.alertEmail} for "${goal.name}" (${days} days)`);
        } catch (err) {
          Logger.log(`Failed to send email to ${goal.alertEmail}: ${err.toString()}`);
          logEntries.push(`Failed alert to ${goal.alertEmail}: ${err.toString()}`);
        }
      }
    }
  });

  // Record audit in AuditLogs sheet
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let auditSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.AUDIT_LOGS);
  if (auditSheet) {
    auditSheet.appendRow([
      new Date().toISOString(),
      goals.length,
      alertsSent,
      logEntries.join('; ') || 'No alerts required'
    ]);
  }

  Logger.log(`Audit complete: ${goals.length} goals audited, ${alertsSent} emails sent.`);
  return {
    goalsAudited: goals.length,
    alertsSent: alertsSent,
    log: logEntries
  };
}

/**
 * Builds and dispatches a responsive HTML notification email via Gmail
 */
function sendGoalReminderEmail(goal, daysRemaining, isOverdue) {
  const recipient = goal.alertEmail;
  const statusTitle = isOverdue
    ? `⚠️ Overdue Notice: "${goal.name}"`
    : `🎯 SaveIQ Alert: ${daysRemaining} days left for "${goal.name}"`;

  const urgencyColor = isOverdue ? '#ef4444' : (daysRemaining <= 3 ? '#f59e0b' : '#6366f1');
  const bannerText = isOverdue
    ? `Your savings goal deadline has passed!`
    : `Deadline approaching in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}!`;

  const htmlBody = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; background-color: #0f172a; margin: 0; padding: 24px; color: #f8fafc; }
        .container { max-width: 580px; margin: 0 auto; background: #1e293b; border-radius: 16px; overflow: hidden; border: 1px solid #334155; }
        .header { background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 32px 24px; text-align: center; }
        .header h1 { margin: 0; font-size: 24px; color: #ffffff; letter-spacing: -0.5px; }
        .badge { display: inline-block; background-color: ${urgencyColor}; color: white; padding: 6px 16px; border-radius: 9999px; font-weight: bold; font-size: 13px; margin-top: 12px; }
        .body-content { padding: 28px 24px; }
        .stat-grid { display: flex; justify-content: space-between; background: #0f172a; border-radius: 12px; padding: 16px; margin: 20px 0; }
        .stat-box { text-align: center; flex: 1; }
        .stat-label { font-size: 11px; text-transform: uppercase; color: #94a3b8; letter-spacing: 0.5px; }
        .stat-value { font-size: 18px; font-weight: bold; color: #f8fafc; margin-top: 4px; }
        .progress-bar-bg { background-color: #334155; border-radius: 8px; height: 12px; width: 100%; overflow: hidden; margin: 16px 0 8px 0; }
        .progress-bar-fill { background: linear-gradient(90deg, #6366f1, #06b6d4); height: 100%; width: ${goal.progressPct}%; border-radius: 8px; }
        .progress-text { display: flex; justify-content: space-between; font-size: 12px; color: #94a3b8; }
        .advice-box { background: rgba(99, 102, 241, 0.1); border-left: 4px solid #6366f1; padding: 16px; border-radius: 0 8px 8px 0; margin-top: 20px; font-size: 14px; line-height: 1.5; color: #cbd5e1; }
        .footer { text-align: center; padding: 20px; font-size: 12px; color: #64748b; border-top: 1px solid #334155; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>SaveIQ Financial Alert</h1>
          <div class="badge">${bannerText}</div>
        </div>
        <div class="body-content">
          <p style="font-size: 15px; margin-top: 0;">Hello,</p>
          <p style="font-size: 14px; line-height: 1.6; color: #cbd5e1;">
            This is an automated checkpoint from <strong>SaveIQ</strong> for your goal <strong>"${goal.name}"</strong> (${goal.purpose}).
          </p>

          <div class="progress-bar-bg">
            <div class="progress-bar-fill"></div>
          </div>
          <div class="progress-text">
            <span>$${goal.currentSavings.toLocaleString()} saved</span>
            <span>${goal.progressPct}% (${Math.max(0, goal.remainingAmount).toLocaleString()} left)</span>
          </div>

          <table width="100%" cellpadding="8" style="margin: 20px 0; background: #0f172a; border-radius: 12px; border-collapse: collapse;">
            <tr>
              <td style="color: #94a3b8; font-size: 13px;">Target Amount</td>
              <td align="right" style="font-weight: bold; color: #ffffff;">$${goal.targetAmount.toLocaleString()}</td>
            </tr>
            <tr>
              <td style="color: #94a3b8; font-size: 13px;">Deadline</td>
              <td align="right" style="font-weight: bold; color: #ffffff;">${goal.deadline}</td>
            </tr>
            <tr>
              <td style="color: #94a3b8; font-size: 13px;">Required Daily Pace</td>
              <td align="right" style="font-weight: bold; color: #38bdf8;">$${goal.requiredDaily} / day</td>
            </tr>
            <tr>
              <td style="color: #94a3b8; font-size: 13px;">Required Weekly Pace</td>
              <td align="right" style="font-weight: bold; color: #a78bfa;">$${goal.requiredWeekly} / week</td>
            </tr>
          </table>

          <div class="advice-box">
            💡 <strong>AI Tip:</strong> You only need <strong>$${goal.requiredDaily}</strong> per day to hit your target before the deadline. Even a small micro-deposit today moves you closer to financial freedom!
          </div>
        </div>
        <div class="footer">
          Sent by SaveIQ – AI Savings Goal Tracker &bull; Powered by Google Apps Script & Groq AI
        </div>
      </div>
    </body>
    </html>
  `;

  GmailApp.sendEmail(recipient, statusTitle, `SaveIQ Alert: ${daysRemaining} days left for ${goal.name}. Saved: $${goal.currentSavings} of $${goal.targetAmount}.`, {
    htmlBody: htmlBody,
    name: 'SaveIQ Goal Tracker'
  });
}

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

function formatDateString(val) {
  if (!val) return '';
  if (val instanceof Date) {
    return Utilities.formatDate(val, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  const str = String(val).trim();
  if (str.length >= 10 && str.charAt(4) === '-' && str.charAt(7) === '-') {
    return str.substring(0, 10);
  }
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    return Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  return str;
}
