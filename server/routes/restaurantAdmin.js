// server/routes/restaurantAdmin.js
// Личный кабинет ресторана-партнёра: приём заказов, статусы, выплаты.
'use strict';

const express = require('express');
const db = require('../db');
const { verifyPassword } = require('../services/auth');

const router = express.Router();

function requireRestaurantAuth(req, res, next) {
  if (!req.session.restaurantId) {
    return res.status(401).json({ error: 'Требуется вход в кабинет ресторана' });
  }
  next();
}

router.post('/login', (req, res) => {
  const { username, password } = req.body || {};
  const user = db.prepare(`SELECT * FROM restaurant_users WHERE username = ?`).get(username);
  if (!user || !verifyPassword(password || '', user.password_hash)) {
    return res.status(401).json({ error: 'Неверный логин или пароль' });
  }
  req.session.restaurantId = user.restaurant_id;
  const restaurant = db.prepare(`SELECT id, name, slug, commission_rate FROM restaurants WHERE id = ?`).get(user.restaurant_id);
  res.json({ ok: true, restaurant });
});

router.post('/logout', (req, res) => {
  req.session.restaurantId = null;
  res.json({ ok: true });
});

router.get('/me', requireRestaurantAuth, (req, res) => {
  const restaurant = db.prepare(`SELECT id, name, slug, commission_rate FROM restaurants WHERE id = ?`).get(req.session.restaurantId);
  res.json({ restaurant });
});

router.get('/orders', requireRestaurantAuth, (req, res) => {
  const orders = db
    .prepare(`SELECT * FROM orders WHERE restaurant_id = ? ORDER BY created_at DESC LIMIT 200`)
    .all(req.session.restaurantId);
  const withItems = orders.map((o) => ({
    ...o,
    items: db.prepare(`SELECT name, price, qty FROM order_items WHERE order_id = ?`).all(o.id),
  }));
  res.json(withItems);
});

const VALID_STATUSES = ['new', 'accepted', 'preparing', 'ready', 'picked_up', 'completed', 'cancelled'];

router.post('/orders/:id/status', requireRestaurantAuth, (req, res) => {
  const { status } = req.body || {};
  if (!VALID_STATUSES.includes(status)) return res.status(400).json({ error: 'Некорректный статус' });
  const order = db.prepare(`SELECT * FROM orders WHERE id = ? AND restaurant_id = ?`).get(req.params.id, req.session.restaurantId);
  if (!order) return res.status(404).json({ error: 'Заказ не найден' });
  db.prepare(`UPDATE orders SET status = ?, updated_at = datetime('now') WHERE id = ?`).run(status, order.id);
  res.json({ ok: true });
});

// Отметить оплаченным заказ с оплатой при получении (наличные/терминал)
router.post('/orders/:id/mark-paid', requireRestaurantAuth, (req, res) => {
  const order = db.prepare(`SELECT * FROM orders WHERE id = ? AND restaurant_id = ?`).get(req.params.id, req.session.restaurantId);
  if (!order) return res.status(404).json({ error: 'Заказ не найден' });
  db.prepare(`UPDATE orders SET payment_status = 'paid', updated_at = datetime('now') WHERE id = ?`).run(order.id);
  res.json({ ok: true });
});

router.get('/payouts/summary', requireRestaurantAuth, (req, res) => {
  const row = db
    .prepare(`
      SELECT
        COUNT(*) AS orders_count,
        COALESCE(SUM(subtotal), 0) AS gross_revenue,
        COALESCE(SUM(commission_amount), 0) AS commission_withheld,
        COALESCE(SUM(restaurant_payout), 0) AS net_payout
      FROM orders WHERE restaurant_id = ? AND payment_status = 'paid'
    `)
    .get(req.session.restaurantId);
  res.json(row);
});

module.exports = router;
