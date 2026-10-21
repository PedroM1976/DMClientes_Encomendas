const originalClientForm = newClient;
newClient = function() {
  return originalClientForm()
    .replace('page narrow','page client-page')
    .replace('Fax *<input name="fax" required','Fax<input name="fax"')
    .replace('Actividade<input name="activity"','Actividade *<input name="activity" required')
    .replace('<input name="paymentTerms" required />', businessSelect('paymentTerms',['30 DIAS','30 DIAS DATA FATURA','PP'],'',true))
    .replace('<input name="paymentMethod" required />', businessSelect('paymentMethod',['CHEQUE','NUMERÁRIO','TRANSFERÊNCIA BANCÁRIA'],'',true))
    .replace('<input name="seller" />', businessSelect('seller',['RUI FERREIRA','JOÃO REBELO','SANDRO LOUREIRO','DM']))
    .replace('Guardar rascunho</button>','Guardar rascunho neste computador</button>')
    .replace('<button class="primary">Guardar cliente</button>',
      '<p id="client-save-message" role="status"></p><button class="primary" id="client-save">Guardar cliente no CRM</button>');
};
const originalClientTable = clientTable;
clientTable = function(list) {
  return originalClientTable(list).replace(/<button class="secondary" onclick="toggleClientStatus\('([^']+)'\)">/g,
    (_,id)=>`<button class="secondary" onclick="viewClient('${id}')">Consultar ficha</button> <button class="secondary" onclick="toggleClientStatus('${id}')">`);
};
function clientFields(c) {
  const x=c.extra_fields||{};
  return [
    ['Firma / nome',c.name],['NIF',c.nif],['Estado',c.status|| (c.active===false?'Inativo':'Ativo')],
    ['Morada',c.address||x.address],['Código postal',c.postal||x.postal],['Localidade',c.locality||x.locality],
    ['Distrito',c.district||x.district],['Telefone',c.phone],['Fax',c.fax||x.fax],['E-mail',c.email],
    ['Actividade',c.activity||x.activity],['CAE',c.cae||x.cae],['Banco',c.bank||x.bank],
    ['Condições de pagamento',c.payment_terms||c.paymentTerms||x.paymentTerms],
    ['Meio de pagamento',c.payment_method||c.paymentMethod||x.paymentMethod],
    ['Vendedor',c.owner_name||c.seller||x.seller],['Telemóvel',c.mobile||x.mobile],
    ['Contacto',c.contact||x.contact],['Telefone do contacto',c.contact_phone||c.contactPhone||x.contactPhone],
    ['Balcão',c.branch||x.branch],['NIB',c.nib||x.nib],['Observações',c.notes],
    ['Ficha criada por',x.created_by_email||'Não registado'],['Data de criação',c.created_at?new Date(c.created_at).toLocaleString('pt-PT'):'']
  ];
}
function viewClient(id) {
  const c=selectedClients().find(c=>c.id===id);
  if(!c)return;
  document.querySelector('#client-sheet')?.remove();
  const dialog=document.createElement('dialog');
  dialog.id='client-sheet';dialog.className='client-sheet';
  dialog.innerHTML=`<div class="sheet-actions"><h2>Ficha de cliente</h2><button class="secondary" onclick="document.querySelector('#client-sheet').close()">Fechar</button></div>
    <p>Base: ${esc(state.clientSource)} · Consulta</p><dl>${clientFields(c).map(([label,value])=>`<div><dt>${esc(label)}</dt><dd>${esc(value||'—')}</dd></div>`).join('')}</dl>`;
  dialog.addEventListener('close',()=>dialog.remove());
  document.body.append(dialog);
  dialog.showModal();
}
function clientPayload(c) {
  const fields=['address','postal','locality','fax','activity','cae','bank','paymentTerms','paymentMethod','mobile','contact','contactPhone','branch','nib','district'];
  return {name:c.name.trim(),nif:c.nif.trim(),phone:c.phone.trim(),email:c.email.trim(),
    district:c.district||'',owner_name:c.seller||'',notes:c.notes||'',active:true,
    extra_fields:{...Object.fromEntries(fields.map(k=>[k,c[k]||''])),created_by_email:state.user?.email||''}};
}
saveClient = async function(e) {
  e.preventDefault();
  if(state.savingClient)return;
  const form=e.currentTarget;
  if(!form.reportValidity())return;
  const c=Object.fromEntries(new FormData(form));
  const message=document.querySelector('#client-save-message');
  const button=document.querySelector('#client-save');
  try {
    if(!supabaseClient)throw Error('Sem ligação ao Supabase. A ficha não foi guardada.');
    if(state.clients.some(x=>String(x.nif||'').trim()===c.nif.trim()))throw Error('Já existe um cliente no CRM com este NIF.');
    state.savingClient=true;button.disabled=true;message.textContent='A guardar a ficha no CRM...';
    const {data,error}=await supabaseClient.from('crm_clients').insert(clientPayload(c)).select().single();
    if(error)throw Error(error.message);
    if(!data?.id)throw Error('Não foi possível confirmar a gravação.');
    state.clients.push({...data,...c,id:data.id,status:'Ativo',extra_fields:data.extra_fields||clientPayload(c).extra_fields});
    state.clients.sort((a,b)=>a.name.localeCompare(b.name,'pt'));
    state.clientSource='crm_clients';
    state.clientLoadMessage='Ficha guardada no CRM. CRM: '+state.clients.length+' · Importados: '+state.importedClients.length;
    state.view='clients';render();viewClient(data.id);
  } catch(error) {message.textContent='Não foi possível guardar: '+error.message;}
  finally {state.savingClient=false;button.disabled=false;}
};
