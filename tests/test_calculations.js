/**
 * SaveIQ - Unit Test Suite for Financial Calculations & Logic
 * Run using: node tests/test_calculations.js
 */

const assert = require('assert');

// Core Calculation Functions
function calculateDaysRemaining(targetDateStr, baseDate = new Date()) {
  const target = new Date(targetDateStr);
  target.setHours(0, 0, 0, 0);
  const base = new Date(baseDate);
  base.setHours(0, 0, 0, 0);
  return Math.ceil((target - base) / (1000 * 60 * 60 * 24));
}

function calculateSavingsVelocity(targetAmount, currentSavings, daysRemaining) {
  const remaining = Math.max(0, targetAmount - currentSavings);
  if (remaining === 0) return { daily: 0, weekly: 0 };
  const days = Math.max(1, daysRemaining);
  const daily = Number((remaining / days).toFixed(2));
  const weekly = Number((daily * 7).toFixed(2));
  return { daily, weekly };
}

function calculateProgressPct(targetAmount, currentSavings) {
  if (targetAmount <= 0) return 0;
  return Math.min(100, Math.round((currentSavings / targetAmount) * 100));
}

function determineGoalStatus(targetAmount, currentSavings, daysRemaining, approachingThreshold = 7) {
  if (currentSavings >= targetAmount) {
    return 'Completed';
  }
  if (daysRemaining < 0) {
    return 'Overdue';
  }
  if (daysRemaining <= approachingThreshold) {
    return 'Approaching';
  }
  return 'Active';
}

function evaluateFeasibilityScore(targetAmount, currentSavings, daysRemaining) {
  if (currentSavings >= targetAmount) return 100;
  if (daysRemaining < 0) return 20;

  const remaining = targetAmount - currentSavings;
  const days = Math.max(1, daysRemaining);
  const dailyRequired = remaining / days;

  let score = 90;
  if (dailyRequired > 200) score = 40;
  else if (dailyRequired > 100) score = 60;
  else if (dailyRequired > 50) score = 75;

  const progress = (currentSavings / targetAmount) * 100;
  if (progress > 50) score += 5;

  return Math.min(100, Math.max(10, score));
}

// ==========================================
// TEST CASES
// ==========================================

function runTests() {
  console.log('🧪 Starting SaveIQ Financial Calculation Test Suite...\n');
  let passed = 0;
  let total = 0;

  function test(name, fn) {
    total++;
    try {
      fn();
      console.log(`  ✓ ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ✗ ${name}`);
      console.error(`    ${err.message}`);
    }
  }

  // Test 1: Days remaining calculations
  test('calculateDaysRemaining: calculates positive future days correctly', () => {
    const today = new Date('2026-10-01T00:00:00Z');
    const deadline = '2026-10-15';
    const days = calculateDaysRemaining(deadline, today);
    assert.strictEqual(days, 14);
  });

  test('calculateDaysRemaining: calculates overdue negative days correctly', () => {
    const today = new Date('2026-10-10T00:00:00Z');
    const deadline = '2026-10-05';
    const days = calculateDaysRemaining(deadline, today);
    assert.strictEqual(days, -5);
  });

  // Test 2: Savings velocity
  test('calculateSavingsVelocity: computes daily & weekly rates accurately', () => {
    const target = 1000;
    const current = 300; // 700 remaining
    const days = 10;
    const velocity = calculateSavingsVelocity(target, current, days);
    assert.strictEqual(velocity.daily, 70.00);
    assert.strictEqual(velocity.weekly, 490.00);
  });

  test('calculateSavingsVelocity: returns zero when target is reached', () => {
    const target = 500;
    const current = 500;
    const velocity = calculateSavingsVelocity(target, current, 10);
    assert.strictEqual(velocity.daily, 0);
    assert.strictEqual(velocity.weekly, 0);
  });

  // Test 3: Progress percentage
  test('calculateProgressPct: bounds progress correctly at 0%, 50%, and capped at 100%', () => {
    assert.strictEqual(calculateProgressPct(1000, 0), 0);
    assert.strictEqual(calculateProgressPct(1000, 500), 50);
    assert.strictEqual(calculateProgressPct(1000, 1200), 100);
    assert.strictEqual(calculateProgressPct(0, 100), 0);
  });

  // Test 4: Goal status determination
  test('determineGoalStatus: accurately flags Active, Approaching, Completed, Overdue', () => {
    assert.strictEqual(determineGoalStatus(1000, 1000, 5), 'Completed');
    assert.strictEqual(determineGoalStatus(1000, 200, -2), 'Overdue');
    assert.strictEqual(determineGoalStatus(1000, 400, 4), 'Approaching');
    assert.strictEqual(determineGoalStatus(1000, 400, 30), 'Active');
  });

  // Test 5: Feasibility score
  test('evaluateFeasibilityScore: awards 100 for completed and degrades for high daily rates', () => {
    assert.strictEqual(evaluateFeasibilityScore(1000, 1000, 10), 100);
    assert.strictEqual(evaluateFeasibilityScore(1000, 100, -1), 20);
    const scoreNormal = evaluateFeasibilityScore(1000, 500, 50); // $10/day
    assert.ok(scoreNormal >= 80, 'Score should be realistic');
  });

  console.log(`\n📊 Test Results: ${passed}/${total} passed.\n`);
  if (passed !== total) process.exit(1);
}

runTests();
