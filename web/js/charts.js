/**
 * SaveIQ - Lightweight SVG Visualizer & Charting Utilities
 * Provides dependency-free, high-performance visual charts
 */

const SaveIQCharts = {
  /**
   * Generates a circular SVG progress gauge
   */
  renderCircularGauge(percentage, size = 80, strokeWidth = 8, color = '#6366f1') {
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (Math.min(100, Math.max(0, percentage)) / 100) * circumference;

    return `
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" class="circular-chart">
        <circle
          stroke="rgba(255, 255, 255, 0.08)"
          stroke-width="${strokeWidth}"
          fill="transparent"
          r="${radius}"
          cx="${size / 2}"
          cy="${size / 2}"
        />
        <circle
          stroke="${color}"
          stroke-width="${strokeWidth}"
          stroke-dasharray="${circumference}"
          stroke-dashoffset="${offset}"
          stroke-linecap="round"
          fill="transparent"
          r="${radius}"
          cx="${size / 2}"
          cy="${size / 2}"
          style="transition: stroke-dashoffset 0.8s ease; transform: rotate(-90deg); transform-origin: 50% 50%;"
        />
        <text
          x="50%"
          y="50%"
          dominant-baseline="central"
          text-anchor="middle"
          fill="#f8fafc"
          font-family="'JetBrains Mono', monospace"
          font-weight="800"
          font-size="${size * 0.22}px"
        >
          ${percentage}%
        </text>
      </svg>
    `;
  },

  /**
   * Generates a category distribution breakdown chart
   */
  renderCategoryBreakdown(goals, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!goals || goals.length === 0) {
      container.innerHTML = '<div style="color: var(--text-dim); font-size: 13px;">No goals to analyze</div>';
      return;
    }

    const categories = {};
    let totalTarget = 0;

    goals.forEach(g => {
      const cat = g.purpose || 'Other';
      categories[cat] = (categories[cat] || 0) + g.targetAmount;
      totalTarget += g.targetAmount;
    });

    if (totalTarget === 0) return;

    const colors = ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#3b82f6'];
    const entries = Object.entries(categories).sort((a, b) => b[1] - a[1]);

    let barsHtml = `
      <div style="display: flex; height: 10px; width: 100%; border-radius: 9999px; overflow: hidden; margin-bottom: 12px; background: rgba(255,255,255,0.06);">
    `;

    entries.forEach(([cat, amount], idx) => {
      const pct = ((amount / totalTarget) * 100).toFixed(1);
      const color = colors[idx % colors.length];
      barsHtml += `<div style="width: ${pct}%; background-color: ${color};" title="${cat}: ${pct}%"></div>`;
    });
    barsHtml += `</div>`;

    // Legend
    let legendHtml = `<div style="display: flex; flex-wrap: wrap; gap: 10px; font-size: 12px;">`;
    entries.forEach(([cat, amount], idx) => {
      const pct = ((amount / totalTarget) * 100).toFixed(0);
      const color = colors[idx % colors.length];
      legendHtml += `
        <div style="display: flex; align-items: center; gap: 6px;">
          <span style="width: 8px; height: 8px; border-radius: 50%; background: ${color};"></span>
          <span style="color: var(--text-muted);">${cat}</span>
          <span style="font-weight: 700; font-family: var(--font-mono); color: var(--text-main);">${pct}%</span>
        </div>
      `;
    });
    legendHtml += `</div>`;

    container.innerHTML = barsHtml + legendHtml;
  }
};

window.SaveIQCharts = SaveIQCharts;
