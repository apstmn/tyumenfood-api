// server/services/aggregators/kuper.js
//
// Купер (бывший СберМаркет, ребрендинг в 2024 году) — сервис экосистемы
// Сбера, доставляет в т.ч. готовую еду из ресторанов в ряде городов.
// Подключение партнёров идёт через личный кабинет для бизнеса Купера —
// нужно уточнять актуальные условия и доступность направления "рестораны"
// для Тюмени напрямую у менеджера Купера (условия и API периодически меняются
// после ребрендинга).
'use strict';

const AggregatorAdapter = require('./AggregatorAdapter');

class KuperAdapter extends AggregatorAdapter {
  get code() {
    return 'kuper';
  }

  async syncMenu(restaurant, menuItems) {
    if (!process.env.KUPER_PARTNER_TOKEN) {
      throw new Error(
        'Купер не подключён: нет KUPER_PARTNER_TOKEN. Оформите партнёрство ' +
        'через личный кабинет для бизнеса Купера и получите API-ключ.'
      );
    }
    throw new Error('syncMenu для Купера не реализован в демо-версии.');
  }

  normalizeIncomingOrder(payload) {
    return {
      restaurantSlug: payload.restaurant_slug,
      customerName: payload.customer?.name || 'Клиент Купера',
      customerPhone: payload.customer?.phone || null,
      items: payload.items || [],
      aggregatorSource: this.code,
    };
  }
}

module.exports = new KuperAdapter();
