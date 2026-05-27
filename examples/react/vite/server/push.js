const VAPID_PUBLIC_KEY = "BJUUaF0CZdvMgRCIFV3Mw6n8HvekMpB9uqdUcQqj4GqOkJr377pKLlZQ2j_rhIUe3jB87GOueZavBnvqmV9KDrM";

export { VAPID_PUBLIC_KEY };

export async function triggerPushNotification(readDb, writeDb, webPush, { title, body, icon = "/vite.svg" }) {
  let subs = (readDb().pushSubscriptions || []).slice();
  const results = [];
  for (const sub of subs) {
    try {
      await webPush.sendNotification(sub, JSON.stringify({ title, body, icon }));
      results.push({ endpoint: sub.endpoint, status: "sent" });
    } catch (err) {
      if (err.statusCode === 410 || err.statusCode === 404) {
        subs = subs.filter((s) => s.endpoint !== sub.endpoint);
        results.push({ endpoint: sub.endpoint, status: "expired-removed" });
      } else {
        results.push({ endpoint: sub.endpoint, status: "error", error: err.message });
      }
    }
  }
  const db = readDb();
  db.pushSubscriptions = subs;
  writeDb(db);
  return results;
}

export function setupPush(app, readDb, writeDb, webPush) {
  const vapidKeys = {
    publicKey: VAPID_PUBLIC_KEY,
    privateKey: "w0uoSa848tRc8tTCISXYl7y2Pc9SlpDoW-a_4V5-Nw0",
  };

  webPush.setVapidDetails("mailto:demo@swoff.dev", vapidKeys.publicKey, vapidKeys.privateKey);

  app.post("/api/push/subscribe", (req, res) => {
    const sub = req.body;
    if (!sub || !sub.endpoint) return res.status(400).json({ error: "Missing subscription" });
    const db = readDb();
    let subs = (db.pushSubscriptions || []).filter((s) => s.endpoint !== sub.endpoint);
    subs.push(sub);
    db.pushSubscriptions = subs;
    writeDb(db);
    res.json({ ok: true });
  });

  app.post("/api/push/unsubscribe", (req, res) => {
    const { endpoint } = req.body || {};
    const db = readDb();
    let subs = db.pushSubscriptions || [];
    if (endpoint) {
      subs = subs.filter((s) => s.endpoint !== endpoint);
    }
    db.pushSubscriptions = subs;
    writeDb(db);
    res.json({ ok: true });
  });

  app.post("/api/push/trigger", async (req, res) => {
    const { title = "Swoff Notification", body = "You have a new update!", icon = "/vite.svg" } = req.body || {};
    const results = await triggerPushNotification(readDb, writeDb, webPush, { title, body, icon });
    res.json({ ok: true, results });
  });
}
