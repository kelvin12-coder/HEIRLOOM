/* OWNER SETTING: paste ONE YouTube/Audiomack/SoundCloud/Spotify link here. It plays for every new player automatically (they can change or stop it in Pause). Leave '' to use only the built-in radio. */
var DEFAULT_MUSIC='https://youtu.be/kbAxrwfLSsE https://youtu.be/WWkF5KUoTA4 https://youtu.be/kJHdj1wXwrE https://youtu.be/mERsEYKbRxM';
(function(){
  var LS=function(k,v){try{if(v===undefined)return localStorage.getItem(k);if(v===null)localStorage.removeItem(k);else localStorage.setItem(k,v)}catch(e){return null}};
  var id=LS('hl-id');if(!id){id=Array.from(crypto.getRandomValues(new Uint8Array(12))).map(function(b){return b.toString(16).padStart(2,'0')}).join('');LS('hl-id',id)}
  var prev=0,first=true;
  function say(t){}
  function post(url,body){return fetch(url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)}).then(function(r){return r.json().then(function(j){j.status=r.status;return j})})}
  function tick(){post('/api/ping',{id:id}).then(function(d){if(d.status!==200)return;
    window.__hl={online:d.online,total:d.total};
    if(d.n)setTimeout(function(){say(d.n===1?'🎉 You are the FIRST player of Heirloom!':'🎉 Welcome! You are player #'+d.n)},4000);
    if(!first&&d.total>prev){var k=d.total-prev;say('👋 '+k+' new player'+(k>1?'s':'')+' joined');if(Math.floor(d.total/100)>Math.floor(prev/100))say('🔥 Heirloom passed '+(Math.floor(d.total/100)*100)+' players!')}
    prev=d.total;first=false}).catch(function(){})}
  tick();setInterval(tick,45000);
  /* ---- cloud save ---- */
  function cloudSave(){var t=LS('hl-tok');if(!t)return;try{if(window.saveGame)saveGame()}catch(e){}var d=LS('heirloom-v5');if(d)post('/api/account',{act:'save',token:t,data:d}).then(function(r){if(r&&r.banned){LS('hl-tok',null);notice('⛔ This account was suspended for cheating.',0)}}).catch(function(){})}
  setInterval(cloudSave,60000);addEventListener('pagehide',cloudSave);
  function done(msg,el,ok){el.textContent=msg;el.style.color=ok?'#35e0b0':'#ff8a8a'}
  function card(){
    var c=document.createElement('div');c.id='acct';c.style.cssText='margin:10px 0;padding:12px;border-radius:14px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.14);font:500 13px system-ui,sans-serif;color:#fff';
    var u=LS('hl-user');
    if(u){c.innerHTML='☁️ Saved online as <b>'+u.replace(/[^a-z0-9_]/g,'')+'</b> — your progress follows you to any phone. <div style="margin-top:8px;display:flex;gap:8px"><button id="a_buy" class="btn sm">🛒 Buy cash</button><button id="a_out" class="btn sm">Log out</button></div>';
      setTimeout(function(){var bb=c.querySelector('#a_buy');if(bb)bb.onclick=shopOverlay;var o=c.querySelector('#a_out');if(o)o.onclick=function(){cloudSave();post('/api/account',{act:'logout',token:LS('hl-tok')}).catch(function(){});LS('hl-tok',null);LS('hl-user',null);var n=Array.from(crypto.getRandomValues(new Uint8Array(12))).map(function(b){return b.toString(16).padStart(2,'0')}).join('');LS('hl-id',n);window.saveGame=function(){};LS('heirloom-v5',null);location.reload()}},0)}
    else{c.innerHTML='☁️ <b>Save your progress online</b><div style="opacity:.75;margin:4px 0 8px">Don\'t lose your cars and cash if you clear your browser or change phone.</div>'+
      '<input id="a_u" class="txt" placeholder="username" autocapitalize="off" autocomplete="username" style="width:100%;margin-bottom:6px"><input id="a_p" class="txt" type="password" placeholder="password (8+ characters)" autocomplete="current-password" style="width:100%;margin-bottom:8px"><div style="display:flex;gap:8px"><button id="a_r" class="btn">Create account</button><button id="a_l" class="btn">Log in</button></div><div id="a_m" style="margin-top:6px"></div>';
      setTimeout(function(){var m=c.querySelector('#a_m');
        c.querySelector('#a_r').onclick=function(){done('Working…',m,1);try{if(window.saveGame)saveGame()}catch(e){}post('/api/account',{act:'register',user:c.querySelector('#a_u').value,pw:c.querySelector('#a_p').value,anon:id,data:LS('heirloom-v5')||''}).then(function(r){if(!r.ok)return done(r.error||'Could not create account',m,0);LS('hl-tok',r.token);LS('hl-user',c.querySelector('#a_u').value.toLowerCase());done('✅ Account created — progress saved online',m,1);setTimeout(function(){var n=document.getElementById('acct');if(n){n.replaceWith(card())}},900)}).catch(function(){done('No connection. Try again.',m,0)})};
        c.querySelector('#a_l').onclick=function(){done('Working…',m,1);post('/api/account',{act:'login',user:c.querySelector('#a_u').value,pw:c.querySelector('#a_p').value,anon:id}).then(function(r){if(!r.ok)return done(r.error||'Could not log in',m,0);LS('hl-tok',r.token);LS('hl-user',c.querySelector('#a_u').value.toLowerCase());LS('hl-id',r.id);window.saveGame=function(){};if(r.data)LS('heirloom-v5',r.data);done('✅ Welcome back! Loading…',m,1);setTimeout(function(){location.reload()},700)}).catch(function(){done('No connection. Try again.',m,0)})}},0)}
    return c}

  /* ---- car radio music: owner's tracks are radio stations; they play only while driving (or on foot if the player turns it on) ---- */
  var TRACKS=DEFAULT_MUSIC.match(/[A-Za-z0-9_-]{11}(?=[^A-Za-z0-9_-]|$)/g)||[];
  TRACKS=(DEFAULT_MUSIC.match(/youtu\.be\/([A-Za-z0-9_-]{11})/g)||[]).map(function(x){return x.slice(-11)});
  var ST=window.__STATIONS;
  /* YouTube songs now live inside the one Music Mix station (see below) */
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

  /* ---- Audiomack albums: radio stations. Audiomack has no play/pause control from outside, so the little player shows only while an Audiomack station is on in a car ---- */
  var AM={
    'Industry Machine':{a:'odumodublvck',alb:'album/industry-machine-9091112',t:'industry-machine-2451242 unaware-8507728 baby-reindeer-5956903 banza-boy-4488704 grooving-5729447 big-time-2179496 vinicius-2926648 tiffany-7911184 adenuga-8601736 maradona-6673223 pay-me-5259130 layi-wasabi-1623681 too-spoilt-7947033 if-you-like-gym-4075320 candy-music-0300176 do-yanga-5136274 my-angel-2330116 baggio-5926885 bombastic-element-3099811 ghetto-man-yute-2519357 2-people-9477423 ejor-8828212 hallelujah-6982440'},
    'Business':{a:'mavo1',alb:'album/business-0526071',t:'business-8998251 jehovah-4436992 gods-promise-3652789 m2b-1424002 letter-to-my-baby-0998648 superwoman-4285082 ice-cream-5099612 use-me-0205024 mofe-6464754 shy-lover-6122328 slow-7503904 poison-panya-2416427 bb-lifestyle-4955125'},
    'Breaking':{a:'mavo1',alb:'album/breaking-7046113',t:'hey-mama-6827834 aura-salad-6690704'},
    'Shakespopi':{a:'shallipopi',alb:'album/shakespopi',t:'asap high-tension 100-1 dey billion-1 find-me new-cat start-am trees'},
    'Auracle':{a:'shallipopi',alb:'album/auracle-2126337',t:'ant-7909898 laho-5480467 turner-6869359 eyo-0504221 gbefun-fine-shit-6273348 him-5570952 stay-6811021 chokehold-bro-code-3120493 opeuhh-9054013 like-that-bomboclatt-9255419 pull-up-6550878 aura-9939615 afa-relax-oo-7567812 caution-hold-something-5348777 rockstar-0318870 searching-4-me-5638348 na-so-1106855 ballingo-0663580 loaded-4825229 igho-3981245 laho-ii-5609762 laho-iii-8478304'},
    'Hometown Heroes':{pl:1,a:'johneniibukun',alb:'playlist/hometown-heroes-abuja',t:'iampriesst/akonuche-7448109 psychoyp/lets-go eeskaylvl/lamb-truck southsideshakur/mad 2Soft/woman odumodublvck/202pm-in-london-freestyle-5141605 eslafirstklaz/soyaiya-7053833 reeplay-007/akpor-feat-odumodublvck-magnito-portable mimieyoo/mimieyoo-pain-me-pass psychoyp/different-pattern'}
  };
  var AMN=Object.keys(AM),lastGrp='',amFrame=null,amBox=null,amKey='';
  function pick(a){return a[Math.floor(Math.random()*a.length)]}
  var bags={};
  function songUrl(name){var o=AM[name];if(!bags[name]||!bags[name].length){var a=o.t.split(' ');for(var i=a.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1)),x=a[i];a[i]=a[j];a[j]=x}bags[name]=a}var t=bags[name].pop();return o.pl?'song/'+t:'song/'+o.a+'/'+t}
  function amShown(){return LS('hl-amshow')==='1'}
  /* ONE radio station that mixes every song: YouTube songs + all Audiomack albums. Each tap on the radio (or the end of a song) jumps to a song from a DIFFERENT source than the last one. */
  var M={n:'🔀 Music Mix (all songs)',am:1,mixall:1,yt:undefined,amUrl:null,el:0};
  var queue=[];
  function shuffle(a){a=a.slice();for(var i=a.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1)),t=a[i];a[i]=a[j];a[j]=t}return a}
  var hist=[],fwd=[];
  function snap(){return{yt:M.yt,amUrl:M.amUrl,g:lastGrp}}
  function apply(o){M.yt=o.yt;M.amUrl=o.amUrl;lastGrp=o.g||lastGrp;M.el=0;amKey=''}
  function roll(){
    if(M.yt||M.amUrl){hist.push(snap());if(hist.length>30)hist.shift()}
    if(!queue.length){queue=shuffle(AMN).concat(TRACKS.length?['yt']:[]);if(queue[0]===lastGrp&&queue.length>1)queue.push(queue.shift())}
    var g=queue.shift();lastGrp=g;M.el=0;
    if(g==='yt'){var ids=TRACKS.filter(function(x){return x!==M.yt});M.yt=pick(ids.length?ids:TRACKS);M.amUrl=null}
    else{M.yt=undefined;M.amUrl='https://audiomack.com/embed/'+songUrl(g)+'?background=1&color=ffffff'}
    amKey=''}
  function nextSong(){if(fwd.length){hist.push(snap());apply(fwd.pop())}else roll()}
  function prevSong(){if(!hist.length)return;fwd.push(snap());apply(hist.pop())}
  roll();
  if(ST&&!ST.__mx){ST.__mx=1;ST.unshift(M)}
  function amPlace(){if(!amBox)return;var v=amShown();amBox.style.cssText=v?'position:fixed;left:6px;bottom:6px;width:190px;z-index:30;background:#000c;border-radius:10px;padding:3px':'position:fixed;left:-400px;top:0;width:200px;opacity:.02;pointer-events:none;z-index:-1';amFrame.style.height=v?'90px':'110px'}
  function amShow(){
    if(!amBox){amBox=document.createElement('div');amFrame=document.createElement('iframe');amFrame.allow='autoplay; encrypted-media';amFrame.setAttribute('aria-hidden','true');amFrame.style.cssText='width:100%;border:0;border-radius:8px;display:block';amBox.appendChild(amFrame);document.body.appendChild(amBox)}
    amPlace();if(M.amUrl&&amKey!==M.amUrl){amKey=M.amUrl;amFrame.src=M.amUrl}}
  function amHide(){if(amBox&&amKey){amFrame.src='about:blank';amKey=''}}
  /* radio button in the car: on the Mix station it changes the song instead of changing station */
  if(typeof ACT!=='undefined'&&ACT.station&&!ACT.__am){ACT.__am=1;var oldSt=ACT.station;
    ACT.station=function(){var A=window.__audio,st=A&&ST&&ST[A.station];if(st&&st.mixall){nextSong();try{A.setRadio(true);toast('🔀 Next song')}catch(e){}return}return oldSt.apply(this,arguments)}}
  setInterval(function(){var A=window.__audio,st=A&&ST&&ST[A.station],drive=!!(window.__player&&window.__player.st!=='foot'),on=!!(A&&window.__mode==='play'&&st&&st.mixall&&(drive||walk())&&!document.hidden&&!off());
    if(on){M.el+=.4;if(M.el>205){nextSong()}}
    if(on&&!M.yt&&M.amUrl)amShow();else amHide()},400);
  document.addEventListener('visibilitychange',function(){if(document.hidden&&frame){cmd('pauseVideo');wantOn=false}});
  addEventListener('pagehide',function(){cmd('pauseVideo');wantOn=false});

  /* ---- shop: real payments through Paystack. Prices, keys and crediting are all checked on the SERVER; nothing here can grant money by itself ---- */
  var SHOPCFG=null;
  function pay(o){var t=LS('hl-tok');if(o.act==='cfg')return post('/api/pay',o);if(!t)return Promise.resolve({error:'Log in first so your purchase is saved to your account.'});o.token=t;return post('/api/pay',o)}
  function esc3(x){return String(x).replace(/[&<>"']/g,function(c){return'&#'+c.charCodeAt(0)+';'})}
  function notice(t,ok){var d=document.createElement('div');d.textContent=t;d.style.cssText='position:fixed;left:50%;top:14px;transform:translateX(-50%);z-index:60;padding:10px 16px;border-radius:12px;font:600 14px system-ui,sans-serif;color:#fff;background:'+(ok?'#0a7a55':'#8a2030')+';max-width:90vw;text-align:center';document.body.appendChild(d);setTimeout(function(){d.remove()},5000)}
  function applyCredits(list){
    var S=window.__S;if(!S||typeof addMoney!=='function'||!list||!list.length)return false;S.paidRefs=S.paidRefs||[];var got=0,refs=[];
    list.forEach(function(c){refs.push(c.ref);if(S.paidRefs.indexOf(c.ref)<0&&+c.cash>0&&+c.cash<=2000000){S.paidRefs.push(c.ref);try{addMoney(+c.cash,true)}catch(e){return}got+=+c.cash}});
    try{saveGame()}catch(e){}
    if(got)notice('✅ Payment received! +$'+got.toLocaleString()+' added. Thank you!',1);
    pay({act:'ack',refs:refs}).catch(function(){});return true}
  function collect(ref){pay({act:'claim',ref:ref||''}).then(function(r){if(r&&r.credits&&r.credits.length){var tryIt=function(n){if(applyCredits(r.credits))return;if(n<40)setTimeout(function(){tryIt(n+1)},1500)};tryIt(0)}else if(ref)notice('Payment not confirmed yet. If you were charged, it will be added automatically within a few minutes.',0)}).catch(function(){})}
  (function(){var q=new URLSearchParams(location.search),ref=q.get('reference')||q.get('trxref');
    if(ref&&/^hl_[a-f0-9]+$/.test(ref)){try{history.replaceState(null,'',location.pathname)}catch(e){}setTimeout(function(){collect(ref)},2500)}
    else if(LS('hl-tok'))setTimeout(function(){collect('')},6000)})();
  function shopOverlay(){var o=document.getElementById('shopov');if(o)o.remove();o=document.createElement('div');o.id='shopov';
    o.style.cssText='position:fixed;inset:0;z-index:50;background:rgba(0,0,0,.78);display:flex;align-items:center;justify-content:center;font:500 13px system-ui,sans-serif;color:#fff';
    o.innerHTML='<div style="background:#12151f;border:1px solid #fff3;border-radius:16px;padding:14px;width:min(420px,92vw);max-height:90%;overflow:auto"><div style="display:flex;justify-content:space-between;align-items:center"><b style="font-size:16px">🛒 Buy cash · Support the game</b><button id="so_x" style="background:none;border:0;color:#fff;font-size:20px">✕</button></div><div id="so_l" style="margin:8px 0">Loading…</div><input id="so_e" class="txt" type="email" placeholder="your email (for the receipt)" autocomplete="email" style="width:100%;margin:6px 0"><div id="so_m" style="min-height:18px;margin-top:4px"></div><div style="opacity:.6;margin-top:6px;font-size:11px">Secure payment by Paystack (card, bank transfer, USSD). We never see your card details. Digital items, no refunds. Players under 18 should ask a parent or guardian first.</div></div>';
    document.body.appendChild(o);o.querySelector('#so_x').onclick=function(){o.remove()};
    var m=o.querySelector('#so_m');
    pay({act:'cfg'}).then(function(c){if(!c||!c.on){o.querySelector('#so_l').textContent='The shop opens soon.';return}
      o.querySelector('#so_l').innerHTML=c.packs.map(function(p){return'<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid #fff2"><span>💵 <b>'+esc3(p.n)+'</b> $'+(+p.cash).toLocaleString()+'</span><button class="btn sm" data-k="'+esc3(p.k)+'">₦'+(+p.naira).toLocaleString()+'</button></div>'}).join('');
      o.querySelector('#so_l').onclick=function(e){var k=e.target.getAttribute&&e.target.getAttribute('data-k');if(!k)return;m.textContent='Opening secure checkout…';m.style.color='#fff';
        pay({act:'init',pack:k,email:o.querySelector('#so_e').value}).then(function(r){if(r&&r.url&&/^https:\/\/checkout\.paystack\.com\//.test(r.url)){try{window.saveGame&&saveGame()}catch(e){}location.href=r.url}else{m.textContent=(r&&r.error)||'Could not start payment.';m.style.color='#ff8a8a'}}).catch(function(){m.textContent='No connection. Try again.';m.style.color='#ff8a8a'})}}).catch(function(){o.querySelector('#so_l').textContent='No connection.'})}
  pay({act:'cfg'}).then(function(c){SHOPCFG=c}).catch(function(){});

  /* ---- map size ---- */
  function mapMode(){return LS('hl-map')||'0'}
  function applyMap(){var a=document.getElementById('app');if(a)a.dataset.mm=mapMode()}
  applyMap();
  /* ---- online players + chat ---- */
  var lobbySeq=0,lobbyOpen=false,lobbyEl=null,lobbyBusy=false,lastBeat=0;
  function esc2(t){return String(t).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
  function lobby(msg){if(lobbyBusy)return;lobbyBusy=true;var S=window.__S||{},ar=(document.getElementById('dname')||{}).textContent||'';
    post('/api/lobby',{id:id,name:S.name||'Player',area:ar,msg:msg||'',since:lobbySeq}).then(function(d){lobbyBusy=false;if(d.status!==200||!d.players)return;lastBeat=Date.now();
      if(lobbyEl){var pl=lobbyEl.querySelector('#lb_p'),lg=lobbyEl.querySelector('#lb_l');
        lobbyEl.querySelector('#lb_n').textContent=d.players.length;
        pl.innerHTML=d.players.map(function(p){return'<span style="display:inline-block;margin:2px 4px 2px 0;padding:3px 8px;border-radius:99px;background:'+(p.me?'#ffb02055':'#ffffff18')+'">'+esc2(p.n)+(p.a?' · 📍'+esc2(p.a):'')+'</span>'}).join('');
        d.msgs.forEach(function(m){var r=document.createElement('div');r.innerHTML='<b style="color:#7fd1ff">'+esc2(m.n)+'</b> '+esc2(m.m);lg.appendChild(r)});
        if(d.msgs.length)lg.scrollTop=lg.scrollHeight}
      lobbySeq=d.seq||lobbySeq}).catch(function(){lobbyBusy=false;if(lobbyEl)lobbyEl.querySelector('#lb_p').textContent='Chat needs the full online setup.'})}
  function openLobby(){if(lobbyEl)return;lobbyOpen=true;lobbySeq=0;var o=document.createElement('div');lobbyEl=o;o.style.cssText='position:fixed;inset:0;z-index:50;background:rgba(0,0,0,.72);display:flex;align-items:center;justify-content:center;font:500 13px system-ui,sans-serif;color:#fff';
    o.innerHTML='<div style="background:#12151f;border:1px solid #fff3;border-radius:16px;padding:12px;width:min(440px,94vw);max-height:92%;display:flex;flex-direction:column;gap:8px"><div style="display:flex;justify-content:space-between;align-items:center"><b style="font-size:16px">🌍 Online now: <span id="lb_n">…</span></b><button id="lb_x" style="background:none;border:0;color:#fff;font-size:20px">✕</button></div><div id="lb_p" style="max-height:70px;overflow:auto">Loading…</div><div id="lb_l" style="height:110px;overflow:auto;background:#0008;border-radius:10px;padding:6px 8px;line-height:1.5"></div><div style="display:flex;gap:8px"><input id="lb_i" class="txt" maxlength="120" placeholder="Say something nice…" style="flex:1"><button id="lb_s" class="btn">Send</button></div><div style="opacity:.55;font-size:11px">Public chat. Never share phone numbers, addresses or passwords. Be kind.</div></div>';
    document.body.appendChild(o);
    function close(){lobbyEl=null;lobbyOpen=false;clearInterval(iv);o.remove()}
    var iv=setInterval(function(){lobby()},5000);
    o.querySelector('#lb_x').onclick=close;
    function send(){var i=o.querySelector('#lb_i'),t=i.value.trim();if(!t)return;i.value='';lobbyBusy=false;lobby(t)}
    o.querySelector('#lb_s').onclick=send;o.querySelector('#lb_i').onkeydown=function(e){if(e.key==='Enter')send()};
    lobby()}
  var wb=document.createElement('button');wb.className='tb';wb.id='t_world';wb.setAttribute('aria-label','Online players');wb.textContent='🌍';wb.addEventListener('click',function(e){e.stopPropagation();openLobby()});
  var tb=document.getElementById('topb');if(tb)tb.insertBefore(wb,tb.firstChild);
  setInterval(function(){if(window.__mode==='play'&&!lobbyEl&&Date.now()-lastBeat>30000&&!document.hidden)lobby()},10000);
  function fb(v){LS('hl-fb',String(v));post('/api/ping',{id:id,fb:v}).catch(function(){});var m=document.getElementById('mcard');if(m){var f=m.querySelector('#f_y');if(f&&f.parentNode)f.parentNode.firstChild.textContent='💚 Thanks for your feedback! '}}
  function musicCard(){var c=document.createElement('div');c.id='mcard';c.style.cssText='margin:10px 0;padding:12px;border-radius:14px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.14);font:500 13px system-ui,sans-serif;color:#fff';
    function draw(){c.innerHTML='🎵 <b>Music</b><div style="opacity:.75;margin:4px 0 8px">Songs play on the car radio. Tap 📻 in the car for the next song (it jumps between all your albums).</div><div style="display:flex;gap:8px;flex-wrap:wrap"><button id="m_w" class="btn">🎧 Music while walking: '+(walk()?'ON':'OFF')+'</button><button id="m_m" class="btn alt">🗺️ Map: '+['Normal','Small','Hidden'][+mapMode()]+'</button><button id="m_o" class="btn alt">'+(off()?'🔊 Turn music on':'🔇 Stop all music')+'</button>'+'<button id="m_st" class="btn alt">📻 Change station</button><button id="m_pl" class="btn alt">👁 Song player: '+(amShown()?'SHOWN':'HIDDEN')+'</button>'+(!(SHOPCFG&&SHOPCFG.on)?'':'<button id="m_s" class="btn">🛒 Buy cash · Support</button>')+'</div><div style="margin-top:10px">'+(LS('hl-fb')?'💚 Thanks for your feedback!':'Do you like Heirloom? <button id="f_y" class="btn sm">👍 Yes</button> <button id="f_n" class="btn sm alt">👎 No</button>')+' <button id="m_sh" class="btn sm">📤 Share game</button></div>';var ms=c.querySelector('#m_s');if(ms)ms.onclick=shopOverlay;
      c.querySelector('#m_w').onclick=function(){LS('hl-walk',walk()?'0':'1');draw()};
      c.querySelector('#m_st').onclick=function(){var A=window.__audio;if(A&&ST){A.station=(A.station+1)%ST.length;A.setRadio(true);try{toast('📻 '+ST[A.station].n)}catch(e){}}draw()};
      c.querySelector('#m_pl').onclick=function(){LS('hl-amshow',amShown()?'0':'1');amPlace();draw()};
      c.querySelector('#m_m').onclick=function(){LS('hl-map',String((+mapMode()+1)%3));applyMap();draw()};
      var fy=c.querySelector('#f_y'),fn=c.querySelector('#f_n');if(fy){fy.onclick=function(){fb(1)};fn.onclick=function(){fb(0)}}
      c.querySelector('#m_sh').onclick=function(){var u=location.origin+'/';if(navigator.share)navigator.share({title:'Heirloom',text:'Play Heirloom, a 3D Lagos-style open world game!',url:u}).catch(function(){});else{try{navigator.clipboard.writeText(u);this.textContent='✅ Link copied'}catch(e){}}};
      c.querySelector('#m_o').onclick=function(){LS('hl-musicoff',off()?null:'1');lastDrive=null;draw();tickMusic()}}
    draw();return c}
  function hud(){var v=LS('hl-hud')||'1';var app=document.getElementById('app');if(app)app.style.setProperty('--hs',v)}
  setInterval(hud,1500);hud();
  function fbCard(){var c=document.createElement('div');c.id='fbcard';c.style.cssText='margin:10px 0;padding:12px;border-radius:14px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.14);font:500 13px system-ui,sans-serif;color:#fff';
    function draw(){var hs=LS('hl-hud')||'1',given=LS('hl-fb');c.innerHTML='📐 <b>Screen buttons size</b><div style="display:flex;gap:8px;margin:6px 0 10px">'+[['1','Big'],['.75','Medium'],['.55','Small']].map(function(o){return'<button class="btn'+(hs===o[0]?'':' alt')+'" data-h="'+o[0]+'">'+o[1]+'</button>'}).join('')+'</div>'+(given?'👍 Thanks for your feedback!':'<b>Do you like the game?</b><div style="display:flex;gap:8px;margin-top:6px"><button class="btn" data-f="1">👍 Yes</button><button class="btn alt" data-f="0">👎 Not yet</button></div>');
      c.querySelectorAll('[data-h]').forEach(function(b){b.onclick=function(){LS('hl-hud',b.dataset.h);hud();draw()}});
      c.querySelectorAll('[data-f]').forEach(function(b){b.onclick=function(){LS('hl-fb',b.dataset.f);post('/api/ping',{id:id,fb:+b.dataset.f}).catch(function(){});draw()}})}
    draw();return c}

  /* ---- "Do you like the game?" asked once after ~5 minutes of play ---- */
  var played=0;setInterval(function(){if(window.__mode==='play'&&!document.hidden)played+=1;
    if(played>=300&&!LS('hl-fb')&&!document.getElementById('fbq')&&window.__player&&window.__player.st==='foot'){LS('hl-fb','1');
      var d=document.createElement('div');d.id='fbq';d.style.cssText='position:fixed;left:50%;top:calc(10px + env(safe-area-inset-top,0px));transform:translateX(-50%);z-index:30;background:#12151fee;color:#fff;border:1px solid #fff3;border-radius:14px;padding:8px 12px;font:600 14px system-ui,sans-serif;display:flex;gap:10px;align-items:center';
      d.innerHTML='Do you like the game? <button data-v="1" style="font-size:22px;background:none;border:0">👍</button><button data-v="0" style="font-size:22px;background:none;border:0">👎</button><button data-v="x" style="background:none;border:0;color:#fff;font-size:16px">✕</button>';
      document.body.appendChild(d);var t=setTimeout(function(){d.remove()},15000);
      d.onclick=function(e){var v=e.target.getAttribute&&e.target.getAttribute('data-v');if(v===null||v===undefined)return;clearTimeout(t);if(v!=='x')post('/api/ping',{id:id,fb:+v}).catch(function(){});d.innerHTML=v==='x'?'':'Thanks! ❤️';setTimeout(function(){d.remove()},v==='x'?0:1500)}}},1000);

  /* ---- always-visible music button (top of the screen) + one-time hint when music starts ---- */
  var mbtn=null,hintN=+(LS('hl-mhint')||0),lastDr=false;
  var mwrap=null,mprev=null,mnext=null;
  function musicBtn(){
    if(!mwrap){var st='padding:6px 12px;border-radius:99px;border:1px solid #fff4;background:rgba(0,0,0,.5);color:#fff;font:700 12px system-ui,sans-serif';
      mwrap=document.createElement('div');mwrap.style.cssText='position:fixed;left:34%;top:calc(6px + env(safe-area-inset-top,0px));z-index:29;display:none;gap:6px;align-items:center';
      mprev=document.createElement('button');mprev.textContent='⏮';mprev.style.cssText=st;mprev.onclick=function(){prevSong();try{window.__audio.setRadio(true)}catch(e){}};
      mbtn=document.createElement('button');mbtn.style.cssText=st;mbtn.onclick=function(){LS('hl-musicoff',off()?null:'1');lastDrive=null;tickMusic();musicBtn()};
      mnext=document.createElement('button');mnext.textContent='⏭';mnext.style.cssText=st;mnext.onclick=function(){nextSong();try{window.__audio.setRadio(true)}catch(e){}};
      mwrap.appendChild(mprev);mwrap.appendChild(mbtn);mwrap.appendChild(mnext);document.body.appendChild(mwrap)}
    var t=off()?'🎵 Play music':'⏸ Pause music';if(mbtn.textContent!==t)mbtn.textContent=t;
    var A=window.__audio,cs=A&&ST&&ST[A.station],mix=!!(cs&&cs.mixall);
    mprev.style.display=mnext.style.display=mix?'block':'none';
    mwrap.style.display=(window.__mode==='play')?'flex':'none'}
  setInterval(function(){musicBtn();var dr=!!(window.__player&&window.__player.st!=='foot');
    if(window.__mode==='play'&&dr&&!lastDr&&!off()&&hintN<3){hintN++;LS('hl-mhint',String(hintN));try{toast('🎵 Music is playing — tap the button at the top to pause it')}catch(e){}}lastDr=dr},500);
  /* ---- invite a friend ---- */
  function inviteFriends(){var u=location.origin+'/',t='Come play Heirloom with me — an open-world city game 🚗🌍';
    if(navigator.share){navigator.share({title:'Heirloom',text:t,url:u}).catch(function(){})}
    else{try{navigator.clipboard.writeText(t+' '+u);notice('Link copied! Send it to your friends.',1)}catch(e){notice(u,1)}}}
  /* ---- "What is inside Heirloom" card on the first screen ---- */
  function featCard(){var c=document.createElement('div');c.id='feat';c.style.cssText='margin:12px auto 4px;padding:12px;max-width:420px;text-align:left;border-radius:14px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.16);font:500 13px/1.5 system-ui,sans-serif;color:#fff';
    c.innerHTML='<b style="font-size:14px">✨ What is inside Heirloom</b><div style="margin:6px 0 8px;opacity:.9">🚗 Drive Bugatti, Lamborghini, Ferrari and a flying Tesla<br>🎵 Music plays on the car radio by itself (pause it anytime at the top)<br>💬 Chat with players who are online now<br>👫 Invite your friends to join you<br>💼 Jobs, missions, dating, hospital, hotel, club, flights to 6 cities<br>☁️ Save your progress online with a free account</div><div style="display:flex;gap:8px;flex-wrap:wrap"><button id="ft_c" class="btn sm">💬 Chat with friends</button><button id="ft_i" class="btn sm alt">📤 Invite friends</button></div>';
    c.querySelector('#ft_c').onclick=function(e){e.stopPropagation();openLobby()};c.querySelector('#ft_i').onclick=function(e){e.stopPropagation();inviteFriends()};return c}
  var sh=document.getElementById('sheet');
  if(sh)new MutationObserver(function(){var p=sh.querySelector('.panel');if(p&&!p.querySelector('#feat')&&/A living open-world city/.test(p.textContent||'')){var rw=p.querySelector('.row.c');if(rw)rw.insertAdjacentElement('afterend',featCard())}if(!p||p.querySelector('#acct')||p.querySelector('#mcard'))return;var h=p.querySelector('.ph');if(h&&/Pause/.test(h.textContent)){var ac=card();h.insertAdjacentElement('afterend',ac);var mc=musicCard();ac.insertAdjacentElement('afterend',mc);mc.insertAdjacentElement('afterend',fbCard())}}).observe(sh,{childList:true,subtree:true});
})();
