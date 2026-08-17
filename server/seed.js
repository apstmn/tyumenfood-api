// server/seed.js
// Заполняет базу демонстрационными данными: платформенный админ, 4 условных
// ресторана в Тюмени с меню и логинами кабинетов. Все названия и меню —
// вымышленные демо-данные, а не реальные заведения.
'use strict';

const db = require('./db');
const { hashPassword } = require('./services/auth');

function clearAll() {
  db.exec(`
    DELETE FROM order_items;
    DELETE FROM orders;
    DELETE FROM menu_items;
    DELETE FROM restaurant_users;
    DELETE FROM restaurants;
    DELETE FROM platform_admins;
    DELETE FROM platform_requisites;
    DELETE FROM webhook_log;
  `);
}

// Реквизиты владельца платформы — сюда должна перечисляться удержанная
// комиссия 7% после подключения реального эквайринга. Взяты из карточки
// предприятия, предоставленной владельцем.
const PLATFORM_REQUISITES = {
  full_name: 'ИП БАБАДЖАНОВ АНВАР НАБИЖОНОВИЧ',
  short_name: 'ИП Бабаджанов А.Н.',
  legal_address: 'улица Дачная 56, Тюменская область, г. Тюмень',
  phone: '+7 922 001-42-46',
  inn: '720320222773',
  ogrnip: '311723230000077',
  checking_account: '40802810638290023399',
  correspondent_account: '30101810100000000964',
  bik: '046577964',
  bank_name: 'Филиал "Екатеринбургский" АО "Альфа-Банк"',
  owner_name: 'Бабаджанов Анвар Набижонович',
  email: 'Airgruptmn@yandex.ru',
  contact_phone: '+7 932 329-82-02',
};

function seed() {
  clearAll();
  insertSeedData();
}

// Заполняет базу демо-данными, только если она ещё пустая (нет ни одного
// ресторана). Безопасно вызывать при каждом старте сервера — не сотрёт
// реальные данные (добавленные рестораны, заказы), если они уже есть.
function seedIfEmpty(force = false) {
  const { c } = db.prepare(`SELECT COUNT(*) AS c FROM restaurants`).get();
  if (c > 0 && !force) {
    console.log('В базе уже есть данные — пропускаю посев демо-данных.');
    return;
  }
  clearAll();
  insertSeedData();
}

function insertSeedData() {
  db.prepare(`INSERT INTO platform_admins (username, password_hash) VALUES (?, ?)`)
    .run('admin', hashPassword('admin12345'));

  const restaurants = [
    {
      name: 'Сытный двор',
      slug: 'sytny-dvor',
      address: 'ул. Республики, 1',
      phone: '+7 900 000-00-01',
      commission_rate: 0.07,
      aggregators: ['yandex_eda', 'broniboy'],
      adminUser: 'sytny',
      adminPass: 'pass123',
      menu: [
        { category: 'Супы', name: 'Борщ с говядиной', description: 'Со сметаной и пампушками', price: 320 },
        { category: 'Супы', name: 'Крем-суп из тыквы', description: 'С гренками', price: 280 },
        { category: 'Горячее', name: 'Котлета по-киевски', description: 'С картофельным пюре', price: 450 },
        { category: 'Горячее', name: 'Плов с бараниной', description: 'Классический', price: 420 },
        { category: 'Напитки', name: 'Морс клюквенный', description: '0.5 л', price: 130 },
      ],
    },
    {
      name: 'Пельменная №1',
      slug: 'pelmennaya-1',
      address: 'ул. Ленина, 15',
      phone: '+7 900 000-00-02',
      commission_rate: 0.07,
      aggregators: ['yandex_eda'],
      adminUser: 'pelmennaya',
      adminPass: 'pass123',
      menu: [
        { category: 'Пельмени', name: 'Пельмени со свининой', description: '350 г, со сметаной', price: 360 },
        { category: 'Пельмени', name: 'Вареники с картофелем', description: '300 г', price: 300 },
        { category: 'Пельмени', name: 'Манты с говядиной', description: '5 шт', price: 380 },
        { category: 'Напитки', name: 'Чай чёрный', description: '400 мл', price: 90 },
      ],
    },
    {
      name: 'Bowl&Roll',
      slug: 'bowl-and-roll',
      address: 'ул. Малыгина, 45',
      phone: '+7 900 000-00-03',
      commission_rate: 0.07,
      aggregators: ['kuper'],
      adminUser: 'bowlroll',
      adminPass: 'pass123',
      menu: [
        { category: 'Боулы', name: 'Боул с лососем', description: 'Рис, авокадо, лосось, эдамаме', price: 490 },
        { category: 'Боулы', name: 'Боул с курицей терияки', description: 'Рис, курица, овощи', price: 420 },
        { category: 'Роллы', name: 'Филадельфия', description: '8 шт', price: 390 },
        { category: 'Напитки', name: 'Лимонад имбирный', description: '0.4 л', price: 150 },
      ],
    },
    {
      name: 'Плов Хаус',
      slug: 'plov-house',
      address: 'ул. Мельникайте, 92',
      phone: '+7 900 000-00-04',
      commission_rate: 0.07,
      aggregators: [],
      adminUser: 'plovhouse',
      adminPass: 'pass123',
      menu: [
        { category: 'Плов', name: 'Плов с говядиной', description: 'Порция 350 г', price: 350 },
        { category: 'Плов', name: 'Плов с курицей', description: 'Порция 350 г', price: 320 },
        { category: 'Салаты', name: 'Ачик-чучук', description: 'Томаты, лук', price: 180 },
        { category: 'Напитки', name: 'Айран', description: '0.3 л', price: 110 },
      ],
    },
  ];

  for (const r of restaurants) {
    const result = db
      .prepare(`INSERT INTO restaurants (name, slug, city, address, phone, commission_rate, status, aggregators_enabled) VALUES (?, ?, 'Тюмень', ?, ?, ?, 'active', ?)`)
      .run(r.name, r.slug, r.address, r.phone, r.commission_rate, JSON.stringify(r.aggregators));
    const restaurantId = result.lastInsertRowid;

    db.prepare(`INSERT INTO restaurant_users (restaurant_id, username, password_hash) VALUES (?, ?, ?)`)
      .run(restaurantId, r.adminUser, hashPassword(r.adminPass));

    const insertItem = db.prepare(`INSERT INTO menu_items (restaurant_id, category, name, description, price) VALUES (?, ?, ?, ?, ?)`);
    for (const item of r.menu) {
      insertItem.run(restaurantId, item.category, item.name, item.description, item.price);
    }
  }

  db.prepare(`
    INSERT INTO platform_requisites
      (full_name, short_name, legal_address, phone, inn, ogrnip, checking_account, correspondent_account, bik, bank_name, owner_name, email, contact_phone)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    PLATFORM_REQUISITES.full_name,
    PLATFORM_REQUISITES.short_name,
    PLATFORM_REQUISITES.legal_address,
    PLATFORM_REQUISITES.phone,
    PLATFORM_REQUISITES.inn,
    PLATFORM_REQUISITES.ogrnip,
    PLATFORM_REQUISITES.checking_account,
    PLATFORM_REQUISITES.correspondent_account,
    PLATFORM_REQUISITES.bik,
    PLATFORM_REQUISITES.bank_name,
    PLATFORM_REQUISITES.owner_name,
    PLATFORM_REQUISITES.email,
    PLATFORM_REQUISITES.contact_phone
  );

  console.log('Готово: база заполнена демо-данными.');
  console.log('Платформенный админ: admin / admin12345');
  for (const r of restaurants) {
    console.log(`Ресторан "${r.name}": /r/${r.slug}  — кабинет: ${r.adminUser} / ${r.adminPass}`);
  }
}

if (require.main === module) {
  // Запуск напрямую (`npm run seed`): по умолчанию пересоздаёт демо-данные
  // с нуля. Добавьте --keep, чтобы не трогать базу, если в ней уже есть данные.
  const keep = process.argv.includes('--keep');
  if (keep) seedIfEmpty(false);
  else seed();
}

module.exports = { seed, seedIfEmpty };
