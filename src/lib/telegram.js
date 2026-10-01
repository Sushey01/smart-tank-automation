const { ALERT } = require('./devices');

let missingLogged = false;

async function sendTelegram(text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    if (!missingLogged) {
      missingLogged = true;
      console.log('[telegram] skipped: TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID is not set');
    }
    return;
  }
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
    if (!response.ok) {
      console.error(`[telegram] send failed status=${response.status}`);
    }
  } catch (err) {
    console.error('[telegram] send failed', err.message);
  }
}

function readingLine(doc, label) {
  const tank = doc.telemetry && doc.telemetry.water_tank;
  const pct = tank ? tank.ultrasonic_depth_pct : '?';
  const volume = tank ? tank.volume_litres : '?';
  const when = doc.timestamp instanceof Date ? doc.timestamp.toISOString() : String(doc.timestamp);
  return `HOME_HUB_01 ${label}: ${pct}% (${volume} L) at ${when}`;
}

async function notifyAlertTransition(previous, doc) {
  const before = new Set((previous && previous.alert_reasons) || []);
  const after = new Set(doc.alert_reasons || []);
  const started = [];
  if (after.has(ALERT.OVERFLOW) && !before.has(ALERT.OVERFLOW)) started.push('overflow');
  if (after.has(ALERT.DRY_RUN) && !before.has(ALERT.DRY_RUN)) started.push('dry-run');
  if (started.length > 0) {
    await sendTelegram(readingLine(doc, started.join(' and ')));
    return;
  }
  if (before.size > 0 && after.size === 0) {
    await sendTelegram(readingLine(doc, 'alert cleared'));
  }
}

module.exports = { notifyAlertTransition };
