/**
 * SaveIQ - API Service & Data Layer
 * Handles communication with:
 * 1. Google Apps Script Web App (REST API endpoints)
 * 2. Groq AI API (LLaMA-3.3-70b / LLaMA-3.1-8b)
 * 3. LocalStorage Demo Store (Zero-friction local preview & fallback)
 */

const STORAGE_KEYS = {
  GOALS: 'saveiq_goals_data',
  DEPOSITS: 'saveiq_deposits_data',
  CONFIG: 'saveiq_user_config'
};

// Initial realistic demo goals
const DEFAULT_DEMO_GOALS = [
  {
    id: 'GOAL-1001',
    name: 'Emergency Fund',
    targetAmount: 5000,
    currentSavings: 3400,
    remainingAmount: 1600,
    progressPct: 68,
    deadline: getFutureDate(45),
    daysRemaining: 45,
    emailAlerts: true,
    alertEmail: 'alex.investor@example.com',
    purpose: 'Emergency Fund',
    status: 'Active',
    requiredDaily: 35.56,
    requiredWeekly: 248.89,
    createdAt: new Date().toISOString()
  },
  {
    id: 'GOAL-1002',
    name: 'M3 MacBook Pro 16"',
    targetAmount: 2499,
    currentSavings: 1850,
    remainingAmount: 649,
    progressPct: 74,
    deadline: getFutureDate(12),
    daysRemaining: 12,
    emailAlerts: true,
    alertEmail: 'alex.investor@example.com',
    purpose: 'Tech & Gadgets',
    status: 'Active',
    requiredDaily: 54.08,
    requiredWeekly: 378.58,
    createdAt: new Date().toISOString()
  },
  {
    id: 'GOAL-1003',
    name: 'Tokyo Spring Vacation',
    targetAmount: 3800,
    currentSavings: 1200,
    remainingAmount: 2600,
    progressPct: 32,
    deadline: getFutureDate(5), // Approaching deadline!
    daysRemaining: 5,
    emailAlerts: true,
    alertEmail: 'alex.investor@example.com',
    purpose: 'Travel & Vacation',
    status: 'Approaching',
    requiredDaily: 520.00,
    requiredWeekly: 3640.00,
    createdAt: new Date().toISOString()
  },
  {
    id: 'GOAL-1004',
    name: 'AWS Solutions Architect Exam',
    targetAmount: 300,
    currentSavings: 300,
    remainingAmount: 0,
    progressPct: 100,
    deadline: getFutureDate(20),
    daysRemaining: 20,
    emailAlerts: false,
    alertEmail: '',
    purpose: 'Education',
    status: 'Completed',
    requiredDaily: 0,
    requiredWeekly: 0,
    createdAt: new Date().toISOString()
  }
];

function getFutureDate(daysAhead) {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return d.toISOString().split('T')[0];
}

class SaveIQApi {
  constructor() {
    this.config = this.loadConfig();
    this.initLocalStorage();
  }

  loadConfig() {
    const saved = localStorage.getItem(STORAGE_KEYS.CONFIG);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { }
    }
    return {
      appsScriptUrl: '',
      groqApiKey: '',
      useCloudSync: false,
      currencySymbol: '$',
      currencyCode: 'USD',
      theme: 'dark'
    };
  }

  saveConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(this.config));
  }

  initLocalStorage() {
    if (!localStorage.getItem(STORAGE_KEYS.GOALS)) {
      localStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(DEFAULT_DEMO_GOALS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.DEPOSITS)) {
      const initialDeposits = [
        { id: 'DEP-101', goalId: 'GOAL-1001', goalName: 'Emergency Fund', amount: 1500, date: getFutureDate(-20), note: 'Initial setup' },
        { id: 'DEP-102', goalId: 'GOAL-1001', goalName: 'Emergency Fund', amount: 1900, date: getFutureDate(-5), note: 'Monthly savings' },
        { id: 'DEP-103', goalId: 'GOAL-1002', goalName: 'M3 MacBook Pro 16"', amount: 1850, date: getFutureDate(-10), note: 'Side gig payout' },
        { id: 'DEP-104', goalId: 'GOAL-1003', goalName: 'Tokyo Spring Vacation', amount: 1200, date: getFutureDate(-2), note: 'Tax refund' }
      ];
      localStorage.setItem(STORAGE_KEYS.DEPOSITS, JSON.stringify(initialDeposits));
    }
  }

  /**
   * Fetch all savings goals
   */
  async getGoals() {
    if (this.config.useCloudSync && this.config.appsScriptUrl) {
      try {
        const response = await fetch(`${this.config.appsScriptUrl}?action=getGoals`);
        const json = await response.json();
        if (json.status === 'success') {
          return json.data;
        }
      } catch (err) {
        console.warn('Apps Script fetch failed, using local store:', err);
      }
    }

    // Local / Offline fallback
    const raw = localStorage.getItem(STORAGE_KEYS.GOALS);
    const goals = raw ? JSON.parse(raw) : DEFAULT_DEMO_GOALS;

    // Recalculate dynamic daysRemaining & status
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return goals.map(g => {
      const dDate = new Date(g.deadline);
      dDate.setHours(0, 0, 0, 0);
      const diffDays = Math.ceil((dDate - today) / (1000 * 60 * 60 * 24));
      const remaining = Math.max(0, g.targetAmount - g.currentSavings);
      const progress = g.targetAmount > 0 ? Math.min(100, Math.round((g.currentSavings / g.targetAmount) * 100)) : 0;

      let status = g.status;
      if (g.currentSavings >= g.targetAmount) {
        status = 'Completed';
      } else if (diffDays < 0) {
        status = 'Overdue';
      } else if (diffDays <= 7) {
        status = 'Approaching';
      } else {
        status = 'Active';
      }

      const reqDaily = diffDays > 0 ? (remaining / diffDays).toFixed(2) : remaining.toFixed(2);
      const reqWeekly = diffDays > 0 ? ((remaining / diffDays) * 7).toFixed(2) : (remaining * 7).toFixed(2);

      return {
        ...g,
        daysRemaining: diffDays,
        remainingAmount: remaining,
        progressPct: progress,
        status: status,
        requiredDaily: Number(reqDaily),
        requiredWeekly: Number(reqWeekly)
      };
    });
  }

  /**
   * Create a new savings goal
   */
  async createGoal(goalData) {
    if (this.config.useCloudSync && this.config.appsScriptUrl) {
      try {
        const response = await fetch(this.config.appsScriptUrl, {
          method: 'POST',
          body: JSON.stringify({ action: 'createGoal', data: goalData })
        });
        const res = await response.json();
        if (res.status === 'success') {
          return res.data;
        }
      } catch (err) {
        console.warn('Apps Script create failed, writing locally:', err);
      }
    }

    // Local creation
    const goals = await this.getGoals();
    const newId = 'GOAL-' + Math.floor(1000 + Math.random() * 9000);
    const initialSavings = Number(goalData.initialSavings || 0);
    const target = Number(goalData.targetAmount);

    const newGoal = {
      id: newId,
      name: goalData.name,
      targetAmount: target,
      currentSavings: initialSavings,
      remainingAmount: Math.max(0, target - initialSavings),
      progressPct: target > 0 ? Math.round((initialSavings / target) * 100) : 0,
      deadline: goalData.deadline,
      emailAlerts: !!goalData.emailAlerts,
      alertEmail: goalData.alertEmail || '',
      purpose: goalData.purpose || 'General',
      status: initialSavings >= target ? 'Completed' : 'Active',
      createdAt: new Date().toISOString()
    };

    goals.unshift(newGoal);
    localStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(goals));

    if (initialSavings > 0) {
      this.recordDeposit(newId, goalData.name, initialSavings, 'Initial allocation');
    }

    return newGoal;
  }

  /**
   * Record a deposit to a goal
   */
  async recordDeposit(goalId, goalName, amount, note) {
    const numAmount = Number(amount);
    if (numAmount <= 0) throw new Error('Invalid deposit amount');

    if (this.config.useCloudSync && this.config.appsScriptUrl) {
      try {
        const response = await fetch(this.config.appsScriptUrl, {
          method: 'POST',
          body: JSON.stringify({ action: 'addDeposit', goalId, amount: numAmount, note })
        });
        const res = await response.json();
        if (res.status === 'success') return res.data;
      } catch (err) {
        console.warn('Apps Script deposit failed, writing locally:', err);
      }
    }

    // Local update
    const goals = await this.getGoals();
    const goal = goals.find(g => g.id === goalId);
    if (!goal) throw new Error('Goal not found');

    goal.currentSavings += numAmount;
    goal.remainingAmount = Math.max(0, goal.targetAmount - goal.currentSavings);
    goal.progressPct = Math.min(100, Math.round((goal.currentSavings / goal.targetAmount) * 100));
    if (goal.currentSavings >= goal.targetAmount) {
      goal.status = 'Completed';
    }

    localStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(goals));

    // Record in deposits history
    const rawDeposits = localStorage.getItem(STORAGE_KEYS.DEPOSITS);
    const deposits = rawDeposits ? JSON.parse(rawDeposits) : [];
    deposits.unshift({
      id: 'DEP-' + Math.floor(1000 + Math.random() * 9000),
      goalId,
      goalName: goal.name,
      amount: numAmount,
      date: new Date().toISOString().replace('T', ' ').substring(0, 16),
      note: note || 'Deposit'
    });
    localStorage.setItem(STORAGE_KEYS.DEPOSITS, JSON.stringify(deposits));

    return goal;
  }

  /**
   * Delete goal
   */
  async deleteGoal(goalId) {
    if (this.config.useCloudSync && this.config.appsScriptUrl) {
      try {
        await fetch(this.config.appsScriptUrl, {
          method: 'POST',
          body: JSON.stringify({ action: 'deleteGoal', goalId })
        });
      } catch (e) { }
    }

    const goals = await this.getGoals();
    const filtered = goals.filter(g => g.id !== goalId);
    localStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(filtered));
    return { success: true };
  }

  /**
   * Request Groq AI Financial Recommendations
   */
  async getAiRecommendations(goal) {
    const userApiKey = this.config.groqApiKey;

    // Direct Groq API Call if API key is provided
    if (userApiKey) {
      try {
        const systemPrompt = `You are SaveIQ Financial AI, an elite behavioral economist and personal finance coach.
Provide encouraging, mathematically precise, and actionable savings advice. Return ONLY valid JSON in this exact structure:
{
  "feasibilityScore": <number 1-100>,
  "feasibilityStatus": "<Realistic | Ambitious | High Risk | Ahead of Schedule>",
  "dailyTarget": <number>,
  "weeklyTarget": <number>,
  "summary": "<1-2 sentence motivating summary>",
  "milestones": [
    {"checkpoint": "<Milestone name>", "targetAmount": <number>, "eta": "<relative time>"}
  ],
  "actionableHacks": [
    "<3-4 highly specific tactical suggestions for this goal and timeframe>"
  ],
  "behavioralNudge": "<psychological tip to avoid impulse spending>"
}`;

        const userPrompt = `Savings Goal:
- Name: ${goal.name}
- Category: ${goal.purpose}
- Target: $${goal.targetAmount}
- Current: $${goal.currentSavings}
- Remaining: $${goal.remainingAmount}
- Progress: ${goal.progressPct}%
- Deadline: ${goal.deadline} (${goal.daysRemaining} days left)
- Status: ${goal.status}`;

        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${userApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt }
            ],
            temperature: 0.6,
            response_format: { type: 'json_object' }
          })
        });

        if (res.ok) {
          const data = await res.json();
          const parsed = JSON.parse(data.choices[0].message.content);
          parsed.engine = 'Groq Cloud LLaMA 3.3 70B (Live)';
          return parsed;
        } else {
          console.warn('Groq API error:', res.status);
        }
      } catch (err) {
        console.warn('Error querying Groq API directly, using fallback:', err);
      }
    }

    // If cloud sync with Apps Script has backend Groq configured
    if (this.config.useCloudSync && this.config.appsScriptUrl) {
      try {
        const res = await fetch(`${this.config.appsScriptUrl}?action=getAiInsight&goalId=${goal.id}`);
        const json = await res.json();
        if (json.status === 'success') {
          return json.data;
        }
      } catch (err) {
        console.warn('Apps script AI insight failed, falling back:', err);
      }
    }

    // Heuristic Smart Financial Advice Engine (Zero-failure offline guarantee)
    return this.generateHeuristicAiAdvice(goal);
  }

  /**
   * Smart Heuristic AI Financial Guidance Fallback
   */
  generateHeuristicAiAdvice(goal) {
    const days = Math.max(1, goal.daysRemaining);
    const remaining = goal.remainingAmount;
    const daily = Number((remaining / days).toFixed(2));
    const weekly = Number((daily * 7).toFixed(2));

    let score = 88;
    let status = 'Realistic';

    if (goal.status === 'Completed') {
      score = 100;
      status = 'Ahead of Schedule';
    } else if (goal.daysRemaining < 0) {
      score = 25;
      status = 'High Risk';
    } else if (daily > 150) {
      score = 50;
      status = 'Ambitious';
    } else if (goal.progressPct >= 70) {
      score = 94;
      status = 'Ahead of Schedule';
    }

    const milestones = [
      {
        checkpoint: '25% Anchor Point',
        targetAmount: Math.round(goal.targetAmount * 0.25),
        eta: goal.daysRemaining > 4 ? `Day ${Math.max(1, Math.round(days * 0.25))}` : 'Immediate'
      },
      {
        checkpoint: 'Halfway Momentum (50%)',
        targetAmount: Math.round(goal.targetAmount * 0.50),
        eta: goal.daysRemaining > 4 ? `Day ${Math.max(2, Math.round(days * 0.50))}` : 'Next Milestone'
      },
      {
        checkpoint: 'Final Stretch (75%)',
        targetAmount: Math.round(goal.targetAmount * 0.75),
        eta: goal.daysRemaining > 4 ? `Day ${Math.max(3, Math.round(days * 0.75))}` : 'Closing Window'
      }
    ];

    let hacks = [
      `Automate a recurring deposit of $${weekly} each Monday morning to avoid manual willpower fatigue.`,
      `Implement the "Rule of 72 Hours" for non-essential purchases; any impulse item above $40 must wait 3 days.`,
      `Allocate 50% of any unexpected windfalls (bonuses, cash gifts, tax refunds) directly toward "${goal.name}".`
    ];

    if (goal.purpose === 'Tech & Gadgets') {
      hacks.push('Check for refurbished units from certified vendors or seasonal promo codes to reduce your target outlay.');
    } else if (goal.purpose === 'Emergency Fund') {
      hacks.push('Store this capital in a High-Yield Savings Account (HYSA) with 4-5% APY to generate passive compound yields.');
    } else if (goal.purpose === 'Travel & Vacation') {
      hacks.push('Set price alerts on Google Flights & Hopper; booking mid-week flights often saves 15-25% on major legs.');
    }

    return {
      feasibilityScore: score,
      feasibilityStatus: status,
      dailyTarget: daily,
      weeklyTarget: weekly,
      summary: `To achieve "${goal.name}" before the deadline in ${days} days, save $${daily}/day ($${weekly}/week). You've locked in ${goal.progressPct}% so far!`,
      milestones: milestones,
      actionableHacks: hacks,
      behavioralNudge: 'Remind yourself why this goal matters: intentional saving creates freedom and peace of mind.',
      engine: 'SaveIQ Intelligent Heuristic Engine (Offline Active)'
    };
  }

  /**
   * Trigger deadline audit (live Apps Script or simulated local dispatch)
   */
  async triggerAudit() {
    if (this.config.useCloudSync && this.config.appsScriptUrl) {
      try {
        const res = await fetch(`${this.config.appsScriptUrl}?action=triggerAudit`);
        const json = await res.json();
        return json;
      } catch (e) {
        console.warn('Apps Script trigger audit error:', e);
      }
    }

    // Local simulation of audit
    const goals = await this.getGoals();
    const alerts = [];
    goals.forEach(g => {
      if (g.emailAlerts && g.status !== 'Completed' && (g.daysRemaining <= 7 || g.daysRemaining < 0)) {
        alerts.push({
          goal: g.name,
          email: g.alertEmail || 'user@example.com',
          days: g.daysRemaining,
          urgency: g.daysRemaining < 0 ? 'Overdue' : 'Approaching'
        });
      }
    });

    return {
      status: 'success',
      data: {
        goalsAudited: goals.length,
        alertsSent: alerts.length,
        details: alerts,
        simulated: true
      }
    };
  }
}

// Global API instance
window.saveIQApi = new SaveIQApi();
