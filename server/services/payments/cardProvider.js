// server/services/payments/cardProvider.js
// ДЕМО-имитация оплаты картой онлайн. В проде этот файл заменяется на
// интеграцию с ЮKassa/CloudPayments/Т-Кассой — см. yookassa.stub.js.
'use strict';

const PaymentProvider = require('./PaymentProvider');

class MockCardProvider extends PaymentProvider {
  async charge(order) {
    // В демо-режиме считаем оплату картой всегда успешной и мгновенной.
    return {
      status: 'paid',
      providerRef: `MOCK-CARD-${order.id}-${Date.now()}`,
      extra: { note: 'Демо-оплата картой. Реальная транзакция не выполнялась.' },
    };
  }
}

module.exports = new MockCardProvider();
