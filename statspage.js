fetch('/api/ping',{method:'POST',body:'{}'}).then(r=>r.json()).then(d=>{t.textContent=d.total;o.textContent=d.online;y.textContent=d.yes;n.textContent=d.no}).catch(()=>{t.textContent='n/a'})
