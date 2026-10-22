function orderPrintHTML(o) {
  const totals=orderAmounts(o.lines);
  const logo=typeof LOGO_DM!=='undefined'?LOGO_DM:'';
  const signatures=o.signatures||o.document?.signatures||{};
  const signatureImage=role=>String(signatures[role]||'').startsWith('data:image/png;base64,')?signatures[role]:'';
  return `<!doctype html><html lang="pt-PT"><head><meta charset="utf-8"><title>Encomenda - ${esc(o.clientName||'cliente')}</title>
  <style>@page{size:A4;margin:15mm}body{font:12px Arial;color:#172b4d;margin:0}header{display:flex;align-items:center;gap:24px;border-bottom:2px solid #1f7bb6;padding-bottom:16px}header img{width:150px;height:65px;object-fit:contain}h1{font-size:21px}h2{font-size:15px}.meta{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin:24px 0}.meta div{overflow-wrap:anywhere}table{width:100%;border-collapse:collapse;table-layout:fixed}th,td{padding:9px 5px;text-align:left;border-bottom:1px solid #ddd;overflow-wrap:anywhere}th{background:#edf3f7;font-size:10px}thead{display:table-header-group}tr{break-inside:avoid}th:nth-child(1){width:12%}th:nth-child(2){width:27%}.totals{margin:20px 0 20px auto;width:260px;break-inside:avoid}.totals p{display:flex;justify-content:space-between}.notes{white-space:pre-wrap;overflow-wrap:anywhere;border-top:1px solid #ddd;padding:15px 0}.print-help{padding:12px;background:#edf3f7;margin-bottom:16px}@media print{.print-help{display:none}} </style></head><body>
  <div class="print-help"><button onclick="window.print()">Imprimir / Guardar como PDF</button> Escolha «Guardar como PDF» na janela de impressão.</div>
  <header>${logo?`<img src="${logo}" alt="Domingos &amp; Morgado">`:''}<div><h1>Encomenda</h1><strong>Domingos &amp; Morgado</strong><p>${new Date(o.date||Date.now()).toLocaleDateString('pt-PT')}</p></div></header>
  <section class="meta"><div><h2>Cliente</h2>${esc(o.clientName)}<br>NIF: ${esc(o.nif||o.document?.nif||'')}</div><div><h2>Entrega</h2>${esc(o.delivery||'')}</div><div><strong>Condições de pagamento</strong><br>${esc(o.paymentTerms||'')}</div><div><strong>Estado</strong><br>${esc(o.status||'Rascunho - não guardado')}</div></section>
  <section class="meta"><div><strong>Meio de pagamento</strong><br>${esc(o.paymentMethod||o.document?.paymentMethod||'—')}</div>
  <div><strong>Data de entrega</strong><br>${esc((o.deliveryDate||o.document?.deliveryDate||'').split('-').reverse().join('/')||'—')}</div></section>
  ${o.paymentTerms==='PAGAMENTO PARCIAL'?`<section class="notes"><strong>Parcelas de pagamento</strong><p>${esc(o.paymentInstallments||o.document?.paymentInstallments||'')}</p></section>`:''}
  <table><thead><tr><th>Código</th><th>Descrição</th><th>Qtd.</th><th>Preço</th><th>Desc. %</th><th>IVA %</th><th>Total s/ IVA</th></tr></thead><tbody>
  ${o.lines.map(l=>`<tr><td>${esc(l.code)}</td><td>${esc(l.description)}</td><td>${esc(l.qty)}</td><td>${unitPriceLabel(l.price)}</td><td>${esc(l.discount)}</td><td>${esc(l.vat)}</td><td>${eur(lineTotal(l))}</td></tr>`).join('')}</tbody></table>
  <section class="totals"><p>Subtotal <span>${eur(totals.subtotal)}</span></p><p>IVA <span>${eur(totals.vat)}</span></p><p><strong>Total</strong><strong>${eur(totals.total)}</strong></p></section>
  <section class="notes"><strong>Observações</strong><p>${esc(o.notes||'—')}</p></section>
  <section style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:22px;margin-top:25px;break-inside:avoid">
  ${[['Cliente','signatureClientName','client'],['Comercial','signatureSalesName','sales'],['Gerência','signatureManagementName','management']].map(([label,key,role])=>`<div><strong>${label}</strong><div style="height:65px;border-bottom:1px solid #172b4d;display:flex;align-items:flex-end;justify-content:center">${signatureImage(role)?`<img src="${signatureImage(role)}" alt="Assinatura de ${label}" style="max-width:100%;max-height:62px;object-fit:contain">`:''}</div><p style="overflow-wrap:anywhere">${esc(o[key]||o.document?.[key]||'Assinatura')}</p><p>Data: ____ / ____ / ______</p></div>`).join('')}</section>
  <script>window.addEventListener('load',()=>window.print());</script></body></html>`;
}
function openOrderPrint(o) {
  document.body.classList.remove('mobile-menu-open','order-wide-mode');
  document.querySelector('.mobile-menu-button')?.setAttribute('aria-expanded','false');
  const popup=window.open('','_blank');
  if(!popup){alert('Permita abrir janelas nesta página para guardar o PDF.');return;}
  popup.document.write(orderPrintHTML(o));popup.document.close();
}
function printDraftOrder() {
  captureOrder();
  try {
    validateOrder(state.orderDraft,state.orderLines);
    openOrderPrint({...state.orderDraft,number:'Rascunho - não guardado',status:'Rascunho - não guardado',signatures:{...state.orderSignatures},lines:state.orderLines});
  } catch(e){document.querySelector('#order-message').textContent=e.message;}
}
printOrder = function(id) {
  const order=state.orders.find(o=>o.id===id);
  if(order?.lines?.length)openOrderPrint(order);
};
