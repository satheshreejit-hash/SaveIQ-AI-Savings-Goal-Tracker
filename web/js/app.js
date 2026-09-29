/**
 * SaveIQ - Main Application Controller
 * Handles UI interactions, state updates, modals, and dynamic rendering
 */

class SaveIQApp {
  constructor() {
    this.goals = [];
    this.currentFilter = 'all';
    this.currentStatusFilter = 'all';
    this.searchQuery = '';
    this.sortBy = 'deadline';
    this.selectedGoalForAi = null;
    this.selectedGoalForDeposit = null;

    this.init();
  }

  async init() {
    this.setupEventListeners();
    this.loadUserSettings();
    await this.refreshGoals();
  }

  // ==========================================
  // STATE & DATA REFRESH
  // ==========================================

  async refreshGoals() {
    try {
      this.goals = await window.saveIQApi.getGoals();
      this.renderKPIs();
      this.renderGoals();
      this.renderCategoryBreakdown();
      this.updateConnectionBadge();
    } catch (err) {
      console.error('Failed to load goals:', err);
      this.showToast('Failed to load goals data', 'error');
    }
  }

  updateConnectionBadge() {
    const badgeText = document.getElementById('connectionStatusText');
    const badgeDot = document.getElementById('connectionStatusDot');
    if (!badgeText || !badgeDot) return;

    const config = window.saveIQApi.config;
    if (config.useCloudSync && config.appsScriptUrl) {
      badgeText.textContent = 'Google Sheets Connected';
      badgeDot.style.background = '#10b981';
      badgeDot.style.boxShadow = '0 0 8px #10b981';
    } else {
      badgeText.textContent = 'Local Demo Mode';
      badgeDot.style.background = '#3b82f6';
      badgeDot.style.boxShadow = '0 0 8px #3b82f6';
    }
  }

  // ==========================================
  // RENDERING LOGIC
  // ==========================================

  renderKPIs() {
    const totalGoals = this.goals.length;
    let totalTarget = 0;
    let totalSaved = 0;
    let activeCount = 0;
    let completedCount = 0;
    let overdueCount = 0;
    let approachingCount = 0;
    let totalDailyVelocity = 0;

    this.goals.forEach(g => {
      totalTarget += g.targetAmount;
      totalSaved += g.currentSavings;

      if (g.status === 'Completed') {
        completedCount++;
      } else {
        activeCount++;
        totalDailyVelocity += Number(g.requiredDaily || 0);

        if (g.status === 'Overdue') {
          overdueCount++;
        } else if (g.status === 'Approaching') {
          approachingCount++;
        }
      }
    });

    const overallPct = totalTarget > 0 ? Math.min(100, Math.round((totalSaved / totalTarget) * 100)) : 0;
    const currency = window.saveIQApi.config.currencySymbol || '$';

    document.getElementById('kpiTotalGoals').textContent = totalGoals;
    document.getElementById('kpiGoalsSubtext').textContent = `${activeCount} active · ${completedCount} completed`;

    document.getElementById('kpiTotalSaved').textContent = `${currency}${totalSaved.toLocaleString()}`;
    document.getElementById('kpiTargetSubtext').textContent = `of ${currency}${totalTarget.toLocaleString()} target`;

    document.getElementById('kpiOverallProgress').textContent = `${overallPct}%`;
    const progressFill = document.getElementById('kpiProgressFill');
    if (progressFill) progressFill.style.width = `${overallPct}%`;

    document.getElementById('kpiAlertsCount').textContent = overdueCount + approachingCount;
    document.getElementById('kpiAlertsSubtext').textContent = `${overdueCount} overdue · ${approachingCount} due soon`;

    const velocityElem = document.getElementById('kpiDailyVelocity');
    if (velocityElem) {
      velocityElem.textContent = `${currency}${totalDailyVelocity.toFixed(0)}/day`;
    }
  }

  renderGoals() {
    const container = document.getElementById('goalsGrid');
    if (!container) return;

    let filtered = [...this.goals];

    // Filter by Purpose / Category
    if (this.currentFilter !== 'all') {
      filtered = filtered.filter(g => g.purpose === this.currentFilter);
    }

    // Filter by Status
    if (this.currentStatusFilter !== 'all') {
      filtered = filtered.filter(g => g.status.toLowerCase() === this.currentStatusFilter.toLowerCase());
    }

    // Search Query
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      filtered = filtered.filter(g =>
        g.name.toLowerCase().includes(q) ||
        g.purpose.toLowerCase().includes(q)
      );
    }

    // Sorting
    filtered.sort((a, b) => {
      if (this.sortBy === 'deadline') {
        return new Date(a.deadline) - new Date(b.deadline);
      } else if (this.sortBy === 'progress') {
        return b.progressPct - a.progressPct;
      } else if (this.sortBy === 'target') {
        return b.targetAmount - a.targetAmount;
      } else if (this.sortBy === 'name') {
        return a.name.localeCompare(b.name);
      }
      return 0;
    });

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🎯</div>
          <h3 class="empty-title">No Savings Goals Found</h3>
          <p class="empty-desc">Create your first goal to begin tracking your financial freedom journey with AI recommendations.</p>
          <button class="btn btn-primary" onclick="app.openCreateGoalModal()">
            <span>+</span> Create Savings Goal
          </button>
        </div>
      `;
      return;
    }

    const currency = window.saveIQApi.config.currencySymbol || '$';

    container.innerHTML = filtered.map(goal => {
      const isCompleted = goal.status === 'Completed';
      const isOverdue = goal.status === 'Overdue';
      const isApproaching = goal.status === 'Approaching';

      let statusBadgeClass = 'active';
      let statusBadgeText = `${goal.daysRemaining} days left`;

      if (isCompleted) {
        statusBadgeClass = 'completed';
        statusBadgeText = '✓ Goal Achieved';
      } else if (isOverdue) {
        statusBadgeClass = 'overdue';
        statusBadgeText = `⚠️ Overdue (${Math.abs(goal.daysRemaining)}d)`;
      } else if (isApproaching) {
        statusBadgeClass = 'approaching';
        statusBadgeText = `⚡ ${goal.daysRemaining} days left`;
      }

      return `
        <div class="goal-card" id="card-${goal.id}">
          <div>
            <div class="goal-card-header">
              <div>
                <span class="goal-purpose-badge">
                  ${this.getCategoryIcon(goal.purpose)} ${goal.purpose}
                </span>
                <h3 class="goal-title">${this.escapeHtml(goal.name)}</h3>
              </div>
              <span class="status-pill ${statusBadgeClass}">${statusBadgeText}</span>
            </div>

            <div class="financial-row">
              <span class="current-saved">${currency}${goal.currentSavings.toLocaleString()}</span>
              <span class="target-amount">/ ${currency}${goal.targetAmount.toLocaleString()}</span>
            </div>

            <div class="goal-progress-wrap">
              <div class="goal-progress-info">
                <span>Progress</span>
                <span style="font-family: var(--font-mono); font-weight: 700;">${goal.progressPct}%</span>
              </div>
              <div class="goal-progress-track">
                <div class="goal-progress-bar ${isCompleted ? 'completed' : ''}" style="width: ${goal.progressPct}%;"></div>
              </div>
            </div>

            <div class="goal-meta-grid">
              <div class="goal-meta-item">
                <span class="goal-meta-label">Deadline</span>
                <span class="goal-meta-value">${goal.deadline}</span>
              </div>
              <div class="goal-meta-item">
                <span class="goal-meta-label">Required Pace</span>
                <span class="goal-meta-value" style="color: #38bdf8;">
                  ${isCompleted ? 'Done' : `${currency}${goal.requiredDaily}/day`}
                </span>
              </div>
            </div>
          </div>

          <div class="goal-card-actions">
            <button class="btn btn-card-deposit btn-emerald" onclick="app.openDepositModal('${goal.id}')" ${isCompleted ? 'disabled title="Goal completed"' : ''}>
              <span>⚡</span> Deposit
            </button>
            <button class="btn btn-card-ai" onclick="app.openAiInsightsModal('${goal.id}')">
              <span>🧠</span> AI Insights
            </button>
            <button class="btn btn-secondary btn-icon" onclick="app.deleteGoalConfirm('${goal.id}')" title="Delete Goal">
              <span>🗑️</span>
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  renderCategoryBreakdown() {
    if (window.SaveIQCharts) {
      window.SaveIQCharts.renderCategoryBreakdown(this.goals, 'categoryDistributionContainer');
    }
  }

  getCategoryIcon(category) {
    switch (category) {
      case 'Emergency Fund': return '🛡️';
      case 'Tech & Gadgets': return '💻';
      case 'Travel & Vacation': return '✈️';
      case 'Education': return '🎓';
      case 'Real Estate': return '🏡';
      case 'Vehicles': return '🚗';
      case 'Investments': return '📈';
      default: return '🎯';
    }
  }

  // ==========================================
  // EVENT LISTENERS & UI INTERACTIONS
  // ==========================================

  setupEventListeners() {
    // Search input
    const searchInput = document.getElementById('goalSearchInput');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value;
        this.renderGoals();
      });
    }

    // Sort select
    const sortSelect = document.getElementById('sortBySelect');
    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        this.sortBy = e.target.value;
        this.renderGoals();
      });
    }

    // Status filter select
    const statusSelect = document.getElementById('statusFilterSelect');
    if (statusSelect) {
      statusSelect.addEventListener('change', (e) => {
        this.currentStatusFilter = e.target.value;
        this.renderGoals();
      });
    }

    // Category chips
    document.querySelectorAll('.chip').forEach(chip => {
      chip.addEventListener('click', (e) => {
        document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
        e.target.classList.add('active');
        this.currentFilter = e.target.dataset.category || 'all';
        this.renderGoals();
      });
    });

    // Create Goal Form submission
    const createGoalForm = document.getElementById('createGoalForm');
    if (createGoalForm) {
      createGoalForm.addEventListener('submit', (e) => this.handleCreateGoal(e));
    }

    // Deposit Form submission
    const depositForm = document.getElementById('depositForm');
    if (depositForm) {
      depositForm.addEventListener('submit', (e) => this.handleDepositSubmit(e));
    }

    // Settings Form submission
    const settingsForm = document.getElementById('settingsForm');
    if (settingsForm) {
      settingsForm.addEventListener('submit', (e) => this.handleSaveSettings(e));
    }

    // Esc key close modals
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeAllModals();
      }
    });
  }

  // ==========================================
  // MODAL ACTIONS
  // ==========================================

  openCreateGoalModal() {
    const form = document.getElementById('createGoalForm');
    if (form) form.reset();

    // Default deadline to 30 days from now
    const d = new Date();
    d.setDate(d.getDate() + 30);
    const deadlineInput = document.getElementById('goalDeadline');
    if (deadlineInput) deadlineInput.value = d.toISOString().split('T')[0];

    this.openModal('createGoalModal');
  }

  async handleCreateGoal(e) {
    e.preventDefault();
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = 'Creating...';

    const goalData = {
      name: document.getElementById('goalName').value.trim(),
      targetAmount: Number(document.getElementById('goalTargetAmount').value),
      initialSavings: Number(document.getElementById('goalInitialSavings').value || 0),
      deadline: document.getElementById('goalDeadline').value,
      purpose: document.getElementById('goalPurpose').value,
      emailAlerts: document.getElementById('goalEmailAlerts').checked,
      alertEmail: document.getElementById('goalAlertEmail').value.trim()
    };

    try {
      await window.saveIQApi.createGoal(goalData);
      this.closeModal('createGoalModal');
      this.showToast(`Savings goal "${goalData.name}" created!`, 'success');
      await this.refreshGoals();
    } catch (err) {
      console.error(err);
      this.showToast('Error creating goal', 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalText;
    }
  }

  openDepositModal(goalId) {
    const goal = this.goals.find(g => g.id === goalId);
    if (!goal) return;

    this.selectedGoalForDeposit = goal;
    document.getElementById('depositGoalTitle').textContent = `Deposit to "${goal.name}"`;
    document.getElementById('depositGoalRemaining').textContent = `${window.saveIQApi.config.currencySymbol}${goal.remainingAmount.toLocaleString()} remaining`;
    document.getElementById('depositAmount').value = '';
    document.getElementById('depositNote').value = '';

    this.openModal('depositModal');
  }

  async handleDepositSubmit(e) {
    e.preventDefault();
    if (!this.selectedGoalForDeposit) return;

    const amount = Number(document.getElementById('depositAmount').value);
    const note = document.getElementById('depositNote').value.trim();

    try {
      const updated = await window.saveIQApi.recordDeposit(
        this.selectedGoalForDeposit.id,
        this.selectedGoalForDeposit.name,
        amount,
        note
      );

      this.closeModal('depositModal');
      this.showToast(`Recorded ${window.saveIQApi.config.currencySymbol}${amount} deposit!`, 'success');

      if (updated.status === 'Completed') {
        this.showToast(`🎉 Congratulations! You achieved "${this.selectedGoalForDeposit.name}"!`, 'success');
      }

      await this.refreshGoals();
    } catch (err) {
      console.error(err);
      this.showToast('Failed to record deposit', 'error');
    }
  }

  async openAiInsightsModal(goalId) {
    const goal = this.goals.find(g => g.id === goalId);
    if (!goal) return;

    this.selectedGoalForAi = goal;
    document.getElementById('aiGoalTitle').textContent = `AI Financial Strategy: "${goal.name}"`;

    const bodyContainer = document.getElementById('aiModalBody');
    bodyContainer.innerHTML = `
      <div class="skeleton-loader">
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
          <div class="skeleton-line" style="width: 40px; height: 40px; border-radius: 10px;"></div>
          <div class="skeleton-line" style="flex: 1; height: 24px;"></div>
        </div>
        <div class="skeleton-line" style="height: 60px;"></div>
        <div class="skeleton-line" style="height: 40px;"></div>
        <div class="skeleton-line" style="height: 40px;"></div>
      </div>
      <p style="text-align: center; color: var(--text-muted); font-size: 13px; margin-top: 16px;">
        Analyzing financial velocity, purpose dynamics, and milestones with Groq AI...
      </p>
    `;

    this.openModal('aiModal');

    try {
      const advice = await window.saveIQApi.getAiRecommendations(goal);
      this.renderAiInsights(goal, advice);
    } catch (err) {
      console.error(err);
      bodyContainer.innerHTML = `
        <div style="color: var(--status-overdue); padding: 20px; text-align: center;">
          Failed to generate AI financial insights. Please verify connection or API key.
        </div>
      `;
    }
  }

  renderAiInsights(goal, advice) {
    const bodyContainer = document.getElementById('aiModalBody');
    const currency = window.saveIQApi.config.currencySymbol || '$';

    let milestonesHtml = (advice.milestones || []).map(m => `
      <div class="ai-milestone-item">
        <div>
          <div style="font-weight: 700; font-size: 14px;">${this.escapeHtml(m.checkpoint)}</div>
          <div style="font-size: 12px; color: var(--text-dim);">${this.escapeHtml(m.eta)}</div>
        </div>
        <div style="font-family: var(--font-mono); font-weight: 800; color: #38bdf8;">
          ${currency}${m.targetAmount.toLocaleString()}
        </div>
      </div>
    `).join('');

    let hacksHtml = (advice.actionableHacks || []).map(h => `
      <li>${this.escapeHtml(h)}</li>
    `).join('');

    bodyContainer.innerHTML = `
      <div class="ai-score-card">
        <div>
          <div style="font-size: 12px; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.6px;">Goal Feasibility Score</div>
          <div style="font-size: 14px; font-weight: 600; color: #a5b4fc; margin-top: 2px;">${advice.feasibilityStatus}</div>
        </div>
        <div class="ai-score-number">${advice.feasibilityScore}<span style="font-size: 18px; color: var(--text-dim);">/100</span></div>
      </div>

      <p style="font-size: 14px; line-height: 1.6; margin-bottom: 20px; color: var(--text-main);">
        ${this.escapeHtml(advice.summary)}
      </p>

      <div class="ai-rate-boxes">
        <div class="ai-rate-box">
          <div style="font-size: 11px; text-transform: uppercase; color: var(--text-dim);">Required Daily Pace</div>
          <div class="ai-rate-val">${currency}${advice.dailyTarget}</div>
        </div>
        <div class="ai-rate-box">
          <div style="font-size: 11px; text-transform: uppercase; color: var(--text-dim);">Required Weekly Pace</div>
          <div class="ai-rate-val" style="color: #a78bfa;">${currency}${advice.weeklyTarget}</div>
        </div>
      </div>

      <div style="font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px; color: var(--text-muted);">
        Actionable Roadmap & Milestones
      </div>
      <div class="ai-milestones-list">${milestonesHtml}</div>

      <div style="font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px; color: var(--text-muted);">
        Strategic Spending & Savings Hacks
      </div>
      <ul class="ai-hacks-list">${hacksHtml}</ul>

      <div class="ai-nudge-box">
        💡 <strong>Psychological Anchor:</strong> ${this.escapeHtml(advice.behavioralNudge)}
      </div>

      <div style="margin-top: 20px; display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: var(--text-dim);">
        <span>Engine: ${this.escapeHtml(advice.engine || 'Groq LLaMA 3.3')}</span>
        <button class="btn btn-secondary" style="padding: 6px 12px; font-size: 12px;" onclick="app.copyAiAdvice()">
          📋 Copy Advice
        </button>
      </div>
    `;
  }

  copyAiAdvice() {
    const bodyContainer = document.getElementById('aiModalBody');
    if (!bodyContainer) return;
    navigator.clipboard.writeText(bodyContainer.innerText).then(() => {
      this.showToast('AI advice copied to clipboard!', 'info');
    });
  }

  async deleteGoalConfirm(goalId) {
    const goal = this.goals.find(g => g.id === goalId);
    if (!goal) return;

    if (confirm(`Are you sure you want to delete "${goal.name}"?`)) {
      try {
        await window.saveIQApi.deleteGoal(goalId);
        this.showToast(`Deleted "${goal.name}"`, 'info');
        await this.refreshGoals();
      } catch (err) {
        console.error(err);
        this.showToast('Failed to delete goal', 'error');
      }
    }
  }

  // ==========================================
  // SETTINGS & AUDIT TRIGGER
  // ==========================================

  openSettingsModal() {
    const config = window.saveIQApi.config;
    document.getElementById('settingAppsScriptUrl').value = config.appsScriptUrl || '';
    document.getElementById('settingGroqApiKey').value = config.groqApiKey || '';
    document.getElementById('settingCloudSync').checked = !!config.useCloudSync;
    document.getElementById('settingCurrency').value = config.currencySymbol || '$';

    this.openModal('settingsModal');
  }

  handleSaveSettings(e) {
    e.preventDefault();
    const updated = {
      appsScriptUrl: document.getElementById('settingAppsScriptUrl').value.trim(),
      groqApiKey: document.getElementById('settingGroqApiKey').value.trim(),
      useCloudSync: document.getElementById('settingCloudSync').checked,
      currencySymbol: document.getElementById('settingCurrency').value
    };

    window.saveIQApi.saveConfig(updated);
    this.closeModal('settingsModal');
    this.showToast('Settings saved successfully!', 'success');
    this.refreshGoals();
  }

  async triggerManualAudit() {
    const btn = document.getElementById('btnTriggerAudit');
    const originalText = btn ? btn.innerHTML : '';
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = 'Auditing...';
    }

    try {
      const res = await window.saveIQApi.triggerAudit();
      const count = res.data ? res.data.alertsSent : 0;
      this.showToast(`Audit completed: ${count} email alerts dispatched/simulated!`, 'success');
    } catch (err) {
      console.error(err);
      this.showToast('Audit failed', 'error');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = originalText;
      }
    }
  }

  // ==========================================
  // THEME & UTILITIES
  // ==========================================

  loadUserSettings() {
    const config = window.saveIQApi.config;
    if (config.theme === 'light') {
      document.body.setAttribute('data-theme', 'light');
    }
  }

  toggleTheme() {
    const current = document.body.getAttribute('data-theme');
    const next = current === 'light' ? 'dark' : 'light';
    if (next === 'light') {
      document.body.setAttribute('data-theme', 'light');
    } else {
      document.body.removeAttribute('data-theme');
    }
    window.saveIQApi.saveConfig({ theme: next });
  }

  openModal(modalId) {
    const el = document.getElementById(modalId);
    if (el) el.classList.add('active');
  }

  closeModal(modalId) {
    const el = document.getElementById(modalId);
    if (el) el.classList.remove('active');
  }

  closeAllModals() {
    document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
  }

  showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icon = type === 'success' ? '✓' : (type === 'error' ? '⚠️' : 'ℹ️');
    toast.innerHTML = `<span>${icon}</span> <span>${this.escapeHtml(message)}</span>`;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

// Global initialization
window.addEventListener('DOMContentLoaded', () => {
  window.app = new SaveIQApp();
});
