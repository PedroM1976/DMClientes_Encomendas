const publicSupabase=window.supabase?.createClient(window.APP_CONFIG.supabaseUrl,window.APP_CONFIG.supabaseAnonKey);
const publicForm=document.querySelector('#public-client-form');
const publicFieldset=publicForm.querySelector('fieldset');
const linkStatus=document.querySelector('#link-status');
const publicToken=new URLSearchParams(location.search).get('token')||'';

document.querySelector('.public-client-logo').src=typeof LOGO_DM!=='undefined'?LOGO_DM:'';

function publicOptions(values,current=''){
  return `<option value="">Selecionar…</option>${values.map(value=>`<option value="${escapePublic(value)}" ${value===current?'selected':''}>${escapePublic(value)}</option>`).join('')}`;
}
function escapePublic(value=''){
  return String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
}
function fillDistricts(){
  const district=publicForm.elements.district;
  district.innerHTML=publicOptions(Object.keys(window.PORTUGAL_LOCATIONS||{}));
  district.addEventListener('change',()=>{
    const municipality=publicForm.elements.municipality;
    municipality.innerHTML=publicOptions((window.PORTUGAL_LOCATIONS||{})[district.value]||[]);
    municipality.disabled=!district.value;
  });
}
async function validatePublicLink(){
  fillDistricts();
  if(!publicSupabase||!/^[a-f0-9]{64}$/i.test(publicToken))return invalidLink('Este link não é válido. Peça um novo link à Domingos & Morgado.');
  try{
    const {data,error}=await publicSupabase.rpc('check_client_form_link',{p_token:publicToken});
    if(error)throw Error(error.message);
    if(!data?.valid)return invalidLink('Este link expirou ou já foi utilizado. Peça um novo link à Domingos & Morgado.');
    publicForm.hidden=false;publicFieldset.disabled=false;linkStatus.textContent='Link validado. Preencha os campos assinalados com * e envie a ficha.';
  }catch(error){invalidLink('Não foi possível validar o link. Tente novamente ou contacte a Domingos & Morgado.');}
}
function invalidLink(message){linkStatus.textContent=message;linkStatus.classList.add('error');publicForm.hidden=true;}

publicForm.addEventListener('submit',async event=>{
  event.preventDefault();if(!publicForm.reportValidity())return;
  const message=document.querySelector('#form-message');const button=document.querySelector('#submit-client-form');
  try{
    const values=Object.fromEntries(new FormData(publicForm));
    button.disabled=true;publicFieldset.disabled=true;message.textContent='A guardar a ficha…';
    const {data,error}=await publicSupabase.rpc('submit_client_form',{p_token:publicToken,p_form:values});
    if(error)throw Error(error.message);
    publicForm.hidden=true;linkStatus.classList.remove('error');linkStatus.classList.add('success');
    linkStatus.innerHTML='<strong>Ficha enviada com sucesso.</strong><br>Os dados ficaram registados. Já pode fechar esta página.';
    history.replaceState(null,'',location.pathname);
  }catch(error){message.textContent='Não foi possível enviar a ficha: '+error.message;publicFieldset.disabled=false;button.disabled=false;}
});

validatePublicLink();
