// server/db.js
// Единая точка доступа к базе данных. Используем встроенный node:sqlite
// (появился в Node 22+), чтобы не тянуть нативные зависимости.
'use strict';

const path = require('node:path');
const fs = require('node:fs');
const { DatabaseSync } = require('node:sqlite');

// DATA_DIR можно переопределить переменной окружения — нужно на хостингах
// с отдельным примонтированным диском для постоянного хранения (например,
// Amvera требует писать в /data, чтобы файл базы переживал передеплой).
// На Amvera переменная AMVERA=1 выставляется автоматически, поэтому путь
// подхватывается сам, без ручной настройки.
const DATA_DIR = process.env.DATA_DIR || (process.env.AMVERA ? '/data' : path.join(__dirname, '..', 'data'));
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH = path.join(DATA_DIR, 'app.db');
const db = new DatabaseSync(DB_PATH);

db.exec('PRAGMA foreign_keys = ON;');

db.exec(`
CREATE TABLE IF NOT EXISTS restaurants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  city TEXT NOT NULL DEFAULT 'Тюмень',
  address TEXT,
  phone TEXT,
  commission_rate REAL NOT NULL DEFAULT 0.07,
  status TEXT NOT NULL DEFAULT 'active', -- active | paused | pending
  aggregators_enabled TEXT NOT NULL DEFAULT '[]', -- JSON-массив кодов агрегаторов, подключённых для этого ресторана
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS restaurant_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  restaurant_id INTEGER NOT NULL REFERENCES restaurants(id),
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS platform_admins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS menu_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  restaurant_id INTEGER NOT NULL REFERENCES restaurants(id),
  category TEXT NOT NULL DEFAULT 'Разное',
  name TEXT NOT NULL,
  description TEXT,
  price INTEGER NOT NULL, -- в копейках? нет, храним в рублях (целое число) для простоты демо
  available INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  restaurant_id INTEGER NOT NULL REFERENCES restaurants(id),
  customer_name TEXT,
  customer_phone TEXT,
  fulfillment_type TEXT NOT NULL, -- self_pickup | platform_courier | aggregator_courier
  aggregator_source TEXT NOT NULL DEFAULT 'direct', -- direct | yandex_eda | yandex_lavka | kuper | broniboy
  payment_method TEXT NOT NULL, -- card | sbp_qr | cash_on_pickup | terminal_on_pickup
  payment_status TEXT NOT NULL DEFAULT 'pending', -- pending | paid | failed
  payment_provider_ref TEXT,
  status TEXT NOT NULL DEFAULT 'new', -- new | accepted | preparing | ready | picked_up | completed | cancelled
  subtotal INTEGER NOT NULL,
  commission_rate REAL NOT NULL,
  commission_amount REAL NOT NULL,
  restaurant_payout REAL NOT NULL,
  pickup_code TEXT,
  qr_data_url TEXT,
  payment_qr_data_url TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL REFERENCES orders(id),
  menu_item_id INTEGER,
  name TEXT NOT NULL,
  price INTEGER NOT NULL,
  qty INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS platform_requisites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name TEXT NOT NULL,
  short_name TEXT,
  legal_address TEXT,
  phone TEXT,
  inn TEXT,
  ogrnip TEXT,
  checking_account TEXT,
  correspondent_account TEXT,
  bik TEXT,
  bank_name TEXT,
  owner_name TEXT,
  email TEXT,
  contact_phone TEXT
);

CREATE TABLE IF NOT EXISTS webhook_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  aggregator TEXT NOT NULL,
  payload TEXT NOT NULL,
  received_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`);

module.exports = db;
