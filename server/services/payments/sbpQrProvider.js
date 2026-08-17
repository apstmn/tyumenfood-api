// server/services/payments/sbpQrProvider.js
// ДЕМО-имитация оплаты по QR-коду СБП (Система быстрых платежей).
// В проде QR формирует банк-эквайрер/платёжный агрегатор через свой API,
// а не платформа самостоятельно — платформа только получает от него ссылку/QR
// и слушает вебхук о статусе оплаты.
'use strict';

const QRCode = require('qrcode');
const PaymentProvider = require('./PaymentProvider');

class MockSbpQrProvider extends PaymentProvider {
  async charge(order) {
    const payUrl = `https://pay.demo-sbp.local/order/${order.id}?amount=${order.subtotal}`;
    const qrDataUrl = await QRCode.toDataURL(payUrl, { margin: 1, width: 260 });
    // В демо считаем, что клиент "отсканировал и оплатил" сразу же —
    // в реальной интеграции статус 'paid' придёт вебхуком от провайдера.
    return {
      status: 'paid',
      providerRef: `MOCK-SBP-${order.id}-${Date.now()}`,
      extra: { qrDataUrl, payUrl, note: 'Демо QR СБП. Реальная транзакция не выполнялась.' },
    };
  }
}

module.exports = new MockSbpQrProvider();
