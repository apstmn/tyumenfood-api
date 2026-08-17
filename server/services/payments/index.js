// server/services/payments/index.js
// Фабрика провайдеров: по способу оплаты, выбранному клиентом на сайте,
// возвращает нужную реализацию. В демо-режиме card/sbp_qr/cash работают
// "по-настоящему" (в пределах имитации), а переключение на реальные деньги —
// это смена MockCardProvider/MockSbpQrProvider на yookassa.stub.js /
// cloudpayments.stub.js после того, как заполнены переменные окружения.
'use strict';

const cardProvider = require('./cardProvider');
const sbpQrProvider = require('./sbpQrProvider');
const cashOrTerminalProvider = require('./cashOrTerminalProvider');

const PROVIDERS = {
  card: cardProvider,
  sbp_qr: sbpQrProvider,
  cash_on_pickup: cashOrTerminalProvider,
  terminal_on_pickup: cashOrTerminalProvider,
};

function getPaymentProvider(method) {
  const provider = PROVIDERS[method];
  if (!provider) {
    throw new Error(`Неизвестный способ оплаты: ${method}`);
  }
  return provider;
}

module.exports = { getPaymentProvider, PAYMENT_METHODS: Object.keys(PROVIDERS) };
