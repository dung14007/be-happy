const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
const money = n => new Intl.NumberFormat('vi-VN').format(n || 0) + ' ₫';
const id = new URLSearchParams(location.search).get('id');
async function load() {
  if (!id) { document.querySelector('#receipt').innerHTML='<div class="loading">Chưa chọn đơn hàng.</div>'; return; }
  try {
    const response = await fetch('/api/receipts/' + encodeURIComponent(id));
    const bill = await response.json();
    if (!response.ok) throw Error(bill.error || 'Không tải được bill');
    document.title = `Bill ${bill.code} · Be Happy`;
    document.querySelector('#receipt').innerHTML = `<header class="receipt-head"><div class="mark">Be Happy</div><h1>PHIẾU THANH TOÁN</h1><p>Cảm ơn quý khách đã mua hàng!</p></header><section class="receipt-meta"><div><span>Mã đơn</span><strong>${esc(bill.code)}</strong></div><div><span>Ngày bán</span><strong>${new Date(bill.createdAt).toLocaleString('vi-VN')}</strong></div><div><span>Khách hàng</span><strong>${esc(bill.customerName)}</strong></div><div><span>Thanh toán</span><strong>${bill.paymentMethod==='transfer'?'Chuyển khoản':'Tiền mặt'}</strong></div></section><table class="receipt-table"><thead><tr><th>SET</th><th>SL</th><th>ĐƠN GIÁ</th><th>THÀNH TIỀN</th></tr></thead><tbody>${bill.items.map(i=>`<tr><td>${esc(i.name)}</td><td>${i.quantity}</td><td>${money(i.unitPrice)}</td><td>${money(i.lineTotal)}</td></tr>`).join('')}</tbody></table><div class="receipt-total"><span>TỔNG ĐÃ THANH TOÁN</span><strong>${money(bill.total)}</strong></div><footer class="receipt-foot">Bill được lưu theo đơn hàng và có thể xem lại trong Lịch sử bán.<br>Cảm ơn và hẹn gặp lại!</footer>`;
  } catch(e) { document.querySelector('#receipt').innerHTML=`<div class="loading">${esc(e.message)}</div>`; }
}
document.querySelector('#print').addEventListener('click',()=>window.print());
load();
