// server/routes/public.js
// Публичный API витрины: список ресторанов, меню, оформление заказа.
'use strict';

const express = require('express');
const crypto = require('node:crypto');
const QRCode = require('qrcode');
const db = require('../db');
const { computeSplit } = require('../services/commission');
const { getPaymentProvider } = require('../services/payments');

const router = express.Router();

function generatePickupCode() {
  return crypto.randomInt(1000, 9999).toString();
}

// GET /api/restaurants — список активных ресторанов-партнёров
router.get('/restaurants', (req, res) => {
  const rows = db
    .prepare(`SELECT id, name, slug, city, address FROM restaurants WHERE status = 'active' ORDER BY name`)
    .all();
  res.json(rows);
});

// GET /api/restaurants/:slug — карточка ресторана + меню
router.get('/restaurants/:slug', (req, res) => {
  const restaurant = db
    .prepare(`SELECT id, name, slug, city, address, phone FROM restaurants WHERE slug = ? AND status = 'active'`)
    .get(req.params.slug);
  if (!restaurant) return res.status(404).json({ error: 'Ресторан не найден' });

  const menu = db
    .prepare(`SELECT id, category, name, description, price FROM menu_items WHERE restaurant_id = ? AND available = 1 ORDER BY category, name`)
    .all(restaurant.id);

  res.json({ restaurant, menu });
});

// POST /api/orders — создать заказ
router.post('/orders', async (req, res) => {
  try {
    const { restaurant_slug, items, fulfillment_type, payment_method, customer_name, customer_phone } = req.body || {};

    if (!restaurant_slug || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Не указан ресторан или пустая корзина' });
    }
    const validFulfillment = ['self_pickup', 'platform_courier'];
    if (!validFulfillment.includes(fulfillment_type)) {
      return res.status(400).json({ error: 'Некорректный способ получения заказа' });
    }

    const restaurant = db
      .prepare(`SELECT * FROM restaurants WHERE slug = ? AND status = 'active'`)
      .get(restaurant_slug);
    if (!restaurant) return res.status(404).json({ error: 'Ресторан не найден' });

    // Никогда не доверяем ценам с клиента — пересчитываем по данным из БД.
    let subtotal = 0;
    const resolvedItems = [];
    for (const line of items) {
      const menuItem = db
        .prepare(`SELECT * FROM menu_items WHERE id = ? AND restaurant_id = ? AND available = 1`)
        .get(line.menu_item_id, restaurant.id);
      if (!menuItem) {
        return res.status(400).json({ error: `Позиция меню не найдена: ${line.menu_item_id}` });
      }
      const qty = Math.max(1, parseInt(line.qty, 10) || 1);
      subtotal += menuItem.price * qty;
      resolvedItems.push({ menu_item_id: menuItem.id, name: menuItem.name, price: menuItem.price, qty });
    }

    const split = computeSplit(subtotal, restaurant.commission_rate);

    let pickupCode = null;
    let qrDataUrl = null;
    if (fulfillment_type === 'self_pickup') {
      pickupCode = generatePickupCode();
    }

    const insertOrder = db.prepare(`
      INSERT INTO orders (restaurant_id, customer_name, customer_phone, fulfillment_type, aggregator_source,
        payment_method, payment_status, status, subtotal, commission_rate, commission_amount, restaurant_payout, pickup_code)
      VALUES (?, ?, ?, ?, 'direct', ?, 'pending', 'new', ?, ?, ?, ?, ?)
    `);
    const result = insertOrder.run(
      restaurant.id,
      customer_name || null,
      customer_phone || null,
      fulfillment_type,
      payment_method,
      subtotal,
      split.commissionRate,
      split.commissionAmount,
      split.restaurantPayout,
      pickupCode
    );
    const orderId = result.lastInsertRowid;

    const insertItem = db.prepare(`INSERT INTO order_items (order_id, menu_item_id, name, price, qty) VALUES (?, ?, ?, ?, ?)`);
    for (const it of resolvedItems) {
      insertItem.run(orderId, it.menu_item_id, it.name, it.price, it.qty);
    }

    // QR-код самовывоза — код, который на кассе/у курьера подтверждает выдачу заказа.
    if (fulfillment_type === 'self_pickup') {
      qrDataUrl = await QRCode.toDataURL(`ORDER:${orderId}:${pickupCode}`, { margin: 1, width: 220 });
      db.prepare(`UPDATE orders SET qr_data_url = ? WHERE id = ?`).run(qrDataUrl, orderId);
    }

    // Проводим оплату через выбранный провайдер (в демо — имитация).
    const provider = getPaymentProvider(payment_method);
    const order = db.prepare(`SELECT * FROM orders WHERE id = ?`).get(orderId);
    const chargeResult = await provider.charge(order);

    let paymentQrDataUrl = chargeResult.extra?.qrDataUrl || null;
    db.prepare(`UPDATE orders SET payment_status = ?, payment_provider_ref = ?, payment_qr_data_url = ?, updated_at = datetime('now') WHERE id = ?`)
      .run(chargeResult.status, chargeResult.providerRef, paymentQrDataUrl, orderId);

    const finalOrder = db.prepare(`SELECT * FROM orders WHERE id = ?`).get(orderId);
    res.status(201).json({
      order: finalOrder,
      items: resolvedItems,
      pickupQrDataUrl: qrDataUrl,
      paymentQrDataUrl,
      paymentNote: chargeResult.extra?.note || null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Не удалось создать заказ' });
  }
});

// GET /api/orders/:id — статус заказа (для страницы подтверждения)
router.get('/orders/:id', (req, res) => {
  const order = db.prepare(`SELECT * FROM orders WHERE id = ?`).get(req.params.id);
  if (!order) return res.status(404).json({ error: 'Заказ не найден' });
  const items = db.prepare(`SELECT * FROM order_items WHERE order_id = ?`).all(order.id);
  const restaurant = db.prepare(`SELECT name, address, phone FROM restaurants WHERE id = ?`).get(order.restaurant_id);
  res.json({ order, items, restaurant });
});

module.exports = router;
