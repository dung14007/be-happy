const { test } = require('node:test');
const assert = require('node:assert/strict');
const { analyzeCart } = require('../public/cart-availability');

const products = [{ _id: 'kẹo', name: 'Kẹo mút', unit: 'cái', stock: 4, cost: 1000 }];
const bundles = [
  { _id: 'A', name: 'Set A', sellingPrice: 15000, packagingCost: 500, items: [{ product: 'kẹo', quantity: 2 }] },
  { _id: 'B', name: 'Set B', sellingPrice: 20000, packagingCost: 500, items: [{ product: 'kẹo', quantity: 3 }] }
];

test('cộng nguyên liệu dùng chung trước khi thanh toán', () => {
  const result = analyzeCart([{ bundle: 'A', quantity: 1 }, { bundle: 'B', quantity: 1 }], bundles, products);
  assert.equal(result.total, 35000);
  assert.equal(result.units, 2);
  assert.equal(result.costTotal, 6000);
  assert.equal(result.profit, 29000);
  assert.match(result.issues[0], /cần 5, kho còn 4/);
});

test('giỏ đủ nguyên liệu và có tổng tiền đúng', () => {
  const result = analyzeCart([{ bundle: 'A', quantity: 2 }], bundles, products);
  assert.deepEqual(result.issues, []);
  assert.equal(result.total, 30000);
  assert.equal(result.costTotal, 5000);
  assert.equal(result.profit, 25000);
});

test('set đã xóa sẽ chặn thanh toán', () => {
  const result = analyzeCart([{ bundle: 'deleted', quantity: 1 }], bundles, products);
  assert.match(result.issues[0], /đã bị xóa/);
});

test('món thêm tính giá bán, vốn và kiểm tra tồn kho cả set gốc', () => {
  const row = { bundle: 'A', quantity: 2, extra: { product: 'kẹo', quantity: 1, extraPrice: 3000 } };
  const result = analyzeCart([row], bundles, products);
  assert.equal(result.total, 36000);
  assert.equal(result.costTotal, 7000);
  assert.equal(result.profit, 29000);
  assert.match(result.issues[0], /cần 6, kho còn 4/);
});
