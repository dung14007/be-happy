const { test } = require('node:test');
const assert = require('node:assert/strict');
const { analyzeBundle } = require('../public/stock-status');

const recipe = { items: [{ product: 'oishi', quantity: 2 }, { product: 'keo', quantity: 1 }], packagingCost: 500 };
const candies = [{ _id: 'oishi', name: 'Oishi', unit: 'gói', stock: 5, cost: 2000 }, { _id: 'keo', name: 'Kẹo mút', unit: 'cái', stock: 4, cost: 1000 }];

test('đủ từng món và tính số set tối đa theo món giới hạn', () => {
  const result = analyzeBundle(recipe, candies);
  assert.equal(result.missing.length, 0);
  assert.equal(result.max, 2);
  assert.equal(result.cost, 5500);
});

test('ghi đúng tên và số lượng món còn thiếu', () => {
  const result = analyzeBundle(recipe, [{ ...candies[0], stock: 1 }, candies[1]]);
  assert.equal(result.max, 0);
  assert.deepEqual(result.missing, [{ name: 'Oishi', missing: 1, unit: 'gói' }]);
});

test('sản phẩm không còn trong danh mục vẫn báo thiếu', () => {
  const result = analyzeBundle(recipe, [candies[0]]);
  assert.equal(result.unknown, true);
  assert.equal(result.max, 0);
  assert.equal(result.missing[0].missing, 1);
});
