# SaveIQ – Deployment & Setup Guide

This guide walks you through setting up and deploying **SaveIQ** across Google Sheets, Google Apps Script, Gmail alerts, and the web frontend.

---

## 🚀 Quick Option 1: Instant Local Browser Preview (Zero Setup)

You can run SaveIQ immediately without setting up any cloud infrastructure:
1. Clone or download the repository.
2. Open `web/index.html` directly in your web browser (Chrome, Edge, Firefox, Safari).
3. The dashboard will automatically load in **Local Demo Mode** with realistic savings goals (Emergency Fund, MacBook Pro, Japan Vacation).
4. You can create goals, make deposits, inspect AI insights, and test deadline audits right away!

---

## ☁️ Option 2: Full Google Cloud & Apps Script Deployment

Follow these steps to connect SaveIQ to your personal Google Sheet and enable live Gmail notifications.

### Step 1: Create a Google Sheet
1. Open [Google Sheets](https://sheets.new) in your browser.
2. Name the sheet: `SaveIQ Database`.
3. In the top menu, navigate to **Extensions** > **Apps Script**.

### Step 2: Add Google Apps Script Backend
1. In the Apps Script editor, rename the file `Code.gs` or delete existing code.
2. Open `google-apps-script/Code.js` from this repository.
3. Copy its entire content and paste it into the Apps Script editor.
4. Save the project (Ctrl+S or Cmd+S) and name it `SaveIQ-Backend`.

### Step 3: Run Database Initialization
1. In the Apps Script toolbar, locate the function dropdown menu.
2. Select `setupSheet` and click **Run**.
3. Google will prompt for initial authorization:
   - Click **Review Permissions**.
   - Select your Google account.
   - Click **Advanced** > **Go to SaveIQ-Backend (unsafe)**.
   - Click **Allow**.
4. Check your Google Sheet: Three formatted tabs will now appear:
   - `Goals` (with sample goals pre-populated)
   - `Deposits`
   - `AuditLogs`

### Step 4: Configure Groq API Key (Optional for Cloud AI)
1. Get a free API key at [Groq Cloud Console](https://console.groq.com/keys).
2. In the Apps Script editor, go to **Project Settings** (gear icon on the left sidebar).
3. Scroll down to **Script Properties** and click **Edit script properties**.
4. Add a new property:
   - Property: `GROQ_API_KEY`
   - Value: `gsk_your_actual_groq_api_key_here`
5. Click **Save script properties**.

*(Note: You can also enter the Groq API key directly into the Web App settings modal on the frontend).*

### Step 5: Deploy as Web App
1. In the Apps Script editor, click the blue **Deploy** button (top right) > **New deployment**.
2. Select type: **Web app** (gear icon).
3. Configure settings:
   - **Description**: `SaveIQ Production Web App v1.0`
   - **Execute as**: `Me (your email)`
   - **Who has access**: `Anyone` (essential for web client requests)
4. Click **Deploy**.
5. Copy the generated **Web App URL** (e.g., `https://script.google.com/macros/s/AKfycbx.../exec`).

### Step 6: Setup Daily Automated Deadline Alert Trigger
1. In the Apps Script editor, click the **Triggers** icon (alarm clock on the left sidebar).
2. Click **+ Add Trigger** (bottom right).
3. Set the following configuration:
   - **Choose which function to run**: `dailyDeadlineAudit`
   - **Choose which deployment should run**: `Head`
   - **Select event source**: `Time-driven`
   - **Select type of time based trigger**: `Day timer`
   - **Select time of day**: `8am to 9am` (or your preferred hour)
4. Click **Save**.
5. SaveIQ will now automatically inspect all goals every morning and dispatch styled HTML email reminders through Gmail whenever a deadline is approaching (≤ 7 days) or overdue!

### Step 7: Connect Web Dashboard to Apps Script
1. Open `web/index.html` in your browser.
2. Click the **Settings (⚙️)** button in the top navigation bar.
3. Check the box **"Enable Google Apps Script & Google Sheets Cloud Sync"**.
4. Paste your **Web App URL** into the field.
5. (Optional) Paste your **Groq API Key**.
6. Click **Save Settings**.
7. The status pill in the navbar will illuminate green: **"Google Sheets Connected"**.

---

## 📦 Option 3: Deploying Frontend to GitHub Pages

1. Push your repository to GitHub.
2. Navigate to your repository's **Settings** > **Pages**.
3. Under **Build and deployment**:
   - **Source**: `Deploy from a branch`
   - **Branch**: `main` / folder: `/web` (or root if configured)
4. Click **Save**.
5. Your live SaveIQ dashboard will be available at:
   `https://<your-username>.github.io/<repo-name>/`
