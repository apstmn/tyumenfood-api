// server/services/payments/cloudpayments.stub.js
//
// ЗАГЛУШКА для реальной интеграции с CloudPayments (cloudpayments.ru) —
// альтернатива ЮKassa, тоже поддерживает карты и СБП QR.
// Что нужно для включения:
//   1. Договор с CloudPayments (или банком-партнёром) как юрлицо/ИП.
//   2. Public ID и API Secret из личного кабинета.
//   3. Виджет оплаты на фронтенде (cp.js) либо Payments API для серверных платежей.
//   4. Обработка вебхуков Check / Pay / Fail на отдельном роуте
//      /api/webhooks/payments/cloudpayments с проверкой HMAC-подписи.
//   5. Фискализация чека — как и с ЮKassa, обязательна по 54-ФЗ.
'use strict';

const PaymentProvider = require('./PaymentProvider');

class CloudPaymentsProvider extends PaymentProvider {
  async charge(order) {
    if (!process.env.CLOUDPAYMENTS_PUBLIC_ID || !process.env.CLOUDPAYMENTS_API_SECRET) {
      throw new Error(
        'CloudPayments не настроен: заполните CLOUDPAYMENTS_PUBLIC_ID и ' +
        'CLOUDPAYMENTS_API_SECRET после подключения договора. См. комментарий в начале файла.'
      );
    }
    throw new Error('Интеграция с CloudPayments не реализована в демо-версии.');
  }
}

module.exports = new CloudPaymentsProvider();
