const historyState={rows:[],error:'',loading:false,version:0,filters:{type:'',user:'',query:'',from:'',to:''}};
const historyEmails=['comercial@domingos-morgado.pt','r.ferreira@domingos-morgado.pt','j.rebelo@domingos-morgado.pt','sandro.loureiro@domingos-morgado.pt'];
function historyDate(value) {
  if(!value)return '';
  return new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Lisbon',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(value));
}
function historyClientRecord(row) {
  return state.clients.find(client=>String(client.id)===String(row.record_id));
}
function historyRecordType(row) {
  if(row.source_table==='orders')return 'orders';
  if(row.source_table!=='crm_clients')return row.source_table;
  const record=historyClientRecord(row);
  const submittedVia=row.submitted_via||record?.extra_fields?.submitted_via||'';
  return submittedVia==='client_form_link'?'client_form':'crm_opening';
}
function historyTypeLabel(row) {
  const type=row.history_type||historyRecordType(row);
  return type==='orders'?'Encomenda':type==='client_form'?'Ficha de cliente':'Abertura no CRM';
}
function normalizeHistoryRow(row) {
  const record=historyClientRecord(row);
  return {...row,history_type:historyRecordType(row),actor_email:row.actor_email||record?.extra_fields?.created_by_email||''};
}
function filteredHistory(rows,filters) {
  const term=filters.query.trim().toLocaleLowerCase('pt');
  return rows.filter(row=>
    (!filters.type||(row.history_type||historyRecordType(row))===filters.type)&&
    (!filters.user||(filters.user==='unknown'?!row.actor_email:row.actor_email===filters.user))&&
    (!term||String(row.record_name).toLocaleLowerCase('pt').includes(term))&&
    (!filters.from||(historyDate(row.created_at)&&historyDate(row.created_at)>=filters.from))&&
    (!filters.to||(historyDate(row.created_at)&&historyDate(row.created_at)<=filters.to))
  ).sort((a,b)=>String(b.created_at||'').localeCompare(String(a.created_at||'')));
}
function historyView() {
  const f=historyState.filters;
  return `<section class="page"><h1>Histórico</h1><p>Fichas enviadas pelos clientes e encomendas. Cada utilizador vê os seus registos; a conta comercial vê todos.</p>
  <button class="secondary" onclick="loadHistory()">Atualizar histórico</button>
  <p role="status">${esc(historyState.loading?'A carregar...':historyState.error)}</p>
  <div class="toolbar"><label>Tipo<select onchange="setHistoryFilter('type',this.value)"><option value="">Todos</option><option value="client_form" ${f.type==='client_form'?'selected':''}>Fichas de clientes</option><option value="orders" ${f.type==='orders'?'selected':''}>Encomendas</option></select></label>
  <label>Utilizador<select onchange="setHistoryFilter('user',this.value)"><option value="">Todos os disponíveis</option>
  ${[...new Set([...historyEmails,...historyState.rows.map(r=>r.actor_email).filter(Boolean)])].map(email=>`<option value="${esc(email)}" ${f.user===email?'selected':''}>${esc(email)}</option>`).join('')}
  <option value="unknown" ${f.user==='unknown'?'selected':''}>Autor não registado</option></select></label>
  <label>Desde<input type="date" value="${esc(f.from)}" onchange="setHistoryFilter('from',this.value)"></label>
  <label>Até<input type="date" value="${esc(f.to)}" onchange="setHistoryFilter('to',this.value)"></label></div>
  <input aria-label="Pesquisar histórico" placeholder="Nome do cliente ou número da encomenda" value="${esc(f.query)}" oninput="setHistoryFilter('query',this.value)">
  <div id="history-results">${historyResults()}</div></section>`;
}
function historyResults() {
  const rows=filteredHistory(historyState.rows,historyState.filters);
  if(!rows.length)return '<p>Nenhum registo disponível para estes filtros.</p>';
  return `<p>${rows.length} registo(s)</p><div class="table-wrap"><table><thead><tr><th>Data</th><th>Tipo</th><th>Registo</th><th>Autor</th><th></th></tr></thead><tbody>
  ${rows.map(r=>`<tr><td>${r.created_at?esc(new Date(r.created_at).toLocaleString('pt-PT',{timeZone:'Europe/Lisbon'})):'Data não registada'}</td>
  <td>${historyTypeLabel(r)}</td><td>${esc(r.record_name)}${r.legacy?'<small>Registo anterior à ativação do histórico</small>':''}</td>
  <td>${esc(r.actor_email||'Autor não registado')}</td><td><button class="secondary" data-history-record="${esc(r.id)}">Consultar</button></td></tr>`).join('')}
  </tbody></table></div>`;
}
function setHistoryFilter(key,value) {
  historyState.filters[key]=value;
  const results=document.querySelector('#history-results');
  if(results)results.innerHTML=historyResults();
}
async function loadHistory() {
  const version=++historyState.version;
  historyState.loading=true;historyState.error='';historyState.rows=[];
  if(state.view==='history')render();
  try {
    const rows=await readAllRows('dm_record_history');
    if(version!==historyState.version)return;
    historyState.rows=rows.map(normalizeHistoryRow).filter(row=>row.history_type!=='crm_opening');
  } catch(error) {
    if(version!==historyState.version)return;
    historyState.error='Não foi possível ler o histórico. Execute historico.sql no Supabase e tente novamente. Detalhe: '+error.message;
  } finally {
    if(version===historyState.version){historyState.loading=false;if(state.view==='history')render();}
  }
}
function openHistory() {
  state.view='history';
  historyState.filters={type:'',user:'',query:'',from:'',to:''};
  loadHistory();
}
async function viewHistoryRecord(id) {
  const event=historyState.rows.find(r=>r.id===id);
  if(!event||!['crm_clients','orders'].includes(event.source_table))return;
  try {
    const {data,error}=await supabaseClient.from(event.source_table).select('*').eq('id',event.record_id).single();
    if(error||!data)throw Error(error?.message||'Registo indisponível.');
    document.body.classList.remove('mobile-menu-open','order-wide-mode');
    document.querySelector('.mobile-menu-button')?.setAttribute('aria-expanded','false');
    document.querySelector('#history-detail')?.remove();
    const dialog=document.createElement('dialog');
    dialog.id='history-detail';dialog.className='client-sheet';
    const fields=event.source_table==='crm_clients'?clientFields(data):[
      ['Número',data.number],['Cliente',data.client_name],['Estado',data.status],
      ['Total',eur(data.total)],['Entrega',data.delivery],['Condições de pagamento',data.payment_terms],
      ['Meio de pagamento',data.document?.paymentMethod],['Observações',data.notes]
    ];
    dialog.innerHTML=`<div class="sheet-actions"><h2>${esc(event.record_name)}</h2><button onclick="document.querySelector('#history-detail').close()">Fechar</button></div>
    <p>Tipo: ${historyTypeLabel(event)} · Autor: ${esc(event.actor_email||'Autor não registado')}</p>
    <dl>${fields.map(([label,value])=>`<div><dt>${esc(label)}</dt><dd>${esc(value??'—')}</dd></div>`).join('')}</dl>`;
    const pdf=document.createElement('button');pdf.textContent='Visualizar / guardar PDF';pdf.className='secondary';
    if(event.source_table==='orders'&&data.document?.lines?.length){
      const order=normalizeOrder(data);
      const details=document.createElement('div');
      details.innerHTML=`<h3>Artigos</h3><table><thead><tr><th>Código</th><th>Descrição</th><th>Qtd.</th><th>Preço</th></tr></thead><tbody>${order.lines.map(l=>`<tr><td>${esc(l.code)}</td><td>${esc(l.description)}</td><td>${esc(l.qty)}</td><td>${eur(l.price)}</td></tr>`).join('')}</tbody></table>`;
      dialog.append(details);
      pdf.onclick=()=>openOrderPrint(order);
    } else if(event.source_table==='crm_clients'&&event.history_type==='client_form') {
      pdf.onclick=()=>openClientPrint(data);
    }
    if(pdf.onclick)dialog.append(pdf);
    dialog.addEventListener('close',()=>{dialog.remove();document.body.classList.remove('mobile-menu-open','order-wide-mode');});
    document.body.append(dialog);dialog.showModal();
  } catch(error) {alert('Não foi possível consultar o registo: '+error.message);}
}
document.addEventListener('click',e=>{
  const button=e.target.closest('[data-history-record]');
  if(button)viewHistoryRecord(button.dataset.historyRecord);
});
supabaseClient?.auth.onAuthStateChange(()=>{
  ++historyState.version;historyState.rows=[];historyState.error='';historyState.loading=false;
  document.querySelector('#history-detail')?.remove();
  if(state.view==='history')setTimeout(()=>{if(state.view==='history')loadHistory();},0);
});
