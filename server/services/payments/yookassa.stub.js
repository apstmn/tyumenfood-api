// server/services/payments/yookassa.stub.js
//
// ЗАГЛУШКА для реальной интеграции с ЮKassa (yookassa.ru).
// Чтобы включить настоящие платежи картой/СБП через ЮKassa нужно:
//   1. Зарегистрировать юрлицо/ИП в ЮKassa и пройти проверку (KYC/AML).
//   2. Получить shopId и secretKey в личном кабинете ЮKassa.
//   3. Подключить онлайн-кассу (54-ФЗ) — ЮKassa умеет пробивать чек сама
//      при подключённом фискализаторе, либо нужен свой сервис ККТ.
//   4. Реализовать здесь вызов POST https://api.yookassa.ru/v3/payments
//      с Idempotence-Key, суммой заказа и confirmation.type = 'qr'|'redirect'.
//   5. Настроить приём вебхука об изменении статуса платежа на
//      /api/webhooks/payments/yookassa (создать отдельный роут) и сверять
//      подпись запроса.
//
// Пока переменные окружения YOOKASSA_SHOP_ID / YOOKASSA_SECRET_KEY не заданы,
// провайдер явно отказывает — чтобы никто по ошибке не подумал, что деньги
// реально списываются.
'use strict';

const PaymentProvider = require('./PaymentProvider');

class YooKassaProvider extends PaymentProvider {
  async charge(order) {
    if (!process.env.YOOKASSA_SHOP_ID || !process.env.YOOKASSA_SECRET_KEY) {
      throw new Error(
        'ЮKassa не настроена: заполните YOOKASSA_SHOP_ID и YOOKASSA_SECRET_KEY ' +
        'после регистрации в личном кабинете ЮKassa. См. комментарий в начале файла.'
      );
    }
    throw new Error('Интеграция с ЮKassa не реализована в демо-версии.');
  }
}

module.exports = new YooKassaProvider();
