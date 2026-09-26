require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const { toCustomerReceipt } = require('./receipt-view');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));
// Vercel khởi tạo hàm theo yêu cầu; tái sử dụng kết nối Mongoose giữa các yêu cầu.
let vercelConnection;
if (process.env.VERCEL) app.use(async (req, res, next) => {
  if (!process.env.MONGODB_URI) return res.status(503).json({ error: 'Thiếu MONGODB_URI trên Vercel' });
  if (!vercelConnection) vercelConnection = mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 12000 }).catch(error => { vercelConnection = null; throw error; });
  try { await vercelConnection; next(); } catch (error) { next(error); }
});

const { Schema, model, Types } = mongoose;
const productSchema = new Schema({ sku: { type: String, required: true, unique: true, trim: true, uppercase: true }, name: { type: String, required: true, trim: true }, unit: { type: String, default: 'cái' }, cost: { type: Number, default: 0, min: 0 }, price: { type: Number, default: 0, min: 0 }, stock: { type: Number, default: 0, min: 0 }, minStock: { type: Number, default: 5, min: 0 }, active: { type: Boolean, default: true } }, { timestamps: true });
const partnerSchema = new Schema({ type: { type: String, enum: ['supplier', 'customer'], required: true }, name: { type: String, required: true, trim: true }, phone: { type: String, default: '' }, email: { type: String, default: '' }, address: { type: String, default: '' } }, { timestamps: true });
const lineSchema = new Schema({ product: { type: Schema.Types.ObjectId, ref: 'Product', required: true }, sku: String, name: String, quantity: { type: Number, required: true, min: 1 }, unitPrice: { type: Number, required: true, min: 0 }, unitCost: { type: Number, required: true, min: 0 } }, { _id: false });
const orderSchema = new Schema({ type: { type: String, enum: ['purchase', 'sale'], required: true }, code: { type: String, unique: true, required: true }, partner: { type: Schema.Types.ObjectId, ref: 'Partner', required: true }, partnerName: String, lines: { type: [lineSchema], default: [] }, total: { type: Number, default: 0 }, paid: { type: Number, default: 0 }, status: { type: String, enum: ['draft', 'confirmed', 'cancelled'], default: 'draft' }, note: { type: String, default: '' }, confirmedAt: Date }, { timestamps: true });
const movementSchema = new Schema({ product: { type: Schema.Types.ObjectId, ref: 'Product', required: true }, sku: String, name: String, type: { type: String, enum: ['purchase', 'sale', 'adjustment'], required: true }, quantity: Number, before: Number, after: Number, order: { type: Schema.Types.ObjectId, ref: 'Order' }, bundleSale: { type: Schema.Types.ObjectId, ref: 'BundleSale' }, note: String }, { timestamps: true });
const Product = model('Product', productSchema), Partner = model('Partner', partnerSchema), Order = model('Order', orderSchema), Movement = model('Movement', movementSchema);
const bundleSchema = new Schema({ name: { type: String, required: true, trim: true }, items: [{ product: { type: Schema.Types.ObjectId, ref: 'Product', required: true }, quantity: { type: Number, required: true, min: 1 } }], packagingCost: { type: Number, default: 0, min: 0 }, sellingPrice: { type: Number, default: 0, min: 0 }, image: { type: String, default: '' } }, { timestamps: true });
const Bundle = model('Bundle', bundleSchema);
const soldIngredientSchema = new Schema({ product: Schema.Types.ObjectId, sku: String, name: String, unit: String, quantityPerSet: Number, unitCost: Number }, { _id: false });
const soldSetSchema = new Schema({ bundle: Schema.Types.ObjectId, name: String, quantity: Number, unitPrice: Number, unitCost: Number, ingredients: [soldIngredientSchema], extraName: String }, { _id: false });
const bundleSaleSchema = new Schema({ code: { type: String, required: true, unique: true }, customerName: { type: String, default: 'Khách lẻ' }, paymentMethod: { type: String, enum: ['cash', 'transfer'], required: true }, items: { type: [soldSetSchema], required: true }, total: { type: Number, required: true }, costTotal: { type: Number, required: true } }, { timestamps: true });
const BundleSale = model('BundleSale', bundleSaleSchema);
const fail = (status, message) => Object.assign(new Error(message), { status });
const validId = id => Types.ObjectId.isValid(id);
const whole = (v, min = 0) => Number.isSafeInteger(Number(v)) && Number(v) >= min;
const txt = (v, max = 200) => String(v ?? '').trim().slice(0, max);
const asyncRoute = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const changed = () => io.emit('data:changed', { at: Date.now() });
const dateBound = (s, end = false) => { if (!/^\d{4}-\d{2}-\d{2}$/.test(s || '')) throw fail(400, 'Ngày không hợp lệ'); const d = new Date(`${s}T00:00:00.000Z`); if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== s) throw fail(400, 'Ngày không hợp lệ'); if (end) d.setUTCDate(d.getUTCDate() + 1); return d; };

app.get('/api/health', asyncRoute(async (req, res) => res.json({ ok: mongoose.connection.readyState === 1 })));
app.get('/api/products', asyncRoute(async (req, res) => res.json(await Product.find(req.query.all === '1' ? {} : { active: true }).sort({ name: 1 }).lean())));
app.post('/api/products', asyncRoute(async (req, res) => { const { sku, name, unit, cost, price, minStock } = req.body; if (!txt(sku) || !txt(name) || !whole(cost ?? 0) || !whole(price ?? 0) || !whole(minStock ?? 5)) throw fail(400, 'Thông tin sản phẩm không hợp lệ'); const doc = await Product.create({ sku: txt(sku, 50), name: txt(name), unit: txt(unit || 'cái', 30), cost: Number(cost ?? 0), price: Number(price ?? 0), minStock: Number(minStock ?? 5) }); changed(); res.status(201).json(doc); }));
app.patch('/api/products/:id', asyncRoute(async (req, res) => { if (!validId(req.params.id)) throw fail(400, 'ID không hợp lệ'); const input = {}; for (const k of ['sku','name','unit']) if (req.body[k] !== undefined) { input[k] = txt(req.body[k], k === 'sku' ? 50 : 200); if (!input[k]) throw fail(400, 'Không được để trống'); } for (const k of ['cost','price','minStock']) if (req.body[k] !== undefined) { if (!whole(req.body[k])) throw fail(400, 'Giá trị phải là số nguyên không âm'); input[k] = Number(req.body[k]); } if (req.body.active !== undefined) input.active = Boolean(req.body.active); const doc = await Product.findByIdAndUpdate(req.params.id, { $set: input }, { new: true, runValidators: true }); if (!doc) throw fail(404, 'Không tìm thấy sản phẩm'); changed(); res.json(doc); }));
app.delete('/api/products/:id', asyncRoute(async (req, res) => { if (!validId(req.params.id)) throw fail(400, 'ID không hợp lệ'); const doc = await Product.findByIdAndUpdate(req.params.id, { active: false }, { new: true }); if (!doc) throw fail(404, 'Không tìm thấy sản phẩm'); changed(); res.json(doc); }));

// Trang nhập bánh kẹo lưu giá và tồn trong cùng giao dịch, ghi lại mọi thay đổi tồn.
const candyInput = body => { const { sku, name, unit, cost, stock, minStock } = body; if (!txt(sku, 50) || !txt(name) || !whole(cost) || !whole(stock) || !whole(minStock ?? 5)) throw fail(400, 'Nhập mã, tên, giá mua và tồn kho hợp lệ'); return { sku: txt(sku, 50), name: txt(name), unit: txt(unit || 'cái', 30), cost: Number(cost), stock: Number(stock), minStock: Number(minStock ?? 5) }; };
app.post('/api/candies', asyncRoute(async (req, res) => { const input = candyInput(req.body); const session = await mongoose.startSession(); let doc; try { await session.withTransaction(async () => { doc = (await Product.create([{ ...input, price: 0 }], { session }))[0]; if (input.stock) await Movement.create([{ product: doc._id, sku: doc.sku, name: doc.name, type: 'adjustment', quantity: input.stock, before: 0, after: input.stock, note: 'Tồn ban đầu' }], { session }); }); } finally { await session.endSession(); } changed(); res.status(201).json(doc); }));
app.patch('/api/candies/:id', asyncRoute(async (req, res) => { if (!validId(req.params.id)) throw fail(400, 'ID không hợp lệ'); const input = candyInput(req.body), session = await mongoose.startSession(); let doc; try { await session.withTransaction(async () => { const before = await Product.findOneAndUpdate({ _id: req.params.id, active: true }, { $set: input }, { new: false, session, runValidators: true }); if (!before) throw fail(404, 'Không tìm thấy bánh kẹo'); doc = { ...before.toObject(), ...input, _id: before._id }; const delta = input.stock - before.stock; if (delta) await Movement.create([{ product: before._id, sku: input.sku, name: input.name, type: 'adjustment', quantity: delta, before: before.stock, after: input.stock, note: txt(req.body.reason || 'Cập nhật tồn bánh kẹo', 300) }], { session }); }); } finally { await session.endSession(); } changed(); res.json(doc); }));

app.get('/api/partners', asyncRoute(async (req, res) => { const filter = ['supplier','customer'].includes(req.query.type) ? { type: req.query.type } : {}; res.json(await Partner.find(filter).sort({ name: 1 }).lean()); }));
app.post('/api/partners', asyncRoute(async (req, res) => { if (!['supplier','customer'].includes(req.body.type) || !txt(req.body.name)) throw fail(400, 'Đối tác không hợp lệ'); const doc = await Partner.create({ type: req.body.type, name: txt(req.body.name), phone: txt(req.body.phone, 40), email: txt(req.body.email, 100), address: txt(req.body.address, 250) }); changed(); res.status(201).json(doc); }));
app.patch('/api/partners/:id', asyncRoute(async (req, res) => { if (!validId(req.params.id)) throw fail(400, 'ID không hợp lệ'); const input = {}; for (const k of ['name','phone','email','address']) if (req.body[k] !== undefined) input[k] = txt(req.body[k], k === 'address' ? 250 : 200); if (input.name === '') throw fail(400, 'Tên không được để trống'); const doc = await Partner.findByIdAndUpdate(req.params.id, { $set: input }, { new: true, runValidators: true }); if (!doc) throw fail(404, 'Không tìm thấy đối tác'); changed(); res.json(doc); }));

app.get('/api/bundles', asyncRoute(async (req, res) => res.json(await Bundle.find().sort({ updatedAt: -1 }).lean())));
const bundleInput = async body => { const { name, items, packagingCost, sellingPrice, image = '' } = body; if (!txt(name) || !Array.isArray(items) || !items.length || items.length > 100 || !whole(packagingCost) || !whole(sellingPrice, 1)) throw fail(400, 'Nhập tên set, bánh kẹo và giá bán lớn hơn 0'); const ids = items.map(i => String(i.product)); if (ids.some(id => !validId(id)) || items.some(i => !whole(i.quantity, 1))) throw fail(400, 'Sản phẩm trong set không hợp lệ'); if (await Product.countDocuments({ _id: { $in: ids }, active: true }) !== ids.length) throw fail(400, 'Có sản phẩm đã bị ẩn hoặc không tồn tại'); if (typeof image !== 'string' || (image && (!/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(image) || image.length > 600000))) throw fail(400, 'Ảnh set không hợp lệ hoặc quá lớn'); return { name: txt(name), image, items: items.map(i => ({ product: i.product, quantity: Number(i.quantity) })), packagingCost: Number(packagingCost), sellingPrice: Number(sellingPrice) }; };
app.post('/api/bundles', asyncRoute(async (req, res) => { const doc = await Bundle.create(await bundleInput(req.body)); changed(); res.status(201).json(doc); }));
app.patch('/api/bundles/:id', asyncRoute(async (req, res) => { if (!validId(req.params.id)) throw fail(400, 'ID không hợp lệ'); const input = await bundleInput(req.body); const doc = await Bundle.findByIdAndUpdate(req.params.id, { $set: input }, { new: true, runValidators: true }); if (!doc) throw fail(404, 'Không tìm thấy set'); changed(); res.json(doc); }));
app.delete('/api/bundles/:id', asyncRoute(async (req, res) => { if (!validId(req.params.id)) throw fail(400, 'ID không hợp lệ'); const doc = await Bundle.findByIdAndDelete(req.params.id); if (!doc) throw fail(404, 'Không tìm thấy set'); changed(); res.json({ ok: true }); }));

app.get('/api/bundle-sales', asyncRoute(async (req, res) => res.json(await BundleSale.find().sort({ createdAt: -1 }).lean())));
app.get('/api/bundle-sales/:id', asyncRoute(async (req, res) => { if (!validId(req.params.id)) throw fail(400, 'ID không hợp lệ'); const doc = await BundleSale.findById(req.params.id).lean(); if (!doc) throw fail(404, 'Không tìm thấy đơn bán'); res.json(doc); }));
app.get('/api/receipts/:id', asyncRoute(async (req, res) => { if (!validId(req.params.id)) throw fail(400, 'ID không hợp lệ'); const doc = await BundleSale.findById(req.params.id).lean(); if (!doc) throw fail(404, 'Không tìm thấy bill'); res.json(toCustomerReceipt(doc)); }));
app.post('/api/bundle-sales', asyncRoute(async (req, res) => {
  const { items, paymentMethod } = req.body;
  if (!['cash', 'transfer'].includes(paymentMethod) || !Array.isArray(items) || !items.length || items.length > 50) throw fail(400, 'Giỏ hàng hoặc hình thức thanh toán không hợp lệ');
  const ids = items.map(i => String(i.bundle));
  if (items.some(i => i.extra && (!validId(i.extra.product) || !whole(i.extra.quantity, 1) || !whole(i.extra.extraPrice) || Number(i.extra.quantity)>1000))) throw fail(400, 'Món thêm không hợp lệ');
  if (ids.some(id => !validId(id)) || items.some(i => !whole(i.quantity, 1) || Number(i.quantity) > 1000)) throw fail(400, 'Set hoặc số lượng không hợp lệ');
  const customerName = txt(req.body.customerName || 'Khách lẻ', 100) || 'Khách lẻ';
  const session = await mongoose.startSession(); let sold;
  try { await session.withTransaction(async () => {
    const bundles = await Bundle.find({ _id: { $in: ids } }).session(session).lean();
    if (bundles.length !== ids.length) throw fail(409, 'Có set đã bị xóa. Hãy kiểm tra lại giỏ hàng');
    const byId = new Map(bundles.map(b => [String(b._id), b]));
    const productIds = [...new Set([...bundles.flatMap(b => b.items.map(i => String(i.product))), ...items.filter(i => i.extra).map(i => String(i.extra.product))])];
    const products = await Product.find({ _id: { $in: productIds }, active: true }).session(session).lean();
    const byProduct = new Map(products.map(p => [String(p._id), p]));
    const required = new Map(); let total = 0, costTotal = 0;
    const soldItems = items.map(i => {
      const b = byId.get(String(i.bundle)), qty = Number(i.quantity);
      if (!b.items.length || !whole(b.sellingPrice, 1)) throw fail(409, `Set ${b.name} chưa có giá bán hoặc bánh kẹo`);
      const ingredients = b.items.map(line => {
        const p = byProduct.get(String(line.product));
        if (!p) throw fail(409, `Set ${b.name} có bánh kẹo đã bị ẩn`);
        const needed = Number(line.quantity) * qty;
        required.set(String(p._id), (required.get(String(p._id)) || 0) + needed);
        return { product: p._id, sku: p.sku, name: p.name, unit: p.unit, quantityPerSet: line.quantity, unitCost: p.cost };
      });
      let extraName = '';
      if (i.extra) { const p=byProduct.get(String(i.extra.product)); if(!p)throw fail(409, 'Món thêm không còn trong kho'); extraName=p.name; required.set(String(p._id),(required.get(String(p._id))||0)+Number(i.extra.quantity)*qty); ingredients.push({product:p._id,sku:p.sku,name:p.name,unit:p.unit,quantityPerSet:Number(i.extra.quantity),unitCost:p.cost}); }
      const unitCost = b.packagingCost + ingredients.reduce((sum, p) => sum + p.unitCost * p.quantityPerSet, 0);
      total += (b.sellingPrice + Number(i.extra?.extraPrice || 0)) * qty; costTotal += unitCost * qty;