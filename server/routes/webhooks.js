// server/routes/webhooks.js
// Единая точка приёма заказов от подключённых агрегаторов. В демо-режиме
// сюда можно вручную отправить тестовый payload (см. README, раздел
// "Демо-вебхук от агрегатора"), чтобы увидеть, как заказ извне попадает
// в тот же order-flow, что и прямые заказы с сайта, и как считается комиссия
// платформы поверх него.
'use strict';

const express = require('express');
const db = require('../db');
const { computeSplit } = require('../services/commission');
const { getAdapter, AGGREGATOR_LABELS } = require('../services/aggregators');

const router = express.Router();

router.post('/:aggregator', (req, res) => {
  const aggregatorCode = req.params.aggregator;
  if (!AGGREGATOR_LABELS[aggregatorCode]) {
    return res.status(404).json({ error: `Неизвестный агрегатор: ${aggregatorCode}` });
  }

  db.prepare(`INSERT INTO webhook_log (aggregator, payload) VALUES (?, ?)`).run(aggregatorCode, JSON.stringify(req.body || {}));

  try {
    const adapter = getAdapter(aggregatorCode);
    const normalized = adapter.normalizeIncomingOrder(req.body || {});

    const restaurant = db.prepare(`SELECT * FROM restaurants WHERE slug = ? AND status = 'active'`).get(normalized.restaurantSlug);
    if (!restaurant) return res.status(404).json({ error: 'Ресторан не найден по restaurant_slug' });

    const enabled = JSON.parse(restaurant.aggregators_enabled || '[]');
    if (!enabled.includes(aggregatorCode)) {
      return res.status(403).json({ error: `У ресторана не включена интеграция с ${AGGREGATOR_LABELS[aggregatorCode]}` });
    }

    let subtotal = 0;
    const items = normalized.items.map((it) => {
      const price = Number(it.price) || 0;
      const qty = Math.max(1, parseInt(it.qty, 10) || 1);
      subtotal += price * qty;
      return { name: it.name, price, qty };
    });
    if (items.length === 0) return res.status(400).json({ error: 'Пустой список позиций в заказе' });

    const split = computeSplit(subtotal, restaurant.commission_rate);

    const result = db
      .prepare(`
        INSERT INTO orders (restaurant_id, customer_name, customer_phone, fulfillment_type, aggregator_source,
          payment_method, payment_status, status, subtotal, commission_rate, commission_amount, restaurant_payout)
        VALUES (?, ?, ?, 'aggregator_courier', ?, 'card', 'paid', 'new', ?, ?, ?, ?)
      `)
      .run(
        restaurant.id,
        normalized.customerName,
        normalized.customerPhone,
        normalized.aggregatorSource,
        subtotal,
        split.commissionRate,
        split.commissionAmount,
        split.restaurantPayout
      );

    const orderId = result.lastInsertRowid;
    const insertItem = db.prepare(`INSERT INTO order_items (order_id, name, price, qty) VALUES (?, ?, ?, ?)`);
    for (const it of items) insertItem.run(orderId, it.name, it.price, it.qty);

    res.status(201).json({ ok: true, orderId, commission: split });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
