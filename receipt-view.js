// Chỉ chọn các trường được phép xuất hiện trên bill của khách.
function toCustomerReceipt(order) {
  return {
    code: order.code,
    createdAt: order.createdAt,
    customerName: order.customerName,
    paymentMethod: order.paymentMethod,
    items: order.items.map(item => ({ name: item.name, quantity: item.quantity, unitPrice: item.unitPrice, lineTotal: item.quantity * item.unitPrice })),
    total: order.total
  };
}
module.exports = { toCustomerReceipt };
