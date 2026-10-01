(function(){
"use strict";
var $ = function(s){ return document.querySelector(s); };
var $$ = function(s, el){ return Array.prototype.slice.call((el || document).querySelectorAll(s)); };
var log2 = Math.log2 || function(x){ return Math.log(x) / Math.LN2; };
var SVGNS = "http://www.w3.org/2000/svg";

/* ---------- Storage (safe) ---------- */
var store = {
  get: function(k, d){ try{ var v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); }catch(e){ return d; } },
  set: function(k, v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){} }
};

/* ---------- Shared stops & formatting ---------- */
var APS = [1.4,2,2.8,4,5.6,8,11,16,22];
var SHS = [1/4000,1/2000,1/1000,1/500,1/250,1/125,1/60,1/30,1/15,1/8,1/4,1/2,1,2,4,8,15,30];
var ISOS = [100,200,400,800,1600,3200,6400,12800];
var COMPS = [-2,-1.7,-1.3,-1,-0.7,-0.3,0,0.3,0.7,1,1.3,1.7,2];
function fmtSh(t){ return t >= 1 ? t + '"' : "1/" + Math.round(1/t); }
function fmtComp(c){ return c === 0 ? "0" : (c > 0 ? "+" : "−") + Math.abs(c).toFixed(1); }
function fmtTime(sec){
  if(!isFinite(sec)) return "—";
  if(sec < 0.9){
    var d = 1/sec;
    return "1/" + (d >= 100 ? Math.round(d/10)*10 : Math.round(d));
  }
  if(sec < 60) return (sec < 10 ? sec.toFixed(1).replace(/\.0$/,"") : Math.round(sec)) + " s";
  if(sec < 3600){ var m = Math.floor(sec/60), s = Math.round(sec - m*60); if(s === 60){ m++; s = 0; } return m + " min" + (s ? " " + s + " s" : ""); }
  var h = Math.floor(sec/3600), mm = Math.round((sec - h*3600)/60);
  return h + " h" + (mm ? " " + mm + " min" : "");
}
function fmtM(m){
  if(!isFinite(m)) return "∞";
  if(m < 1) return Math.round(m*100) + " cm";
  if(m < 10) return m.toFixed(2) + " m";
  return m.toFixed(1) + " m";
}
function fillSelect(sel, list, fmt, selected){
  sel.innerHTML = list.map(function(v, i){ return '<option value="'+i+'"'+(i === selected ? " selected" : "")+'>'+fmt(v)+'</option>'; }).join("");
}

/* ---------- Theme ---------- */
var root = document.documentElement;
var savedTheme = store.get("goa-theme", null);
if(savedTheme) root.setAttribute("data-theme", savedTheme);
$("#themeBtn").addEventListener("click", function(){
  var cur = root.getAttribute("data-theme") || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  var nxt = cur === "dark" ? "light" : "dark";
  root.setAttribute("data-theme", nxt);
  store.set("goa-theme", nxt);
});

/* ---------- Navigation & progress ---------- */
var GROUPS = [
  {id:"learn", name:"Learn", desc:"Lessons from the basics to editing."},
  {id:"practice", name:"Practice", desc:"Try it hands-on and test yourself."},
  {id:"tools", name:"Tools", desc:"Calculators for out in the field."},
  {id:"ref", name:"Reference", desc:"Quick answers when you need them."}
];
var sections = $$("main > section");
var byId = {};
sections.forEach(function(s){ byId[s.id] = s; });
var ORDER = sections.filter(function(s){ return s.dataset.group; }).map(function(s){ return s.id; });
var done = store.get("goa-done", {});

function renderToc(){
  var html = GROUPS.map(function(g){
    var items = ORDER.filter(function(id){ return byId[id].dataset.group === g.id; });
    return '<div><h2>'+g.name+'</h2><p class="gdesc">'+g.desc+'</p><ul>' + items.map(function(id){
      return '<li><button type="button" data-go="'+id+'"><span>'+byId[id].dataset.title+'</span>'+(done[id] ? '<span class="done">Done</span>' : '')+'</button></li>';
    }).join("") + '</ul></div>';
  }).join("");
  $("#toc").innerHTML = html;
  $("#homeGroups").innerHTML = '<div class="toc">' + html + '</div>';
  var total = ORDER.length, n = ORDER.filter(function(id){ return done[id]; }).length;
  $("#homeBar").style.width = (n / total * 100) + "%";
  $("#homeProg").textContent = n === 0 ? "Mark sections as done as you go, and your progress shows here." : n + " of " + total + " sections done" + (n === total ? ". You've finished the whole course!" : ".");
}

ORDER.forEach(function(id, i){
  var foot = document.createElement("div");
  foot.className = "sec-foot";
  var prev = ORDER[i-1], next = ORDER[i+1];
  foot.innerHTML =
    '<button type="button" class="btn ghost mark" data-mark="'+id+'" aria-pressed="false">Mark as done</button><span class="spacer"></span>' +
    (prev ? '<button type="button" class="btn ghost" data-go="'+prev+'">Back</button>' : '') +
    (next ? '<button type="button" class="btn" data-go="'+next+'">Next: '+byId[next].dataset.title+'</button>' : '<button type="button" class="btn" data-go="home">Back to home</button>');
  byId[id].querySelector(".wrap").appendChild(foot);
});
function syncMarks(){
  $$("[data-mark]").forEach(function(b){
    var on = !!done[b.dataset.mark];
    b.setAttribute("aria-pressed", on);
    b.textContent = on ? "Done ✓" : "Mark as done";
  });
}
document.addEventListener("click", function(e){
  var m = e.target.closest("[data-mark]");
  if(m){ var id = m.dataset.mark; if(done[id]) delete done[id]; else done[id] = 1; store.set("goa-done", done); syncMarks(); renderToc(); return; }
  var el = e.target.closest("[data-go]");
  if(!el) return;
  e.preventDefault();
  closeMenu();
  show(el.dataset.go, true);
});

var current = null;
function show(id, scroll){
  if(!byId[id]) id = "home";
  current = id;
  sections.forEach(function(s){ s.hidden = s.id !== id; });
  var g = byId[id].dataset.group;
  $("#crumb").textContent = g ? GROUPS.filter(function(x){ return x.id === g; })[0].name + ": " + byId[id].dataset.title : "";
  document.title = (id === "home" ? "" : byId[id].dataset.title + " · ") + "Get Off Auto";
  if(location.hash.slice(1) !== id) history.pushState(null, "", "#" + id);
  if(scroll) window.scrollTo(0, 0);
  if(id === "quiz" && !quiz.started) quizStart();
}
window.addEventListener("popstate", function(){ show(location.hash.slice(1), true); });

var menu = $("#menu"), menuBtn = $("#menuBtn");
function openMenu(){ menu.hidden = false; menuBtn.setAttribute("aria-expanded","true"); document.body.style.overflow = "hidden"; var b = menu.querySelector("[data-go]"); if(b) b.focus(); }
function closeMenu(){ if(menu.hidden) return; menu.hidden = true; menuBtn.setAttribute("aria-expanded","false"); document.body.style.overflow = ""; }
menuBtn.addEventListener("click", openMenu);
$("#menuClose").addEventListener("click", function(){ closeMenu(); menuBtn.focus(); });
document.addEventListener("keydown", function(e){ if(e.key === "Escape") closeMenu(); });

/* ---------- Iris ---------- */
var irisR = $("#irisRange");
function drawIris(){
  var n = APS[irisR.value];
  $("#irisHole").setAttribute("r", (44 * 1.4 / n).toFixed(2));
  $("#irisLabel").textContent = "f/" + n;
  $("#irisNote").textContent = n <= 2.8 ? "Wide open: lots of light, blurry background" : n >= 11 ? "Narrow: little light, everything sharp" : "In between: a bit of both";
}
irisR.addEventListener("input", drawIris); drawIris();

/* ---------- Camera anatomy ---------- */
var ANAT = {
  digital: [
    {x:85,y:48,t:"Mode dial",d:"Chooses who controls the exposure: Auto, P, A/Av, S/Tv, M and more. See the mode dial lesson."},
    {x:335,y:44,t:"Shutter button",d:"Half-press to focus and meter, full press to take the photo. Also wakes the camera from sleep."},
    {x:292,y:54,t:"Exposure compensation (+/−)",d:"Hold and turn a dial to make photos brighter or darker than the camera chose. On some cameras it's its own dial."},
    {x:325,y:77,t:"Command dial",d:"Changes the main setting for your mode: aperture in A, shutter in S. Cameras with two dials (front and rear) let you change aperture and shutter separately in M."},
    {x:200,y:18,t:"Hot shoe",d:"Mounts an external flash, microphone or flash trigger."},
    {x:200,y:56,t:"Viewfinder",d:"Look through it to frame the photo. Holding the camera to your face is steadier than at arm's length. On mirrorless cameras it previews the actual exposure."},
    {x:240,y:58,t:"Dioptre adjustment",d:"A small wheel that focuses the viewfinder for your eyesight. If the viewfinder looks blurry but photos are sharp, adjust this."},
    {x:90,y:125,t:"Rear screen",d:"For reviewing photos, menus and live view. Turn on the histogram and highlight alert here. Tilting screens help with low and high angles."},
    {x:300,y:106,t:"AF-ON button",d:"Focuses without pressing the shutter button. Used for 'back-button focus', which many enthusiasts prefer for moving subjects."},
    {x:345,y:106,t:"ISO button",d:"Quick access to ISO. Hold and turn a dial, or press and choose on screen."},
    {x:322,y:158,t:"Multi-selector / D-pad",d:"Moves the focus point, scrolls menus and photos. The centre button usually selects, or resets the focus point to the middle."},
    {x:300,y:208,t:"Menu button",d:"Opens all the settings. Most cameras also have a Q or i button for a quick menu of common settings."},
    {x:344,y:208,t:"Playback",d:"Shows your photos. Zoom in to check focus before you move on."},
    {x:376,y:145,t:"Memory card door",d:"Never open it while the access light is on. The battery is usually underneath the camera."}
  ],
  film: [
    {x:70,y:100,t:"Rewind crank",d:"Turn it to wind the film back into the canister at the end of the roll. On most cameras, pulling it up opens the back. Watch it turn as you advance film: that's how you know the film is loaded."},
    {x:300,y:90,t:"Shutter speed dial",d:"Sets the shutter speed: 1000 means 1/1000, 60 means 1/60. B means Bulb. Often a separate 'X' or red number marks the flash sync speed."},
    {x:308,y:113,t:"ISO / ASA setting",d:"Tells the light meter what film you've loaded. Often you lift and turn the shutter dial to set it."},
    {x:340,y:78,t:"Film advance lever",d:"Winds on to the next frame and cocks the shutter. Wind it fully in one smooth stroke after every shot."},
    {x:358,y:98,t:"Frame counter",d:"Shows how many photos you've taken on this roll. Most reset when you open the back."},
    {x:330,y:128,t:"Shutter button",d:"Takes the photo. Many have a thread in the middle for a cable release. Some need a gentle half-press to switch the meter on."},
    {x:200,y:76,t:"Hot shoe",d:"Mounts a flash. Older cameras sometimes need a separate cable (PC sync socket) instead."},
    {x:200,y:152,t:"Aperture ring",d:"On older lenses you set the aperture here by turning the ring, rather than with a dial on the camera."},
    {x:232,y:167,t:"Depth of field scale",d:"Pairs of numbers either side of the focus mark. Read the distances opposite your aperture's numbers to see what will be sharp. Used for zone focusing."},
    {x:200,y:189,t:"Focus ring",d:"Turn to focus. Shows distances in metres and feet. Use the split-image circle in the viewfinder to get it exact."},
    {x:248,y:147,t:"Self-timer / DoF preview",d:"On many cameras a lever here starts the self-timer, or stops the lens down so you can preview depth of field."}
  ]
};
function buildHots(view){
  var g = $(view === "digital" ? "#hotsDigital" : "#hotsFilm");
  ANAT[view].forEach(function(p, i){
    var h = document.createElementNS(SVGNS, "g");
    h.setAttribute("class", "hot");
    h.setAttribute("tabindex", "0");
    h.setAttribute("role", "button");
    h.setAttribute("aria-label", p.t);
    h.setAttribute("transform", "translate(" + p.x + " " + p.y + ")");
    h.innerHTML = '<circle class="halo" r="11"/><circle class="dot" r="6"/>';
    function pick(){
      $$(".hot").forEach(function(x){ x.classList.remove("on"); });
      h.classList.add("on");
      $("#anatDetail").innerHTML = "<h3>" + p.t + "</h3><p>" + p.d + "</p>";
    }
    h.addEventListener("click", pick);
    h.addEventListener("keydown", function(e){ if(e.key === "Enter" || e.key === " "){ e.preventDefault(); pick(); } });
    g.appendChild(h);
  });
}
buildHots("digital"); buildHots("film");
$$("#anatSeg button").forEach(function(b){
  b.addEventListener("click", function(){
    $$("#anatSeg button").forEach(function(x){ x.setAttribute("aria-pressed", x === b); });
    $("#anatDigital").hidden = b.dataset.v !== "digital";
    $("#anatFilm").hidden = b.dataset.v !== "film";
    $("#anatDetail").innerHTML = '<p class="small">Tap a dot on the camera.</p>';
  });
});

/* ---------- Mode dial ---------- */
var DIAL = [
  {label:"AUTO", green:true, title:"Auto (the green mode)",
   you:"Nothing except where you point the camera and when you press.",
   cam:"Aperture, shutter speed, ISO, flash, focus and colour.",
   use:"Handing your camera to someone else, or when there's no time to think.",
   names:"A green camera or square, 'Auto' or 'A+' (Canon), 'Intelligent Auto' (Sony)."},
  {label:"P", title:"P: Program",
   you:"ISO, exposure compensation, white balance, flash, focus mode. Turning a dial 'shifts' the combination the camera picked.",
   cam:"Aperture and shutter speed.",
   use:"Moving off Auto for the first time. Quick snapshots where you still want control of the extras.",
   names:"P on every brand."},
  {label:"A / Av", title:"A or Av: Aperture priority",
   you:"Aperture, plus ISO and exposure compensation.",
   cam:"Shutter speed, to get the brightness right.",
   use:"Most everyday shooting. Blurry backgrounds (f/1.8–f/4) or sharp landscapes (f/8–f/11).",
   names:"A on Nikon, Sony, Fujifilm, OM System. Av ('aperture value') on Canon and Pentax."},
  {label:"S / Tv", title:"S or Tv: Shutter priority",
   you:"Shutter speed, plus ISO and exposure compensation.",
   cam:"Aperture, to get the brightness right.",
   use:"Anything moving: 1/500+ to freeze sport, kids and pets; slow speeds to blur water or show motion.",
   names:"S on Nikon, Sony, Fujifilm. Tv ('time value') on Canon and Pentax."},
  {label:"M", title:"M: Manual",
   you:"Aperture, shutter speed and ISO. Many cameras also allow Auto ISO in M.",
   cam:"Nothing. It shows a light meter so you can judge.",
   use:"Steady light: sunsets, night scenes on a tripod, studio flash, fireworks, panoramas.",
   names:"M on every brand. Most older film cameras are effectively always in M."},
  {label:"B", title:"B: Bulb",
   you:"Everything. The shutter stays open for as long as you hold the button.",
   cam:"Nothing.",
   use:"Exposures longer than 30 seconds: star trails, lightning, fireworks. Tripod and remote release.",
   names:"B on most cameras, sometimes past the end of the shutter speeds in M."},
  {label:"VIDEO", title:"Video",
   you:"Depends on the camera; many have their own P/A/S/M for video.",
   cam:"Usually exposure and focus, unless set to manual.",
   use:"Filming. Starting rule: shutter about double the frame rate, e.g. 1/50 for 25fps.",
   names:"A film-camera icon, or a red record button."},
  {label:"SCN", title:"SCN: Scene modes",
   you:"The type of scene; the camera does the rest.",
   cam:"Everything, tuned for that scene.",
   use:"Portrait (wide aperture), Landscape (narrow aperture), Sport (fast shutter), Macro, Night. Really just Auto with a hint.",
   names:"SCN, or small icons of a face, mountain, runner, flower and moon."}
];
var dial = $("#dial"), dialRot = 0, dstep = 360 / DIAL.length, R = 92;
DIAL.forEach(function(d, i){
  var b = document.createElement("button"); b.type = "button"; b.textContent = d.label;
  b.setAttribute("aria-label", d.title);
  if(d.green) b.classList.add("green");
  d.angle = i * dstep; d.btn = b;
  b.addEventListener("click", function(){ pickMode(i); });
  dial.appendChild(b);
});
function placeDial(){
  dial.style.transform = "rotate(" + dialRot + "deg)";
  DIAL.forEach(function(d){
    d.btn.style.transform = "translate(-50%,-50%) rotate(" + d.angle + "deg) translateY(-" + R + "px) rotate(" + (-d.angle - dialRot) + "deg)";
  });
}
function pickMode(i){
  var d = DIAL[i];
  var diff = ((-d.angle - dialRot) % 360 + 540) % 360 - 180;
  dialRot += diff;
  placeDial();
  DIAL.forEach(function(x){ x.btn.setAttribute("aria-pressed", x === d); });
  $("#modeDetail").innerHTML = "<h3>"+d.title+"</h3><dl class='kv'><dt>You choose</dt><dd>"+d.you+"</dd><dt>The camera chooses</dt><dd>"+d.cam+
    "</dd><dt>Use it for</dt><dd>"+d.use+"</dd><dt>What it's called on your camera</dt><dd>"+d.names+"</dd></dl>";
}
pickMode(2);

/* ---------- Focal length ---------- */
var FLS = [14,18,24,28,35,50,70,85,105,135,200,300,400];
var flR = $("#flRange"), crop = $("#crop");
function drawFl(){
  var f = FLS[flR.value], eff = crop.checked ? f * 1.5 : f;
  var w = 900 * 14 / eff, h = w * 2/3;
  $("#flSvg").setAttribute("viewBox", (450 - w/2).toFixed(2) + " " + (300 - h/2).toFixed(2) + " " + w.toFixed(2) + " " + h.toFixed(2));
  $("#flMm").textContent = f + "mm";
  var ang = 2 * Math.atan(18 / eff) * 180 / Math.PI;
  $("#flAngle").textContent = "Sees about " + Math.round(ang) + "° from side to side" + (crop.checked ? ", the same as a " + Math.round(eff) + "mm lens on full frame or 35mm film." : ".");
  var kind, use;
  if(eff < 24){ kind = "Ultra-wide"; use = "Huge landscapes, small rooms, dramatic architecture. Things close to the lens look much bigger than things far away."; }
  else if(eff < 40){ kind = "Wide"; use = "Travel, street, groups and landscapes. Most phones' main camera is around 24–28mm."; }
  else if(eff < 65){ kind = "Normal"; use = "Close to what your eye focuses on. A great all-rounder for people and places."; }
  else if(eff < 140){ kind = "Short telephoto"; use = "The classic portrait range: flattering faces and easy blurry backgrounds."; }
  else { kind = "Telephoto"; use = "Wildlife, sport, the moon, and details you can't walk up to. Needs fast shutters by hand: at least 1/" + Math.round(eff) + "."; }
  $("#flKind").textContent = kind;
  $("#flUse").textContent = use;
}
flR.addEventListener("input", drawFl); crop.addEventListener("change", drawFl); drawFl();

/* ---------- Light direction ---------- */
var lightQ = "hard";
function shade(hex, k){
  var n = parseInt(hex.slice(1), 16), r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  function c(v){ return Math.round(Math.max(0, Math.min(255, v * k))).toString(16).padStart(2, "0"); }
  return "#" + c(r) + c(g) + c(b);
}
function drawLight(){
  var a = +$("#lightAng").value, rad = a * Math.PI / 180, s = Math.sin(rad), c = Math.cos(rad);
  var lit = 0.3 + 0.7 * (1 + c) / 2;
  var soft = lightQ === "soft";
  var grad = $("#ballGrad");
  grad.setAttribute("fx", (0.5 + 0.38 * s).toFixed(3));
  grad.setAttribute("fy", "0.38");
  $("#bgS0").setAttribute("stop-color", shade("#FFF4E0", lit));
  $("#bgS1").setAttribute("stop-color", shade("#E0A060", lit * (soft ? 1 : 0.92)));
  $("#bgS1").setAttribute("offset", soft ? "0.62" : "0.45");
  $("#bgS2").setAttribute("stop-color", soft ? shade("#7A5232", lit) : "#1A100A");
  $("#ballRim").setAttribute("opacity", (Math.pow(Math.max(0, -c), 1.5) * (soft ? 0.5 : 1)).toFixed(2));
  var sh = $("#ballShadow");
  sh.setAttribute("cx", (150 - s * 45).toFixed(1));
  sh.setAttribute("rx", (50 + Math.abs(s) * 18).toFixed(1));
  sh.setAttribute("opacity", soft ? ".4" : ".85");
  $("#shBlur").setAttribute("stdDeviation", soft ? "7" : "1.5");
  $("#lampDot").setAttribute("cx", (44 * s).toFixed(1));
  $("#lampDot").setAttribute("cy", (44 * c).toFixed(1));
  var aa = Math.abs(a), t;
  if(aa < 25) t = "Front light: even and shadow-free. Easy and clear, but it can look flat.";
  else if(aa < 70) t = "45° light: the classic portrait angle. Gentle shadows give faces shape.";
  else if(aa < 115) t = "Side light: half lit, half in shadow. Dramatic, and brilliant for showing texture.";
  else if(aa < 155) t = "Three-quarter back light: glowing edges. Faces need some light bounced back in.";
  else t = "Back light: a bright rim or silhouette. Expose for the face, or let it go dark for a silhouette.";
  $("#lightText").textContent = t + (soft ? " Soft light makes the shadow edges gentle." : " Hard light makes crisp, dark shadow edges.");
}
$("#lightAng").addEventListener("input", drawLight);
$$("#lightQual button").forEach(function(b){
  b.addEventListener("click", function(){
    lightQ = b.dataset.q;
    $$("#lightQual button").forEach(function(x){ x.setAttribute("aria-pressed", x === b); });
    drawLight();
  });
});
drawLight();

/* ---------- White balance ---------- */
function drawWB(){
  var L = +$("#wbLight").value, C = +$("#wbCam").value;
  var diff = 1e6 / L - 1e6 / C;
  var cast = $("#wbCast");
  cast.setAttribute("fill", diff > 0 ? "#FF8A2A" : "#3A7BFF");
  cast.setAttribute("opacity", Math.min(0.45, Math.abs(diff) / 400).toFixed(3));
  var t;
  if(Math.abs(diff) < 20) t = "Colours look natural: the white balance matches the light.";
  else if(diff > 0) t = "The photo looks " + (diff > 150 ? "very " : "") + "orange because the light is warmer than the camera expects. Set white balance to a lower kelvin (or Tungsten) to fix it, or keep it for a cosy mood.";
  else t = "The photo looks " + (diff < -100 ? "very " : "") + "blue because the light is cooler than the camera expects. Set white balance higher (Cloudy or Shade) to warm it up.";
  $("#wbText").textContent = t;
}
$("#wbLight").addEventListener("change", drawWB); $("#wbCam").addEventListener("change", drawWB); drawWB();

/* ---------- Composition trainer ---------- */
var comp = {hy:200, bx:300, by:280, guide:"thirds"};
var compSvg = $("#compSvg");
function svgPoint(e){
  var pt = compSvg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
  return pt.matrixTransform(compSvg.getScreenCTM().inverse());
}
function drawGuides(){
  var g = $("#cGuides"), L = [];
  if(comp.guide === "thirds") L = [[200,0,200,400],[400,0,400,400],[0,133.3,600,133.3],[0,266.7,600,266.7]];
  else if(comp.guide === "phi") L = [[229.2,0,229.2,400],[370.8,0,370.8,400],[0,152.8,600,152.8],[0,247.2,600,247.2]];
  else if(comp.guide === "centre") L = [[300,0,300,400],[0,200,600,200]];
  g.innerHTML = L.map(function(l){ return '<line x1="'+l[0]+'" y1="'+l[1]+'" x2="'+l[2]+'" y2="'+l[3]+'"/>'; }).join("");
}
function drawComp(){
  $("#cHorizon").setAttribute("transform", "translate(0 " + comp.hy.toFixed(1) + ")");
  $("#cBoat").setAttribute("transform", "translate(" + comp.bx.toFixed(1) + " " + comp.by.toFixed(1) + ")");
  var fb = [], hy = comp.hy;
  if(Math.abs(hy - 133.3) < 22) fb.push(["good","Horizon on the upper third: the sea gets the attention. Good when the foreground is the interesting part."]);
  else if(Math.abs(hy - 266.7) < 22) fb.push(["good","Horizon on the lower third: the sky gets the attention. Good for a dramatic sunset."]);
  else if(Math.abs(hy - 200) < 18) fb.push(["warn","The horizon cuts the photo exactly in half, which can feel undecided. Fine for reflections and symmetry."]);
  else if(hy < 60 || hy > 340) fb.push(["","A very high or low horizon is a bold choice. It works when one half is far more interesting."]);
  else fb.push(["","Try moving the horizon onto one of the third lines."]);
  var pts = [[200,133.3],[400,133.3],[200,266.7],[400,266.7]], best = Infinity;
  pts.forEach(function(p){ best = Math.min(best, Math.hypot(comp.bx - p[0], comp.by - p[1])); });
  if(best < 35) fb.push(["good","The boat sits on a thirds intersection, a naturally strong spot."]);
  else if(Math.abs(comp.bx - 300) < 25 && Math.abs(comp.by - 200) < 40) fb.push(["","A centred subject feels calm and still. Great for symmetry, less so for movement."]);
  if(comp.bx < 50 || comp.bx > 550) fb.push(["warn","The boat is crammed against the edge of the frame."]);
  else if(comp.bx > 380) fb.push(["warn","The boat is sailing right, out of the frame. Give it space in front to sail into."]);
  else if(comp.bx < 260) fb.push(["good","The boat has space ahead of it to sail into, which feels natural."]);
  $("#compFb").innerHTML = fb.map(function(f){ return '<li class="'+f[0]+'">'+f[1]+'</li>'; }).join("");
}
var dragging = null, dragOff = 0;
compSvg.addEventListener("pointerdown", function(e){
  var p = svgPoint(e);
  if(e.target.closest("#cBoat")){ dragging = "boat"; dragOff = {x:p.x - comp.bx, y:p.y - comp.by}; }
  else { dragging = "hor"; dragOff = p.y - comp.hy; }
  compSvg.setPointerCapture(e.pointerId);
  e.preventDefault();
});
compSvg.addEventListener("pointermove", function(e){
  if(!dragging) return;
  var p = svgPoint(e);
  if(dragging === "boat"){
    comp.bx = Math.max(20, Math.min(580, p.x - dragOff.x));
    comp.by = Math.max(comp.hy + 12, Math.min(385, p.y - dragOff.y));
  } else {
    comp.hy = Math.max(30, Math.min(370, p.y - dragOff));
    if(comp.by < comp.hy + 12) comp.by = Math.min(385, comp.hy + 12);
  }
  drawComp();
});
function endDrag(){ dragging = null; }
compSvg.addEventListener("pointerup", endDrag);
compSvg.addEventListener("pointercancel", endDrag);
$$("#guideSeg button").forEach(function(b){
  b.addEventListener("click", function(){
    comp.guide = b.dataset.g;
    $$("#guideSeg button").forEach(function(x){ x.setAttribute("aria-pressed", x === b); });
    drawGuides();
  });
});
drawGuides(); drawComp();

/* ---------- Editor ---------- */
var ED = [
  {k:"exp", n:"Exposure", min:-2, max:2, step:0.1, v:0, fmt:function(v){ return (v > 0 ? "+" : "") + v.toFixed(1); }},
  {k:"con", n:"Contrast", min:-100, max:100, step:1, v:0},
  {k:"hi", n:"Highlights", min:-100, max:100, step:1, v:0},
  {k:"sh", n:"Shadows", min:-100, max:100, step:1, v:0},
  {k:"temp", n:"Temperature", min:-100, max:100, step:1, v:0},
  {k:"sat", n:"Saturation", min:-100, max:100, step:1, v:0}
];
var edHints = {
  exp:"Overall brightness, in stops.",
  con:"Difference between darks and brights. More = punchier, less = softer and flatter.",
  hi:"Only the bright areas. Pull down to recover a washed-out sky.",
  sh:"Only the dark areas. Push up to see into shadows.",
  temp:"Warmer (yellow) or cooler (blue). Same idea as white balance.",
  sat:"Colour strength. −100 makes black and white."
};
var edPanel = $("#edPanel");
ED.forEach(function(s){
  var row = document.createElement("div"); row.className = "slider-row";
  row.innerHTML = '<div class="top"><label for="ed_'+s.k+'">'+s.n+'</label><b id="edv_'+s.k+'"></b></div>' +
    '<input type="range" id="ed_'+s.k+'" min="'+s.min+'" max="'+s.max+'" step="'+s.step+'" value="'+s.v+'"><div class="small">'+edHints[s.k]+'</div>';
  edPanel.appendChild(row);
  s.input = row.querySelector("input");
  s.input.addEventListener("input", drawEdit);
});
function edVal(k){ return ED.filter(function(s){ return s.k === k; })[0]; }
function drawEdit(){
  var v = {};
  ED.forEach(function(s){ v[s.k] = +s.input.value; $("#edv_" + s.k).textContent = s.fmt ? s.fmt(v[s.k]) : (v[s.k] > 0 ? "+" : "") + v[s.k]; });
  var pts = [], d = "";
  for(var i = 0; i <= 16; i++){
    var x = i / 16, y = x * Math.pow(2, v.exp * 0.5);
    y = (y - 0.5) * (1 + v.con / 100 * 0.8) + 0.5;
    y += v.sh / 100 * 0.22 * Math.exp(-Math.pow(x - 0.22, 2) / 0.025);
    y += v.hi / 100 * 0.22 * Math.exp(-Math.pow(x - 0.82, 2) / 0.025);
    y = Math.max(0, Math.min(1, y));
    pts.push(y.toFixed(4));
    d += (i ? " L" : "M") + (x * 100).toFixed(2) + " " + (60 - y * 60).toFixed(2);
  }
  var tv = pts.join(" ");
  $("#edR").setAttribute("tableValues", tv); $("#edG").setAttribute("tableValues", tv); $("#edB").setAttribute("tableValues", tv);
  $("#curvePath").setAttribute("d", d);
  var t = v.temp / 100;
  $("#edTemp").setAttribute("values", (1 + t * 0.18).toFixed(3) + " 0 0 0 0  0 " + (1 + t * 0.03).toFixed(3) + " 0 0 0  0 0 " + (1 - t * 0.22).toFixed(3) + " 0 0  0 0 0 1 0");
  $("#edSat").setAttribute("values", (1 + v.sat / 100).toFixed(2));
}
var editUse = $("#editUse"), beforeBtn = $("#edBefore");
function showOrig(on){ if(on) editUse.removeAttribute("filter"); else editUse.setAttribute("filter", "url(#fEdit)"); }
beforeBtn.addEventListener("pointerdown", function(e){ e.preventDefault(); showOrig(true); });
["pointerup","pointerleave","pointercancel"].forEach(function(ev){ beforeBtn.addEventListener(ev, function(){ showOrig(false); }); });
beforeBtn.addEventListener("keydown", function(e){ if(e.key === " " || e.key === "Enter"){ e.preventDefault(); showOrig(true); } });
beforeBtn.addEventListener("keyup", function(){ showOrig(false); });
beforeBtn.addEventListener("contextmenu", function(e){ e.preventDefault(); });
$("#edReset").addEventListener("click", function(){ ED.forEach(function(s){ s.input.value = s.v; }); drawEdit(); });
drawEdit();

/* ---------- Playground ---------- */
var PG_SHS = SHS.slice(0, 16);
var LIGHTS = {
  sun:{label:"Sunny", ev:15, sky:["#6FAEDD","#D2E8F6"], sun:"#FFF3C4", win:"#5D7A8C"},
  cloud:{label:"Cloudy", ev:12, sky:["#9AA6AE","#D9DEE1"], sun:"#E4E7E8", win:"#5D6B74"},
  dusk:{label:"Sunset", ev:9, sky:["#F08A4B","#F9D29A"], sun:"#FFE2A0", win:"#F2C46B"},
  indoor:{label:"Indoors", ev:7, sky:["#C9B79A","#E8DCC6"], sun:"#F8E9C8", win:"#F2C46B"},
  night:{label:"Night", ev:4, sky:["#1E2B4A","#3D4D72"], sun:"#F1F0E6", win:"#FFD36B"}
};
var MODES = {
  Auto:{},
  P:{iso:1, comp:1},
  A:{ap:1, iso:1, comp:1},
  S:{sh:1, iso:1, comp:1},
  M:{ap:1, sh:1, iso:1}
};
var st = {mode:"A", ap:4, sh:5, iso:1, comp:6, light:"sun", tripod:false};
var modeSeg = $("#modeSeg");
Object.keys(MODES).forEach(function(m){
  var b = document.createElement("button"); b.type = "button"; b.textContent = m; b.dataset.m = m;
  b.addEventListener("click", function(){ st.mode = m; update(); });
  modeSeg.appendChild(b);
});
var lightSeg = $("#lightSeg");
Object.keys(LIGHTS).forEach(function(k){
  var b = document.createElement("button"); b.type = "button"; b.textContent = LIGHTS[k].label; b.dataset.l = k;
  b.addEventListener("click", function(){ st.light = k; update(); });
  lightSeg.appendChild(b);
});
$("#tripod").addEventListener("change", function(e){ st.tripod = e.target.checked; update(); });
var CTL = [
  {key:"ap", name:"Aperture", list:APS, fmt:function(v){ return "f/" + v; }},
  {key:"sh", name:"Shutter speed", list:PG_SHS, fmt:fmtSh},
  {key:"iso", name:"ISO", list:ISOS, fmt:function(v){ return v; }},
  {key:"comp", name:"Exposure comp.", list:COMPS, fmt:fmtComp}
];
var ctlBox = $("#controls");
CTL.forEach(function(c){
  var row = document.createElement("div"); row.className = "ctl";
  row.innerHTML = '<div class="name">'+c.name+'<span class="who"></span></div>' +
    '<div class="stepper"><button type="button" aria-label="Decrease '+c.name+'">−</button><output></output><button type="button" aria-label="Increase '+c.name+'">+</button></div>';
  var btns = row.querySelectorAll("button");
  btns[0].addEventListener("click", function(){ if(st[c.key] > 0){ st[c.key]--; update(); } });
  btns[1].addEventListener("click", function(){ if(st[c.key] < c.list.length - 1){ st[c.key]++; update(); } });
  c.row = row; c.who = row.querySelector(".who"); c.out = row.querySelector("output"); c.dec = btns[0]; c.inc = btns[1];
  ctlBox.appendChild(row);
});
function offsetFor(ai, si, ii){
  var N = APS[ai], t = PG_SHS[si], iso = ISOS[ii];
  return LIGHTS[st.light].ev + log2(iso / 100) - log2(N * N / t);
}
function solve(){
  var u = MODES[st.mode];
  if(st.mode === "M") return;
  var target = u.comp ? COMPS[st.comp] : 0;
  function range(locked, cur, list){ return locked ? [cur] : list.map(function(_, i){ return i; }); }
  var aR = range(u.ap, st.ap, APS), sR = range(u.sh, st.sh, PG_SHS), iR = range(u.iso, st.iso, ISOS);
  var best = null, bestScore = Infinity;
  aR.forEach(function(a){ sR.forEach(function(s){ iR.forEach(function(i){
    var off = offsetFor(a, s, i), t = PG_SHS[s], sc = Math.abs(off - target) * 10;
    if(!u.sh){
      if(!st.tripod && t > 1/60) sc += log2(t * 60) * 4;
      sc += Math.abs(log2(t * 250)) * 0.15;
    }
    if(!u.ap) sc += Math.abs(log2(APS[a] / 5.6)) * 0.5;
    if(!u.iso) sc += log2(ISOS[i] / 100) * 1.5;
    if(sc < bestScore){ bestScore = sc; best = [a, s, i]; }
  }); }); });
  st.ap = best[0]; st.sh = best[1]; st.iso = best[2];
}
/* Histogram base: deterministic tones */
var BASE = (function(){
  var seed = 7; function rnd(){ seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
  var mix = [[0.28,0.09,0.35],[0.52,0.11,0.4],[0.78,0.07,0.25]], out = [];
  for(var i = 0; i < 1500; i++){
    var r = rnd(), m = r < 0.35 ? mix[0] : r < 0.75 ? mix[1] : mix[2];
    var g = Math.sqrt(-2 * Math.log(rnd() || 1e-9)) * Math.cos(2 * Math.PI * rnd());
    out.push(m[0] + g * m[1]);
  }
  return out;
})();
function drawHist(off){
  var bins = new Array(64).fill(0);
  BASE.forEach(function(t){
    var v = t + off * 0.16;
    var b = Math.max(0, Math.min(63, Math.floor(v * 64)));
    bins[b]++;
  });
  var max = Math.max.apply(null, bins.slice(1, 63).concat([20]));
  var d = "M0 30";
  bins.forEach(function(c, i){ var y = 30 - Math.min(30, c / max * 28); d += " L" + i + " " + y.toFixed(2) + " L" + (i + 1) + " " + y.toFixed(2); });
  d += " L64 30Z";
  $("#histPath").setAttribute("d", d);
  var cl = bins[0] / BASE.length > 0.02, cr = bins[63] / BASE.length > 0.02;
  $("#clipL").textContent = cl ? "shadows clipped" : "shadows";
  $("#clipR").textContent = cr ? "highlights clipped" : "highlights";
  $("#clipL").className = cl ? "on" : ""; $("#clipR").className = cr ? "on" : "";
}
function update(){
  solve();
  var u = MODES[st.mode], L = LIGHTS[st.light];
  var N = APS[st.ap], t = PG_SHS[st.sh], iso = ISOS[st.iso];
  var off = offsetFor(st.ap, st.sh, st.iso);
  var target = u.comp ? COMPS[st.comp] : 0;
  var limited = st.mode !== "M" && Math.abs(off - target) > 0.5;

  $$("#modeSeg button").forEach(function(b){ b.setAttribute("aria-pressed", b.dataset.m === st.mode); });
  $$("#lightSeg button").forEach(function(b){ b.setAttribute("aria-pressed", b.dataset.l === st.light); });
  CTL.forEach(function(c){
    var mine = !!u[c.key];
    c.row.style.display = (c.key === "comp" && !u.comp) ? "none" : "";
    c.who.textContent = mine ? "you set" : "camera sets";
    c.out.textContent = c.fmt(c.list[st[c.key]]);
    c.dec.disabled = !mine || st[c.key] === 0;
    c.inc.disabled = !mine || st[c.key] === c.list.length - 1;
  });
  $("#lcdMode").textContent = st.mode;
  $("#lcdSh").innerHTML = "<small>shutter</small>" + fmtSh(t);
  $("#lcdAp").innerHTML = "<small>f</small>" + N;
  $("#lcdIso").innerHTML = "<small>ISO</small>" + iso;
  [["Sh","sh"],["Ap","ap"],["Iso","iso"]].forEach(function(p){
    var el = $("#lcd" + p[0]);
    el.classList.toggle("cam", !u[p[1]]);
    el.classList.toggle("limit", limited && !u[p[1]]);
  });
  $("#lcd").classList.toggle("blink", limited);
  $("#needle").style.left = ((Math.max(-3, Math.min(3, off)) + 3) / 6 * 100) + "%";

  $("#skyTop").setAttribute("stop-color", L.sky[0]);
  $("#skyBot").setAttribute("stop-color", L.sky[1]);
  $("#simSun").setAttribute("fill", L.sun);
  $("#win1").setAttribute("fill", L.win); $("#win2").setAttribute("fill", L.win);
  var bright = Math.max(0.04, Math.min(8, Math.pow(2, off * 0.75)));
  $("#simFilter").style.filter = "brightness(" + bright.toFixed(3) + ")" + (off > 1 ? " contrast(" + Math.max(0.6, 1 - (off - 1) * 0.12).toFixed(2) + ")" : "");
  $("#bgBlur").setAttribute("stdDeviation", (9 / N).toFixed(2));
  $("#moveBlur").setAttribute("stdDeviation", Math.min(30, t * 700).toFixed(2) + " 0");
  var shake = (!st.tripod && t >= 1/30) ? Math.min(5, 1 + log2(t * 30) * 1.1) : 0;
  $("#shakeBlur").setAttribute("stdDeviation", shake.toFixed(2));
  $("#noise").setAttribute("opacity", Math.min(0.55, log2(iso / 100) * 0.075).toFixed(3));
  drawHist(off);

  var fb = [];
  if(limited) fb.push(["warn","The camera can't reach a good exposure with what you've locked in. Real cameras blink the numbers to warn you. Try changing ISO" + (u.ap ? " or the aperture." : u.sh ? " or the shutter speed." : ".")]);
  if(off > 1.5) fb.push(["warn","Very overexposed: bright areas have turned pure white and can't be recovered."]);
  else if(off > 0.4) fb.push(["warn","A bit too bright."]);
  else if(off < -1.5) fb.push(["warn","Very underexposed: too dark, and it'll be noisy if brightened later."]);
  else if(off < -0.4) fb.push(["warn","A bit too dark."]);
  else fb.push(["good","Exposure looks right."]);
  if(t <= 1/500) fb.push(["good","Fast shutter: the moving ball is frozen."]);
  else if(t >= 1/60) fb.push(["warn","Slow shutter for a moving subject: the ball is smeared. For action try 1/500 or faster."]);
  if(shake > 0) fb.push(["warn","At " + fmtSh(t) + " your hands will shake the camera. Use a tripod or a faster shutter."]);
  if(N <= 2.8) fb.push(["good","Wide aperture: the background is soft and the flower stands out."]);
  else if(N >= 8) fb.push(["good","Narrow aperture: the background is sharp too, good for landscapes."]);
  if(iso >= 3200) fb.push(["warn","High ISO: lots of visible noise."]);
  else if(iso >= 1600) fb.push(["warn","ISO is getting high: some grain is showing."]);
  if(st.mode === "P") fb.push(["","In P mode, most cameras let you turn a dial to shift between equal combinations, like a faster shutter with a wider aperture."]);
  if(st.mode === "M") fb.push(["","In M, the needle is your guide. Centre it, or move it on purpose for a brighter or darker look."]);
  $("#feedback").innerHTML = fb.map(function(f){ return '<li class="'+f[0]+'">'+f[1]+'</li>'; }).join("");
}
update();

/* ---------- Quiz ---------- */
var QUESTIONS = [
  {q:"Which aperture lets in the most light?", o:["f/1.8","f/5.6","f/16"], a:0, w:"Smaller f-numbers mean a bigger opening. f/1.8 lets in about 80 times more light than f/16."},
  {q:"You want a blurry background behind a portrait. Which aperture?", o:["f/2","f/11","f/22"], a:0, w:"Wide apertures (small numbers) give shallow depth of field."},
  {q:"Which shutter speed is best for freezing a running dog?", o:["1/30","1/125","1/1000"], a:2, w:"Fast action needs 1/500 or faster."},
  {q:"Raising ISO makes photos brighter, but also…", o:["Sharper","Grainier","More colourful"], a:1, w:"Higher ISO amplifies the signal, and the noise along with it."},
  {q:"In A (or Av) mode, what does the camera choose?", o:["The aperture","The shutter speed","The focal length"], a:1, w:"You pick the aperture; the camera picks a shutter speed to get the brightness right."},
  {q:"In S (or Tv) mode, what do you choose?", o:["Shutter speed","Aperture","White balance"], a:0, w:"Shutter priority: you choose the shutter, the camera chooses the aperture."},
  {q:"Which is one stop MORE light than 1/250?", o:["1/500","1/125","1/200"], a:1, w:"Doubling the time doubles the light. 1/125 is twice as long as 1/250."},
  {q:"Your snow photos look grey. What should you do?", o:["Exposure compensation +1","Exposure compensation −1","Change white balance to Shade"], a:0, w:"The meter makes everything mid-grey. Tell it the scene is brighter than average."},
  {q:"Which focal length is telephoto?", o:["18mm","35mm","200mm"], a:2, w:"Long focal lengths zoom in on distant subjects."},
  {q:"A 50mm lens on an APS-C camera (1.5×) frames like…", o:["33mm","50mm","75mm"], a:2, w:"50 × 1.5 = 75mm equivalent."},
  {q:"Which focus mode keeps tracking a moving subject?", o:["AF-S / One Shot","AF-C / AI Servo","MF"], a:1, w:"Continuous AF refocuses while you hold the half-press."},
  {q:"Hand-holding a 200mm lens on full frame, what's the slowest safe-ish shutter without stabilisation?", o:["1/30","1/60","1/200"], a:2, w:"The rule of thumb is 1 over the focal length."},
  {q:"Indoor photos look orange. What should you change?", o:["ISO","White balance","Aperture"], a:1, w:"Bulbs are warm; set white balance to Auto or Tungsten."},
  {q:"On a film camera, where does the ISO come from?", o:["You change it each shot","The film you load","The lab sets it"], a:1, w:"Each roll has a fixed sensitivity; set the camera's ISO dial to match."},
  {q:"Sunny 16: ISO 400 film on a sunny day. f/16 at…", o:["1/60","1/125","1/500"], a:2, w:"Shutter is 1 over the ISO, so 1/400. The nearest speed on the dial is 1/500."},
  {q:"At the end of a film roll, before opening the back you must…", o:["Rewind the film","Take the lens off","Remove the battery"], a:0, w:"Opening the back before rewinding exposes and ruins the film."},
  {q:"Colour negative film is more forgiving of…", o:["Overexposure","Underexposure","Neither"], a:0, w:"Negative film holds lots of highlight detail. When in doubt, give it more light."},
  {q:"A histogram crammed against the right edge means…", o:["Underexposed","Highlights are clipped to white","Perfect exposure"], a:1, w:"Right is bright. Piled against the edge means detail is lost."},
  {q:"When is golden hour?", o:["Around midday","The hour after sunrise and before sunset","After dark"], a:1, w:"Low sun gives warm, soft light."},
  {q:"Soft light comes from…", o:["A small, bright source","A large source, like a cloudy sky","Any flash"], a:1, w:"The bigger the light relative to the subject, the softer the shadows."},
  {q:"To blur a waterfall in bright daylight you'd probably need…", o:["An ND filter","A UV filter","A higher ISO"], a:0, w:"ND filters cut light so you can use long shutter speeds in daylight."},
  {q:"RAW files…", o:["Are ready to share straight away","Hold more data for editing","Are smaller than JPEGs"], a:1, w:"RAW keeps everything the sensor captured, giving you more room to adjust."},
  {q:"Which gives MORE background blur?", o:["Stepping further away","Getting closer to the subject","Using f/16"], a:1, w:"Depth of field gets shallower the closer you focus."},
  {q:"The rule of thirds suggests putting the horizon…", o:["In the exact centre","A third of the way up or down","Right at the edge"], a:1, w:"Thirds placement usually feels more balanced than splitting the frame in half."},
  {q:"What does B on the mode or shutter dial mean?", o:["Burst","Bulb: open as long as you hold the button","Balanced"], a:1, w:"Bulb is for exposures longer than the camera's longest timed speed."},
  {q:"What does a camera's light meter assume the scene averages to?", o:["Pure white","Middle grey","Black"], a:1, w:"That's why very bright or very dark scenes fool it."},
  {q:"Which causes the WHOLE photo to be smeared in one direction?", o:["Camera shake","Missed focus","High ISO"], a:0, w:"If everything is blurred the same way, the camera moved."},
  {q:"Which mode is best for a night city scene on a tripod?", o:["S at 1/500","M with a long shutter and low ISO","Auto with flash"], a:1, w:"Steady light and a tripod are perfect for manual mode."}
];
var quiz = {started:false};
function shuffle(a){ for(var i = a.length - 1; i > 0; i--){ var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
function quizStart(){
  quiz.started = true;
  quiz.qs = shuffle(QUESTIONS.slice()).slice(0, 12).map(function(q){
    var idx = shuffle(q.o.map(function(_, i){ return i; }));
    return {q:q.q, o:idx.map(function(i){ return q.o[i]; }), a:idx.indexOf(q.a), w:q.w};
  });
  quiz.i = 0; quiz.score = 0;
  quizRender();
}
function quizRender(){
  var box = $("#quizBox");
  if(quiz.i >= quiz.qs.length){
    var best = Math.max(store.get("goa-quiz-best", 0), quiz.score);
    store.set("goa-quiz-best", best);
    var msg = quiz.score >= 11 ? "Brilliant. You know your stuff." : quiz.score >= 8 ? "Solid. A quick look back at a lesson or two and you'll nail it." : "Good start. Revisit Exposure basics and the Mode dial, then try again.";
    box.innerHTML = '<div class="lcd"><span class="lab">your score</span><span class="big">' + quiz.score + ' / ' + quiz.qs.length + '</span></div>' +
      '<p style="margin-top:14px">' + msg + '</p><p class="small">Best score on this device: ' + best + ' / 12</p>' +
      '<button type="button" class="btn" id="quizAgain">Try another 12</button>';
    $("#quizAgain").addEventListener("click", quizStart);
    return;
  }
  var q = quiz.qs[quiz.i];
  box.innerHTML = '<div class="small">Question ' + (quiz.i + 1) + ' of ' + quiz.qs.length + ' · Score ' + quiz.score + '</div>' +
    '<div class="progress" style="margin-top:6px"><div style="width:' + (quiz.i / quiz.qs.length * 100) + '%"></div></div>' +
    '<p class="quiz-q">' + q.q + '</p><div class="quiz-opts">' +
    q.o.map(function(o, i){ return '<button type="button" data-i="' + i + '">' + o + '</button>'; }).join("") +
    '</div><div class="quiz-explain" id="quizExplain"></div>';
  $$(".quiz-opts button", box).forEach(function(b){
    b.addEventListener("click", function(){
      var pick = +b.dataset.i, right = pick === q.a;
      if(right) quiz.score++;
      $$(".quiz-opts button", box).forEach(function(x){
        x.disabled = true;
        if(+x.dataset.i === q.a) x.classList.add("right");
        else if(x === b) x.classList.add("wrong");
      });
      $("#quizExplain").innerHTML = '<p><strong>' + (right ? "Correct." : "Not quite.") + '</strong> ' + q.w + '</p><button type="button" class="btn" id="quizNext">' + (quiz.i === quiz.qs.length - 1 ? "See your score" : "Next question") + '</button>';
      $("#quizNext").addEventListener("click", function(){ quiz.i++; quizRender(); });
      $("#quizNext").focus();
    });
  });
}

/* ---------- Challenges ---------- */
var CHAL = [
  "Shoot one object at your widest aperture and at f/11. Compare the backgrounds.",
  "Photograph moving water or traffic at 1/1000, 1/60 and 1/4.",
  "Take the same indoor shot at ISO 200, 1600 and 6400. Zoom in on the noise.",
  "Spend the day in A mode. Note when the shutter speed gets too slow to hold.",
  "Spend the day in S mode photographing anything that moves.",
  "Use only one focal length all day. Zoom with your feet.",
  "Photograph the same scene at golden hour and at midday.",
  "Take a portrait by a window with the light from the side.",
  "Find five leading lines and use each to lead to a subject.",
  "Put the horizon on the lower third, then the upper third. Which works better?",
  "Shoot a backlit subject: once as a silhouette, once exposed for the subject.",
  "Fill the frame: take ten photos where the subject touches the edges.",
  "Photograph something from ground level and from directly above.",
  "Use exposure compensation: shoot something white at +1 and something dark at −1.",
  "Try white balance on Tungsten outdoors and Daylight indoors. Note the colours.",
  "Shoot a full scene in M mode, centring the meter yourself.",
  "Practise panning: follow a moving car or cyclist at 1/30.",
  "Take a photo using a doorway, window or branches as a frame.",
  "Photograph a pattern, then one where something breaks the pattern.",
  "Use continuous AF and burst mode on a pet or child playing.",
  "Do a night shot on a tripod (or braced) with a 2-second timer.",
  "Find symmetry and shoot it dead centre.",
  "Take a close-up where the subject fills the whole frame.",
  "Photograph the same person with a 24mm view up close and a 85mm view from further back.",
  "Tell a story in three photos: a wide scene, a medium shot, a detail.",
  "Shoot only in black and white for a day. Look for light and shape.",
  "Edit five photos using the editing order in the lesson. Don't overdo it.",
  "Use negative space: a small subject in a big empty area.",
  "Try back-button focus for a whole day.",
  "Pick your ten best photos from the month and share them."
];
var chalDone = store.get("goa-chal", {});
var chalList = $("#chalList");
chalList.innerHTML = CHAL.map(function(c, i){
  return '<li><label><input type="checkbox" data-c="' + i + '"' + (chalDone[i] ? " checked" : "") + '><span class="day">Day ' + (i + 1) + '</span><span>' + c + '</span></label></li>';
}).join("");
function chalCount(){
  var n = Object.keys(chalDone).length;
  $("#chalBar").style.width = (n / CHAL.length * 100) + "%";
  $("#chalCount").textContent = n + " of " + CHAL.length + " done" + (n === CHAL.length ? ". Challenge complete!" : "");
}
chalList.addEventListener("change", function(e){
  var c = e.target.dataset.c; if(c === undefined) return;
  if(e.target.checked) chalDone[c] = 1; else delete chalDone[c];
  store.set("goa-chal", chalDone); chalCount();
});
$("#chalReset").addEventListener("click", function(){
  if(!confirm("Clear all your ticks?")) return;
  chalDone = {}; store.set("goa-chal", chalDone);
  $$("#chalList input").forEach(function(i){ i.checked = false; }); chalCount();
});
chalCount();

/* ---------- Glossary ---------- */
var GLOSS = [
  ["AE lock","Locks the exposure reading so you can recompose without the brightness changing. Often a button marked AE-L or *."],
  ["AF","Autofocus."],
  ["Angle of view","How much of the scene the lens sees, set by focal length and sensor size."],
  ["Aperture","The adjustable opening in the lens, written as an f-number. Controls light and depth of field."],
  ["APS-C","A sensor size smaller than full frame, with a 1.5× or 1.6× crop factor."],
  ["Aspect ratio","The shape of the photo: 3:2 for most cameras, 4:3 for phones and Micro Four Thirds, 1:1 square."],
  ["Auto ISO","The camera raises ISO only as much as needed, within limits you set."],
  ["Back-button focus","Moving autofocus from the shutter button to a rear button like AF-ON."],
  ["Blue hour","The deep-blue twilight just after sunset or before sunrise."],
  ["Bokeh","The quality of the out-of-focus blur in a photo, especially how background lights render."],
  ["Bracketing","Taking several shots at different exposures to be sure one is right, or to merge into HDR."],
  ["Bulb (B)","Shutter stays open as long as the button is held."],
  ["Burst","Continuous shooting: many frames per second while the button is held."],
  ["C-41","The standard developing process for colour negative film."],
  ["Chromatic aberration","Coloured fringes along high-contrast edges, usually purple or green. Easily fixed in editing."],
  ["Clipping","When highlights are pure white or shadows pure black, with no detail left."],
  ["Composition","How elements are arranged in the frame."],
  ["Crop factor","How much a smaller sensor narrows a lens's view compared with full frame."],
  ["Depth of field (DoF)","How much of the scene, front to back, looks sharp."],
  ["Diffraction","Slight softening at very small apertures like f/16–f/22."],
  ["Dioptre","Viewfinder adjustment to suit your eyesight."],
  ["Dynamic range","The span from darkest to brightest a camera can record with detail."],
  ["E-6","The developing process for colour slide film."],
  ["EV","Exposure value: a number for a combination of aperture and shutter. One EV is one stop."],
  ["EVF","Electronic viewfinder, found on mirrorless cameras."],
  ["Exposure","How much light reaches the sensor or film, and so how bright the photo is."],
  ["Exposure compensation","Telling the camera to make the photo brighter or darker than it would choose."],
  ["Exposure triangle","Aperture, shutter speed and ISO: the three controls of exposure."],
  ["f-number / f-stop","How aperture is written: the focal length divided by the opening's diameter."],
  ["Fill flash","A little flash used in daylight to brighten shadows."],
  ["Flare","Streaks or haze from bright light hitting the lens. A lens hood reduces it."],
  ["Focal length","The lens's 'zoom' in millimetres. Smaller is wider, bigger is closer."],
  ["Focus peaking","Highlights in-focus edges in colour to help manual focusing."],
  ["Full frame","A sensor the size of a 35mm film frame, 36 × 24mm."],
  ["Golden hour","The warm, low light around sunrise and sunset."],
  ["Grain","The texture of film, similar to digital noise but usually more pleasing."],
  ["HDR","High dynamic range: combining several exposures to keep detail in brights and darks."],
  ["Histogram","A graph of the tones in a photo, dark on the left to bright on the right."],
  ["Hot shoe","Mount on top of the camera for a flash or accessory."],
  ["HSS","High-speed sync: lets flash work at shutter speeds faster than the sync speed."],
  ["Hyperfocal distance","The focus distance that gives the most depth of field, sharp from half that distance to infinity."],
  ["IBIS","In-body image stabilisation: the sensor moves to counter shake."],
  ["ISO","How sensitive the sensor (or film) is to light."],
  ["JPEG","A finished, compressed image file ready to share."],
  ["Kelvin (K)","The scale used for colour temperature of light: low is warm, high is cool."],
  ["Leading lines","Lines in a scene that draw the eye towards the subject."],
  ["Light meter","Measures brightness and suggests exposure settings."],
  ["Live view","Using the rear screen to frame the photo."],
  ["Long exposure","A shutter speed of a second or longer, used to blur motion."],
  ["Macro","Close-up photography, often at life size (1:1) or more."],
  ["Metering mode","How the camera reads the light: matrix, centre-weighted or spot."],
  ["Mirrorless","Interchangeable-lens camera without a mirror, using an electronic viewfinder or screen."],
  ["Mount","The connection between lens and camera body. Lenses must match the mount."],
  ["ND filter","Neutral density filter: dark glass that cuts light for long exposures."],
  ["Negative space","Empty area around a subject, used deliberately."],
  ["Noise","Speckles and grain in digital photos, especially at high ISO."],
  ["Overexposed","Too bright, with lost highlight detail."],
  ["Panning","Following a moving subject with the camera during a slowish exposure."],
  ["Polariser","A filter that deepens blue skies and cuts reflections."],
  ["Prime lens","A lens with one fixed focal length."],
  ["Push / pull","Rating film faster or slower than its box speed, then adjusting development."],
  ["RAW","An unprocessed file with all the sensor's data, for editing."],
  ["Reciprocity failure","Film becoming less sensitive in very long exposures, needing extra time."],
  ["Rule of thirds","Placing key elements along lines a third of the way into the frame."],
  ["Sensor","The light-sensitive chip that records the image in a digital camera."],
  ["Shutter speed","How long the shutter stays open."],
  ["Silhouette","A subject shown as a dark shape against a bright background."],
  ["SLR / DSLR","Single-lens reflex: a camera with a mirror that shows the view through the lens. D for digital."],
  ["Split-image focusing","A circle in some film viewfinders that splits an edge until it's in focus."],
  ["Spot metering","Measuring light from a tiny spot only."],
  ["Stop","A doubling or halving of light."],
  ["Sync speed","The fastest shutter speed that works with normal flash, usually around 1/200–1/250."],
  ["Telephoto","A long focal length that brings distant subjects close."],
  ["Underexposed","Too dark, with lost shadow detail."],
  ["Vignetting","Darkening at the corners of a photo, from the lens or added in editing."],
  ["White balance (WB)","Correcting the colour of light so whites look white."],
  ["Wide angle","A short focal length that shows a broad view."],
  ["Zone focusing","Pre-setting focus and aperture so a range of distances is sharp without refocusing."],
  ["Zoom lens","A lens with a range of focal lengths."]
];
var glossList = $("#glossList");
function drawGloss(){
  var q = $("#glossSearch").value.trim().toLowerCase();
  var items = GLOSS.filter(function(g){ return !q || g[0].toLowerCase().indexOf(q) > -1 || g[1].toLowerCase().indexOf(q) > -1; });
  glossList.innerHTML = items.length ? items.map(function(g){ return "<dt>" + g[0] + "</dt><dd>" + g[1] + "</dd>"; }).join("") : '<dd class="small">No terms match. Try a shorter word.</dd>';
}
$("#glossSearch").addEventListener("input", drawGloss); drawGloss();

/* ---------- Depth of field ---------- */
function drawDof(){
  var c = +$("#dofSensor").value, f = +$("#dofF").value, N = +$("#dofN").value, dm = +$("#dofD").value;
  if(!(f > 0) || !(dm > 0)) return;
  var s = dm * 1000, H = f * f / (N * c) + f;
  var near = s * (H - f) / (H + s - 2 * f);
  var far = s < H ? s * (H - f) / (H - s) : Infinity;
  near /= 1000; far /= 1000;
  $("#dofNear").textContent = fmtM(near);
  $("#dofFar").textContent = fmtM(far);
  $("#dofTot").textContent = isFinite(far) ? fmtM(far - near) : "∞";
  var Hm = H / 1000;
  var maxD = isFinite(far) ? Math.max(far * 1.25, dm * 1.6) : Math.max(dm * 2, Hm * 1.5);
  function X(d){ return 10 + Math.min(1, d / maxD) * 280; }
  var x1 = X(near), x2 = isFinite(far) ? X(far) : 290;
  $("#dofZone").setAttribute("x", x1.toFixed(1));
  $("#dofZone").setAttribute("width", Math.max(2, x2 - x1).toFixed(1));
  $("#dofSubj").setAttribute("cx", X(dm).toFixed(1));
  $("#dofScaleEnd").textContent = isFinite(far) ? fmtM(maxD) : "to infinity";
  $("#dofHyper").textContent = "Hyperfocal distance at these settings: " + fmtM(Hm) + ". Focus there and everything from about " + fmtM(Hm / 2) + " to infinity will be acceptably sharp. Handy for landscapes.";
}
["#dofSensor","#dofF","#dofN","#dofD"].forEach(function(id){ $(id).addEventListener("input", drawDof); $(id).addEventListener("change", drawDof); });
drawDof();

/* ---------- Exposure swap & ND ---------- */
var EX_ISO = [50,100,200,400,800,1600,3200,6400,12800];
var apFmt = function(v){ return "f/" + v; };
fillSelect($("#exA1"), APS, apFmt, 4);
fillSelect($("#exA2"), APS, apFmt, 1);
fillSelect($("#exS1"), SHS, fmtSh, 5);
fillSelect($("#exI1"), EX_ISO, String, 2);
fillSelect($("#exI2"), EX_ISO, String, 2);
fillSelect($("#ndBase"), SHS, fmtSh, 6);
function drawEx(){
  var N1 = APS[$("#exA1").value], t1 = SHS[$("#exS1").value], I1 = EX_ISO[$("#exI1").value];
  var N2 = APS[$("#exA2").value], I2 = EX_ISO[$("#exI2").value];
  var t2 = t1 * (N2 * N2) / (N1 * N1) * (I1 / I2);
  $("#exOut").textContent = fmtTime(t2);
  var note = "";
  if(t2 < 1/8000) note = "That's faster than most cameras can go. Use a narrower aperture or lower ISO.";
  else if(t2 > 1/30 && t2 < 1) note = "Slow enough that you'll want a steady hand or a rest.";
  else if(t2 >= 1) note = "Use a tripod. Above 30 seconds you'll need Bulb mode.";
  $("#exNote").textContent = note;
  var tb = SHS[$("#ndBase").value], stops = +$("#ndStops").value;
  $("#ndOut").textContent = fmtTime(tb * Math.pow(2, stops));
}
["#exA1","#exS1","#exI1","#exA2","#exI2","#ndBase","#ndStops"].forEach(function(id){ $(id).addEventListener("change", drawEx); });
drawEx();

/* ---------- Sunny 16 ---------- */
var S16_SH = [1/4000,1/2000,1/1000,1/500,1/250,1/125,1/60,1/30,1/15,1/8];
function drawS16(){
  var iso = +$("#s16Iso").value, n = +$("#s16Light").value;
  var ai = APS.indexOf(n), si = 0, bestD = Infinity;
  S16_SH.forEach(function(t, i){ var d = Math.abs(log2(t * iso)); if(d < bestD){ bestD = d; si = i; } });
  var combos = [];
  for(var k = -3; k <= 3; k++){
    var a = ai - k, s = si - k;
    if(k !== 0 && a >= 0 && a < APS.length && s >= 0 && s < S16_SH.length) combos.push("f/" + APS[a] + " at " + fmtSh(S16_SH[s]));
  }
  $("#s16Out").innerHTML =
    '<div class="lcd"><div class="lcd-row"><span class="val"><small>f</small>' + n + '</span><span class="val"><small>shutter</small>' + fmtSh(S16_SH[si]) + '</span><span class="val"><small>ISO</small>' + iso + '</span></div></div>' +
    '<p class="small" style="margin:8px 0 0">These give the same exposure; pick whichever suits the shot: ' + combos.join(", ") + '.</p>';
}
$("#s16Iso").addEventListener("change", drawS16); $("#s16Light").addEventListener("change", drawS16); drawS16();

/* ---------- Night sky ---------- */
function drawNpf(){
  var parts = $("#npfSensor").value.split("|"), cropF = +parts[0], width = +parts[1];
  var mp = +$("#npfMp").value, f = +$("#npfF").value, N = +$("#npfN").value;
  if(!(mp > 0) || !(f > 0)) return;
  var hpx = Math.sqrt(mp * 1e6 * 1.5);
  var pitch = width * 1000 / hpx;
  var npf = (35 * N + 30 * pitch) / f;
  $("#npfOut").textContent = npf.toFixed(1) + " s";
  $("#r500Out").textContent = (500 / (f * cropF)).toFixed(1) + " s";
}
["#npfSensor","#npfMp","#npfF","#npfN"].forEach(function(id){ $(id).addEventListener("input", drawNpf); $(id).addEventListener("change", drawNpf); });
drawNpf();

/* ---------- Reciprocity ---------- */
function drawRec(){
  var p = +$("#recFilm").value, t = +$("#recT").value;
  if(!(t > 0)) return;
  $("#recOut").textContent = t <= 0.5 ? fmtTime(t) + " (no correction)" : fmtTime(Math.pow(t, p));
}
$("#recFilm").addEventListener("change", drawRec); $("#recT").addEventListener("input", drawRec); drawRec();

/* ---------- Start ---------- */
renderToc(); syncMarks();
var startId = location.hash.slice(1) || "home";
if(!byId[startId]) startId = "home";
current = startId;
sections.forEach(function(s){ s.hidden = s.id !== startId; });
history.replaceState(null, "", "#" + startId);
show(startId, false);

})();
