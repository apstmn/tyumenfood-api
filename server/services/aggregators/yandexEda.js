// server/services/aggregators/yandexEda.js
//
// Яндекс Еда — официальный партнёрский API описан здесь:
//   https://yandex.ru/dev/eda-vendor/doc/ru/
// Подключение в реальности идёт одним из двух путей:
//   а) напрямую по Vendor API (нужна аккредитация как партнёр Яндекс Еды);
//   б) через уже готовую интеграцию в вашей POS-системе (iiko, r_keeper,
//      Quick Resto, Frontpad и т.п.) — это самый быстрый путь для старта,
//      т.к. Яндекс Еда исторически подключает рестораны именно через POS.
// Нужно от Яндекса: id партнёра, ключ API, регистрация точек (place_id),
// синхронизация меню через ресурс /places/{id}/menu, приём заказов через
// вебхуки на ваш эндпоинт (URL регистрируется в личном кабинете партнёра).
'use strict';

const AggregatorAdapter = require('./AggregatorAdapter');

class YandexEdaAdapter extends AggregatorAdapter {
  get code() {
    return 'yandex_eda';
  }

  async syncMenu(restaurant, menuItems) {
    if (!process.env.YANDEX_EDA_PARTNER_TOKEN) {
      throw new Error(
        'Яндекс Еда не подключена: нет YANDEX_EDA_PARTNER_TOKEN. ' +
        'Оформите партнёрство на https://eda.yandex.ru/business и получите токен API.'
      );
    }
    throw new Error('syncMenu для Яндекс Еды не реализован в демо-версии.');
  }

  normalizeIncomingOrder(payload) {
    // Демо-формат: ожидаем { restaurant_slug, customer, items: [{name, price, qty}] }
    return {
      restaurantSlug: payload.restaurant_slug,
      customerName: payload.customer?.name || 'Клиент Яндекс Еды',
      customerPhone: payload.customer?.phone || null,
      items: payload.items || [],
      aggregatorSource: this.code,
    };
  }
}

module.exports = new YandexEdaAdapter();
