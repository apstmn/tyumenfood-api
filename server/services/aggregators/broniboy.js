// server/services/aggregators/broniboy.js
//
// Broniboy — курьерский сервис, активно работающий в Тюмени (в т.ч.
// доставка из ресторанов/кафе), с отдельной программой партнёрства для
// заведений и (по их публичным материалам) вариантом подписки без комиссии
// с самого агрегатора. Для точной интеграции нужно запросить актуальную
// документацию API у менеджера Broniboy — публичного самостоятельного
// Vendor API, аналогичного Яндексу, в открытом доступе нет.
'use strict';

const AggregatorAdapter = require('./AggregatorAdapter');

class BroniboyAdapter extends AggregatorAdapter {
  get code() {
    return 'broniboy';
  }

  async syncMenu(restaurant, menuItems) {
    if (!process.env.BRONIBOY_PARTNER_TOKEN) {
      throw new Error(
        'Broniboy не подключён: нет BRONIBOY_PARTNER_TOKEN. Свяжитесь с ' +
        'менеджером Broniboy по партнёрской программе для ресторанов Тюмени.'
      );
    }
    throw new Error('syncMenu для Broniboy не реализован в демо-версии.');
  }

  normalizeIncomingOrder(payload) {
    return {
      restaurantSlug: payload.restaurant_slug,
      customerName: payload.customer?.name || 'Клиент Broniboy',
      customerPhone: payload.customer?.phone || null,
      items: payload.items || [],
      aggregatorSource: this.code,
    };
  }
}

module.exports = new BroniboyAdapter();
