// Interface restrictions complement the database policies, not replace them.
let permissionUserId=null;
const managedArticlesView=articles;
articles=function(){
  if(isCommercial())return managedArticlesView();
  return `<section class="page"><h1>Artigos</h1><p>Catálogo disponível para consulta e pesquisa nas encomendas.</p><div class="toolbar"><input id="article-search" placeholder="Pesquisar por código, descrição, marca ou categoria..."></div><div id="article-table">${articleTable(state.articles)}</div></section>`;
};
const managedArticleTable=articleTable;
articleTable=function(list){
  const html=managedArticleTable(list);
  if(isCommercial())return html;
  return html.replace(/<td><input aria-label="Categoria de [\s\S]*?<\/td>/g,match=>{
    const value=match.match(/ value="([^"]*)"/);
    return '<td>'+(value?value[1]:'')+'</td>';
  });
};
const managedSaveArticle=saveArticle;
saveArticle=async function(e){
  if(!isCommercial()){e?.preventDefault();return alert('Só a conta comercial pode inserir artigos.');}
  return managedSaveArticle(e);
};
const managedImportArticles=importArticles;
importArticles=function(e){
  if(!isCommercial())return alert('Só a conta comercial pode importar artigos.');
  return managedImportArticles(e);
};
const managedSaveCategory=saveArticleCategory;
saveArticleCategory=async function(id){
  if(!isCommercial())return alert('Só a conta comercial pode editar artigos.');
  return managedSaveCategory(id);
};
const managedAdministration=administration;
administration=function(){return isCommercial()?managedAdministration():'<section class="page"><h1>Administração</h1><p>Área reservada à conta comercial.</p></section>';};
function permittedHistory(rows){return isCommercial()?rows:rows.filter(r=>permissionUserId&&r.actor_id===permissionUserId);}
const managedHistoryFilter=filteredHistory;
filteredHistory=function(rows,filters){return managedHistoryFilter(permittedHistory(rows),filters);};
const managedHistoryView=historyView;
historyView=function(){
  const html=managedHistoryView();
  return isCommercial()?html:html.replace(/<label>Utilizador<select[\s\S]*?<\/select><\/label>/,'');
};
const managedViewHistory=viewHistoryRecord;
viewHistoryRecord=async function(id){
  if(!permittedHistory(historyState.rows).some(r=>r.id===id))return;
  return managedViewHistory(id);
};
supabaseClient?.auth.onAuthStateChange((_event,session)=>{
  permissionUserId=session?.user?.id||null;
  historyState.filters.user='';
  historyState.rows=permittedHistory(historyState.rows);
  const adminLink=document.querySelector('[data-view="users"]');
  if(adminLink)adminLink.hidden=!isCommercial();
  if(['articles','users','history'].includes(state.view))setTimeout(()=>render(),0);
});
