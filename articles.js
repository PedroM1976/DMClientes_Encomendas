const originalArticlesView = articles;
function unitPriceLabel(value){return value==null||value===''?'Preço por indicar':new Intl.NumberFormat('pt-PT',{style:'currency',currency:'EUR',minimumFractionDigits:2,maximumFractionDigits:3}).format(Number(value));}
articles = function() {
  return originalArticlesView()
    .replace('name="price" type="number" min="0" step="0.01"','name="price" type="number" min="0" step="0.001"')
    .replace(/<select name="vat">[\s\S]*?<\/select>/, '<select name="vat" aria-label="IVA do artigo"><option value="23">IVA 23%</option><option value="0">Isento de IVA</option></select>')
    .replace('Preço unitário *', 'Preço unitário sem IVA *');
};
function articleMatches(query) {
  const normalize=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const terms=normalize(query).trim().split(/\s+/).filter(Boolean);
  return state.articles.filter(a=>a.active!==false && terms.every(t=>normalize(a.code+' '+a.description).includes(t)));
}
function articleSearchResults(query) {
  if(!query.trim())return '<p>Escreva parte do código ou da descrição para pesquisar.</p>';
  const matches=articleMatches(query);
  if(!matches.length)return '<p role="status">Nenhum artigo encontrado.</p>';
return `<p role="status">${matches.length} artigo(s) encontrado(s)</p><div class="article-results"><table><thead><tr><th>Código</th><th>Descrição</th><th>Preço</th><th></th></tr></thead><tbody>${matches.map(a=>`<tr><td>${esc(a.code)}</td><td>${esc(a.description)}</td><td>${unitPriceLabel(a.price)}</td><td><button type="button" class="secondary" data-add-article="${esc(a.id)}">Adicionar</button></td></tr>`).join('')}</tbody></table></div>`;
}
function searchOrderArticles(query) {
  state.articleQuery=query;
  document.querySelector('#order-article-results').innerHTML=articleSearchResults(query);
}
document.addEventListener('click',e=>{
  const button=e.target.closest('[data-add-article]');
  if(button)addOrderLine({target:{value:button.dataset.addArticle}});
});
saveArticle = async function(e) {
  e.preventDefault();
  if(state.savingArticle)return;
  const form=e.currentTarget;
  if(!form.reportValidity())return;
  let notice=form.querySelector('[role="status"]');
  if(!notice){notice=document.createElement('p');notice.setAttribute('role','status');form.append(notice);}
  const button=form.querySelector('button[type="submit"], button.primary');
  try {
    const raw=Object.fromEntries(new FormData(form));
    const a={code:raw.code.trim(),description:raw.description.trim(),brand:raw.brand.trim(),category:raw.category.trim(),
      price:Number(raw.price),vat:Number(raw.vat),unit:raw.unit.trim()||'UN',active:true};
    if(!a.code||!a.description||!Number.isFinite(a.price)||a.price<0||!Number.isFinite(a.vat)||a.vat<0||a.vat>100)
      throw Error('Verifique o código, a descrição, o preço e o IVA.');
    if(state.articles.some(x=>String(x.code).trim().toLowerCase()===a.code.toLowerCase()))
      throw Error('Já existe um artigo com este código.');
    if(!supabaseClient)throw Error('Sem ligação ao Supabase.');
    state.savingArticle=true;if(button)button.disabled=true;notice.textContent='A guardar...';
    const {data,error}=await supabaseClient.from('articles').insert(a).select().single();
    if(error)throw Error(error.message);
    if(!data?.id)throw Error('Não foi possível confirmar a gravação.');
    state.articles.push(data);
    state.articles.sort((a,b)=>String(a.code).localeCompare(String(b.code),'pt'));
    form.reset();
    notice.textContent='Artigo guardado no Supabase. Já pode adicioná-lo à encomenda.';
    document.querySelector('#article-table').innerHTML=articleTable(state.articles);
  } catch(error) {notice.textContent='Não foi possível guardar: '+error.message;}
  finally {state.savingArticle=false;if(button)button.disabled=false;}
};
