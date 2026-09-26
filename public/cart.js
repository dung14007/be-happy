const CartStore = (() => {
  const key = 'khoflow-cart-v1';
  const read = () => { try { const v = JSON.parse(localStorage.getItem(key) || '[]'); return Array.isArray(v) ? v.filter(i => typeof i.bundle === 'string' && Number.isSafeInteger(i.quantity) && i.quantity > 0 && (!i.extra || (typeof i.extra.product === 'string' && Number.isSafeInteger(i.extra.quantity) && i.extra.quantity > 0 && Number.isSafeInteger(i.extra.extraPrice) && i.extra.extraPrice >= 0))) : []; } catch { return []; } };
  const write = items => localStorage.setItem(key, JSON.stringify(items));
  return {
    read,
    add(bundle, quantity=1, extra=null) { const items=read(), found=items.find(i=>i.bundle===bundle && JSON.stringify(i.extra||null)===JSON.stringify(extra)); if(found)found.quantity+=quantity; else items.push({bundle,quantity,...(extra?{extra}:{})}); write(items); return items; },
    change(index,quantity) { const items=read(); if(!Number.isSafeInteger(index)||index<0||index>=items.length)return items; if(Number.isSafeInteger(quantity)&&quantity>0)items[index].quantity=quantity; else items.splice(index,1); write(items); return items; },
    clear() { localStorage.removeItem(key); },
    count() { return read().reduce((n,i)=>n+i.quantity,0); }
  };
})();
if (typeof module !== 'undefined') module.exports = CartStore;
