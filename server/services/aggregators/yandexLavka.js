// server/services/aggregators/yandexLavka.js
//
// Яндекс Лавка — это в первую очередь даркстор-модель (доставка из
// собственных мини-складов Яндекса), а не витрина для чужих ресторанов.
// Готовую еду сторонних заведений Лавка подключает точечно, часто под тем же
// партнёрским контуром, что и Яндекс Еда (единый Vendor API/личный кабинет
// Яндекса для бизнеса: https://yandex.ru/support/eda-vendor/). Перед
// интеграцией стоит уточнить у менеджера Яндекса, доступно ли подключение
// заведения именно к Лавке в Тюмени.
'use strict';

const AggregatorAdapter = require('./AggregatorAdapter');

class YandexLavkaAdapter extends AggregatorAdapter {
  get code() {
    return 'yandex_lavka';
  }

  async syncMenu(restaurant, menuItems) {
    if (!process.env.YANDEX_LAVKA_PARTNER_TOKEN) {
      throw new Error(
        'Яндекс Лавка не подключена: нет YANDEX_LAVKA_PARTNER_TOKEN. ' +
        'Уточните доступность подключения готовой еды через менеджера Яндекса для бизнеса.'
      );
    }
    throw new Error('syncMenu для Яндекс Лавки не реализован в демо-версии.');
  }

  normalizeIncomingOrder(payload) {
    return {
      restaurantSlug: payload.restaurant_slug,
      customerName: payload.customer?.name || 'Клиент Яндекс Лавки',
      customerPhone: payload.customer?.phone || null,
      items: payload.items || [],
      aggregatorSource: this.code,
    };
  }
}

module.exports = new YandexLavkaAdapter();
