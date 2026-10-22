// Listas iniciais disponíveis mesmo antes da criação da tabela no Supabase.
window.DM_CLIENT_GROUPS = [
  'Cliente Comprador','Colisão','Geral','Distribuidor de Peças','Inativo',
  'Nova Distribuição','Oficina de Mecânica','Oficina de Elétrica','Pneus',
  'Stand Automóveis','Reparadores Autorizados','Station','Vulco'
];
window.DM_CLIENT_ASSOCIATES = [
  'A Oficina','BMW','ContiService','Empresa','Feu Vert','MForce','Pneuport','Points',
  'Roady','Stellantis Grupo','Serca','Vulco','Topcar','SEAT','Online','Norauto',
  'Independente','Eurorepar','Euromaster','Conforauto','Centers Auto','Euromais',
  'RedService','Midas','Bosch Car Service','Auto Check Center','Driver','First Stop','Ford'
];

state.clientOptionsMessage='';
state.clientOptionsReady=false;

function clientOptionArray(type){
  return type==='group'?window.DM_CLIENT_GROUPS:window.DM_CLIENT_ASSOCIATES;
}
function mergeClientOption(type,name){
  const list=clientOptionArray(type);
  if(!list.some(value=>value.localeCompare(name,'pt',{sensitivity:'base'})===0)){
    list.push(name);list.sort((a,b)=>a.localeCompare(b,'pt'));
  }
}
async function loadClientOptions(){
  if(!supabaseClient)return;
  const {data,error}=await supabaseClient.from('dm_client_options').select('option_type,name').order('name');
  if(error){
    state.clientOptionsReady=false;
    state.clientOptionsMessage='Para permitir novos valores, execute supabase-client-options.sql no Supabase.';
    return;
  }
  (data||[]).forEach(row=>mergeClientOption(row.option_type,row.name));
  state.clientOptionsReady=true;state.clientOptionsMessage='';
  if(['users','new-client'].includes(state.view))render();
}
function clientOptionsAdminPanel(){
  const groups=window.DM_CLIENT_GROUPS,associates=window.DM_CLIENT_ASSOCIATES;
  return `<div class="panel option-admin"><h2>Grupos de clientes e associados</h2>
  <p>Os novos valores ficam disponíveis nos filtros e na ficha de cliente.</p>
  <p id="client-options-message" role="status">${esc(state.clientOptionsMessage||'')}</p>
  <div class="form-grid">
    <form data-client-option-form="group"><label>Novo grupo de cliente<input name="name" required placeholder="Nome do grupo"></label><button class="primary">Acrescentar grupo</button></form>
    <form data-client-option-form="associate"><label>Novo associado<input name="name" required placeholder="Nome do associado"></label><button class="primary">Acrescentar associado</button></form>
  </div>
  <details><summary>Consultar valores disponíveis (${groups.length} grupos · ${associates.length} associados)</summary>
  <div class="option-lists"><div><h3>Grupos de cliente</h3><p>${groups.map(esc).join(' · ')}</p></div><div><h3>Associados</h3><p>${associates.map(esc).join(' · ')}</p></div></div></details></div>`;
}

const administrationBeforeClientOptions=administration;
administration=function(){
  const html=administrationBeforeClientOptions();
  if(typeof isCommercial!=='function'||!isCommercial())return html;
  return html.replace('</section>',clientOptionsAdminPanel()+'</section>');
};

async function addClientOption(type,name){
  const message=document.querySelector('#client-options-message');
  try{
    if(typeof isCommercial!=='function'||!isCommercial())throw Error('Apenas o utilizador comercial pode acrescentar valores.');
    name=String(name||'').trim().replace(/\s+/g,' ');
    if(!name)throw Error('Indique um nome.');
    if(clientOptionArray(type).some(value=>value.localeCompare(name,'pt',{sensitivity:'base'})===0))throw Error('Esse valor já existe.');
    if(!supabaseClient)throw Error('Sem ligação ao Supabase.');
    if(message)message.textContent='A guardar...';
    const {error}=await supabaseClient.from('dm_client_options').insert({option_type:type,name});
    if(error){
      const missing=['42P01','PGRST205'].includes(error.code)||/could not find.*dm_client_options|relation.*dm_client_options.*does not exist/i.test(error.message);
      throw Error(error.message+(missing?' Execute supabase-client-options.sql no editor SQL do Supabase.':''));
    }
    mergeClientOption(type,name);state.clientOptionsReady=true;state.clientOptionsMessage=`${type==='group'?'Grupo':'Associado'} acrescentado com sucesso.`;render();
  }catch(error){if(message)message.textContent='Não foi possível guardar: '+error.message;}
}

document.addEventListener('submit',event=>{
  const form=event.target.closest('[data-client-option-form]');
  if(!form)return;
  event.preventDefault();
  if(!form.reportValidity())return;
  addClientOption(form.dataset.clientOptionForm,new FormData(form).get('name'));
});

supabaseClient?.auth.onAuthStateChange((_event,session)=>{
  if(session)loadClientOptions();
  else {state.clientOptionsReady=false;state.clientOptionsMessage='';}
});
