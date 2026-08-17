// server/services/aggregators/index.js
// Реестр всех подключённых адаптеров агрегаторов.
'use strict';

const yandexEda = require('./yandexEda');
const yandexLavka = require('./yandexLavka');
const kuper = require('./kuper');
const broniboy = require('./broniboy');

const REGISTRY = {
  [yandexEda.code]: yandexEda,
  [yandexLavka.code]: yandexLavka,
  [kuper.code]: kuper,
  [broniboy.code]: broniboy,
};

const AGGREGATOR_LABELS = {
  yandex_eda: 'Яндекс Еда',
  yandex_lavka: 'Яндекс Лавка',
  kuper: 'Купер',
  broniboy: 'Broniboy',
};

function getAdapter(code) {
  const adapter = REGISTRY[code];
  if (!adapter) throw new Error(`Неизвестный агрегатор: ${code}`);
  return adapter;
}

module.exports = { getAdapter, REGISTRY, AGGREGATOR_LABELS };
