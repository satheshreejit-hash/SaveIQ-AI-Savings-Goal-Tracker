# SaveIQ – Epics & Tasks Breakdown

### Project Stats
- **Total Epics**: 9
- **Total Tasks**: 27
- **Total Subtasks**: 0
- **Overall Status**: Complete & Ready for GitHub

---

## 📋 Epic & Task Matrix

| Epic ID | Epic Title | Task ID | Task Title | Status |
|:---|:---|:---|:---|:---:|
| **EPIC-01** | Project Setup & System Architecture | TASK-1.1 | Project repository initialization & directory tree | `Completed` |
| | | TASK-1.2 | Google Sheet relational database schema design | `Completed` |
| | | TASK-1.3 | Google Apps Script environment & manifest configuration | `Completed` |
| **EPIC-02** | Savings Goal Management (CRUD) | TASK-2.1 | Goal creation interface & input validation | `Completed` |
| | | TASK-2.2 | Google Sheets persistence layer (`addGoal`, `getGoals`) | `Completed` |
| | | TASK-2.3 | Goal status lifecycle, deposits, and completion triggers | `Completed` |
| **EPIC-03** | AI Financial Guidance Engine | TASK-3.1 | Groq API client integration (LLaMA-3.3-70B model) | `Completed` |
| | | TASK-3.2 | Financial velocity & feasibility score algorithm | `Completed` |
| | | TASK-3.3 | Interactive AI advisor modal with milestone roadmap | `Completed` |
| **EPIC-04** | Automated Deadline & Monitoring Service | TASK-4.1 | Time-driven trigger implementation (`dailyDeadlineAudit`) | `Completed` |
| | | TASK-4.2 | Proximity risk calculation (Safe, Approaching, Overdue) | `Completed` |
| | | TASK-4.3 | Responsive HTML email template design & Gmail dispatch | `Completed` |
| **EPIC-05** | Financial Analytics & Dashboard Monitoring | TASK-5.1 | KPI metric cards (Target, Saved, Progress %, Velocity) | `Completed` |
| | | TASK-5.2 | Visual category allocation bar & SVG progress meters | `Completed` |
| | | TASK-5.3 | Real-time search, filter chips, and multi-criteria sorting | `Completed` |
| **EPIC-06** | User Experience & Frontend Interface | TASK-6.1 | Glassmorphic dark/light design system with CSS tokens | `Completed` |
| | | TASK-6.2 | Quick-deposit modal with instant milestone preview | `Completed` |
| | | TASK-6.3 | Micro-interactions, toast notifications & copy utilities | `Completed` |
| **EPIC-07** | Error Handling, Security & Validation | TASK-7.1 | Client & server input validation & date bounds check | `Completed` |
| | | TASK-7.2 | Groq API rate-limit resilience & smart heuristic fallback | `Completed` |
| | | TASK-7.3 | Secure API key isolation (ScriptProperties / LocalStorage) | `Completed` |
| **EPIC-08** | Local Simulation & Hybrid Client Mode | TASK-8.1 | LocalStorage demo store for zero-friction GitHub review | `Completed` |
| | | TASK-8.2 | REST API connector bridge for Google Apps Script Web App | `Completed` |
| | | TASK-8.3 | Direct client-side Groq API execution mode | `Completed` |
| **EPIC-09** | Testing, CI/CD & Documentation | TASK-9.1 | Automated unit test suite for financial calculations | `Completed` |
| | | TASK-9.2 | Clasp configuration & GitHub Actions CI pipeline | `Completed` |
| | | TASK-9.3 | Comprehensive GitHub README, deployment & user manuals | `Completed` |

---

## Detailed Task Specifications

### Epic 1: Project Setup & System Architecture
- **TASK-1.1**: Initialize clean modular directory layout with root configuration files (`.gitignore`, `LICENSE`, `package.json`, `.clasp.json.sample`).
- **TASK-1.2**: Define 3 relational tables in Google Sheets (`Goals`, `Deposits`, `AuditLogs`) with auto-initialization script `setupSheet()`.
- **TASK-1.3**: Configure `appsscript.json` with required OAuth scopes (`spreadsheets`, `gmail.send`, `script.external_request`).

### Epic 2: Savings Goal Management (CRUD)
- **TASK-2.1**: Implement responsive form modal allowing users to enter Goal Name, Target Amount, Initial Deposit, Deadline, Purpose, and Email Alert settings.
- **TASK-2.2**: Build Apps Script backend functions to append, query, update, and delete goals directly in Google Sheets.
- **TASK-2.3**: Automate status transitions (`Active` -> `Approaching` -> `Completed` / `Overdue`) when deposits are logged or dates pass.

### Epic 3: AI Financial Guidance Engine
- **TASK-3.1**: Connect to Groq Cloud API using `llama-3.3-70b-versatile` with low latency.
- **TASK-3.2**: Implement financial mathematics: daily rate needed, weekly rate needed, feasibility score, and milestone projections.
- **TASK-3.3**: Present recommendations in a formatted modal with actionable spending hacks and behavioral nudges.

### Epic 4: Automated Deadline & Monitoring Service
- **TASK-4.1**: Create `dailyDeadlineAudit()` function designed to execute via Google Apps Script Time-Driven trigger (e.g., daily between 8 AM - 9 AM).
- **TASK-4.2**: Classify deadline urgency: Approaching (<= 7 days), Critical (<= 3 days), Overdue (< 0 days).
- **TASK-4.3**: Send styled, responsive HTML emails using `GmailApp.sendEmail()` containing live progress and required daily pace.

### Epic 5: Financial Analytics & Dashboard Monitoring
- **TASK-5.1**: Render live KPI summary cards: Total Goals, Total Capital Saved, Savings Velocity %, Deadline Alerts Count, and Target Run-Rate.
- **TASK-5.2**: Build dynamic SVG charts showing category percentage breakdowns and glowing progress bars.
- **TASK-5.3**: Real-time fuzzy search input, status dropdown, and category chips for fluid goal exploration.

### Epic 6: User Experience & Frontend Interface
- **TASK-6.1**: Implement glassmorphism styling, radiant gradients, CSS custom variables, and dark/light mode toggle.
- **TASK-6.2**: Design rapid deposit workflow allowing users to record savings with optional transaction notes.
- **TASK-6.3**: Add animated toast alert system for operation feedback and one-click clipboard copying for AI advice.

### Epic 7: Error Handling, Security & Validation
- **TASK-7.1**: Validate numeric inputs, non-past deadlines, and sanitize HTML/characters across inputs.
- **TASK-7.2**: Provide an offline Heuristic AI engine ensuring zero failure if network or API keys are unavailable.
- **TASK-7.3**: Isolate sensitive tokens in Google Apps Script `PropertiesService` or client `localStorage`.

### Epic 8: Local Simulation & Hybrid Client Mode
- **TASK-8.1**: Equip web frontend with realistic demo goals in `localStorage` so evaluators can run the app immediately in any browser.
- **TASK-8.2**: Support bidirectional switching between local demo mode and live Google Sheets Cloud Sync.
- **TASK-8.3**: Enable client-side Groq API key configuration for standalone testing without backend redeployment.

### Epic 9: Testing, CI/CD & Documentation
- **TASK-9.1**: Write Node.js unit tests in `tests/test_calculations.js` validating financial calculation formulas.
- **TASK-9.2**: Add GitHub Actions workflow (`.github/workflows/ci.yml`) to verify tests automatically on push.
- **TASK-9.3**: Write detailed `README.md`, `ARCHITECTURE.md`, `DEPLOYMENT_GUIDE.md`, and `EMAIL_TEMPLATES.md`.
