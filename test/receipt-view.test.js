const { test } = require('node:test');
const assert = require('node:assert/strict');
const { toCustomerReceipt } = require('../receipt-view');

test('bill cho khách chỉ có giá bán và tiền thanh toán', () => {
  const order = {
    code: 'SET-123', createdAt: new Date('2026-09-23'), customerName: 'Khách A', paymentMethod: 'cash',
    total: 45000, costTotal: 27000,
    items: [{ name: 'Set 1', quantity: 2, unitPrice: 22500, unitCost: 13500, ingredients: [{ name: 'Kẹo', unitCost: 3000 }] }]
  };
  const bill = toCustomerReceipt(order);
  assert.equal(bill.items[0].lineTotal, 45000);
  assert.equal(bill.total, 45000);
  assert.equal(JSON.stringify(bill).includes('costTotal'), false);
  assert.equal(JSON.stringify(bill).includes('unitCost'), false);
  assert.equal(JSON.stringify(bill).includes('ingredients'), false);
});
