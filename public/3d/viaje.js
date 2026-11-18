/* CAMPUS — Una noche, tres casas.
   Viaje 3D sobre el motor de viaje de BASHI (three r128 + Lenis).
   Concepto: entras de la calle y cruzas las tres casas de la fraternidad
   (Alfa roja, Beta azul, Gamma verde) hasta la pista, bajo la bola de espejos. */
(function(){
'use strict';

var LIBS = { three: 'js/three.min.js', lenis: 'js/lenis.min.js' };
var LOGOS = { alfa: '/assets/alfa.jpg', beta: '/assets/beta.jpg', gamma: '/assets/gamma.jpg' };

function loadScript(src){
  return new Promise(function(ok, fail){
    var s = document.createElement('script'); s.src = src; s.async = true;
    s.onload = ok; s.onerror = fail; document.head.appendChild(s);
  });
}

var $ = function(s, r){ return (r || document).querySelector(s); };
var $$ = function(s, r){ return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
var clamp = function(x, a, b){ a = a === undefined ? 0 : a; b = b === undefined ? 1 : b; return Math.min(b, Math.max(a, x)); };
var sstep = function(a, b, x){ var t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
var lerp = function(a, b, t){ return a + (b - a) * t; };

var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
var finePointer = matchMedia('(hover:hover) and (pointer:fine)').matches;
var SNAP = /[?&]snap/.test(location.search);   // solo para pruebas
var root = document.documentElement;

var S = { p: 0, u: 0, mx: 0, my: 0 };
var lenis = null, tickers = [];
var hero = $('#top'), heroMax = 1;

/* ---------- calidad: se ajusta sola al equipo ---------- */
var Q = (function(){
  var m = /[?&]q=(high|mid|low)/.exec(location.search);
  var coarse = matchMedia('(pointer:coarse)').matches;
  var mem = navigator.deviceMemory || 8, cores = navigator.hardwareConcurrency || 8;
  var tier = coarse ? 1 : 2;
  if (mem <= 4 || cores <= 4) tier = Math.max(0, tier - 1);
  if (m) tier = { high: 2, mid: 1, low: 0 }[m[1]];
  return { tier: tier, forced: !!m, coarse: coarse };
})();

/* sin WebGL o con movimiento reducido: página normal con fondo fijo */
function glOff(){ root.classList.add('gl-off'); measure(); onScroll(); }

/* ---------- puntero / giroscopio ---------- */
function setPointer(x, y){ S.mx = x / window.innerWidth - 0.5; S.my = y / window.innerHeight - 0.5; S.cx = x; S.cy = y; S.moved = true; }
window.addEventListener('pointermove', function(e){ if (e.pointerType === 'touch' || Q.coarse) return; setPointer(e.clientX, e.clientY); }, { passive: true });   // el dedo que hace scroll no debe torcer la mirada
(function(){
  if (!Q.coarse || reduce || !window.DeviceOrientationEvent) return;
  if (typeof DeviceOrientationEvent.requestPermission === 'function') return;   // iOS exige un toque: no se pide
  var base = null;
  window.addEventListener('deviceorientation', function(e){
    if (e.gamma == null || e.beta == null) return;
    if (!base) base = { x: e.gamma, y: e.beta };
    base.x += (e.gamma - base.x) * 0.02; base.y += (e.beta - base.y) * 0.02;   // se recentra solo: la mirada nunca queda torcida
    S.gx = clamp((e.gamma - base.x) / 28, -1, 1) * 0.3; S.gy = clamp((e.beta - base.y) / 28, -1, 1) * 0.3; S.gyro = true;
  }, { passive: true });
  window.addEventListener('orientationchange', function(){ base = null; });
})();

/* ---------- progreso del viaje ---------- */
function measure(){ heroMax = Math.max(1, hero.offsetHeight - window.innerHeight); }
/* el scroll frena dentro de cada casa y corre en los umbrales */
var RM = [[0, 0], [0.07, 0.1], [0.14, 0.135], [0.34, 0.345], [0.38, 0.39], [0.58, 0.585], [0.62, 0.63], [0.82, 0.83], [0.86, 0.875], [1, 1]];
function remap(p){
  for (var i = 0; i < RM.length - 1; i++){ if (p <= RM[i + 1][0]) return RM[i][1] + (RM[i + 1][1] - RM[i][1]) * (p - RM[i][0]) / (RM[i + 1][0] - RM[i][0]); }
  return 1;
}
function unmap(u){
  for (var i = 0; i < RM.length - 1; i++){ if (u <= RM[i + 1][1]) return RM[i][0] + (RM[i + 1][0] - RM[i][0]) * (u - RM[i][1]) / (RM[i + 1][1] - RM[i][1]); }
  return 1;
}
function onScroll(){ S.p = clamp(window.scrollY / heroMax); S.u = remap(S.p); }
measure(); onScroll();
window.addEventListener('scroll', onScroll, { passive: true });
window.addEventListener('resize', function(){ measure(); onScroll(); });

/* ---------- cargador: tres letras que se encienden ---------- */
var loaderEl = $('#loader'), loadN = $('#load-n');
var loadShown = 0, loadTarget = 0.35, loaderDone = false;
function finishLoader(){
  if (loaderDone) return; loaderDone = true; loadTarget = 1;
  setTimeout(function(){ if (loaderEl) loaderEl.classList.add('done'); root.classList.add('ready'); }, 320);
}
tickers.push(function(){
  if (!loadN || loadShown > 0.999) return;
  loadShown += (loadTarget - loadShown) * 0.16;
  if (loadTarget === 1 && loadShown > 0.985) loadShown = 1;
  loadN.textContent = ('00' + Math.round(loadShown * 100)).slice(-3);
  if (loaderEl) loaderEl.setAttribute('data-k', loadShown > 0.66 ? '3' : loadShown > 0.33 ? '2' : '1');
});
setTimeout(finishLoader, 3200);   // nunca se queda pegado

var fontsReady = (document.fonts && document.fonts.load)
  ? Promise.race([
      Promise.all([document.fonts.load('400 80px Graduate'), document.fonts.load('400 60px Anton')]),
      new Promise(function(r){ setTimeout(r, 2400); })
    ]).catch(function(){})
  : Promise.resolve();

/* ---------- scroll con inercia (ratón/trackpad; en táctil manda el nativo) ---------- */
if (!reduce && !Q.coarse && !SNAP) loadScript(LIBS.lenis).then(function(){
  if (!window.Lenis) return;
  lenis = new window.Lenis({ lerp: 0.085, wheelMultiplier: 0.9, smoothWheel: true });
  tickers.push(function(now){ lenis.raf(now); });
  document.addEventListener('click', function(e){
    var a = e.target.closest && e.target.closest('a[href^="#"]'); if (!a) return;
    var el = document.querySelector(a.getAttribute('href')); if (!el) return;
    e.preventDefault(); lenis.scrollTo(el, { duration: 1.4 });
  });
}).catch(function(){});

/* ============================================================
   EL MUNDO
   ============================================================ */
var ACC = ['#ffb65c', '#ff3b2e', '#2e6bff', '#2dff7f', '#f2e9d2'];   // calle, alfa, beta, gamma, pista

function initWorld(){
  if (!window.THREE){ glOff(); return; }
  var THREE = window.THREE;
  var canvas = $('#gl'), renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, powerPreference: 'high-performance' }); }
  catch (e){ glOff(); return; }
  var gl2 = renderer.capabilities.isWebGL2;

  var lost = false, shown = false;
  canvas.addEventListener('webglcontextlost', function(e){ e.preventDefault(); lost = true; root.classList.add('gl-lost'); });
  canvas.addEventListener('webglcontextrestored', function(){ lost = false; root.classList.remove('gl-lost'); post.forget(); resize(); });

  var TRAVEL = 170;
  var tier = Q.tier;
  var U = { time: { value: 0 } };

  var scene = new THREE.Scene();
  var bg = new THREE.Color(0x05060c); scene.background = bg;
  scene.fog = new THREE.Fog(0x05060c, 5, 40);
  var camera = new THREE.PerspectiveCamera(56, 1, 0.1, 150);
  var journey = new THREE.Group(); scene.add(journey);

  function C(hex){ return new THREE.Color(hex); }
  var COL = { calle: C(0x05060c), alfa: C(0x170504), beta: C(0x030a20), gamma: C(0x03150b), pista: C(0x060608), fin: C(0x08080b) };
  var STOPS = [[0, COL.calle], [0.085, COL.calle], [0.125, COL.alfa], [0.335, COL.alfa], [0.385, COL.beta], [0.575, COL.beta],
               [0.625, COL.gamma], [0.815, COL.gamma], [0.87, COL.pista], [0.97, COL.pista], [1, COL.fin]];
  var ACCC = ACC.map(function(h){ return new THREE.Color(h); });
  var ASTOPS = [[0, 0], [0.09, 0], [0.12, 1], [0.34, 1], [0.38, 2], [0.58, 2], [0.62, 3], [0.82, 3], [0.87, 4], [1, 4]];
  function ramp(stops, p, out, pal){
    for (var i = 0; i < stops.length - 1; i++){
      if (p <= stops[i + 1][0]){
        var f = clamp((p - stops[i][0]) / (stops[i + 1][0] - stops[i][0]));
        var a = pal ? pal[stops[i][1]] : stops[i][1], b = pal ? pal[stops[i + 1][1]] : stops[i + 1][1];
        return out.copy(a).lerp(b, f);
      }
    }
    return out.copy(pal ? pal[stops[stops.length - 1][1]] : stops[stops.length - 1][1]);
  }

  function noMip(t){ t.minFilter = THREE.LinearFilter; t.generateMipmaps = false; return t; }
  function canvasTex(c){ return noMip(new THREE.CanvasTexture(c)); }
  function radialTex(stops){
    var c = document.createElement('canvas'); c.width = c.height = 64; var x = c.getContext('2d');
    var g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    stops.forEach(function(s){ g.addColorStop(s[0], s[1]); });
    x.fillStyle = g; x.fillRect(0, 0, 64, 64);
    return canvasTex(c);
  }
  var dotT = radialTex([[0, 'rgba(255,255,255,1)'], [0.3, 'rgba(255,255,255,.75)'], [1, 'rgba(255,255,255,0)']]);
  var ringT = radialTex([[0, 'rgba(255,255,255,0)'], [0.62, 'rgba(255,255,255,.05)'], [0.82, 'rgba(255,255,255,.9)'], [1, 'rgba(255,255,255,0)']]);

  /* ---- responsive del mundo ---- */
  var aspect = 1, kR = 1, spread = 1, sizeK = 1, AMP = 2.4, baseFov = 56;
  var placed = [];
  function place(o, bx, s){ o.userData.bx = bx; o.userData.bs = s || 0; placed.push(o); return o; }
  function applySpread(){
    placed.forEach(function(o){ o.position.x = o.userData.bx * spread; if (o.userData.bs) o.scale.setScalar(o.userData.bs * sizeK); });
  }

  /* ---- piso: retícula mojada que toma el color de cada casa ---- */
  var floor = new THREE.Mesh(new THREE.PlaneGeometry(70, 90), new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uCol: { value: new THREE.Color() }, uTime: U.time, uWave: { value: 0 } },
    vertexShader: 'varying vec3 vW; void main(){ vec4 w=modelMatrix*vec4(position,1.0); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }',
    fragmentShader: [
      'uniform vec3 uCol; uniform float uTime,uWave; varying vec3 vW;',
      'void main(){',
      '  vec2 g=vW.xz*0.5; g.x+=sin(vW.z*0.45+uTime*1.2)*0.22*uWave;',
      '  vec2 f=abs(fract(g)-0.5); float d=min(f.x,f.y);',
      '  float dist=length(vW.xz-cameraPosition.xz);',
      '  float w=0.012+dist*0.0022; float line=1.0-smoothstep(w,w*2.2,d);',
      '  float wet=exp(-abs(vW.x)*0.42)*(0.1+0.07*sin(vW.z*2.6+uTime*1.7));',
      '  float fade=exp(-dist*0.085);',
      '  gl_FragColor=vec4(uCol*(line*0.6+wet)*fade,1.0);',
      '}'].join('\n')
  }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -1.7; journey.add(floor);

  /* ---- marcos de neón: cada casa tiene su figura ---- */
  var frames = [];
  function neonFrame(kind, r, hex, z, i){
    var seg = kind === 0 ? 4 : kind === 1 ? 56 : 3;
    var m = new THREE.Mesh(new THREE.TorusGeometry(r, 0.045, 6, seg), new THREE.MeshBasicMaterial({ color: hex }));
    m.position.set(0, 0.45, z);
    m.userData = { kind: kind, i: i, base: new THREE.Color(hex) };
    if (kind === 0){ m.rotation.z = Math.PI / 4; var g = new THREE.Group(); g.add(m); g.scale.set(1.42, 1, 1); g.position.copy(m.position); m.position.set(0, 0, 0); g.userData = m.userData; g.userData.mesh = m; journey.add(g); frames.push(g); return g; }
    m.userData.mesh = m; journey.add(m); frames.push(m); return m;
  }
  var i, z;
  // la puerta de la calle
  var door = neonFrame(0, 3.9, 0xf2e9d2, -15.5, 0); door.userData.door = true;
  for (i = 0; i < 12; i++) neonFrame(0, 4.3 - (i % 2) * 0.25, 0xff3b2e, -21 - i * 3.3, i);                 // Alfa: pasillo de puertas
  for (i = 0; i < 11; i++) neonFrame(1, 3.1 + Math.sin(i * 1.1) * 0.35, 0x2e6bff, -65 - i * 3.5, i);      // Beta: aros
  for (i = 0; i < 11; i++){ var tf = neonFrame(2, 4.5, 0x2dff7f, -106 - i * 3.3, i); tf.rotation.z = Math.PI / 2 + (i % 2) * Math.PI; }   // Gamma: triángulos

  /* ---- texto en canvas ---- */
  function textTex(lines, o){
    o = o || {};
    var fs = o.size || 120, font = (o.weight || '400') + ' ' + fs + 'px ' + (o.font || 'Anton, Impact, sans-serif');
    var c = document.createElement('canvas'), x = c.getContext('2d');
    x.font = font;
    var w = 0; lines.forEach(function(l){ w = Math.max(w, x.measureText(l).width); });
    var pad = o.glow ? fs * 0.5 : fs * 0.15, lh = fs * (o.lh || 1.1);
    c.width = Math.min(2048, Math.ceil(w + pad * 2)); c.height = Math.ceil(lh * lines.length + pad * 2);
    x = c.getContext('2d'); x.font = font; x.textAlign = 'center'; x.textBaseline = 'middle';
    var sc = Math.min(1, (c.width - pad * 2) / Math.max(1, w));
    lines.forEach(function(l, n){
      var cy = pad + lh * (n + 0.5);
      x.save(); x.translate(c.width / 2, cy); x.scale(sc, 1);
      if (o.glow){
        x.shadowColor = o.color; x.shadowBlur = fs * 0.28; x.lineJoin = 'round';
        x.strokeStyle = o.color; x.lineWidth = fs * 0.045; x.strokeText(l, 0, 0); x.strokeText(l, 0, 0);
        x.shadowBlur = 0; x.strokeStyle = 'rgba(255,255,255,.92)'; x.lineWidth = fs * 0.014; x.strokeText(l, 0, 0);
      } else {
        x.fillStyle = n === 0 ? (o.color || '#fff') : (o.color2 || '#f2e9d2'); x.fillText(l, 0, 0);
      }
      x.restore();
    });
    return { tex: canvasTex(c), a: c.width / c.height };
  }
  function textPlane(lines, height, o){
    var t = textTex(lines, o);
    var m = new THREE.Mesh(new THREE.PlaneGeometry(height * t.a, height),
      new THREE.MeshBasicMaterial({ map: t.tex, transparent: true, depthWrite: false, blending: o && o.glow ? THREE.AdditiveBlending : THREE.NormalBlending, fog: true }));
    return m;
  }

  /* ---- las tres casas: letra, cartel con el logo y datos ---- */
  var HOUSES = [
    { k: 'alfa',  L: 'Α', hex: '#ff3b2e', z0: -19,  name: 'CAMPUS ALFA',  l2: 'CHAPINERO · CLL 60 #9-25',      side: 1 },
    { k: 'beta',  L: 'Β', hex: '#2e6bff', z0: -63,  name: 'CAMPUS BETA',  l2: 'TEUSAQUILLO · CL 47 #14-22',    side: -1 },
    { k: 'gamma', L: 'Γ', hex: '#2dff7f', z0: -104, name: 'CAMPUS GAMMA', l2: 'CENTRO · AV. JIMÉNEZ #05-40', side: 1 }
  ];
  var letters = [], posters = [], labels = [];
  var tl = new THREE.TextureLoader();
  HOUSES.forEach(function(h){
    var L = textPlane([h.L], 6.2, { glow: true, color: h.hex, font: 'Georgia, "Times New Roman", serif', weight: '700', size: 300 });
    L.position.set(0, 0.7, h.z0); L.userData.bs0 = 1; journey.add(L); letters.push(L);

    var P = new THREE.Group();
    var pm = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 2.5), new THREE.MeshBasicMaterial({ color: 0x15151a }));
    var pf = new THREE.Mesh(new THREE.TorusGeometry(1.86, 0.03, 4, 4), new THREE.MeshBasicMaterial({ color: h.hex })); pf.rotation.z = Math.PI / 4; pf.position.z = 0.02;
    P.add(pm); P.add(pf);
    P.position.set(0, 0.75, h.z0 - 13); P.rotation.y = -h.side * 0.5;
    P.userData = { by: 0.75, src: LOGOS[h.k], st: 0, mat: pm.material, ph: h.z0 };
    place(P, 2.35 * h.side, 1); journey.add(P); posters.push(P);

    var T = textPlane([h.name, h.l2], 1.15, { color: '#f2e9d2', color2: h.hex, size: 110, lh: 1.02 });
    T.position.set(0, 0.2, h.z0 - 26); T.userData = { by: 0.2, ph: h.z0 * 0.3 };
    place(T, -1.7 * h.side, 1); journey.add(T); labels.push(T);
  });
  var sign = textPlane(['BIENVENIDO A LA FRATERNIDAD'], 0.42, { color: '#f2e9d2', size: 90 });
  sign.position.set(0, 3.55, -15.5); journey.add(sign);

  /* ---- partículas por acto: llovizna, brasas, burbujas, chispas ---- */
  var pxK = { value: 1 };
  function makePoints(n, z0, z1, o){
    var pos = new Float32Array(n * 3), sd = new Float32Array(n);
    for (var j = 0; j < n; j++){
      pos[j * 3] = (Math.random() - 0.5) * (o.w || 13); pos[j * 3 + 1] = Math.random() * 8; pos[j * 3 + 2] = lerp(z0, z1, Math.random());
      sd[j] = Math.random();
    }
    var g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aS', new THREE.BufferAttribute(sd, 1));
    var m = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uTime: U.time, uPx: pxK, uRise: { value: o.rise }, uSize: { value: o.size }, uCol: { value: new THREE.Color(o.color) }, uMap: { value: o.map || dotT }, uSway: { value: o.sway || 0.3 }, uOp: { value: o.op || 1 } },
      vertexShader: [
        'attribute float aS; uniform float uTime,uPx,uRise,uSize,uSway; varying float vA;',
        'void main(){ vec3 p=position; p.y=mod(position.y+uTime*uRise*(0.45+aS),8.0)-2.2;',
        '  p.x+=sin(uTime*(0.5+aS)+aS*40.0)*uSway;',
        '  vec4 mv=modelViewMatrix*vec4(p,1.0); float d=-mv.z;',
        '  gl_PointSize=uSize*(0.45+aS)*uPx/max(d,0.5);',
        '  vA=smoothstep(34.0,16.0,d)*smoothstep(0.4,2.0,d)*(0.55+0.45*sin(uTime*(2.0+aS*5.0)+aS*30.0));',
        '  gl_Position=projectionMatrix*mv; }'].join('\n'),
      fragmentShader: 'uniform sampler2D uMap; uniform vec3 uCol; uniform float uOp; varying float vA; void main(){ float a=texture2D(uMap,gl_PointCoord).a*vA*uOp; gl_FragColor=vec4(uCol*a,1.0); }'
    });
    var pts = new THREE.Points(g, m); pts.frustumCulled = false; pts.userData.n = n; journey.add(pts); return pts;
  }
  var NP = [0.35, 0.65, 1][tier];
  var dusts = [
    makePoints(Math.round(700 * NP), 10, -18, { rise: -7.5, size: 26, color: 0xb9c6ff, sway: 0.02, op: 0.55 }),            // llovizna bogotana
    makePoints(Math.round(520 * NP), -18, -62, { rise: 0.75, size: 62, color: 0xff6a2b, sway: 0.35 }),                     // brasas
    makePoints(Math.round(380 * NP), -62, -103, { rise: 0.5, size: 150, color: 0x7fb0ff, sway: 0.25, map: ringT, op: 0.8 }), // burbujas
    makePoints(Math.round(520 * NP), -103, -146, { rise: 1.5, size: 46, color: 0x7dffb0, sway: 0.5 })                      // chispas
  ];

  /* ---- faroles de la calle ---- */
  var lampM = new THREE.SpriteMaterial({ map: dotT, color: 0xffb65c, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  for (i = 0; i < 6; i++){
    [-1, 1].forEach(function(sd){
      var sp = new THREE.Sprite(lampM); sp.position.set(0, 2.9, 5 - i * 3.6); sp.scale.setScalar(1.5);
      place(sp, 4.4 * sd, 0); journey.add(sp);
    });
  }

  /* ---- láseres de Gamma ---- */
  var lasers = [];
  (function(){
    var c = document.createElement('canvas'); c.width = 8; c.height = 64; var x = c.getContext('2d');
    var g = x.createLinearGradient(0, 0, 0, 64); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, 8, 64);
    var t = canvasTex(c);
    var geo = new THREE.PlaneGeometry(0.07, 26); geo.translate(0, -13, 0);
    var mat = new THREE.MeshBasicMaterial({ map: t, color: 0x2dff7f, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false, opacity: 0.8 });
    for (var k = 0; k < 10; k++){
      var b = new THREE.Group(), a = new THREE.Mesh(geo, mat), a2 = new THREE.Mesh(geo, mat); a2.rotation.y = Math.PI / 2; b.add(a); b.add(a2);
      b.position.set((k % 2 ? 1 : -1) * 2.6, 5.2, -108 - k * 3.6);
      b.userData = { ph: k * 1.7, sp: 0.5 + (k % 3) * 0.22, sd: k % 2 ? 1 : -1 };
      journey.add(b); lasers.push(b);
    }
  })();

  /* ---- la pista: bola de espejos, destellos y la multitud que escribe CAMPUS ---- */
  var PZ = -171;
  var ball = new THREE.Mesh(new THREE.IcosahedronGeometry(1.25, 3),
    new THREE.MeshPhongMaterial({ color: 0x9aa0aa, specular: 0xffffff, shininess: 120, flatShading: true, emissive: 0x111114 }));
  ball.position.set(0, 4.1, PZ + 1.5); journey.add(ball);
  var cord = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 9, 4), new THREE.MeshBasicMaterial({ color: 0x555560 }));
  cord.position.set(0, 9.8, PZ + 1.5); journey.add(cord);
  scene.add(new THREE.AmbientLight(0xffffff, 0.22));
  var pls = [0xff3b2e, 0x2e6bff, 0x2dff7f].map(function(hx){ var l = new THREE.PointLight(hx, 2.4, 16, 1.6); journey.add(l); return l; });
  var keyL = new THREE.PointLight(0xffffff, 1.2, 14, 1.5); keyL.position.set(0, 2.2, PZ + 7); journey.add(keyL);

  var spots = (function(){
    var n = 320, pos = new Float32Array(n * 3), col = new Float32Array(n * 3), sd = new Float32Array(n), cs = [ACCC[1], ACCC[2], ACCC[3], ACCC[4]];
    for (var j = 0; j < n; j++){
      var th = Math.random() * Math.PI * 2, ph = Math.acos(lerp(-0.75, 0.9, Math.random())), r = lerp(6, 13, Math.random());
      pos[j * 3] = Math.sin(ph) * Math.cos(th) * r; pos[j * 3 + 1] = Math.cos(ph) * r * 0.6; pos[j * 3 + 2] = Math.sin(ph) * Math.sin(th) * r;
      var cc = cs[j % 4]; col[j * 3] = cc.r; col[j * 3 + 1] = cc.g; col[j * 3 + 2] = cc.b; sd[j] = Math.random();
    }
    var g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.setAttribute('aS', new THREE.BufferAttribute(sd, 1));
    var m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, vertexColors: true,
      uniforms: { uTime: U.time, uPx: pxK, uMap: { value: dotT }, uOp: { value: 0 } },
      vertexShader: 'attribute float aS; uniform float uTime,uPx; varying vec3 vC; varying float vA; void main(){ vC=color; vec4 mv=modelViewMatrix*vec4(position,1.0); gl_PointSize=(90.0+aS*120.0)*uPx/max(-mv.z,0.5); vA=0.35+0.65*abs(sin(uTime*(0.6+aS)+aS*20.0)); gl_Position=projectionMatrix*mv; }',
      fragmentShader: 'uniform sampler2D uMap; uniform float uOp; varying vec3 vC; varying float vA; void main(){ float a=texture2D(uMap,gl_PointCoord).a*vA*uOp; gl_FragColor=vec4(vC*a,1.0); }' });
    var p = new THREE.Points(g, m); p.frustumCulled = false; p.position.copy(ball.position); journey.add(p); return p;
  })();

  var crowd = (function(){
    var n = 2600;
    // la palabra se dibuja en un canvas y sus puntos son el destino de la multitud
    var c = document.createElement('canvas'); c.width = 900; c.height = 200; var x = c.getContext('2d');
    x.font = '400 150px Graduate, Georgia, serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = '#fff';
    var tw = x.measureText('CAMPUS').width; x.save(); x.translate(450, 104); x.scale(Math.min(1, 860 / tw), 1); x.fillText('CAMPUS', 0, 0); x.restore();
    var d = x.getImageData(0, 0, 900, 200).data, cand = [];
    for (var yy = 0; yy < 200; yy += 3) for (var xx = 0; xx < 900; xx += 3) if (d[(yy * 900 + xx) * 4 + 3] > 140) cand.push([xx, yy]);
    if (!cand.length) cand.push([450, 100]);
    var pos = new Float32Array(n * 3), tg = new Float32Array(n * 3), sd = new Float32Array(n), col = new Float32Array(n * 3);
    for (var j = 0; j < n; j++){
      var q = cand[(Math.random() * cand.length) | 0];
      tg[j * 3] = (q[0] - 450) / 900 + (Math.random() - 0.5) * 0.004; tg[j * 3 + 1] = -(q[1] - 100) / 900 + (Math.random() - 0.5) * 0.004; tg[j * 3 + 2] = (Math.random() - 0.5) * 0.02;
      pos[j * 3] = (Math.random() - 0.5) * 16; pos[j * 3 + 1] = Math.random() * 7 - 1.5; pos[j * 3 + 2] = (Math.random() - 0.5) * 22 + 12;
      sd[j] = Math.random();
      var cc = tg[j * 3] < -0.165 ? ACCC[1] : tg[j * 3] < 0.165 ? ACCC[2] : ACCC[3];
      col[j * 3] = lerp(cc.r, 1, 0.35); col[j * 3 + 1] = lerp(cc.g, 1, 0.35); col[j * 3 + 2] = lerp(cc.b, 1, 0.35);
    }
    var g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aT', new THREE.BufferAttribute(tg, 3));
    g.setAttribute('aS', new THREE.BufferAttribute(sd, 1)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    var m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, vertexColors: true,
      uniforms: { uTime: U.time, uPx: pxK, uMap: { value: dotT }, uForm: { value: 0 }, uFit: { value: 9 }, uOp: { value: 0 } },
      vertexShader: [
        'attribute vec3 aT; attribute float aS; uniform float uTime,uPx,uForm,uFit; varying vec3 vC; varying float vA;',
        'void main(){ vC=color;',
        '  vec3 w=position; w.x+=sin(uTime*(0.3+aS*0.5)+aS*50.0)*0.9; w.y+=cos(uTime*(0.25+aS*0.4)+aS*31.0)*0.6;',
        '  float k=clamp(uForm*1.7-aS*0.7,0.0,1.0); k=k*k*(3.0-2.0*k);',
        '  vec3 t=aT*uFit; t.x+=sin(uTime*2.0+aS*60.0)*0.012*uFit*0.2; t.y+=cos(uTime*1.7+aS*44.0)*0.012;',
        '  vec3 p=mix(w,t,k);',
        '  vec4 mv=modelViewMatrix*vec4(p,1.0);',
        '  gl_PointSize=mix(38.0+aS*40.0,30.0+aS*14.0,k)*uPx/max(-mv.z,0.5);',
        '  vA=mix(0.35+0.4*sin(uTime*(1.5+aS*3.0)+aS*20.0),0.9,k);',
        '  gl_Position=projectionMatrix*mv; }'].join('\n'),
      fragmentShader: 'uniform sampler2D uMap; uniform float uOp; varying vec3 vC; varying float vA; void main(){ float a=texture2D(uMap,gl_PointCoord).a*vA*uOp; gl_FragColor=vec4(vC*a,1.0); }' });
    var p = new THREE.Points(g, m); p.frustumCulled = false; p.position.set(0, 1.35, PZ); p.userData.n = n; journey.add(p); return p;
  })();

  /* ---- recorrido de cámara: recto en la calle, pasillo en Alfa, vaivén en Beta, zigzag en Gamma, y mirar arriba en la pista ---- */
  var KEYS = [[14, 0, 0.3], [8, 0, 0.3], [0, 0, 0.3], [-10, 0, 0.35], [-17, 0, 0.42],
              [-26, 0.45, 0.42], [-36, -0.45, 0.5], [-46, 0.4, 0.38], [-56, 0, 0.42],
              [-64, 0, 0.42], [-72, 0.95, 0.75], [-80, -0.95, 0.15], [-88, 0.9, 0.7], [-96, -0.5, 0.25], [-102, 0, 0.42],
              [-110, -0.75, 0.4], [-118, 0.75, 0.55], [-126, -0.75, 0.3], [-134, 0.6, 0.5], [-142, 0, 0.42],
              [-150, 0, 0.3], [-156, 0, 0.1], [-162, 0, -0.25], [-170, 0, -0.4], [-180, 0, -0.4]];
  function spl(zz, c){
    var n = KEYS.length, k = 1;
    while (k < n - 3 && KEYS[k + 1][0] > zz) k++;
    var a = KEYS[k - 1][c], b = KEYS[k][c], d = KEYS[k + 1][c], e = KEYS[k + 2][c];
    var f = clamp((KEYS[k][0] - zz) / (KEYS[k][0] - KEYS[k + 1][0]));
    return 0.5 * ((2 * b) + (-a + d) * f + (2 * a - 5 * b + 4 * d - e) * f * f + (-a + 3 * b - 3 * d + e) * f * f * f);
  }
  function pathZ(p){ return 8 - p * TRAVEL; }
  function pathX(p){ return spl(pathZ(p), 1) * (AMP / 2.4); }
  function pathY(p){ return spl(pathZ(p), 2); }

  /* ---- postprocesado del motor: resplandor de neón, aberración, grano y viñeta ---- */
  var post = (function(){
    var tri = new THREE.BufferGeometry();
    tri.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3));
    tri.setAttribute('uv', new THREE.BufferAttribute(new Float32Array([0, 0, 2, 0, 0, 2]), 2));
    var VS = 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.0,1.0); }';
    var blur = new THREE.ShaderMaterial({ uniforms: { t: { value: null }, d: { value: new THREE.Vector2() } }, vertexShader: VS, depthTest: false, depthWrite: false,
      fragmentShader: 'uniform sampler2D t; uniform vec2 d; varying vec2 vUv; void main(){ vec3 c=texture2D(t,vUv).rgb*0.227; c+=(texture2D(t,vUv+d*1.385).rgb+texture2D(t,vUv-d*1.385).rgb)*0.316; c+=(texture2D(t,vUv+d*3.231).rgb+texture2D(t,vUv-d*3.231).rgb)*0.0703; gl_FragColor=vec4(c,1.0); }' });
    var comp = new THREE.ShaderMaterial({
      uniforms: { tS: { value: null }, tB: { value: null }, uBloom: { value: 1.1 }, uCA: { value: 0.0016 }, uGrain: { value: 0.05 }, uTime: U.time, uVig: { value: 0.55 }, uRes: { value: new THREE.Vector2(1, 1) } },
      vertexShader: VS, depthTest: false, depthWrite: false,
      fragmentShader: [
        'uniform sampler2D tS,tB; uniform float uBloom,uCA,uGrain,uTime,uVig; uniform vec2 uRes; varying vec2 vUv;',
        'float hs(vec2 p){ return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453); }',
        'void main(){',
        '  vec2 c=vUv-0.5; float r2=dot(c,c); vec2 o=c*uCA*(0.35+r2*2.6);',
        '  vec3 col=vec3(texture2D(tS,vUv+o).r, texture2D(tS,vUv).g, texture2D(tS,vUv-o).b);',
        '  vec3 bl=texture2D(tB,vUv).rgb;',
        '  col+=bl*uBloom;',                                   // en un club todo lo que brilla sangra
        '  col*=1.0-uVig*r2*1.7;',
        '  col+=(hs(vUv*uRes+fract(uTime)*61.0)-0.5)*uGrain;',
        '  gl_FragColor=vec4(col,1.0);',
        '}'].join('\n') });
    var qs = new THREE.Scene(), qc = new THREE.Camera(), qm = new THREE.Mesh(tri, blur); qm.frustumCulled = false; qs.add(qm);
    var rtS = null, rtA = null, rtB = null;
    function pass(mat, target){ qm.material = mat; renderer.setRenderTarget(target); renderer.render(qs, qc); }
    return {
      comp: comp,
      forget: function(){ rtS = rtA = rtB = null; },
      size: function(w, h, pr){
        var W = Math.max(2, Math.floor(w * pr)), H = Math.max(2, Math.floor(h * pr));
        [rtS, rtA, rtB].forEach(function(r){ if (r) r.dispose(); });
        if (gl2 && THREE.WebGLMultisampleRenderTarget){ rtS = new THREE.WebGLMultisampleRenderTarget(W, H); rtS.samples = 4; }
        else rtS = new THREE.WebGLRenderTarget(W, H);
        rtS.texture.minFilter = rtS.texture.magFilter = THREE.LinearFilter;
        var w4 = Math.max(2, W >> 2), h4 = Math.max(2, H >> 2);
        rtA = new THREE.WebGLRenderTarget(w4, h4, { depthBuffer: false }); rtB = new THREE.WebGLRenderTarget(w4, h4, { depthBuffer: false });
        comp.uniforms.uRes.value.set(W, H);
      },
      render: function(sc, cam){
        renderer.setRenderTarget(rtS); renderer.render(sc, cam);
        var w4 = rtA.width, h4 = rtA.height;
        blur.uniforms.t.value = rtS.texture; blur.uniforms.d.value.set(1 / w4, 0); pass(blur, rtA);
        blur.uniforms.t.value = rtA.texture; blur.uniforms.d.value.set(0, 1 / h4); pass(blur, rtB);
        blur.uniforms.t.value = rtB.texture; blur.uniforms.d.value.set(2.2 / w4, 0); pass(blur, rtA);
        blur.uniforms.t.value = rtA.texture; blur.uniforms.d.value.set(0, 2.2 / h4); pass(blur, rtB);
        comp.uniforms.tS.value = rtS.texture; comp.uniforms.tB.value = rtB.texture;
        pass(comp, null);
      }
    };
  })();

  /* ---- calidad adaptativa ---- */
  var PR_TIER = [1, 1.5, 2], NPT = [0.35, 0.65, 1];
  function applyTier(){
    var k = NPT[tier] / NP;
    dusts.forEach(function(d){ d.geometry.setDrawRange(0, Math.round(d.userData.n * Math.min(1, k))); });
    crowd.geometry.setDrawRange(0, Math.round(crowd.userData.n * [0.5, 0.8, 1][tier]));
    resize();
  }
  var acc = 0, accN = 0, warm = 0, skipFrame = false;
  document.addEventListener('visibilitychange', function(){ skipFrame = true; });
  function watchFps(dt){
    if (Q.forced || tier === 0) return;
    if (skipFrame){ skipFrame = false; return; }
    warm += dt; if (warm < 1.5) return;
    acc += dt; accN++;
    if (acc >= 2.5){ if (acc / accN > 0.03){ tier--; warm = 0; applyTier(); } acc = 0; accN = 0; }
  }

  function resize(){
    var w = window.innerWidth, h = window.innerHeight;
    var pr = Math.min(window.devicePixelRatio || 1, PR_TIER[tier], w < 900 ? 1.5 : 2);
    renderer.setPixelRatio(pr); renderer.setSize(w, h, false);
    if (tier > 0) post.size(w, h, pr);
    pxK.value = h * pr / 900;
    aspect = w / h; camera.aspect = aspect;
    kR = clamp((aspect - 0.46) / (1.6 - 0.46));
    spread = lerp(0.42, 1, kR); sizeK = lerp(0.6, 1, kR); AMP = lerp(0.5, 2.4, kR); baseFov = lerp(70, 56, kR);
    camera.fov = baseFov; camera.updateProjectionMatrix();
    // la palabra final cabe siempre en el ancho visible
    var vis = 2 * 9 * Math.tan(baseFov * Math.PI / 360) * aspect;
    crowd.material.uniforms.uFit.value = Math.min(11.5, vis * 0.86);
    letters.forEach(function(L){ L.scale.setScalar(lerp(0.5, 1, kR)); });
    sign.scale.setScalar(lerp(0.55, 1, kR));
    applySpread();
  }
  applyTier(); window.addEventListener('resize', resize);

  /* ---- bucle ---- */
  var t = 0, last = performance.now(), pS = S.p, pPrev = S.p, vel = 0, kick = 0, tx = 0, ty = 0, texTick = 0;
  var tgt = new THREE.Vector3(), tmp = new THREE.Vector3(), accCol = new THREE.Color(), lastAct = -1;

  function frame(now){
    var rawDt = (now - last) / 1000, dt = Math.min(0.05, rawDt); last = now;
    if (lost) return;
    var hr = hero.getBoundingClientRect();
    if (hr.bottom <= 0) return;
    if (!shown){ shown = true; root.classList.add('gl-on'); }
    if (!reduce) t += dt;
    U.time.value = t;

    var gmx = S.gyro ? S.gx : S.mx, gmy = S.gyro ? S.gy : S.my;
    tx += (gmx - tx) * 0.05; ty += (gmy - ty) * 0.05;

    pS += (S.p - pS) * (SNAP ? 1 : 0.075);
    vel += (((pS - pPrev) / Math.max(dt, 0.001)) - vel) * 0.1; pPrev = pS; if (SNAP) vel = 0;
    var p = remap(pS);

    ramp(STOPS, p, bg); scene.fog.color.copy(bg);
    ramp(ASTOPS, p, accCol, ACCC);
    var fK = sstep(0.845, 0.9, p);                       // entrando a la pista
    scene.fog.near = lerp(5, 9, fK); scene.fog.far = lerp(40, 64, fK);

    var cz = pathZ(p), cx = pathX(p), cy = pathY(p);
    camera.position.set(cx + tx * 0.6, cy - ty * 0.35, cz);
    var pa = p + 0.035;
    tgt.set(pathX(pa) * 0.92 + tx * 1.4, pathY(pa) - ty * 0.9, cz - 6);
    tmp.set(tx * 1.2, 2.5 - ty * 0.8, PZ);              // en la pista se mira hacia la bola y la palabra
    tgt.lerp(tmp, fK * 0.85);
    camera.lookAt(tgt);
    var roll = clamp(-(pathX(p + 0.006) - pathX(p - 0.006)) * 1.3, -0.2, 0.2);
    camera.rotateZ(roll * (1 - fK));
    kick += (Math.min(Math.abs(vel) * 70, 16) - kick) * 0.08;
    camera.fov = baseFov + kick; camera.updateProjectionMatrix();

    // piso
    floor.position.z = Math.round(cz / 2) * 2 - 30; floor.position.x = 0;
    floor.material.uniforms.uCol.value.copy(accCol);
    floor.material.uniforms.uWave.value = sstep(0.35, 0.4, p) * (1 - sstep(0.58, 0.63, p));

    // marcos: una ola de luz los recorre; cada casa se mueve a su manera
    for (var n = 0; n < frames.length; n++){
      var f = frames[n], u = f.userData, dz = cz - f.position.z;
      if (dz < -3 || dz > 60){ f.visible = false; continue; }
      f.visible = true;
      var pulse = 0.5 + 0.5 * Math.sin(t * 3.2 - u.i * 0.75);
      u.mesh.material.color.copy(u.base).multiplyScalar(0.45 + 0.75 * pulse * pulse);
      if (u.door) continue;
      if (u.kind === 0) f.rotation.z = Math.sin(t * 0.4 + u.i * 0.5) * 0.05 + u.i * 0.035;
      else if (u.kind === 1){ var bs = 1 + Math.sin(t * 1.1 + u.i * 0.9) * 0.07; f.scale.set(bs, bs, 1); f.position.y = 0.45 + Math.sin(t * 0.8 + u.i * 0.7) * 0.18; }
      else f.rotation.z = Math.PI / 2 + (u.i % 2) * Math.PI + t * 0.12 * (u.i % 2 ? -1 : 1);
    }
    // letras: se cruzan por el centro y se apagan justo antes de tocarlas
    for (n = 0; n < letters.length; n++){
      var L = letters[n], ld = cz - L.position.z;
      L.visible = ld > 0.3 && ld < 48;
      if (L.visible) L.material.opacity = sstep(0.4, 5, ld) * sstep(48, 30, ld) * (0.82 + 0.18 * Math.sin(t * 7 + n) * Math.sin(t * 2.3));
    }
    for (n = 0; n < posters.length; n++){
      var P = posters[n], pu = P.userData, pd = cz - P.position.z;
      P.position.y = pu.by + Math.sin(t * 0.7 + pu.ph) * 0.1;
      var pk = sstep(lerp(3.2, 1.4, kR), lerp(8, 5, kR), pd);   // en pantallas angostas el cartel se apaga antes de taparlo todo
      pu.mat.transparent = true; pu.mat.opacity = pk; P.children[1].visible = pk > 0.5; P.visible = pk > 0.01 && pd < 60;
      if (pd < 50 && pd > -6 && !pu.st){
        pu.st = 1;
        (function(pu){ tl.load(pu.src, function(tex){ noMip(tex); pu.mat.map = tex; pu.mat.color.set(0xffffff); pu.mat.needsUpdate = true; pu.st = 2; }, undefined, function(){ pu.st = 0; }); })(pu);
      }
    }
    for (n = 0; n < labels.length; n++){
      var T = labels[n], td = cz - T.position.z;
      T.position.y = T.userData.by + Math.sin(t * 0.6 + T.userData.ph) * 0.08;
      T.material.opacity = sstep(1, 4, td) * sstep(34, 20, td);
      T.lookAt(camera.position.x * 0.4, T.position.y, cz);
    }
    sign.material.opacity = sstep(0.5, 3, cz - sign.position.z);
    for (n = 0; n < lasers.length; n++){
      var b = lasers[n], bu = b.userData;
      b.rotation.z = bu.sd * 0.35 + Math.sin(t * bu.sp + bu.ph) * 0.75;
      b.rotation.x = Math.sin(t * bu.sp * 0.6 + bu.ph * 2) * 0.35;
    }
    // la pista
    var pv = p > 0.74;
    ball.visible = cord.visible = spots.visible = crowd.visible = pv;
    if (pv){
      ball.rotation.y = t * 0.35;
      spots.rotation.y = -t * 0.22; spots.material.uniforms.uOp.value = sstep(0.8, 0.9, p) * 0.75;
      for (n = 0; n < 3; n++){ var an = t * 0.7 + n * 2.094; pls[n].position.set(ball.position.x + Math.cos(an) * 3.4, ball.position.y + Math.sin(an * 1.3) * 1.4, ball.position.z + 1.2 + Math.sin(an) * 3.4); }
      crowd.material.uniforms.uForm.value = sstep(0.87, 0.955, p);
      crowd.material.uniforms.uOp.value = sstep(0.76, 0.84, p);
    }

    if (tier > 0){
      post.comp.uniforms.uBloom.value = 1.05 + fK * 0.35 + Math.min(Math.abs(vel) * 6, 0.5);
      post.comp.uniforms.uCA.value = 0.0014 + Math.min(Math.abs(vel) * 0.02, 0.004);
      post.render(scene, camera);
    } else { renderer.setRenderTarget(null); renderer.render(scene, camera); }
    S.act = p;
    watchFps(rawDt);
  }
  tickers.push(frame);
  if (SNAP) window.__world = { camera: camera, scene: scene };
}

/* ============================================================
   INTERFAZ DEL VIAJE: capítulos, barra, título
   ============================================================ */
(function(){
  var CH = [
    [0,     'La calle',   'Centro de Bogotá. La noche apenas empieza.'],
    [0.1,   'Casa Alfa',  'Chapinero · Cll 60 #9-25. Donde empezó la fraternidad.'],
    [0.36,  'Casa Beta',  'Teusaquillo · CL 47 #14-22. La fraternidad está creciendo.'],
    [0.6,   'Casa Gamma', 'Centro · Av. Jiménez #05-40. Nos tomamos el centro.'],
    [0.845, 'La pista',   'Tres casas, una sola fraternidad.']
  ];
  var nav = $('#nav'), ui = $('#hero-ui'), title = $('#hero-title'), meta = $('#hero-meta'), hint = $('#hint');
  var cap = $('#cap'), capN = $('#cap-n'), capT = $('#cap-t'), capS = $('#cap-s'), idx = $('#bar-idx'), fill = $('#bar-fill'), line = $('#bar-line');
  var cur = -1, swapping = false, tm = 0, lastP = -1, lastSolid = null;
  function go(y){ if (lenis) lenis.scrollTo(y, { duration: 1.4 }); else window.scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' }); }
  if (line) CH.forEach(function(c, i){
    if (!i) return;
    var b = document.createElement('button'); b.type = 'button'; b.className = 'bar-tick'; b.style.left = (unmap(c[0]) * 100).toFixed(2) + '%';
    b.style.setProperty('--tc', ACC[i]); b.setAttribute('aria-label', 'Ir a ' + c[1]);
    b.addEventListener('click', function(){ go((unmap(c[0]) + 0.012) * heroMax); });
    line.appendChild(b);
  });
  document.addEventListener('keydown', function(e){
    if (root.classList.contains('gl-off') || window.scrollY > heroMax || (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft')) return;
    var k = clamp(cur + (e.key === 'ArrowRight' ? 1 : -1), 0, CH.length - 1);
    go(k ? (unmap(CH[k][0]) + 0.012) * heroMax : 0);
  });
  tickers.push(function(){
    var p = S.p, u = S.u, y = window.scrollY;
    var solid = y > heroMax - 4;
    if (solid !== lastSolid){ nav.classList.toggle('solid', solid); lastSolid = solid; }
    if (root.classList.contains('gl-off')) return;
    if (y > heroMax + window.innerHeight) return;
    if (Math.abs(p - lastP) < 0.00005 && cur !== -1) return;
    lastP = p;
    var tOut = sstep(0.02, 0.07, u);
    title.style.opacity = (1 - tOut).toFixed(3);
    title.style.transform = 'translate3d(0,' + (-p * 500).toFixed(1) + 'px,0) scale(' + (1 + p * 7).toFixed(3) + ')';
    title.style.visibility = tOut > 0.999 ? 'hidden' : 'visible';
    meta.style.opacity = (1 - sstep(0.012, 0.04, u)).toFixed(3);
    hint.style.opacity = (1 - sstep(0.004, 0.03, p)).toFixed(3);
    ui.style.opacity = (1 - sstep(0.972, 0.995, u)).toFixed(3);
    fill.style.transform = 'scaleX(' + p.toFixed(4) + ')';
    var a = 0; for (var i = 0; i < CH.length; i++){ if (u >= CH[i][0]) a = i; }
    var want = u > 0.03 && u < 0.972;
    if (a !== cur){
      cur = a; swapping = true; cap.classList.remove('on'); clearTimeout(tm);
      root.style.setProperty('--acc', ACC[cur]);
      tm = setTimeout(function(){
        capN.textContent = ('0' + (cur + 1)).slice(-2); capT.textContent = CH[cur][1]; capS.textContent = CH[cur][2];
        idx.textContent = ('0' + (cur + 1)).slice(-2) + ' / 0' + CH.length;
        swapping = false; lastP = -1;
      }, 230);
    }
    if (!swapping) cap.classList.toggle('on', want);
  });
})();

/* ---------- las secciones de abajo aparecen al entrar en pantalla ---------- */
(function(){
  var els = $$('[data-rv]');
  if (reduce || !('IntersectionObserver' in window)){ els.forEach(function(e){ e.classList.add('in'); }); return; }
  var io = new IntersectionObserver(function(es){ es.forEach(function(e){ if (e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); } }); }, { threshold: 0.16 });
  els.forEach(function(e){ io.observe(e); });
})();

/* ---------- cursor (solo puntero fino) ---------- */
(function(){
  var c = $('#cur'); if (!c || !finePointer || reduce) return;
  var x = 0, y = 0;
  tickers.push(function(){
    if (!S.moved) return;
    c.classList.add('on'); x += (S.cx - x) * 0.22; y += (S.cy - y) * 0.22;
    c.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0)';
  });
  document.addEventListener('pointerover', function(e){ c.classList.toggle('big', !!(e.target.closest && e.target.closest('a,button'))); });
})();

/* ---------- arranque ---------- */
if (reduce){ glOff(); fontsReady.then(finishLoader); }
else {
  var threeReady = loadScript(LIBS.three);
  fontsReady.then(finishLoader);
  Promise.all([threeReady, fontsReady]).then(function(){ try { initWorld(); } catch (e){ console.error(e); glOff(); } }).catch(glOff);
}

(function loop(now){ for (var i = 0; i < tickers.length; i++){ try { tickers[i](now); } catch (e){ console.error(e); } } requestAnimationFrame(loop); })(performance.now());

})();
