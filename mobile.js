(() => {
  let installPrompt=null;
  const tools=document.createElement('div');tools.className='mobile-tools';
  tools.innerHTML='<button type="button" class="secondary mobile-menu-button" aria-expanded="false" aria-controls="mobile-navigation">☰ Menu</button><button type="button" class="secondary" id="install-mobile">Instalar no telemóvel</button>';
  document.querySelector('#app-header').after(tools);
  const sidebar=document.querySelector('.sidebar');sidebar.id='mobile-navigation';
  const menu=tools.querySelector('.mobile-menu-button');
  function closeMenu(){document.body.classList.remove('mobile-menu-open');menu.setAttribute('aria-expanded','false');}
  window.resetAppMenus=()=>{closeMenu();document.body.classList.remove('order-wide-mode');};
  menu.onclick=()=>{const open=document.body.classList.toggle('mobile-menu-open');menu.setAttribute('aria-expanded',String(open));};
  sidebar.addEventListener('click',e=>{if(e.target.closest('.nav')){closeMenu();window.scrollTo({top:0,behavior:'smooth'});}});
  document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMenu();});
  window.addEventListener('pageshow',closeMenu);
  window.addEventListener('focus',closeMenu);
  const notice=document.createElement('p');notice.className='connection-notice';notice.setAttribute('role','status');
  tools.after(notice);
  function connection(){notice.hidden=navigator.onLine;notice.textContent='Sem ligação à Internet. Não é possível carregar ou guardar no Supabase. Os dados que escrever não são guardados automaticamente.';}
  window.addEventListener('online',connection);window.addEventListener('offline',connection);connection();
  const button=tools.querySelector('#install-mobile');
  const standalone=()=>window.matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
  button.hidden=standalone();
  window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;button.hidden=false;});
  window.addEventListener('appinstalled',()=>{installPrompt=null;button.hidden=true;});
  button.onclick=async()=>{
    if(installPrompt){const prompt=installPrompt;installPrompt=null;await prompt.prompt();await prompt.userChoice;return;}
    const dialog=document.createElement('dialog');dialog.className='install-dialog';
    dialog.innerHTML='<h2>DM no seu telemóvel</h2><p><strong>Android:</strong> abra o endereço HTTPS no Chrome. No menu ⋮, escolha “Instalar aplicação” ou “Adicionar ao ecrã principal”.</p><p><strong>iPhone:</strong> abra no Safari, toque em Partilhar e depois “Adicionar ao ecrã principal”.</p><p>A aplicação necessita de Internet. A instalação fica disponível após publicar os ficheiros num endereço HTTPS, não ao abrir o ZIP.</p><button class="primary" type="button">Fechar</button>';
    dialog.querySelector('button').onclick=()=>dialog.close();dialog.addEventListener('close',()=>dialog.remove());document.body.append(dialog);dialog.showModal();
  };
  supabaseClient?.auth.onAuthStateChange((_event,session)=>{menu.hidden=!session;closeMenu();});
  // No caching of API responses, forms, HTML, scripts or personal data.
  if('serviceWorker' in navigator&&location.protocol==='https:'){
    navigator.serviceWorker.register('./sw.js',{scope:'./'}).catch(()=>{button.title='Instalação indisponível. Pode continuar a usar no navegador.';});
  }
})();
