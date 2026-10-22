// Módulo de encomendas: mantém as duas bases de clientes independentes.
state.orderDraft = {};
function businessSelect(name, values, current='', required=false, change='') {
  // Preserve older saved values without silently changing their meaning.
  const options=current&&!values.includes(current)?[...values,current]:values;
  return `<select name="${name}" ${required?'required':''} ${change?`onchange="${change}"`:''}><option value="">Selecionar...</option>${options.map(value=>`<option value="${esc(value)}" ${value===current?'selected':''}>${esc(value)}</option>`).join('')}</select>`;
}
function paymentTermsChanged() {
  captureOrder();
  if(state.orderDraft.paymentTerms!=='PAGAMENTO PARCIAL')state.orderDraft.paymentInstallments='';
  render();
}
function normalizeOrder(row) {
  return {...(row.document || {}), ...row, clientName:row.client_name || row.clientName || '',
    paymentTerms:row.payment_terms || row.paymentTerms || '', lines:row.document?.lines || row.lines || []};
}
function orderClients() {
  return (state.orderDraft.source === 'crm_clients_import' ? state.importedClients : state.clients)
    .filter(c => c.status !== 'Inativo' && c.active !== false);
}
function normalizeSearch(value) {
  return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt');
}
function orderClientSearchResults(query) {
  const term=normalizeSearch(query).trim();
  if(!term)return '<p>Escreva parte do nome ou do NIF para encontrar um cliente.</p>';
  const matches=orderClients().filter(c=>normalizeSearch(`${c.name} ${c.nif}`).includes(term)).slice(0,25);
  if(!matches.length)return '<p role="status">Nenhum cliente encontrado.</p>';
  return `<p role="status">${matches.length}${matches.length===25?' primeiros':''} resultado(s)</p><div class="lookup-results">${matches.map(c=>`<button type="button" class="lookup-card" data-choose-client="${esc(c.id)}"><strong>${esc(c.name)}</strong><span>NIF ${esc(c.nif||'—')}</span><small>${esc(c.locality||c.extra_fields?.locality||'')}</small></button>`).join('')}</div>`;
}
function captureOrder() {
  const form = document.querySelector('#order-form');
  if (form) Object.assign(state.orderDraft, Object.fromEntries(new FormData(form)));
}
function startOrder() {
  state.orderDraft = {source:'crm_clients'};
  state.orderLines = [];
  state.orderMessage = '';
  state.articleQuery = '';
  state.clientQuery = '';
  state.view = 'new-order';
  render();
}
function chooseOrderClient(id) {
  captureOrder();
  const c = orderClients().find(c => c.id === id);
  if (!c) return;
  Object.assign(state.orderDraft, {clientId:id, clientName:c.name, nif:c.nif,
    delivery:c.address || c.extra_fields?.address || '',
    paymentTerms:c.payment_terms || c.extra_fields?.paymentTerms || '',
    paymentMethod:c.payment_method || c.extra_fields?.paymentMethod || '',paymentInstallments:''});
  render();
}
function changeOrderSource(source) {
  captureOrder();
  Object.assign(state.orderDraft,{source,clientId:'',clientName:'',nif:'',delivery:'',paymentTerms:'',paymentMethod:'',paymentInstallments:''});
  render();
}
function money(value) { return Math.round((Number(value) + Number.EPSILON) * 100) / 100; }
function catalogPrice(value) {return value==null||String(value).trim()===''?null:Number(value);}
lineTotal = l => money(Number(l.qty)*Number(l.price)*(1-Number(l.discount)/100));
function orderAmounts(lines) {
  const subtotal = money(lines.reduce((s,l)=>s+lineTotal(l),0));
  const vat = money(lines.reduce((s,l)=>s+money(lineTotal(l)*Number(l.vat)/100),0));
  return {subtotal, vat, total:money(subtotal+vat)};
}
orderTotal = () => orderAmounts(state.orderLines).total;
newOrder = function() {
  const d=state.orderDraft, totals=orderAmounts(state.orderLines);
  const missingPrices=state.orderLines.some(l=>!Number.isFinite(l.price));
  const input=(name,label,type='text')=>`<label>${label}<input type="${type}" name="${name}" value="${esc(d[name]||'')}" required></label>`;
  return `<section class="page"><h1>Nova encomenda</h1><p>Todos os dados da encomenda são obrigatórios, exceto as assinaturas. Pesquise clientes e artigos sem percorrer listas extensas.</p>
  <form id="order-form" class="panel form" oninput="captureOrder()">
  <div class="form-grid"><label>Base de clientes<select name="source" onchange="changeOrderSource(this.value)">
  <option value="crm_clients" ${d.source!=='crm_clients_import'?'selected':''}>CRM</option>
  <option value="crm_clients_import" ${d.source==='crm_clients_import'?'selected':''}>Clientes importados</option></select></label>
  <label class="full-field">Pesquisar cliente<input value="${esc(state.clientQuery||'')}" placeholder="Nome ou NIF" oninput="searchOrderClients(this.value)"></label>
  <div id="order-client-results" class="full-field">${orderClientSearchResults(state.clientQuery||'')}</div>
  ${input('clientName','Nome do cliente *')}${input('nif','NIF *')}${input('delivery','Morada de entrega *')}
  <div class="payment-group"><label>Condições de pagamento *${businessSelect('paymentTerms',['30 DIAS','30 DIAS DATA FATURA','PP','PAGAMENTO PARCIAL'],d.paymentTerms||'',true,'paymentTermsChanged()')}</label>
  ${d.paymentTerms==='PAGAMENTO PARCIAL'?`<label>Parcelas de pagamento *<textarea name="paymentInstallments" required placeholder="Ex.: 1.ª parcela: 50% na adjudicação; 2.ª parcela: 50% na entrega. Indique valores ou percentagens e datas.">${esc(d.paymentInstallments||'')}</textarea></label>`:''}</div>
  <label>Meio de pagamento *${businessSelect('paymentMethod',['CHEQUE','NUMERÁRIO','TRANSFERÊNCIA BANCÁRIA','LÍQUIDO - GRENKE','LEASING PRÓPRIO'],d.paymentMethod||'',true)}</label>
  ${input('deliveryDate','Data de entrega *','date')}
  </div>
  <label class="order-notes">Observações *<textarea name="notes" required placeholder="Informações de entrega, instruções ou outros detalhes...">${esc(d.notes||'')}</textarea></label>
  <label>Pesquisar artigos por código ou descrição<input id="order-article-search" value="${esc(state.articleQuery||'')}" placeholder="Ex.: barras" oninput="searchOrderArticles(this.value)"></label>
  <div id="order-article-results">${articleSearchResults(state.articleQuery||'')}</div>
  <h2>Artigos</h2><p>Use a pesquisa acima ou adicione uma linha manual.</p>
  <button type="button" class="secondary" onclick="addManualLine()">+ Linha manual</button>
  <div class="vat-actions"><span>Aplicar IVA a toda a encomenda:</span>
  <button type="button" class="secondary" onclick="setOrderVAT(23)">IVA 23%</button>
  <button type="button" class="secondary" onclick="setOrderVAT(0)">Isento de IVA</button>
  <small>Os preços são sem IVA. Pode escolher uma taxa diferente em cada linha.</small></div>
  <div class="table-wrap"><table><thead><tr><th>Código / descrição</th><th>Qtd.</th><th>Preço</th><th>Desc. %</th><th>IVA %</th><th>Total s/ IVA</th><th></th></tr></thead><tbody>
  ${state.orderLines.map((l,i)=>`<tr><td><input aria-label="Código" required value="${esc(l.code)}" onchange="editOrderLine(${i},'code',this.value)"><input aria-label="Descrição" required value="${esc(l.description)}" onchange="editOrderLine(${i},'description',this.value)"></td>
  ${['qty','price','discount'].map(k=>`<td><input aria-label="${k}" type="number" required min="${k==='qty'?'0.001':'0'}" ${k==='discount'?'max="100"':''} step="${k==='qty'||k==='price'?'0.001':'0.01'}" value="${l[k]??''}" placeholder="${k==='price'?'Indicar preço':''}" onchange="editOrderLine(${i},'${k}',this.value)"></td>`).join('')}
  <td><select aria-label="IVA da linha ${i+1}" onchange="editOrderLine(${i},'vat',this.value)">
  <option value="23" ${Number(l.vat)===23?'selected':''}>IVA 23%</option>
  <option value="0" ${Number(l.vat)===0?'selected':''}>Isento de IVA</option>
  ${![0,23].includes(Number(l.vat))?`<option value="${Number(l.vat)}" selected>Taxa existente: ${Number(l.vat)}%</option>`:''}</select></td>
  <td>${Number.isFinite(l.price)?eur(lineTotal(l)):'Preço por indicar'}</td><td><button type="button" onclick="removeOrderLine(${i})">Remover</button></td></tr>`).join('')}
  </tbody></table></div><div class="totals">${missingPrices?'<strong role="status">Preencha os preços em falta para calcular o total, guardar ou gerar PDF.</strong>':`<span>Subtotal: ${eur(totals.subtotal)}</span><span>IVA: ${eur(totals.vat)}</span><strong>Total: ${eur(totals.total)}</strong>`}</div>
  <h2>Assinaturas</h2><p>Espaços para assinatura manuscrita no PDF. Pode indicar abaixo os nomes dos signatários.</p>
  <div class="form-grid"><label>Cliente — nome<input name="signatureClientName" value="${esc(d.signatureClientName||'')}"></label><label>Comercial — nome<input name="signatureSalesName" value="${esc(d.signatureSalesName||'')}"></label><label>Gerência — nome<input name="signatureManagementName" value="${esc(d.signatureManagementName||'')}"></label></div>
  <p id="order-message" role="status">${esc(state.orderMessage||'')}</p>
  <button type="button" class="secondary" onclick="printDraftOrder()">Guardar em PDF</button>
  <button class="primary" ${state.savingOrder?'disabled':''}>${state.savingOrder?'A guardar...':'Guardar encomenda no Supabase'}</button></form></section>`;
};
function searchOrderClients(q) {
  state.clientQuery=q;
  document.querySelector('#order-client-results').innerHTML=orderClientSearchResults(q);
}
addOrderLine = function(e) {
  captureOrder();
  const a=state.articles.find(a=>a.id===e.target.value);
  if (!a || a.active===false) return;
  state.orderLines.push({code:a.code,description:a.description,qty:1,price:catalogPrice(a.price),discount:0,vat:Number(state.orderDraft.defaultVAT??a.vat??23)});
  render();
};
function addManualLine() {
  captureOrder();
  state.orderLines.push({code:'',description:'',qty:1,price:0,discount:0,vat:Number(state.orderDraft.defaultVAT??23)});
  render();
}
function editOrderLine(i,key,value) {
  captureOrder();
  state.orderLines[i][key]=['code','description'].includes(key)?value:(String(value).trim()===''?null:Number(value));
  if (key === 'code') {
    const article=state.articles.find(a=>a.active!==false && String(a.code).trim().toLowerCase()===value.trim().toLowerCase());
    if(article) Object.assign(state.orderLines[i],{code:article.code,description:article.description,price:catalogPrice(article.price),vat:Number(state.orderDraft.defaultVAT??article.vat??23)});
  }
  render();
}
function removeOrderLine(i) {captureOrder();state.orderLines.splice(i,1);render();}
function setOrderVAT(vat) {
  if (![0,23].includes(vat)) return;
  captureOrder();
  state.orderDraft.defaultVAT=vat;
  state.orderLines.forEach(line=>{line.vat=vat;});
  render();
}
function validateOrder(d,lines) {
  const required=[['clientName','nome do cliente'],['nif','NIF'],['delivery','morada de entrega'],['paymentTerms','condições de pagamento'],['paymentMethod','meio de pagamento'],['deliveryDate','data de entrega'],['notes','observações']];
  const missing=required.filter(([key])=>!String(d[key]||'').trim()).map(([,label])=>label);
  if(missing.length)throw Error('Preencha: '+missing.join(', ')+'.');
  if(d.paymentTerms==='PAGAMENTO PARCIAL'&&!d.paymentInstallments?.trim())
    throw Error('Indique as parcelas do pagamento parcial.');
  if (!lines.length) throw Error('Adicione pelo menos um artigo ou uma linha manual.');
  for (const l of lines) {
    if (!String(l.code||'').trim()) throw Error('Preencha o código de todas as linhas.');
    if(l.price==null||!Number.isFinite(l.price))throw Error('Indique o preço do artigo '+(l.code||l.description||'sem código')+'.');
    if (!l.description.trim()) throw Error('Preencha a descrição de todas as linhas.');
    if (![l.qty,l.price,l.discount,l.vat].every(Number.isFinite) || l.qty<=0 || l.price<0 ||
        l.discount<0 || l.discount>100 || l.vat<0 || l.vat>100)
      throw Error('Verifique as quantidades, preços, descontos e IVA.');
  }
}
saveOrder = async function(e) {
  e.preventDefault();
  if (state.savingOrder) return;
  captureOrder();
  const d=state.orderDraft;
  try {
    validateOrder(d,state.orderLines);
    if (!supabaseClient) throw Error('Sem ligação ao Supabase. A encomenda não foi guardada.');
    state.savingOrder=true;
    state.orderMessage='A guardar...';
    render();
    d.documentId ||= crypto.randomUUID();
    d.number ||= 'E-'+d.documentId.toUpperCase();
    const totals=orderAmounts(state.orderLines);
    const payload={id:d.documentId,number:d.number,client_id:d.source==='crm_clients'?(d.clientId||null):null,
      client_name:d.clientName,date:new Date().toISOString(),delivery:d.delivery||'',payment_terms:d.paymentTerms||'',
      notes:d.notes||'',status:'Rascunho',subtotal:totals.subtotal,vat_total:totals.vat,total:totals.total,
      document:{...d,paymentInstallments:d.paymentTerms==='PAGAMENTO PARCIAL'?(d.paymentInstallments||''):'',lines:state.orderLines.map(l=>({...l}))}};
    const {error}=await supabaseClient.from('orders').insert(payload);
    if (error) {
      const missingTable=['42P01','PGRST205'].includes(error.code)||/could not find.*orders|relation.*orders.*does not exist/i.test(error.message);
      throw Error(error.message + (missingTable?' Execute o ficheiro supabase-orders.sql no editor SQL do Supabase.':''));
    }
    state.orders.unshift(normalizeOrder(payload));
    state.orderLines=[];state.orderDraft={};state.orderMessage='';
    state.view='orders';
  } catch(error) { state.orderMessage='Não foi possível guardar: '+error.message; }
  finally {state.savingOrder=false;render();}
};
document.addEventListener('click',e=>{
  const button=e.target.closest('[data-choose-client]');
  if(button)chooseOrderClient(button.dataset.chooseClient);
});
orders = function() {
  return `<section class="page"><h1>Encomendas</h1><button class="primary" onclick="startOrder()">+ Nova encomenda</button>
  <p id="orders-message" role="status"></p><button class="secondary" onclick="refreshOrders()">Atualizar lista</button>
  <div class="table-wrap"><table><thead><tr><th>Número</th><th>Cliente</th><th>Total</th><th>Estado</th><th></th></tr></thead><tbody>
  ${state.orders.map(o=>`<tr><td>${esc(o.number)}</td><td>${esc(o.clientName)}</td><td>${eur(o.total)}</td><td>${esc(o.status)}</td><td>
  ${o.lines?.length?`<button onclick="printOrder('${o.id}')">PDF</button><button onclick="duplicateOrder('${o.id}')">Duplicar</button>`:'Sem linhas disponíveis nesta versão'}</td></tr>`).join('')}
  </tbody></table></div></section>`;
};
async function refreshOrders() {
  try {state.orders=(await readAllRows('orders')).map(normalizeOrder);render();}
  catch(e){document.querySelector('#orders-message').textContent='Não foi possível carregar: '+e.message;}
}
duplicateOrder = function(id) {
  const original=state.orders.find(o=>o.id===id);
  if(!original?.lines?.length)return;
  state.orderDraft={source:original.source||original.document?.source||'crm_clients',clientName:original.clientName,
    nif:original.document?.nif||'',delivery:original.delivery,paymentTerms:original.paymentTerms,notes:original.notes,
    paymentMethod:original.paymentMethod||original.document?.paymentMethod||'',
    paymentInstallments:original.paymentInstallments||original.document?.paymentInstallments||''};
  state.orderMessage='';state.articleQuery='';
  state.orderLines=original.lines.map(l=>({...l}));
  state.view='new-order';render();
};
