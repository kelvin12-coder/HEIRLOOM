/* OWNER SETTING: paste ONE YouTube/Audiomack/SoundCloud/Spotify link here. It plays for every new player automatically (they can change or stop it in Pause). Leave '' to use only the built-in radio. */
var DEFAULT_MUSIC='https://youtu.be/kbAxrwfLSsE https://youtu.be/WWkF5KUoTA4 https://youtu.be/kJHdj1wXwrE https://youtu.be/mERsEYKbRxM';
(function(){
  var LS=function(k,v){try{if(v===undefined)return localStorage.getItem(k);if(v===null)localStorage.removeItem(k);else localStorage.setItem(k,v)}catch(e){return null}};
  var id=LS('hl-id');if(!id){id=Array.from(crypto.getRandomValues(new Uint8Array(12))).map(function(b){return b.toString(16).padStart(2,'0')}).join('');LS('hl-id',id)}
  var prev=0,first=true;
  function say(t){try{if(window.__mode==='play'&&window.toast)toast(t)}catch(e){}}
  function post(url,body){return fetch(url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)}).then(function(r){return r.json().then(function(j){j.status=r.status;return j})})}
  function tick(){post('/api/ping',{id:id}).then(function(d){if(d.status!==200)return;
    window.__hl={online:d.online,total:d.total};
    if(d.n)setTimeout(function(){say(d.n===1?'🎉 You are the FIRST player of Heirloom!':'🎉 Welcome! You are player #'+d.n)},4000);
    if(!first&&d.total>prev){var k=d.total-prev;say('👋 '+k+' new player'+(k>1?'s':'')+' joined');if(Math.floor(d.total/100)>Math.floor(prev/100))say('🔥 Heirloom passed '+(Math.floor(d.total/100)*100)+' players!')}
    prev=d.total;first=false}).catch(function(){})}
  tick();setInterval(tick,45000);
  /* ---- cloud save ---- */
  function cloudSave(){var t=LS('hl-tok');if(!t)return;try{if(window.saveGame)saveGame()}catch(e){}var d=LS('heirloom-v5');if(d)post('/api/account',{act:'save',token:t,data:d}).catch(function(){})}
  setInterval(cloudSave,60000);addEventListener('pagehide',cloudSave);
  function done(msg,el,ok){el.textContent=msg;el.style.color=ok?'#35e0b0':'#ff8a8a'}
  function card(){
    var c=document.createElement('div');c.id='acct';c.style.cssText='margin:10px 0;padding:12px;border-radius:14px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.14);font:500 13px system-ui,sans-serif;color:#fff';
    var u=LS('hl-user');
    if(u){c.innerHTML='☁️ Saved online as <b>'+u+'</b> — your progress follows you to any phone. <div style="margin-top:8px"><button id="a_out" class="btn sm">Log out</button></div>';
      setTimeout(function(){var o=c.querySelector('#a_out');if(o)o.onclick=function(){cloudSave();LS('hl-tok',null);LS('hl-user',null);var n=Array.from(crypto.getRandomValues(new Uint8Array(12))).map(function(b){return b.toString(16).padStart(2,'0')}).join('');LS('hl-id',n);window.saveGame=function(){};LS('heirloom-v5',null);location.reload()}},0)}
    else{c.innerHTML='☁️ <b>Save your progress online</b><div style="opacity:.75;margin:4px 0 8px">Don\'t lose your cars and cash if you clear your browser or change phone.</div>'+
      '<input id="a_u" class="txt" placeholder="username" autocapitalize="off" autocomplete="username" style="width:100%;margin-bottom:6px"><input id="a_p" class="txt" type="password" placeholder="password (6+ characters)" autocomplete="current-password" style="width:100%;margin-bottom:8px"><div style="display:flex;gap:8px"><button id="a_r" class="btn">Create account</button><button id="a_l" class="btn">Log in</button></div><div id="a_m" style="margin-top:6px"></div>';
      setTimeout(function(){var m=c.querySelector('#a_m');
        c.querySelector('#a_r').onclick=function(){done('Working…',m,1);try{if(window.saveGame)saveGame()}catch(e){}post('/api/account',{act:'register',user:c.querySelector('#a_u').value,pw:c.querySelector('#a_p').value,anon:id,data:LS('heirloom-v5')||''}).then(function(r){if(!r.ok)return done(r.error||'Could not create account',m,0);LS('hl-tok',r.token);LS('hl-user',c.querySelector('#a_u').value.toLowerCase());done('✅ Account created — progress saved online',m,1);setTimeout(function(){var n=document.getElementById('acct');if(n){n.replaceWith(card())}},900)}).catch(function(){done('No connection. Try again.',m,0)})};
        c.querySelector('#a_l').onclick=function(){done('Working…',m,1);post('/api/account',{act:'login',user:c.querySelector('#a_u').value,pw:c.querySelector('#a_p').value,anon:id}).then(function(r){if(!r.ok)return done(r.error||'Could not log in',m,0);LS('hl-tok',r.token);LS('hl-user',c.querySelector('#a_u').value.toLowerCase());LS('hl-id',r.id);window.saveGame=function(){};if(r.data)LS('heirloom-v5',r.data);done('✅ Welcome back! Loading…',m,1);setTimeout(function(){location.reload()},700)}).catch(function(){done('No connection. Try again.',m,0)})}},0)}
    return c}

  /* ---- car radio music: owner's tracks are radio stations; they play only while driving (or on foot if the player turns it on) ---- */
  var TRACKS=DEFAULT_MUSIC.match(/[A-Za-z0-9_-]{11}(?=[^A-Za-z0-9_-]|$)/g)||[];
  TRACKS=(DEFAULT_MUSIC.match(/youtu\.be\/([A-Za-z0-9_-]{11})/g)||[]).map(function(x){return x.slice(-11)});
  var ST=window.__STATIONS;
  if(ST&&TRACKS.length&&!ST.__yt){ST.__yt=1;for(var i=TRACKS.length-1;i>=0;i--)ST.unshift({n:'🎵 Song '+(i+1),yt:TRACKS[i]})}
  var frame=null,curId=null,wantOn=null,lastDrive=null,lastWalk=null;
  function walk(){return LS('hl-walk')==='1'}
  function off(){return LS('hl-musicoff')==='1'}
  function cmd(f){if(frame){try{frame.contentWindow.postMessage(JSON.stringify({event:'command',func:f,args:''}),'*')}catch(e){}}}
  function load(id){curId=id;if(!frame){frame=document.createElement('iframe');frame.allow='autoplay; encrypted-media';frame.setAttribute('aria-hidden','true');frame.style.cssText='position:fixed;left:-400px;top:0;width:200px;height:200px;border:0;opacity:.01;pointer-events:none;z-index:-1';document.body.appendChild(frame)}
    frame.src='https://www.youtube.com/embed/'+id+'?autoplay=1&controls=0&enablejsapi=1&playsinline=1&loop=1&playlist='+id}
  function rg(){try{return __audio.musG&&__audio.musG.gain.value>.02}catch(e){return false}}
  function tickMusic(){var A=window.__audio;if(!A||window.__mode!=='play'){if(frame&&wantOn){cmd('pauseVideo');wantOn=false}return}
    var drive=!!(window.__player&&window.__player.st!=='foot'),w=walk();
    if(drive!==lastDrive||w!==lastWalk){var first=lastDrive===null;lastDrive=drive;lastWalk=w;if(off())A.setRadio(false);else if(!drive&&!w)A.setRadio(false);else if(!first||w)A.setRadio(true)}
    var st=ST&&ST[A.station],want=!!(st&&st.yt&&(drive||w)&&!document.hidden&&!off()&&rg());
    if(want){if(curId!==st.yt)load(st.yt);else if(!wantOn)cmd('playVideo')}else if(frame&&wantOn)cmd('pauseVideo');
    wantOn=want}
  setInterval(tickMusic,300);
  document.addEventListener('visibilitychange',function(){if(document.hidden&&frame){cmd('pauseVideo');wantOn=false}});
  addEventListener('pagehide',function(){cmd('pauseVideo');wantOn=false});
  function musicCard(){var c=document.createElement('div');c.id='mcard';c.style.cssText='margin:10px 0;padding:12px;border-radius:14px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.14);font:500 13px system-ui,sans-serif;color:#fff';
    function draw(){c.innerHTML='🎵 <b>Music</b><div style="opacity:.75;margin:4px 0 8px">Songs play on the car radio — tap 📻 in the car to change station.</div><div style="display:flex;gap:8px;flex-wrap:wrap"><button id="m_w" class="btn">🎧 Music while walking: '+(walk()?'ON':'OFF')+'</button><button id="m_o" class="btn alt">'+(off()?'🔊 Turn music on':'🔇 Stop all music')+'</button></div>';
      c.querySelector('#m_w').onclick=function(){LS('hl-walk',walk()?'0':'1');draw()};
      c.querySelector('#m_o').onclick=function(){LS('hl-musicoff',off()?null:'1');lastDrive=null;draw();tickMusic()}}
    draw();return c}
  var sh=document.getElementById('sheet');
  if(sh)new MutationObserver(function(){var p=sh.querySelector('.panel');if(!p||p.querySelector('#acct')||p.querySelector('#mcard'))return;var h=p.querySelector('.ph');if(h&&/Pause/.test(h.textContent)){var ac=card();h.insertAdjacentElement('afterend',ac);ac.insertAdjacentElement('afterend',musicCard())}}).observe(sh,{childList:true,subtree:true});
})();
