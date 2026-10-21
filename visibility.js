let commercialSession=false;
function isCommercial(){return commercialSession;}
function clientIsInactive(c){return c.active===false||c.status==='Inativo'||inactiveValue(c.inactive);}
const baseSelectedClients=selectedClients;
selectedClients=function(){return baseSelectedClients().filter(c=>isCommercial()||!clientIsInactive(c));};
const baseClientsView=clients;
clients=function(){
  const html=baseClientsView();
  return isCommercial()?html:html.replace(/<select id="client-status-filter">[\s\S]*?<\/select>/,'').replace('Clientes ativos aparecem por defeito. Use os filtros para consultar inativos.','Clientes ativos disponíveis para consulta.');
};
const baseClientTable=clientTable;
clientTable=function(list){
  const html=baseClientTable(list.filter(c=>isCommercial()||!clientIsInactive(c)));
  return isCommercial()?html:html.replace(/<button class="secondary" onclick="toggleClientStatus\('[^']+'\)">[^<]*<\/button>/g,'');
};
const baseToggleClientStatus=toggleClientStatus;
toggleClientStatus=async function(id){if(!isCommercial())return alert('Só a conta comercial pode alterar o estado.');return baseToggleClientStatus(id);};
state.articleStatusFilter='active';
function visibleArticles(list){
  return list.filter(a=>isCommercial()?(state.articleStatusFilter==='all'||(state.articleStatusFilter==='inactive'?a.active===false:a.active!==false)):a.active!==false);
}
const baseArticlesView=articles;
articles=function(){return baseArticlesView().replace('<div id="article-table">',`${isCommercial()?'<label>Estado<select onchange="state.articleStatusFilter=this.value;filterArticles(document.querySelector(\'#article-search\').value)"><option value="active" '+(state.articleStatusFilter==='active'?'selected':'')+'>Ativos</option><option value="inactive" '+(state.articleStatusFilter==='inactive'?'selected':'')+'>Inativos</option><option value="all" '+(state.articleStatusFilter==='all'?'selected':'')+'>Todos</option></select></label>':''}<div id="article-table">`);};
articleTable=function(list){
  const rows=visibleArticles(list);
  if(!rows.length)return '<p class="empty">Nenhum artigo disponível para estes filtros.</p>';
  return `<div class="table-wrap"><table><thead><tr><th>Código</th><th>Descrição</th><th>Categoria</th><th>Preço</th><th>IVA</th><th>Estado</th><th></th></tr></thead><tbody>${rows.map(a=>`<tr><td>${esc(a.code)}</td><td>${esc(a.description)}</td><td><input aria-label="Categoria de ${esc(a.code)}" id="category-${esc(a.id)}" value="${esc(a.category||'')}" placeholder="Categoria"><button type="button" data-save-category="${esc(a.id)}">Guardar categoria</button></td><td>${unitPriceLabel(a.price)}</td><td>${Number(a.vat)===0?'Isento':esc(a.vat)+'%'}</td><td>${a.active===false?'Inativo':'Ativo'}</td><td>${isCommercial()?`<button class="secondary" data-article-status="${esc(a.id)}">${a.active===false?'Ativar':'Inativar'}</button>`:''}</td></tr>`).join('')}</tbody></table></div>`;
};
async function toggleArticleStatus(id){
  if(!isCommercial())return alert('Só a conta comercial pode alterar o estado dos artigos.');
  const a=state.articles.find(a=>a.id===id);if(!a||a.savingStatus)return;
  a.savingStatus=true;
  try{
    const active=a.active===false;
    const {data,error}=await supabaseClient.from('articles').update({active}).eq('id',id).select('id,active').single();
    if(error||!data)throw Error(error?.message||'Não foi possível confirmar a alteração.');
    a.active=data.active;
    filterArticles(document.querySelector('#article-search')?.value||'');
  }catch(e){alert('Não foi possível alterar: '+e.message);}finally{a.savingStatus=false;}
}
async function saveArticleCategory(id){
  const a=state.articles.find(a=>a.id===id);if(!a||(!isCommercial()&&a.active===false))return;
  const category=document.getElementById('category-'+id)?.value.trim();if(category===undefined)return;
  try{
    const {data,error}=await supabaseClient.from('articles').update({category}).eq('id',id).select('id,category').single();
    if(error||!data)throw Error(error?.message||'Não foi possível confirmar a alteração.');
    a.category=data.category;alert('Categoria guardada no Supabase.');
  }catch(e){alert('Não foi possível guardar a categoria: '+e.message);}
}
document.addEventListener('click',e=>{
  const status=e.target.closest('[data-article-status]');if(status)toggleArticleStatus(status.dataset.articleStatus);
  const category=e.target.closest('[data-save-category]');if(category)saveArticleCategory(category.dataset.saveCategory);
});
supabaseClient?.auth.onAuthStateChange((_event,session)=>{
  commercialSession=String(session?.user?.email||'').toLowerCase()==='comercial@domingos-morgado.pt';
  state.articleStatusFilter='active';
  if(!commercialSession){state.clients=state.clients.filter(c=>!clientIsInactive(c));state.importedClients=state.importedClients.filter(c=>!clientIsInactive(c));state.articles=state.articles.filter(a=>a.active!==false);}
  if(['clients','articles'].includes(state.view))setTimeout(()=>render(),0);
});
