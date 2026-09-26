// Tính tình trạng kho cho một công thức set.
function analyzeBundle(bundle, products) {
  let max = Infinity, goods = 0, unknown = false;
  const missing = [];
  const lines = bundle.items.map(item => {
    const product = products.find(p => String(p._id) === String(item.product));
    const need = Number(item.quantity);
    if (!product) {
      unknown = true; max = 0;
      missing.push({ name: 'Sản phẩm đã ẩn hoặc bị xóa', missing: need, unit: 'món' });
      return { name: 'Sản phẩm đã ẩn hoặc bị xóa', need, have: 0, unit: 'món', missing: need };
    }
    const short = Math.max(0, need - product.stock);
    if (short) missing.push({ name: product.name, missing: short, unit: product.unit });
    max = Math.min(max, Math.floor(product.stock / need));
    goods += product.cost * need;
    return { name: product.name, need, have: product.stock, unit: product.unit, missing: short };
  });
  return { bundle, lines, missing, max: Number.isFinite(max) ? max : 0, cost: goods + bundle.packagingCost, unknown };
}
if (typeof module !== 'undefined') module.exports = { analyzeBundle };
