// server/routes/platformAdmin.js
// Кабинет владельца платформы (посредника): подключение ресторанов,
// сводная выручка по комиссии, статус интеграций с агрегаторами.
'use strict';

const express = require('express');
const db = require('../db');
const { verifyPassword, hashPassword } = require('../services/auth');
const { AGGREGATOR_LABELS } = require('../services/aggregators');

const router = express.Router();

function requirePlatformAuth(req, res, next) {
  if (!req.session.platformAdminId) {
    return res.status(401).json({ error: 'Требуется вход в кабинет платформы' });
  }
  next();
}

router.post('/login', (req, res) => {
  const { username, password } = req.body || {};
  const admin = db.prepare(`SELECT * FROM platform_admins WHERE username = ?`).get(username);
  if (!admin || !verifyPassword(password || '', admin.password_hash)) {
    return res.status(401).json({ error: 'Неверный логин или пароль' });
  }
  req.session.platformAdminId = admin.id;
  res.json({ ok: true });
});

router.post('/logout', (req, res) => {
  req.session.platformAdminId = null;
  res.json({ ok: true });
});

router.get('/restaurants', requirePlatformAuth, (req, res) => {
  const rows = db.prepare(`SELECT * FROM restaurants ORDER BY created_at DESC`).all();
  res.json(rows.map((r) => ({ ...r, aggregators_enabled: JSON.parse(r.aggregators_enabled || '[]') })));
});

router.post('/restaurants', requirePlatformAuth, (req, res) => {
  const { name, slug, address, phone, city, commission_rate, admin_username, admin_password } = req.body || {};
  if (!name || !slug || !admin_username || !admin_password) {
    return res.status(400).json({ error: 'Заполните название, slug, логин и пароль администратора ресторана' });
  }
  try {
    const result = db
      .prepare(`INSERT INTO restaurants (name, slug, city, address, phone, commission_rate, status) VALUES (?, ?, ?, ?, ?, ?, 'active')`)
      .run(name, slug, city || 'Тюмень', address || null, phone || null, commission_rate ? Number(commission_rate) : 0.07);
    const restaurantId = result.lastInsertRowid;
    db.prepare(`INSERT INTO restaurant_users (restaurant_id, username, password_hash) VALUES (?, ?, ?)`)
      .run(restaurantId, admin_username, hashPassword(admin_password));
    res.status(201).json({ ok: true, restaurantId });
  } catch (err) {
    res.status(400).json({ error: 'Не удалось создать ресторан (возможно, slug или логин уже заняты)' });
  }
});

router.patch('/restaurants/:id', requirePlatformAuth, (req, res) => {
  const restaurant = db.prepare(`SELECT * FROM restaurants WHERE id = ?`).get(req.params.id);
  if (!restaurant) return res.status(404).json({ error: 'Ресторан не найден' });

  const { status, commission_rate, aggregators_enabled } = req.body || {};
  const nextStatus = status || restaurant.status;
  const nextRate = commission_rate !== undefined ? Number(commission_rate) : restaurant.commission_rate;
  const nextAggregators = aggregators_enabled ? JSON.stringify(aggregators_enabled) : restaurant.aggregators_enabled;

  db.prepare(`UPDATE restaurants SET status = ?, commission_rate = ?, aggregators_enabled = ? WHERE id = ?`)
    .run(nextStatus, nextRate, nextAggregators, restaurant.id);
  res.json({ ok: true });
});

router.get('/aggregators', requirePlatformAuth, (req, res) => {
  res.json(Object.entries(AGGREGATOR_LABELS).map(([code, label]) => ({ code, label })));
});

router.get('/orders', requirePlatformAuth, (req, res) => {
  const rows = db
    .prepare(`
      SELECT o.*, r.name AS restaurant_name
      FROM orders o JOIN restaurants r ON r.id = o.restaurant_id
      ORDER BY o.created_at DESC LIMIT 300
    `)
    .all();
  res.json(rows);
});

// Реквизиты владельца платформы, на которые должна перечисляться удержанная
// комиссия после подключения реального эквайринга. Отдаём только в
// авторизованном кабинете платформы — это чувствительные банковские данные.
router.get('/requisites', requirePlatformAuth, (req, res) => {
  const row = db.prepare(`SELECT * FROM platform_requisites ORDER BY id DESC LIMIT 1`).get();
  if (!row) return res.status(404).json({ error: 'Реквизиты ещё не заполнены' });
  res.json(row);
});

router.put('/requisites', requirePlatformAuth, (req, res) => {
  const existing = db.prepare(`SELECT id FROM platform_requisites ORDER BY id DESC LIMIT 1`).get();
  const b = req.body || {};
  const fields = [
    'full_name', 'short_name', 'legal_address', 'phone', 'inn', 'ogrnip',
    'checking_account', 'correspondent_account', 'bik', 'bank_name', 'owner_name', 'email', 'contact_phone',
  ];
  const values = fields.map((f) => b[f] || null);
  if (existing) {
    db.prepare(`UPDATE platform_requisites SET ${fields.map((f) => `${f} = ?`).join(', ')} WHERE id = ?`)
      .run(...values, existing.id);
  } else {
    db.prepare(`INSERT INTO platform_requisites (${fields.join(', ')}) VALUES (${fields.map(() => '?').join(', ')})`)
      .run(...values);
  }
  res.json({ ok: true });
});

router.get('/stats', requirePlatformAuth, (req, res) => {
  const totals = db
    .prepare(`
      SELECT
        COUNT(*) AS orders_count,
        COALESCE(SUM(subtotal), 0) AS gross_gmv,
        COALESCE(SUM(commission_amount), 0) AS platform_commission_earned,
        COALESCE(SUM(restaurant_payout), 0) AS restaurants_payout_total
      FROM orders WHERE payment_status = 'paid'
    `)
    .get();

  const bySource = db
    .prepare(`
      SELECT aggregator_source, COUNT(*) AS orders_count, COALESCE(SUM(commission_amount), 0) AS commission
      FROM orders WHERE payment_status = 'paid'
      GROUP BY aggregator_source
    `)
    .all();

  const restaurantsCount = db.prepare(`SELECT COUNT(*) AS c FROM restaurants WHERE status = 'active'`).get().c;

  res.json({ totals, bySource, restaurantsCount });
});

module.exports = router;
