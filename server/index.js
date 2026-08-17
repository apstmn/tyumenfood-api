// server/index.js
// Точка входа сервера. Собирает публичный API витрины, кабинет ресторана,
// кабинет платформы и приём вебхуков агрегаторов в одном Express-приложении.
'use strict';

const path = require('node:path');
const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');

const publicRoutes = require('./routes/public');
const restaurantAdminRoutes = require('./routes/restaurantAdmin');
const platformAdminRoutes = require('./routes/platformAdmin');
const webhookRoutes = require('./routes/webhooks');
const { seedIfEmpty } = require('./seed');

// Заполняем демо-данными только при самом первом запуске (пустая база).
// Безопасно при каждом перезапуске — реальные добавленные рестораны и
// заказы этим не затираются.
seedIfEmpty();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cookieParser());
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'demo-food-marketplace-secret-change-me',
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, maxAge: 1000 * 60 * 60 * 12 },
  })
);

// Отключаем любое промежуточное кэширование ответов API (CDN/прокси
// хостинга) — это защитит от ситуации, когда случайный ранний ответ
// (например, во время "просыпания" бесплатного инстанса) закэшируется
// и продолжит отдаваться вместо актуальных данных.
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  next();
});

app.use('/api', publicRoutes);
app.use('/api/restaurant', restaurantAdminRoutes);
app.use('/api/platform', platformAdminRoutes);
app.use('/api/webhooks', webhookRoutes);

app.use(express.static(path.join(__dirname, '..', 'public')));

app.listen(PORT, () => {
  console.log(`Food marketplace demo запущен: http://localhost:${PORT}`);
});
