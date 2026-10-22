const CLIENT_PAGE_SIZE = 25;
const CLIENT_GROUPS = window.DM_CLIENT_GROUPS || [];
const CLIENT_ASSOCIATES = window.DM_CLIENT_ASSOCIATES || [];

function optionList(values,current='') {
  const options=current&&!values.includes(current)?[...values,current]:values;
  return `<option value="">Selecionar...</option>${options.map(value=>`<option value="${esc(value)}" ${value===current?'selected':''}>${esc(value)}</option>`).join('')}`;
}
function districtOptions(current='') { return optionList(Object.keys(window.PORTUGAL_LOCATIONS||{}),current); }
function municipalityOptions(district,current='') { return optionList((window.PORTUGAL_LOCATIONS||{})[district]||[],current); }
function updateMunicipalityOptions(district) {
  const select=document.querySelector('[name="municipality"]');
  if(!select)return;
  select.innerHTML=municipalityOptions(district,'');select.disabled=!district;
}

newClient = function() {
  return `<section class="page client-page"><div class="eyebrow">CLIENTES / NOVA FICHA</div><h1>Novo cliente</h1>
  <p class="muted">Os campos com * são obrigatórios para aprovar a ficha.</p>
  <form id="client-form" class="panel form">
  <h2>Identificação e condições comerciais</h2><div class="form-grid">
  <label>Firma / nome *<input name="name" required></label>
  <label>Contribuinte / NIF *<input name="nif" inputmode="numeric" pattern="[0-9]{9}" maxlength="9" required><small>9 algarismos</small></label>
  <label>Morada *<input name="address" required></label>
  <label>Código postal *<input name="postal" placeholder="0000-000" pattern="[0-9]{4}-[0-9]{3}" required></label>
  <label>Localidade *<input name="locality" required></label>
  <label>Distrito / região autónoma<select name="district" onchange="updateMunicipalityOptions(this.value)">${districtOptions()}</select></label>
  <label>Concelho<select name="municipality" disabled>${municipalityOptions('')}</select></label>
  <label>Telefone *<input name="phone" required></label>
  <label>Telemóvel *<input name="mobile" inputmode="tel" required></label>
  <label>E-mail *<input type="email" name="email" required></label>
  <label>Actividade *<input name="activity" required></label>
  <label>CAE *<input name="cae" inputmode="numeric" pattern="[0-9]+" required></label>
  <label>Banco *<input name="bank" required></label>
  <label>Condições de pagamento *${businessSelect('paymentTerms',['30 DIAS','30 DIAS DATA FATURA','PP'],'',true)}</label>
  <label>Meio de pagamento *${businessSelect('paymentMethod',['CHEQUE','NUMERÁRIO','TRANSFERÊNCIA BANCÁRIA'],'',true)}</label>
  <label>Vendedor${businessSelect('seller',['RUI FERREIRA','JOÃO REBELO','SANDRO LOUREIRO','DM'])}</label>
  <label>Grupo de cliente<select name="clientGroup">${optionList(CLIENT_GROUPS)}</select><small>A lista será adicionada quando for fornecida.</small></label>
  <label>Associado<select name="associate">${optionList(CLIENT_ASSOCIATES)}</select><small>A lista será adicionada quando for fornecida.</small></label>
  </div>
  <h2 class="section-title">Contactos</h2><div class="form-grid extra">
  <label>Pessoa de contacto *<input name="contact" required></label>
  <label>Telefone da pessoa de contacto *<input name="contactPhone" inputmode="tel" required></label>
  <label>E-mail da pessoa de contacto *<input type="email" name="contactEmail" required></label>
  <label>Responsável financeiro *<input name="financialResponsible" required></label>
  <label>Telefone do responsável financeiro *<input name="financialPhone" inputmode="tel" required></label>
  <label>E-mail do responsável financeiro *<input type="email" name="financialEmail" required></label>
  <label>Responsável de compras<input name="purchasingResponsible"></label>
  <label>Telefone do responsável de compras<input name="purchasingPhone" inputmode="tel"></label>
  <label>E-mail do responsável de compras<input type="email" name="purchasingEmail"></label>
  </div>
  <details><summary>Mais informações</summary><div class="form-grid extra">
  <label>Balcão<input name="branch"></label><label>NIB<input name="nib"></label>
  <label>Observações<textarea name="notes"></textarea></label></div></details>
  <div class="form-actions"><button type="button" class="secondary" onclick="state.view='clients';render()">Cancelar</button>
  <button type="button" class="secondary" onclick="saveDraft()">Guardar rascunho neste computador</button>
  <button type="button" class="secondary" onclick="printClient()">Guardar PDF</button>
  <p id="client-save-message" role="status"></p><button class="primary" id="client-save">Guardar cliente no CRM</button></div>
  </form></section>`;
};

function clientFields(c) {
  const x=c.extra_fields||{};
  return [
    ['Firma / nome',c.name],['NIF',c.nif],['Estado',c.status||(c.active===false?'Inativo':'Ativo')],
    ['Morada',c.address||x.address],['Código postal',c.postal||x.postal],['Localidade',c.locality||x.locality],
    ['Distrito / região autónoma',c.district||x.district],['Concelho',c.municipality||x.municipality],
    ['Telefone',c.phone],['Telemóvel',c.mobile||x.mobile],['E-mail',c.email],
    ['Actividade',c.activity||x.activity],['CAE',c.cae||x.cae],['Banco',c.bank||x.bank],
    ['Condições de pagamento',c.payment_terms||c.paymentTerms||x.paymentTerms],
    ['Meio de pagamento',c.payment_method||c.paymentMethod||x.paymentMethod],
    ['Vendedor',c.owner_name||c.seller||x.seller],['Grupo de cliente',c.clientGroup||x.clientGroup],
    ['Associado',c.associate||x.associate],['Pessoa de contacto',c.contact||x.contact],
    ['Telefone da pessoa de contacto',c.contact_phone||c.contactPhone||x.contactPhone],
    ['E-mail da pessoa de contacto',c.contactEmail||x.contactEmail],
    ['Responsável financeiro',c.financialResponsible||x.financialResponsible],
    ['Telefone do responsável financeiro',c.financialPhone||x.financialPhone||c.financialContact||x.financialContact],
    ['E-mail do responsável financeiro',c.financialEmail||x.financialEmail],
    ['Responsável de compras',c.purchasingResponsible||x.purchasingResponsible],
    ['Telefone do responsável de compras',c.purchasingPhone||x.purchasingPhone||c.purchasingContact||x.purchasingContact],
    ['E-mail do responsável de compras',c.purchasingEmail||x.purchasingEmail],
    ['Balcão',c.branch||x.branch],['NIB',c.nib||x.nib],['Observações',c.notes],
    ['Ficha criada por',x.created_by_email||'Não registado'],['Data de criação',c.created_at?new Date(c.created_at).toLocaleString('pt-PT'):'']
  ];
}

function clientPrintHTML(c) {
  const fields=clientFields(c);
  const logo=typeof LOGO_DM!=='undefined'?LOGO_DM:'';
  return `<!doctype html><html lang="pt-PT"><head><meta charset="utf-8"><title>Ficha de cliente - ${esc(c.name||'')}</title>
  <style>@page{size:A4 portrait;margin:7mm}*{box-sizing:border-box}html,body{margin:0;padding:0}body{font:8px Arial;color:#1f2933}header{display:flex;align-items:center;gap:12px;border-bottom:2px solid #1677b8;padding:0 0 5px}header img{width:92px;height:34px;object-fit:contain}header h1{margin:0 0 2px;font-size:15px;color:#102a43}header p{margin:1px 0}h2{font-size:9px;margin:6px 0 2px;border-bottom:1px solid #ddd;padding-bottom:2px}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1px 7px}.field{border-bottom:1px solid #e5e7eb;padding:2px 3px;min-height:23px;break-inside:avoid}.label{color:#718096;font-size:6.5px;font-weight:bold;text-transform:uppercase}.value{margin-top:1px;min-height:8px;line-height:1.1;overflow-wrap:anywhere;white-space:pre-wrap}.sign{display:grid;grid-template-columns:1fr 1fr;gap:32px;margin-top:3px;break-inside:avoid}.line{border-top:1px solid #555;padding-top:2px;margin-top:15px}.print-help{padding:6px;background:#edf3f7;margin-bottom:6px;font-size:10px}@media print{.print-help{display:none}body{width:100%;height:auto}}</style></head><body>
  <div class="print-help"><button onclick="window.print()">Imprimir / Guardar como PDF</button> <button onclick="window.close()">Fechar</button> Pré-visualize primeiro e só depois escolha imprimir ou guardar.</div>
  <header>${logo?`<img src="${logo}" alt="Domingos &amp; Morgado">`:''}<div><h1>Ficha de cliente</h1><strong>Domingos &amp; Morgado</strong><p>${new Date().toLocaleDateString('pt-PT')}</p></div></header>
  <h2>Dados do cliente</h2><div class="grid">${fields.map(([label,value])=>`<div class="field"><div class="label">${esc(label)}</div><div class="value">${esc(value||'—')}</div></div>`).join('')}</div>
  <h2>Aprovações</h2><div class="sign"><div class="line">Assinatura do cliente</div><div class="line">Aprovação da Direção / Gerência</div></div>
  </body></html>`;
}
function openClientPrint(c) {
  if(typeof openPrintPreview==='function')return openPrintPreview(clientPrintHTML(c),'Ficha de cliente');
  alert('A pré-visualização ainda não está disponível. Atualize a página e tente novamente.');
}
function printClient() { const form=document.querySelector('#client-form');if(form)openClientPrint(Object.fromEntries(new FormData(form))); }
function printSavedClient(id,source=state.clientSource) {
  const list=source==='crm_clients_import'?state.importedClients:state.clients;
  const client=list.find(c=>String(c.id)===String(id));if(client)openClientPrint(client);
}
function viewClient(id) {
  const c=selectedClients().find(c=>String(c.id)===String(id));if(!c)return;
  document.querySelector('#client-sheet')?.remove();const dialog=document.createElement('dialog');dialog.id='client-sheet';dialog.className='client-sheet';
  dialog.innerHTML=`<div class="sheet-actions"><h2>Ficha de cliente</h2><div><button class="secondary" onclick="printSavedClient('${esc(c.id)}')">Guardar PDF</button> <button class="secondary" onclick="document.querySelector('#client-sheet').close()">Fechar</button></div></div>
    <p>Base: ${esc(state.clientSource)} · Consulta</p><dl>${clientFields(c).map(([label,value])=>`<div><dt>${esc(label)}</dt><dd>${esc(value||'—')}</dd></div>`).join('')}</dl>`;
  dialog.addEventListener('close',()=>dialog.remove());document.body.append(dialog);dialog.showModal();
}

function clientPayload(c) {
  const fields=['address','postal','locality','activity','cae','bank','paymentTerms','paymentMethod','mobile','contact','contactPhone','contactEmail','branch','nib','district','municipality','clientGroup','associate','financialResponsible','financialPhone','financialEmail','purchasingResponsible','purchasingPhone','purchasingEmail'];
  return {name:c.name.trim(),nif:c.nif.trim(),phone:c.phone.trim(),email:c.email.trim(),district:c.district||'',owner_name:c.seller||'',notes:c.notes||'',active:true,
    extra_fields:{...Object.fromEntries(fields.map(k=>[k,c[k]||''])),created_by_email:state.user?.email||''}};
}
saveClient = async function(e) {
  e.preventDefault();if(state.savingClient)return;const form=e.currentTarget;if(!form.reportValidity())return;
  const c=Object.fromEntries(new FormData(form));const message=document.querySelector('#client-save-message');const button=document.querySelector('#client-save');
  try {
    if(!supabaseClient)throw Error('Sem ligação ao Supabase. A ficha não foi guardada.');
    if(state.clients.some(x=>String(x.nif||'').trim()===c.nif.trim()))throw Error('Já existe um cliente no CRM com este NIF.');
    state.savingClient=true;button.disabled=true;message.textContent='A guardar a ficha no CRM...';
    const payload=clientPayload(c);const {data,error}=await supabaseClient.from('crm_clients').insert(payload).select().single();
    if(error)throw Error(error.message);if(!data?.id)throw Error('Não foi possível confirmar a gravação.');
    state.clients.push({...data,...c,id:data.id,status:'Ativo',extra_fields:data.extra_fields||payload.extra_fields});
    state.clients.sort((a,b)=>a.name.localeCompare(b.name,'pt'));state.clientSource='crm_clients';
    state.clientLoadMessage='Ficha guardada no CRM. CRM: '+state.clients.length+' · Importados: '+state.importedClients.length;
    state.view='clients';render();viewClient(data.id);
  } catch(error) {message.textContent='Não foi possível guardar: '+error.message;}
  finally {state.savingClient=false;button.disabled=false;}
};

function clientTablePage(list,page=1) {
  if(!list.length)return `<div class="empty"><h3>Nenhum cliente encontrado</h3><p>Altere os filtros ou crie uma nova ficha.</p></div>`;
  const pages=Math.ceil(list.length/CLIENT_PAGE_SIZE);page=Math.min(Math.max(page,1),pages);state.clientPage=page;
  const rows=list.slice((page-1)*CLIENT_PAGE_SIZE,page*CLIENT_PAGE_SIZE);
  return `<p class="result-count">${list.length} cliente(s) · página ${page} de ${pages}</p><div class="table-wrap"><table><thead><tr><th>Cliente</th><th>NIF</th><th>Localidade</th><th>Telefone</th><th>Estado</th><th></th></tr></thead><tbody>
  ${rows.map(c=>`<tr><td><strong>${esc(c.name)}</strong><small>${esc(c.number||'')}</small></td><td>${esc(c.nif)}</td><td>${esc(c.locality||c.extra_fields?.locality||'')}</td><td>${esc(c.phone)}</td><td><span class="pill ${c.status==='Inativo'?'':'green'}">${c.status==='Inativo'?'Inativo':'Ativo'}</span></td><td><button class="secondary" onclick="viewClient('${esc(c.id)}')">Consultar</button> ${typeof isCommercial==='function'&&isCommercial()?`<button class="secondary" onclick="toggleClientStatus('${esc(c.id)}')">${c.status==='Inativo'?'Ativar':'Inativar'}</button>`:''}</td></tr>`).join('')}</tbody></table></div>
  ${pages>1?`<div class="pagination"><button class="secondary" onclick="changeClientPage(-1)" ${page===1?'disabled':''}>Anterior</button><span>${page} / ${pages}</span><button class="secondary" onclick="changeClientPage(1)" ${page===pages?'disabled':''}>Seguinte</button></div>`:''}`;
}
function changeClientPage(delta) { state.clientPage=(state.clientPage||1)+delta;document.querySelector('#client-table').innerHTML=clientTablePage(state.filteredClients||[],state.clientPage); }
clients=function(){
  const list=selectedClients().filter(c=>c.status!=='Inativo');state.filteredClients=list;state.clientPage=1;
  const groups=[...new Set([...CLIENT_GROUPS,...selectedClients().map(c=>c.clientGroup||c.extra_fields?.clientGroup).filter(Boolean)])].sort((a,b)=>a.localeCompare(b,'pt'));
  const associates=[...new Set([...CLIENT_ASSOCIATES,...selectedClients().map(c=>c.associate||c.extra_fields?.associate).filter(Boolean)])].sort((a,b)=>a.localeCompare(b,'pt'));
  return `<section class="page"><div class="page-head"><div><div class="eyebrow">BASE DE DADOS</div><h1>Clientes</h1><p class="muted">Resultados paginados para evitar listas demasiado compridas.</p></div><button class="primary" data-action="new-client">+ Novo cliente</button></div>
  <div class="toolbar"><label>Base de clientes<select id="client-source"><option value="crm_clients" ${state.clientSource==='crm_clients'?'selected':''}>CRM</option><option value="crm_clients_import" ${state.clientSource==='crm_clients_import'?'selected':''}>Clientes importados</option></select></label>
  <input id="client-search" placeholder="Pesquisar por nome, NIF ou telefone..."><select id="district-filter"><option value="">Todos os distritos e regiões</option>${Object.keys(window.PORTUGAL_LOCATIONS||{}).map(d=>`<option value="${esc(d)}">${esc(d)}</option>`).join('')}</select>
  <select id="client-group-filter" aria-label="Filtrar por grupo" onchange="runClientFilters()"><option value="">Todos os grupos</option>${groups.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('')}</select>
  <select id="client-associate-filter" aria-label="Filtrar por associado" onchange="runClientFilters()"><option value="">Todos os associados</option>${associates.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('')}</select>
  <select id="client-status-filter"><option value="active">Ativos</option><option value="inactive">Inativos</option><option value="all">Todos</option></select></div><div id="client-table">${clientTablePage(list)}</div></section>`;
};
function runClientFilters(){
  filterClients(document.querySelector('#client-search')?.value||'',document.querySelector('#district-filter')?.value||'',document.querySelector('#client-status-filter')?.value||'active');
}
filterClients=function(q,district='',status='active'){
  const term=String(q||'').toLocaleLowerCase('pt');
  const group=document.querySelector('#client-group-filter')?.value||'';
  const associate=document.querySelector('#client-associate-filter')?.value||'';
  state.filteredClients=selectedClients().filter(c=>[c.name,c.nif,c.phone,c.mobile,c.number].some(v=>String(v||'').toLocaleLowerCase('pt').includes(term))&&(!district||(c.district||c.extra_fields?.district||'')===district)&&(!group||(c.clientGroup||c.extra_fields?.clientGroup||'')===group)&&(!associate||(c.associate||c.extra_fields?.associate||'')===associate)&&(status==='all'||(status==='inactive'?c.status==='Inativo':c.status!=='Inativo')));
  state.clientPage=1;document.querySelector('#client-table').innerHTML=clientTablePage(state.filteredClients,1);
};
