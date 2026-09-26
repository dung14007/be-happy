function analyzeCart(cart, bundles, products) {
  const bundleById = new Map(bundles.map(b => [String(b._id), b]));
  const productById = new Map(products.map(p => [String(p._id), p]));
  const required = new Map(), lines = [], issues = [];
  let total = 0, costTotal = 0, units = 0;
  for (const row of cart) {
    const bundle = bundleById.get(String(row.bundle));
    if (!bundle) { issues.push('Có set đã bị xóa. Hãy xóa khỏi giỏ.'); continue; }
    if (!Number.isSafeInteger(row.quantity) || row.quantity < 1) { issues.push('Số lượng set không hợp lệ.'); continue; }
    if (!Number.isSafeInteger(bundle.sellingPrice) || bundle.sellingPrice <= 0) issues.push(`Set ${bundle.name} chưa có giá bán.`);
    lines.push({ bundle, quantity: row.quantity, subtotal: (bundle.sellingPrice + (row.extra?.extraPrice || 0)) * row.quantity });
    units += row.quantity; total += (bundle.sellingPrice + (row.extra?.extraPrice || 0)) * row.quantity;
    costTotal += bundle.packagingCost * row.quantity;
    if (!bundle.items.length) issues.push(`Set ${bundle.name} chưa có bánh kẹo.`);
    const extras = row.extra ? [{ product: row.extra.product, quantity: row.extra.quantity }] : [];
    if (row.extra && (!Number.isSafeInteger(row.extra.quantity) || row.extra.quantity < 1 || !Number.isSafeInteger(row.extra.extraPrice) || row.extra.extraPrice < 0 || !productById.has(String(row.extra.product)))) issues.push(`Món thêm của set ${bundle.name} không hợp lệ.`);
    for (const item of [...bundle.items, ...extras]) {
      const product = productById.get(String(item.product));
      if (!product) { issues.push(`Set ${bundle.name} có bánh kẹo đã bị ẩn.`); continue; }
      costTotal += product.cost * item.quantity * row.quantity;
      const id = String(product._id);
      required.set(id, { product, quantity: (required.get(id)?.quantity || 0) + item.quantity * row.quantity });
    }
  }
  for (const { product, quantity } of required.values()) {
    if (product.stock < quantity) issues.push(`Thiếu ${product.name}: cần ${quantity}, kho còn ${product.stock} ${product.unit}.`);
  }
  return { lines, total, costTotal, profit: total - costTotal, units, issues };
}
if (typeof module !== 'undefined') module.exports = { analyzeCart };
