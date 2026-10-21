// Intentionally network-only. No CacheStorage or offline data copies.
self.addEventListener('install',event=>event.waitUntil(self.skipWaiting()));
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('fetch',event=>{
  if(event.request.mode!=='navigate')return;
  event.respondWith(fetch(event.request).catch(()=>new Response(
    '<!doctype html><html lang="pt-PT"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>DM — Sem ligação</title><body style="font:18px system-ui;padding:32px;background:#f4f7fb;color:#172b4d"><h1>Sem ligação à Internet</h1><p>Ligue o Wi-Fi ou os dados móveis para abrir a Gestão Comercial.</p><p>Esta aplicação não guarda uma cópia offline dos dados.</p><button style="padding:16px;font:inherit" onclick="location.reload()">Tentar novamente</button></body></html>',
    {status:503,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}}
  )));
});
