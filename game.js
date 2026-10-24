
/* ================= CORE ================= */
const T3=THREE, TAU=Math.PI*2;
const $=s=>document.querySelector(s);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const lerp=(a,b,t)=>a+(b-a)*t;
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t)};
function mulberry(a){return function(){a|=0;a=a+0x6D2B79F5|0;var t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function hash(s){var h=2166136261;for(var i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
const pick=(a,r)=>a[Math.floor((r||Math.random)()*a.length)];
const angDiff=(a,b)=>{let d=(b-a)%TAU;if(d>Math.PI)d-=TAU;if(d<-Math.PI)d+=TAU;return d};
const dayKey=()=>new Date().toISOString().slice(0,10);
const MOBILE=/Android|iPhone|iPad|Mobile/i.test(navigator.userAgent)||Math.min(innerWidth,innerHeight)<700;
const QS=new URLSearchParams(location.search);
let QUALITY=MOBILE?1:2; // 0 low, 1 medium, 2 high
const canvas=$('#c');
const renderer=new T3.WebGLRenderer({canvas,antialias:!MOBILE,powerPreference:'high-performance'});
renderer.outputColorSpace=T3.SRGBColorSpace;
renderer.toneMapping=T3.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.0;
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=T3.PCFSoftShadowMap;
const scene=new T3.Scene();
const camera=new T3.PerspectiveCamera(62,1,0.3,MOBILE?520:2600);
scene.add(camera);
let PR=Math.min(devicePixelRatio||1,MOBILE?1.5:2),VW=innerWidth,VH=innerHeight;
let ROT=false;const rd=(dx,dy)=>ROT?[dy,-dx]:[dx,dy];
function applyRot(){const w=innerWidth,h=innerHeight;ROT=MOBILE&&h>w*1.1;const b=document.body,H=document.documentElement;H.classList.toggle('lh',(ROT?w:h)<=480);if(ROT){Object.assign(b.style,{position:'fixed',left:'0',top:'0',margin:'0',overflow:'hidden',width:h+'px',height:w+'px',transformOrigin:'0 0',transform:'translateX('+w+'px) rotate(90deg)'})}else{b.style.cssText=''}}
function resize(){applyRot();VW=ROT?innerHeight:innerWidth;VH=ROT?innerWidth:innerHeight;renderer.setPixelRatio(PR);renderer.setSize(VW,VH,false);camera.aspect=VW/VH;camera.updateProjectionMatrix()}
addEventListener('resize',resize);resize();

/* ---- constants of the city ---- */
const N=20, PITCH=120, ROADW=16, BLK=PITCH-ROADW, HALF=N*PITCH/2, SW=4; // blocks, pitch, road width, block size, half extent, sidewalk
const LIM=HALF+34; // play-area limit
const rcx=i=>-HALF+i*PITCH;           // road centre line i (0..N)
const bcx=g=>-HALF+(g+.5)*PITCH;      // block centre g (0..N-1)

/* ---- procedural textures ---- */
function mkCanvas(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c}
function tex(c,rep,srgb){const t=new T3.CanvasTexture(c);if(srgb!==false)t.colorSpace=T3.SRGBColorSpace;t.wrapS=t.wrapT=T3.RepeatWrapping;t.anisotropy=MOBILE?2:8;if(rep)t.repeat.set(rep[0],rep[1]);return t}
function winTextures(){ // 8x8 windows tile: 24m wide, 28m tall
  const S=512,c=mkCanvas(S,S),e=mkCanvas(S,S),g=c.getContext('2d'),h=e.getContext('2d');
  g.fillStyle='#fff';g.fillRect(0,0,S,S);h.fillStyle='#000';h.fillRect(0,0,S,S);
  const r=mulberry(11),cw=S/8,ch=S/8;
  for(let y=0;y<8;y++)for(let x=0;x<8;x++){
    const px=x*cw+cw*.2,py=y*ch+ch*.2,w=cw*.6,hh=ch*.58;
    const gr=g.createLinearGradient(0,py,0,py+hh);gr.addColorStop(0,'#7e93ad');gr.addColorStop(.5,'#2c3b52');gr.addColorStop(1,'#1a2433');
    g.fillStyle='#b9bcc2';g.fillRect(px-3,py-3,w+6,hh+6); // frame
    g.fillStyle=gr;g.fillRect(px,py,w,hh);
    g.fillStyle='rgba(255,255,255,.18)';g.fillRect(px,py,w*.45,hh*.5);
    g.fillStyle='rgba(0,0,0,.18)';g.fillRect(x*cw,y*ch+ch-4,cw,4); // sill shade
    const lit=r()<.46;
    if(lit){const warm=r()<.8;const f=.55+r()*.45;h.fillStyle=warm?`rgb(${255*f|0},${200*f|0},${110*f|0})`:`rgb(${190*f|0},${220*f|0},${255*f|0})`;h.fillRect(px,py,w,hh);
      if(r()<.5){h.fillStyle='rgba(0,0,0,.35)';h.fillRect(px+w*.6,py,w*.07,hh)}}
  }
  g.fillStyle='#fff';g.fillRect(0,0,6,6);h.fillStyle='#000';h.fillRect(0,0,6,6); // plain corner texel for roofs
  const m=tex(c),en=tex(e);return{map:m,emi:en}
}
function shopTextures(){ // 8m x 4.4m tile
  const W=256,H=140,c=mkCanvas(W,H),e=mkCanvas(W,H),g=c.getContext('2d'),h=e.getContext('2d');
  g.fillStyle='#fff';g.fillRect(0,0,W,H);h.fillStyle='#000';h.fillRect(0,0,W,H);
  const aw=['#d94b4b','#f2f2f2'];for(let i=0;i<8;i++){g.fillStyle=aw[i%2];g.fillRect(i*32,6,32,26)}
  g.fillStyle='rgba(0,0,0,.25)';g.fillRect(0,32,W,4);
  const gr=g.createLinearGradient(0,44,0,H);gr.addColorStop(0,'#566a82');gr.addColorStop(1,'#1d2837');
  for(let i=0;i<2;i++){g.fillStyle='#8c8f96';g.fillRect(i*128+8,42,112,H-46);g.fillStyle=gr;g.fillRect(i*128+12,46,104,H-52);
    h.fillStyle=i?'rgb(255,214,150)':'rgb(255,236,190)';h.fillRect(i*128+12,46,104,H-52);
    h.fillStyle='rgba(0,0,0,.4)';for(let k=0;k<4;k++)h.fillRect(i*128+22+k*22,H-52-(k%2)*16,12,40-(k%2)*10)}
  g.fillStyle='#fff';g.fillRect(0,0,5,5);
  return{map:tex(c),emi:tex(e)}
}
function noiseTex(sz){const c=mkCanvas(sz,sz),g=c.getContext('2d'),d=g.createImageData(sz,sz),r=mulberry(5);
  // tileable value-noise via blurred random
  const base=new Float32Array(sz*sz);for(let i=0;i<base.length;i++)base[i]=r();
  const tmp=new Float32Array(sz*sz);
  for(let pass=0;pass<3;pass++){for(let y=0;y<sz;y++)for(let x=0;x<sz;x++){let s=0;for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++)s+=base[((y+dy+sz)%sz)*sz+((x+dx+sz)%sz)];tmp[y*sz+x]=s/25}base.set(tmp)}
  let mn=1,mx=0;for(let i=0;i<base.length;i++){mn=Math.min(mn,base[i]);mx=Math.max(mx,base[i])}
  for(let i=0;i<base.length;i++){const v=(base[i]-mn)/(mx-mn)*255;d.data[i*4]=d.data[i*4+1]=d.data[i*4+2]=v;d.data[i*4+3]=255}
  g.putImageData(d,0,0);const t=new T3.CanvasTexture(c);t.wrapS=t.wrapT=T3.RepeatWrapping;return t}
function asphaltTex(){const S=256,c=mkCanvas(S,S),g=c.getContext('2d'),r=mulberry(3);g.fillStyle='#4b4d52';g.fillRect(0,0,S,S);
  for(let i=0;i<5000;i++){const v=60+r()*40|0;g.fillStyle=`rgba(${v},${v},${v+4},.45)`;g.fillRect(r()*S,r()*S,1+r()*2,1+r()*2)}
  for(let i=0;i<10;i++){g.strokeStyle='rgba(20,20,22,.35)';g.lineWidth=1;g.beginPath();let x=r()*S,y=r()*S;g.moveTo(x,y);for(let k=0;k<6;k++){x+=(r()-.5)*40;y+=(r()-.5)*40;g.lineTo(x,y)}g.stroke()}
  const t=tex(c);return t}
function grassTex(){const S=256,c=mkCanvas(S,S),g=c.getContext('2d'),r=mulberry(9);g.fillStyle='#6f9a4a';g.fillRect(0,0,S,S);
  for(let i=0;i<6000;i++){const v=r();g.fillStyle=v<.5?'rgba(60,100,40,.5)':'rgba(130,170,80,.4)';g.fillRect(r()*S,r()*S,1,2+r()*2)}return tex(c)}
function concreteTex(){const S=256,c=mkCanvas(S,S),g=c.getContext('2d'),r=mulberry(4);g.fillStyle='#b8b4ac';g.fillRect(0,0,S,S);
  for(let i=0;i<3000;i++){const v=150+r()*50|0;g.fillStyle=`rgba(${v},${v-3},${v-8},.35)`;g.fillRect(r()*S,r()*S,2,2)}
  g.strokeStyle='rgba(60,58,54,.5)';g.lineWidth=2;g.strokeRect(0,0,S,S);g.beginPath();g.moveTo(S/2,0);g.lineTo(S/2,S);g.moveTo(0,S/2);g.lineTo(S,S/2);g.stroke();return tex(c)}

/* ================= GEOMETRY BUILDER ================= */
const _c=new T3.Color();
function LC(hex){_c.set(hex);return[_c.r,_c.g,_c.b]}
class GB{
  constructor(){this.p=[];this.n=[];this.c=[];this.u=[];this.i=[];this.vc=0}
  v(x,y,z,nx,ny,nz,col,u,v){this.p.push(x,y,z);this.n.push(nx,ny,nz);this.c.push(col[0],col[1],col[2]);this.u.push(u,v);return this.vc++}
  quad(a,b,c,d,nx,ny,nz,col,uv){ // a,b,c,d arrays [x,y,z]; uv array of 4 [u,v]
    const i0=this.v(a[0],a[1],a[2],nx,ny,nz,col,uv[0][0],uv[0][1]),i1=this.v(b[0],b[1],b[2],nx,ny,nz,col,uv[1][0],uv[1][1]),
          i2=this.v(c[0],c[1],c[2],nx,ny,nz,col,uv[2][0],uv[2][1]),i3=this.v(d[0],d[1],d[2],nx,ny,nz,col,uv[3][0],uv[3][1]);
    this.i.push(i0,i1,i2,i0,i2,i3)}
  tri(a,b,c,nx,ny,nz,col,uv){const i0=this.v(a[0],a[1],a[2],nx,ny,nz,col,uv[0][0],uv[0][1]),i1=this.v(b[0],b[1],b[2],nx,ny,nz,col,uv[1][0],uv[1][1]),i2=this.v(c[0],c[1],c[2],nx,ny,nz,col,uv[2][0],uv[2][1]);this.i.push(i0,i1,i2)}
  // axis-aligned box. o: {col,roof,wall(tile size or 0),uo,vo,nobot,notop,y0}
  box(x0,y0,z0,x1,y1,z1,col,o){o=o||{};col=typeof col==='string'?LC(col):col;const rc=o.roof?(typeof o.roof==='string'?LC(o.roof):o.roof):col;
    const T=o.wall||0,uo=o.uo||0,vo=o.vo||0,yb=o.y0!==undefined?o.y0:y0,PT=[.006,.006];
    const uvX=(z)=>T?(z-z0)/T[0]+uo:.006,uvZ=(x)=>T?(x-x0)/T[0]+uo:.006,vv=(y)=>T?(y-yb)/T[1]+vo:.006;
    const f=(a,b,c,d,nx,ny,nz,uv,cc)=>this.quad(a,b,c,d,nx,ny,nz,cc||col,uv);
    f([x1,y0,z1],[x1,y0,z0],[x1,y1,z0],[x1,y1,z1],1,0,0,[[uvX(z1),vv(y0)],[uvX(z0),vv(y0)],[uvX(z0),vv(y1)],[uvX(z1),vv(y1)]]);
    f([x0,y0,z0],[x0,y0,z1],[x0,y1,z1],[x0,y1,z0],-1,0,0,[[uvX(z0),vv(y0)],[uvX(z1),vv(y0)],[uvX(z1),vv(y1)],[uvX(z0),vv(y1)]]);
    f([x0,y0,z1],[x1,y0,z1],[x1,y1,z1],[x0,y1,z1],0,0,1,[[uvZ(x0),vv(y0)],[uvZ(x1),vv(y0)],[uvZ(x1),vv(y1)],[uvZ(x0),vv(y1)]]);
    f([x1,y0,z0],[x0,y0,z0],[x0,y1,z0],[x1,y1,z0],0,0,-1,[[uvZ(x1),vv(y0)],[uvZ(x0),vv(y0)],[uvZ(x0),vv(y1)],[uvZ(x1),vv(y1)]]);
    if(!o.notop)f([x0,y1,z1],[x1,y1,z1],[x1,y1,z0],[x0,y1,z0],0,1,0,[PT,PT,PT,PT],rc);
    if(o.bot)f([x0,y0,z0],[x1,y0,z0],[x1,y0,z1],[x0,y0,z1],0,-1,0,[PT,PT,PT,PT],col)}
  // box by centre/size
  bx(cx,cy,cz,sx,sy,sz,col,o){this.box(cx-sx/2,cy-sy/2,cz-sz/2,cx+sx/2,cy+sy/2,cz+sz/2,col,o)}
  // gable roof: footprint x0..x1,z0..z1 base y, ridge along axis ('x'|'z')
  gable(x0,z0,x1,z1,y,h,col,ax,over){over=over||.4;const cx=(x0+x1)/2,cz=(z0+z1)/2,PT=[[.006,.006],[.006,.006],[.006,.006],[.006,.006]];col=typeof col==='string'?LC(col):col;
    if(ax==='x'){const a=x0-over,b=x1+over,za=z0-over,zb=z1+over,L=Math.hypot(h,zb-cz),nz=h/L,ny=(zb-cz)/L;
      this.quad([a,y,zb],[b,y,zb],[b,y+h,cz],[a,y+h,cz],0,ny,nz,col,PT);this.quad([b,y,za],[a,y,za],[a,y+h,cz],[b,y+h,cz],0,ny,-nz,col,PT);
      const gc=[col[0]*.85,col[1]*.85,col[2]*.85];this.tri([x1,y,z1],[x1,y,z0],[x1,y+h,cz],1,0,0,gc,PT.slice(0,3));this.tri([x0,y,z0],[x0,y,z1],[x0,y+h,cz],-1,0,0,gc,PT.slice(0,3))}
    else{const a=z0-over,b=z1+over,xa=x0-over,xb=x1+over,L=Math.hypot(h,xb-cx),nx=h/L,ny=(xb-cx)/L;
      this.quad([xb,y,b],[xb,y,a],[cx,y+h,a],[cx,y+h,b],nx,ny,0,col,PT);this.quad([xa,y,a],[xa,y,b],[cx,y+h,b],[cx,y+h,a],-nx,ny,0,col,PT);
      const gc=[col[0]*.85,col[1]*.85,col[2]*.85];this.tri([x0,y,z1],[x1,y,z1],[cx,y+h,z1],0,0,1,gc,PT.slice(0,3));this.tri([x1,y,z0],[x0,y,z0],[cx,y+h,z0],0,0,-1,gc,PT.slice(0,3))}}
  // merge a three geometry with a matrix and colour
  geo(g,m,col){col=typeof col==='string'?LC(col):col;const pa=g.attributes.position,na=g.attributes.normal,ua=g.attributes.uv,base=this.vc,v=new T3.Vector3(),nm=new T3.Matrix3().getNormalMatrix(m);
    for(let i=0;i<pa.count;i++){v.fromBufferAttribute(pa,i).applyMatrix4(m);const nn=new T3.Vector3().fromBufferAttribute(na,i).applyMatrix3(nm).normalize();this.v(v.x,v.y,v.z,nn.x,nn.y,nn.z,col,.006,.006)}
    if(g.index){for(let i=0;i<g.index.count;i++)this.i.push(base+g.index.array[i])}else for(let i=0;i<pa.count;i++)this.i.push(base+i)}
  build(){const g=new T3.BufferGeometry();g.setAttribute('position',new T3.Float32BufferAttribute(this.p,3));g.setAttribute('normal',new T3.Float32BufferAttribute(this.n,3));g.setAttribute('color',new T3.Float32BufferAttribute(this.c,3));g.setAttribute('uv',new T3.Float32BufferAttribute(this.u,2));
    g.setIndex(this.vc>65535?new T3.Uint32BufferAttribute(this.i,1):new T3.Uint16BufferAttribute(this.i,1));g.computeBoundingSphere();g.computeBoundingBox();return g}
}
const _m4=new T3.Matrix4(),_q=new T3.Quaternion(),_e=new T3.Euler(),_s=new T3.Vector3(),_p=new T3.Vector3();
function mat4(x,y,z,rx,ry,rz,sx,sy,sz){_e.set(rx||0,ry||0,rz||0);_q.setFromEuler(_e);_s.set(sx===undefined?1:sx,sy===undefined?1:sy,sz===undefined?1:sz);_p.set(x,y,z);return new T3.Matrix4().compose(_p,_q,_s)}

/* ================= MATERIALS ================= */
const WT=winTextures(), ST=shopTextures();
const stdMats=[];
function std(o,env){const m=new T3.MeshStandardMaterial(o);m.userData.env=env===undefined?1:env;stdMats.push(m);return m}
const M={
  win:std({vertexColors:true,map:WT.map,emissiveMap:WT.emi,emissive:0xffffff,emissiveIntensity:0,roughness:.5,metalness:.12}),
  shop:std({vertexColors:true,map:ST.map,emissiveMap:ST.emi,emissive:0xffffff,emissiveIntensity:0,roughness:.5,metalness:.1}),
  plain:std({vertexColors:true,roughness:.88,metalness:0}),
  neon:new T3.MeshBasicMaterial({vertexColors:true,toneMapped:false}),
  road:std({map:asphaltTex(),roughness:.92,metalness:0,color:0xffffff}),
  mark:std({vertexColors:true,roughness:.8,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2}),
  side:std({map:concreteTex(),roughness:.95,color:0xffffff}),
  grass:std({map:grassTex(),roughness:1,color:0xffffff}),
  carPaintCache:{},
};
M.road.map.repeat.set(1,1);
const DECALS=[];

/* ================= SKY / LIGHT / TIME ================= */
const sunLight=new T3.DirectionalLight(0xffffff,3);
sunLight.castShadow=true;
sunLight.shadow.mapSize.set(MOBILE?1024:2048,MOBILE?1024:2048);
const sc=sunLight.shadow.camera;sc.left=-60;sc.right=60;sc.top=60;sc.bottom=-60;sc.near=1;sc.far=400;
sunLight.shadow.bias=-0.0006;sunLight.shadow.normalBias=.5;
scene.add(sunLight);scene.add(sunLight.target);
const hemi=new T3.HemisphereLight(0x9ec4ff,0x444433,.8);scene.add(hemi);
scene.fog=new T3.Fog(0xaaccee,MOBILE?90:140,MOBILE?420:900);
const NOISE=noiseTex(128);
const skyUniforms={uTop:{value:new T3.Color()},uHor:{value:new T3.Color()},uSun:{value:new T3.Vector3(0,1,0)},uSunCol:{value:new T3.Color()},uNight:{value:0},uTime:{value:0},uNoise:{value:NOISE},uCloud:{value:.6}};
const sky=new T3.Mesh(new T3.SphereGeometry(2200,32,16),new T3.ShaderMaterial({uniforms:skyUniforms,side:T3.BackSide,depthWrite:false,fog:false,
  vertexShader:`varying vec3 vD;void main(){vD=position;vec4 p=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*p;gl_Position.z=gl_Position.w*.9999;}`,
  fragmentShader:`varying vec3 vD;uniform vec3 uTop,uHor,uSun,uSunCol;uniform float uNight,uTime,uCloud;uniform sampler2D uNoise;
  float h21(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
  void main(){vec3 d=normalize(vD);float h=clamp(d.y,0.,1.);
   vec3 col=mix(uHor,uTop,pow(h,.5));
   float s=max(dot(d,uSun),0.);
   col+=uSunCol*(pow(s,700.)*6.+pow(s,30.)*.5+pow(s,5.)*.18);
   float below=smoothstep(0.,-.08,d.y);col=mix(col,uHor*.8,below);
   if(d.y>0.){vec2 p=d.xz/(d.y+.12)*.35+vec2(uTime*.003,uTime*.0012);float n=texture2D(uNoise,p).r*.62+texture2D(uNoise,p*2.7+.31).r*.3+texture2D(uNoise,p*6.1).r*.12;
    float c=smoothstep(.62-uCloud*.16,.9,n)*smoothstep(0.,.18,d.y);
    vec3 cc=mix(uHor*1.15+vec3(.05),vec3(1.),.55)*(1.-uNight*.85);col=mix(col,cc,c*.85);col-=c*.06*vec3(1.,.9,.8)*(1.-uNight);}
   if(uNight>0.01&&d.y>0.){vec2 g=floor(d.xz/(d.y+.3)*90.);float r=h21(g);float st=step(.985,r)*(.5+.5*h21(g+3.));col+=vec3(st)*uNight*smoothstep(.05,.3,d.y);}
   gl_FragColor=vec4(col,1.);
   #include <tonemapping_fragment>
   #include <encodings_fragment>
  }`}));
sky.renderOrder=-10;sky.frustumCulled=false;scene.add(sky);
// keyframes: hour, zenith, horizon, sunlight colour, sun intensity, hemi sky, hemi ground, hemi intensity, exposure
const KEYS=[
 [0,'#050816','#0d1530','#6d86d6',.35,'#1d2b5a','#090b14',.55,1.15],
 [5,'#0b1233','#2a2f55','#8da0e0',.3,'#252f66','#0a0c14',.55,1.15],
 [6.3,'#35508f','#ff9a68','#ffb27c',1.6,'#8a96c8','#3a3028',.7,1.0],
 [8,'#3c78c8','#f0d6b8','#fff0d8',2.6,'#9fc3f0','#5a5444',.8,1.0],
 [12,'#2c74d2','#b8daf8','#fff8ee',3.1,'#a5caf5','#645e50',.9,.95],
 [16,'#3a7fd0','#cfe2f0','#ffeed2',2.9,'#a5c8f0','#645a48',.85,.95],
 [18,'#4a6cb0','#ffad66','#ffa862',2.3,'#9aa8d8','#4a3a2c',.75,1.0],
 [19.4,'#232c68','#d4607a','#ff7a55',.6,'#4a4c90','#2a2030',.6,1.1],
 [21,'#070b20','#121c3c','#6d86d6',.35,'#1d2b5a','#090b14',.55,1.15],
 [24,'#050816','#0d1530','#6d86d6',.35,'#1d2b5a','#090b14',.55,1.15]];
const KC=KEYS.map(k=>[k[0],new T3.Color(k[1]),new T3.Color(k[2]),new T3.Color(k[3]),k[4],new T3.Color(k[5]),new T3.Color(k[6]),k[7],k[8]]);
const ENV={hour:17.2,dark:0,sunEl:.3,sunDir:new T3.Vector3(0,1,0),rain:0,theme:{tint:new T3.Color(1,1,1),fogMul:1}};
const _t1=new T3.Color(),_t2=new T3.Color();
function applyTime(h){
  h=((h%24)+24)%24;let i=0;while(i<KC.length-2&&h>=KC[i+1][0])i++;const a=KC[i],b=KC[i+1],t=smooth(0,1,(h-a[0])/(b[0]-a[0]));
  const L=(ia)=>{_t1.copy(a[ia]).lerp(b[ia],t);return _t1};
  skyUniforms.uTop.value.copy(L(1)).multiply(ENV.theme.tint);skyUniforms.uHor.value.copy(L(2)).multiply(ENV.theme.tint);skyUniforms.uSunCol.value.copy(L(3));
  const el=Math.sin(clamp((h-6)/12,-.5,1.5)*Math.PI);ENV.sunEl=el;
  const sx=Math.cos((h-6)/12*Math.PI)*.9,sy=Math.sin((h-6)/12*Math.PI),sz=.35*Math.cos((h-6)/12*Math.PI)+.25;
  ENV.sunDir.set(sx,sy,sz).normalize();skyUniforms.uSun.value.copy(ENV.sunDir);
  ENV.dark=1-smooth(-.02,.2,ENV.sunDir.y);skyUniforms.uNight.value=ENV.dark;
  const rainDim=1-ENV.rain*.35;
  const inten=lerp(a[4],b[4],t)*rainDim;
  const dir=ENV.sunDir.y>.03?ENV.sunDir:new T3.Vector3(-.5,.8,.3).normalize();
  sunLight.color.copy(L(3));sunLight.intensity=inten*(ENV.sunDir.y>.03?1:1);
  sunLight.userData.dir=dir;
  hemi.color.copy(L(5)).multiply(ENV.theme.tint);hemi.groundColor.copy(L(6));hemi.intensity=lerp(a[7],b[7],t)*(1-ENV.rain*.1);
  renderer.toneMappingExposure=lerp(a[8],b[8],t);
  // fog from horizon colour
  scene.fog.color.copy(skyUniforms.uHor.value).lerp(new T3.Color(.5,.5,.55),ENV.rain*.5);
  scene.fog.far=(MOBILE?520:980)*lerp(1,.45,ENV.rain)*ENV.theme.fogMul;scene.fog.near=lerp(90,20,ENV.rain);
  skyUniforms.uCloud.value=.5+ENV.rain*.8;
  const d=ENV.dark;
  M.win.emissiveIntensity=d*1.5;M.shop.emissiveIntensity=d*1.7+.0;
  if(typeof CITY!=='undefined'&&CITY.signMats)CITY.signMats.forEach(m=>m.color.setScalar(.5+.5*d));
  M.neon.color.setScalar(.38+.62*d+ (ENV.dark<.1?0:0));
  const envI=lerp(.25,1,1-d)*(1-ENV.rain*.4);stdMats.forEach(m=>{m.envMapIntensity=m.userData.env*envI});
  DECALS.forEach(m=>m.opacity=m.userData.base*d);
}
function followSun(px,pz){const d=sunLight.userData.dir||ENV.sunDir;sunLight.target.position.set(px,0,pz);sunLight.position.set(px+d.x*160,d.y*160,pz+d.z*160);sunLight.target.updateMatrixWorld()}

/* ---- environment map (reflections) ---- */
let ENVTEX=null;
function makeEnv(){
  const pm=new T3.PMREMGenerator(renderer);const es=new T3.Scene();
  const m=sky.material.clone();m.uniforms=Object.assign({},skyUniforms);m.uniforms.uTop={value:new T3.Color('#3a6fc0')};m.uniforms.uHor={value:new T3.Color('#f2d6b4')};m.uniforms.uSunCol={value:new T3.Color('#ffd9a0')};m.uniforms.uSun={value:new T3.Vector3(.6,.45,.4).normalize()};m.uniforms.uNight={value:0};m.uniforms.uCloud={value:.5};
  const s=new T3.Mesh(new T3.SphereGeometry(50,24,12),m);es.add(s);
  const rt=pm.fromScene(es,0,.1,200);ENVTEX=rt.texture;scene.environment=ENVTEX;pm.dispose();m.dispose()}

/* ================= THEMES (countries) ================= */
const THEMES=[
 {n:'Lagos',f:'🇳🇬',cost:0,seed:1,walls:['#e8c26a','#d98b4a','#c9b79c','#e7e0d0','#b5654a','#7aa6a0','#f0dfa8'],glass:['#4b6d86','#5f8aa0','#3d5568'],roof:['#8a4b3a','#6b4a3a','#7a7a76'],grass:'#6f9a4a',ground:'#7a8f4a',tree:'palm',tint:[1,.98,.93],hgt:.85,neon:1,land:'theatre',d:'Tunde',
  fx:["Lagos is Nigeria's biggest city, but the capital is Abuja (since 1991).","Nigeria has more than 250 ethnic groups. Hausa, Yoruba and Igbo are the largest.","Third Mainland Bridge in Lagos is about 11.8 km long.","Nollywood is one of the biggest film industries in the world by number of films."]},
 {n:'London',f:'🇬🇧',cost:300,seed:2,walls:['#a85a4e','#8e4a42','#c9876f','#6e6a7a','#9c8f7e','#b8a58a'],glass:['#5c6f80','#7b8a96'],roof:['#4a4a52','#5a4a44'],grass:'#4f8a5e',ground:'#5f8a58',tree:'oak',tint:[.9,.94,1],hgt:.75,neon:.7,land:'clock',d:'Oliver',fogMul:.8,
  fx:["Big Ben is the name of the bell, not the clock tower.","The London Underground opened in 1863, the world's first metro.","London has hosted the Olympics three times: 1908, 1948 and 2012."]},
 {n:'Tokyo',f:'🇯🇵',cost:700,seed:3,walls:['#d9d9ee','#e8dcd0','#b7bfd6','#8a8fa6','#f0c4d6','#c8ced8'],glass:['#5a6a90','#6a7aa8','#46557a'],roof:['#55566a','#6a6a78'],grass:'#6aa77a',ground:'#6a8a70',tree:'sakura',tint:[.98,.96,1.02],hgt:1.05,neon:1.6,land:'redtower',d:'Kenji',
  fx:["Greater Tokyo is home to about 37 million people.","Tokyo was called Edo until 1868.","Japan's trains are famous for arriving within seconds of the schedule."]},
 {n:'Rio',f:'🇧🇷',cost:1200,seed:4,walls:['#ffd23f','#2fd6a0','#ff8a3d','#5ab8ff','#f2f2e6','#ff7ab0','#c58bff'],glass:['#4a7a8a','#5a9aa0'],roof:['#b5563a','#8a4b3a'],grass:'#3fae6a',ground:'#4a9a58',tree:'palm',tint:[1.02,1,.94],hgt:.8,neon:1.2,land:'statue',d:'Rafa',
  fx:["Rio's Carnival is one of the biggest street festivals on Earth.","Christ the Redeemer is 30 metres tall and stands on Corcovado mountain.","Rio hosted the 2016 Olympic Games."]},
 {n:'New York',f:'🇺🇸',cost:2000,seed:5,walls:['#7e8ca6','#5e6c88','#9aa7be','#a8765a','#c9c2b4','#8a6a58'],glass:['#4a566e','#5a6a88','#38465e'],roof:['#4a4a52','#555560'],grass:'#5a7d62',ground:'#5f7a60',tree:'oak',tint:[.96,.98,1.02],hgt:1.25,neon:1.1,land:'liberty',d:'Vinny',
  fx:["More than 800 languages are spoken in New York City.","The Statue of Liberty was a gift from France in 1886.","Central Park covers about 3.4 square kilometres."]},
 {n:'Dubai',f:'🇦🇪',cost:3200,seed:6,walls:['#f2e2b8','#e0c387','#cfa860','#fff1cc','#d8d0c0','#b8c4cc'],glass:['#4a8aa8','#5aa0c0','#3a7090','#8ab4c8'],roof:['#c9b790','#aaa090'],grass:'#8aa05a',ground:'#d9b776',tree:'palm',tint:[1.05,1,.9],hgt:1.45,neon:1.3,land:'burj',d:'Omar',fogMul:.9,
  fx:["The Burj Khalifa is the tallest building on Earth at 828 metres.","Dubai grew from a fishing and pearl-diving town into a global hub.","Dubai is part of the UAE, whose capital is Abu Dhabi."]}];
let TH=THEMES[0];
const NEONS=['#ff3d81','#35e0ff','#ffd23f','#7dff6a','#ff8a3d','#b266ff'];

/* ================= SPATIAL COLLIDERS ================= */
const CG=32;let colBoxes=new Map(),colCircs=new Map();
function ckey(i,j){return i*4096+j}
function colAddBox(x0,z0,x1,z1,h,tag){const b={x0,z0,x1,z1,h,tag};for(let i=Math.floor(x0/CG);i<=Math.floor(x1/CG);i++)for(let j=Math.floor(z0/CG);j<=Math.floor(z1/CG);j++){const k=ckey(i+100,j+100);let a=colBoxes.get(k);if(!a)colBoxes.set(k,a=[]);a.push(b)}}
function colAddCirc(x,z,r,h,tag){const c={x,z,r,h,tag};const k=ckey(Math.floor(x/CG)+100,Math.floor(z/CG)+100);let a=colCircs.get(k);if(!a)colCircs.set(k,a=[]);a.push(c)}
function colQuery(x,z,r,map,cb){const i0=Math.floor((x-r)/CG),i1=Math.floor((x+r)/CG),j0=Math.floor((z-r)/CG),j1=Math.floor((z+r)/CG);for(let i=i0;i<=i1;i++)for(let j=j0;j<=j1;j++){const a=map.get(ckey(i+100,j+100));if(a)for(let q=0;q<a.length;q++)cb(a[q])}}

/* ================= CITY STATE ================= */
const CITY={group:new T3.Group(),chunks:[],dyn:[],pois:[],closed:new Set(),signs:[],landmark:null,minimap:null};
scene.add(CITY.group);
const AIR={gx0:14,gx1:19,gz0:0,gz1:1};
const inAir=(gx,gz)=>gx>=AIR.gx0&&gx<=AIR.gx1&&gz>=AIR.gz0&&gz<=AIR.gz1;
const nodeClosed=(i,j)=>i>=AIR.gx0+1&&i<=AIR.gx1&&j===1; // road intersections inside airport
const POIDEF=[
 {id:'home',n:'Home',ic:'🏠',gx:8,gz:9,face:'s',col:'#2fd6a0'},
 {id:'mall',n:'Boutique Mall',ic:'🛍️',gx:10,gz:9,face:'w',col:'#ff7ab6'},
 {id:'hotel',n:'Grand Hotel',ic:'🏨',gx:9,gz:8,face:'s',col:'#c58bff'},
 {id:'rest',n:'Restaurant',ic:'🍽️',gx:11,gz:9,face:'n',col:'#ff9f43'},
 {id:'hosp',n:'Hospital',ic:'🏥',gx:12,gz:7,face:'w',col:'#ff4f5e'},
 {id:'deal',n:'Car Dealer',ic:'🚘',gx:7,gz:11,face:'e',col:'#5ab8ff'},
 {id:'police',n:'Police',ic:'🚓',gx:11,gz:12,face:'n',col:'#5a7bff'},
 {id:'club',n:'Night Club',ic:'🪩',gx:9,gz:9,face:'e',col:'#ff3d81'},
 {id:'arena',n:'Fight Arena',ic:'🥊',gx:13,gz:10,face:'w',col:'#ffc92b'},
 {id:'park',n:'Central Park',ic:'🌳',gx:9,gz:10,face:'n',col:'#6fd66a'},
 {id:'beach',n:'Beach Club',ic:'🏖️',gx:3,gz:17,face:'e',col:'#35e0ff'},
 {id:'land',n:'Landmark',ic:'🗼',gx:10,gz:10,face:'s',col:'#ffd23f'},
 {id:'air',n:'Airport',ic:'✈️',gx:17,gz:2,face:'s',col:'#9ad0ff'}];
function zoneOf(gx,gz){if(inAir(gx,gz))return'air';const d=Math.hypot(gx-9.5,gz-9.5);
  if(d<3.3)return'down';if(d<6.3)return'midhi';if(gx<=3)return'old';if(gz<=3||gx>=16)return'hill';if(gz>=16)return'marina';return'mid'}
const ZONE_NAMES={down:'Downtown',midhi:'Midtown',old:'Old Harbour',hill:'Hillside',marina:'Marina Bay',mid:'Central Heights',air:'Airport'};
function districtAt(x,z){const gx=clamp(Math.floor((x+HALF)/PITCH),0,N-1),gz=clamp(Math.floor((z+HALF)/PITCH),0,N-1);return ZONE_NAMES[zoneOf(gx,gz)]}
function poiPos(p){ // entrance marker on the sidewalk of the block
  const bx=bcx(p.gx),bz=bcx(p.gz),o=BLK/2-SW/2;
  const f={n:[0,-o],s:[0,o],e:[o,0],w:[-o,0]}[p.face];return{x:bx+f[0],z:bz+f[1]}}

/* ================= TREE / PROP MODELS ================= */
function treeGeo(kind){const g=new GB();
  const brown=[.17,.1,.05];
  if(kind==='palm'){
    let x=0,z=0;for(let s=0;s<5;s++){const r0=.28-s*.03,r1=.28-(s+1)*.03,y0=s*1.6,y1=(s+1)*1.6;const nx=x+.12+s*.05;
      const cg=new T3.CylinderGeometry(r1,r0,1.62,5,1,true);g.geo(cg,mat4((x+nx)/2,(y0+y1)/2,0,0,0,(nx-x)*-.4),s%2?'#7a5a3a':'#6a4b2e');x=nx}
    const top=[x,8,0];const fr=['#3f8f3a','#4aa042','#357a30'];
    for(let k=0;k<9;k++){const a=k/9*TAU,len=3.6+((k*7)%3)*.35,dx=Math.cos(a),dz=Math.sin(a);
      const p0=[top[0],top[1],top[2]],p1=[top[0]+dx*len*.55,top[1]+.9,top[2]+dz*len*.55],p2=[top[0]+dx*len,top[1]-.8,top[2]+dz*len];
      const px=-dz*.55,pz=dx*.55,col=LC(fr[k%3]);const m1=[(p1[0]),p1[1],(p1[2])];
      g.tri(p0,[p1[0]+px,p1[1],p1[2]+pz],[p1[0]-px,p1[1],p1[2]-pz],0,1,0,col,[[0,0],[0,0],[0,0]]);
      g.tri([p1[0]+px,p1[1],p1[2]+pz],p2,[p1[0]-px,p1[1],p1[2]-pz],0,1,0,col,[[0,0],[0,0],[0,0]]);
      g.tri(p0,[p1[0]-px,p1[1],p1[2]-pz],[p1[0]+px,p1[1],p1[2]+pz],0,-1,0,col,[[0,0],[0,0],[0,0]]);
      g.tri([p1[0]+px,p1[1],p1[2]+pz],[p1[0]-px,p1[1],p1[2]-pz],p2,0,-1,0,col,[[0,0],[0,0],[0,0]])}
    g.geo(new T3.IcosahedronGeometry(.28,0),mat4(x,7.8,0),'#5a3a1a');
  }else{
    const leaf=kind==='sakura'?['#f2a2c0','#ffc0d6','#e88aae']:['#3f7a38','#4d8f40','#35692f'];
    g.geo(new T3.CylinderGeometry(.22,.32,3.4,6,1),mat4(0,1.7,0),'#5a4030');
    const bl=[[0,5,0,2.5],[1.3,4.2,.4,1.8],[-1.2,4.4,-.5,1.9],[.2,6.2,.3,1.6],[-.3,4.0,1.3,1.6]];
    bl.forEach((b,i)=>g.geo(new T3.IcosahedronGeometry(b[3],1),mat4(b[0],b[1],b[2],i,i*2,0,1,.85,1),leaf[i%3]))}
  return g.build()}
const TREE_MAT=std({vertexColors:true,roughness:.85,side:T3.DoubleSide});
const TREE_GEO={};
['palm','oak','sakura'].forEach(k=>TREE_GEO[k]=null);
function getTreeGeo(k){return TREE_GEO[k]||(TREE_GEO[k]=treeGeo(k))}
const GLOW_TEX=(()=>{const c=mkCanvas(64,64),g=c.getContext('2d'),gr=g.createRadialGradient(32,32,0,32,32,32);gr.addColorStop(0,'rgba(255,220,150,.9)');gr.addColorStop(.4,'rgba(255,200,120,.35)');gr.addColorStop(1,'rgba(255,200,120,0)');g.fillStyle=gr;g.fillRect(0,0,64,64);const t=new T3.CanvasTexture(c);t.colorSpace=T3.SRGBColorSpace;return t})();
const M_DECAL=new T3.MeshBasicMaterial({map:GLOW_TEX,transparent:true,depthWrite:false,blending:T3.AdditiveBlending,opacity:0,fog:true,polygonOffset:true,polygonOffsetFactor:-4,polygonOffsetUnits:-4});M_DECAL.userData.base=.85;DECALS.push(M_DECAL);

/* ================= BUILDING BUILDERS ================= */
let A=null; // current chunk accumulator
function snap3(v){return Math.max(9,Math.round(v/3)*3)}
function roofDetails(a,x0,z0,x1,z1,y,r,big){
  const w=x1-x0,d=z1-z0,pc=LC('#9a9a98');
  const p=.7;[[x0,z0,x1,z0+p],[x0,z1-p,x1,z1],[x0,z0,x0+p,z1],[x1-p,z0,x1,z1]].forEach(q=>a.plain.box(q[0],y,q[1],q[2],y+.9,q[3],'#a8a8a4',{}));
  const n=big?1+Math.floor(r()*2):2+Math.floor(r()*4);
  for(let i=0;i<n;i++){const sx=3+r()*3,sz=3+r()*3,px=x0+2+r()*Math.max(0,w-sx-4),pz=z0+2+r()*Math.max(0,d-sz-4);
    if(r()<.55)a.plain.box(px,y,pz,px+sx,y+1.4+r()*1.2,pz+sz,r()<.5?'#8a8d90':'#b5b5b0',{});
    else a.plain.geo(new T3.CylinderGeometry(1.4,1.4,3,8),mat4(px+1.5,y+1.5+.2,pz+1.5),'#7a5a3a')}
}
function neonSign(a,x,y,z,w,h,face,col,r){const c=col||pick(NEONS,r);const o=.12;
  if(face==='n')a.neon.box(x-w/2,y,z-o,x+w/2,y+h,z,c,{notop:true});else if(face==='s')a.neon.box(x-w/2,y,z,x+w/2,y+h,z+o,c,{notop:true});
  else if(face==='w')a.neon.box(x-o,y,z-w/2,x,y+h,z+w/2,c,{notop:true});else a.neon.box(x,y,z-w/2,x+o,y+h,z+w/2,c,{notop:true})}
function mkBuilding(x0,z0,x1,z1,floors,r,kind,opt){opt=opt||{};
  const w=snap3(x1-x0),d=snap3(z1-z0),cx=(x0+x1)/2,cz=(z0+z1)/2;x0=cx-w/2;x1=cx+w/2;z0=cz-d/2;z1=cz+d/2;
  const shop=opt.shop!==undefined?opt.shop:(kind!=='house'&&r()<.85),sh=shop?4.4:0,FH=3.5;
  const glass=kind==='glass',col=opt.col||(glass?pick(TH.glass,r):pick(TH.walls,r)),uo=Math.floor(r()*8)/8,vo=Math.floor(r()*8)/8;
  let topY=sh+floors*FH;
  if(shop){A.shop.box(x0-.3,0,z0-.3,x1+.3,sh,z1+.3,'#f4f1ea',{wall:[8,4.4],roof:'#b8b4ac'});
    const ns=Math.floor(r()*3);for(let i=0;i<ns;i++){const f=pick(['n','s','e','w'],r);const sw=3+r()*4;
      if(f==='n'||f==='s')neonSign(A,x0+sw/2+r()*(w-sw),sh+.2,f==='n'?z0-.3:z1+.3,sw,.9,f,null,r);else neonSign(A,f==='w'?x0-.3:x1+.3,sh+.2,z0+sw/2+r()*(d-sw),sw,.9,f,null,r)}}
  const tiers=(floors>=22&&r()<.9)?3:(floors>=12&&r()<.5?2:1);let ax0=x0,ax1=x1,az0=z0,az1=z1,y=sh;
  const fl=[tiers===1?floors:Math.round(floors*(tiers===3?.55:.65)),0,0];fl[1]=tiers>1?Math.round((floors-fl[0])*(tiers===3?.65:1)):0;fl[2]=floors-fl[0]-fl[1];
  for(let t=0;t<tiers;t++){const f=fl[t];if(f<=0)continue;const hgt=f*FH;
    A.win.box(ax0,y,az0,ax1,y+hgt,az1,col,{wall:[24,28],uo,vo,y0:sh,roof:glass?'#8a9298':'#9a9894'});y+=hgt;
    if(t<tiers-1){const inx=snap3((ax1-ax0)*.18)/2||1.5,inz=snap3((az1-az0)*.18)/2||1.5;ax0+=Math.max(3,inx);ax1-=Math.max(3,inx);az0+=Math.max(3,inz);az1-=Math.max(3,inz);}}
  topY=y;
  roofDetails(A,ax0,az0,ax1,az1,topY,r,floors>12);
  if(floors>=26){const hh=14+r()*26;A.plain.box((ax0+ax1)/2-.4,topY,(az0+az1)/2-.4,(ax0+ax1)/2+.4,topY+hh,(az0+az1)/2+.4,'#8a8a8a',{});A.neon.box((ax0+ax1)/2-.5,topY+hh,(az0+az1)/2-.5,(ax0+ax1)/2+.5,topY+hh+1,(az0+az1)/2+.5,'#ff2a2a',{})}
  colAddBox(x0-.3,z0-.3,x1+.3,z1+.3,topY,'b');
  return{x0,z0,x1,z1,top:topY}}
function mkHouse(x0,z0,x1,z1,r,rich){
  const fl=rich?(1+Math.floor(r()*2)):(1+Math.floor(r()*2)),w=snap3(x1-x0)-(rich?0:0),d=snap3(z1-z0),cx=(x0+x1)/2,cz=(z0+z1)/2;
  x0=cx-w/2;x1=cx+w/2;z0=cz-d/2;z1=cz+d/2;const col=pick(TH.walls,r),h=fl*3.5,uo=Math.floor(r()*8)/8;
  A.win.box(x0,0,z0,x1,h,z1,col,{wall:[24,28],uo,vo:Math.floor(r()*8)/8,roof:col});
  const rc=pick(TH.roof,r),ax=w>=d?'x':'z';
  A.plain.gable(x0,z0,x1,z1,h,2.6+r()*1.4,rc,ax,.5);
  A.plain.box(x0+w*.2,h,z0+d*.3,x0+w*.2+.9,h+3.6,z0+d*.3+.9,'#8a6a5a',{});
  // door
  A.plain.box(cx-.8,0,z1,cx+.8,2.3,z1+.12,'#3b2a22',{});A.plain.box(cx+3,0,z1,cx+6.5,2.6,z1+.14,'#9a9a98',{});
  colAddBox(x0,z0,x1,z1,h+3,'b');return{x0,z0,x1,z1,top:h}}
function fenceLot(x0,z0,x1,z1,col){const t=.35,h=1.9;A.plain.box(x0,0,z0,x1,h,z0+t,col,{});A.plain.box(x0,0,z1-t,x1,h,z1,col,{});A.plain.box(x0,0,z0,x0+t,h,z1,col,{});A.plain.box(x1-t,0,z0,x1,h,z1,col,{});
  colAddBox(x0,z0,x1,z0+t,h,'f');colAddBox(x0,z1-t,x1,z1,h,'f');colAddBox(x0,z0,x0+t,z1,h,'f');colAddBox(x1-t,z0,x1,z1,h,'f')}
function addTree(chunk,x,z,kind,s,r){chunk.trees.push({x,z,k:kind,s:s||1,ry:r()*TAU});colAddCirc(x,z,.5*(s||1),9,'t')}
function addLamp(x,z,towardX,towardZ){ // pole at (x,z), arm toward road
  const dx=towardX,dz=towardZ;A.plain.box(x-.1,0,z-.1,x+.1,7,z+.1,'#3d4046',{});
  const ax=x+dx*1.8,az=z+dz*1.8;if(dx!==0)A.plain.box(Math.min(x,ax),6.8,z-.07,Math.max(x,ax),6.95,z+.07,'#3d4046',{});else A.plain.box(x-.07,6.8,Math.min(z,az),x+.07,6.95,Math.max(z,az),'#3d4046',{});
  A.neon.box(ax-.35,6.62,az-.35,ax+.35,6.78,az+.35,'#ffd9a0',{});
  const gx=x+dx*3.2,gz=z+dz*3.2;A.decal.quad([gx-7,.3,gz+7],[gx+7,.3,gz+7],[gx+7,.3,gz-7],[gx-7,.3,gz-7],0,1,0,[1,1,1],[[0,0],[1,0],[1,1],[0,1]]);
  colAddCirc(x,z,.3,7,'l')}
const CHK=PITCH*2;function chunkOf(x,z){const i=clamp(Math.floor((x+HALF)/CHK),0,9),j=clamp(Math.floor((z+HALF)/CHK),0,9);return CITY.chunks[i*10+j]}

/* ================= CITY GENERATION ================= */
const LOT=BLK-2*SW, UV0=[[0,0],[0,0],[0,0],[0,0]];
const ZEBRA=(()=>{const c=mkCanvas(128,64),g=c.getContext('2d');g.clearRect(0,0,128,64);g.fillStyle='#f2f2ee';for(let i=0;i<8;i++)g.fillRect(i*16+2,0,9,64);const t=new T3.CanvasTexture(c);t.colorSpace=T3.SRGBColorSpace;t.anisotropy=4;return t})();
M.zebra=std({map:ZEBRA,transparent:true,alphaTest:.4,roughness:.8,polygonOffset:true,polygonOffsetFactor:-3,polygonOffsetUnits:-3,depthWrite:false,vertexColors:false});
const LIGHT_GEO=new T3.PlaneGeometry(.6,.6);
const LIGHT_MAT=new T3.MeshBasicMaterial({toneMapped:false,side:T3.DoubleSide});
function lightPhase(i,j,t){const tt=(t+((i*5+j*3)%28)+28)%28;
  if(tt<11)return[2,0];if(tt<13)return[2,1];if(tt<14)return[2,2];if(tt<25)return[0,2];if(tt<27)return[1,2];return[2,2]} // [stateX,stateZ] 0 green 1 yellow 2 red
function signTex(text,fg,bg,w,h,fs){const c=mkCanvas(w||512,h||128),g=c.getContext('2d');g.fillStyle=bg||'#14122b';g.fillRect(0,0,c.width,c.height);g.strokeStyle=fg;g.lineWidth=6;g.strokeRect(6,6,c.width-12,c.height-12);
  g.fillStyle=fg;g.font='800 '+(fs||64)+'px "Barlow Condensed",Arial Narrow,Arial,sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText(text,c.width/2,c.height/2+4);const t=new T3.CanvasTexture(c);t.colorSpace=T3.SRGBColorSpace;t.anisotropy=4;return t}
function labelSign(text,fg,w,h,x,y,z,ry,bg){const m=new T3.MeshBasicMaterial({map:signTex(text,fg,bg,512,Math.round(512*h/w),Math.round(h/w*512*.55)),toneMapped:false});
  const mesh=new T3.Mesh(new T3.PlaneGeometry(w,h),m);mesh.position.set(x,y,z);mesh.rotation.y=ry;CITY.group.add(mesh);CITY.signMats.push(m);return mesh}
function frontRect(def,w,d){const bx=bcx(def.gx),bz=bcx(def.gz),L=BLK/2-SW-8;
  if(def.face==='s')return[bx-w/2,bz+L-d,bx+w/2,bz+L];if(def.face==='n')return[bx-w/2,bz-L,bx+w/2,bz-L+d];
  if(def.face==='e')return[bx+L-d,bz-w/2,bx+L,bz+w/2];return[bx-L,bz-w/2,bx-L+d,bz+w/2]}
const FACE_RY={s:0,n:Math.PI,e:Math.PI/2,w:-Math.PI/2};
function faceSignPos(def,rect,y,off){const[x0,z0,x1,z1]=rect,cx=(x0+x1)/2,cz=(z0+z1)/2;off=off||.6;
  if(def.face==='s')return[cx,y,z1+off];if(def.face==='n')return[cx,y,z0-off];if(def.face==='e')return[x1+off,y,cz];return[x0-off,y,cz]}
function disposeCity(){CITY.group.children.slice().forEach(o=>{CITY.group.remove(o);o.traverse&&o.traverse(k=>{if(k.geometry)k.geometry.dispose()})});CITY.chunks=[];CITY.signMats=[];CITY.pois=[];CITY.blocks=[];CITY.rects=[];colBoxes.clear();colCircs.clear()}

function genCity(ti){
  TH=THEMES[ti];ENV.theme.tint.setRGB(TH.tint[0],TH.tint[1],TH.tint[2]);ENV.theme.fogMul=TH.fogMul||1;
  disposeCity();const R=mulberry(TH.seed*7919+13);
  for(let i=0;i<100;i++)CITY.chunks.push({win:new GB(),shop:new GB(),plain:new GB(),neon:new GB(),mark:new GB(),zebra:new GB(),decal:new GB(),trees:[],i:Math.floor(i/10),j:i%10});CITY.byChunk=null;
  const slab=new GB(),lawn=new GB(),paved=new GB();
  const top=(gb,x0,z0,x1,z1,y,col,u)=>gb.quad([x0,y,z1],[x1,y,z1],[x1,y,z0],[x0,y,z0],0,1,0,col,[[x0/u,z1/u],[x1/u,z1/u],[x1/u,z0/u],[x0/u,z0/u]]);
  const WHITE=[1,1,1],gcol=LC(TH.grass),sandc=LC('#cdb98a');
  const pois={};POIDEF.forEach(p=>pois[p.gx+','+p.gz]=p);
  // ---------- blocks ----------
  for(let gx=0;gx<N;gx++)for(let gz=0;gz<N;gz++){
    const zone=zoneOf(gx,gz),bx=bcx(gx),bz=bcx(gz),x0=bx-BLK/2,x1=bx+BLK/2,z0=bz-BLK/2,z1=bz+BLK/2;
    A=chunkOf(bx,bz);CITY.blocks.push({gx,gz,zone});
    if(zone==='air')continue;
    // sidewalk ring + curbs
    top(slab,x0,z0,x1,z0+SW,.22,WHITE,8);top(slab,x0,z1-SW,x1,z1,.22,WHITE,8);top(slab,x0,z0+SW,x0+SW,z1-SW,.22,WHITE,8);top(slab,x1-SW,z0+SW,x1,z1-SW,.22,WHITE,8);
    A.plain.box(x0,0,z0,x1,.22,z1,'#a5a29a',{notop:true});
    const poi=pois[gx+','+gz];
    const lx0=x0+SW,lx1=x1-SW,lz0=z0+SW,lz1=z1-SW;
    const lotGreen=(zone==='hill'||zone==='marina'||poi&&(poi.id==='park'||poi.id==='beach'||poi.id==='home'||poi.id==='hosp'));
    top(lotGreen?lawn:paved,lx0,lz0,lx1,lz1,.22,WHITE,lotGreen?8:8);
    if(poi){genPOI(poi,R,paved)}
    else if(zone==='down')genDown(gx,gz,R);else if(zone==='midhi')genMidHi(gx,gz,R);else if(zone==='mid')genMid(gx,gz,R);
    else if(zone==='old')genOld(gx,gz,R);else if(zone==='hill')genHill(gx,gz,R);else if(zone==='marina')genMarina(gx,gz,R);
    // street trees along sidewalk edges
    if(zone!=='down'||R()<.5){const kind=TH.tree,n=4;for(let s=0;s<n;s++){const t=(s+.5)/n*BLK-BLK/2;
      [[bx+t,z0+SW-1.4],[bx+t,z1-SW+1.4],[x0+SW-1.4,bz+t],[x1-SW+1.4,bz+t]].forEach(p=>{if(R()<.62&&Math.abs(t)<BLK/2-14)addTree(chunkOf(p[0],p[1]),p[0],p[1],kind,.85+R()*.4,R)})}}
  }
  // ---------- airport ----------
  genAirport(R,slab,paved);
  // ---------- roads: markings, lamps, lights ----------
  const lampPos=[];const sigPoles=[];
  for(let k=0;k<=N;k++){
    for(let s=0;s<N;s++){ // segments between intersection s and s+1
      // road along X at z=rcx(k): from rcx(s)+8 to rcx(s+1)-8
      segMark(true,k,s,R,lampPos);segMark(false,k,s,R,lampPos)}
  }
  for(let i=0;i<=N;i++)for(let j=0;j<=N;j++){if(nodeClosed(i,j))continue;intersection(i,j,sigPoles)}
  // ---------- compile chunk meshes ----------
  const treeBuckets={};
  CITY.chunks.forEach((c,ci)=>{
    const add=(gb,mat,cast,recv,name)=>{if(!gb.vc)return;const m=new T3.Mesh(gb.build(),mat);m.castShadow=cast;m.receiveShadow=recv;m.userData.chunk=ci;m.name=name;m.matrixAutoUpdate=false;CITY.group.add(m);return m};
    add(c.win,M.win,true,true,'win');add(c.shop,M.shop,true,true,'shop');add(c.plain,M.plain,true,true,'plain');add(c.neon,M.neon,false,false,'neon');
    add(c.mark,M.mark,false,true,'mark');add(c.zebra,M.zebra,false,true,'zebra');
    if(c.decal.vc){const m=add(c.decal,M_DECAL,false,false,'decal');m.renderOrder=3}
    // trees instanced per kind
    ['palm','oak','sakura'].forEach(k=>{const arr=c.trees.filter(t=>t.k===k);if(!arr.length)return;const im=new T3.InstancedMesh(getTreeGeo(k),TREE_MAT,arr.length);
      arr.forEach((t,ii)=>im.setMatrixAt(ii,mat4(t.x,.22,t.z,0,t.ry,0,t.s,t.s*(.9+((ii*37)%10)/50),t.s)));im.castShadow=true;im.receiveShadow=true;im.instanceMatrix.needsUpdate=true;im.computeBoundingSphere();im.userData.chunk=ci;im.name='trees';CITY.group.add(im)})});
  // global meshes
  const gm=(gb,mat,rec)=>{const m=new T3.Mesh(gb.build(),mat);m.receiveShadow=rec!==false;m.matrixAutoUpdate=false;m.name='ground';CITY.group.add(m)};
  gm(slab,M.side);
  M.grass.color.set('#fff');lawn.p.length&&gm(lawn,M.grass);gm(paved,M.side);
  // road plane
  const rp=new T3.Mesh(new T3.PlaneGeometry(2*(HALF+8),2*(HALF+8)),M.road);rp.rotation.x=-Math.PI/2;rp.receiveShadow=true;M.road.map.repeat.set((HALF+8)/5,(HALF+8)/5);CITY.group.add(rp);CITY.road=rp;
  // signal lights instanced
  const li=new T3.InstancedMesh(LIGHT_GEO,LIGHT_MAT,sigPoles.length*2);li.instanceColor=new T3.InstancedBufferAttribute(new Float32Array(sigPoles.length*6),3);
  let q=0;CITY.sig=[];sigPoles.forEach(p=>{[['x',p.fx],['z',p.fz]].forEach(([ax,dir])=>{const n=ax==='x'?[dir,0]:[0,dir];const ry=ax==='x'?(dir>0?Math.PI/2:-Math.PI/2):(dir>0?0:Math.PI);
    li.setMatrixAt(q,mat4(p.x+n[0]*.2,5.1,p.z+n[1]*.2,0,ry,0));CITY.sig.push({i:p.i,j:p.j,ax,q});q++})});
  li.frustumCulled=false;CITY.lightMesh=li;CITY.group.add(li);
  genTerrain();
  CITY.pois=POIDEF.map(p=>Object.assign({},p,{pos:p.pos||poiPos(p)}));
  const air=CITY.pois.find(p=>p.id==='air');air.pos=CITY.airPos;
  // perimeter barriers (invisible walls with a visible rail)
  const e=HALF+30,pb=new GB();[[-e,-e,e,-e+1],[-e,e-1,e,e],[-e,-e,-e+1,e],[e-1,-e,e,e]].forEach(b=>{pb.box(b[0],0,b[1],b[2],1.1,b[3],'#c8c4bc',{});colAddBox(b[0],b[1],b[2],b[3],1.1,'w')});
  const pm=new T3.Mesh(pb.build(),M.plain);pm.receiveShadow=true;CITY.group.add(pm);
  CITY.group.updateMatrixWorld(true);
  applyTime(ENV.hour);
}

/* ---- road markings, lamps ---- */
function mq(gb,x0,z0,x1,z1,col){gb.quad([x0,.035,z1],[x1,.035,z1],[x1,.035,z0],[x0,.035,z0],0,1,0,col,UV0)}
const YEL=LC('#e8b923'),WHT=LC('#e6e6e0');
function segMark(alongX,k,s,R,lampPos){
  if(nodeClosed(alongX?s:k,alongX?k:s)||nodeClosed(alongX?s+1:k,alongX?k:s+1))return;
  const a=rcx(s)+ROADW/2,b=rcx(s+1)-ROADW/2,c=rcx(k),mid=(a+b)/2;
  A=chunkOf(alongX?mid:c,alongX?c:mid);const G=A.mark;
  const line=(off,w,col,dash)=>{if(!dash){if(alongX)mq(G,a,c+off-w/2,b,c+off+w/2,col);else mq(G,c+off-w/2,a,c+off+w/2,b,col)}
    else for(let p=a+3;p<b-4;p+=8){if(alongX)mq(G,p,c+off-w/2,p+3,c+off+w/2,col);else mq(G,c+off-w/2,p,c+off+w/2,p+3,col)}};
  line(-.17,.14,YEL);line(.17,.14,YEL);line(-3.6,.14,WHT,true);line(3.6,.14,WHT,true);line(-7.6,.16,WHT);line(7.6,.16,WHT);
  // lamps both sides, staggered
  for(let p=a+14;p<b-8;p+=36){const side=((Math.round(p/36)+k)%2)?1:-1;
    if(alongX){const zz=c+side*(ROADW/2+1.2);const ch=chunkOf(p,zz);A=ch;addLamp(p,zz,0,-side)}else{const xx=c+side*(ROADW/2+1.2);A=chunkOf(xx,p);addLamp(xx,p,-side,0)}}
}
function intersection(i,j,poles){
  const cx=rcx(i),cz=rcx(j);A=chunkOf(cx,cz);
  const edgeOpen=(dx,dz)=>!nodeClosed(i+dx,j+dz)&&i+dx>=0&&i+dx<=N&&j+dz>=0&&j+dz<=N;
  [[1,0],[-1,0],[0,1],[0,-1]].forEach(([dx,dz])=>{if(!edgeOpen(dx,dz))return;
    // crosswalk quad + stop line
    const d0=ROADW/2+1.0,d1=d0+3;
    if(dx!==0){const x0=cx+dx*d0,x1=cx+dx*d1,xa=Math.min(x0,x1),xb=Math.max(x0,x1);A.zebra.quad([xa,.04,cz+8],[xb,.04,cz+8],[xb,.04,cz-8],[xa,.04,cz-8],0,1,0,[1,1,1],[[0,0],[0,1],[1,1],[1,0]]);
      const sx=cx+dx*(d1+1.1);mq(A.mark,sx-.25,cz+(dx>0?0:-7.4),sx+.25,cz+(dx>0?7.4:0),WHT)}
    else{const z0=cz+dz*d0,z1=cz+dz*d1,za=Math.min(z0,z1),zb=Math.max(z0,z1);A.zebra.quad([cx-8,.04,zb],[cx+8,.04,zb],[cx+8,.04,za],[cx-8,.04,za],0,1,0,[1,1,1],[[0,0],[1,0],[1,1],[0,1]]);
      const sz=cz+dz*(d1+1.1);mq(A.mark,cx+(dz>0?-7.4:0),sz-.25,cx+(dz>0?0:7.4),sz+.25,WHT)}});
  // two signal poles
  [[1,1],[-1,-1]].forEach(([sx,sz])=>{const px=cx+sx*(ROADW/2+1.4),pz=cz+sz*(ROADW/2+1.4);A=chunkOf(px,pz);
    A.plain.box(px-.12,0,pz-.12,px+.12,5.6,pz+.12,'#2d2f33',{});A.plain.box(px-.3,4.7,pz-.3,px+.3,5.6,pz+.3,'#1a1b1e',{});colAddCirc(px,pz,.3,6,'s');
    poles.push({x:px,z:pz,i,j,fx:-sx,fz:-sz})});
}

/* ---- zone builders ---- */
function cellRects(gx,gz,nx,nz,gap){const bx=bcx(gx),bz=bcx(gz),out=[],cw=LOT/nx,cd=LOT/nz;for(let a=0;a<nx;a++)for(let b=0;b<nz;b++)out.push([bx-LOT/2+a*cw+gap,bz-LOT/2+b*cd+gap,bx-LOT/2+(a+1)*cw-gap,bz-LOT/2+(b+1)*cd-gap]);return out}
function genDown(gx,gz,R){const d=Math.hypot(gx-9.5,gz-9.5),hmax=(16+Math.max(0,(3.3-d)/3.3)*40)*TH.hgt;A=chunkOf(bcx(gx),bcx(gz));
  if(R()<.38){const bx=bcx(gx),bz=bcx(gz),w=57+R()*21,dd=57+R()*21;const rc=mkBuilding(bx-w/2,bz-dd/2,bx+w/2,bz+dd/2,Math.round(hmax*(.75+R()*.55)),R,R()<.7?'glass':'concrete');CITY.rects.push(rc)}
  else cellRects(gx,gz,2,2,5).forEach(c=>{const rc=mkBuilding(c[0],c[1],c[2],c[3],Math.round(hmax*(.4+R()*.7)),R,R()<.6?'glass':'concrete');CITY.rects.push(rc)})}
function genMidHi(gx,gz,R){A=chunkOf(bcx(gx),bcx(gz));cellRects(gx,gz,2,2,6).forEach(c=>{CITY.rects.push(mkBuilding(c[0],c[1],c[2],c[3],Math.round((6+R()*13)*TH.hgt),R,R()<.35?'glass':'color'))})}
function genMid(gx,gz,R){A=chunkOf(bcx(gx),bcx(gz));cellRects(gx,gz,3,3,3).forEach(c=>{
  if(R()<.58)CITY.rects.push(mkBuilding(c[0]+1,c[1]+1,c[2]-1,c[3]-1,Math.round(3+R()*8*TH.hgt),R,'color'));
  else{const h=mkHouse(c[0]+2,c[1]+2,c[2]-2,c[3]-2,R,false);CITY.rects.push(h);fenceLot(c[0]+.5,c[1]+.5,c[2]-.5,c[3]-.5,'#d8d2c4');if(R()<.7)addTree(A,c[0]+3,c[3]-3,TH.tree,1,R)}})}
function genOld(gx,gz,R){A=chunkOf(bcx(gx),bcx(gz));cellRects(gx,gz,4,4,1.5).forEach(c=>{
  if(R()<.8)CITY.rects.push(mkBuilding(c[0]+1,c[1]+1,c[2]-1,c[3]-1,Math.round(1+R()*3),R,'color'));else if(R()<.7)addTree(A,(c[0]+c[2])/2,(c[1]+c[3])/2,TH.tree,1.1,R)})}
function genHill(gx,gz,R){A=chunkOf(bcx(gx),bcx(gz));cellRects(gx,gz,2,2,2).forEach(c=>{
  const cx=(c[0]+c[2])/2,cz=(c[1]+c[3])/2,w=24+R()*6,d=21+R()*6;const h=mkHouse(cx-w/2-4,cz-d/2,cx+w/2-4,cz+d/2,R,true);CITY.rects.push(h);fenceLot(c[0]+.5,c[1]+.5,c[2]-.5,c[3]-.5,'#f0ece0');
  A.plain.box(cx+w/2-2,.24,cz-6,cx+w/2+8,.3,cz+6,'#3cc3e6',{});A.plain.box(cx+w/2-2.4,.22,cz-6.4,cx+w/2+8.4,.3,cz+6.4,'#e8e2d4',{notop:true});
  for(let k=0;k<3;k++)addTree(A,c[0]+4+R()*36,c[1]+3+R()*34,TH.tree,.9+R()*.4,R)})}
function genMarina(gx,gz,R){A=chunkOf(bcx(gx),bcx(gz));cellRects(gx,gz,2,2,4).forEach(c=>{CITY.rects.push(mkBuilding(c[0]+2,c[1]+2,c[2]-2,c[3]-2,Math.round(5+R()*5),R,'color',{col:pick(['#f4f1ea','#e8f0f2','#f6e8d0'],R)}));
  for(let k=0;k<4;k++)addTree(A,c[0]+2+R()*(c[2]-c[0]-4),c[1]+1+R()*3,'palm',1,R)})}

/* ================= POINTS OF INTEREST ================= */
function mqy(gb,x0,z0,x1,z1,col,y){gb.quad([x0,y,z1],[x1,y,z1],[x1,y,z0],[x0,y,z0],0,1,0,col,UV0)}
function frustum(gb,y0,y1,w0,w1,d0,d1,cx,cz,col,notop){ // 4-sided frustum, outward faces
  col=typeof col==='string'?LC(col):col;const a=[[cx-w0,y0,cz-d0],[cx+w0,y0,cz-d0],[cx+w0,y0,cz+d0],[cx-w0,y0,cz+d0]],b=[[cx-w1,y1,cz-d1],[cx+w1,y1,cz-d1],[cx+w1,y1,cz+d1],[cx-w1,y1,cz+d1]];
  const f=(i,j,nx,nz)=>{const ny=(w0-w1)/(y1-y0+1e-6),l=Math.hypot(nx,ny,nz);gb.quad(a[i],a[j],b[j],b[i],nx/l,ny/l,nz/l,col,UV0)};
  f(3,2,0,1);f(2,1,1,0);f(1,0,0,-1);f(0,3,-1,0);if(!notop)gb.quad(b[3],b[2],b[1],b[0],0,1,0,col,UV0)}
function ringBox(gb,cx,cz,rad,n,h,th,col,skipAng,skipW,y0,colliders){
  for(let k=0;k<n;k++){const a=k/n*TAU;if(skipAng!==undefined&&Math.abs(angDiff(a,skipAng))<skipW)continue;const x=cx+Math.cos(a)*rad,z=cz+Math.sin(a)*rad,w=TAU*rad/n*1.04;
    gb.geo(new T3.BoxGeometry(w,h,th),mat4(x,(y0||0)+h/2,z,0,-a+Math.PI/2,0),col);if(colliders)colAddCirc(x,z,w*.5,h,'r')}}
function bench(x,z,ry){A.plain.geo(new T3.BoxGeometry(2,.12,.6),mat4(x,.5,z,0,ry,0),'#8a5a3a');A.plain.geo(new T3.BoxGeometry(2,.5,.1),mat4(x+Math.sin(ry)*.28,.8,z+Math.cos(ry)*.28,0,ry,0),'#8a5a3a');colAddCirc(x,z,.9,1,'bn')}
function plane(gb,x,y,z,ry,accent,sc){sc=sc||1;const M4=(px,py,pz,rx,rry,rz)=>mat4(x+px*Math.cos(ry)-pz*Math.sin(ry),y+py,z+px*Math.sin(ry)+pz*Math.cos(ry),rx,-ry+rry,rz);
  gb.geo(new T3.CapsuleGeometry(2.2*sc,26*sc,4,14),M4(0,3.2*sc,0,0,0,Math.PI/2),'#f4f6f8');
  gb.geo(new T3.BoxGeometry(24*sc,.2,.5),M4(1,3.4*sc,0,0,0,0),'#222');// window band
  gb.geo(new T3.BoxGeometry(9*sc,.35,34*sc),M4(1.5*sc,2.2*sc,0,0,0,0),'#e8ecf0');
  gb.geo(new T3.BoxGeometry(5*sc,8*sc,.4),M4(-14*sc,6.8*sc,0,0,0,-.0),accent);
  gb.geo(new T3.BoxGeometry(4*sc,.3,12*sc),M4(-14*sc,3.6*sc,0,0,0,0),'#e8ecf0');
  [-8,8].forEach(s=>gb.geo(new T3.CylinderGeometry(1.2*sc,1.2*sc,4*sc,12),M4(3*sc,.9*sc,s*sc,0,0,Math.PI/2),'#b8bcc2'));
  gb.geo(new T3.SphereGeometry(2.25*sc,10,8),M4(14*sc,3.2*sc,0,0,0,0),'#e8ecf0');
  gb.geo(new T3.BoxGeometry(26*sc,.5,.1),M4(0,2.6*sc,2.2*sc,0,0,0),accent)}
function carModelPlaceholder(){}

function genPOI(def,R,paved){
  const bx=bcx(def.gx),bz=bcx(def.gz);const id=def.id;A=chunkOf(bx,bz);
  const sign=(rect,y,text,col,w,h,bg)=>{const p=faceSignPos(def,rect,y);labelSign(text,col,w||16,h||3.6,p[0],p[1],p[2],FACE_RY[def.face],bg)};
  const bld=(w,d,fl,kind,col,shop)=>{const rc=frontRect(def,w,d);const b=mkBuilding(rc[0],rc[1],rc[2],rc[3],fl,R,kind,{col,shop});CITY.rects.push(b);return[b.x0,b.z0,b.x1,b.z1]};
  const keepOut=[];
  if(id==='home'){const rc=bld(63,42,10,'color','#e8d2b0',true);sign(rc,9,'HOME','#2fd6a0',10,3);
    const[x0,z0,x1,z1]=rc;for(let k=0;k<3;k++)addTree(A,bx-38+k*38,bz-30,TH.tree,1.1,R);
  }else if(id==='mall'){const rc=bld(84,57,3,'glass','#7d9bb4',true);sign(rc,10.5,'BOUTIQUE MALL','#ff7ab6',24,4);
    for(let k=0;k<6;k++)neonSign(A,rc[0]+10+k*12,2.3,rc[3]+.5,5,.5,def.face,pick(NEONS,R),R);
  }else if(id==='hotel'){const rc=bld(45,45,26,'glass','#4b6d86',true);sign(rc,8.5,'GRAND HOTEL','#ffd23f',22,4);
    const p=faceSignPos(def,rc,0,.2);A.neon.box(rc[0]-.4,4.8,rc[1]-.4,rc[2]+.4,5.4,rc[3]+.4,'#ffd23f',{notop:true});
  }else if(id==='rest'){const rc=bld(57,36,2,'color','#d9a066',true);sign(rc,7.2,'RESTAURANT','#ff9f43',20,4);
    const tx=(rc[0]+rc[2])/2,tz=rc[3]+6;for(let k=-2;k<=2;k++){const x=tx+k*8;A.plain.geo(new T3.CylinderGeometry(.7,.7,.08,10),mat4(x,.95,tz),'#f2e8d8');A.plain.geo(new T3.CylinderGeometry(.07,.07,.9,6),mat4(x,.5,tz),'#555');
      A.plain.geo(new T3.ConeGeometry(2.2,.7,8),mat4(x,2.6,tz),pick(['#d94b4b','#2f80ed','#f2c94c'],R));A.plain.geo(new T3.CylinderGeometry(.05,.05,2.2,5),mat4(x,1.5,tz),'#666');colAddCirc(x,tz,.8,1,'tb')}
  }else if(id==='hosp'){const rc=bld(76,46,5,'concrete','#eef1f4',true);sign(rc,16,'HOSPITAL','#ff4f5e',22,4,'#fff');
    const cx=(rc[0]+rc[2])/2,cz=(rc[1]+rc[3])/2,top=4.4+5*3.5;A.plain.geo(new T3.CylinderGeometry(7,7,.3,24),mat4(cx,top+.1,cz),'#4a5058');A.neon.box(cx-3,top+.3,cz-.5,cx+3,top+.4,cz+.5,'#fff',{});A.neon.box(cx-3,top+.3,cz-3,cx-2,top+.4,cz+3,'#fff',{});A.neon.box(cx+2,top+.3,cz-3,cx+3,top+.4,cz+3,'#fff',{});
    A.neon.box(rc[0]+30,12,rc[3]+.1,rc[0]+38,13.5,rc[3]+.5,'#ff2a2a',{});A.neon.box(rc[0]+33.5,9.5,rc[3]+.1,rc[0]+34.5,16,rc[3]+.5,'#ff2a2a',{});
  }else if(id==='deal'){const rc=bld(62,36,1,'glass','#d6e2f0',false);sign(rc,6.5,'CAR DEALER','#5ab8ff',20,4);
    CITY.dealerSlots=[];const dx=def.face==='e'?1:def.face==='w'?-1:0,dz=def.face==='s'?1:def.face==='n'?-1:0;const fx=dx?(dx>0?rc[2]:rc[0]):0,fz=dz?(dz>0?rc[3]:rc[1]):0;
    for(let k=0;k<4;k++){const along=(k-1.5)*10;const px=dx?fx+dx*9:bx+along,pz=dz?fz+dz*9:bz+along;A.plain.box(px-4,.22,pz-2.8,px+4,.5,pz+2.8,'#dfe3ea',{});A.neon.box(px-4,.5,pz-2.8,px+4,.53,pz+2.8,'#35e0ff',{notop:false});
      CITY.dealerSlots.push({x:px,z:pz,ry:dx?(Math.PI/2):0,k})}
  }else if(id==='police'){const rc=bld(56,36,3,'concrete','#cdd5e6',true);sign(rc,11.5,'POLICE','#6d8cff',16,4,'#0c1230');
    A.neon.box(rc[0],12.3,rc[1]-.1,rc[2],12.9,rc[3]+.1,'#2f50ff',{notop:true});CITY.policeSlots=[];
    for(let k=0;k<3;k++){const px=bx-14+k*14,pz=bz+(def.face==='n'?-BLK/2+SW+20:BLK/2-SW-20);CITY.policeSlots.push({x:def.face==='n'?px:bx+(def.face==='e'?1:-1)*20,z:def.face==='n'?bz-BLK/2+SW+(k+1)*0+4:pz})}
  }else if(id==='club'){const rc=bld(46,46,3,'concrete','#2a2535',true);sign(rc,9.5,'NIGHT CLUB','#ff3d81',18,4,'#10081c');
    for(let k=0;k<4;k++)neonSign(A,rc[0]+4+k*10,3,rc[3]+.4,6,.4,def.face,NEONS[k%6],R);CITY.clubPos={x:(rc[0]+rc[2])/2,z:(rc[1]+rc[3])/2,top:4.4+3*3.5}
  }else if(id==='arena'){const cx=bx,cz=bz,fa={s:Math.PI/2,n:-Math.PI/2,e:0,w:Math.PI}[def.face];
    ringBox(A.plain,cx,cz,38,34,15,3,'#b9a68d',fa,.2,0,true);ringBox(A.plain,cx,cz,31,34,9,5,'#8a7a66',fa,.24,0,false);
    for(let k=0;k<8;k++){const a=k/8*TAU;A.neon.box(cx+Math.cos(a)*36.5-.5,15,cz+Math.sin(a)*36.5-.5,cx+Math.cos(a)*36.5+.5,17,cz+Math.sin(a)*36.5+.5,'#ffe9a8',{})}
    A.plain.geo(new T3.CylinderGeometry(25,25,.08,32),mat4(cx,.27,cz),'#3d7a45');A.plain.geo(new T3.CylinderGeometry(8,8,.7,24),mat4(cx,.5,cz),'#7a2a3a');
    A.plain.geo(new T3.CylinderGeometry(8.3,8.3,.1,24),mat4(cx,.9,cz),'#eee');
    [[-7,-7],[7,-7],[-7,7],[7,7]].forEach(c=>{A.plain.geo(new T3.CylinderGeometry(.18,.18,1.7,6),mat4(cx+c[0],1.4,cz+c[1]),'#eee')});
    const p=faceSignPos(def,[cx-38,cz-38,cx+38,cz+38],9,1);labelSign('FIGHT ARENA','#ffc92b',18,4,p[0],p[1],p[2],FACE_RY[def.face],'#241800');CITY.arenaPos={x:cx,z:cz};
  }else if(id==='beach'){const sand=LC('#d6c08c');paved.quad([bx-LOT/2,.24,bz+LOT/2],[bx+LOT/2,.24,bz+LOT/2],[bx+LOT/2,.24,bz-LOT/2],[bx-LOT/2,.24,bz-LOT/2],0,1,0,sand,[[0,0],[12,0],[12,12],[0,12]]);
    for(let k=0;k<10;k++){const px=bx-38+R()*76,pz=bz-38+R()*76;A.plain.geo(new T3.CylinderGeometry(.06,.06,2.6,5),mat4(px,1.4,pz),'#eee');A.plain.geo(new T3.ConeGeometry(2.2,.8,10),mat4(px,2.9,pz),pick(['#ff4f5e','#35e0ff','#ffd23f','#ff7ab6'],R));colAddCirc(px,pz,.5,2.5,'u');
      A.plain.box(px+2,.24,pz-.6,px+3.6,.5,pz+.6,'#f2f2f2',{})}
    for(let k=0;k<8;k++)addTree(A,bx-40+R()*80,bz-40+R()*80,'palm',1,R);
    const rc=bld(36,16,1,'color','#35b6c8',false);sign(rc,5,'BEACH CLUB','#35e0ff',14,3.4,'#06222a')
  }else if(id==='park'){const cx=bx,cz=bz;
    const path=LC('#cfc4aa');mqy(paved,cx-2,cz-LOT/2,cx+2,cz+LOT/2,path,.24);mqy(paved,cx-LOT/2,cz-2,cx+LOT/2,cz+2,path,.24);
    CITY.pond={x:cx+22,z:cz+22,r:14};const pg=new GB();pg.geo(new T3.CylinderGeometry(14,14,.1,28),mat4(cx+22,.24,cz+22),'#2f8fc4');const pm=new T3.Mesh(pg.build(),std({vertexColors:true,roughness:.06,metalness:.25}));pm.receiveShadow=true;CITY.group.add(pm);
    A.plain.geo(new T3.TorusGeometry(14,.5,6,28),mat4(cx+22,.4,cz+22,Math.PI/2,0,0),'#9a978f');colAddCirc(cx+22,cz+22,13.5,1,'pond');
    A.plain.geo(new T3.CylinderGeometry(3,3.4,.9,16),mat4(cx,.7,cz),'#cfd2d6');A.plain.geo(new T3.CylinderGeometry(1.8,2,.6,16),mat4(cx,1.5,cz),'#cfd2d6');A.plain.geo(new T3.CylinderGeometry(.3,.3,3,8),mat4(cx,3,cz),'#cfd2d6');colAddCirc(cx,cz,3.4,3,'fountain');
    for(let k=0;k<46;k++){const px=cx-LOT/2+4+R()*(LOT-8),pz=cz-LOT/2+4+R()*(LOT-8);if(Math.abs(px-cx)<4||Math.abs(pz-cz)<4||Math.hypot(px-cx-22,pz-cz-22)<17||Math.hypot(px-cx,pz-cz)<6)continue;addTree(A,px,pz,R()<.5?'oak':TH.tree,.9+R()*.5,R)}
    for(let k=0;k<6;k++){bench(cx+(k%2?4:-4),cz-14-k*9+(k>2?30:0),Math.PI/2*(k%2?-1:1))}
    const p=faceSignPos(def,[cx-5,cz-LOT/2,cx+5,cz+LOT/2],4,1);
  }else if(id==='land'){genLandmark(def,R,paved)}
  else if(id==='air'){genHill(def.gx,def.gz,R)}
}

/* ================= AIRPORT ================= */
function genAirport(R,slab,paved){
  const ax0=rcx(AIR.gx0)+ROADW/2,ax1=rcx(AIR.gx1+1)-ROADW/2,az0=rcx(AIR.gz0)+ROADW/2,az1=rcx(AIR.gz1+1)-ROADW/2;A=chunkOf((ax0+ax1)/2,(az0+az1)/2);
  paved.quad([ax0,.22,az1],[ax1,.22,az1],[ax1,.22,az0],[ax0,.22,az0],0,1,0,[.9,.9,.9],[[ax0/8,az1/8],[ax1/8,az1/8],[ax1/8,az0/8],[ax0/8,az0/8]]);
  // the big slab spans several chunks; curbs on its edge
  for(let x=ax0;x<ax1;x+=240){const c=chunkOf(x+60,az0);A=c;c.plain.box(x,0,az0,Math.min(ax1,x+240),.22,az1,'#a5a29a',{notop:true})}
  const rz=az0+30,rl0=ax0+30,rl1=ax1-30;
  for(let x=rl0;x<rl1;x+=240){const c=chunkOf(x+60,rz);A=c;const xe=Math.min(rl1,x+240);mqy(c.mark,x,rz-17,xe,rz+17,LC('#2b2c30'),.26);mqy(c.mark,x,rz-16,xe,rz-15.7,WHT,.27);mqy(c.mark,x,rz+15.7,xe,rz+16,WHT,.27);
    for(let p=x+10;p<xe-12;p+=30)mqy(c.mark,p,rz-.4,p+16,rz+.4,WHT,.27)}
  A=chunkOf(rl0,rz);for(let k=0;k<8;k++){mqy(A.mark,rl0+4,rz-14+k*3.6,rl0+16,rz-12.6+k*3.6,WHT,.27)}
  A=chunkOf(rl1,rz);for(let k=0;k<8;k++){mqy(A.mark,rl1-16,rz-14+k*3.6,rl1-4,rz-12.6+k*3.6,WHT,.27)}
  // taxiway line to apron
  A=chunkOf(ax0+300,az0+60);mqy(A.mark,ax0+80,rz+17,ax0+84,az0+95,YEL,.27);mqy(A.mark,ax0+80,az0+91,ax0+260,az0+95,YEL,.27);
  // terminal
  const tx0=ax0+120,tx1=tx0+132,tz1=az1-26,tz0=tz1-36;A=chunkOf((tx0+tx1)/2,tz0);
  const tb=mkBuilding(tx0,tz0,tx1,tz1,3,R,'glass',{col:'#8fb0c8',shop:false});CITY.rects.push(tb);
  A.plain.box(tx0-4,13,tz1-1,tx1+4,14,tz1+9,'#d8dce2',{});for(let k=0;k<7;k++)A.plain.box(tx0+4+k*20,0,tz1+8,tx0+5.5+k*20,13,tz1+9.5,'#d8dce2',{});colAddBox(tx0-4,tz1,tx1+4,tz1+9,14,'t');
  labelSign('AIRPORT','#9ad0ff',30,5,(tx0+tx1)/2,17,tz1+9.7,0,'#071428');
  for(let k=0;k<3;k++){A.plain.box(tx0+14+k*40,4,tz0-24,tx0+18+k*40,6.6,tz0,'#b8bcc2',{});}
  CITY.airPos={x:(tx0+tx1)/2,z:tz1+16};CITY.terminal={tx0,tx1,tz0,tz1};
  // control tower
  const tw=tx0-40;A=chunkOf(tw,tz0);A.plain.geo(new T3.CylinderGeometry(3.2,4.2,38,10),mat4(tw,19,tz0),'#d4d6da');A.win.geo&&0;A.plain.geo(new T3.CylinderGeometry(6.6,5,5.5,10),mat4(tw,40.5,tz0),'#2c3c4c');A.plain.geo(new T3.CylinderGeometry(7.2,7.2,.8,10),mat4(tw,43.6,tz0),'#aaa');A.neon.box(tw-.4,44,tz0-.4,tw+.4,52,tz0+.4,'#ff2a2a',{});colAddCirc(tw,tz0,4.4,44,'ct');
  // hangars + planes
  const hx=tx1+50;A=chunkOf(hx,tz0);for(let k=0;k<2;k++){const hz=tz0+k*0;A.plain.box(hx+k*60,0,tz0-24,hx+k*60+50,16,tz0+6,'#c8ccd2',{});A.plain.gable(hx+k*60,tz0-24,hx+k*60+50,tz0+6,16,5,'#9aa0a8','x',0);colAddBox(hx+k*60,tz0-24,hx+k*60+50,tz0+6,18,'hg')}
  const pcols=['#1b9e5a','#d9322f','#2f6fd9','#e8a21a'];
  for(let k=0;k<4;k++){const px=tx0+22+k*34,pz=tz0-42-((k%2)*6);A=chunkOf(px,pz);plane(A.plain,px,.24,pz,Math.PI/2,pcols[k%4],1.0);colAddBox(px-2.6,pz-14,px+2.6,pz+14,6,'pl')}
  // parking forecourt trees
  for(let k=0;k<10;k++)addTree(chunkOf(tx0+k*14,tz1+30),tx0+k*14,tz1+22+R()*4,TH.tree,1,R);
  // sandy ring: nothing
}

/* ================= TERRAIN + WATER ================= */
function terrH(x,z){const ex=Math.max(Math.abs(x)-(HALF+34),0),ez=Math.max(Math.abs(z)-(HALF+34),0),d=Math.hypot(ex,ez);if(d<=0)return -.08;
  const n=(z-x)/1.414/Math.max(1,Math.hypot(x,z)),wo=smooth(-.2,.2,n);
  const beach=-.08-d*.075-Math.max(0,d-120)*.25;
  const hn=Math.sin(x*.004+1.3)*Math.cos(z*.0035)+.6*Math.sin(x*.011+z*.008)+.35*Math.sin(x*.027-z*.021)+.2*Math.sin(z*.05+x*.03);
  const hill=smooth(8,160,d)*(38+hn*30)+d*.05-.08;return lerp(hill,beach,wo)}
const WATER_U={uT:{value:0},uSun:{value:new T3.Vector3()},uSunCol:{value:new T3.Color()},uHor:{value:new T3.Color()},uTop:{value:new T3.Color()},uNight:{value:0}};
function genTerrain(){
  const S=6400,SEG=160,g=new T3.PlaneGeometry(S,S,SEG,SEG);g.rotateX(-Math.PI/2);const pa=g.attributes.position,col=new Float32Array(pa.count*3),land=new T3.Color(TH.ground),rock=new T3.Color('#77736a'),sand=new T3.Color('#d6c48e'),tmp=new T3.Color();
  for(let i=0;i<pa.count;i++){const x=pa.getX(i),z=pa.getZ(i),h=terrH(x,z);pa.setY(i,h);
    const n=(z-x)/1.414/Math.max(1,Math.hypot(x,z)),wo=smooth(-.2,.2,n);
    tmp.copy(land);if(TH.n==='Dubai')tmp.set('#dcc088');
    const hv=Math.sin(x*.05)*Math.sin(z*.043)*.04;tmp.offsetHSL(0,0,hv);
    if(h>25)tmp.lerp(rock,smooth(25,75,h));
    if(wo>.1&&h<2.2)tmp.lerp(sand,smooth(2.2,.2,h)*wo+.2*wo);if(h<-.05&&wo>.1)tmp.lerp(sand,.7);
    if(Math.abs(x)<HALF+34&&Math.abs(z)<HALF+34)tmp.lerp(sand,.5);
    col[i*3]=tmp.r;col[i*3+1]=tmp.g;col[i*3+2]=tmp.b}
  g.setAttribute('color',new T3.BufferAttribute(col,3));g.computeVertexNormals();
  const t=new T3.Mesh(g,std({vertexColors:true,roughness:1}));t.receiveShadow=true;t.position.y=-.04;CITY.group.add(t);CITY.terrain=t;
  if(!CITY.water){const w=new T3.Mesh(new T3.PlaneGeometry(S*1.4,S*1.4,1,1),new T3.ShaderMaterial({transparent:false,fog:true,
    uniforms:T3.UniformsUtils.merge([T3.UniformsLib.fog,WATER_U]),
    vertexShader:`varying vec3 vW;\n#include <fog_pars_vertex>\nvoid main(){vec4 wp=modelMatrix*vec4(position,1.);vW=wp.xyz;vec4 mvPosition=viewMatrix*wp;gl_Position=projectionMatrix*mvPosition;\n#include <fog_vertex>\n}`,
    fragmentShader:`#include <common>\n#include <fog_pars_fragment>\nvarying vec3 vW;uniform float uT,uNight;uniform vec3 uSun,uSunCol,uHor,uTop;
    void main(){vec3 V=normalize(cameraPosition-vW);vec2 p=vW.xz*.045;
      float a=sin(p.x*2.1+uT*.9)+sin(p.y*2.7-uT*1.1)+sin((p.x+p.y)*4.3+uT*1.7)*.6+sin((p.x-p.y)*6.1-uT*2.2)*.4;
      vec2 gr=vec2(cos(p.x*2.1+uT*.9)*2.1+cos((p.x+p.y)*4.3+uT*1.7)*2.6+cos((p.x-p.y)*6.1-uT*2.2)*2.4,cos(p.y*2.7-uT*1.1)*2.7+cos((p.x+p.y)*4.3+uT*1.7)*2.6-cos((p.x-p.y)*6.1-uT*2.2)*2.4);
      vec3 n=normalize(vec3(-gr.x*.045,1.,-gr.y*.045));
      float fr=pow(1.-max(dot(V,n),0.),4.);vec3 deep=vec3(.01,.12,.2),shal=vec3(.03,.32,.4);
      vec3 col=mix(deep,shal,smoothstep(-2.,2.,a));
      vec3 R=reflect(-V,n);vec3 skyc=mix(uHor,uTop,pow(clamp(R.y,0.,1.),.5));
      col=mix(col,skyc,clamp(fr*.9+.12,0.,1.));
      float sp=pow(max(dot(R,uSun),0.),220.);col+=uSunCol*sp*2.2*(1.-uNight*.6);
      col*=1.-uNight*.5;
      gl_FragColor=vec4(col,1.);
      #include <tonemapping_fragment>
      #include <encodings_fragment>
      #include <fog_fragment>
    }`}));w.rotation.x=-Math.PI/2;w.position.y=-.55;w.renderOrder=-1;scene.add(w);CITY.water=w}
}

/* ================= LANDMARKS ================= */
function genLandmark(def,R,paved){
  const cx=bcx(def.gx),cz=bcx(def.gz),L=TH.land;A=chunkOf(cx,cz);const P=A.plain;
  // plaza
  paved.quad([cx-44,.24,cz+44],[cx+44,.24,cz+44],[cx+44,.24,cz-44],[cx-44,.24,cz-44],0,1,0,[.95,.93,.88],[[0,0],[10,0],[10,10],[0,10]]);
  ringBox(P,cx,cz,46,40,.8,1.2,'#c5bfb2',undefined,0,0,false);
  for(let k=0;k<8;k++){const a=k/8*TAU+.2;addTree(A,cx+Math.cos(a)*40,cz+Math.sin(a)*40,TH.tree,1.1,R)}
  CITY.landmarkPos={x:cx,z:cz};
  const col=(h)=>h;let H=60;
  if(L==='theatre'){P.geo(new T3.CylinderGeometry(24,26,6,28),mat4(cx,3.2,cz),'#e8e2d2');P.geo(new T3.CylinderGeometry(18,24,10,28),mat4(cx,11,cz),'#f2eee2');P.geo(new T3.CylinderGeometry(6,18,8,28),mat4(cx,20,cz),'#d6d0c0');
    P.geo(new T3.TorusGeometry(22,1.4,6,32),mat4(cx,6.4,cz,Math.PI/2,0,0),'#2fb5a8');colAddCirc(cx,cz,26,30,'lm');H=26}
  else if(L==='clock'){P.box(cx-6,.24,cz-6,cx+6,10,cz+6,'#b8a07a',{});P.box(cx-5,10,cz-5,cx+5,50,cz+5,'#c4aa80',{});
    for(let k=0;k<5;k++)P.box(cx-5.4,12+k*8,cz-5.4,cx+5.4,12.6+k*8,cz+5.4,'#a88c62',{});P.box(cx-6,50,cz-6,cx+6,58,cz+6,'#b09468',{});
    [[0,1],[0,-1],[1,0],[-1,0]].forEach(([dx,dz])=>{A.neon.geo(new T3.CylinderGeometry(3.8,3.8,.6,20),mat4(cx+dx*6.1,54,cz+dz*6.1,dz?Math.PI/2:0,0,dx?Math.PI/2:0),'#fff1c9')});
    P.geo(new T3.ConeGeometry(8.2,22,4),mat4(cx,69,cz,0,Math.PI/4,0),'#4a5a68');P.geo(new T3.ConeGeometry(.9,7,6),mat4(cx,83,cz),'#d4af37');colAddBox(cx-6,cz-6,cx+6,cz+6,80,'lm');H=84}
  else if(L==='redtower'){let y=.24;const W=[13,10.5,8,6,4.5,3.2];for(let k=0;k<5;k++){frustum(P,y,y+14,W[k],W[k+1],W[k],W[k+1],cx,cz,k%2?'#f2f2ee':'#e8452c',true);y+=14}
    P.box(cx-9,24,cz-9,cx+9,29,cz+9,'#e8452c',{});P.box(cx-5.5,56,cz-5.5,cx+5.5,60,cz+5.5,'#f2f2ee',{});P.box(cx-.5,70,cz-.5,cx+.5,110,cz+.5,'#e8e2d8',{});A.neon.box(cx-.8,106,cz-.8,cx+.8,110,cz+.8,'#ff2a2a',{});
    colAddBox(cx-12,cz-12,cx+12,cz+12,60,'lm');H=110}
  else if(L==='statue'){P.box(cx-9,.24,cz-9,cx+9,6,cz+9,'#8c8a82',{});P.box(cx-6,6,cz-6,cx+6,22,cz+6,'#d8d4c8',{});
    P.geo(new T3.ConeGeometry(4.2,18,10),mat4(cx,31,cz),'#f4f3ee');P.geo(new T3.BoxGeometry(24,1.8,2.2),mat4(cx,36,cz),'#f4f3ee');P.geo(new T3.SphereGeometry(2,10,8),mat4(cx,41,cz),'#f4f3ee');
    colAddCirc(cx,cz,10,40,'lm');H=44}
  else if(L==='liberty'){P.box(cx-10,.24,cz-10,cx+10,7,cz+10,'#9a9890',{});frustum(P,7,24,7,5,7,5,cx,cz,'#b8b4a8');
    P.geo(new T3.ConeGeometry(4,16,10),mat4(cx,32,cz),'#7bbfa8');P.geo(new T3.CylinderGeometry(.9,.9,12,6),mat4(cx+3,41,cz,0,0,-.3),'#7bbfa8');P.geo(new T3.SphereGeometry(2,10,8),mat4(cx,41.5,cz),'#7bbfa8');
    for(let k=0;k<7;k++){const a=-1.2+k*.4;P.geo(new T3.ConeGeometry(.3,2.5,4),mat4(cx+Math.sin(a)*2.4,44.2+Math.cos(a)*.6,cz+Math.cos(a)*2.4,Math.cos(a)*.9,0,-Math.sin(a)*.9),'#7bbfa8')}
    A.neon.geo(new T3.ConeGeometry(.9,2.6,6),mat4(cx+6.4,48.2,cz+.4),'#ffb23c');colAddCirc(cx,cz,11,40,'lm');H=50}
  else if(L==='burj'){let y=.24;const tiers=[[16,34],[13,40],[10,40],[7,40],[5,40],[3,35],[1.4,40],[.5,30]];tiers.forEach((t,k)=>{const nxt=tiers[k+1]?tiers[k+1][0]:.2;frustum(P,y,y+t[1],t[0],nxt,t[0],nxt,cx,cz,k%2?'#aac8d6':'#c4dce8',false);y+=t[1]});
    for(let k=0;k<3;k++){const a=k/3*TAU;P.box(cx+Math.cos(a)*14-4,.24,cz+Math.sin(a)*14-4,cx+Math.cos(a)*14+4,70-k*10,cz+Math.sin(a)*14+4,'#a0bccc',{})}
    A.neon.box(cx-.3,y,cz-.3,cx+.3,y+3,cz+.3,'#ff2a2a',{});colAddCirc(cx,cz,18,200,'lm');H=y}
  CITY.landmarkH=H;
}

/* ================= COMPAT (older model code) ================= */
const sm=smooth;const mr=Math.random,mpick=a=>a[(mr()*a.length)|0],mri=(a,b)=>Math.floor(a+mr()*(b-a+1)),rr_=(a,b)=>a+Math.random()*(b-a);
const RW=ROADW,lineX=rcx;
class GBo{
  constructor(){this.p=[];this.n=[];this.c=[];this.u=[];this.i=[];this.vc=0}
  quad(v,n,cols,uv){
    const b=this.vc;
    for(let k=0;k<4;k++){this.p.push(v[k][0],v[k][1],v[k][2]);this.n.push(n[0],n[1],n[2]);const c=cols[k]||cols[0];this.c.push(c[0],c[1],c[2]);const t=uv?uv[k]:[0,0];this.u.push(t[0],t[1])}
    this.i.push(b,b+1,b+2,b,b+2,b+3);this.vc+=4;
  }
  tri(a,b,c,n,col){const o=this.vc;[a,b,c].forEach(v=>{this.p.push(v[0],v[1],v[2]);this.n.push(n[0],n[1],n[2]);this.c.push(col[0],col[1],col[2]);this.u.push(0,0)});this.i.push(o,o+1,o+2);this.vc+=3}
  addGeo(geo,mat,col){
    const g=geo.index?geo:geo;const pos=g.attributes.position,nor=g.attributes.normal,uv=g.attributes.uv;
    const nm=new THREE.Matrix3().getNormalMatrix(mat);const v=new THREE.Vector3(),nn=new THREE.Vector3();
    const b=this.vc;
    for(let k=0;k<pos.count;k++){
      v.fromBufferAttribute(pos,k).applyMatrix4(mat);nn.fromBufferAttribute(nor,k).applyMatrix3(nm).normalize();
      this.p.push(v.x,v.y,v.z);this.n.push(nn.x,nn.y,nn.z);this.c.push(col[0],col[1],col[2]);this.u.push(uv?uv.getX(k):0,uv?uv.getY(k):0);
    }
    if(g.index){for(let k=0;k<g.index.count;k++)this.i.push(b+g.index.getX(k))}else{for(let k=0;k<pos.count;k++)this.i.push(b+k)}
    this.vc+=pos.count;
  }
  addGeoVC(geo,mat){
    const pos=geo.attributes.position,nor=geo.attributes.normal,uv=geo.attributes.uv,cl=geo.attributes.color;
    const nm=new THREE.Matrix3().getNormalMatrix(mat);const v=new THREE.Vector3(),nn=new THREE.Vector3();const b=this.vc;
    for(let k=0;k<pos.count;k++){v.fromBufferAttribute(pos,k).applyMatrix4(mat);nn.fromBufferAttribute(nor,k).applyMatrix3(nm).normalize();
      this.p.push(v.x,v.y,v.z);this.n.push(nn.x,nn.y,nn.z);this.c.push(cl.getX(k),cl.getY(k),cl.getZ(k));this.u.push(uv?uv.getX(k):0,uv?uv.getY(k):0)}
    if(geo.index){for(let k=0;k<geo.index.count;k++)this.i.push(b+geo.index.getX(k))}else{for(let k=0;k<pos.count;k++)this.i.push(b+k)}
    this.vc+=pos.count;
  }
  build(){
    const g=new THREE.BufferGeometry();
    g.setAttribute('position',new THREE.Float32BufferAttribute(this.p,3));
    g.setAttribute('normal',new THREE.Float32BufferAttribute(this.n,3));
    g.setAttribute('color',new THREE.Float32BufferAttribute(this.c,3));
    g.setAttribute('uv',new THREE.Float32BufferAttribute(this.u,2));
    g.setIndex(this.i.length>65535||this.vc>65535?new THREE.Uint32BufferAttribute(this.i,1):new THREE.Uint16BufferAttribute(this.i,1));
    g.computeBoundingSphere();g.computeBoundingBox();return g;
  }
}

const _tc2=new T3.Color();
const col3=(hex,k=1)=>{_tc2.set(hex);return[_tc2.r*k,_tc2.g*k,_tc2.b*k]};
const shade=(c,k)=>[c[0]*k,c[1]*k,c[2]*k];
function boxFlat(g,x0,y0,z0,x1,y1,z1,col,o={}){
  const t=o.top??1,s=o.side??0.85,b=o.bot??0.7;
  const cs=shade(col,s);
  g.quad([[x0,y0,z1],[x1,y0,z1],[x1,y1,z1],[x0,y1,z1]],[0,0,1],[shade(col,b*s),shade(col,b*s),cs,cs]);
  g.quad([[x1,y0,z0],[x0,y0,z0],[x0,y1,z0],[x1,y1,z0]],[0,0,-1],[shade(col,b*s*0.95),shade(col,b*s*0.95),shade(cs,0.95),shade(cs,0.95)]);
  g.quad([[x1,y0,z1],[x1,y0,z0],[x1,y1,z0],[x1,y1,z1]],[1,0,0],[shade(col,b*s*0.9),shade(col,b*s*0.9),shade(cs,0.9),shade(cs,0.9)]);
  g.quad([[x0,y0,z0],[x0,y0,z1],[x0,y1,z1],[x0,y1,z0]],[-1,0,0],[shade(col,b*s*0.9),shade(col,b*s*0.9),shade(cs,0.9),shade(cs,0.9)]);
  if(!o.noTop)g.quad([[x0,y1,z1],[x1,y1,z1],[x1,y1,z0],[x0,y1,z0]],[0,1,0],[shade(col,t)]);
}

const lightState=(i,j,axis,t)=>lightPhase(i,j,t)[axis];
const dayInfo={lamp:0};
function groundH(x,z){if(Math.abs(x)>HALF+8||Math.abs(z)>HALF+8)return -.08;
  if(x>rcx(AIR.gx0)+8&&z<rcx(AIR.gz1+1)-8&&x<HALF-8&&z>-HALF+8)return .22;
  const u=(x+HALF)%PITCH,v=(z+HALF)%PITCH;const h=ROADW/2;return(u>h&&u<PITCH-h&&v>h&&v<PITCH-h)?.22:0}
function colResolve(x,z,r){let best=null;
  colQuery(x,z,r+2,colBoxes,c=>{const cx=clamp(x,c.x0,c.x1),cz=clamp(z,c.z0,c.z1);let dx=x-cx,dz=z-cz;const d2=dx*dx+dz*dz;if(d2>=r*r)return;let nx,nz,pen;
    if(d2>1e-8){const d=Math.sqrt(d2);nx=dx/d;nz=dz/d;pen=r-d}else{const l1=x-c.x0,l2=c.x1-x,l3=z-c.z0,l4=c.z1-z,m=Math.min(l1,l2,l3,l4);if(m===l1){nx=-1;nz=0;pen=l1+r}else if(m===l2){nx=1;nz=0;pen=l2+r}else if(m===l3){nx=0;nz=-1;pen=l3+r}else{nx=0;nz=1;pen=l4+r}}
    if(!best||pen>best.pen)best={nx,nz,pen}});
  colQuery(x,z,r+2,colCircs,c=>{const dx=x-c.x,dz=z-c.z,d=Math.hypot(dx,dz);if(d>=r+c.r)return;const pen=r+c.r-d;if(!best||pen>best.pen)best={nx:d<1e-4?1:dx/d,nz:d<1e-4?0:dz/d,pen}});
  return best}

function colInside(x,y,z,pad){let hit=false;colQuery(x,z,pad+1,colBoxes,c=>{if(x>c.x0-pad&&x<c.x1+pad&&z>c.z0-pad&&z<c.z1+pad&&y<c.h+.3)hit=true});return hit}

/* ===== HUMANS: articulated bodies, clothes, procedural animation ===== */
const SKINS=['#f4d0b0','#e6b48c','#cf9468','#b07548','#8d5a35','#6b4026','#4a2b18'];
const HAIRCOL=['#0c0c0c','#2a1a10','#4b3220','#8a5a2b','#c9a14a','#b3262e','#d9d9d9','#3a6cff','#ff4fa3'];
const HAIRN=['Buzz','Afro','Long','Braids','Bald','Bun','Twists','Fade'];
const TOPN=['T-shirt','Hoodie','Jacket','Suit','Dress','Tank'];
const BOTN=['Jeans','Shorts','Skirt','Slacks'];
const SHOEN=['Sneakers','Boots','Heels','Sandals'];
const HATN=['None','Cap','Beanie','Bucket'];
const OUTFITS=[ // shop catalogue (name, price, top style, top color, bottom style, bottom color)
  {n:'Street Tee',p:0,ts:0,tc:'#e8e8e8',bs:0,bc:'#2f4a7a'},
  {n:'Black Hoodie',p:45,ts:1,tc:'#1f1f24',bs:3,bc:'#2a2a30'},
  {n:'Red Varsity',p:80,ts:2,tc:'#b3202a',bs:0,bc:'#1d2740'},
  {n:'Summer Shorts',p:35,ts:5,tc:'#ffd23f',bs:1,bc:'#1f9d8a'},
  {n:'Lagos Agbada Teal',p:150,ts:1,tc:'#10857a',bs:3,bc:'#f1e6c8'},
  {n:'Boss Suit',p:420,ts:3,tc:'#15171d',bs:3,bc:'#15171d'},
  {n:'Ivory Suit',p:560,ts:3,tc:'#e9e1cf',bs:3,bc:'#e9e1cf'},
  {n:'Neon Jacket',p:260,ts:2,tc:'#7a2cff',bs:0,bc:'#111118'},
  {n:'Red Dress',p:300,ts:4,tc:'#d4153a',bs:2,bc:'#d4153a',f:1},
  {n:'Gold Gown',p:900,ts:4,tc:'#e0b23a',bs:2,bc:'#e0b23a',f:1},
  {n:'Denim Combo',p:90,ts:5,tc:'#f2f2f2',bs:2,bc:'#3a63a8',f:1},
  {n:'Sky Dress',p:210,ts:4,tc:'#5aa7ee',bs:2,bc:'#5aa7ee',f:1}
];
const matCache={};
function mat(hex,rough=0.78,metal=0){const k=hex+rough+metal;if(!matCache[k]){matCache[k]=new THREE.MeshStandardMaterial({color:new THREE.Color(hex),roughness:rough,metalness:metal})}return matCache[k]}
const capGeoCache={};
function capsule(r,len,seg=4,rad=10){const k=r+'_'+len;if(!capGeoCache[k])capGeoCache[k]=new THREE.CapsuleGeometry(r,len,seg,rad);return capGeoCache[k]}
const sphGeo=new THREE.SphereGeometry(1,16,12),boxGeo=new THREE.BoxGeometry(1,1,1),cylGeo=new THREE.CylinderGeometry(1,1,1,14);
function mesh(geo,m,x=0,y=0,z=0,sx=1,sy=1,sz=1){const o=new THREE.Mesh(geo,m);o.position.set(x,y,z);o.scale.set(sx,sy,sz);o.castShadow=true;return o}

function makeHuman(o){
  o=Object.assign({female:false,skin:2,hair:0,hairCol:1,ts:0,tc:'#e8e8e8',bs:0,bc:'#2f4a7a',shoe:0,shc:'#f4f4f4',hat:0,hatc:'#c22',shades:false,chain:false,build:1,h:1},o);
  const F=o.female,sk=SKINS[o.skin%SKINS.length];
  const root=new THREE.Group();const H={root,o,parts:{},a:{phase:Math.random()*6,blink:2+Math.random()*3,down:0,punchT:0,hit:0,air:0,look:0,sway:Math.random()*6,aimT:0,smooth:0,run:0}};
  const body=new THREE.Group();root.add(body);H.body=body;
  const wx=F?0.88:1.0, hipW=F?0.108:0.095, sw=F?0.185:0.215, bld=o.build; // build scales limb/torso thickness
  const legR=(F?0.082:0.088)*bld, shinR=(F?0.062:0.068)*bld;
  const skinM=mat(sk,0.55),topM=mat(o.tc,0.82),botM=mat(o.bc,0.85),shoeM=mat(o.shc,0.6),darkM=mat('#15151a',0.9),whiteM=mat('#f2f2f2',0.5);
  const hips=new THREE.Group();hips.position.y=0.93;body.add(hips);H.hips=hips;
  // pelvis
  hips.add(mesh(capsule(0.12,0.1,3,8),botM,0,0.04,0,F?1.5:1.4,0.9,1.0));
  const longLeg=o.bs===0||o.bs===3,mid=o.bs===1;
  // legs
  const legs=[];
  for(const s of[-1,1]){
    const th=new THREE.Group();th.position.set(s*hipW,0,0);hips.add(th);
    const thMat=(longLeg||mid)?botM:skinM;
    th.add(mesh(capsule(legR,0.34,4,10),thMat,0,-0.215,0,1,1,1.0));
    const sh=new THREE.Group();sh.position.y=-0.43;th.add(sh);
    sh.add(mesh(capsule(shinR,0.34,4,10),longLeg?botM:skinM,0,-0.215,0));
    const ft=new THREE.Group();ft.position.y=-0.43;sh.add(ft);
    const bootH=o.shoe===1?0.12:0;
    ft.add(mesh(boxGeo,shoeM,0,-0.045,0.055,0.095,0.075,0.27));
    if(o.shoe===1)ft.add(mesh(boxGeo,shoeM,0,0.04,-0.01,0.1,0.14,0.15));
    if(o.shoe===0)ft.add(mesh(boxGeo,whiteM,0,-0.085,0.055,0.1,0.025,0.28));
    if(o.shoe===2){ft.add(mesh(boxGeo,shoeM,0,-0.05,0.04,0.08,0.06,0.2));ft.add(mesh(boxGeo,shoeM,0,-0.09,-0.05,0.05,0.07,0.04))}
    legs.push({th,sh,ft,s});
  }
  H.legs=legs;
  // torso
  const torso=new THREE.Group();torso.position.y=0.06;hips.add(torso);H.torso=torso;
  const chestW=F?0.88:1.08;
  const chest=mesh(capsule(0.15*bld,0.22,5,12),topM,0,0.30,0,chestW*(F?1.0:1.12),1,0.78*(F?0.95:1));torso.add(chest);
  const waist=mesh(capsule(0.125*bld,0.16,4,10),o.ts===3||o.ts===1||o.ts===2?topM:(o.ts===4?topM:skinM),0,0.08,0,F?0.88:1.08,1,0.8);torso.add(waist);
  if(o.ts===0||o.ts===5){ // shirt hem covers waist
    waist.material=topM;
  }
  if(o.ts===1){ // hoodie hood + pouch
    torso.add(mesh(capsule(0.1,0.12,3,8),topM,0,0.58,-0.07,1.7,0.8,0.9));
    chest.scale.multiplyScalar(1.06);
  }
  if(o.ts===2){chest.scale.multiplyScalar(1.07);torso.add(mesh(boxGeo,mat('#eee',0.7),0,0.34,0.115,0.1,0.34,0.04))} // jacket w/ inner tee strip
  if(o.ts===3){torso.add(mesh(boxGeo,whiteM,0,0.38,0.115,0.1,0.3,0.03));torso.add(mesh(boxGeo,mat('#a31224',0.6),0,0.34,0.13,0.035,0.22,0.02));chest.scale.multiplyScalar(1.05)}
  if(o.ts===4){ // dress skirt
    const sk2=mesh(new THREE.CylinderGeometry(0.17,0.36,0.52,16,1,true),botM,0,-0.2,0);sk2.material=mat(o.bc,0.8);sk2.material.side=THREE.DoubleSide;torso.add(sk2);
  }
  if(o.bs===2&&o.ts!==4){const sk2=mesh(new THREE.CylinderGeometry(0.17,0.3,0.3,16,1,true),botM,0,-0.08,0);sk2.material=mat(o.bc,0.8);sk2.material.side=THREE.DoubleSide;torso.add(sk2)}
  if(F){ // bust shaping + hips
    torso.add(mesh(sphGeo,topM,0.065,0.39,0.1,0.075,0.075,0.075));torso.add(mesh(sphGeo,topM,-0.065,0.39,0.1,0.075,0.075,0.075));
  }
  if(o.chain){const tor=new THREE.Mesh(new THREE.TorusGeometry(0.1,0.012,6,16),mat('#f1c24b',0.25,0.9));tor.position.set(0,0.46,0.07);tor.rotation.x=1.2;torso.add(tor)}
  // neck + head
  torso.add(mesh(cylGeo,skinM,0,0.545,0.01,0.05,0.09,0.05));
  const head=new THREE.Group();head.position.set(0,0.66,0.01);torso.add(head);H.head=head;
  const headM=mesh(sphGeo,skinM,0,0.04,0.0,0.105,0.125,0.115);head.add(headM);
  head.add(mesh(sphGeo,skinM,0,-0.04,0.03,0.085,0.085,0.085)); // jaw
  // face
  const eyeW=mat('#fafafa',0.3),eyeD=mat('#14100d',0.3);
  const eyes=[];
  for(const s of[-1,1]){
    const e=new THREE.Group();e.position.set(s*0.04,0.055,0.098);head.add(e);
    e.add(mesh(sphGeo,eyeW,0,0,0,0.02,0.014,0.01));e.add(mesh(sphGeo,eyeD,0,0,0.007,0.0095,0.0095,0.006));eyes.push(e);
    head.add(mesh(boxGeo,mat(HAIRCOL[o.hairCol%HAIRCOL.length],0.9),s*0.04,0.083,0.1,0.034,0.007,0.01));
  }
  H.eyes=eyes;
  head.add(mesh(sphGeo,skinM,0,0.02,0.115,0.014,0.016,0.016)); // nose
  head.add(mesh(boxGeo,mat(F?'#b3344e':'#6d3a30',0.5),0,-0.035,0.1,0.034,0.007,0.01)); // mouth
  head.add(mesh(sphGeo,skinM,-0.105,0.03,0,0.015,0.03,0.018));head.add(mesh(sphGeo,skinM,0.105,0.03,0,0.015,0.03,0.018));
  if(o.shades){head.add(mesh(boxGeo,mat('#0a0a0d',0.2,0.4),0,0.055,0.108,0.115,0.032,0.02))}
  // hair
  const hc=mat(HAIRCOL[o.hairCol%HAIRCOL.length],0.88);
  const hs=o.hair;
  if(hs===0||hs===7){const c=mesh(sphGeo,hc,0,0.065,-0.005,0.112,0.112,0.12);head.add(c);if(hs===7){c.scale.set(0.108,0.1,0.118)}}
  if(hs===1){head.add(mesh(sphGeo,hc,0,0.09,-0.02,0.19,0.17,0.18))}
  if(hs===2){head.add(mesh(sphGeo,hc,0,0.07,-0.01,0.118,0.115,0.125));head.add(mesh(boxGeo,hc,0,-0.12,-0.07,0.19,0.34,0.08));head.add(mesh(sphGeo,hc,0,-0.28,-0.075,0.095,0.07,0.04))}
  if(hs===3){head.add(mesh(sphGeo,hc,0,0.07,-0.005,0.113,0.11,0.122));for(let k=-3;k<=3;k++)head.add(mesh(capsule(0.012,0.3,2,5),hc,k*0.027,-0.04,-0.1,1,1,1))}
  if(hs===5){head.add(mesh(sphGeo,hc,0,0.065,-0.005,0.113,0.11,0.122));head.add(mesh(sphGeo,hc,0,0.2,-0.05,0.07,0.07,0.07))}
  if(hs===6){head.add(mesh(sphGeo,hc,0,0.07,-0.01,0.117,0.11,0.125));for(let k=0;k<9;k++){const a=k/9*TAU;head.add(mesh(capsule(0.016,0.1,2,5),hc,Math.cos(a)*0.1,0.13,Math.sin(a)*0.1,1,1,1)).rotation.set(Math.sin(a)*0.7,0,-Math.cos(a)*0.7)}}
  // hat
  if(o.hat===1){head.add(mesh(sphGeo,mat(o.hatc,0.8),0,0.1,0,0.118,0.085,0.128));head.add(mesh(boxGeo,mat(o.hatc,0.8),0,0.075,0.14,0.15,0.012,0.12))}
  if(o.hat===2){head.add(mesh(sphGeo,mat(o.hatc,0.9),0,0.1,0,0.118,0.1,0.125))}
  if(o.hat===3){head.add(mesh(cylGeo,mat(o.hatc,0.9),0,0.13,0,0.1,0.07,0.1));head.add(mesh(cylGeo,mat(o.hatc,0.9),0,0.1,0,0.19,0.01,0.19))}
  // arms
  const arms=[];
  const longSleeve=o.ts===1||o.ts===2||o.ts===3;
  for(const s of[-1,1]){
    const sg=new THREE.Group();sg.position.set(s*sw*(F?1:1),0.42,0);torso.add(sg);
    const aR=(F?0.05:0.058)*bld;
    sg.add(mesh(sphGeo,(o.ts===5||o.ts===4)?skinM:topM,0,0,0,aR*1.25,aR*1.25,aR*1.25));
    sg.add(mesh(capsule(aR,0.2,4,10),(o.ts===5||o.ts===4)?skinM:topM,0,-0.14,0));
    const eg=new THREE.Group();eg.position.y=-0.29;sg.add(eg);
    eg.add(mesh(capsule(aR*0.88,0.2,4,10),longSleeve?topM:skinM,0,-0.13,0));
    const hand=new THREE.Group();hand.position.y=-0.285;eg.add(hand);hand.add(mesh(sphGeo,skinM,0,-0.02,0.0,0.043,0.052,0.03));
    arms.push({sg,eg,hand,s});
  }
  H.arms=arms;
  // gun (hidden by default) in right hand
  const gun=new THREE.Group();gun.add(mesh(boxGeo,mat('#222',0.4,0.6),0,-0.02,0.07,0.035,0.05,0.2));gun.add(mesh(boxGeo,mat('#222',0.4,0.6),0,-0.07,0.01,0.03,0.09,0.04));gun.rotation.x=-Math.PI/2*0.0;gun.visible=false;
  arms[1].hand.add(gun);H.gun=gun;
  const mf=new THREE.Mesh(new THREE.SphereGeometry(0.09,8,6),new THREE.MeshBasicMaterial({color:0xffd27a,transparent:true,opacity:0.95,depthWrite:false,toneMapped:false}));mf.position.set(0,-0.02,0.26);mf.visible=false;gun.add(mf);H.flash=mf;
  const sc=(F?0.95:1.0)*o.h;root.scale.setScalar(sc);
  mergeHumanParts(H);
  return H;
}

/* animation: sp=speed m/s, st: 'idle','sit','dance','down','air' ; opts{aim,punch,driving} */
function animHuman(H,dt,sp,st,opt){
  const A=H.a,legs=H.legs,arms=H.arms;opt=opt||{};
  const run=sm(2.4,5.8,sp),walk=sm(0.08,0.9,sp);
  A.run=lerp(A.run,run,Math.min(1,dt*8));A.smooth=lerp(A.smooth,walk,Math.min(1,dt*10));
  const wk=A.smooth,rn=A.run;
  if(sp>0.08)A.phase+=dt*Math.PI*sp/lerp(0.74,1.15,rn);
  A.sway+=dt;
  const phi=A.phase;
  let hipY=0.93,leanX=0,twist=0,rollZ=0;
  const L=[0,0],K=[0,0],FT=[0,0],AR=[0,0],EL=[0.12,0.12];
  if(st==='sit'){
    hipY=0.5;for(let k=0;k<2;k++){L[k]=1.45;K[k]=1.5;FT[k]=0.0}
    const drv=opt.driving;AR[0]=AR[1]=drv?0.85:0.3;EL[0]=EL[1]=drv?0.9:0.7;leanX=-0.05;
  }else{
    const amp=lerp(0.5,0.98,rn);
    for(let k=0;k<2;k++){
      const ph=phi+(k?Math.PI:0);
      L[k]=amp*Math.sin(ph)*wk;
      K[k]=(0.1+ (0.95+0.85*rn)*Math.pow(Math.max(0,Math.cos(ph-0.35)),1.3))*wk+(1-wk)*0.02;
      FT[k]=-(-L[k]+K[k])*0.75;
      AR[k]=-Math.sin(ph)*(0.55+0.55*rn)*wk*(k?1:1);
      EL[k]=0.12+(0.28+0.9*rn)*wk;
    }
    hipY=0.93-0.02*wk-0.02*rn+Math.cos(2*phi)*(0.018+0.03*rn)*wk;
    leanX=0.03*wk+0.2*rn;twist=Math.sin(phi)*(0.12+0.12*rn)*wk;rollZ=Math.sin(phi)*0.035*wk;
    // arms are driven opposite: left arm forward when right leg forward
    // idle breathing / weight shift
    const idle=1-wk;
    leanX+=Math.sin(A.sway*1.6)*0.012*idle;rollZ+=Math.sin(A.sway*0.7)*0.015*idle;
    AR[0]+=Math.sin(A.sway*1.3)*0.04*idle;AR[1]-=Math.sin(A.sway*1.3)*0.04*idle;
    if(st==='air'){A.air=Math.min(1,A.air+dt*8)}else A.air=Math.max(0,A.air-dt*7);
    if(A.air>0){for(let k=0;k<2;k++){L[k]=lerp(L[k],0.7-0.5*k,A.air);K[k]=lerp(K[k],1.1-0.4*k,A.air);AR[k]=lerp(AR[k],-1.6,A.air);EL[k]=lerp(EL[k],0.5,A.air)}hipY-=0.06*A.air}
    if(st==='dance'){
      const t=A.sway*5.2;hipY=0.9+Math.abs(Math.sin(t))*0.05;rollZ=Math.sin(t)*0.12;twist=Math.sin(t*0.5)*0.4;
      L[0]=Math.sin(t)*0.45;L[1]=-Math.sin(t)*0.45;K[0]=0.35+Math.max(0,Math.sin(t))*0.7;K[1]=0.35+Math.max(0,-Math.sin(t))*0.7;
      AR[0]=-2.2+Math.sin(t*2)*0.4;AR[1]=-2.2-Math.sin(t*2)*0.4;EL[0]=EL[1]=0.9;leanX=0.05;
    }
  }
  // aim / punch overrides (right arm index 1, left 0)
  let aimW=opt.aim?1:0;A.aimT=lerp(A.aimT,aimW,Math.min(1,dt*12));
  let punchPose=0;if(A.punchT>0){A.punchT=Math.max(0,A.punchT-dt/0.38);punchPose=Math.sin((1-A.punchT)*Math.PI)}
  const tw=twist;
  H.hips.position.y=hipY;H.hips.rotation.z=rollZ*0.6;
  H.torso.rotation.set(leanX,tw*(1-A.aimT)-A.aimT*0.25-punchPose*(A.punchSide?-0.5:0.5),-rollZ*0.6);
  for(let k=0;k<2;k++){
    legs[k].th.rotation.x=-L[k];legs[k].sh.rotation.x=K[k];legs[k].ft.rotation.x=FT[k];
    legs[k].th.rotation.z=0;
  }
  for(let k=0;k<2;k++){
    let sa=-AR[k],se=-EL[k];
    if(A.aimT>0.01){const ta=k===1?-1.55:-1.3,te=k===1?-0.05:-0.55;sa=lerp(sa,ta,A.aimT);se=lerp(se,te,A.aimT)}
    if(punchPose>0&&((k===1)!==!!A.punchSide)){sa=lerp(sa,-1.55,punchPose);se=lerp(se,-0.05,punchPose)}
    arms[k].sg.rotation.x=sa;arms[k].eg.rotation.x=se;arms[k].sg.rotation.z=arms[k].s*0.07;
  }
  if(st==='dance'){arms[0].sg.rotation.z=0.5;arms[1].sg.rotation.z=-0.5}
  // down / ragdoll-lite
  const dn=st==='down'?1:0;A.down=lerp(A.down,dn,Math.min(1,dt*(dn?7:4)));
  H.body.rotation.x=-A.down*1.45;H.body.position.y=A.down*0.16;H.body.position.z=-A.down*0.35;
  if(A.down>0.05){for(let k=0;k<2;k++){legs[k].th.rotation.x=lerp(legs[k].th.rotation.x,-0.2+k*0.5,A.down);legs[k].th.rotation.z=lerp(0,(k?1:-1)*0.25,A.down);arms[k].sg.rotation.x=lerp(arms[k].sg.rotation.x,-0.3-k*0.6,A.down);arms[k].sg.rotation.z=lerp(arms[k].sg.rotation.z,(k?-1:1)*-0.7,A.down)}}
  // head: look + counter lean + blink
  H.head.rotation.x=-leanX*0.7;H.head.rotation.y=A.look;
  A.blink-=dt;if(A.blink<0){A.blink=2+Math.random()*4}
  const bl=A.blink<0.12?0.12:1;for(const e of H.eyes)e.scale.y=bl;
  if(H.flash){if(A.flashT>0){A.flashT-=dt;H.flash.visible=true;H.flash.scale.setScalar(0.7+Math.random()*0.7)}else H.flash.visible=false}
}

/* ---- merge every body part into one vertex-coloured mesh (13 draw calls per person instead of ~60) ---- */
const HUMAN_MAT=std({vertexColors:true,roughness:.72,metalness:0,side:T3.DoubleSide},.8);
function mergeHumanParts(H){
  const parts=[H.hips,H.torso,H.head];H.legs.forEach(l=>{parts.push(l.th,l.sh,l.ft)});H.arms.forEach(a=>{parts.push(a.sg,a.eg)});
  const stop=new Set(parts);stop.add(H.gun);
  const _a=new T3.Matrix4();
  parts.forEach(part=>{
    const gb=new GB(),dead=[];
    const rec=(node,mx)=>{node.children.forEach(ch=>{if(stop.has(ch))return;ch.updateMatrix();const m=mx.clone().multiply(ch.matrix);
      if(ch.isMesh){const c=ch.material.color;gb.geo(ch.geometry,m,[c.r,c.g,c.b]);dead.push(ch)}else if(ch.isGroup||ch.isObject3D)rec(ch,m)})};
    rec(part,new T3.Matrix4());
    const kill=(node)=>{node.children.slice().forEach(ch=>{if(stop.has(ch))return;if(ch.isMesh)node.remove(ch);else{kill(ch);if(!ch.children.length||ch.children.every(k=>k.isMesh===undefined&&!k.children.length))node.remove(ch)}})};
    kill(part);
    if(gb.vc){const mesh=new T3.Mesh(gb.build(),HUMAN_MAT);mesh.castShadow=false;mesh.frustumCulled=true;part.add(mesh);part.userData.merged=mesh}
  });
  H.eyes=[{scale:{y:1}},{scale:{y:1}}];
}
function humanShadows(H,on){if(H._sh===on)return;H._sh=on;H.root.traverse(o=>{if(o.isMesh)o.castShadow=on})}

/* ===== VEHICLE MODELS ===== */
const CARS={
  hatch:{n:'City Hatch',L:3.9,W:1.72,bh:0.92,rh:1.5,nd:0.12,cab:[-1.5,-1.0,0.35,0.95],wr:0.31,wz:[1.25,-1.2],vmax:36,acc:11,grip:7.5,price:4500,hp:100},
  sedan:{n:'Sterling S',L:4.7,W:1.84,bh:0.95,rh:1.42,nd:0.18,cab:[-1.45,-0.9,0.5,1.1],wr:0.34,wz:[1.5,-1.45],vmax:46,acc:13,grip:7.5,price:14000,hp:110},
  suv:{n:'Boxer G',L:4.7,W:1.96,bh:1.28,rh:1.95,nd:0.04,cab:[-2.25,-2.15,0.9,1.0],wr:0.43,wz:[1.55,-1.5],vmax:44,acc:12,grip:7,price:68000,hp:160},
  sports:{n:'Apex GT',L:4.5,W:1.98,bh:0.78,rh:1.14,nd:0.22,cab:[-1.1,-0.5,0.2,0.95],wr:0.36,wz:[1.4,-1.35],vmax:62,acc:19,grip:8.5,price:150000,hp:100,spoiler:true},
  hyper:{n:'Veyra Hyper',L:4.6,W:2.02,bh:0.8,rh:1.16,nd:0.26,cab:[-1.2,-0.6,0.1,0.85],wr:0.37,wz:[1.4,-1.4],vmax:84,acc:27,grip:9.5,price:480000,hp:100,spoiler:true,gold:true},
  chiron:{n:'Bugatti Chiron',base:'hyper',vmax:92,acc:30,grip:10,price:2600000,hp:110},
  aventador:{n:'Lamborghini Aventador',base:'hyper',L:4.8,rh:1.12,vmax:88,acc:29,grip:9.8,price:1900000,hp:110,gold:false},
  ferrari:{n:'Ferrari 488',base:'sports',vmax:78,acc:24,grip:9.2,price:900000,hp:105},
  tesla:{n:'Tesla Model S Plaid',base:'sedan',vmax:68,acc:30,grip:8.6,price:320000,hp:120},
  skyfly:{n:'Tesla Skyfly (flies!)',base:'sports',vmax:72,acc:26,grip:8,price:3500000,hp:130,fly:true},
  taxi:{n:'Taxi',base:'sedan',vmax:44,acc:12,grip:7.5,hp:110,sign:true},
  police:{n:'Police',base:'sedan',vmax:58,acc:16,grip:8.5,hp:140,bar:true},
  danfo:{n:'Danfo Bus',L:5.2,W:1.95,bh:1.15,rh:2.4,nd:0.1,cab:[-2.5,-2.45,1.75,1.95],wr:0.38,wz:[1.7,-1.6],vmax:30,acc:8,grip:6,hp:140,stripe:true},
  bus:{n:'City Bus',L:10.5,W:2.5,bh:1.15,rh:3.2,nd:0.05,cab:[-5.1,-5.05,4.6,5.0],wr:0.5,wz:[3.6,-3.4],vmax:22,acc:5,grip:5.5,hp:200}
};
for(const k in CARS){const c=CARS[k];if(c.base){const b=CARS[c.base];for(const q in b)if(c[q]===undefined)c[q]=b[q]}}
const PAINT=['#e8e8ea','#16171a','#9a1b24','#1f3f8c','#6f7378','#d9d3c3','#0e6b52','#b86b1d','#2f2f35','#c9cdd2','#5b2a86'];

const LIGHT_HEAD=new THREE.MeshBasicMaterial({color:0xcfd6dd,toneMapped:false});
const GLASS_MAT=std({vertexColors:true,color:0xffffff,roughness:0.06,metalness:0.85,transparent:true,opacity:0.68},1.0);GLASS_MAT.depthWrite=false;
const paintMats={};
function paintMat(hex){if(!paintMats[hex]){const m=std({vertexColors:true,color:new THREE.Color(hex),roughness:0.3,metalness:0.55},0.9);paintMats[hex]=m}return paintMats[hex]}
const WHEEL_MAT=std({vertexColors:true,roughness:0.55,metalness:0.2});
const lightGlowTex=(()=>{const c=mkCanvas(64,128),g=c.getContext('2d');const gr=g.createLinearGradient(0,128,0,0);gr.addColorStop(0,'rgba(255,240,200,0.8)');gr.addColorStop(0.5,'rgba(255,230,170,0.25)');gr.addColorStop(1,'rgba(255,220,150,0)');g.fillStyle=gr;g.fillRect(0,0,64,128);const gx=g.createLinearGradient(0,0,64,0);gx.addColorStop(0,'rgba(0,0,0,1)');gx.addColorStop(0.5,'rgba(0,0,0,0)');gx.addColorStop(1,'rgba(0,0,0,1)');g.globalCompositeOperation='destination-out';g.fillStyle=gx;g.fillRect(0,0,64,128);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t})();

function quadOut(gb,a,b,c,d,ctr,cols){
  const ux=b[0]-a[0],uy=b[1]-a[1],uz=b[2]-a[2],vx=d[0]-a[0],vy=d[1]-a[1],vz=d[2]-a[2];
  let nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx;const l=Math.hypot(nx,ny,nz)||1;nx/=l;ny/=l;nz/=l;
  const cx=(a[0]+b[0]+c[0]+d[0])/4-ctr[0],cy=(a[1]+b[1]+c[1]+d[1])/4-ctr[1],cz=(a[2]+b[2]+c[2]+d[2])/4-ctr[2];
  if(nx*cx+ny*cy+nz*cz<0){gb.quad([a,d,c,b],[-nx,-ny,-nz],[cols[0],cols[3],cols[2],cols[1]]);}else gb.quad([a,b,c,d],[nx,ny,nz],cols);
}
function loft(gb,secs,lo,hi,capEnds=true){
  const ring=s=>[[-s[3],s[1],s[0]],[s[3],s[1],s[0]],[s[4],s[2],s[0]],[-s[4],s[2],s[0]]];
  const ctr=[0,0,0];let cc=0;secs.forEach(s=>{ctr[1]+=(s[1]+s[2])/2;ctr[2]+=s[0];cc++});ctr[1]/=cc;ctr[2]/=cc;
  for(let i=0;i<secs.length-1;i++){
    const A=ring(secs[i]),B=ring(secs[i+1]);
    quadOut(gb,A[0],B[0],B[1],A[1],ctr,[lo,lo,lo,lo]); // bottom
    quadOut(gb,A[3],B[3],B[2],A[2],ctr,[hi,hi,hi,hi]); // top
    quadOut(gb,A[0],B[0],B[3],A[3],ctr,[lo,lo,hi,hi]); // -x side
    quadOut(gb,A[1],B[1],B[2],A[2],ctr,[lo,lo,hi,hi]); // +x side
  }
  if(capEnds){for(const s of[secs[0],secs[secs.length-1]]){const r=ring(s);quadOut(gb,r[0],r[1],r[2],r[3],ctr,[lo,lo,hi,hi])}}
}
const carGeoCache={};
function carGeo(name){
  if(carGeoCache[name])return carGeoCache[name];
  const sp=CARS[name],bs=CARS[sp.base||name];const L=bs.L,w=bs.W/2,bh=bs.bh,rh=bs.rh,nd=bs.nd,cab=bs.cab,g0=0.26;
  const body=new GBo(),glass=new GBo(),head=new GBo(),tail=new GBo();
  const P=[1,1,1],lo=[0.22,0.22,0.24],low=[0.42,0.42,0.44],DK=[0.03,0.03,0.035],GL=[0.05,0.07,0.09],hiC=[1,1,1];
  const front=L/2;
  const secs=[
    [-front,g0+0.08,bh*0.72,w*0.8,w*0.76],[-front+0.12,g0,bh*0.93,w*0.95,w*0.9],[-L*0.22,g0,bh,w,w*0.96],[L*0.12,g0,bh,w,w*0.96],
    [front-0.75,g0,bh-nd*0.55,w*0.98,w*0.92],[front-0.12,g0,bh-nd,w*0.95,w*0.88],[front,g0+0.08,bh-nd-0.12,w*0.84,w*0.78]];
  loft(body,secs,low,hiC);
  // cabin (glass) and roof
  const cb=bh-0.02,csecs=[[cab[0],cb,bh+0.02,w*0.91,w*0.89],[cab[1],cb,rh,w*0.89,w*0.76],[cab[2],cb,rh,w*0.89,w*0.76],[cab[3],cb,bh-nd*0.2,w*0.91,w*0.89]];
  loft(glass,csecs,GL,GL);
  // roof panel (paint)
  loft(body,[[cab[1]-0.02,rh-0.02,rh+0.045,w*0.78,w*0.77],[cab[2]+0.03,rh-0.02,rh+0.045,w*0.78,w*0.77]],P,P);
  // pillars (B pillar & C pillar) paint boxes on sides
  const bz=(cab[1]+cab[2])/2;
  for(const s of[-1,1]){
    const px=s*w*0.865;
    boxFlat(body,Math.min(px,px)-0.03,bh-0.02,bz-0.05,px+0.03,rh-0.04,bz+0.05,P,{side:1,top:1,bot:1,noTop:false});
    boxFlat(body,px-0.03+s*0.02,bh-0.02,cab[1]-0.12,px+0.03+s*0.02,rh-0.06,cab[1]+0.06,P,{side:1,top:1,bot:1});
  }
  // bumpers, grille, plates
  boxFlat(body,-w*0.9,g0+0.02,front-0.3,w*0.9,g0+0.2,front+0.03,DK,{side:1,bot:1,top:1});
  boxFlat(body,-w*0.9,g0+0.02,-front-0.03,w*0.9,g0+0.2,-front+0.3,DK,{side:1,bot:1,top:1});
  boxFlat(body,-w*0.5,g0+0.26,front-0.08,w*0.5,g0+0.46,front+0.01,DK,{side:1,bot:1,top:1}); // grille
  boxFlat(body,-0.26,g0+0.12,front+0.01,0.26,g0+0.26,front+0.03,[0.92,0.92,0.9],{side:1,bot:1,top:1});
  boxFlat(body,-0.26,g0+0.26,-front-0.03,0.26,g0+0.38,-front-0.01,[0.92,0.92,0.9],{side:1,bot:1,top:1});
  // mirrors
  for(const s of[-1,1]){boxFlat(body,s*(w+0.12)-0.05,bh+0.05,cab[2]-0.38,s*(w+0.12)+0.05,bh+0.17,cab[2]-0.22,P,{side:1,top:1,bot:1})}
  // side skirt dark
  for(const s of[-1,1])boxFlat(body,s*w*0.995-0.015,g0-0.02,-front+0.7,s*w*0.995+0.015,g0+0.1,front-0.7,DK,{side:1,top:1,bot:1});
  // lights
  const hy=bh-nd-0.17;
  for(const s of[-1,1]){
    boxFlat(head,s*w*0.62-0.2,hy-0.05,front-0.1,s*w*0.62+0.2,hy+0.08,front+0.04,[1,1,1],{side:1,top:1,bot:1});
    boxFlat(tail,s*w*0.66-0.22,bh*0.78-0.04,-front-0.04,s*w*0.66+0.22,bh*0.78+0.08,-front+0.07,[1,0.08,0.08],{side:1,top:1,bot:1});
  }
  if(bs.spoiler){boxFlat(body,-w*0.85,bh+0.18,-front+0.08,w*0.85,bh+0.24,-front+0.5,DK,{side:1,top:1,bot:1});for(const s of[-1,1])boxFlat(body,s*w*0.55-0.03,bh-0.02,-front+0.2,s*w*0.55+0.03,bh+0.2,-front+0.3,DK,{side:1,top:1,bot:1})}
  if(sp.sign)boxFlat(body,-0.32,rh+0.04,-0.15,0.32,rh+0.2,0.15,[1,1,0.6],{side:1,top:1,bot:1});
  if(sp.bar){boxFlat(body,-0.5,rh+0.04,-0.12,0.5,rh+0.14,0.12,[0.1,0.1,0.12],{side:1,top:1,bot:1})}
  if(sp.stripe)for(const s of[-1,1])boxFlat(body,s*w*0.998-0.02,g0+0.32,-front+0.6,s*w*0.998+0.02,g0+0.5,front-0.4,DK,{side:1,top:1,bot:1});
  if(bs.gold){boxFlat(body,-0.2,bh-nd-0.01,front-0.9,0.2,bh-nd+0.02,front-0.05,[0.95,0.75,0.2],{side:1,top:1,bot:1})}
  // occupant bust (driver) into glass (dark silhouette)
  const dx=w*0.42,dz=(cab[1]+cab[2])/2+0.35;
  glass.addGeo(new THREE.BoxGeometry(0.4,0.5,0.25),mat4(dx,cb+0.42,dz-0.15),[0.1,0.11,0.14]);
  glass.addGeo(new THREE.SphereGeometry(0.12,8,6),mat4(dx,cb+0.82,dz-0.12),[0.35,0.24,0.18]);
  // wheels
  const wr=bs.wr,ww=0.26;
  const wg=new GBo();
  wg.addGeo(new THREE.CylinderGeometry(wr,wr,ww,16),mat4(0,0,0,0,0,Math.PI/2),[0.04,0.04,0.045]);
  wg.addGeo(new THREE.CylinderGeometry(wr*0.64,wr*0.64,ww+0.02,14),mat4(0,0,0,0,0,Math.PI/2),bs.gold?[0.8,0.65,0.2]:[0.62,0.64,0.68]);
  wg.addGeo(new THREE.CylinderGeometry(wr*0.2,wr*0.2,ww+0.03,8),mat4(0,0,0,0,0,Math.PI/2),[0.15,0.15,0.17]);
  for(let k=0;k<5;k++){const a=k/5*TAU;wg.addGeo(new THREE.BoxGeometry(ww+0.025,wr*0.12,wr*0.58),mat4(0,Math.sin(a)*wr*0.36,Math.cos(a)*wr*0.36,a*-1,0,0),[0.25,0.26,0.29])}
  const out={body:body.build(),glass:glass.build(),head:head.build(),tail:tail.build(),wheel:wg.build(),spec:bs,sp,w,wx:w-0.1,wr,front,rh};
  // body with wheels merged (for parked cars: fewer draw calls)
  const pb=new GBo();pb.p=body.p.slice();pb.n=body.n.slice();pb.c=body.c.slice();pb.u=body.u.slice();pb.i=body.i.slice();pb.vc=body.vc;
  for(const z of bs.wz)for(const s of[-1,1])pb.addGeoVC(out.wheel,mat4(s*(w-0.1),wr,z));
  // wheel colours are baked above wholesale; paint multiplies them, so use neutral paint-independent tint
  out.parked=pb.build();
  carGeoCache[name]=out;return out;
}

/* build a car instance */
const tailMats=[];
function makeCarMesh(name,color,full=true){
  const cg=carGeo(name),sp=CARS[name];const grp=new THREE.Group();
  const paint=sp.stripe||sp.n==='Taxi'?'#f2b705':sp.base==='sedan'&&name==='police'?'#f4f6f8':color;
  const hex=name==='taxi'||name==='danfo'?'#f2b705':name==='police'?'#f4f6f8':name==='bus'?'#e6e9ec':color;
  const bm=new THREE.Mesh(full?cg.body:cg.parked,paintMat(hex));bm.castShadow=true;grp.add(bm);
  const gm=new THREE.Mesh(cg.glass,GLASS_MAT);grp.add(gm);
  const car={name,grp,color:hex,spec:cg.spec,sp,wheels:[],cg};
  if(full){
    const hm=new THREE.Mesh(cg.head,LIGHT_HEAD);grp.add(hm);
    const tm=new THREE.MeshBasicMaterial({color:0x661010,toneMapped:false});tailMats.push(tm);car.tailMat=tm;
    grp.add(new THREE.Mesh(cg.tail,tm));
    const bs=cg.spec;
    for(const z of bs.wz)for(const s of[-1,1]){
      const piv=new THREE.Group();piv.position.set(s*(cg.w-0.1),bs.wr,z);const wm=new THREE.Mesh(cg.wheel,WHEEL_MAT);wm.castShadow=false;piv.add(wm);grp.add(piv);
      car.wheels.push({piv,wm,front:z>0,s});
    }
    // headlight glow on ground (night)
    const gl=new THREE.Mesh(new THREE.PlaneGeometry(6,13),new THREE.MeshBasicMaterial({map:lightGlowTex,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false,fog:false}));
    gl.rotation.x=-Math.PI/2;gl.rotation.z=Math.PI;gl.position.set(0,0.16,cg.front+6.2);gl.renderOrder=3;grp.add(gl);car.glow=gl;
    if(name==='police'){
      const m1=new THREE.MeshBasicMaterial({color:0xff2020,toneMapped:false}),m2=new THREE.MeshBasicMaterial({color:0x2060ff,toneMapped:false});
      const b1=new THREE.Mesh(new THREE.BoxGeometry(0.46,0.1,0.22),m1),b2=new THREE.Mesh(new THREE.BoxGeometry(0.46,0.1,0.22),m2);
      b1.position.set(-0.26,cg.rh+0.2,0);b2.position.set(0.26,cg.rh+0.2,0);grp.add(b1,b2);car.sirens=[m1,m2];
    }
    // exhaust / smoke anchor
  }
  return car;
}

/* ===== VEHICLES: physics, traffic AI, parked cars, police ===== */
const vehicles=[],DIRV=[[1,0],[-1,0],[0,1],[0,-1]],DIRH=[Math.PI/2,-Math.PI/2,0,Math.PI];
let vidc=1;const LANE=2.8,PARKOFF=6.2;
const fxv=h=>[Math.sin(h),Math.cos(h)];
const juncMap=new Map();
const jk=(a,b)=>a*64+b;
const player={x:0,z:20,y:0,h:0,vx:0,vz:0,vy:0,hp:100,st:'foot',car:null,aim:false,speed:0,money:2500,cash:0};const peds=[];

/* ---- particles (sprites) ---- */
const puffTex=(()=>{const c=mkCanvas(64,64),g=c.getContext('2d');const gr=g.createRadialGradient(32,32,2,32,32,32);gr.addColorStop(0,'rgba(255,255,255,0.9)');gr.addColorStop(0.5,'rgba(255,255,255,0.35)');gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;g.fillRect(0,0,64,64);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t})();
const parts=[];const partPool=[];
function emit(x,y,z,vx,vy,vz,life,size,r,g,b,grow=1.5,add=false){
  return; // particles disabled: nothing may ever cover the screen
  let p=partPool.pop();
  if(!p){const m=new THREE.SpriteMaterial({map:puffTex,transparent:true,depthWrite:false,fog:true});p={s:new THREE.Sprite(m)};scene.add(p.s)}
  p.s.visible=true;p.s.material.color.setRGB(r,g,b);p.s.material.blending=add?THREE.AdditiveBlending:THREE.NormalBlending;p.s.material.opacity=0.7;
  p.x=x;p.y=y;p.z=z;p.vx=vx;p.vy=vy;p.vz=vz;p.life=life;p.max=life;p.size=size;p.grow=grow;p.add=add;p.s.position.set(x,y,z);p.s.scale.setScalar(size);parts.push(p);
}
function updateParts(dt){
  for(let i=parts.length-1;i>=0;i--){const p=parts[i];p.life-=dt;if(p.life<=0){p.s.visible=false;partPool.push(p);parts.splice(i,1);continue}
    p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;p.vx*=0.985;p.vz*=0.985;const k=p.life/p.max;p.size+=p.grow*dt;p.s.position.set(p.x,p.y,p.z);p.s.scale.setScalar(p.size);const cd=Math.hypot(p.x-camera.position.x,p.y-camera.position.y,p.z-camera.position.z);const fd=Math.min(1,Math.max(0,(cd-2.5)/6));p.s.material.opacity=(p.add?1:0.4)*k*fd}
}
function sparks(x,y,z,n=6){for(let i=0;i<n;i++)emit(x,y,z,(Math.random()-0.5)*5,Math.random()*3,(Math.random()-0.5)*5,0.3,0.25,1,0.85,0.4,0,true)}

/* ---- vehicle lifecycle ---- */
function spawnVehicle(name,color,x,z,h,mode){
  const car=makeCarMesh(name,color,mode!=='parked');
  const sp=CARS[name],bs=carGeo(name).spec;
  const V={id:vidc++,name,spec:sp,bs,car,x,z,y:groundH(x,z),h,vx:0,vz:0,yr:0,steer:0,thr:0,brk:0,hb:0,hp:sp.hp,mode,driver:null,speed:0,spin:0,roll:0,pitch:0,L:bs.L,W:bs.W,smokeT:0,stuck:0,ai:null,owned:false,heat:false,alarm:0,mass:name==='bus'?4:name==='danfo'?1.8:name==='suv'?1.5:1};
  car.grp.position.set(x,V.y,z);car.grp.rotation.set(0,h,0);scene.add(car.grp);vehicles.push(V);return V;
}
function removeVehicle(V){scene.remove(V.car.grp);const i=vehicles.indexOf(V);if(i>=0)vehicles.splice(i,1);if(V.ai&&V.ai.jkey!==undefined)juncLeave(V)}
function upgradeToFull(V){ // parked -> full model with wheels
  if(V.car.wheels.length)return;
  const old=V.car.grp;const nc=makeCarMesh(V.name,V.car.color,true);nc.color=V.car.color;
  nc.grp.position.copy(old.position);nc.grp.rotation.copy(old.rotation);scene.remove(old);scene.add(nc.grp);V.car=nc;
  // make sure the colour matches (makeCarMesh recomputes by name)
}
function syncMesh(V,dt){
  const c=V.car,g=c.grp;
  const gh=groundH(V.x,V.z);V.y=lerp(V.y,gh+(V.flying?V.alt:0),Math.min(1,dt*(V.flying||V.y>gh+.6?1.1:14)));if(V.flying&&V.y<gh+1.2&&V.alt===0){V.flying=false}
  g.position.set(V.x,V.y,V.z);g.rotation.set(V.pitch,V.h,V.roll,'YXZ');
  if(c.wheels.length){
    V.spin+=V.speed*dt/(V.bs.wr);
    for(const w of c.wheels){w.wm.rotation.x=V.spin;if(w.front)w.piv.rotation.y=V.steer*0.5}
  }
  if(c.tailMat){const br=V.brk>0&&V.speed>0.5||(V.thr<0);const night=dayInfo.lamp||0;const lv=br?1:0.28+0.45*night;c.tailMat.color.setRGB(lv,lv*0.07,lv*0.07)}
  if(c.glow)c.glow.material.opacity=Math.min(1,(dayInfo.lamp||0)*0.9)*(V.mode==='parked'?0:1);
  if(c.sirens){const t=performance.now()/140|0;c.sirens[0].color.setRGB(t%2?1:0.15,0.05,0.05);c.sirens[1].color.setRGB(0.05,0.1,t%2?0.15:1)}
}

/* ---- driving physics ---- */
function carPhysics(V,dt){
  const sp=V.spec,f=fxv(V.h),lx=Math.cos(V.h),lz=-Math.sin(V.h);
  let vf=V.vx*f[0]+V.vz*f[1],vl=V.vx*lx+V.vz*lz;
  let acc=0;const dead=V.hp<=0;
  if(!dead){
    if(V.thr>0){acc+=sp.acc*(V.boost?1.7:1)*V.thr*(1-Math.max(0,vf)/(sp.vmax*(V.boost?1.3:1)));if(vf<-0.5)acc+=18*V.thr}
    if(V.brk>0){if(vf>0.4)acc-=28*V.brk;else acc-=9*V.brk*clamp(1+vf/10,0,1)}
  }
  acc-=vf*0.1+Math.sign(vf)*0.3;
  if(!V.thr&&!V.brk)acc-=Math.sign(vf)*Math.min(Math.abs(vf)/dt*0.02,1.2);
  vf+=acc*dt;
  const grip=V.hb?1.5:sp.grip*(1-0.25*clamp((Math.abs(vf)-35)/30,0,1));
  vl*=Math.exp(-grip*dt);
  if(!V.thr&&!V.brk&&Math.abs(vf)<1.2)vf*=Math.exp(-3*dt);
  const sa=V.steer*0.62/(1+Math.abs(vf)/15);
  let yr=vf/(V.L*0.6)*Math.tan(sa)*(V.hb?1.4:1);yr=clamp(yr,-2.8,2.8);
  V.yr=lerp(V.yr,yr,1-Math.exp(-11*dt));
  V.h+=V.yr*dt;
  V.vx=f[0]*vf+lx*vl;V.vz=f[1]*vf+lz*vl;
  V.x+=V.vx*dt;V.z+=V.vz*dt;
  V.speed=vf;V.slip=Math.abs(vl);
  V.roll=lerp(V.roll,clamp(-vl*0.012*Math.sign(1)+V.yr*vf*0.0016,-0.12,0.12),Math.min(1,dt*6));
  V.pitch=lerp(V.pitch,clamp(-acc*0.0035,-0.06,0.06),Math.min(1,dt*6));
  // smoke when drifting/hb / damaged
  if((V.slip>3.2||(V.hb&&Math.abs(vf)>8))&&Math.abs(vf)>4){V.smokeT-=dt;if(V.smokeT<0){V.smokeT=0.04;for(const s of[-1,1]){const rx=V.x-f[0]*V.L*0.32+(-lx)*s*V.W*0.4,rz=V.z-f[1]*V.L*0.32+(-lz)*s*V.W*0.4;emit(rx,0.25,rz,(Math.random()-0.5)*1.2,0.6,(Math.random()-0.5)*1.2,0.9,0.8,0.82,0.82,0.85,2.2)}if(V===player.car)audio.skid(Math.min(1,V.slip/9))}}
  if(V.hp<55){V.dsm=(V.dsm||0)-dt;if(V.dsm<0){const fire=V.hp<=0;V.dsm=fire?0.12:0.4;const fx=V.x+f[0]*V.L*0.35,fz=V.z+f[1]*V.L*0.35;
    emit(fx,0.9,fz,(Math.random()-0.5)*0.5,1.6,(Math.random()-0.5)*0.5,1.3,0.45,0.9,0.9,0.92,0.7);
    if(fire)emit(fx,0.8,fz,(Math.random()-0.5)*0.6,1.2,(Math.random()-0.5)*0.6,0.5,0.5,1,0.5,0.1,0.6,true)}}
}
const _cc=[0,0,0];
function carCircles(V){const f=fxv(V.h),r=V.W*0.5+0.04,o=V.L*0.5-r-0.1;const n=V.L>7?4:3;const arr=[];for(let k=0;k<n;k++){const t=n===1?0:(k/(n-1)*2-1)*o;arr.push([V.x+f[0]*t,V.z+f[1]*t,r,t])}return arr}
let shake=0;
function carBuildingCollide(V){
  if(V.y>groundH(V.x,V.z)+7)return;
  const f=fxv(V.h);
  for(const c of carCircles(V)){
    for(let it=0;it<2;it++){
      const hit=colResolve(c[0],c[1],c[2]);if(!hit)break;
      V.x+=hit.nx*hit.pen;V.z+=hit.nz*hit.pen;c[0]+=hit.nx*hit.pen;c[1]+=hit.nz*hit.pen;
      const vn=V.vx*hit.nx+V.vz*hit.nz;
      if(vn<0){
        const imp=-vn;V.vx-=(1.3)*vn*hit.nx;V.vz-=(1.3)*vn*hit.nz;
        // spin from off-centre hits
        const r=c[3];V.yr+=(hit.nx*f[1]-hit.nz*f[0])*imp*Math.sign(r)*0.03*Math.min(1,Math.abs(r)/1.5);
        V.vx*=0.94;V.vz*=0.94;

      }
    }
  }
}
function damageVehicle(V,imp){return;
  if(imp<7||V.hp<=0)return;const now=performance.now();if(V.lastCrash&&now-V.lastCrash<1100)return;V.lastCrash=now;
  const d=Math.min(36,Math.max(12,(imp-6)*1.7))/Math.sqrt(V.mass);const was=V.hp;V.hp=Math.max(0,V.hp-d);V.crashN=(V.crashN||0)+1;
  if(V===player.car){
    if(V.hp>0&&V.hp<55&&was>=55)toast('💨 Car is smoking — drive carefully');
    if(was>0&&V.hp<=0&&V.driver==='player'){V.deadT=0;banner('🔥 GET OUT!','Your car is on fire — tap GET OUT',3500,'#ff7a4a');toast('🔥 It will explode soon!')}}
}
function vehicleVsVehicle(){
  for(let i=0;i<vehicles.length;i++){const A=vehicles[i];if(A.mode==='parked'&&!A.moved)continue;
    for(let j=i+1;j<vehicles.length;j++){const B=vehicles[j];
      if(A.y>groundH(A.x,A.z)+5||B.y>groundH(B.x,B.z)+5)continue;
      const dx=B.x-A.x,dz=B.z-A.z;const rr2=(A.L+B.L)*0.5;if(dx*dx+dz*dz>rr2*rr2)continue;
      if(A.mode==='parked'&&B.mode==='parked')continue;
      // circle pairs
      const ca=carCircles(A),cb=carCircles(B);let best=null;
      for(const a of ca)for(const b of cb){const ex=b[0]-a[0],ez=b[1]-a[1],d=Math.hypot(ex,ez),m=a[2]+b[2];if(d<m){const pen=m-d;if(!best||pen>best.pen)best={pen,nx:d>1e-4?ex/d:1,nz:d>1e-4?ez/d:0}}}
      if(!best)continue;
      const ma=A.mass,mb=B.mode==='parked'&&!B.moved?3:B.mass,ta=ma/(ma+mb);
      const pa=(A.mode==='parked'&&!A.moved)?0:1-ta,pb=(B.mode==='parked'&&!B.moved)?0:ta;
      const s=(pa+pb)||1;
      A.x-=best.nx*best.pen*pa/s;A.z-=best.nz*best.pen*pa/s;B.x+=best.nx*best.pen*pb/s;B.z+=best.nz*best.pen*pb/s;
      const rvx=B.vx-A.vx,rvz=B.vz-A.vz,vn=rvx*best.nx+rvz*best.nz;
      if(vn<0){
        const j2=-(1+0.35)*vn/(1/ma+1/mb);
        A.vx-=best.nx*j2/ma;A.vz-=best.nz*j2/ma;B.vx+=best.nx*j2/mb;B.vz+=best.nz*j2/mb;
        const imp=-vn;
        for(const V of[A,B]){if(V.mode==='ai'||V.mode==='cop'&&V.chase){toFree(V)}}

      }
    }
  }
}
function toFree(V){
  if(V.mode==='free')return;
  if(V.ai&&V.ai.jkey!==undefined)juncLeave(V);
  V.mode='free';V.freeT=0;V.thr=0;V.brk=0;const f=fxv(V.h);V.vx=f[0]*V.speed+(V.vx-f[0]*V.speed)*0;V.vz=f[1]*V.speed;
  if(V.car.wheels.length===0)upgradeToFull(V);
}

/* ---- parked cars (deterministic slots, streamed) ---- */
const slotRng=n=>{let a=n*2654435761>>>0;a^=a>>>13;a=Math.imul(a,1274126177)>>>0;return((a^a>>>16)>>>0)/4294967296};
const parkedMap=new Map(),parkedTaken=new Set();
const PT=[['hatch',.2],['sedan',.28],['suv',.14],['taxi',.06],['danfo',.1],['sports',.07],['hatch',.1],['hyper',.012],['sedan',.05]];
function slotType(r){let a=0;for(const[n,w]of PT){a+=w;if(r<a)return n}return'sedan'}
function slotAt(seg,side,k){ // seg: 0 horizontal(ib,ia) 1 vertical ; returns {x,z,h,key,type,col} or null
  const key=seg*100000+side*50000+k;
  return key;
}
function streamParked(px,pz,rad){
  const need=new Set();
  const a0=clamp(Math.floor((px-rad+HALF)/PITCH),0,N),a1=clamp(Math.floor((px+rad+HALF)/PITCH),0,N),b0=clamp(Math.floor((pz-rad+HALF)/PITCH),0,N),b1=clamp(Math.floor((pz+rad+HALF)/PITCH),0,N);
  for(let a=a0;a<=a1;a++)for(let b=b0;b<=b1;b++){
        for(let hv=0;hv<2;hv++)for(let side=0;side<2;side++)for(let k=0;k<11;k++){
      if(hv===0&&a>=N)continue;if(hv===1&&b>=N)continue;if(nodeClosed(a,b)||nodeClosed(a+(hv===0?1:0),b+(hv===1?1:0)))continue;
      const id=(((a*32+b)*2+hv)*2+side)*16+k;
      const r=slotRng(id+17);if(r>0.26)continue;
      const off=14+k*8+(slotRng(id+5)-0.5)*1.6;
      let x,z,h;
      if(hv===0){x=lineX(a)+off;z=lineX(b)+(side?PARKOFF:-PARKOFF);h=side?DIRH[0]:DIRH[1]}
      else{z=lineX(b)+off;x=lineX(a)+(side?-PARKOFF:PARKOFF);h=side?DIRH[2]:DIRH[3]}
      if(Math.hypot(x-px,z-pz)>rad)continue;
      need.add(id);
      if(parkedMap.has(id)||parkedTaken.has(id))continue;
      const type=slotType(slotRng(id+99)),col=PAINT[Math.floor(slotRng(id+7)*PAINT.length)];
      const V=spawnVehicle(type,col,x,z,h+(slotRng(id+3)-0.5)*0.05,'parked');V.slot=id;parkedMap.set(id,V);
    }
  }
  for(const[id,V]of parkedMap){
    if(V.mode!=='parked'||V.moved){parkedMap.delete(id);parkedTaken.add(id);continue}
    if(!need.has(id)||Math.hypot(V.x-px,V.z-pz)>rad+30){removeVehicle(V);parkedMap.delete(id)}
  }
}

/* ---- AI traffic ---- */
function nodeValid(a,b){return a>=0&&a<=N&&b>=0&&b<=N&&!nodeClosed(a,b)}
function laneOffset(dir,ia,ib){ // returns [x,z] lane line coordinate
  if(dir===0)return[null,lineX(ib)+LANE];if(dir===1)return[null,lineX(ib)-LANE];
  if(dir===2)return[lineX(ia)-LANE,null];return[lineX(ia)+LANE,null];
}
const TT=[['hatch',.2],['sedan',.26],['suv',.12],['taxi',.1],['danfo',.13],['sports',.06],['bus',.05],['sedan',.07],['hyper',.005]];
function aiPos(dir,ia,ib,r){ // position when remaining distance to node is r, heading dir
  const nx=lineX(ia),nz=lineX(ib),d=DIRV[dir],l=laneOffset(dir,ia,ib);
  const x=l[0]!==null?l[0]:nx-d[0]*r,z=l[1]!==null?l[1]:nz-d[1]*r;return[x,z];
}
function spawnTraffic(px,pz,heading){
  // pick a node 110-230 away (random direction)
  for(let tries=0;tries<12;tries++){
    const ang=Math.random()*TAU,dist=rr_(110,230);const x=px+Math.sin(ang)*dist,z=pz+Math.cos(ang)*dist;
    const ia=clamp(Math.round((x+HALF)/PITCH),0,N),ib=clamp(Math.round((z+HALF)/PITCH),0,N);
    const dir=mri(0,3);const d=DIRV[dir];
    if(!nodeValid(ia,ib))continue;
    const r=rr_(25,70);const pp=aiPos(dir,ia,ib,r);
    // validity: position must lie within the road extents
    if(Math.abs(pp[0])>HALF+2||Math.abs(pp[1])>HALF+2)continue;
    if(Math.hypot(pp[0]-px,pp[1]-pz)<95)continue;
    let ok=true;for(const o of vehicles){if(Math.hypot(o.x-pp[0],o.z-pp[1])<10){ok=false;break}}if(!ok)continue;
    let a=0,rv=Math.random(),type='sedan';for(const[n,w]of TT){a+=w;if(rv<a){type=n;break}}
    const V=spawnVehicle(type,mpick(PAINT),pp[0],pp[1],DIRH[dir],'ai');
    V.ai={dir,ia,ib,state:'edge',cruise:rr_(11,16),spd:rr_(8,12),turn:-1,jkey:undefined,bez:null};V.speed=V.ai.spd;V.driver='npc';
    return V;
  }
  return null;
}
function juncEnter(V,key){V.ai.jkey=key;let l=juncMap.get(key);if(!l){l=[];juncMap.set(key,l)}l.push(V)}
function juncLeave(V){const l=juncMap.get(V.ai.jkey);if(l){const i=l.indexOf(V);if(i>=0)l.splice(i,1)}V.ai.jkey=undefined}
function gapAhead(V,hx,hz){ // min distance to obstacle in front (centre to centre minus lengths)
  let best=999;const w=V.mode==='cop'?1.6:1.9;
  for(const o of vehicles){
    if(o===V)continue;const dx=o.x-V.x,dz=o.z-V.z;const ah=dx*hx+dz*hz;if(ah<0||ah>34)continue;
    const lat=Math.abs(dx*hz-dz*hx);if(lat>w+o.W*0.25)continue;
    if(o.mode==='parked'&&lat>2.2)continue;
    const g=ah-(V.L+o.L)*0.5;if(g<best)best=g;
  }
  // pedestrians & player on foot
  for(const p of peds){if(p.state==='down'&&p.downT>1)continue;const dx=p.x-V.x,dz=p.z-V.z;const ah=dx*hx+dz*hz;if(ah<0||ah>16)continue;const lat=Math.abs(dx*hz-dz*hx);if(lat>1.6)continue;const g=ah-V.L*0.5-0.6;if(g<best)best=g}
  if(player.st==='foot'){const dx=player.x-V.x,dz=player.z-V.z;const ah=dx*hx+dz*hz;if(ah>0&&ah<16){const lat=Math.abs(dx*hz-dz*hx);if(lat<1.6){const g=ah-V.L*0.5-0.6;if(g<best)best=g}}}
  return best;
}
function chooseTurn(V,dir,ia,ib){
  // options: 0 straight,1 right,2 left. dir idx mapping
  const R_=[[3,2,2,3],[2,3,3,2]]; // placeholder
  const rightOf={0:2,1:3,2:1,3:0},leftOf={0:3,1:2,2:0,3:1}; // dir 0:+x -> right(+z)=2 ; 2:+z(south) -> right is -x =1
  const opts=[];
  const nxt=(d)=>[ia+DIRV[d][0],ib+DIRV[d][1]];
  const ok=(d)=>{const n=nxt(d);return nodeValid(n[0],n[1])};
  if(ok(dir))opts.push([0,dir,.55]);if(ok(rightOf[dir]))opts.push([1,rightOf[dir],.25]);if(ok(leftOf[dir]))opts.push([2,leftOf[dir],.2]);
  if(!opts.length)return[0,dir,true]; // dead end -> flagged
  if(V.chase&&player){ // pick option minimising distance to target
    let b=null,bd=1e9;for(const o of opts){const n=nxt(o[1]);const d=Math.hypot(lineX(n[0])-player.x,lineX(n[1])-player.z);if(d<bd){bd=d;b=o}}return b;
  }
  let t=0;for(const o of opts)t+=o[2];let r=Math.random()*t;for(const o of opts){r-=o[2];if(r<=0)return o}return opts[0];
}
function bez(p0,p1,p2,t){const u=1-t;return[u*u*p0[0]+2*u*t*p1[0]+t*t*p2[0],u*u*p0[1]+2*u*t*p1[1]+t*t*p2[1]]}
function aiStep(V,dt){
  const A=V.ai,hd=DIRH[A.dir],hx=Math.sin(hd),hz=Math.cos(hd);
  const cruise=V.chase?24:A.cruise;
  if(A.state==='edge'){
    const nx=lineX(A.ia),nz=lineX(A.ib),d=DIRV[A.dir];
    const r=(nx-V.x)*d[0]+(nz-V.z)*d[1];
    const axis=A.dir<2?0:1;
    let dist=gapAhead(V,hx,hz)-2.2;
    if(A.turn<0&&r<RW/2+30){const t=chooseTurn(V,A.dir,A.ia,A.ib);A.turn=t[0];A.ndir=t[1];A.dead=t[2]||false}
    const stopR=RW/2+2.3+V.L*0.5;
    if(r>stopR-0.5&&r<stopR+34&&!V.chase){
      const st=lightState(A.ia,A.ib,axis,performance.now()/1000);
      let block=false;
      if(st===2)block=true;else if(st===1&&r>stopR+Math.pow(V.speed,2)/(2*5)+3)block=true;
      const jl=juncMap.get(jk(A.ia,A.ib));if(jl)for(const o of jl)if(o!==V&&((o.ai.dir<2?0:1)!==axis))block=true;
      if(block)dist=Math.min(dist,r-stopR);
    }
    let target=cruise;
    if(dist<40)target=Math.min(target,Math.sqrt(Math.max(0,2*6*Math.max(0,dist))));
    if(A.turn>0||A.dead)target=Math.min(target,r<RW/2+16?7:cruise);
    const dv=target-V.speed;V.speed+=clamp(dv,-12*dt,3.4*dt*(V.chase?2.2:1));
    if(V.speed<0)V.speed=0;
    V.brk=dv<-0.8?1:0;V.thr=dv>0.5?1:0;
    // lateral lane correction
    const l=laneOffset(A.dir,A.ia,A.ib);
    let tx=V.x+d[0]*V.speed*dt,tz=V.z+d[1]*V.speed*dt;
    if(l[0]!==null)tx=lerp(tx,l[0],Math.min(1,dt*3));if(l[1]!==null)tz=lerp(tz,l[1],Math.min(1,dt*3));
    V.vx=(tx-V.x)/dt;V.vz=(tz-V.z)/dt;V.x=tx;V.z=tz;
    V.h+=angDiff(V.h,hd)*Math.min(1,dt*5);V.yr=0;
    // junction entry
    if(r<=RW/2+0.2){
      if(A.dead){ // U-turn region: just despawn
        V.despawn=true;return}
      if(A.jkey===undefined)juncEnter(V,jk(A.ia,A.ib));
      if(A.turn===0){ if(r<-RW/2){juncLeave(V);A.ia+=d[0];A.ib+=d[1];A.turn=-1} }
      else{
        // begin turn
        const nd=A.ndir,nd2=DIRV[nd];const exitC=[nx+nd2[0]*RW/2,nz+nd2[1]*RW/2];
        const nl=laneOffset(nd,A.ia+nd2[0],A.ib+nd2[1]);
        const p2=[nl[0]!==null?nl[0]:exitC[0],nl[1]!==null?nl[1]:exitC[1]];
        const lin=laneOffset(A.dir,A.ia,A.ib);
        const cx=(A.dir<2?(nl[0]!==null?nl[0]:lin[0]):(lin[0]!==null?lin[0]:nl[0])),cz=(A.dir<2?(lin[1]!==null?lin[1]:nl[1]):(nl[1]!==null?nl[1]:lin[1]));
        const p0=[V.x,V.z],p1=[cx,cz];
        let len=0,pp=p0;for(let k=1;k<=10;k++){const q=bez(p0,p1,p2,k/10);len+=Math.hypot(q[0]-pp[0],q[1]-pp[1]);pp=q}
        A.bez={p0,p1,p2,t:0,len};A.state='turn';
      }
    }
  }else{ // turn
    const B=A.bez;const sp=Math.max(V.speed,3.5);
    const tgt=A.turn===1?6.5:8;V.speed+=clamp(tgt-V.speed,-8*dt,3*dt);
    const gap=gapAhead(V,Math.sin(V.h),Math.cos(V.h))-2;if(gap<6){V.speed=Math.min(V.speed,Math.max(0,gap)*1.2)}
    B.t=Math.min(1,B.t+V.speed*dt/B.len);
    const q=bez(B.p0,B.p1,B.p2,B.t),q2=bez(B.p0,B.p1,B.p2,Math.min(1,B.t+0.02));
    const nvx=(q[0]-V.x)/dt,nvz=(q[1]-V.z)/dt;V.vx=nvx;V.vz=nvz;V.x=q[0];V.z=q[1];
    const nh=Math.atan2(q2[0]-q[0],q2[1]-q[1]);if(B.t<1)V.h+=angDiff(V.h,nh)*Math.min(1,dt*10);
    if(B.t>=1){juncLeave(V);const nd2=DIRV[A.ndir];A.dir=A.ndir;A.ia+=nd2[0];A.ib+=nd2[1];A.state='edge';A.turn=-1;A.bez=null}
  }
}

/* ---- police ---- */
let wanted=0,wantedT=0,heatAcc=0,copsT=0;
const cops=[];
function addHeat(n){heatAcc+=n;if(heatAcc>=1){heatAcc=0;if(wanted<3){wanted++;toast('Wanted level '+wanted+' ★'.repeat(wanted));audio.siren&&audio.siren(0.6)}wantedT=0}}
function setWanted(n){wanted=n;heatAcc=0;wantedT=0}
function spawnCop(){
  for(let t=0;t<10;t++){
    const ang=Math.random()*TAU,dist=rr_(110,160);const x=player.x+Math.sin(ang)*dist,z=player.z+Math.cos(ang)*dist;
    const ia=clamp(Math.round((x+HALF)/PITCH),0,N),ib=clamp(Math.round((z+HALF)/PITCH),0,N);const dir=mri(0,3);const r=rr_(25,50);const pp=aiPos(dir,ia,ib,r);
    if(Math.abs(pp[0])>HALF||Math.abs(pp[1])>HALF)continue;if(Math.hypot(pp[0]-player.x,pp[1]-player.z)<80)continue;
    const V=spawnVehicle('police','#f4f6f8',pp[0],pp[1],DIRH[dir],'cop');V.chase=true;V.driver='cop';V.speed=10;V.ai={dir,ia,ib,state:'edge',cruise:24,turn:-1,jkey:undefined};cops.push(V);return V;
  }
}
function copDirect(V,dt){ // direct pursuit physics when close
  const tx=player.x,tz=player.z;const dx=tx-V.x,dz=tz-V.z,d=Math.hypot(dx,dz);
  const want=Math.atan2(dx,dz),ad=angDiff(V.h,want);
  V.steer=clamp(ad*2.2,-1,1);
  const f=fxv(V.h);const sp=V.speed;
  if(d<9&&Math.abs(sp)<7){V.thr=0;V.brk=1}else if(Math.abs(ad)>1.6){V.thr=0;V.brk=0.6}else{V.thr=1;V.brk=0}
  // unstick
  if(Math.abs(sp)<1.2&&d>14){V.stuck+=dt;if(V.stuck>1.2){V.thr=0;V.brk=1;V.steer=-V.steer;if(V.stuck>2.4)V.stuck=0}}else V.stuck=0;
  carPhysics(V,dt);carBuildingCollide(V);
}
function updatePolice(dt){
  const alive=cops.filter(c=>vehicles.indexOf(c)>=0);cops.length=0;alive.forEach(c=>cops.push(c));
  const want=wanted===0?0:wanted===1?2:wanted===2?3:5;
  copsT-=dt;if(cops.length<want&&copsT<0){spawnCop();copsT=2.5}
  let nearest=1e9;
  for(const c of cops){const d=Math.hypot(c.x-player.x,c.z-player.z);nearest=Math.min(nearest,d);
    if(wanted===0){if(d>140)c.despawn=true}
    if(c.mode==='cop'&&d<32&&wanted>0&&c.ai){ // switch to direct pursuit
      if(c.ai.jkey!==undefined)juncLeave(c);c.mode='copdirect';const f=fxv(c.h);c.vx=f[0]*c.speed;c.vz=f[1]*c.speed;
    }
    if(c.mode==='copdirect'&&d>70&&c.ai){ // snap back to grid pursuit
      const ia=clamp(Math.round((c.x+HALF)/PITCH),0,N),ib=clamp(Math.round((c.z+HALF)/PITCH),0,N);
      // only re-grid if near a road line
      const onX=Math.abs(((c.x+HALF)%PITCH+PITCH)%PITCH-0)<RW/2||Math.abs(((c.x+HALF)%PITCH+PITCH)%PITCH-PITCH)<RW/2,onZ=Math.abs(((c.z+HALF)%PITCH+PITCH)%PITCH)<RW/2||Math.abs(((c.z+HALF)%PITCH+PITCH)%PITCH-PITCH)<RW/2;
      if(onX!==onZ){
        let dir;if(onX){const dz=player.z-c.z;dir=dz>0?2:3;c.ai.dir=dir;c.ai.ia=Math.round((c.x+HALF)/PITCH);c.ai.ib=clamp(Math.round((c.z+HALF)/PITCH+(dz>0?0.5:-0.5)),0,N)}
        else{const dx=player.x-c.x;dir=dx>0?0:1;c.ai.dir=dir;c.ai.ib=Math.round((c.z+HALF)/PITCH);c.ai.ia=clamp(Math.round((c.x+HALF)/PITCH+(dx>0?0.5:-0.5)),0,N)}
        c.ai.state='edge';c.ai.turn=-1;c.mode='cop';c.speed=Math.max(8,c.speed);
      }
    }
  }
  if(wanted>0){
    wantedT=nearest>90?wantedT+dt:Math.max(0,wantedT-dt*0.5);
    if(wantedT>14){wanted=Math.max(0,wanted-1);wantedT=0;toast(wanted?'Cops are losing you...':'Wanted level cleared')}
    // busted
    bustT=nearest<6&&Math.abs(player.speed)<5?bustT+dt:Math.max(0,bustT-dt);
    if(bustT>2.6){bustT=0;busted()}
  }else bustT=0;
}
let bustT=0;

/* ================= PEDESTRIANS ================= */
const MN=['Tunde','Chidi','Musa','Kofi','Liam','Kenji','Mateo','Omar','Jake','Ravi','Ade','Sam','Femi','Dayo','Leo','Zane'];
const FN=['Ada','Zainab','Amara','Sofia','Yuki','Chloe','Layla','Maya','Nia','Priya','Tola','Eve','Bisi','Ife','Lena','Mia'];
const N1=['Swift','Lucky','Neon','Royal','Cosmic','Brave','Sunny','Turbo','Mighty','Chill','Savage','Silent'];
const N2=['Lion','Eagle','Panda','Falcon','Tiger','Fox','Zebra','Cobra','Wolf','Gazelle','Rhino','Hawk'];
const FLAGS=['🇳🇬','🇬🇭','🇿🇦','🇰🇪','🇧🇷','🇺🇸','🇬🇧','🇯🇵','🇮🇳','🇫🇷','🇩🇪','🇲🇽','🇪🇬','🇸🇳','🇨🇲','🇰🇷','🇨🇦','🇦🇺'];
const TOPC=['#e8e8e8','#1f1f24','#b3202a','#ffd23f','#10857a','#5aa7ee','#7a2cff','#e0b23a','#d4153a','#f08fb0','#2f6a3a','#ff8a3d'];
const BOTC=['#2f4a7a','#2a2a30','#1d2740','#e9e1cf','#3a63a8','#6a4a2a','#1f9d8a','#8a2a3a'];
function randLook(female,r){r=r||Math.random;const p=a=>a[Math.floor(r()*a.length)];
  return{female,skin:Math.floor(r()*7),hair:female?p([2,3,5,6,0,1]):p([0,1,4,7,0,7,6]),hairCol:Math.floor(r()*9)*(r()<.6?0:1)%9,
    ts:female?p([0,4,5,4,2]):p([0,1,2,3,5,0,1]),tc:p(TOPC),bs:female?p([0,1,2,2,3]):p([0,0,1,3,3]),bc:p(BOTC),shoe:female?p([0,2,3,0]):p([0,1,0,3]),shc:p(['#f4f4f4','#1a1a1a','#8a5a2a','#c22']),
    hat:r()<.2?p([1,2,3]):0,hatc:p(TOPC),shades:r()<.15,chain:!female&&r()<.15,build:.92+r()*.2,h:.95+r()*.1}}
const PO=ROADW/2+2;
const pedPos=n=>[rcx(n.i)+n.cx*PO,rcx(n.j)+n.cz*PO];
function pedValid(n){const gx=n.i+(n.cx>0?0:-1),gz=n.j+(n.cz>0?0:-1);return n.i>=0&&n.i<=N&&n.j>=0&&n.j<=N&&gx>=0&&gx<N&&gz>=0&&gz<N&&!inAir(gx,gz)}
function pedNbrs(n){const o=[];
  o.push({i:n.cx>0?n.i+1:n.i-1,j:n.j,cx:-n.cx,cz:n.cz,k:'ax'});o.push({i:n.i,j:n.cz>0?n.j+1:n.j-1,cx:n.cx,cz:-n.cz,k:'az'});
  o.push({i:n.i,j:n.j,cx:-n.cx,cz:n.cz,k:'cx'});o.push({i:n.i,j:n.j,cx:n.cx,cz:-n.cz,k:'cz'});return o.filter(pedValid)}
function pedCanCross(n,k,t){ // crossing road i (k==='cx') means cars travel along z -> need z-axis red
  const ph=lightPhase(n.i,n.j,t);return(k==='cx'?ph[1]:ph[0])===2}
const PED_MAX=MOBILE?[4,6,9]:[10,18,30];
const BOT_LINES=['anyone up for a race? 🏎️','this city is crazy at night 🌃','who wants to dance at the club?','just bought a new car 😎','taxi drivers here know everything lol','selling my old outfit, DM me','follow me to the beach club 🏖️','airport run anyone? ✈️','mad traffic downtown today','lol I just got chased by police 🚓','gm everyone ☀️','looking for a gym buddy 💪','who is in the leaderboard top 10?','this game looks so real 🔥','invite your friends, more fun together!'];
const pedLabels=new Map();
function labelSprite(text,fg,bg){const c=mkCanvas(256,64),g=c.getContext('2d');g.font='700 28px "Barlow Condensed",system-ui,sans-serif';const w=Math.min(250,g.measureText(text).width+26);
  g.fillStyle=bg||'rgba(10,14,26,.72)';g.beginPath();if(g.roundRect)g.roundRect(128-w/2,8,w,44,12);else g.rect(128-w/2,8,w,44);g.fill();g.fillStyle=fg||'#fff';g.textAlign='center';g.textBaseline='middle';g.fillText(text,128,31);
  const t=new T3.CanvasTexture(c);t.colorSpace=T3.SRGBColorSpace;const s=new T3.Sprite(new T3.SpriteMaterial({map:t,transparent:true,depthWrite:false,fog:false}));s.scale.set(2.4,.6,1);s.renderOrder=5;return s}
function makePed(kind,x,z,opt){opt=opt||{};
  const female=opt.female!==undefined?opt.female:Math.random()<.5;let look=opt.look||randLook(female);
  if(kind==='cop'){look=Object.assign(look,{female:false,ts:2,tc:'#1a2a5a',bs:3,bc:'#1a2a5a',shoe:1,shc:'#111',hat:1,hatc:'#1a2a5a',shades:true,chain:false})}
  const H=makeHuman(look);scene.add(H.root);
  const p={kind,H,x,z,y:groundH(x,z),h:Math.random()*TAU,vx:0,vz:0,state:'walk',t:0,speed:1.2+Math.random()*.5,female,name:opt.name||pick(female?FN:MN),flag:opt.flag||pick(FLAGS),aff:0,tough:Math.random()<.22,hp:60,wait:0,node:null,tgt:null,prev:null,emote:null,emT:0,bot:!!opt.bot,off:(Math.random()-.5)*2.4,key:opt.key||('p'+Math.random().toString(36).slice(2,8)),dancing:false,life:0,hidden:false,botT:3+Math.random()*20,look};
  H.root.visible=true;peds.push(p);return p}
function removePed(p){scene.remove(p.H.root);p.H.root.traverse(o=>{if(o.geometry)o.geometry.dispose()});if(p.label){scene.remove(p.label);p.label=null}const i=peds.indexOf(p);if(i>=0)peds.splice(i,1)}
function randNodeNear(px,pz,rmin,rmax){for(let t=0;t<30;t++){const a=Math.random()*TAU,d=rmin+Math.random()*(rmax-rmin),x=px+Math.sin(a)*d,z=pz+Math.cos(a)*d;
    const i=clamp(Math.round((x+HALF)/PITCH),0,N),j=clamp(Math.round((z+HALF)/PITCH),0,N),n={i,j,cx:Math.random()<.5?1:-1,cz:Math.random()<.5?1:-1};if(!pedValid(n))continue;const pp=pedPos(n);const dd=Math.hypot(pp[0]-px,pp[1]-pz);if(dd<rmin*.8||dd>rmax*1.2)continue;return n}return null}
function pedPickNext(p,T){const nb=pedNbrs(p.node);if(!nb.length)return null;
  const opts=nb.filter(n=>!(p.prev&&n.i===p.prev.i&&n.j===p.prev.j&&n.cx===p.prev.cx&&n.cz===p.prev.cz));const l=opts.length?opts:nb;
  if(p.state==='flee'&&p.fleeFrom){let b=null,bd=-1;l.forEach(n=>{const q=pedPos(n),d=Math.hypot(q[0]-p.fleeFrom[0],q[1]-p.fleeFrom[1]);if(d>bd){bd=d;b=n}});return b}
  const w=l.map(n=>n.k[0]==='a'?3:1);let s=w.reduce((a,b)=>a+b,0),r=Math.random()*s;for(let i=0;i<l.length;i++){r-=w[i];if(r<=0)return l[i]}return l[0]}
let pedT=0;
function pedHit(p,fromX,fromZ,power){ // punched / shot / run over
  if(p.state==='down')return;p.hp-=power;
  if(p.hp<=0||power>=40){p.state='down';p.t=0;p.downT=0;const dx=p.x-fromX,dz=p.z-fromZ,d=Math.hypot(dx,dz)||1;p.vx=dx/d*(power>=40?5:2.5);p.vz=dz/d*(power>=40?5:2.5);p.dead=power>=80;p.hp=Math.max(0,p.hp)}
  else if(p.tough&&p.kind==='civ'){p.state='fight'}else{p.state='flee';p.fleeFrom=[fromX,fromZ];p.t=0;p.speed=4.6}
  // others nearby panic
  peds.forEach(o=>{if(o!==p&&o.state==='walk'&&Math.hypot(o.x-fromX,o.z-fromZ)<16&&o.kind==='civ'){o.state='flee';o.fleeFrom=[fromX,fromZ];o.t=0;o.speed=4.4}})}
function updatePeds(dt,T){
  const px=player.x,pz=player.z,target=PED_MAX[QUALITY];
  // spawn / recycle
  pedT-=dt;if(pedT<0){pedT=.25;
    let civ=0;peds.forEach(p=>{if(p.kind==='civ')civ++});
    if(civ<target){const n=randNodeNear(px,pz,35,110);if(n){const pp=pedPos(n);const bot=civ<3&&Math.random()<.9||Math.random()<.08;const p=makePed('civ',pp[0]+(Math.random()-.5)*2,pp[1]+(Math.random()-.5)*2,{bot});p.node=n;p.tgt=null;p.wait=Math.random()*2;if(bot)p.speed=1.5}}
    peds.slice().forEach(p=>{if(p.kind==='civ'&&Math.hypot(p.x-px,p.z-pz)>150)removePed(p);else if(p.kind==='cop'&&Math.hypot(p.x-px,p.z-pz)>160)removePed(p)})}
  for(const p of peds){
    const dpx=p.x-px,dpz=p.z-pz,d2=dpx*dpx+dpz*dpz,dist=Math.sqrt(d2);p.life+=dt;
    const vis=dist<(QUALITY?85:65);p.H.root.visible=vis;
    // --- behaviour ---
    let speedAnim=0,animState='idle';
    if(p.kind==='cop'){
      const ang=Math.atan2(px-p.x,pz-p.z);p.h+=angDiff(p.h,ang)*Math.min(1,dt*8);
      if(wanted>0&&player.st==='foot'&&dist>1.5){const sp=Math.min(6.5,3+dist*.2);p.x+=Math.sin(p.h)*sp*dt;p.z+=Math.cos(p.h)*sp*dt;speedAnim=sp;
        const r=colResolve(p.x,p.z,.4);if(r){p.x+=r.nx*r.pen;p.z+=r.nz*r.pen}}
      if(wanted===0||player.st==='drive'&&dist>20){p.state='leave'}
      if(p.state==='leave'){const sp=2.2;p.x-=Math.sin(p.h)*sp*dt*.0;speedAnim=0;if(dist>60||wanted===0&&p.life>30)p.rm=true}
      if(dist<1.9&&wanted>0&&player.st==='foot'){bustT+=dt*1.2}
      if(p.H.a.punchT<=0&&dist<1.7&&wanted>0&&Math.random()<dt*.6){p.H.a.punchT=1;p.H.a.punchSide=Math.random()<.5;hurtPlayer(3,'cop')}
    }else if(p.state==='down'){
      p.t+=dt;p.downT=p.t;p.x+=p.vx*dt;p.z+=p.vz*dt;p.vx*=Math.exp(-4*dt);p.vz*=Math.exp(-4*dt);animState='down';
      const r=colResolve(p.x,p.z,.35);if(r){p.x+=r.nx*r.pen;p.z+=r.nz*r.pen}
      if(p.t>(p.dead?9:4.5)){if(p.dead){p.rm=true}else{p.state='flee';p.t=0;p.hp=30;p.fleeFrom=[px,pz];p.speed=4.5}}
    }else if(p.state==='fight'){
      const ang=Math.atan2(px-p.x,pz-p.z);p.h+=angDiff(p.h,ang)*Math.min(1,dt*9);
      if(player.st!=='foot'||dist>25){p.state='flee';p.fleeFrom=[px,pz];p.t=0;p.speed=4}
      else if(dist>1.25){const sp=3.2;p.x+=Math.sin(p.h)*sp*dt;p.z+=Math.cos(p.h)*sp*dt;speedAnim=sp;const r=colResolve(p.x,p.z,.4);if(r){p.x+=r.nx*r.pen;p.z+=r.nz*r.pen}}
      else{p.t-=dt;if(p.t<=0&&p.H.a.punchT<=0){p.t=.85+Math.random()*.4;p.H.a.punchT=1;p.H.a.punchSide=Math.random()<.5;if(player.guard<=0||Math.random()<.4)hurtPlayer(p.fighter?7:4,'fist');else sfx.thud&&sfx.thud()}}
    }else if(p.state==='idle'){
      p.t-=dt;animState=p.dancing?'dance':'idle';if(p.t<=0){p.state='walk';p.dancing=false;p.tgt=null}
      if(dist<8)p.h+=angDiff(p.h,Math.atan2(px-p.x,pz-p.z))*Math.min(1,dt*2);
    }else if(p.state==='flee'||p.state==='walk'){
      if(!p.node){const n=randNodeNear(p.x,p.z,0,60);p.node=n||{i:10,j:10,cx:1,cz:1}}
      if(!p.tgt){ // choose next node
        const nx=p.state==='flee'||p.wait<=0?pedPickNext(p,T):null;
        if(p.wait>0){p.wait-=dt;animState='idle'}
        else if(nx){const k=nx.k;if((k==='cx'||k==='cz')&&p.state==='walk'&&!pedCanCross(p.node,k,T)){p.wait=1+Math.random();animState='idle'}else{p.prev=p.node;p.tgt=nx;p.crossing=(k==='cx'||k==='cz')}}}
      if(p.tgt){const q=pedPos(p.tgt);const lat=p.crossing?0:p.off;
        let tx=q[0],tz=q[1];if(!p.crossing){ // sidewalk lateral offset along the edge's perpendicular
          const ex=q[0]-pedPos(p.prev)[0],ez=q[1]-pedPos(p.prev)[1],el=Math.hypot(ex,ez)||1;tx+=-ez/el*lat*.5;tz+=ex/el*lat*.5}
        const dx=tx-p.x,dz=tz-p.z,dd=Math.hypot(dx,dz);
        const sp=p.state==='flee'?p.speed:p.speed*(p.crossing&&lightPhase(p.node.i,p.node.j,T)[0]!==2&&lightPhase(p.node.i,p.node.j,T)[1]!==2?1.45:1);
        if(dd<.7){p.node=p.tgt;p.tgt=null;p.crossing=false;
          if(p.state==='walk'&&Math.random()<.14&&!p.crossing){p.state='idle';p.t=3+Math.random()*7;p.dancing=p.bot&&Math.random()<.3&&districtAt(p.x,p.z)!=='x'&&Math.random()<.4;if(Math.random()<.2&&!p.bot){p.emote=pick(['📱','😂','👋','😎']);p.emT=3}}
          if(p.state==='flee'){p.t+=1;if(p.t>6){p.state='walk';p.speed=1.2+Math.random()*.5}}}
        else{const ang=Math.atan2(dx,dz);p.h+=angDiff(p.h,ang)*Math.min(1,dt*7);
          // simple separation from player/others
          let ax=0,az=0;
          if(dist<1.3){ax+=dpx/dist*1.2;az+=dpz/dist*1.2}
          p.x+=(dx/dd*sp+ax)*dt;p.z+=(dz/dd*sp+az)*dt;speedAnim=sp}
      }
      // bots chatter
      if(p.bot){p.botT-=dt;if(p.botT<=0&&dist<150){p.botT=18+Math.random()*50;chatPost&&chatPost(p.name,p.flag,pick(BOT_LINES))}}
    }
    // run over by cars
    if(p.state!=='down'&&p.kind!=='cop'){for(const V of vehicles){if(Math.abs(V.speed)<2.2||V.mode==='parked')continue;const dx=p.x-V.x,dz=p.z-V.z;if(dx*dx+dz*dz>V.L*V.L*.35)continue;
      const f=fxv(V.h),al=dx*f[0]+dz*f[1],la=dx*f[1]*-1+dz*f[0]*0;const lat=Math.abs(dx*f[1]*-1+dz*f[0]);if(Math.abs(al)<V.L*.52&&lat<V.W*.55+.25){pedHit(p,V.x,V.z,Math.abs(V.speed)>9?90:45);if(V===player.car){addHeat(1.0);sfx.thud&&sfx.thud();missionEvent&&missionEvent('hitped')}else if(V.mode==='ai'||V.mode==='cop'){V.speed*=.4}break}}}
    if(p.rm){removePed(p);continue}
    // y + transform
    p.y=lerp(p.y,groundH(p.x,p.z),Math.min(1,dt*12));
    if(vis){const H=p.H;H.root.position.set(p.x,p.y,p.z);H.root.rotation.y=p.h;humanShadows(H,dist<28);
      const st=p.emT>0&&p.state==='idle'?'idle':animState;animHuman(H,dt,speedAnim,st,{});
      if(p.emT>0){p.emT-=dt;if(p.emT<=0)p.emote=null}
      // nameplate
      const wantLbl=(p.bot&&dist<38)||(p.talkTarget);
      if(wantLbl&&!p.label){p.label=labelSprite((p.female?'♀ ':'♂ ')+p.name+' '+p.flag+(p.bot?'  ·  player':''),p.bot?'#8affc4':'#fff');scene.add(p.label)}
      if(p.label){p.label.visible=wantLbl;p.label.position.set(p.x,p.y+2.15,p.z)}
    }else if(p.label)p.label.visible=false;
  }
  // foot cops: spawn near cop cars when player on foot and wanted
  if(wanted>0&&player.st==='foot'){let nc=0;peds.forEach(p=>{if(p.kind==='cop')nc++});const need=wanted>=3?4:2;
    if(nc<need&&Math.random()<dt*.8){const cc=cops.find(c=>Math.hypot(c.x-px,c.z-pz)<60&&Math.hypot(c.x-px,c.z-pz)>6);if(cc){const f=fxv(cc.h);const c=makePed('cop',cc.x+f[1]*2.2,cc.z-f[0]*2.2,{female:false});c.state='chase'}}}
}
function nearestPed(x,z,r,filter){let b=null,bd=r*r;peds.forEach(p=>{if(filter&&!filter(p))return;const d=(p.x-x)**2+(p.z-z)**2;if(d<bd){bd=d;b=p}});return b}

/* ================= AUDIO (all synthesised) ================= */
const audio={ctx:null,on:true,music:true,station:0,eng:null,_noise:null,sirenOsc:null};
const sfx={};
function audioInit(){if(audio.ctx){if(audio.ctx.state==='suspended')audio.ctx.resume();return}
  try{const C=new(window.AudioContext||window.webkitAudioContext)();audio.ctx=C;audio.master=C.createGain();audio.master.gain.value=.8;audio.master.connect(C.destination);
    audio.sfxG=C.createGain();audio.sfxG.gain.value=.9;audio.sfxG.connect(audio.master);audio.musG=C.createGain();audio.musG.gain.value=0;audio.musG.connect(audio.master);
    const b=C.createBuffer(1,C.sampleRate*1.5,C.sampleRate),d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;audio._noise=b;
    // city ambience
    const n=C.createBufferSource();n.buffer=b;n.loop=true;const f=C.createBiquadFilter();f.type='lowpass';f.frequency.value=420;const g=C.createGain();g.gain.value=.05;n.connect(f);f.connect(g);g.connect(audio.sfxG);n.start();audio.amb=g;audio.ambF=f;
    audio.rainG=C.createGain();audio.rainG.gain.value=0;const rn=C.createBufferSource();rn.buffer=b;rn.loop=true;const rf=C.createBiquadFilter();rf.type='highpass';rf.frequency.value=1800;rn.connect(rf);rf.connect(audio.rainG);audio.rainG.connect(audio.sfxG);rn.start();
    startRadioLoop()}catch(e){audio.ctx=null}}
function tone(f,d,type,v,slide,dest,delay){const C=audio.ctx;if(!C||!audio.on)return;const t=C.currentTime+(delay||0),o=C.createOscillator(),g=C.createGain();o.type=type||'sine';o.frequency.setValueAtTime(f,t);if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(20,f*slide),t+d);g.gain.setValueAtTime(v||.1,t);g.gain.exponentialRampToValueAtTime(.0001,t+d);o.connect(g);g.connect(dest||audio.sfxG);o.start(t);o.stop(t+d+.02)}
function noiseHit(d,v,freq,type,dest,delay){const C=audio.ctx;if(!C||!audio.on)return;const t=C.currentTime+(delay||0),s=C.createBufferSource();s.buffer=audio._noise;s.loop=false;const f=C.createBiquadFilter();f.type=type||'bandpass';f.frequency.value=freq||1200;const g=C.createGain();g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.0001,t+d);s.connect(f);f.connect(g);g.connect(dest||audio.sfxG);s.start(t,Math.random()*.5,d+.05)}
Object.assign(sfx,{
  ui(){tone(620,.07,'sine',.08,1.4)},coin(){tone(880,.09,'square',.05,1.6);tone(1320,.14,'square',.04,1.2,null,.07)},bad(){tone(180,.22,'sawtooth',.08,.5)},
  win(){[523,659,784,1047].forEach((f,i)=>tone(f,.2,'triangle',.08,1,null,i*.09))},
  thud(){tone(90,.18,'sine',.25,.4);noiseHit(.12,.15,300,'lowpass')},punch(){noiseHit(.09,.25,700);tone(120,.12,'sine',.2,.5)},
  shot(){tone(2600,.02,'square',.45,.12);noiseHit(.02,1,8000,'highpass');noiseHit(.03,1,9000,'highpass');noiseHit(.012,1,5000,'highpass');noiseHit(.05,.95,3800,'bandpass');tone(3400,.012,'square',.2,.2);tone(150,.12,'sine',.95,.25);tone(52,.3,'sine',.6,.45);noiseHit(.5,.24,520,'lowpass',null,.035);noiseHit(.8,.11,1500,'bandpass',null,.11);noiseHit(.9,.05,900,'bandpass',null,.22)},horn(){tone(420,.4,'sawtooth',.07);tone(530,.4,'sawtooth',.06)},
  door(){tone(160,.1,'square',.08,.6);noiseHit(.08,.08,500)},step(){noiseHit(.05,.05,400,'lowpass')},cash(){sfx.coin();setTimeout(sfx.coin,110)},
  boom(){noiseHit(.8,.6,200,'lowpass');tone(60,.7,'sine',.4,.3)}});
audio.skid=function(v){noiseHit(.09,.05+.1*v,1700+Math.random()*400,'bandpass')};
audio.crash=function(v){noiseHit(.25+v*.3,.2+.4*v,500,'lowpass');tone(80,.3,'sawtooth',.15+.2*v,.4)};
audio.siren=function(v){if(!audio.ctx||!audio.on)return;for(let i=0;i<4;i++){tone(i%2?780:620,.28,'sawtooth',.03*(v||1),1,null,i*.3)}};
audio.setEngine=function(on,speed,thr,kind){const C=audio.ctx;if(!C)return;
  if(on&&!audio.eng){const o1=C.createOscillator(),o2=C.createOscillator(),f=C.createBiquadFilter(),g=C.createGain();o1.type='sawtooth';o2.type='square';f.type='lowpass';f.frequency.value=500;g.gain.value=0;o1.connect(f);o2.connect(f);f.connect(g);g.connect(audio.sfxG);o1.start();o2.start();audio.eng={o1,o2,f,g}}
  if(!on&&audio.eng){const e=audio.eng;audio.eng=null;e.g.gain.setTargetAtTime(0,C.currentTime,.1);setTimeout(()=>{try{e.o1.stop();e.o2.stop()}catch(_){}} ,400);return}
  if(audio.eng&&audio.on){const e=audio.eng,t=C.currentTime;const base=kind==='hyper'?55:kind==='bus'?34:44;const rpm=base+Math.abs(speed)*(kind==='hyper'?3.4:2.5)%140+Math.abs(speed)*.8;
    // gear-like sawtooth of the pitch
    const gear=Math.min(5,Math.floor(Math.abs(speed)/9));const gp=(Math.abs(speed)%9)/9;const f0=base+gear*7+gp*55+thr*12;
    e.o1.frequency.setTargetAtTime(f0,t,.05);e.o2.frequency.setTargetAtTime(f0*.5,t,.05);e.f.frequency.setTargetAtTime(300+thr*900+Math.abs(speed)*14,t,.08);e.g.gain.setTargetAtTime(.05+.07*thr,t,.08)}};
audio.setAmbience=function(dark,rain){if(!audio.ctx)return;const t=audio.ctx.currentTime;audio.amb.gain.setTargetAtTime(.04+.03*(1-dark),t,.5);audio.rainG.gain.setTargetAtTime(rain*.12,t,.5)};
audio.setSiren=function(v){const C=audio.ctx;if(!C||!audio.on)return;if(v>0&&!audio.sirenOsc){const o=C.createOscillator(),g=C.createGain();o.type='sawtooth';g.gain.value=0;o.connect(g);g.connect(audio.sfxG);o.start();audio.sirenOsc={o,g}}
  if(audio.sirenOsc){const s=audio.sirenOsc,t=C.currentTime;s.o.frequency.setTargetAtTime(700+Math.sin(t*5)*160,t,.03);s.g.gain.setTargetAtTime(v*.025,t,.1);if(v<=0&&s.g.gain.value<.001){try{s.o.stop()}catch(_){}audio.sirenOsc=null}}};
audio.setOn=function(on){audio.on=on;if(audio.master)audio.master.gain.value=on?.8:0};
/* ---- radio: three procedural stations ---- */
const STATIONS=[
 {n:'Afrobeats-style beat',bpm:104,root:55,scale:[0,3,5,7,10],kick:'x..x..x...x...x.',clap:'....x.......x..x',hat:'x.x.x.xxx.x.x.x.',bass:[0,0,-1,0,3,-1,0,2,0,-1,5,0,3,-1,2,-1],stab:[0,3,7]},
 {n:'Amapiano-style beat',bpm:112,root:49,scale:[0,2,3,7,9],kick:'x...x...x...x...',clap:'....x.......x...',hat:'..x...x...x..xx.',bass:[0,-1,-1,0,-1,5,-1,-1,3,-1,-1,0,-1,7,5,-1],stab:[0,7,10],log:true},
 {n:'Chill beat',bpm:82,root:46,scale:[0,2,3,5,7,8,10],kick:'x.....x...x.....',clap:'........x.......',hat:'x.x.x.x.x.x.x.x.',bass:[0,-1,-1,-1,5,-1,-1,-1,3,-1,-1,-1,2,-1,-1,-1],stab:[0,3,7,10],soft:true}];
Object.defineProperty(window,'__STATIONS',{get:()=>STATIONS});
let radioStep=0,radioNext=0,radioTimer=null;
function startRadioLoop(){if(radioTimer)return;radioTimer=setInterval(()=>{const C=audio.ctx;if(!C||!audio.on||!audio.music)return;const st=STATIONS[audio.station];if(!st||st.yt||st.am)return;if(audio.musG.gain.value<.005)return;
  const sd=60/st.bpm/4;if(radioNext<C.currentTime)radioNext=C.currentTime+.05;
  while(radioNext<C.currentTime+.15){const k=radioStep%16,d=radioNext-C.currentTime;
    if(st.kick[k]==='x'){tone(st.soft?110:130,.18,'sine',.5,.3,audio.musG,d)}
    if(st.clap[k]==='x'){noiseHit(.12,.22,1500,'bandpass',audio.musG,d)}
    if(st.hat[k]==='x'){noiseHit(.04,.08,7000,'highpass',audio.musG,d)}
    const b=st.bass[k];if(b>=0){const f=st.root*Math.pow(2,st.scale[b%st.scale.length]/12)*(b>6?2:1);if(st.log){tone(f*1.5,.28,'sine',.45,.5,audio.musG,d)}else{tone(f,.22,'triangle',.35,.9,audio.musG,d)}}
    if(k%8===0||k%8===3&&!st.soft){const rf=st.root*4;st.stab.forEach(s=>tone(rf*Math.pow(2,s/12),.45,st.soft?'sine':'square',st.soft?.06:.035,.98,audio.musG,d))}
    radioNext+=sd;radioStep++}},40)}
audio.setRadio=function(on,idx){if(idx!==undefined)audio.station=idx;if(!audio.musG)return;audio.musG.gain.setTargetAtTime(on&&audio.music?.55:0,audio.ctx.currentTime,.15)};

/* ================= INPUT ================= */
const keys={},held={},edge={};
const input={mx:0,mz:0,lookDX:0,lookDY:0};
const cam={yaw:0,pitch:.3,dist:5,fov:62,shake:0,mode:0,userT:0,p:new T3.Vector3(),look:new T3.Vector3(),preview:null};
let UILOCK=false; // a panel is open: gameplay input ignored
function pressEdge(k){edge[k]=true}
const consume=k=>{if(edge[k]){edge[k]=false;return true}return false};
addEventListener('keydown',e=>{if(/INPUT|TEXTAREA/.test(document.activeElement.tagName)){if(e.key==='Escape')document.activeElement.blur();return}
  const k=e.key.toLowerCase();if(!keys[k])pressEdge(k);keys[k]=true;audioInit();if([' ','arrowup','arrowdown','arrowleft','arrowright','tab'].includes(k))e.preventDefault()});
addEventListener('keyup',e=>{keys[e.key.toLowerCase()]=false});
addEventListener('blur',()=>{for(const k in keys)keys[k]=false;for(const k in held)held[k]=false});
const joy={id:null,cx:0,cy:0,r:52};
function bindControls(){
  const base=$('#joy'),knob=$('#knob');
  const jmove=(e)=>{let[dx,dy]=rd(e.clientX-joy.cx,e.clientY-joy.cy);const l=Math.hypot(dx,dy),m=Math.min(l,joy.r);if(l>0){dx=dx/l*m;dy=dy/l*m}
    knob.style.transform=`translate(${dx}px,${dy}px)`;input.mx=dx/joy.r;input.mz=-dy/joy.r};
  base.addEventListener('pointerdown',e=>{audioInit();joy.id=e.pointerId;base.setPointerCapture(e.pointerId);const r=base.getBoundingClientRect();joy.cx=r.left+r.width/2;joy.cy=r.top+r.height/2;joy.r=r.width*.38;jmove(e);e.preventDefault()});
  base.addEventListener('pointermove',e=>{if(e.pointerId===joy.id)jmove(e)});
  const jend=e=>{if(e.pointerId!==joy.id)return;joy.id=null;knob.style.transform='';input.mx=0;input.mz=0};
  base.addEventListener('pointerup',jend);base.addEventListener('pointercancel',jend);
  // look: drag on canvas / right side
  let lk=null;const area=$('#look');
  area.addEventListener('pointerdown',e=>{audioInit();lk={id:e.pointerId,x:e.clientX,y:e.clientY,sx:e.clientX,sy:e.clientY,t:performance.now(),moved:0,btn:e.button};area.setPointerCapture(e.pointerId)});
  area.addEventListener('pointermove',e=>{if(!lk||e.pointerId!==lk.id)return;const[dx,dy]=rd(e.clientX-lk.x,e.clientY-lk.y);lk.x=e.clientX;lk.y=e.clientY;lk.moved+=Math.abs(dx)+Math.abs(dy);input.lookDX+=dx;input.lookDY+=dy});
  const lend=e=>{if(!lk||e.pointerId!==lk.id)return;if(e.pointerType==='mouse'&&lk.moved<8&&!UILOCK){pressEdge('f')}lk=null};
  area.addEventListener('pointerup',lend);area.addEventListener('pointercancel',()=>{lk=null});
  area.addEventListener('contextmenu',e=>e.preventDefault());
  document.querySelectorAll('.bt').forEach(b=>{const k=b.dataset.k;
    b.addEventListener('pointerdown',e=>{audioInit();held[k]=true;pressEdge(k);b.classList.add('on');e.preventDefault();try{b.setPointerCapture(e.pointerId)}catch(_){}});
    const up=()=>{held[k]=false;b.classList.remove('on')};b.addEventListener('pointerup',up);b.addEventListener('pointercancel',up);b.addEventListener('lostpointercapture',up)});
}
function keyInput(){ // merge keyboard into input.mx/mz
  let kx=0,kz=0;if(keys['w']||keys['arrowup'])kz+=1;if(keys['s']||keys['arrowdown'])kz-=1;if(keys['d']||keys['arrowright'])kx+=1;if(keys['a']||keys['arrowleft'])kx-=1;
  if(kx||kz){const l=Math.hypot(kx,kz);return[kx/l,kz/l]}return null}

/* ================= PLAYER ================= */
Object.assign(player,{y:.22,vy:0,speedCur:0,weapon:null,H:null,nos:1,fireT:0,punchCd:0,guard:0,downT:0,air:false,inv:0,seat:null,vis:true,passenger:false,lastHurt:0,hpFloat:100});
function buildPlayerHuman(){if(player.H){scene.remove(player.H.root);player.H.root.traverse(o=>{if(o.geometry)o.geometry.dispose()})}
  const L=Object.assign({},S.look);player.H=makeHuman(L);player.H.root.visible=true;scene.add(player.H.root);humanShadows(player.H,true);return player.H}
function hurtPlayer(n,why){if(player.inv>0||mode!=='play'||n<=0)return;player.hp-=n;player.lastHurt=0;
  cam.shake=Math.min(1,cam.shake+n*.03);flashScreen('#a00',Math.min(.5,.1+n*.02));if(n>=4)sfx.thud();
  if(player.hp<=0)wasted(why)}
function groundAt(x,z){return groundH(x,z)}
function carObstacles(x,z,r){ // push player circle out of nearby cars
  let hit=null;for(const V of vehicles){if(V===player.car)continue;const dx=x-V.x,dz=z-V.z;if(dx*dx+dz*dz>(V.L)*(V.L)*.6)continue;
    for(const c of carCircles(V)){const ex=x-c[0],ez=z-c[1],d=Math.hypot(ex,ez),m=r+c[2];if(d<m){hit={V,nx:d>1e-4?ex/d:1,nz:d>1e-4?ez/d:0,pen:m-d};break}}if(hit)break}
  return hit}
function updateFoot(dt){
  const H=player.H;let mx=input.mx,mz=input.mz;const k=keyInput();if(k){mx=k[0];mz=k[1]}
  if(UILOCK){mx=0;mz=0}
  const mag=Math.min(1,Math.hypot(mx,mz)),sprint=(keys['shift']||held.sprint||mag>.88)&&mag>.1;
  const fx=Math.sin(cam.yaw),fz=Math.cos(cam.yaw),rx=-Math.cos(cam.yaw),rz=Math.sin(cam.yaw);
  let wx=fx*mz+rx*mx,wz=fz*mz+rz*mx;const wl=Math.hypot(wx,wz);if(wl>0){wx/=wl;wz/=wl}
  const aiming=!!player.weapon&&!UILOCK&&(held.aim||keys['x']);
  let target=mag<.08?0:(sprint?7.4:(mag>.5?4.2:2.1));if(player.downT>0){target=0;player.downT-=dt}
  player.speedCur+=(target-player.speedCur)*Math.min(1,dt*(target>player.speedCur?7:10));
  const sp=player.speedCur;
  if(wl>0&&sp>.05){player.vx=wx*sp;player.vz=wz*sp;const wantH=Math.atan2(wx,wz);player.h+=angDiff(player.h,wantH)*Math.min(1,dt*(aiming?4:11))}else{player.vx*=Math.exp(-12*dt);player.vz*=Math.exp(-12*dt)}
  if(aiming){player.h+=angDiff(player.h,cam.yaw)*Math.min(1,dt*10)}
  if(player.knock){player.vx+=player.knock[0];player.vz+=player.knock[1];player.knock=null}
  player.x+=player.vx*dt;player.z+=player.vz*dt;
  for(let it=0;it<3;it++){const r=colResolve(player.x,player.z,.38);if(!r)break;player.x+=r.nx*r.pen;player.z+=r.nz*r.pen}
  const ch=carObstacles(player.x,player.z,.38);if(ch){player.x+=ch.nx*ch.pen;player.z+=ch.nz*ch.pen;const V=ch.V;if(Math.abs(V.speed)>4&&V.mode!=='parked'){hurtPlayer(Math.abs(V.speed)*1.6,'car');player.knock=[ch.nx*3,ch.nz*3];player.downT=.5;if(V.driver==='npc'&&V.mode==='ai')V.speed*=.3}}
  player.x=clamp(player.x,-LIM,LIM);player.z=clamp(player.z,-LIM,LIM);
  // jump + ground
  const gh=groundH(player.x,player.z);
  if(consume(' ')||consume('jump')){if(!player.air&&!UILOCK){player.vy=6.8;player.air=true;sfx.step()}}
  if(player.air){player.vy-=21*dt;player.y+=player.vy*dt;if(player.y<=gh){player.y=gh;player.air=false;player.vy=0}}else{player.y=lerp(player.y,gh,Math.min(1,dt*18));if(player.y>gh+.05)player.air=true}
  // attack / weapon
  player.fireT-=dt;player.punchCd-=dt;
  if(!UILOCK){
    if(consume('q')||consume('weapon')){player.weapon=player.weapon?null:(S.hasGun?'pistol':null);if(!S.hasGun)toast('No weapon yet. Buy a pistol at the Police Auction... or keep it clean 😉');sfx.ui()}
    const fire=held.fire||keys['f'];
    if(consume('f')||consume('fire')||(fire&&player.weapon&&player.fireT<=0)){attackAction()}
  }
  if(H){H.root.position.set(player.x,player.y,player.z);H.root.rotation.y=player.h;H.gun.visible=!!player.weapon;
    animHuman(H,dt,player.air?0:sp,player.air?'air':(player.dancing?'dance':'idle'),{aim:!!player.weapon&&aiming||!!player.weapon&&player.fireT>-.4});
    if(player.dancing&&(sp>.5||mag>.2))player.dancing=false;
    if(sp>.5&&!player.air){player.stepT=(player.stepT||0)-dt*sp;if(player.stepT<0){player.stepT=2.3;sfx.step()}}}
}
function attackAction(){
  const H=player.H;
  if(player.weapon){ if(player.fireT>0)return;player.fireT=.2;shoot();return}
  if(player.punchCd>0)return;player.punchCd=.38;H.a.punchT=1;H.a.punchSide=!H.a.punchSide;sfx.punch();
  const f=[Math.sin(player.h),Math.cos(player.h)];let hit=false;
  peds.forEach(p=>{if(p.state==='down')return;const dx=p.x-player.x,dz=p.z-player.z,d=Math.hypot(dx,dz);if(d<1.6&&(dx*f[0]+dz*f[1])/d>.35){hit=true;pedHit(p,player.x,player.z,p.kind==='cop'?14:(Math.random()<.3?40:22));addHeat(p.kind==='cop'?1:.4);if(p.kind==='cop')wantedBoost(2);missionEvent('punch',p);flash3d(p.x,p.y+1.3,p.z)}});
  // punch cars (just for fun)
  if(!hit){for(const V of vehicles){const dx=V.x-player.x,dz=V.z-player.z;if(dx*dx+dz*dz<9&&V.mode==='ai'&&V.driver==='npc'){V.speed*=.5;break}}}
}
const tracers=[];
function shoot(){
  const H=player.H;H.a.flashT=.06;sfx.shot();cam.shake=Math.min(1,cam.shake+.12);
  const o=new T3.Vector3(player.x,player.y+1.35,player.z);
  const d=new T3.Vector3();camera.getWorldDirection(d);d.y*=1;
  // auto-aim: nearest living target close to the aim line
  let best=null,bs=.5;const cand=[];
  peds.forEach(p=>{if(p.state!=='down')cand.push({e:p,x:p.x,y:p.y+1.2,z:p.z,r:.5,ped:true})});
  vehicles.forEach(V=>{if(V!==player.car&&V.mode!=='parked'||V.mode==='parked')cand.push({e:V,x:V.x,y:V.y+.8,z:V.z,r:V.W*.6,car:true})});
  for(const c of cand){const vx=c.x-o.x,vy=c.y-o.y,vz=c.z-o.z,t=vx*d.x+vy*d.y+vz*d.z;if(t<1||t>70)continue;const px=vx-d.x*t,py=vy-d.y*t,pz=vz-d.z*t,pd=Math.hypot(px,py,pz);const sc=pd/(c.r+.25+t*.02);if(sc<1&&(best===null||t<best.t)){best={c,t}}}
  let end=o.clone().addScaledVector(d,60),hitInfo=null;
  if(best){end=o.clone().addScaledVector(d,best.t);hitInfo=best.c}
  // building check along the ray
  for(let t=1.5;t<(best?best.t:60);t+=1.5){const x=o.x+d.x*t,z=o.z+d.z*t,y=o.y+d.y*t;if(colInside(x,y,z,0)){end.set(x,y,z);hitInfo=null;sparks(x,y,z,4);break}}
  addTracer(o.clone().addScaledVector(d,1.2),end);
  if(hitInfo){if(hitInfo.ped){pedHit(hitInfo.e,player.x,player.z,hitInfo.e.kind==='cop'?35:50);addHeat(hitInfo.e.kind==='cop'?1.5:.6);if(hitInfo.e.kind==='cop')wantedBoost(2);missionEvent('shoot',hitInfo.e);sparks(end.x,end.y,end.z,3)}
    else if(hitInfo.car){const V=hitInfo.e;V.hp-=14;sparks(end.x,end.y,end.z,5);if(V.mode==='parked'){V.alarm=1}if(V.mode==='ai'||V.mode==='cop'){addHeat(.5);if(V.mode==='ai')toFree(V)}}}
  else{peds.forEach(p=>{if(p.state!=='down'&&p.kind==='civ'&&Math.hypot(p.x-player.x,p.z-player.z)<22&&Math.random()<.5){p.state='flee';p.fleeFrom=[player.x,player.z];p.t=0;p.speed=4.6}})}
  if(Math.random()<.3)addHeat(.2);
}
const tracerMat=new T3.LineBasicMaterial({color:0xffe7a0,transparent:true,opacity:.9,toneMapped:false});
function addTracer(a,b){const g=new T3.BufferGeometry().setFromPoints([a,b]);const l=new T3.Line(g,tracerMat);l.frustumCulled=false;scene.add(l);tracers.push({l,t:.07})}
function flash3d(x,y,z){emit(x,y,z,0,.5,0,.25,.5,1,.9,.5,2,true)}
function updateTracers(dt){for(let i=tracers.length-1;i>=0;i--){const t=tracers[i];t.t-=dt;if(t.t<=0){scene.remove(t.l);t.l.geometry.dispose();tracers.splice(i,1)}}}
function wantedBoost(n){if(wanted<n){wanted=n;toast('Wanted level '+wanted+' ★'.repeat(wanted));audio.siren&&audio.siren(.7)}wantedT=0}

/* ---- enter / exit vehicles ---- */
function enterVehicle(V,asPassenger){
  const H=player.H;player.st=asPassenger?'passenger':'drive';player.car=V;player.passenger=!!asPassenger;
  if(V.mode==='parked'){upgradeToFull(V)}
  if(!asPassenger){
    if(V.driver==='npc'||V.mode==='ai'||V.mode==='cop'){ // carjack
      if(V.ai&&V.ai.jkey!==undefined)juncLeave(V);const f=fxv(V.h);const p=makePed('civ',V.x+f[1]*2.4,V.z-f[0]*2.4);p.state='flee';p.fleeFrom=[V.x,V.z];p.t=0;p.speed=4.5;p.node=randNodeNear(p.x,p.z,0,30);addHeat(.8);toast('Carjacked! 🚗');if(V.mode==='cop')wantedBoost(2)}
    V.mode='free';V.driver='player';V.thr=0;V.brk=0;V.owned=V.owned||false;V.car.grp.userData.player=true}
  // seat the human inside the car
  const car=V.car,bs=V.bs;H.root.removeFromParent();car.grp.add(H.root);
  const cab=bs.cab,dx=asPassenger?-bs.W*.21:bs.W*.21,dz=(cab[1]+cab[2])/2+.15-(asPassenger?1.0:0);
  H.root.position.set(dx,Math.min(0.02,bs.rh-1.62),dz);H.root.rotation.set(0,0,0);H.root.scale.setScalar(.92);humanShadows(H,false);
  H.gun.visible=false;player.weapon=null;
  audio.setEngine(true,0,0,V.name);audio.setRadio(S.radio!==false,undefined);
  cam.dist=7;sfx.door();missionEvent('enter',V)}
function exitVehicle(force){
  const V=player.car;if(!V)return;const H=player.H;
  // find a free spot on the left side
  const f=fxv(V.h),lx=Math.cos(V.h),lz=-Math.sin(V.h);let pos=null;
  for(const s of[1,-1,2.5]){const px=V.x+lx*(V.W*.5+.9)*(s>0?1:-1)*Math.min(1,Math.abs(s)),pz=V.z+lz*(V.W*.5+.9)*(s>0?1:-1)*Math.min(1,Math.abs(s));
    if(!colResolve(px,pz,.4)){pos=[px,pz];break}}
  if(!pos)pos=[V.x+lx*2.2,V.z+lz*2.2];
  H.root.removeFromParent();scene.add(H.root);H.root.scale.setScalar(1);humanShadows(H,true);
  player.x=pos[0];player.z=pos[1];player.y=groundH(pos[0],pos[1]);player.h=V.h;player.st='foot';player.passenger=false;
  V.driver=null;V.thr=0;V.brk=0;V.hb=1;V.mode=V.mode==='free'?'free':V.mode;V.car.grp.userData.player=false;player.car=null;
  audio.setEngine(false);sfx.door();cam.yaw=player.h;missionEvent('exit',V)}
function pickVehicleTarget(){let b=null,bd=3.6*3.6;for(const V of vehicles){if(V.hp<=0&&V.deadT>2)continue;const dx=V.x-player.x,dz=V.z-player.z;const d=dx*dx+dz*dz;if(d>bd*3)continue;
  const f=fxv(V.h);const lx=dx*f[1]*-1+dz*f[0],al=dx*f[0]+dz*f[1];const dd=Math.max(0,Math.abs(al)-V.L*.5)**2+Math.max(0,Math.abs(lx)-V.W*.5)**2;if(dd<bd){bd=dd;b=V}}return b}

/* ================= DRIVING CONTROLS ================= */
function driveControls(dt){
  const V=player.car;if(!V)return;let mx=input.mx,mz=input.mz;const k=keyInput();if(k){mx=k[0];mz=k[1]}
  if(UILOCK||player.passenger){mx=0;mz=0}
  V.steer=lerp(V.steer,-clamp(mx*1.15,-1,1),Math.min(1,dt*(Math.abs(mx)>.05?9:12)));
  V.thr=mz>.12?Math.min(1,mz*1.2):0;V.brk=mz<-.12?Math.min(1,-mz*1.2):0;
  V.hb=(keys[' ']||held.hb)&&!UILOCK?1:0;
  const wantBoost=(keys['shift']||held.nos)&&!UILOCK&&player.nos>.02&&V.thr>0;
  V.boost=wantBoost?1:0;player.nos=clamp(player.nos+(wantBoost?-dt*.28:dt*.07),0,1);
  if(consume('h')||consume('horn')){sfx.horn();peds.forEach(p=>{if(p.state==='walk'&&Math.hypot(p.x-V.x,p.z-V.z)<10){p.state='flee';p.fleeFrom=[V.x,V.z];p.t=3;p.speed=3.5}})}
  if(consume('r')||consume('radio')){audio.station=(audio.station+1)%STATIONS.length;S.radio=true;audio.setRadio(true);toast('📻 '+STATIONS[audio.station].n);sfx.ui()}
  if(V.spec.fly&&(consume('fly')||consume('f'))){V.flying=!V.flying;V.alt=V.flying?48:0;if(V.flying){V.flying=true}toast(V.flying?'🛫 Flying! Press again to land':'🛬 Landing…');sfx.ui()}
  if(consume('v')||consume('view')){cam.mode=(cam.mode+1)%2}
  audio.setEngine(true,V.speed,V.thr,V.name);
  if(V.hp<=0)audio.setEngine(false);
}

/* ================= VEHICLE LOOP ================= */
let aiT=0,parkT=0;const AI_MAX=MOBILE?[3,5,7]:[7,12,19];
function explodeVehicle(V){
  if(V.boom)return;V.boom=true;V.hp=0;sfx.boom&&sfx.boom();const near=Math.hypot(V.x-player.x,V.z-player.z);if(near<60)cam.shake=Math.min(1,cam.shake+1-near/60);
  for(let i=0;i<26;i++)emit(V.x+(Math.random()-.5)*2,.8+Math.random()*1.4,V.z+(Math.random()-.5)*2,(Math.random()-.5)*7,2+Math.random()*5,(Math.random()-.5)*7,.7+Math.random()*.7,1.6+Math.random()*1.8,1,.55+Math.random()*.3,.15,3,true);
  for(let i=0;i<18;i++)emit(V.x,1,V.z,(Math.random()-.5)*5,3+Math.random()*4,(Math.random()-.5)*5,1.5+Math.random(),1.4,.3,.3,.3,1.6);
  peds.forEach(p=>{if(Math.hypot(p.x-V.x,p.z-V.z)<9)pedHit(p,V.x,V.z,90)});
  vehicles.forEach(o=>{if(o!==V){const d=Math.hypot(o.x-V.x,o.z-V.z);if(d<7){o.hp-=60*(1-d/7);const dx=o.x-V.x,dz=o.z-V.z,l=d||1;o.vx+=dx/l*8;o.vz+=dz/l*8;if(o.mode==='ai'||o.mode==='parked')toFree(o)}}});
  const dp=Math.hypot(player.x-V.x,player.z-V.z);
  if(player.car===V){exitVehicle(true);hurtPlayer(500,'boom')}else if(dp<8&&player.st==='foot')hurtPlayer(60*(1-dp/8),'boom');
  addHeat(.5);if(near<30)flashScreen('#ff8a2a',.55);V.car.grp.visible=false;V.removeMe=true}
function updateVehicles(dt,T){
  for(const V of vehicles){if(!isFinite(V.x+V.z+V.vx+V.vz+V.h+V.yr+V.speed)){V.x=isFinite(V.lx)?V.lx:V.x;V.z=isFinite(V.lz)?V.lz:V.z;if(!isFinite(V.x))V.x=0;if(!isFinite(V.z))V.z=0;V.vx=V.vz=V.yr=V.speed=0;if(!isFinite(V.h))V.h=0}else{V.lx=V.x;V.lz=V.z}}
  aiT-=dt;if(aiT<0){aiT=.35;let n=0;vehicles.forEach(v=>{if(v.mode==='ai')n++});if(n<AI_MAX[QUALITY])spawnTraffic(player.x,player.z)}
  parkT-=dt;if(parkT<0){parkT=1.1;streamParked(player.x,player.z,QUALITY?140:105)}
  const vd=QUALITY?230:170;
  for(const V of vehicles.slice()){
    if(V.despawn||V.removeMe){if(player.car===V)exitVehicle();removeVehicle(V);continue}
    const dx=V.x-player.x,dz=V.z-player.z,dist=Math.sqrt(dx*dx+dz*dz);
    if(V.mode==='ai'&&dist>310){removeVehicle(V);continue}
    if(V.mode==='free'&&V.driver!=='player'&&!V.owned&&dist>260&&V.name!=='police'){removeVehicle(V);continue}
    if(V.mode==='ai'||V.mode==='cop'){const h0=V.h;aiStep(V,dt);if(!V.despawn)V.steer=lerp(V.steer,clamp(angDiff(h0,V.h)/dt*.14,-.7,.7),Math.min(1,dt*8));V.slip=0}
    else if(V.mode==='copdirect')copDirect(V,dt);
    else if(V.mode==='free'){
      if(V.driver!=='player'){V.thr=0;V.brk=V.speed>.4?.35:0;V.hb=V.hb||0;V.boost=0}
      carPhysics(V,dt);carBuildingCollide(V);
      // obstacles: pedestrians are handled in peds; world limit
      if(Math.abs(V.x)>LIM||Math.abs(V.z)>LIM){V.x=clamp(V.x,-LIM,LIM);V.z=clamp(V.z,-LIM,LIM);V.vx*=-.2;V.vz*=-.2;V.speed*=.3}
      if(V===player.car){player.x=V.x;player.z=V.z;player.y=V.y;player.h=V.h;player.speed=V.speed;
        // run over cones etc: skip
        if(V.hp<=0&&!V.boom){V.deadT=(V.deadT||0)+dt;if(V.deadT>7)explodeVehicle(V)}}
      else if(V.hp<=0&&!V.boom){V.deadT=(V.deadT||0)+dt;if(V.deadT>5)explodeVehicle(V)}
    }
    if(V.mode!=='parked'||V.moved){V.car.grp.visible=dist<vd}else V.car.grp.visible=dist<vd*.8;
    if(V.car.grp.visible)syncMesh(V,dt);
  }
  vehicleVsVehicle();updateParts(dt);updatePolice(dt);
  // police siren sound
  let near=1e9;cops.forEach(c=>{near=Math.min(near,Math.hypot(c.x-player.x,c.z-player.z))});audio.setSiren(wanted>0&&near<120?Math.max(0,1-near/130):0);
}
/* ================= CAMERA ================= */
const _cp=new T3.Vector3(),_cl=new T3.Vector3();
function updateCamera(dt){
  if(cam.preview){const p=cam.preview;camera.position.set(p.x,p.y,p.z);camera.lookAt(p.tx,p.ty,p.tz);camera.fov=lerp(camera.fov,36,.2);camera.updateProjectionMatrix();return}
  const V=player.car,drive=player.st!=='foot'&&V;
  // user look
  const sens=.0052;if(input.lookDX||input.lookDY){cam.yaw-=input.lookDX*sens;cam.pitch=clamp(cam.pitch+input.lookDY*.0042,-.45,1.15);cam.userT=drive?1.8:0;input.lookDX=0;input.lookDY=0}
  if(keys['arrowleft']&&!drive)cam.yaw+=dt*1.8;if(keys['arrowright']&&!drive)cam.yaw-=dt*1.8;
  if(keys['e']&&false){}
  let dist,height,pivotY,tx,ty,tz,fov=62;
  if(drive){
    cam.userT-=dt;const sp=Math.abs(V.speed);
    if(cam.userT<=0){let want=V.h;if(V.speed<-3)want=V.h+Math.PI;cam.yaw+=angDiff(cam.yaw,want)*Math.min(1,dt*(2.4+Math.min(sp,40)*.03));cam.pitch=lerp(cam.pitch,.2+Math.min(sp,60)*.0015,Math.min(1,dt*2))}
    if(cam.mode===1&&player.H){ // hood / cockpit camera
      const f=fxv(V.h);const bs=V.bs;const lx=Math.cos(V.h),lz=-Math.sin(V.h);const hp=player.H.root;hp.visible=false;
      camera.position.set(V.x+f[0]*(bs.cab[1]+.55)+lx*bs.W*.21,V.y+bs.rh-.2,V.z+f[1]*(bs.cab[1]+.55)+lz*bs.W*.21);
      cam.yaw=lerp(cam.yaw,V.h,.3);camera.rotation.order='YXZ';camera.rotation.set(-.04+(V.pitch||0),V.h+Math.PI+(V.roll||0)*0,V.roll*.5||0);camera.rotation.y=V.h+Math.PI;
      camera.fov=lerp(camera.fov,70+sp*.25,.1);camera.updateProjectionMatrix();return}
    if(player.H)player.H.root.visible=true;
    dist=V.L*1.15+3.4+Math.min(sp,50)*.05;height=1.3+V.bs.rh*.55;tx=V.x;ty=V.y+V.bs.rh*.7;tz=V.z;
    const f=fxv(V.h);tx+=f[0]*Math.min(sp*.05,2.4);tz+=f[1]*Math.min(sp*.05,2.4);fov=62+Math.min(sp,70)*.32+(V.boost?9:0);
    cam.dist=lerp(cam.dist,dist,Math.min(1,dt*3));
    const pc=Math.cos(cam.pitch),ps=Math.sin(cam.pitch);_cp.set(tx-Math.sin(cam.yaw)*pc*cam.dist,ty+height*.5+ps*cam.dist*.9,tz-Math.cos(cam.yaw)*pc*cam.dist);
    _cl.set(tx,ty+.5,tz);
  }else{
    const aiming=!!player.weapon&&(held.aim||keys['x']);
    cam.dist=lerp(cam.dist,aiming?2.6:4.3,Math.min(1,dt*6));fov=aiming?54:62;
    if(player.H)player.H.root.visible=true;
    tx=player.x;ty=player.y+1.55;tz=player.z;
    if(aiming){tx+=-Math.cos(cam.yaw)*-.55;tz+=Math.sin(cam.yaw)*-.55}
    const pc=Math.cos(cam.pitch),ps=Math.sin(cam.pitch);_cp.set(tx-Math.sin(cam.yaw)*pc*cam.dist,ty+ps*cam.dist,tz-Math.cos(cam.yaw)*pc*cam.dist);
    _cl.set(tx,ty-.1,tz);
  }
  // building / world collision for the camera: pull in
  if(!isFinite(cam.shake))cam.shake=0;if(!isFinite(cam.yaw))cam.yaw=player.h||0;if(!isFinite(cam.pitch))cam.pitch=.3;if(!isFinite(cam.dist))cam.dist=6;
  const px=_cl.x,py=_cl.y,pz=_cl.z;let tcl=1;for(let s=1;s<=8;s++){const k=s/8,x=px+(_cp.x-px)*k,y=py+(_cp.y-py)*k,z=pz+(_cp.z-pz)*k;if(colInside(x,y,z,.35)){tcl=Math.max(drive?.55:.3,(s-1.5)/8);break}}
  if(tcl<1){_cp.set(px+(_cp.x-px)*tcl,py+(_cp.y-py)*tcl,pz+(_cp.z-pz)*tcl)}
  _cp.y=Math.max(_cp.y,groundH(_cp.x,_cp.z)+.5);
  camera.position.lerp(_cp,drive?Math.min(1,dt*14):1);if(!drive)camera.position.copy(_cp);
  if(!isFinite(camera.position.x+camera.position.y+camera.position.z))camera.position.set(_cl.x,_cl.y+4,_cl.z-6);
  camera.lookAt(_cl);
  if(cam.shake>0){const s=cam.shake*cam.shake*.35;camera.position.x+=(Math.random()-.5)*s;camera.position.y+=(Math.random()-.5)*s;camera.position.z+=(Math.random()-.5)*s;cam.shake=Math.max(0,cam.shake-dt*1.6)}
  camera.fov=lerp(camera.fov,fov,Math.min(1,dt*4));camera.updateProjectionMatrix();
}
/* ================= POI MARKERS + GPS ================= */
const MARK={group:new T3.Group(),items:[],beacon:null};scene.add(MARK.group);
function iconSprite(ic,name,col){const c=mkCanvas(256,160),g=c.getContext('2d');g.fillStyle='rgba(8,10,20,.78)';g.beginPath();if(g.roundRect)g.roundRect(20,10,216,140,28);else g.rect(20,10,216,140);g.fill();g.strokeStyle=col;g.lineWidth=5;g.stroke();
  g.font='64px system-ui,"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText(ic,128,62);g.fillStyle='#fff';g.font='700 28px "Barlow Condensed",system-ui,sans-serif';g.fillText(name,128,122);
  const t=new T3.CanvasTexture(c);t.colorSpace=T3.SRGBColorSpace;const s=new T3.Sprite(new T3.SpriteMaterial({map:t,transparent:true,depthWrite:false,fog:false}));s.scale.set(6.4,4,1);s.renderOrder=6;return s}
function buildMarkers(){MARK.group.clear();MARK.items=[];
  CITY.pois.forEach(p=>{const g=new T3.Group();g.position.set(p.pos.x,.3,p.pos.z);const col=new T3.Color(p.col);
    const ring=new T3.Mesh(new T3.RingGeometry(1.5,2.1,36),new T3.MeshBasicMaterial({color:col,transparent:true,opacity:.85,side:T3.DoubleSide,depthWrite:false,fog:false,toneMapped:false}));ring.rotation.x=-Math.PI/2;g.add(ring);
    const beam=new T3.Mesh(new T3.CylinderGeometry(1.2,1.2,46,14,1,true),new T3.MeshBasicMaterial({color:col,transparent:true,opacity:.2,side:T3.DoubleSide,blending:T3.AdditiveBlending,depthWrite:false,fog:false,toneMapped:false}));beam.position.y=23;g.add(beam);
    const sp=iconSprite(p.ic,p.n,p.col);sp.position.y=6.5;g.add(sp);MARK.group.add(g);MARK.items.push({g,ring,beam,sp,p})})}
function updateMarkers(T){MARK.items.forEach(m=>{const dx=m.p.pos.x-player.x,dz=m.p.pos.z-player.z,d=Math.hypot(dx,dz);m.g.visible=d<420;if(!m.g.visible)return;const near=d<12;m.ring.scale.setScalar(1+Math.sin(T*3+m.p.gx)*.08+(near?.15:0));m.beam.material.opacity=near?.34:.18;const s=clamp(d/60,.7,3.4);m.sp.scale.set(6.4*s*.55,4*s*.55,1);m.sp.position.y=5+s*1.2})}
// A* free route over road grid (BFS)
function nearestNode(x,z){return[clamp(Math.round((x+HALF)/PITCH),0,N),clamp(Math.round((z+HALF)/PITCH),0,N)]}
function findPath(a,b){const key=(i,j)=>i*32+j,q=[a],prev=new Map([[key(a[0],a[1]),null]]);let h=0;
  while(h<q.length){const c=q[h++];if(c[0]===b[0]&&c[1]===b[1])break;for(const d of DIRV){const n=[c[0]+d[0],c[1]+d[1]];if(!nodeValid(n[0],n[1])||prev.has(key(n[0],n[1])))continue;prev.set(key(n[0],n[1]),c);q.push(n)}}
  if(!prev.has(key(b[0],b[1])))return null;const out=[];let c=b;while(c){out.push(c);c=prev.get(key(c[0],c[1]))}return out.reverse()}
const GPS={dest:null,route:null,t:0,beam:null,info:null};
function setGPS(x,z,label){GPS.dest={x,z,label};GPS.t=0;GPS.route=null;if(!GPS.beam){GPS.beam=new T3.Mesh(new T3.CylinderGeometry(.9,.9,160,12,1,true),new T3.MeshBasicMaterial({color:0xff3d81,transparent:true,opacity:.35,side:T3.DoubleSide,blending:T3.AdditiveBlending,depthWrite:false,fog:false,toneMapped:false}));scene.add(GPS.beam)}GPS.beam.visible=true;GPS.beam.position.set(x,80,z)}
function clearGPS(){GPS.dest=null;GPS.route=null;GPS.info=null;if(GPS.beam)GPS.beam.visible=false}
function updateGPS(dt){if(!GPS.dest)return;GPS.t-=dt;
  const dd=Math.hypot(GPS.dest.x-player.x,GPS.dest.z-player.z);
  if(GPS.t<=0){GPS.t=1.2;const a=nearestNode(player.x,player.z),b=nearestNode(GPS.dest.x,GPS.dest.z);const path=findPath(a,b);GPS.route=path;
    // hint: next node relative to player heading
    let hint='Head to the marker';if(path&&path.length>1){const nx=path[Math.min(1,path.length-1)];let n=path[0];const nn=path.length>2&&Math.hypot(rcx(path[0][0])-player.x,rcx(path[0][1])-player.z)<22?path[1]:path[0];
      const tx=rcx(nn[0])-player.x,tz=rcx(nn[1])-player.z,ang=angDiff(player.h,Math.atan2(tx,tz)),dn=Math.hypot(tx,tz);hint=(Math.abs(ang)<.5?'Continue straight':ang>0?'Turn left':'Turn right')+' · '+Math.round(dn/10)*10+'m'}
    GPS.info={dist:dd,hint}}
  if(GPS.info)GPS.info.dist=dd;
  if(dd<(GPS.arrive||14)&&!GPS.hold){const cb=GPS.onArrive;clearGPS();toast('📍 You have arrived');sfx.coin();if(cb)cb()}
  if(GPS.beam)GPS.beam.visible=dd>18}
/* ================= MINIMAP ================= */
const MM={base:null,R0:HALF+70,cv:null,ctx:null,size:132};
function buildMinimapBase(){const S=1280,R0=MM.R0,k=S/(2*R0);const c=mkCanvas(S,S),g=c.getContext('2d');
  // terrain: ocean on S/W
  g.fillStyle=TH.n==='Dubai'?'#d8c08a':'#6e8a58';g.fillRect(0,0,S,S);
  const wg=g.createLinearGradient(0,S,S*.35,S*.65);g.fillStyle='#3a86b0';
  g.beginPath();g.moveTo(0,0);g.lineTo((R0-HALF-20)*k,0);g.lineTo((R0-HALF-20)*k,(R0+HALF+20)*k);g.lineTo(S,(R0+HALF+20)*k);g.lineTo(S,S);g.lineTo(0,S);g.closePath();g.fill();
  g.fillStyle='#d9c88f';g.fillRect((R0-HALF-30)*k,(R0-HALF-30)*k,(2*HALF+60)*k,(2*HALF+60)*k);
  const X=x=>(x+R0)*k;
  g.fillStyle='#4b4f58';g.fillRect(X(-HALF-12),X(-HALF-12),(2*HALF+24)*k,(2*HALF+24)*k);
  const zc={down:'#70757f',midhi:'#797e88',mid:'#838891',old:'#8a8478',hill:'#77906a',marina:'#9aa090',air:'#9a9ea6'};
  CITY.blocks.forEach(b=>{const x=bcx(b.gx)-BLK/2,z=bcx(b.gz)-BLK/2;if(b.zone==='air')return;g.fillStyle=zc[b.zone]||'#808590';g.fillRect(X(x),X(z),BLK*k,BLK*k)});
  // airport region
  g.fillStyle='#9a9ea6';g.fillRect(X(rcx(AIR.gx0)+8),X(rcx(AIR.gz0)+8),(rcx(AIR.gx1+1)-rcx(AIR.gx0)-16)*k,(rcx(AIR.gz1+1)-rcx(AIR.gz0)-16)*k);
  g.fillStyle='#2c2d30';g.fillRect(X(rcx(AIR.gx0)+38),X(rcx(AIR.gz0)+22),(rcx(AIR.gx1+1)-rcx(AIR.gx0)-76)*k,30*k);
  // park + parks
  const pk=CITY.pois.find(p=>p.id==='park');if(pk){g.fillStyle='#5aa24c';g.fillRect(X(bcx(pk.gx)-LOT/2),X(bcx(pk.gz)-LOT/2),LOT*k,LOT*k);g.fillStyle='#3a8fc4';g.beginPath();g.arc(X(bcx(pk.gx)+22),X(bcx(pk.gz)+22),14*k,0,TAU);g.fill()}
  g.fillStyle='rgba(30,34,44,.55)';CITY.rects.forEach(r=>g.fillRect(X(r.x0),X(r.z0),(r.x1-r.x0)*k,(r.z1-r.z0)*k));
  // road lines
  MM.base=c;MM.k=k;MM.rx=R0}
function initMinimap(){MM.cv=$('#mmc');const pr=Math.min(2,devicePixelRatio||1);MM.cv.width=MM.size*pr;MM.cv.height=MM.size*pr;MM.ctx=MM.cv.getContext('2d');MM.pr=pr}
function drawMinimap(T){if(!MM.base||!MM.ctx)return;const g=MM.ctx,S=MM.size*MM.pr,c=S/2,range=170,s=(S/2)/range;
  g.setTransform(1,0,0,1,0,0);g.clearRect(0,0,S,S);g.save();g.beginPath();g.arc(c,c,c-2,0,TAU);g.clip();g.fillStyle='#2e3a4a';g.fillRect(0,0,S,S);
  g.translate(c,c);g.rotate(player.h-Math.PI);g.scale(s,s);g.translate(-player.x,-player.z);
  g.imageSmoothingEnabled=true;g.drawImage(MM.base,-MM.rx,-MM.rx,2*MM.rx,2*MM.rx);
  // route
  if(GPS.dest){g.strokeStyle='#ff3d81';g.lineWidth=5/s;g.lineJoin='round';g.lineCap='round';g.beginPath();g.moveTo(player.x,player.z);if(GPS.route)GPS.route.forEach(n=>g.lineTo(rcx(n[0]),rcx(n[1])));g.lineTo(GPS.dest.x,GPS.dest.z);g.stroke()}
  const icon=(x,z,col,txt,r)=>{g.save();g.translate(x,z);g.rotate(Math.PI-player.h);g.scale(1/s,1/s);const d=Math.hypot(x-player.x,z-player.z);if(d*s>c-12){const a=Math.atan2(x-player.x,z-player.z);}g.beginPath();g.arc(0,0,r||9,0,TAU);g.fillStyle=col;g.fill();g.lineWidth=2;g.strokeStyle='#0008';g.stroke();if(txt){g.font='11px system-ui,"Apple Color Emoji","Noto Color Emoji",sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText(txt,0,1)}g.restore()};
  CITY.pois.forEach(p=>{if(Math.hypot(p.pos.x-player.x,p.pos.z-player.z)<range*1.3)icon(p.pos.x,p.pos.z,p.col,p.ic,10)});
  cops.forEach(cv=>{if(wanted>0){const f=Math.floor(T*4)%2;icon(cv.x,cv.z,f?'#ff2a2a':'#2a5cff','',6)}});
  if(MISSION.cur&&MISSION.cur.marker)icon(MISSION.cur.marker.x,MISSION.cur.marker.z,'#ffd23f','★',10);
  if(GPS.dest){const dx=GPS.dest.x-player.x,dz=GPS.dest.z-player.z;icon(GPS.dest.x,GPS.dest.z,'#ff3d81','📍',10)}
  g.restore();
  // player arrow
  g.fillStyle='#fff';g.strokeStyle='#0b0f1a';g.lineWidth=2*MM.pr;g.beginPath();g.moveTo(c,c-9*MM.pr);g.lineTo(c+7*MM.pr,c+8*MM.pr);g.lineTo(c,c+4*MM.pr);g.lineTo(c-7*MM.pr,c+8*MM.pr);g.closePath();g.fill();g.stroke();
  g.strokeStyle='rgba(255,255,255,.55)';g.lineWidth=3*MM.pr;g.beginPath();g.arc(c,c,c-2,0,TAU);g.stroke()}

/* ================= GAME STATE ================= */
let mode='boot';Object.defineProperty(window,'__mode',{get:()=>mode});Object.defineProperty(window,'__S',{get:()=>S});Object.defineProperty(window,'__player',{get:()=>player});Object.defineProperty(window,'__audio',{get:()=>audio}); // boot | menu | play | dead | flight
const SAVEKEY='heirloom-v5';
const S={look:{female:false,skin:3,hair:7,hairCol:0,ts:0,tc:'#e8e8e8',bs:0,bc:'#2f4a7a',shoe:0,shc:'#f4f4f4',hat:0,hatc:'#1f1f24',shades:false,chain:false,build:1,h:1},
  name:'Player',theme:0,owned:[{name:'hatch',color:'#e8e8ea'}],outfits:[0],extras:{},hasGun:false,xp:0,lv:1,partner:null,kids:[],preg:0,
  strikes:0,mutedUntil:0,radio:true,sound:true,music:true,qual:null,needs:{fd:90,en:90,fn:70},t:17.2,day:1,created:false,visited:[0],facts:0,
  stats:{fares:0,races:0,fights:0,km:0,dates:0,earned:0,spent:0,visits:0},q:{day:'',prog:{},chest:false},money:2500};
function saveGame(){try{S.money=player.money;S.px=player.x;S.pz=player.z;localStorage.setItem(SAVEKEY,JSON.stringify(S))}catch(e){}}
function loadGame(){try{const j=localStorage.getItem(SAVEKEY);if(!j)return false;const o=JSON.parse(j);for(const k in o){if(o[k]&&typeof o[k]==='object'&&!Array.isArray(o[k])&&S[k]&&typeof S[k]==='object')Object.assign(S[k],o[k]);else S[k]=o[k]}player.money=S.money;return true}catch(e){return false}}
const fmt=n=>'$'+Math.round(n).toLocaleString('en-US');
/* ---- toast / flash / banner ---- */
function toast(msg){const w=$('#toasts');if(!w)return;const d=document.createElement('div');d.className='toast';d.textContent=msg;w.appendChild(d);while(w.children.length>3)w.removeChild(w.firstChild);setTimeout(()=>{d.style.transition='opacity .4s';d.style.opacity=0;setTimeout(()=>d.remove(),420)},2800)}
function flashScreen(col,a){const f=$('#flash');if(!f)return;f.style.background=col;f.style.transition='none';f.style.opacity=a;requestAnimationFrame(()=>requestAnimationFrame(()=>{f.style.transition='opacity .45s';f.style.opacity=0}))}
let bannerT=0;
function banner(t,s,ms,col){const b=$('#banner');$('#bn_t').textContent=t;$('#bn_t').style.color=col||'#fff';$('#bn_s').textContent=s||'';b.style.display='flex';clearTimeout(bannerT);bannerT=setTimeout(()=>{b.style.display='none'},ms||2200)}
let fadeInfo={a:0,t:0};function fadeTo(a,ms){fadeInfo={a:a,t:Date.now()};const f=$('#fade');f.style.transition='opacity '+(ms||500)+'ms';f.style.opacity=a}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
/* ---- money / xp / quests ---- */
function addMoney(n,quiet){player.money+=n;if(n>0){S.stats.earned+=n;qAdd('earn',n);if(!quiet){sfx.cash();toast('+'+fmt(n))}}else S.stats.spent-=n}
function spend(n){if(player.money<n){toast('Not enough cash 💸');sfx.bad();return false}player.money-=n;S.stats.spent+=n;sfx.coin();return true}
const xpNeed=lv=>Math.round(120+lv*lv*55);
function addXP(n){S.xp+=n;while(S.xp>=xpNeed(S.lv)){S.xp-=xpNeed(S.lv);S.lv++;banner('LEVEL '+S.lv,'+'+fmt(200+S.lv*50)+' bonus',2200,'#ffb020');player.money+=200+S.lv*50;sfx.win()}}
const QDEF=[{k:'km',t:'Drive 2 km',n:2,e:'🚗'},{k:'visit',t:'Visit 4 places',n:4,e:'📍'},{k:'earn',t:'Earn $500',n:500,e:'💵'},{k:'eat',t:'Eat a meal',n:1,e:'🍽️'},{k:'chat',t:'Send 2 chat messages',n:2,e:'💬'},{k:'dance',t:'Dance at the club',n:1,e:'🪩'},{k:'fare',t:'Finish a job',n:1,e:'📦'},{k:'learn',t:'Learn 2 country facts',n:2,e:'🌍'}];
function dailyQuests(){const d=dayKey();if(S.q.day!==d){S.q={day:d,prog:{},chest:false}}const r=mulberry(hash(d));const a=QDEF.slice();const out=[];for(let i=0;i<3;i++){out.push(a.splice(Math.floor(r()*a.length),1)[0])}return out}
function qAdd(k,n){const q=dailyQuests();const Q=q.find(x=>x.k===k);if(!Q)return;const was=(S.q.prog[k]||0)>=Q.n;S.q.prog[k]=Math.min(Q.n,(S.q.prog[k]||0)+(n||1));if(!was&&S.q.prog[k]>=Q.n){toast('✅ Quest done: '+Q.t);sfx.win()}}
/* ---- chat (+ moderation) ---- */
const CHAT=[];
const BADW=['fuck','shit','bitch','asshole','dick','pussy','nigga','nigger','whore','slut','cunt','bastard','rape','kill yourself','kys','porn','sex','nude','retard'];
function normTxt(t){return t.toLowerCase().replace(/0/g,'o').replace(/1/g,'i').replace(/3/g,'e').replace(/4/g,'a').replace(/5/g,'s').replace(/\$/g,'s').replace(/@/g,'a').replace(/[^a-z ]/g,'')}
function chatCheck(t){const n=normTxt(t),n2=n.replace(/ /g,'');if(BADW.some(w=>n.includes(w)||n2.includes(w.replace(/ /g,''))))return'language';if(/https?:|www\.|\.com|\.ng\b|@\w+|\d{7,}/i.test(t))return'links or numbers';return null}
function chatMuted(){return S.mutedUntil>Date.now()}
function chatPost(name,flag,text,me){CHAT.push({name,flag,text,me:!!me,t:Date.now()});if(CHAT.length>60)CHAT.shift();renderChatF();if(cur&&cur.id==='chat')renderChatLog()}
function renderChatF(){const w=$('#chatf');if(!w)return;const now=Date.now();w.innerHTML=CHAT.filter(c=>now-c.t<14000).slice(-3).map(c=>'<div class="'+(c.me?'me':'')+'"><b>'+esc(c.name)+' '+c.flag+'</b> '+esc(c.text)+'</div>').join('')}
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const BOT_REPLY=['haha true 😂','lol same','where are you right now?','add me, let\'s race','nice one 🔥','come to the club tonight','this city never sleeps','hi hi 👋','omg yes','I will be at the airport later ✈️'];
function sendChat(text){text=text.trim().slice(0,90);if(!text)return;
  if(chatMuted()){toast('Chat muted until '+new Date(S.mutedUntil).toLocaleDateString()+' — be kind 🙏');return}
  const bad=chatCheck(text);
  if(bad){S.strikes++;saveGame();if(S.strikes>=3){S.mutedUntil=Date.now()+4*864e5;S.strikes=0;toast('⛔ 3 strikes — chat muted for 4 days');saveGame()}else toast('⚠️ Blocked ('+bad+'). Strike '+S.strikes+'/3');sfx.bad();return}
  chatPost(S.name,'🇳🇬',text,true);qAdd('chat');sfx.ui();
  setTimeout(()=>{const b=peds.find(p=>p.bot)||{name:pick(MN),flag:pick(FLAGS)};chatPost(b.name,b.flag,pick(BOT_REPLY))},1400+Math.random()*2400)}
/* ---- missions ---- */
const MISSION={cur:null};
function endMission(ok,msg,reward,xp){const m=MISSION.cur;if(!m)return;MISSION.cur=null;clearGPS();if(m.cleanup)m.cleanup();
  if(ok){banner('COMPLETE',msg||'',2200,'#35e0b0');if(reward)addMoney(reward);addXP(xp||40);sfx.win();qAdd('fare');S.stats.fares++;setTimeout(()=>{if(mode==='play'&&!UILOCK)show('mdone',{msg,reward,xp:xp||40})},1500)}
  else{banner('FAILED',msg||'',2200,'#ff5468');sfx.bad()}saveGame()}
function missionEvent(type,arg){if(MISSION.cur&&MISSION.cur.on)MISSION.cur.on(type,arg)}
function updateMission(dt){const m=MISSION.cur;if(!m)return;m.t+=dt;if(m.limit&&m.limit-m.t<=0&&!m.noTimeout){endMission(false,'Out of time');return}if(m.update)m.update(dt)}
function poiById(id){return CITY.pois.find(p=>p.id===id)}
function randomSpot(minD,maxD){const n=randNodeNear(player.x,player.z,minD,maxD);if(!n)return{x:rcx(10),z:rcx(10)};const pp=pedPos(n);return{x:pp[0],z:pp[1]}}
function startCourier(){if(MISSION.cur){toast('Finish your current job first');return}
  const cands=CITY.pois.filter(p=>!['air','home'].includes(p.id)&&Math.hypot(p.pos.x-player.x,p.pos.z-player.z)>260);const d=pick(cands.length?cands:CITY.pois);
  const dist=Math.hypot(d.pos.x-player.x,d.pos.z-player.z);const m={kind:'courier',title:'📦 Courier: '+d.n,sub:'Deliver the parcel',marker:d.pos,t:0,limit:Math.round(40+dist/9),reward:Math.round(110+dist*.28)};
  m.on=()=>{};m.update=()=>{if(Math.hypot(d.pos.x-player.x,d.pos.z-player.z)<12)endMission(true,'Parcel delivered',m.reward,50)};
  MISSION.cur=m;GPS.arrive=0;GPS.hold=true;setGPS(d.pos.x,d.pos.z,d.n);GPS.hold=true;banner('COURIER',d.n,1800,'#ffd23f');toast('Tip: any car works — take one from the street!')}
function startTaxiJob(){if(MISSION.cur){toast('Finish your current job first');return}
  if(player.st!=='drive'||!player.car){toast('Get in a car first 🚗');return}
  const a=randomSpot(120,260);const p=makePed('civ',a.x,a.z);p.state='idle';p.t=1e9;p.bot=false;p.emote='🙋';p.emT=1e9;
  const m={kind:'taxi',phase:0,title:'🚕 Taxi job',sub:'Pick up the passenger',marker:a,t:0,limit:0,noTimeout:true,ped:p};
  m.update=()=>{const V=player.car;if(m.phase===0){if(V&&Math.hypot(a.x-player.x,a.z-player.z)<9&&Math.abs(V.speed)<6){m.phase=1;removePed(p);m.ped=null;const dd=pick(CITY.pois.filter(q=>!['air','home'].includes(q.id)&&Math.hypot(q.pos.x-player.x,q.pos.z-player.z)>220));const dest=dd||poiById('mall');m.dest=dest;m.marker=dest.pos;m.sub='Drop off at '+dest.n;m.t=0;m.limit=Math.round(40+Math.hypot(dest.pos.x-player.x,dest.pos.z-player.z)/8);m.noTimeout=false;setGPS(dest.pos.x,dest.pos.z,dest.n);GPS.hold=true;toast('"'+pick(TH.fx).slice(0,70)+'…" — passenger');sfx.door()}}
    else if(m.phase===1){if(Math.hypot(m.dest.pos.x-player.x,m.dest.pos.z-player.z)<13&&Math.abs(player.car?player.car.speed:0)<8){endMission(true,'Passenger dropped off',Math.round(130+m.limit*3.2+(m.limit-m.t)*2),60)}}};
  m.cleanup=()=>{if(m.ped)removePed(m.ped)};MISSION.cur=m;banner('TAXI JOB','Find the passenger',1800,'#ffd23f')}
let raceRing=null;
function startRace(fee){if(MISSION.cur){toast('Finish your current job first');return}
  if(player.st!=='drive'||!player.car){toast('Get in a car first 🚗');return}if(fee&&!spend(fee))return;
  const pts=[];let ci=Math.round((player.x+HALF)/PITCH),cj=Math.round((player.z+HALF)/PITCH);ci=clamp(ci,2,N-2);cj=clamp(cj,2,N-2);
  for(let k=0;k<7;k++){let ni,nj,g=0;do{ni=clamp(ci+Math.floor(Math.random()*7)-3,1,N-1);nj=clamp(cj+Math.floor(Math.random()*7)-3,1,N-1);g++}while((Math.abs(ni-ci)+Math.abs(nj-cj)<2||!nodeValid(ni,nj))&&g<30);ci=ni;cj=nj;pts.push({x:rcx(ni),z:rcx(nj)})}
  let len=0,px=player.x,pz=player.z;pts.forEach(p=>{len+=Math.hypot(p.x-px,p.z-pz);px=p.x;pz=p.z});
  if(!raceRing){raceRing=new T3.Mesh(new T3.TorusGeometry(7,.7,8,28),new T3.MeshBasicMaterial({color:0xffd23f,fog:false,toneMapped:false}));scene.add(raceRing)}raceRing.visible=true;
  const m={kind:'race',title:'🏁 Street race',idx:0,pts,t:0,limit:Math.round(len/26+25),reward:Math.round(200+len*.12),marker:pts[0]};
  m.sub='Checkpoint 1/'+pts.length;
  if(fee){const RN=['Tunde','Chidi','Amaka','Bayo','Zainab','Emeka'].sort(()=>Math.random()-.5);const vm=player.car.spec.vmax;m.rivals=[0,1,2].map(i=>({n:RN[i],sp:vm*(.52+Math.random()*.2)}));m.limit=Math.round(len/(vm*.35)+30);m.reward=Math.round(fee*3.5);m.title='🏁 Pot race · '+fmt(fee);m.fee=fee;
    const seg=[];{let a=player.x,b=player.z;pts.forEach(p=>{seg.push(Math.hypot(p.x-a,p.z-b));a=p.x;b=p.z})}m.seg=seg;m.len=len;
    m.prog=()=>{let d=0;for(let i=0;i<m.idx;i++)d+=seg[i];const c=pts[m.idx];if(c)d+=Math.max(0,seg[m.idx]-Math.hypot(c.x-player.x,c.z-player.z));return d}}
  m.update=()=>{const c=pts[m.idx];
    if(m.rivals){const pr=m.prog(),ahead=m.rivals.filter(r=>r.sp*m.t>pr).length;m.sub='Position '+(ahead+1)+'/4 · Checkpoint '+(Math.min(m.idx+1,pts.length))+'/'+pts.length;const w=m.rivals.find(r=>r.sp*m.t>=m.len);if(w){endMission(false,w.n+' won the pot. You lost '+fmt(m.fee));return}}
   raceRing.position.set(c.x,4,c.z);raceRing.rotation.y=m.t*2;m.marker=c;
    if(Math.hypot(c.x-player.x,c.z-player.z)<15){m.idx++;sfx.coin();if(m.idx>=pts.length){const bonus=Math.max(0,Math.round((m.limit-m.t)*4));S.stats.races++;endMission(true,m.fee?'You won the pot '+fmt(m.reward)+'!':'Race won! +bonus '+fmt(bonus),m.reward+(m.fee?0:bonus),90)}else m.sub='Checkpoint '+(m.idx+1)+'/'+pts.length}};
  m.cleanup=()=>{raceRing.visible=false};MISSION.cur=m;banner('RACE','Hit every checkpoint',1800,'#ffd23f')}
function startArena(free){if(MISSION.cur){toast('Finish your current job first');return}if(player.st!=='foot'){toast('Get out of the car first');return}if(!free&&!spend(50))return;
  const m={kind:'arena',title:'🥊 Arena fight',wave:0,fighters:[],t:0,sub:'Wave 1 of 3',marker:null};
  const spawn=()=>{m.wave++;m.sub='Wave '+m.wave+' of 3';m.fighters=[];for(let k=0;k<m.wave;k++){const a=player.h+(k-(m.wave-1)/2)*.9,x=player.x+Math.sin(a)*6,z=player.z+Math.cos(a)*6;const p=makePed('civ',x,z,{female:Math.random()<.3});p.state='fight';p.fighter=true;p.hp=70+m.wave*18;p.tough=true;p.bot=false;m.fighters.push(p)}};
  m.update=()=>{if(m.fighters.length&&m.fighters.every(p=>p.state==='down'||!peds.includes(p))){if(m.wave>=3){S.stats.fights++;endMission(true,'Champion!',400,120)}else{toast('Wave cleared!');spawn()}}
    m.fighters.forEach(p=>{if(p.state==='flee'&&peds.includes(p)){p.state='fight'}});if(player.st!=='foot')endMission(false,'You left the ring')};
  m.cleanup=()=>{m.fighters.forEach(p=>{if(peds.includes(p)){p.fighter=false;p.state='flee';p.fleeFrom=[player.x,player.z];p.t=0}})};
  MISSION.cur=m;spawn();player.guard=0;banner('FIGHT!','Punch with the HIT button',1600,'#ffc92b')}
/* ---- death / arrest / respawn ---- */
async function respawnAt(id,msg,fee,keepGun){
  try{const P=poiById(id);const bill=Math.min(player.money,Math.round(fee));player.money-=bill;
  try{if(player.car)exitVehicle(true)}catch(e){try{player.car=null;player.st='foot';player.passenger=false;if(player.H){player.H.root.removeFromParent();scene.add(player.H.root);player.H.root.scale.setScalar(1);player.H.root.visible=true}audio.setEngine(false)}catch(_){}}
  const f=P.face==='n'?[0,1]:P.face==='s'?[0,-1]:P.face==='e'?[-1,0]:[1,0];
  player.x=P.pos.x+f[0]*3;player.z=P.pos.z+f[1]*3;player.y=groundH(player.x,player.z);player.h=Math.atan2(f[0],f[1])+Math.PI;player.hp=100;player.inv=2.5;player.downT=0;player.st='foot';
  try{setWanted(0);cops.slice().forEach(c=>{c.despawn=true});peds.slice().forEach(p=>{if(p.kind==='cop')removePed(p)})}catch(_){}
  if(!keepGun)player.weapon=null;cam.yaw=player.h;
  S.needs.fd=Math.max(S.needs.fd,45);S.needs.en=Math.max(S.needs.en,45);
  setTimeout(()=>{toast(msg+(bill?' (bill '+fmt(bill)+')':''))},600)}catch(e){console.error('respawn',e)}
  finally{mode='play';UILOCK=false;player.st='foot';if(player.H)player.H.root.visible=true;fadeTo(0,700);$('#banner').style.display='none'}}
function wasted(why){if(mode!=='play')return;mode='dead';if(MISSION.cur)endMission(false,'You were knocked out');
  const crash=why==='car'||why==='boom';banner('WASTED',crash?'Crash victim — ambulance called':'You blacked out',4200,'#ff5468');cam.shake=1;sfx.bad();
  player.input=0;setTimeout(()=>{if(mode==='dead')fadeTo(.85,900)},2200);setTimeout(()=>{if(mode==='dead')respawnAt('hosp','🏥 You woke up in hospital',60,false)},7500);
  setTimeout(()=>respawnAt('hosp',crash?'🏥 You were rushed to hospital after the accident':'🏥 You woke up in hospital',60+player.money*.05,false),3500)}
function busted(){if(mode!=='play')return;mode='dead';if(MISSION.cur)endMission(false,'Arrested');banner('BUSTED','The police took you in',3600,'#5a7bff');sfx.bad();
  setTimeout(()=>fadeTo(1,900),2000);setTimeout(()=>respawnAt('police','🚓 Released from the police station',100+player.money*.08,false),3300)}
/* ---- needs, time, weather ---- */
const WX={t:60+Math.random()*120,target:0};
function updateNeeds(dt){const N_=S.needs,run=player.st==='foot'&&player.speedCur>6?2.2:1;
  N_.fd=Math.max(0,N_.fd-dt*.11);N_.en=Math.max(0,N_.en-dt*.06*run);N_.fn=Math.max(0,N_.fn-dt*.04);
  player.lastHurt+=dt;
  if((N_.fd<=0||N_.en<=0)&&mode==='play'){player.hp-=dt*1.2;if(Math.random()<dt*.15)toast(N_.fd<=0?'🍽️ You are starving — eat something!':'😴 You are exhausted — go home to sleep');if(player.hp<=0)wasted('hunger')}
  else if(player.hp<100&&player.lastHurt>6&&N_.fd>25)player.hp=Math.min(100,player.hp+dt*1.6)}
function updateWeather(dt){WX.t-=dt;if(WX.t<=0){WX.target=WX.target>0?0:(Math.random()<.45?1:0);WX.t=WX.target?50+Math.random()*80:110+Math.random()*180;if(WX.target)toast('🌧️ It started raining — roads are slippery')}
  ENV.rain+=(WX.target-ENV.rain)*Math.min(1,dt*.25)}
/* rain streaks */
const RAIN={n:520,m:null,pos:null};
function initRain(){const g=new T3.BufferGeometry();RAIN.pos=new Float32Array(RAIN.n*6);g.setAttribute('position',new T3.BufferAttribute(RAIN.pos,3));RAIN.seed=[];for(let i=0;i<RAIN.n;i++)RAIN.seed.push([(Math.random()-.5)*50,Math.random()*30,(Math.random()-.5)*50]);
  RAIN.m=new T3.LineSegments(g,new T3.LineBasicMaterial({color:0xaec4dd,transparent:true,opacity:.35,fog:false,depthWrite:false}));RAIN.m.frustumCulled=false;scene.add(RAIN.m)}
function updateRain(dt,T){if(!RAIN.m)return;const r=ENV.rain;RAIN.m.visible=r>.08&&!cam.preview;if(!RAIN.m.visible)return;RAIN.m.material.opacity=.12+r*.3;
  const cx=camera.position.x,cy=camera.position.y,cz=camera.position.z,P=RAIN.pos;
  for(let i=0;i<RAIN.n;i++){const s=RAIN.seed[i];s[1]-=dt*26;if(s[1]<-6)s[1]+=34;const x=cx+s[0],y=cy+s[1],z=cz+s[2];P[i*6]=x;P[i*6+1]=y;P[i*6+2]=z;P[i*6+3]=x-.05;P[i*6+4]=y+.7;P[i*6+5]=z}
  RAIN.m.geometry.attributes.position.needsUpdate=true}

/* ================= UI PANELS ================= */
const sheet=$('#sheet');let cur=null;
const hd=(t,sub)=>'<div class="ph"><span>'+t+(sub?'<small style="display:block;font:500 12px var(--body);letter-spacing:0;text-transform:none;color:var(--dim)">'+sub+'</small>':'')+'</span><button class="x" data-a="close">✕</button></div>';
const B=(a,v,l,c,dis)=>'<button class="btn '+(c||'')+'" data-a="'+a+'" data-v="'+esc(v===undefined?'':v)+'"'+(dis?' disabled':'')+'>'+l+'</button>';
function show(id,args,keepScroll){const sc=keepScroll&&sheet.querySelector('.panel')?sheet.querySelector('.panel').scrollTop:0;cur={id,args};const r=P[id](args||{});
  sheet.innerHTML='<div class="scrim" data-a="close"></div><div class="panel '+(r.cls||'')+'">'+r.h+'</div>';sheet.className='open'+(r.nobg?' nobg':'');UILOCK=true;
  if(sc)sheet.querySelector('.panel').scrollTop=sc;if(r.after)r.after()}
function refresh(){if(cur)show(cur.id,cur.args,true)}
function closeSheet(){if(RIDE.on)return;sheet.className='';sheet.innerHTML='';UILOCK=false;cur=null;cam.preview=null;if(player.H&&player.st==='foot')player.H.root.visible=true;if(mode==='menu'&&!closeSheet.skip)setTimeout(()=>{if(mode==='menu'&&!cur)show('title',{})},0)}
sheet.addEventListener('click',e=>{const el=e.target.closest('[data-a]');if(!el||el.disabled)return;audioInit();sfx.ui();const a=el.dataset.a;if(ACT[a])ACT[a](el.dataset.v,el,e)});
sheet.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.matches&&e.target.matches('#chatin')){ACT.sendchat()}});
const tabs=(list,sel,act)=>'<div class="tabs">'+list.map(t=>'<button class="tab '+(t[0]===sel?'on':'')+'" data-a="'+act+'" data-v="'+t[0]+'">'+t[1]+'</button>').join('')+'</div>';
const dist2=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const GOODCARS=['hatch','sedan','suv','sports','tesla','ferrari','hyper','aventador','chiron','skyfly'];
const LEARN={Lagos:[['How far?','Pidgin for "how are you?"'],['Abeg','Means "please"'],['E don do','Means "that is enough"']],London:[['Cheers','Used for both thanks and goodbye'],['Mind the gap','The warning on the Tube'],['Queue','Brits take it very seriously']],Tokyo:[['Arigato','Thank you'],['Konnichiwa','Hello'],['Sumimasen','Excuse me / sorry']],Rio:[['Obrigado','Thank you'],['Tudo bem?','How is it going?'],['Saudade','A deep, happy-sad longing']],'New York':[['Bodega','A corner shop'],['The subway','NYC runs one of the biggest in the world'],['Yo!','The classic hello']],Dubai:[['Shukran','Thank you'],['Marhaba','Hello'],['Yalla','Let us go!']]};
/* ---- teleport ---- */
function nearRoadPoint(x,z){const ix=Math.round((x+HALF)/PITCH),iz=Math.round((z+HALF)/PITCH),rx=rcx(clamp(ix,0,N)),rz=rcx(clamp(iz,0,N));
  const dx=Math.abs(x-rx),dz=Math.abs(z-rz);if(dx<dz)return{x:rx+(z>player.z?4:-4)*0+4,z,h:0};return{x,z:rz-4,h:Math.PI/2}}
function placeAt(x,z,h){if(player.car)exitVehicle(true);player.x=x;player.z=z;player.y=groundH(x,z);player.h=h||0;cam.yaw=player.h;player.vx=player.vz=0}
async function teleportPOI(p){fadeTo(1,500);await sleep(550);const f=p.face==='n'?[0,1]:p.face==='s'?[0,-1]:p.face==='e'?[-1,0]:[1,0];placeAt(p.pos.x+f[0]*3,p.pos.z+f[1]*3,Math.atan2(f[0],f[1])+Math.PI);peds.slice().forEach(q=>{if(q.kind==='civ')removePed(q)});fadeTo(0,600)}
/* ---- car helpers ---- */
function bringCar(i){const o=S.owned[i];let V=vehicles.find(v=>v.ownIdx===i);const f=[Math.sin(player.h),Math.cos(player.h)];const rp=nearRoadPoint(player.x,player.z);
  if(V){V.x=rp.x;V.z=rp.z;V.h=rp.h;V.speed=0;V.vx=V.vz=0;V.hp=Math.max(V.hp,50);V.hb=1;V.mode='free';V.car.grp.visible=true}
  else{V=spawnVehicle(o.name,o.color,rp.x,rp.z,rp.h,'free');V.owned=true;V.ownIdx=i;V.hb=1;upgradeToFull(V)}
  toast('🚗 Your '+CARS[o.name].n+' is waiting nearby')}
/* ---- family ---- */
let famPeds=[];
function spawnFamily(){famPeds.forEach(p=>{if(peds.includes(p))removePed(p)});famPeds=[];if(!S.partner)return;const home=poiById('home');if(!home)return;
  const mk=(name,female,look,sc,ox,oz)=>{const p=makePed('family',home.pos.x+ox,home.pos.z+oz,{female,look,name,flag:'❤️'});p.state='idle';p.t=1e9;p.H.root.scale.setScalar(sc);famPeds.push(p)};
  mk(S.partner.name,S.partner.female,S.partner.look,1,2.4,-1.5);S.kids.forEach((k,i)=>mk(k.name,k.female,randLook(k.female,mulberry(i+7)),.62,-2+i*1.1,-2.4))}
/* ---- date helpers ---- */
function genCandidates(){const out=[];for(let i=0;i<3;i++){const f=!S.look.female;const female=Math.random()<.5?!S.look.female:S.look.female;out.push({name:pick(female?FN:MN),female,flag:pick(FLAGS),look:randLook(female),aff:8,theme:pick(THEMES).n,hobby:pick(['football','cooking','travel','music','fashion','racing cars','swimming','photography'])})}return out}
function dateReply(kind,d){const g={c:['Aww, you are sweet 😊','Stop it, you are making me blush!','That made my day 💕'],j:['Hahaha 😂 good one!','Okay that was actually funny.','You are so silly 😄'],a:['I love talking about where I am from!','You should visit someday ✈️','Ask me anything, I love this!'],gift:['You did not have to… thank you! 🎁','This is so thoughtful 💖'],dinner:['Dinner was wonderful tonight 🍽️','I had such a lovely time ✨']};return pick(g[kind])}
/* ================= PANELS ================= */
const P={};
P.title=()=>({nobg:true,cls:'tall',h:'<div style="text-align:center;padding:10px 0 6px"><div style="font:800 44px var(--disp);letter-spacing:.16em;background:linear-gradient(180deg,#fff,#ffb020);-webkit-background-clip:text;background-clip:text;color:transparent">HEIRLOOM</div><div class="cap">A living open-world city. Drive, date, work, travel.</div><div class="row c" style="margin-top:10px">'+B('start','','▶ Play')+'</div><div class="cap" style="margin-top:12px">Move: left stick / WASD · Look: drag · Act: ACT / E<br>Needs a decent phone. Low-graphics option in Settings ⚙️</div></div>'});
P.phone=()=>{const q=dailyQuests().filter(x=>(S.q.prog[x.k]||0)<x.n).length;
  return{h:hd('Phone','Day '+S.day+' · '+hh(S.t)+' · '+TH.n+' '+TH.f)+'<div class="apps">'+[['map','🗺️','Map'],['taxi','🚕','Taxi'],['jobs','💼','Jobs'],['chat','💬','Chat'],['dating','💘','Dating'],['ranks','🏆','Ranks'],['quests','📋','Daily'+(q?' ('+q+')':'')],['wardrobe','👕','Outfit'],['garage','🚗','Garage'],['family','👨‍👩‍👧','Family'],['menu','⚙️','Settings'],['air','✈️','Flights']].map(a=>'<button class="app" data-a="open" data-v="'+a[0]+'"><span>'+a[1]+'</span>'+a[2]+'</button>').join('')+'</div>'}};
const hh=t=>{const h=Math.floor(t)%24,m=Math.floor((t%1)*60);return String(h).padStart(2,'0')+':'+String(m).padStart(2,'0')};
P.map=()=>({cls:'tall',h:hd('City map','Tap the map to set GPS')+'<canvas id="bigmap" width="560" height="560" style="width:100%;border-radius:16px;background:#2e3a4a;touch-action:manipulation" data-a="mapclick"></canvas><div class="row" style="margin-top:8px">'+CITY.pois.map(p=>'<button class="btn alt sm" data-a="gps" data-v="'+p.id+'">'+p.ic+' '+p.n+'</button>').join('')+(GPS.dest?B('cleargps','','Clear GPS','sm'):'')+'</div>',after:drawBigMap});
function drawBigMap(){const c=$('#bigmap');if(!c)return;const g=c.getContext('2d'),S_=560,k=S_/(2*MM.R0);g.drawImage(MM.base,0,0,S_,S_);const X=v=>(v+MM.R0)*k;
  CITY.pois.forEach(p=>{g.beginPath();g.arc(X(p.pos.x),X(p.pos.z),11,0,TAU);g.fillStyle=p.col;g.fill();g.strokeStyle='#000a';g.lineWidth=2;g.stroke();g.font='13px system-ui,"Noto Color Emoji"';g.textAlign='center';g.textBaseline='middle';g.fillText(p.ic,X(p.pos.x),X(p.pos.z)+1)});
  if(GPS.dest){g.beginPath();g.arc(X(GPS.dest.x),X(GPS.dest.z),8,0,TAU);g.fillStyle='#ff3d81';g.fill();g.strokeStyle='#fff';g.lineWidth=3;g.stroke()}
  g.save();g.translate(X(player.x),X(player.z));g.rotate(Math.PI-player.h);g.fillStyle='#fff';g.strokeStyle='#000';g.lineWidth=2;g.beginPath();g.moveTo(0,-12);g.lineTo(8,10);g.lineTo(0,5);g.lineTo(-8,10);g.closePath();g.fill();g.stroke();g.restore()}
P.taxi=()=>({cls:'tall',h:hd('🚕 Taxi','Your driver is '+TH.d+' · fares by distance')+'<div class="cap">Chat with your driver on the way — he knows this country.</div>'+CITY.pois.map(p=>{const fare=Math.round(8+dist2(p.pos,player)*.045);return'<div class="item"><span class="ie">'+p.ic+'</span><b>'+p.n+'<small>'+Math.round(dist2(p.pos,player))+' m</small></b><button data-a="ride" data-v="'+p.id+'">'+fmt(fare)+'</button></div>'}).join('')});
const RIDE={on:false};
P.ride=(a)=>({cls:'',h:hd('🚕 '+TH.d+"'s taxi",'To '+a.p.n)+'<div class="log" id="rlog" style="max-height:130px">'+a.log.map(l=>'<div class="cb '+l[0]+'">'+esc(l[1])+'</div>').join('')+'</div><div class="heart" style="margin:6px 0 10px"><u id="rbar" style="width:'+Math.round(a.prog*100)+'%"></u></div><div class="opts">'+['Tell me about this country','Teach me a local phrase','Best food here?','Any safety tips?'].map((t,i)=>'<button data-a="rq" data-v="'+i+'">'+t+'</button>').join('')+'</div>'});
function rideAsk(i){const d=TH.d,L=LEARN[TH.n]||LEARN.Lagos;let ans;
  if(i==0){ans=pick(TH.fx);S.facts++;qAdd('learn');addXP(8)}else if(i==1){const l=pick(L);ans='Say "'+l[0]+'" — '+l[1]+'.';S.facts++;qAdd('learn');addXP(8)}
  else if(i==2){ans=TH.n==='Lagos'?'Jollof rice, suya and pepper soup. Ask for it spicy!':TH.n==='Tokyo'?'Ramen, sushi and takoyaki. Convenience-store food is great too.':TH.n==='London'?'Fish and chips, a Sunday roast, and curry!':TH.n==='Rio'?'Feijoada and açaí. Try pão de queijo!':TH.n==='Dubai'?'Shawarma, hummus and dates with Arabic coffee.':'A New York slice of pizza, a bagel, and a hot dog from a cart.'}
  else ans='Keep your phone in your pocket in crowds, stay in lit areas at night, and always use licensed taxis like me.';
  const a=cur.args;a.log.push(['u',['Tell me about this country','Teach me a local phrase','Best food here?','Any safety tips?'][i]],['n',d+': '+ans]);const L2=$('#rlog');if(L2){L2.innerHTML=a.log.map(l=>'<div class="cb '+l[0]+'">'+esc(l[1])+'</div>').join('');L2.scrollTop=1e5}}
P.jobs=()=>({h:hd('💼 Jobs','Earn cash and XP')+[['📦','Courier run','Deliver a parcel across the city','courier'],['🚕','Taxi driver','Pick up and drop off a passenger (need a car)','taxijob'],['🏆','Pot race vs 3 rivals','Entry $1,000 · win the pot $3,500 (need a car)','race1k'],['💰','High-stakes race','Entry $10,000 · win $35,000 (need a car)','race10k'],['🏁','Street race','Hit every checkpoint before time runs out (need a car)','race'],['💰','Pot race · $1,000','Pay $1,000 · beat 3 computer racers · win $3,500 (need a car)','race1k'],['💎','Big pot race · $5,000','Pay $5,000 · beat 3 computer racers · win $17,500 (need a car)','race5k'],['👊','Street fight','Fight 3 waves right here on the street (free)','streetfight'],['🥊','Arena fight','Visit the Fight Arena 🥊','arenago']].map(j=>'<div class="item"><span class="ie">'+j[0]+'</span><b>'+j[1]+'<small>'+j[2]+'</small></b><button data-a="'+j[3]+'">GO</button></div>').join('')+(MISSION.cur?'<div class="row" style="margin-top:8px">'+B('abort','','Cancel current job','alt sm')+'</div>':'')});
P.chat=()=>({cls:'tall',h:hd('💬 Global chat',chatMuted()?'Muted until '+new Date(S.mutedUntil).toLocaleDateString():'Be kind. 3 strikes = muted 4 days')+'<div class="log" id="clog" style="max-height:38vh"></div><div class="row" style="flex-wrap:nowrap"><input id="chatin" class="txt" maxlength="90" placeholder="Say something nice…" '+(chatMuted()?'disabled':'')+'>'+B('sendchat','','Send','sm')+'</div><div class="cap">Players here are simulated (demo) — real online chat needs a server. Tap 🚩 to report a message.</div>',after:renderChatLog});
function renderChatLog(){const l=$('#clog');if(!l)return;l.innerHTML=CHAT.map((c,i)=>'<div class="cb '+(c.me?'u':'n')+'"><b style="font-size:12px;opacity:.8">'+esc(c.name)+' '+c.flag+'</b><br>'+esc(c.text)+(c.me?'':' <button data-a="report" data-v="'+i+'" style="background:none;border:0;opacity:.5;font-size:13px">🚩</button>')+'</div>').join('')||'<div class="cap">No messages yet.</div>';l.scrollTop=1e5}
P.dating=(a)=>{const d=S.partner||S.date;if(!a.cands)a.cands=genCandidates();
  return{cls:'tall',h:hd('💘 Dating')+(S.partner?'<div class="fact">❤️ '+(S.partner.married?'Married to ':'Dating ')+'<b>'+S.partner.name+'</b> '+S.partner.flag+'</div><div class="row" style="margin-top:8px">'+B('date','p','Chat with '+S.partner.name)+'</div>':'')+
  '<div class="cap">Meet people nearby — pick someone and start chatting.</div>'+a.cands.map((c,i)=>'<div class="item"><span class="ie">'+(c.female?'👩':'👨')+'</span><b>'+c.name+' '+c.flag+'<small>Loves '+c.hobby+' · from '+c.theme+'</small></b><button data-a="meet" data-v="'+i+'">Chat</button></div>').join('')+'<div class="row" style="margin-top:8px">'+B('recands','','🔄 Find more','alt sm')+'</div>'}};
P.date=(a)=>{const d=a.p==='p'?S.partner:S.date;if(!d){return P.dating({})}const aff=Math.round(d.aff);a.log=a.log||[['n',d.name+': Hi '+S.name+'! 👋']];
  const mar=S.partner&&S.partner.married;
  return{cls:'tall',h:hd((d.female?'👩 ':'👨 ')+d.name+' '+d.flag,'Likes '+d.hobby)+'<div class="row" style="flex-wrap:nowrap"><span style="font-size:20px">❤️</span><div class="heart"><u style="width:'+Math.min(100,aff)+'%"></u></div><b>'+aff+'</b></div><div class="log" id="dlog">'+a.log.map(l=>'<div class="cb '+l[0]+'">'+esc(l[1])+'</div>').join('')+'</div><div class="opts">'+
  '<button data-a="dq" data-v="c">💐 Compliment</button><button data-a="dq" data-v="j">😂 Joke</button><button data-a="dq" data-v="a">🌍 Ask about their country</button><button data-a="dq" data-v="gift">🎁 Gift $50</button><button data-a="dq" data-v="dinner" '+(aff<30?'disabled':'')+'>🍽️ Dinner date $80</button>'+
  (!mar&&aff>=100?'<button class="go" data-a="dq" data-v="propose">💍 Propose $1500</button>':'')+(mar&&!S.preg&&S.kids.length<3?'<button class="go" data-a="dq" data-v="baby">👶 Start a family</button>':'')+'</div>'+(S.preg?'<div class="cap">🤰 Baby on the way — visit the Hospital to welcome your newborn.</div>':'')}};
function dateAsk(kind){const a=cur.args,d=a.p==='p'?S.partner:S.date;a.log=a.log||[];let reply='',gain=0;
  if(kind==='c'){gain=6+Math.random()*5;reply=dateReply('c',d)}else if(kind==='j'){gain=Math.random()<.65?7:-3;reply=gain>0?dateReply('j',d):'Hmm… not my type of joke 😅'}
  else if(kind==='a'){gain=5;const th=THEMES.find(t=>t.n===d.theme)||TH;reply=pick(th.fx);S.facts++;qAdd('learn');addXP(8)}
  else if(kind==='gift'){if(!spend(50))return;gain=12;reply=dateReply('gift',d)}
  else if(kind==='dinner'){if(!spend(80))return;gain=25;S.stats.dates++;reply=dateReply('dinner',d);qAdd('eat');S.needs.fd=Math.min(100,S.needs.fd+35);S.needs.fn=Math.min(100,S.needs.fn+15);addXP(25)}
  else if(kind==='propose'){if(!spend(1500))return;S.partner=Object.assign({},S.date,{married:true});S.date=null;a.p='p';reply='YES!! 💍😭 I love you!';banner('MARRIED 💍',S.partner.name,2600,'#ff7ab6');spawnFamily();sfx.win()}
  else if(kind==='baby'){S.preg=S.day;reply='We are going to have a baby! 👶 Visit the hospital when the time comes.';sfx.win()}
  d.aff=Math.max(0,Math.min(100,d.aff+gain));a.log.push(['u',{c:'💐 You are really lovely.',j:'😂 Why did the car go to school? To improve its drive!',a:'🌍 Tell me about where you are from?',gift:'🎁 Here, I got you something.',dinner:'🍽️ Dinner tonight?',propose:'💍 Will you marry me?',baby:'👶 Should we start a family?'}[kind]],['n',d.name+': '+reply]);
  if(kind==='dinner'){a.log.push(['n','(You enjoyed a lovely dinner together.)'])}
  refresh();const L=$('#dlog');if(L)L.scrollTop=1e5;saveGame()}
P.ranks=(a)=>{const tab=a.tab||'wealth';const r=mulberry(hash(dayKey()+tab));const names=['Neon_Tunde','AdaSpeed','KenjiDrift','TurboChidi','LunaMaya','CosmicOmar','RoyalFemi','BigSam','NiaWolf','ZaneRacer','PriyaX','LeoLagos','EveBoss','MateoGT','SoloKofi','Kai_Run'];
  const my=tab==='wealth'?player.money+S.stats.earned*.2:tab==='level'?S.lv*1000+S.xp:S.stats.races*500+S.stats.fares*80+S.stats.fights*300;
  const rows=names.map(n=>({n,f:pick(FLAGS),s:Math.round(tab==='level'?(2+r()*18)*1000:tab==='wealth'?4000+r()*r()*900000:r()*14000)})).concat([{n:S.name,f:'🇳🇬',s:Math.round(my),you:1}]).sort((x,y)=>y.s-x.s);
  const yi=rows.findIndex(x=>x.you);
  return{cls:'tall',h:hd('🏆 Leaderboard <span class="demo">DEMO</span>','Your rank: #'+(yi+1))+tabs([['wealth','💵 Wealth'],['level','⭐ Level'],['race','🏁 Racing']],tab,'rtab')+rows.slice(0,12).map((x,i)=>'<div class="lb '+(x.you?'you':'')+'"><span class="rk">'+(i+1)+'</span><span class="nm">'+esc(x.n)+' '+x.f+'</span><span class="sc">'+(tab==='wealth'?fmt(x.s):x.s.toLocaleString())+'</span></div>').join('')+(yi>=12?'<div class="lb you"><span class="rk">'+(yi+1)+'</span><span class="nm">'+esc(S.name)+'</span><span class="sc">'+Math.round(my).toLocaleString()+'</span></div>':'')+'<div class="cap">Other players are simulated for now. A real worldwide board needs an online server.</div>'}};
P.quests=()=>{const q=dailyQuests();const done=q.every(x=>(S.q.prog[x.k]||0)>=x.n);
  return{h:hd('📋 Daily quests','Resets every day')+q.map(x=>{const p=S.q.prog[x.k]||0;return'<div class="item"><span class="ie">'+x.e+'</span><b>'+x.t+'<small>'+Math.min(p,x.n)+' / '+x.n+'</small></b><span>'+(p>=x.n?'✅':'')+'</span></div>'}).join('')+'<div class="row c" style="margin-top:10px">'+(S.q.chest?'<div class="cap">Chest opened today 🎉</div>':B('chest','','🎁 Open chest','',!done))+'</div>'}};
/* ---- wardrobe / creator ---- */
const SWTOP=['#e8e8e8','#1f1f24','#b3202a','#ffd23f','#10857a','#5aa7ee','#7a2cff','#e0b23a','#d4153a','#f08fb0','#2f6a3a','#ff8a3d'];
const swatch=(list,key,sel)=>'<div class="sw">'+list.map(c=>'<button style="background:'+c+'" class="'+(c===sel?'on':'')+'" data-a="look" data-v="'+key+':'+c+'"></button>').join('')+'</div>';
const swatchI=(list,key,sel)=>'<div class="sw">'+list.map((c,i)=>'<button style="background:'+c+'" class="'+(i===sel?'on':'')+'" data-a="look" data-v="'+key+':'+i+'"></button>').join('')+'</div>';
const tilesI=(list,key,sel)=>'<div class="grid g4" style="margin:6px 0">'+list.map((n,i)=>'<button class="tile '+(i===sel?'on':'')+'" data-a="look" data-v="'+key+':'+i+'"><b>'+n+'</b></button>').join('')+'</div>';
function previewCam(){const h=player.h,f=[Math.sin(h),Math.cos(h)];cam.preview={x:player.x+f[0]*6.6,y:player.y+1.0,z:player.z+f[1]*6.6,tx:player.x,ty:player.y-.4,tz:player.z}}
P.wardrobe=(a)=>{const shop=!!a.shop,L=S.look;a.tab=a.tab||(shop?'outfits':'body');previewCam();
  const T_=shop?[['outfits','👕 Outfits'],['hair','💇 Hair'],['extras','🕶️ Extras']]:[['body','🧍 Body'],['hair','💇 Hair'],['outfits','👕 Outfits'],['colors','🎨 Colours'],['extras','🕶️ Extras']];
  let body='';
  if(a.tab==='body')body='<div class="grid g2"><button class="tile '+(!L.female?'on':'')+'" data-a="look" data-v="female:0"><span class="em">🧔</span><b>Male</b></button><button class="tile '+(L.female?'on':'')+'" data-a="look" data-v="female:1"><span class="em">👩</span><b>Female</b></button></div><div class="cap">Skin tone</div>'+swatchI(SKINS,'skin',L.skin)+'<div class="cap">Build</div><div class="grid g4">'+[['Slim',.92],['Regular',1],['Athletic',1.08],['Strong',1.15]].map(b=>'<button class="tile '+(Math.abs(L.build-b[1])<.01?'on':'')+'" data-a="look" data-v="build:'+b[1]+'"><b>'+b[0]+'</b></button>').join('')+'</div>';
  else if(a.tab==='hair')body='<div class="cap">Style</div>'+tilesI(HAIRN,'hair',L.hair)+'<div class="cap">Colour</div>'+swatchI(HAIRCOL,'hairCol',L.hairCol);
  else if(a.tab==='outfits')body=OUTFITS.map((o,i)=>{if(o.f&&!L.female)return'';const own=S.outfits.includes(i)||!shop;return'<div class="item"><span class="ie"><i style="display:inline-block;width:22px;height:22px;border-radius:6px;background:'+o.tc+';border:2px solid '+o.bc+'"></i></span><b>'+o.n+'</b><button class="'+(own?'own':'buy')+'" data-a="outfit" data-v="'+i+'">'+(own?'Wear':fmt(o.p))+'</button></div>'}).join('');
  else if(a.tab==='colors')body='<div class="cap">Top style</div>'+tilesI(TOPN,'ts',L.ts)+swatch(SWTOP,'tc',L.tc)+'<div class="cap">Bottom style</div>'+tilesI(BOTN,'bs',L.bs)+swatch(['#2f4a7a','#2a2a30','#1d2740','#e9e1cf','#3a63a8','#6a4a2a','#1f9d8a','#8a2a3a','#d4153a'],'bc',L.bc)+'<div class="cap">Shoes</div>'+tilesI(SHOEN,'shoe',L.shoe);
  else body=[['shades','🕶️','Sunglasses',40],['chain','⛓️','Gold chain',120]].map(x=>{const own=!shop||S.extras[x[0]];return'<div class="item"><span class="ie">'+x[1]+'</span><b>'+x[2]+'</b><button class="'+(own?'own':'buy')+'" data-a="extra" data-v="'+x[0]+'">'+(L[x[0]]?'Remove':own?'Wear':fmt(x[3]))+'</button></div>'}).join('')+'<div class="cap">Hat</div>'+tilesI(HATN,'hat',L.hat)+swatch(SWTOP,'hatc',L.hatc);
  return{cls:'side',nobg:true,h:hd(shop?'👗 Boutique':'🎨 Character')+tabs(T_,a.tab,'wtab')+body+'<div class="row c" style="margin-top:10px">'+B('wdone','',a.creator?'▶ Start playing':'Done')+'</div>'}};
/* ---- POI panels ---- */
const stat=(k,d)=>{S.needs[k]=clamp(S.needs[k]+d,0,100)};
P.home=()=>({h:hd('🏠 Home',S.partner?'with '+S.partner.name:'Your place')+'<div class="grid g2"><button class="tile" data-a="sleep"><span class="em">🛏️</span><b>Sleep</b><em>till 07:00</em></button><button class="tile" data-a="open" data-v="wardrobe"><span class="em">👕</span><b>Wardrobe</b></button><button class="tile" data-a="open" data-v="garage"><span class="em">🚗</span><b>Garage</b></button><button class="tile" data-a="open" data-v="family"><span class="em">👨‍👩‍👧</span><b>Family</b></button></div><div class="cap">Sleep restores energy. Progress saves automatically.</div>'});
P.mall=()=>P.wardrobe({shop:true,tab:'outfits'});
P.garage=()=>({h:hd('🚗 My cars')+(S.owned.map((o,i)=>'<div class="item"><span class="ie">🚘</span><b>'+CARS[o.name].n+'<small><i style="display:inline-block;width:12px;height:12px;border-radius:50%;background:'+o.color+';vertical-align:middle"></i> '+(CARS[o.name].price?'worth '+fmt(CARS[o.name].price):'')+'</small></b><button data-a="bring" data-v="'+i+'">Bring</button></div>').join('')||'<div class="cap">No cars yet — visit the Car Dealer 🚘</div>')});
P.family=()=>({h:hd('👨‍👩‍👧 Family')+(S.partner?'<div class="item"><span class="ie">'+(S.partner.female?'👩':'👨')+'</span><b>'+S.partner.name+' '+S.partner.flag+'<small>'+(S.partner.married?'Spouse':'Partner')+' · ❤️ '+Math.round(S.partner.aff)+'</small></b></div>'+S.kids.map(k=>'<div class="item"><span class="ie">'+(k.female?'👧':'👦')+'</span><b>'+k.name+'<small>Born day '+k.born+'</small></b></div>').join('')+'<div class="row" style="margin-top:8px">'+B('famdinner','','🍽️ Family dinner $'+(60+S.kids.length*30),'',!S.partner.married)+'</div>':'<div class="cap">You are single. Meet someone in the Dating app 💘</div>')});
P.hotel=()=>({h:hd('🏨 Grand Hotel')+[['🛏️','Suite for the night','Sleep till 07:00, full energy',180,'suite'],['💆','Spa session','+35 mood',70,'spa'],['🍳','Room service','+45 food',35,'rs'],['🏊','Rooftop pool','+25 mood, −10 energy',20,'pool']].map(x=>'<div class="item"><span class="ie">'+x[0]+'</span><b>'+x[1]+'<small>'+x[2]+'</small></b><button class="buy" data-a="hotel" data-v="'+x[4]+'">'+fmt(x[3])+'</button></div>').join('')});
const MENU=[{e:'🍛',n:'Jollof & Chicken',p:18,fd:42,fn:6},{e:'🍔',n:'Smash Burger',p:12,fd:34,fn:3},{e:'🍣',n:'Sushi Set',p:34,fd:40,fn:10},{e:'🥩',n:'Steak Dinner',p:62,fd:70,fn:14},{e:'🧃',n:'Fresh Juice',p:5,fd:10,en:8}];
P.rest=()=>({h:hd('🍽️ Restaurant')+MENU.map((m,i)=>'<div class="item"><span class="ie">'+m.e+'</span><b>'+m.n+'<small>+'+m.fd+' food</small></b><button class="buy" data-a="eat" data-v="'+i+'">'+fmt(m.p)+'</button></div>').join('')+((S.partner||S.date)?'<div class="row" style="margin-top:8px">'+B('open','dating','💘 Dinner date…','alt sm')+'</div>':'')});
P.hosp=()=>({h:hd('🏥 City Hospital')+'<div class="item"><span class="ie">🩹</span><b>Treatment<small>Heal to full health</small></b><button class="buy" data-a="heal">'+fmt(40)+'</button></div><div class="item"><span class="ie">💉</span><b>Check-up<small>Health, food and energy topped up</small></b><button class="buy" data-a="checkup">'+fmt(120)+'</button></div>'+(S.preg&&S.day>S.preg?'<div class="item"><span class="ie">👶</span><b>Maternity ward<small>Welcome your newborn!</small></b><button class="buy" data-a="baby">'+fmt(300)+'</button></div>':S.preg?'<div class="cap">🤰 Your baby is due soon — sleep a night and come back.</div>':'')});
P.deal=(a)=>{const col=a.col||PAINT[0];return{cls:'tall',h:hd('🚘 Car Dealer')+'<div class="cap">Paint</div><div class="sw">'+PAINT.map(c=>'<button style="background:'+c+'" class="'+(c===col?'on':'')+'" data-a="paint" data-v="'+c+'"></button>').join('')+'</div>'+GOODCARS.map(n=>{const c=CARS[n];return'<div class="item"><span class="ie">🚘</span><b>'+c.n+'<small>Top speed '+Math.round(c.vmax*3.6)+' km/h · Grip '+c.grip+'</small></b><button class="buy" data-a="buycar" data-v="'+n+'">'+fmt(c.price)+'</button></div>'}).join('')}};
P.police=()=>({h:hd('🚓 Police Station')+'<div class="item"><span class="ie">🔫</span><b>Police Auction — Pistol<small>Use at your own risk 😉</small></b><button class="buy" data-a="buygun" '+(S.hasGun?'disabled':'')+'>'+(S.hasGun?'Owned':fmt(900))+'</button></div><div class="item"><span class="ie">📜</span><b>Pay fine<small>Clears your wanted level</small></b><button class="buy" data-a="fine">'+fmt(200)+'</button></div>'});
P.club=()=>({h:hd('🪩 Night Club')+'<div class="grid g2"><button class="tile" data-a="dance"><span class="em">💃</span><b>Dance</b><em>+mood</em></button><button class="tile" data-a="drink"><span class="em">🍹</span><b>Drink</b><em>$30</em></button><button class="tile" data-a="open" data-v="dating"><span class="em">💘</span><b>Meet people</b></button><button class="tile" data-a="station"><span class="em">📻</span><b>Change music</b><em>'+STATIONS[audio.station].n+'</em></button></div>'});
P.arena=()=>({h:hd('🥊 Fight Arena')+'<div class="cap">3 waves of fighters. Win to earn $400. Entry $50. Use HIT to punch!</div><div class="row c">'+B('arenago','','Enter the ring · $50')+'</div>'});
P.park=()=>({h:hd('🌳 Central Park')+'<div class="grid g2"><button class="tile" data-a="jog"><span class="em">🏃</span><b>Jog</b><em>+mood −food</em></button><button class="tile" data-a="chill"><span class="em">🧘</span><b>Relax</b><em>+energy</em></button><button class="tile" data-a="open" data-v="dating"><span class="em">💘</span><b>Meet someone</b></button><button class="tile" data-a="open" data-v="chat"><span class="em">💬</span><b>Chat</b></button></div>'});
P.beach=()=>({h:hd('🏖️ Beach Club')+'<div class="grid g2"><button class="tile" data-a="swim"><span class="em">🏊</span><b>Swim</b><em>+mood</em></button><button class="tile" data-a="sun"><span class="em">🌞</span><b>Sunbathe</b><em>+energy</em></button><button class="tile" data-a="icecream"><span class="em">🍦</span><b>Ice cream</b><em>$5</em></button><button class="tile" data-a="open" data-v="dating"><span class="em">💘</span><b>Meet someone</b></button></div>'});
P.land=()=>({h:hd(TH.f+' '+TH.n+' landmark')+'<div class="fact">'+pick(TH.fx)+'</div><div class="row c" style="margin-top:10px">'+B('selfie','','📸 Take a selfie')+'</div>'});
P.air=()=>({cls:'tall',h:hd('✈️ Airport','Fly anywhere · each city is its own world')+THEMES.map((t,i)=>'<div class="item"><span class="ie">'+t.f+'</span><b>'+t.n+'<small>'+(S.visited.includes(i)?'Visited ✔':'New stamp')+(i===S.theme?' · you are here':'')+'</small></b><button class="buy" data-a="fly" data-v="'+i+'" '+(i===S.theme?'disabled':'')+'>'+(t.cost?fmt(t.cost):'Free')+'</button></div>').join('')});
P.menu=()=>({cls:'tall',h:hd('⏸ Pause · Profile')+(window.__hl?'<div class="fact" style="text-align:center">🟢 <b>'+window.__hl.online+'</b> online now &nbsp;·&nbsp; 👥 <b>'+window.__hl.total+'</b> players joined</div>':'')+'<div class="cap"><b>'+esc(S.name)+'</b> · Level '+S.lv+' · '+fmt(player.money)+'</div>'+'<div class="cap">Graphics (use Low if the game is slow)</div><div class="grid">'+['Low','Medium','High'].map((n,i)=>'<button class="tile '+(QUALITY===i?'on':'')+'" data-a="qual" data-v="'+i+'"><b>'+n+'</b></button>').join('')+'</div><div class="grid g2" style="margin-top:8px"><button class="tile" data-a="snd"><b>Sound '+(S.sound?'ON':'OFF')+'</b></button><button class="tile" data-a="mus"><b>Music '+(S.music?'ON':'OFF')+'</b></button></div><div class="cap">HUD size (map, buttons, speed)</div><div class="grid">'+[['Small',.75],['Normal',1],['Big',1.25]].map(h=>'<button class="tile '+((S.hudS||1)===h[1]?'on':'')+'" data-a="hud" data-v="'+h[1]+'"><b>'+h[0]+'</b></button>').join('')+'</div><div class="cap">Your name</div><div class="row" style="flex-wrap:nowrap"><input id="namein" class="txt" maxlength="14" value="'+esc(S.name)+'">'+B('setname','','Save','sm')+'</div><div class="cap" style="margin-top:12px"><b>Controls</b> — Move: left stick / WASD · Look: drag / arrows · ACT: E · Jump: Space · Run: Shift · Hit: F · Weapon: Q · Car: W/S throttle &amp; brake, A/D steer, Space handbrake, Shift nitro, R radio, V camera, H horn. Phone: P · Map: M · Chat: T</div><div class="row" style="margin-top:8px">'+B('open','wardrobe','👕 Change look','alt sm')+B('reset','','Reset progress','alt sm')+'</div>'});
P.talk=(a)=>({h:hd((a.p.female?'👩 ':'👨 ')+a.p.name+' '+a.p.flag)+'<div class="cb n" style="margin:6px 0">'+esc(a.line)+'</div><div class="opts"><button data-a="tk" data-v="hi">👋 Say hi</button><button data-a="tk" data-v="city">🏙️ Ask about the city</button><button data-a="tk" data-v="date">💘 Chat them up</button></div>'});
/* ================= ACTIONS ================= */
const ACT={};
ACT.close=()=>closeSheet();
ACT.open=v=>show(v,{});
ACT.start=()=>{audioInit();goLandscape();startGame()};
ACT.look=(v)=>{const i=v.indexOf(':'),k=v.slice(0,i),x=v.slice(i+1);const num=['female','skin','hair','hairCol','ts','bs','shoe','hat','build'].includes(k);S.look[k]=num?(k==='female'?!!+x:+x):x;rebuildPlayer();refresh()};
function rebuildPlayer(){const wasV=player.H.root.visible;buildPlayerHuman();player.H.root.visible=wasV}
ACT.wtab=(v)=>{cur.args.tab=v;refresh()};
ACT.outfit=(v)=>{const i=+v,o=OUTFITS[i],shop=cur.args.shop;if(shop&&!S.outfits.includes(i)){if(!spend(o.p))return;S.outfits.push(i)}Object.assign(S.look,{ts:o.ts,tc:o.tc,bs:o.bs,bc:o.bc});rebuildPlayer();refresh();saveGame()};
ACT.extra=(v)=>{const shop=cur.args.shop,pr={shades:40,chain:120}[v];if(S.look[v]){S.look[v]=false}else{if(shop&&!S.extras[v]){if(!spend(pr))return;S.extras[v]=1}S.look[v]=true}rebuildPlayer();refresh();saveGame()};
ACT.wdone=()=>{const c=cur.args.creator;S.created=true;saveGame();closeSheet();if(c)beginPlay()};
ACT.gps=(v)=>{const p=poiById(v);GPS.hold=false;GPS.onArrive=null;GPS.arrive=14;setGPS(p.pos.x,p.pos.z,p.n);toast('📍 GPS → '+p.n);closeSheet()};
ACT.cleargps=()=>{clearGPS();refresh()};
ACT.mapclick=(v,el,e)=>{const r=el.getBoundingClientRect(),fx=ROT?(e.clientY-r.top)/r.height:(e.clientX-r.left)/r.width,fz=ROT?1-(e.clientX-r.left)/r.width:(e.clientY-r.top)/r.height;const x=fx*2*MM.R0-MM.R0,z=fz*2*MM.R0-MM.R0;GPS.hold=false;GPS.onArrive=null;GPS.arrive=14;setGPS(x,z,'Pin');toast('📍 GPS set');closeSheet()};
ACT.ride=(v)=>{const p=poiById(v),fare=Math.round(8+dist2(p.pos,player)*.045);if(!spend(fare))return;RIDE.on=true;RIDE.p=p;RIDE.t=0;RIDE.dur=9;
  show('ride',{p,prog:0,log:[['n',TH.d+': Welcome aboard, '+S.name+'! Sit back — ask me anything about '+TH.n+'.']]});
  clearInterval(RIDE.iv);RIDE.iv=setInterval(()=>{RIDE.t+=.2;const b=$('#rbar');if(b)b.style.width=Math.min(100,RIDE.t/RIDE.dur*100)+'%';if(cur&&cur.args&&cur.args.prog!==undefined)cur.args.prog=RIDE.t/RIDE.dur;if(RIDE.t>=RIDE.dur){clearInterval(RIDE.iv);finishRide()}},200)};
async function finishRide(){const p=RIDE.p;RIDE.on=false;closeSheet();sfx.door();await teleportPOI(p);toast('🚕 Arrived at '+p.n+' — '+TH.d+' says bye!')}
ACT.rq=(v)=>rideAsk(+v);
ACT.courier=()=>{closeSheet();startCourier()};ACT.taxijob=()=>{closeSheet();startTaxiJob()};ACT.race=()=>{closeSheet();startRace()};ACT.race1k=()=>{closeSheet();startRace(1000)};ACT.race5k=()=>{closeSheet();startRace(5000)};ACT.race10k=()=>{closeSheet();startRace(10000)};
ACT.streetfight=()=>{closeSheet();startArena(true)};
ACT.arenago=()=>{const P_=poiById('arena');if(dist2(P_.pos,player)>40){GPS.hold=false;GPS.onArrive=null;setGPS(P_.pos.x,P_.pos.z,P_.n);toast('Head to the Fight Arena 🥊 — GPS set');closeSheet();return}closeSheet();startArena()};
ACT.abort=()=>{endMission(false,'Job cancelled');closeSheet()};
ACT.sendchat=()=>{const i=$('#chatin');if(!i)return;const t=i.value;i.value='';sendChat(t);renderChatLog();if(chatMuted()){refresh()}};
ACT.report=(v)=>{toast('🚩 Report sent. Thank you!')};
ACT.rtab=(v)=>{cur.args.tab=v;refresh()};
ACT.recands=()=>{cur.args.cands=null;refresh()};
ACT.meet=(v)=>{const c=cur.args.cands[+v];S.date=c;show('date',{p:'d'})};
ACT.date=(v)=>show('date',{p:v==='p'?'p':'d'});
ACT.dq=(v)=>dateAsk(v);
ACT.chest=()=>{const r=300+S.lv*40;addMoney(r);addXP(100);S.q.chest=true;banner('CHEST',fmt(r)+' + 100 XP',2000,'#ffb020');refresh();saveGame()};
ACT.sleep=async()=>{closeSheet();fadeTo(1,500);await sleep(600);skipToMorning();stat('en',100-S.needs.en);stat('fn',10);tryBaby();fadeTo(0,700);toast('😴 You slept well. Good morning!');saveGame()};
function skipToMorning(){if(S.t>=7)S.day++;S.t=7.1}
function tryBaby(){}
ACT.bring=(v)=>{bringCar(+v);closeSheet()};
ACT.famdinner=()=>{const c=60+S.kids.length*30;if(!spend(c))return;stat('fd',60);stat('fn',30);S.partner.aff=Math.min(100,S.partner.aff+10);addXP(40);qAdd('eat');toast('👨‍👩‍👧 Lovely family dinner! Mood boosted');saveGame();refresh()};
ACT.hotel=async(v)=>{const c={suite:180,spa:70,rs:35,pool:20}[v];if(!spend(c))return;
  if(v==='suite'){closeSheet();fadeTo(1,500);await sleep(600);skipToMorning();stat('en',100);stat('fn',20);stat('fd',-10);fadeTo(0,700);toast('🛏️ Rested & ready!');saveGame()}
  else if(v==='spa'){stat('fn',35);stat('en',10);toast('💆 So relaxing')}else if(v==='rs'){stat('fd',45);toast('🍳 Delicious')}else{stat('fn',25);stat('en',-10);toast('🏊 Splash!')}};
ACT.eat=(v)=>{const m=MENU[+v];if(!spend(m.p))return;stat('fd',m.fd);stat('fn',m.fn||0);stat('en',m.en||0);qAdd('eat');addXP(6);toast(m.e+' Yum! +'+m.fd+' food')};
ACT.heal=()=>{if(!spend(40))return;player.hp=100;toast('🩹 Fully healed')};
ACT.checkup=()=>{if(!spend(120))return;player.hp=100;stat('fd',40);stat('en',40);toast('💉 Check-up complete')};
ACT.baby=()=>{if(!spend(300))return;S.preg=0;const female=Math.random()<.5;const k={name:pick(female?FN:MN),female,born:S.day};S.kids.push(k);spawnFamily();banner('IT\'S A '+(female?'GIRL':'BOY')+'! 👶',k.name,3000,'#ff7ab6');sfx.win();addXP(150);saveGame();closeSheet()};
ACT.paint=(v)=>{cur.args.col=v;refresh()};
ACT.buycar=(v)=>{const c=CARS[v],col=cur.args.col||PAINT[0];if(!spend(c.price))return;S.owned.push({name:v,color:col});const idx=S.owned.length-1;const sl=CITY.dealerSlots[0]||{x:player.x+6,z:player.z,ry:0};const V=spawnVehicle(v,col,sl.x,sl.z,sl.ry,'free');V.owned=true;V.ownIdx=idx;V.hb=1;upgradeToFull(V);banner('NEW CAR',c.n,2200,'#5ab8ff');addXP(60);saveGame();closeSheet()};
ACT.buygun=()=>{if(!spend(900))return;S.hasGun=true;toast('🔫 Pistol bought — press the weapon button');saveGame();refresh()};
ACT.fine=()=>{if(wanted<=0){toast('You have no wanted level');return}if(!spend(200))return;setWanted(0);cops.forEach(c=>{c.despawn=true});toast('Fine paid. Stay out of trouble!')};
ACT.dance=()=>{closeSheet();player.dancing=true;stat('fn',30);stat('en',-8);qAdd('dance');addXP(15);toast('💃 You are the star of the floor!')};
ACT.drink=()=>{if(!spend(30))return;stat('fn',15);stat('en',-5);toast('🍹 Cheers!')};
ACT.station=()=>{audio.station=(audio.station+1)%STATIONS.length;audio.setRadio(true);S.radio=true;refresh()};
ACT.jog=async()=>{closeSheet();fadeTo(1,400);await sleep(500);stat('fn',20);stat('fd',-8);stat('en',-8);S.t+=.5;fadeTo(0,500);toast('🏃 Nice run!')};
ACT.chill=async()=>{closeSheet();fadeTo(1,400);await sleep(500);stat('en',30);stat('fn',10);S.t+=.8;fadeTo(0,500);toast('🧘 So peaceful')};
ACT.swim=async()=>{closeSheet();fadeTo(1,400);await sleep(500);stat('fn',25);stat('en',-10);S.t+=.4;fadeTo(0,500);toast('🏊 Refreshing!')};
ACT.sun=async()=>{closeSheet();fadeTo(1,400);await sleep(500);stat('en',25);stat('fn',10);S.t+=1;fadeTo(0,500);toast('🌞 Warm and relaxed')};
ACT.icecream=()=>{if(!spend(5))return;stat('fn',8);stat('fd',6);toast('🍦')};
ACT.selfie=()=>{closeSheet();flashScreen('#fff',.9);sfx.coin();addXP(30);toast('📸 Great selfie! +30 XP')};
ACT.fly=(v)=>flyTo(+v);
ACT.hud=(v)=>{S.hudS=+v;applyHud();saveGame();refresh()};
ACT.qual=(v)=>{setQuality(+v);refresh()};
ACT.snd=()=>{S.sound=!S.sound;audio.setOn(S.sound);saveGame();refresh()};
ACT.mus=()=>{S.music=!S.music;audio.music=S.music;saveGame();refresh()};
ACT.setname=()=>{const v=$('#namein').value.trim().slice(0,14);if(!v)return;if(chatCheck(v)){toast('Pick a friendly name 🙏');return}S.name=v;saveGame();toast('Name saved')};
ACT.reset=(v,el)=>{if(el.dataset.sure){try{localStorage.removeItem(SAVEKEY)}catch(e){}location.reload();return}el.dataset.sure=1;el.textContent='Tap again to confirm'};
ACT.tk=(v)=>{const a=cur.args,p=a.p;if(v==='hi'){a.line=pick(['Hey! Nice day, right?','Hi there 👋','Yo! What\'s up?']);addXP(2)}else if(v==='city'){a.line=pick(['The hospital is east of downtown, the airport is in the far corner.','Try the restaurant — the jollof is great.','Take a taxi if you are lost. The driver knows everything!','Careful with the police, they are everywhere.'])}
  else{const c={name:p.name,female:p.female,flag:p.flag,look:p.look,aff:8,theme:pick(THEMES).n,hobby:pick(['football','cooking','travel','music','fashion','racing cars','swimming'])};S.date=c;show('date',{p:'d'});return}refresh()};
/* ---- shortcuts ---- */
function openPOI(id){S.stats.visits++;qAdd('visit');const map={home:'home',mall:'mall',hotel:'hotel',rest:'rest',hosp:'hosp',deal:'deal',police:'police',club:'club',arena:'arena',park:'park',beach:'beach',land:'land',air:'air'};show(map[id],id==='mall'?{shop:true,tab:'outfits'}:{});if(id==='mall')previewCam()}
/* ---- flights ---- */
async function flyTo(ti){if(MISSION.cur)endMission(false,'You left town');const t=THEMES[ti];if(!spend(t.cost))return;closeSheet();mode='flight';
  const fl=$('#flight');$('#fl_t').textContent='Flying to '+t.n+' '+t.f;$('#fl_f').textContent='✈️ '+pick(t.fx);fl.style.display='flex';
  if(!fl.querySelector('.cl')){for(let i=0;i<6;i++){const c=document.createElement('div');c.className='cl';c.style.cssText='top:'+(8+i*13)+'%;width:'+(90+i*30)+'px;height:'+(24+i*6)+'px;animation-duration:'+(9+i*3)+'s;animation-delay:-'+i*2+'s';fl.appendChild(c)}}
  audio.setEngine(false);sfx.win();await sleep(900);
  clearWorld();S.theme=ti;genCity(ti);buildMarkers();buildMinimapBase();setupWorld();
  const A=CITY.airPos;placeAt(A.x,A.z+8,Math.PI);cam.yaw=Math.PI;
  await sleep(3600);$('#fl_f').textContent='✈️ '+pick(t.fx);await sleep(2600);
  fl.style.display='none';mode='play';
  if(!S.visited.includes(ti)){S.visited.push(ti);banner('PASSPORT STAMP',t.n+' '+t.f,2600,'#9ad0ff');addXP(120);S.facts++;qAdd('learn')}else toast('Welcome to '+t.n+' '+t.f);
  saveGame()}

function goLandscape(){try{const e=document.documentElement;const p=e.requestFullscreen?e.requestFullscreen():(e.webkitRequestFullscreen&&e.webkitRequestFullscreen());const lock=()=>{try{screen.orientation&&screen.orientation.lock&&screen.orientation.lock('landscape').catch(()=>{})}catch(_){}};if(p&&p.then)p.then(lock,lock);else lock()}catch(_){}}

P.mdone=a=>({h:hd('✅ Mission complete',a.msg||'')+'<div class="cap" style="text-align:center;padding:8px;font-size:18px">+'+fmt(a.reward||0)+' &nbsp;·&nbsp; +'+(a.xp||40)+' XP</div><div class="row c">'+B('open','jobs','💼 Next job')+B('close','','Keep going')+'</div>'});

/* ================= WORLD SETUP / MAIN ================= */
function clearWorld(){if(player.car)exitVehicle(true);vehicles.slice().forEach(removeVehicle);cops.length=0;peds.slice().forEach(removePed);famPeds=[];parkedMap.clear();parkedTaken.clear();juncMap.clear();clearGPS();MISSION.cur&&endMission(false,'');setWanted(0)}
function setupWorld(){const home=poiById('home'),sl=CITY.dealerSlots||[];
  sl.forEach((s,k)=>{const V=spawnVehicle(['sports','hyper','suv','sedan'][k%4],PAINT[(k*3+2)%PAINT.length],s.x,s.z,s.ry,'free');V.owned=true;V.hb=1;V.showroom=true;upgradeToFull(V)});
  (CITY.policeSlots||[]).forEach((s,k)=>{const V=spawnVehicle('police','#ffffff',s.x,s.z,Math.PI,'free');V.owned=true;V.hb=1;upgradeToFull(V)});
  const rp=nearRoadPoint(home.pos.x,home.pos.z);const o=S.owned[0];const V=spawnVehicle(o.name,o.color,rp.x,rp.z,rp.h,'free');V.owned=true;V.ownIdx=0;V.hb=1;upgradeToFull(V);
  spawnFamily()}
let PRMAX=1;function applyHud(){try{el.app.style.setProperty('--hs',S.hudS||1)}catch(e){}}
function setQuality(q,soft){QUALITY=q;S.qual=q;PR=q===0?Math.min(devicePixelRatio||1,1)*.8:q===1?Math.min(devicePixelRatio||1,MOBILE?.85:1.5):Math.min(devicePixelRatio||1,2);PRMAX=PR;resize();
  const sh=q>0;if(!soft&&renderer.shadowMap.enabled!==sh){renderer.shadowMap.enabled=sh;sunLight.castShadow=sh;scene.traverse(o=>{const m=o.material;if(m)(Array.isArray(m)?m:[m]).forEach(x=>x.needsUpdate=true)})}saveGame()}
/* ---- HUD ---- */
const el={};function hudInit(){['cash','lv','xpb','clock','stars','mission','gps','prompt','kmh','carhp','nosb','radio','dname','b_hp','b_fd','b_en','b_fn','speedo','cross'].forEach(k=>el[k]=$('#'+k));el.app=$('#app')}
let hudT=0,nearby=null;
function updateNearby(){nearby=null;if(mode!=='play'||UILOCK)return;
  let bp=null,bd=player.st==='foot'?10:9;CITY.pois.forEach(p=>{const d=dist2(p.pos,player);if(d<bd){bd=d;bp=p}});
  if(bp&&(player.st==='foot'||Math.abs(player.speed||0)<12)){nearby={t:'poi',p:bp,txt:bp.ic+' '+bp.n};return}
  if(player.st==='foot'){const V=pickVehicleTarget();if(V&&V.mode!=='cop'||V&&V.mode==='cop'){if(V&&V.hp>0){nearby={t:'veh',V,txt:'🚗 '+(CARS[V.name]?CARS[V.name].n:'Car')+(V.owned?' (yours)':'')};return}}
    const pd=nearestPed(player.x,player.z,2.4,p=>p.kind!=='cop'&&p.state!=='down'&&!p.fighter);if(pd){nearby={t:'ped',p:pd,txt:'💬 Talk to '+pd.name};return}}
  else if(player.car&&(Math.abs(player.car.speed)<10||player.car.hp<=0)&&!player.passenger){nearby={t:'exit',txt:'🚪 Get out'}}}
function doAct(){if(!nearby)return;sfx.ui();
  if(nearby.t==='poi')openPOI(nearby.p.id);else if(nearby.t==='veh'){if(nearby.V.showroom){nearby.V.showroom=false;toast('Shiny! Buy one at the dealer or just take it for a spin 😎')}enterVehicle(nearby.V,false)}
  else if(nearby.t==='ped'){const p=nearby.p;show('talk',{p,line:pick(['Hey there!','Oh hi! Need something?','Hello 👋 lovely day, right?','Yo, nice ride!'])});p.state='idle';p.t=6}
  else if(nearby.t==='exit')exitVehicle()}
function updateHUD(dt){hudT-=dt;if(hudT>0)return;hudT=.1;
  if(mode==='play'&&fadeInfo.a>0&&Date.now()-fadeInfo.t>6000&&!(window.RIDE&&RIDE.on)){fadeTo(0,300);$('#flash').style.opacity=0}
  el.cash.textContent=fmt(player.money);el.lv.textContent='LV '+S.lv;el.xpb.style.width=Math.round(S.xp/xpNeed(S.lv)*100)+'%';el.clock.textContent=hh(S.t)+' · '+TH.n;
  el.stars.textContent=wanted>0?'★'.repeat(wanted)+'☆'.repeat(Math.max(0,3-wanted)):'';el.stars.classList.toggle('on',wanted>0);
  const m=MISSION.cur;el.mission.style.display=m?'block':'none';if(m){const left=m.limit?Math.max(0,Math.ceil(m.limit-m.t)):0;el.mission.innerHTML=m.title+(m.limit?' · '+left+'s':'')+'<small>'+m.sub+'</small>'}
  if(GPS.dest&&GPS.info){el.gps.style.display='block';el.gps.textContent='📍 '+GPS.info.hint.split(' · ')[0]+' · '+Math.round(GPS.info.dist/10)*10+' m'}else el.gps.style.display='none';
  el.dname.textContent=districtAt(player.x,player.z);
  el.b_hp.style.width=clamp(player.hp,0,100)+'%';el.b_fd.style.width=S.needs.fd+'%';el.b_en.style.width=S.needs.en+'%';el.b_fn.style.width=S.needs.fn+'%';
  const dr=player.st!=='foot'&&player.car;el.app.dataset.m=dr?'drive':'foot';el.app.dataset.fly=dr&&player.car.spec.fly?'1':'0';el.speedo.style.display=dr?'block':'none';
  if(dr){const V=player.car;el.kmh.textContent=Math.round(Math.abs(V.speed)*3.6);el.carhp.firstChild.style.width=clamp(V.hp/V.spec.hp*100,0,100)+'%';el.nosb.firstChild.style.width=player.nos*100+'%';el.radio.textContent=S.radio&&audio.musG&&audio.musG.gain.value>.02?'📻 '+STATIONS[audio.station].n:''}
  {const armed=!!player.weapon,bf=document.getElementById('b_fire');if(bf&&bf.dataset.a!==(armed?'1':'0')){bf.dataset.a=armed?'1':'0';bf.innerHTML=armed?'<span>🔫</span>FIRE':'<span>👊</span>PUNCH'}}
  {const cb=document.getElementById('t_car');let st=null;
   if(mode==='play'&&!UILOCK){if(player.st==='foot'){const V=pickVehicleTarget();if(V&&V.hp>0)st='in'}else if(player.car&&!player.car.flying&&player.car.y<groundH(player.car.x,player.car.z)+1.5)st='out'}
   if(st!==cb.dataset.s){cb.dataset.s=st||'';cb.hidden=!st;if(st){document.getElementById('t_car_i').textContent=st==='in'?'🚗':'🚪';document.getElementById('t_car_t').textContent=st==='in'?'ENTER CAR':'GET OUT'}}}
  el.cross.style.display=(player.weapon&&player.st==='foot'&&(held.aim||keys['x']))?'block':'none';
  if(nearby){el.prompt.style.display='block';el.prompt.innerHTML='<kbd>'+(MOBILE?'ACT':'E')+'</kbd>'+nearby.txt}else el.prompt.style.display='none'}
/* ---- chunk culling ---- */
let chkT=0;
function updateChunks(dt,force){chkT-=dt;if(chkT>0&&!force)return;chkT=.2;const G=CITY.group;
  if(!CITY.byChunk||CITY._n!==G.children.length){CITY.byChunk=[];for(let i=0;i<100;i++)CITY.byChunk.push([]);CITY._n=G.children.length;G.children.forEach(o=>{if(o.userData&&o.userData.chunk!==undefined)CITY.byChunk[o.userData.chunk].push(o)})}
  const R=[330,470,640][QUALITY],px=player.x,pz=player.z;
  for(let ci=0;ci<100;ci++){const i=Math.floor(ci/10),j=ci%10,cx=-HALF+i*CHK+CHK/2,cz=-HALF+j*CHK+CHK/2;const dx=Math.max(Math.abs(px-cx)-CHK/2,0),dz=Math.max(Math.abs(pz-cz)-CHK/2,0);const vis=Math.hypot(dx,dz)<R;const a=CITY.byChunk[ci];for(let k=0;k<a.length;k++)a[k].visible=vis}}
/* ---- lights ---- */
let lightT=0;const LC_G=new T3.Color('#38e06a'),LC_Y=new T3.Color('#ffc928'),LC_R=new T3.Color('#ff3030'),_lc=new T3.Color();
function updateLights(dt){lightT-=dt;if(lightT>0||!CITY.lightMesh)return;lightT=.25;const t=performance.now()/1000,li=CITY.lightMesh;
  for(const s of CITY.sig){const ph=lightPhase(s.i,s.j,t)[s.ax==='x'?0:1];li.setColorAt(s.q,ph===0?LC_G:ph===1?LC_Y:LC_R)}li.instanceColor.needsUpdate=true}
/* ---- game flow ---- */
function startGame(){closeSheet();if(!S.created){show('wardrobe',{creator:true,tab:'body'})}else beginPlay()}
function beginPlay(){try{screen.orientation&&screen.orientation.lock&&screen.orientation.lock('landscape').catch(()=>{})}catch(e){}closeSheet();el.app.dataset.ui=1;mode='play';cam.yaw=player.h;cam.preview=null;audio.setOn(S.sound);audio.music=S.music;try{audioInit();audio.setRadio(S.music!==false&&S.radio!==false)}catch(e){}
  toast('Walk to the glowing markers · open your 📱 phone');setTimeout(()=>toast('Get in a car: tap the yellow ENTER CAR button'),3500);setTimeout(()=>{if(!S.stats.earned)toast('💰 Need cash? Tap the 💼 briefcase for jobs')},9000);saveGame()}
/* ---- loop ---- */
let lastT=0,SIM=0,perf={n:0,acc:0,start:0,tries:0},mmT=0,ambT=0,famT=0;
function frame(now){requestAnimationFrame(frame);let dt=Math.min(.05,(now-lastT)/1000||.016);lastT=now;SIM+=dt;const T=performance.now()/1000;
  try{
  if(mode==='play'||mode==='dead'||mode==='menu'||mode==='flight'){
    if(mode==='play'){
      if(player.st==='foot'){updateFoot(dt)}else{driveControls(dt);if(player.H&&player.car)animHuman(player.H,dt,0,'sit',{driving:true})}
      if(!UILOCK){if(consume('act')||consume('e')||consume('enter'))doAct();
        if(consume('p'))show('phone',{});else if(consume('m'))show('map',{});else if(consume('t'))show('chat',{})}
      else if(consume('escape'))closeSheet();
      if(!UILOCK&&consume('escape'))show('menu',{});
      updateNeeds(dt);updateMission(dt);
      // distance stat
      if(player.st!=='foot'&&player.car){S.stats.km+=Math.abs(player.car.speed)*dt/1000;if(S.stats.km-(S._km||0)>=.25){qAdd('km',S.stats.km-(S._km||0));S._km=S.stats.km}}
    }else{edge.act=edge.e=edge.p=edge.m=edge.t=false;if(mode==='dead'&&player.car){player.car.thr=0;player.car.brk=1}if(mode==='dead'&&player.st==='foot')player.H&&animHuman(player.H,dt,0,'down',{})}
    if(mode==='menu'){const a=player.h+SIM*.12+.6,r=8.5;const px=player.x,pz=player.z;cam.preview={x:px+Math.sin(a)*r,y:player.y+2.4,z:pz+Math.cos(a)*r,tx:px,ty:player.y-.1,tz:pz};}
    if((mode==='menu'||mode==='flight')&&player.H){const R=player.H.root;R.position.set(player.x,player.y,player.z);R.rotation.y=player.h;animHuman(player.H,dt,0,'idle',{})}
    updateVehicles(dt,T);updatePeds(dt,T);updateTracers(dt);
    cam.shake=Math.max(cam.shake,shake);shake=Math.max(0,shake-dt*2);
    updateCamera(dt);
    updateWeather(dt);S.t+=dt/30;if(S.t>=24){S.t-=24;S.day++}
    updateChunks(dt);updateNearby();updateMarkers(T);updateGPS(dt);updateHUD(dt);updateLights(dt);updateRain(dt,T);
    ambT-=dt;if(ambT<=0){ambT=.3;applyTime(S.t);dayInfo.lamp=ENV.dark;audio.setAmbience(ENV.dark,ENV.rain);
      WATER_U.uT.value=T;WATER_U.uSun.value.copy(ENV.sunDir);WATER_U.uSunCol.value.copy(skyUniforms.uSunCol.value);WATER_U.uHor.value.copy(skyUniforms.uHor.value);WATER_U.uTop.value.copy(skyUniforms.uTop.value);WATER_U.uNight.value=ENV.dark}
    skyUniforms.uTime.value=T;followSun(player.x,player.z);sky.position.copy(camera.position);
    mmT-=dt;if(mmT<=0){mmT=.05;drawMinimap(T)}
    famT-=dt;if(famT<=0){famT=30;saveGame()}
  }
  // auto quality
  if(mode==='play'){perf.n++;perf.acc+=dt;if(!perf.start)perf.start=now;if(now-perf.start>1800&&perf.n>18){const fps=perf.n/perf.acc;if(fps<50){if(PR>.5){PR=Math.max(.5,PR*.85);resize()}else if(QUALITY>0){setQuality(QUALITY-1,true)}}else if(fps>57&&PR<PRMAX){PR=Math.min(PRMAX,PR*1.07);resize()}perf.n=0;perf.acc=0;perf.start=now}}
  }catch(e){if(!window.__errN)window.__errN=0;if(window.__errN++<5)console.error('frame',e&&e.stack||e)}
  try{renderer.render(scene,camera)}catch(e){if((window.__rN=(window.__rN||0)+1)<4)console.error('render',e)}}
/* ---- boot ---- */
async function boot(){const L=$('#loadmsg'),F=$('#barfill');const step=async(m,p)=>{L.textContent=m;F.style.width=p+'%';await sleep(30)};
  hudInit();loadGame();if(S.qual!==null&&S.qual!==undefined)QUALITY=S.qual;
  PR=QUALITY===0?Math.min(devicePixelRatio||1,1)*.8:QUALITY===1?Math.min(devicePixelRatio||1,MOBILE?.85:1.5):PR;
  PRMAX=PR;applyHud();
  if(QUALITY===0||(MOBILE&&QUALITY===1)){renderer.shadowMap.enabled=false;sunLight.castShadow=false}
  resize();addEventListener('resize',resize);
  await step('Lighting the sky…',10);makeEnv();
  await step('Building the city…',30);genCity(S.theme);
  await step('Painting the streets…',60);buildMarkers();buildMinimapBase();initMinimap();initRain();
  await step('Waking up the people…',80);bindControls();buildPlayerHuman();
  const home=poiById('home');const f={n:[0,1],s:[0,-1],e:[-1,0],w:[1,0]}[home.face];
  player.x=home.pos.x+f[0]*2;player.z=home.pos.z+f[1]*2;player.y=groundH(player.x,player.z);player.h=Math.atan2(f[0],f[1])+Math.PI;player.hp=100;cam.yaw=player.h;
  if(S.created&&S.px!==undefined&&Math.abs(S.px)<HALF&&S.theme===0){/* resume at home for safety */}
  setupWorld();
  $('#t_car').addEventListener('click',()=>{audioInit();if(mode!=='play'||UILOCK)return;if(player.st==='foot'){const V=pickVehicleTarget();if(V&&V.hp>0){sfx.ui();if(V.showroom)V.showroom=false;enterVehicle(V,false)}}else if(player.car){if(player.car.flying||player.car.y>groundH(player.car.x,player.car.z)+1.5){toast('Land first 🛬');return}if(Math.abs(player.car.speed)>10&&player.car.hp>0){toast('Slow down first');return}sfx.ui();exitVehicle()}});
  document.querySelectorAll('.tb:not(#t_car)').forEach(b=>b.addEventListener('click',()=>{audioInit();if(mode!=='play')return;const id={t_jobs:'jobs',t_phone:'phone',t_map:'map',t_chat:'chat',t_menu:'menu'}[b.id];if(UILOCK){closeSheet();if(cur===null&&id)return}show(id,{})}));
  document.addEventListener('visibilitychange',()=>{if(document.hidden){saveGame();try{audio.ctx&&audio.ctx.suspend()}catch(e){}}else{try{audio.ctx&&audio.on&&audio.ctx.resume()}catch(e){}}});addEventListener('pagehide',saveGame);
  await step('Ready!',100);applyTime(S.t);ENV.rain=0;
  mode='menu';requestAnimationFrame(t=>{lastT=t;frame(t)});
  await sleep(500);$('#load').style.opacity=0;$('#load').style.transition='opacity .6s';setTimeout(()=>$('#load').style.display='none',650);
  show('title',{});window.__ready=true}
renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();try{saveGame()}catch(_){}setTimeout(()=>location.reload(),400)});
boot().catch(e=>{console.error('BOOT',e&&e.stack||e);$('#loadmsg').textContent='Could not start: '+(e&&e.message)});
window.__dbg={S,player,vehicles,peds,CITY,renderer,scene,camera,beginPlay,show,ACT,startGame,set:(k,v)=>{window[k]=v}};


