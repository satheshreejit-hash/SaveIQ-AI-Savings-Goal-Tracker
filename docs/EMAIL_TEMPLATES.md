# SaveIQ – Automated Gmail Notification Templates

SaveIQ includes an automated audit service that runs daily via Google Apps Script time-driven triggers. When a savings goal deadline is approaching or overdue, it automatically constructs and dispatches a responsive HTML notification via `GmailApp.sendEmail()`.

---

## 📬 1. Approaching Deadline Alert (≤ 7 Days Left)

### Subject Line:
`🎯 SaveIQ Alert: 5 days left for "Japan Cherry Blossom Vacation"`

### Email Preview:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background-color: #0f172a; margin: 0; padding: 24px; color: #f8fafc; }
    .container { max-width: 580px; margin: 0 auto; background: #1e293b; border-radius: 16px; overflow: hidden; border: 1px solid #334155; }
    .header { background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 32px 24px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; color: #ffffff; letter-spacing: -0.5px; }
    .badge { display: inline-block; background-color: #f59e0b; color: white; padding: 6px 16px; border-radius: 9999px; font-weight: bold; font-size: 13px; margin-top: 12px; }
    .body-content { padding: 28px 24px; }
    .progress-bar-bg { background-color: #334155; border-radius: 8px; height: 12px; width: 100%; overflow: hidden; margin: 16px 0 8px 0; }
    .progress-bar-fill { background: linear-gradient(90deg, #6366f1, #06b6d4); height: 100%; width: 68%; border-radius: 8px; }
    .progress-text { display: flex; justify-content: space-between; font-size: 12px; color: #94a3b8; }
    .advice-box { background: rgba(99, 102, 241, 0.1); border-left: 4px solid #6366f1; padding: 16px; border-radius: 0 8px 8px 0; margin-top: 20px; font-size: 14px; line-height: 1.5; color: #cbd5e1; }
    .footer { text-align: center; padding: 20px; font-size: 12px; color: #64748b; border-top: 1px solid #334155; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>SaveIQ Financial Alert</h1>
      <div class="badge">Deadline approaching in 5 days!</div>
    </div>
    <div class="body-content">
      <p style="font-size: 15px; margin-top: 0;">Hello,</p>
      <p style="font-size: 14px; line-height: 1.6; color: #cbd5e1;">
        This is an automated checkpoint from <strong>SaveIQ</strong> for your goal <strong>"Japan Cherry Blossom Vacation"</strong> (Travel & Vacation).
      </p>

      <div class="progress-bar-bg">
        <div class="progress-bar-fill"></div>
      </div>
      <div class="progress-text">
        <span>$2,380 saved</span>
        <span>68% ($1,120 left)</span>
      </div>

      <table width="100%" cellpadding="8" style="margin: 20px 0; background: #0f172a; border-radius: 12px; border-collapse: collapse;">
        <tr>
          <td style="color: #94a3b8; font-size: 13px;">Target Amount</td>
          <td align="right" style="font-weight: bold; color: #ffffff;">$3,500</td>
        </tr>
        <tr>
          <td style="color: #94a3b8; font-size: 13px;">Deadline</td>
          <td align="right" style="font-weight: bold; color: #ffffff;">2026-10-04</td>
        </tr>
        <tr>
          <td style="color: #94a3b8; font-size: 13px;">Required Daily Pace</td>
          <td align="right" style="font-weight: bold; color: #38bdf8;">$224.00 / day</td>
        </tr>
        <tr>
          <td style="color: #94a3b8; font-size: 13px;">Required Weekly Pace</td>
          <td align="right" style="font-weight: bold; color: #a78bfa;">$1,568.00 / week</td>
        </tr>
      </table>

      <div class="advice-box">
        💡 <strong>AI Tip:</strong> You only need <strong>$224.00</strong> per day to hit your target before the deadline. Even a small micro-deposit today moves you closer to financial freedom!
      </div>
    </div>
    <div class="footer">
      Sent by SaveIQ – AI Savings Goal Tracker &bull; Powered by Google Apps Script & Groq AI
    </div>
  </div>
</body>
</html>
```

---

## ⚠️ 2. Overdue Goal Reminder

### Subject Line:
`⚠️ Overdue Notice: "Emergency Fund"`

### Distinctive Features:
- Red alert badge: `Your savings goal deadline has passed!`
- Emphasizes recovery plan and revised milestone pacing without shame-based language.
- Recomputes new target daily rate based on user adjustment.
