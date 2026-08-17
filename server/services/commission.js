// server/services/commission.js
// Вся логика удержания комиссии платформы (по умолчанию 7%) в одном месте,
// чтобы её нельзя было случайно обойти в другом роуте.
'use strict';

const DEFAULT_COMMISSION_RATE = 0.07;

/**
 * Считает разбивку заказа: сколько остаётся ресторану, сколько удерживает платформа.
 * Комиссия всегда считается от subtotal (сумма позиций без учёта доставки/чаевых)
 * и округляется до копеек в пользу платформы, чтобы сумма всегда сходилась.
 */
function computeSplit(subtotal, commissionRate = DEFAULT_COMMISSION_RATE) {
  if (!Number.isFinite(subtotal) || subtotal < 0) {
    throw new Error('Некорректная сумма заказа');
  }
  const commissionAmount = Math.round(subtotal * commissionRate * 100) / 100;
  const restaurantPayout = Math.round((subtotal - commissionAmount) * 100) / 100;
  return {
    subtotal,
    commissionRate,
    commissionAmount,
    restaurantPayout,
  };
}

module.exports = { computeSplit, DEFAULT_COMMISSION_RATE };
