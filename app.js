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
/* Draws the garden scene. pre = id prefix, so copies of the scene can be drawn elsewhere */
function renderScene(pre, wrap, p){
  var L = LIGHTS[p.light], g = function(id){ return document.getElementById(pre + id); };
  g("skyTop").setAttribute("stop-color", L.sky[0]);
  g("skyBot").setAttribute("stop-color", L.sky[1]);
  g("simSun").setAttribute("fill", L.sun);
  g("win1").setAttribute("fill", L.win); g("win2").setAttribute("fill", L.win);
  var bright = Math.max(0.04, Math.min(8, Math.pow(2, p.off * 0.75)));
  wrap.style.filter = "brightness(" + bright.toFixed(3) + ")" + (p.off > 1 ? " contrast(" + Math.max(0.6, 1 - (p.off - 1) * 0.12).toFixed(2) + ")" : "");
  g("bgBlur").setAttribute("stdDeviation", (9 / p.N).toFixed(2));
  g("moveBlur").setAttribute("stdDeviation", Math.min(30, p.t * 700).toFixed(2) + " 0");
  g("shakeBlur").setAttribute("stdDeviation", (p.shake || 0).toFixed(2));
  g("noise").setAttribute("opacity", Math.min(0.55, log2(p.iso / 100) * 0.075).toFixed(3));
}
var SCENE_SRC = $("#simFilter").innerHTML;
function cloneScene(pre){
  return SCENE_SRC.replace(/id="([^"]+)"/g, 'id="' + pre + '$1"').replace(/url\(#([^)]+)\)/g, "url(#" + pre + "$1)");
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

  var shake = (!st.tripod && t >= 1/30) ? Math.min(5, 1 + log2(t * 30) * 1.1) : 0;
  renderScene("", $("#simFilter"), {light:st.light, N:N, t:t, iso:iso, off:off, shake:shake});
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

/* ---------- Helpers for new features ---------- */
function svgPt(svg, e){
  var pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
  var m = svg.getScreenCTM();
  return m ? pt.matrixTransform(m.inverse()) : {x:0, y:0};
}

/* ---------- Where it is on your camera ---------- */
$$("#brandSeg button").forEach(function(b){
  b.addEventListener("click", function(){
    $$("#brandSeg button").forEach(function(x){ x.setAttribute("aria-pressed", x === b); });
    var col = b.dataset.b === "all" ? -1 : +b.dataset.b;
    $$("#brandTable tr").forEach(function(tr){
      Array.prototype.forEach.call(tr.children, function(cell, i){
        cell.classList.toggle("hl", col > 0 && i === col);
        cell.classList.toggle("dim", col > 0 && i > 0 && i !== col);
      });
    });
  });
});

/* ---------- Video shutter & ND helper ---------- */
function drawVid(){
  var fps = +$("#vidFps").value, N = +$("#vidAp").value, ev = +$("#vidLight").value;
  var dens = [50,60,100,125,200,250], target = fps * 2, den = dens[0];
  dens.forEach(function(d){ if(Math.abs(d - target) < Math.abs(den - target)) den = d; });
  $("#vidSh").textContent = "1/" + den;
  var stops = ev - log2(den) - log2(N * N);
  var r = Math.round(stops);
  if(stops <= 0.4){
    $("#vidNd").textContent = "None";
    $("#vidNote").textContent = stops < -0.4 ? "There's not enough light: raise ISO by about " + Math.round(-stops) + " stop" + (Math.round(-stops) === 1 ? "" : "s") + ", or open the aperture wider." : "The light is about right without a filter.";
  } else {
    $("#vidNd").textContent = r + " stop" + (r === 1 ? "" : "s");
    $("#vidNote").textContent = "That's roughly an ND" + Math.pow(2, r) + " filter. A variable ND covering 2–8 stops handles most daylight. If your camera's lowest ISO is higher than 100, you'll need a bit more.";
  }
}
["#vidFps","#vidAp","#vidLight"].forEach(function(id){ $(id).addEventListener("change", drawVid); });
drawVid();

/* ---------- Guess the settings ---------- */
var G_AP = [1, 6], G_SH = [2, 7], G_ISO = [0, 6];
var G_COMBOS = [];
[0,1].forEach(function(a){ [0,1].forEach(function(s){ [0,1].forEach(function(i){ G_COMBOS.push([a, s, i]); }); }); });
$("#guessWrap").innerHTML = cloneScene("g_");
var gz = {round:0, score:0, total:10};
function gLabel(c){ return "f/" + APS[G_AP[c[0]]] + " · " + fmtSh(PG_SHS[G_SH[c[1]]]) + " · ISO " + ISOS[G_ISO[c[2]]]; }
function lightFor(ev){
  var best = "sun", d = Infinity;
  Object.keys(LIGHTS).forEach(function(k){ var x = Math.abs(LIGHTS[k].ev - ev); if(x < d){ d = x; best = k; } });
  return best;
}
function guessRound(){
  var box = $("#guessBox");
  if(gz.round >= gz.total){
    box.innerHTML = '<div class="lcd"><span class="lab">your score</span><span class="big">' + gz.score + ' / ' + gz.total + '</span></div>' +
      '<p style="margin-top:12px">' + (gz.score >= 9 ? "You read photos like a pro." : gz.score >= 6 ? "Nice work. Look closely at the grain and the background." : "Keep at it. Check the clues box below the photo, then try again.") + '</p>' +
      '<button type="button" class="btn" id="gAgain">Play again</button>';
    $("#gAgain").addEventListener("click", function(){ gz.round = 0; gz.score = 0; guessRound(); });
    return;
  }
  var truth = G_COMBOS[Math.floor(Math.random() * 8)];
  var others = shuffle(G_COMBOS.filter(function(c){ return c !== truth; })).slice(0, 2);
  var opts = shuffle([truth].concat(others));
  var N = APS[G_AP[truth[0]]], t = PG_SHS[G_SH[truth[1]]], iso = ISOS[G_ISO[truth[2]]];
  var ev = log2(N * N / t) - log2(iso / 100);
  var light = lightFor(ev);
  renderScene("g_", $("#guessWrap"), {light:light, N:N, t:t, iso:iso, off:0, shake:0});
  $("#guessLight").textContent = "Light: " + LIGHTS[light].label + ". Camera on a tripod.";
  box.innerHTML = '<div class="small">Photo ' + (gz.round + 1) + ' of ' + gz.total + ' · Score ' + gz.score + '</div>' +
    '<p class="quiz-q" style="margin-bottom:4px">Which settings took this photo?</p>' +
    '<div class="opt-list">' + opts.map(function(c, i){ return '<button type="button" data-i="' + i + '">' + gLabel(c) + '</button>'; }).join("") + '</div><div id="gExplain"></div>';
  $$(".opt-list button", box).forEach(function(b){
    b.addEventListener("click", function(){
      var pick = opts[+b.dataset.i], right = pick === truth;
      if(right) gz.score++;
      $$(".opt-list button", box).forEach(function(x){
        x.disabled = true;
        if(opts[+x.dataset.i] === truth) x.classList.add("right");
        else if(x === b) x.classList.add("wrong");
      });
      var clues = [
        truth[0] === 0 ? "The background is soft, so the aperture was wide (f/" + N + ")." : "The background is sharp, so the aperture was narrow (f/" + N + ").",
        truth[1] === 0 ? "The ball is frozen, so the shutter was fast (" + fmtSh(t) + ")." : "The ball is smeared, so the shutter was slow (" + fmtSh(t) + ").",
        truth[2] === 0 ? "The photo is clean, so ISO was low (" + iso + ")." : "The photo is grainy, so ISO was high (" + iso + ")."
      ];
      $("#gExplain").innerHTML = '<p style="margin-top:12px"><strong>' + (right ? "Correct!" : "Not quite.") + '</strong></p><ul class="feedback">' +
        clues.map(function(c){ return "<li>" + c + "</li>"; }).join("") + '</ul>' +
        '<button type="button" class="btn" id="gNext" style="margin-top:12px">' + (gz.round === gz.total - 1 ? "See your score" : "Next photo") + '</button>';
      $("#gNext").addEventListener("click", function(){ gz.round++; guessRound(); });
    });
  });
}
guessRound();

/* ---------- Spot the mistake ---------- */
function person(x, y, s, shirt){
  return '<g transform="translate(' + x + ' ' + y + ') scale(' + s + ')">' +
    '<rect x="-14" y="-70" width="11" height="70" rx="4" fill="#2E3A48"/><rect x="3" y="-70" width="11" height="70" rx="4" fill="#2E3A48"/>' +
    '<path d="M-26 -68 L-23 -150 Q0 -160 23 -150 L26 -68Z" fill="' + shirt + '"/>' +
    '<rect x="-6" y="-168" width="12" height="14" fill="#D9A07A"/><circle cy="-185" r="24" fill="#E3B08C"/>' +
    '<path d="M-25 -188 Q-24 -214 0 -212 Q24 -214 25 -188 Q18 -202 0 -203 Q-18 -202 -25 -188Z" fill="#4A3426"/></g>';
}
var fence = "";
for(var fx = 8; fx < 600; fx += 28){ fence += '<path d="M' + fx + ' 290 V182 l8 -10 l8 10 V290Z" fill="#F4EFE4" stroke="#8A7F6E" stroke-width="1.5"/>'; }
var flowers = "";
for(var fl = 20; fl < 600; fl += 34){ flowers += '<circle cx="' + fl + '" cy="' + (300 + (fl % 3) * 6) + '" r="7" fill="' + ["#E0574A","#F2C14E","#B06AC9"][fl % 3] + '"/>'; }
var SPOT = [
  {title:"The horizon is tilted", hint:"Look at the line where the sea meets the sky.",
   why:"A sloping sea makes the whole photo feel like it's sliding off the page. Turn on your camera's grid or electronic level, or straighten it when editing.",
   regions:[[0,140,600,130]],
   svg:'<rect width="600" height="400" fill="#8EC3E6"/><g transform="rotate(-7 300 200)"><g fill="#fff" opacity=".9"><ellipse cx="130" cy="80" rx="60" ry="16"/><ellipse cx="470" cy="70" rx="50" ry="13"/></g><rect x="-200" y="205" width="1000" height="400" fill="#2F6E94"/><rect x="-200" y="203" width="1000" height="4" fill="#9FC9DF"/><g transform="translate(360 236)"><path d="M-26 10 H26 L18 22 H-18Z" fill="#2A2420"/><path d="M0 8 V-44 L24 6Z" fill="#FBF3E4"/><path d="M-3 8 V-34 L-20 6Z" fill="#E6D6B8"/></g></g>'},
  {title:"A lamp post is growing out of their head", hint:"Look directly behind the person.",
   why:"Background objects lined up with a head look like antlers or poles sprouting out. Take one step sideways, or change your height, before you press the shutter.",
   regions:[[250,20,100,180]],
   svg:'<rect width="600" height="400" fill="#BFDDEF"/><rect y="250" width="600" height="150" fill="#7DA75E"/><g fill="#4F7A48"><circle cx="80" cy="245" r="45"/><circle cx="520" cy="240" r="55"/></g><rect x="296" y="40" width="8" height="230" fill="#3C4248"/><path d="M280 40 h40 l-6 -14 h-28z" fill="#3C4248"/><circle cx="300" cy="44" r="6" fill="#FFE38A"/>' + person(300, 395, 1.25, "#C8433A")},
  {title:"The sky is blown out to pure white", hint:"Is there any detail at the top of the photo?",
   why:"The sky has clipped to white, and no editing can bring it back. Use about −0.7 exposure compensation, watch for the highlight 'blinkies', or shoot with the sun behind you.",
   regions:[[0,0,600,175]],
   svg:'<rect width="600" height="400" fill="#FFFFFF"/><path d="M0 210 Q150 150 300 190 T600 170 V400 H0Z" fill="#6E9460"/><path d="M0 260 Q200 230 400 270 T600 260 V400 H0Z" fill="#557A48"/><g transform="translate(450 250)"><rect x="-6" y="0" width="12" height="60" fill="#5A4636"/><circle cy="-10" r="40" fill="#3F6B4A"/></g><path d="M0 400 L260 262 L300 262 L330 400Z" fill="#C9B48A"/>'},
  {title:"Their feet are cut off at the ankles", hint:"Check the bottom edge of the frame.",
   why:"Cropping right at a joint (ankles, knees, wrists) looks like a mistake. Either include the feet with a little space below, or frame higher, around the thighs or waist.",
   regions:[[190,320,220,80]],
   svg:'<rect width="600" height="400" fill="#E9DCC8"/><g stroke="#D4C3A8" stroke-width="2"><line x1="0" y1="90" x2="600" y2="90"/><line x1="0" y1="180" x2="600" y2="180"/><line x1="0" y1="270" x2="600" y2="270"/></g><rect x="420" y="70" width="110" height="140" fill="#9EB8C8" stroke="#7D6A52" stroke-width="6"/>' + person(300, 470, 1.9, "#2F6E94")},
  {title:"The focus missed the person", hint:"Which part of the photo is actually sharp?",
   why:"The fence behind is crisp but the person is blurry, so the camera focused on the background. Use a single focus point on the eye, or turn on face and eye detection.",
   regions:[[230,95,140,305]],
   svg:'<defs><filter id="spBlur" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="6"/></filter></defs><rect width="600" height="400" fill="#CFE6F2"/><rect y="230" width="600" height="170" fill="#7DA75E"/>' + fence + '<rect y="205" width="600" height="8" fill="#E2DACB"/><rect y="255" width="600" height="8" fill="#E2DACB"/>' + flowers + '<g filter="url(#spBlur)">' + person(300, 400, 1.3, "#7B4FA0") + '</g>'},
  {title:"A bright bin is stealing the attention", hint:"What bright thing near the edge keeps pulling your eye?",
   why:"Our eyes jump to the brightest, most colourful thing in the frame. Move a few steps, zoom in a little, or reframe to leave distractions out.",
   regions:[[495,265,105,135]],
   svg:'<rect width="600" height="400" fill="#9CCBEA"/><rect y="190" width="600" height="70" fill="#3D7FA3"/><path d="M0 250 Q300 235 600 255 V400 H0Z" fill="#E6D3A6"/>' + person(250, 375, 1, "#2A7F62") + '<rect x="520" y="292" width="62" height="92" rx="4" fill="#FF7A1A"/><rect x="512" y="282" width="78" height="14" rx="3" fill="#E8600A"/><rect x="536" y="320" width="30" height="20" fill="#FFFFFF"/>'},
  {title:"The cyclist has no room to ride into", hint:"Where is the moving subject heading?",
   why:"The rider is about to leave the frame, which feels cramped and unsettling. Leave space in front of moving subjects, in the direction they're travelling or looking.",
   regions:[[470,220,130,170]],
   svg:'<rect width="600" height="400" fill="#BFE0F0"/><rect y="230" width="600" height="80" fill="#8DB66E"/><rect y="300" width="600" height="70" fill="#5B6168"/><g stroke="#F2F2F2" stroke-width="4" stroke-dasharray="26 22"><line x1="0" y1="336" x2="600" y2="336"/></g><rect y="370" width="600" height="30" fill="#8DB66E"/><g fill="#5C8A4A"><circle cx="90" cy="226" r="34"/><circle cx="210" cy="222" r="28"/></g>' +
     '<g transform="translate(545 345)"><circle cx="-30" cy="0" r="22" fill="none" stroke="#222" stroke-width="5"/><circle cx="30" cy="0" r="22" fill="none" stroke="#222" stroke-width="5"/><path d="M-30 0 L-5 -30 L20 -30 L30 0 M-5 -30 L0 0 L-30 0" stroke="#C8433A" stroke-width="5" fill="none"/><path d="M-6 -34 L4 -76" stroke="#2F6E94" stroke-width="16" stroke-linecap="round"/><circle cx="12" cy="-90" r="12" fill="#E3B08C"/><path d="M-1 -96 Q12 -112 27 -94Z" fill="#E0574A"/><path d="M4 -70 L22 -40" stroke="#2F6E94" stroke-width="8" stroke-linecap="round"/><path d="M-4 -40 L10 -14 L0 0" stroke="#2E3A48" stroke-width="9" fill="none" stroke-linecap="round"/></g>'},
  {title:"Red-eye from the flash", hint:"Look closely at the eyes.",
   why:"Flash right beside the lens bounces off the back of the eye. Bounce the flash off a ceiling, turn on more room lights, or skip flash and raise ISO.",
   regions:[[190,155,220,70]],
   svg:'<rect width="600" height="400" fill="#3A3F45"/><ellipse cx="300" cy="235" rx="150" ry="185" fill="#E3B08C"/><path d="M150 190 Q155 45 300 45 Q445 45 450 190 Q425 95 300 100 Q175 95 150 190Z" fill="#4A3426"/>' +
     [240, 360].map(function(cx){ return '<ellipse cx="' + cx + '" cy="190" rx="30" ry="17" fill="#FFFFFF"/><circle cx="' + cx + '" cy="190" r="13" fill="#B8352C"/><circle cx="' + cx + '" cy="190" r="7" fill="#FF4A3A"/><circle cx="' + (cx + 4) + '" cy="186" r="3" fill="#FFFFFF"/>'; }).join("") +
     '<path d="M300 205 Q290 250 300 262 Q310 266 318 258" fill="none" stroke="#B9835F" stroke-width="4"/><path d="M250 305 Q300 335 350 305" fill="none" stroke="#9E4A40" stroke-width="6" stroke-linecap="round"/>'}
];
var sp = {order:[], i:0, score:0, answered:false, tries:0};
var spHost = $("#spotHost");
function spStart(){ sp.order = shuffle(SPOT.map(function(_, i){ return i; })); sp.i = 0; sp.score = 0; spRender(); }
function spRender(){
  $("#spotNext").hidden = true;
  if(sp.i >= SPOT.length){
    $("#spotHead").textContent = "All done";
    spHost.innerHTML = '<svg viewBox="0 0 600 400"><rect width="600" height="400" fill="#1D2226"/><text x="300" y="190" text-anchor="middle" fill="#F0B640" font-size="64" font-family="Archivo, sans-serif" font-weight="800">' + sp.score + ' / ' + SPOT.length + '</text><text x="300" y="240" text-anchor="middle" fill="#9A8A60" font-size="22" font-family="sans-serif">spotted first try</text></svg>';
    $("#spotFb").innerHTML = '<p style="margin-top:12px">' + (sp.score >= 7 ? "Eagle eyes. You'll catch these before you press the shutter." : "These are the most common mistakes in real photos. Now you'll notice them everywhere.") + '</p>';
    $("#spotShow").hidden = true;
    $("#spotNext").hidden = false; $("#spotNext").textContent = "Play again";
    return;
  }
  var s = SPOT[sp.order[sp.i]];
  sp.answered = false; sp.tries = 0;
  $("#spotHead").textContent = "Photo " + (sp.i + 1) + " of " + SPOT.length + " · Score " + sp.score;
  spHost.innerHTML = '<svg viewBox="0 0 600 400" role="img" aria-label="A photo with one mistake. Tap the mistake.">' + s.svg + '<g id="spMark"></g></svg>';
  $("#spotFb").innerHTML = "";
  $("#spotShow").hidden = false;
  $("#spotNext").textContent = sp.i === SPOT.length - 1 ? "See your score" : "Next photo";
  var svg = spHost.querySelector("svg");
  svg.addEventListener("click", function(e){
    if(sp.answered) return;
    var p = svgPt(svg, e), pad = 18;
    var hit = s.regions.some(function(r){ return p.x >= r[0] - pad && p.x <= r[0] + r[2] + pad && p.y >= r[1] - pad && p.y <= r[1] + r[3] + pad; });
    if(hit){ if(sp.tries === 0) sp.score++; spReveal(true); }
    else {
      sp.tries++;
      $("#spotFb").innerHTML = '<p style="margin-top:12px"><strong>Not quite.</strong> ' + (sp.tries >= 2 ? "Hint: " + s.hint : "Look again.") + '</p>';
    }
  });
}
function spReveal(good){
  sp.answered = true;
  var s = SPOT[sp.order[sp.i]];
  $("#spMark").innerHTML = s.regions.map(function(r){ return '<rect class="spot-ring" x="' + (r[0] + 4) + '" y="' + (r[1] + 4) + '" width="' + (r[2] - 8) + '" height="' + (r[3] - 8) + '" rx="14"/>'; }).join("");
  $("#spotFb").innerHTML = '<p style="margin-top:12px"><strong>' + (good ? (sp.tries === 0 ? "Spotted it! " : "Got it. ") : "Here it is: ") + s.title + '.</strong></p><p>' + s.why + '</p>';
  $("#spotShow").hidden = true;
  $("#spotNext").hidden = false;
}
$("#spotShow").addEventListener("click", function(){ if(!sp.answered) spReveal(false); });
$("#spotNext").addEventListener("click", function(){ if(sp.i >= SPOT.length){ spStart(); return; } sp.i++; spRender(); });
spStart();

/* ---------- Flashcards ---------- */
var fcKnown = store.get("goa-flash", {});
var fc = {deck:[], cur:null, flipped:false, side:"term"};
function fcBuild(){
  fc.deck = shuffle(GLOSS.map(function(_, i){ return i; }).filter(function(i){ return !fcKnown[GLOSS[i][0]]; }));
  fcNext();
}
function fcNext(){ fc.cur = fc.deck.length ? fc.deck.shift() : null; fc.flipped = false; fcRender(); }
function fcRender(){
  var n = GLOSS.filter(function(g){ return fcKnown[g[0]]; }).length;
  $("#fcBar").style.width = (n / GLOSS.length * 100) + "%";
  $("#fcProg").textContent = n + " of " + GLOSS.length + " terms known";
  var face = $("#fcFace"), card = $("#fcCard");
  if(fc.cur === null){
    face.className = "fc-face"; face.textContent = "You know them all!";
    $("#fcHint").textContent = "Tap Start over to go again.";
    card.classList.remove("flipped");
    $("#fcAgain").disabled = $("#fcKnow").disabled = true;
    return;
  }
  $("#fcAgain").disabled = $("#fcKnow").disabled = false;
  var g = GLOSS[fc.cur];
  var showTerm = (fc.side === "term") !== fc.flipped;
  face.className = "fc-face" + (showTerm ? "" : " def");
  face.textContent = showTerm ? g[0] : g[1];
  card.classList.toggle("flipped", fc.flipped);
  $("#fcHint").textContent = fc.flipped ? "Did you know it?" : "Tap to flip";
}
function fcFlip(){ if(fc.cur === null) return; fc.flipped = !fc.flipped; fcRender(); }
$("#fcCard").addEventListener("click", fcFlip);
$("#fcCard").addEventListener("keydown", function(e){ if(e.key === " " || e.key === "Enter"){ e.preventDefault(); fcFlip(); } });
$("#fcKnow").addEventListener("click", function(){ if(fc.cur === null) return; fcKnown[GLOSS[fc.cur][0]] = 1; store.set("goa-flash", fcKnown); fcNext(); });
$("#fcAgain").addEventListener("click", function(){ if(fc.cur === null) return; fc.deck.splice(Math.min(fc.deck.length, 4), 0, fc.cur); fcNext(); });
$("#fcReset").addEventListener("click", function(){ if(!confirm("Start over with all the cards?")) return; fcKnown = {}; store.set("goa-flash", fcKnown); fcBuild(); });
$$("#fcSide button").forEach(function(b){
  b.addEventListener("click", function(){
    fc.side = b.dataset.s;
    $$("#fcSide button").forEach(function(x){ x.setAttribute("aria-pressed", x === b); });
    fc.flipped = false; fcRender();
  });
});
fcBuild();

/* ---------- Golden and blue hour ---------- */
var PLACES = [
  ["Sydney", -33.8688, 151.2093, "Australia/Sydney"], ["Melbourne", -37.8136, 144.9631, "Australia/Melbourne"],
  ["Brisbane", -27.4698, 153.0251, "Australia/Brisbane"], ["Perth", -31.9523, 115.8613, "Australia/Perth"],
  ["Adelaide", -34.9285, 138.6007, "Australia/Adelaide"], ["Hobart", -42.8821, 147.3272, "Australia/Hobart"],
  ["Canberra", -35.2809, 149.1300, "Australia/Sydney"], ["Darwin", -12.4634, 130.8456, "Australia/Darwin"],
  ["Auckland", -36.8485, 174.7633, "Pacific/Auckland"], ["Singapore", 1.3521, 103.8198, "Asia/Singapore"],
  ["Tokyo", 35.6762, 139.6503, "Asia/Tokyo"], ["London", 51.5072, -0.1276, "Europe/London"],
  ["Paris", 48.8566, 2.3522, "Europe/Paris"], ["New York", 40.7128, -74.0060, "America/New_York"],
  ["Los Angeles", 34.0522, -118.2437, "America/Los_Angeles"]
];
var DEVICE_TZ = (function(){ try{ return Intl.DateTimeFormat().resolvedOptions().timeZone; }catch(e){ return undefined; } })();
var sunPlace = $("#sunPlace");
sunPlace.innerHTML = PLACES.map(function(p, i){ return '<option value="' + i + '">' + p[0] + '</option>'; }).join("") + '<option value="custom">My location / custom (shown in this device\'s time zone)</option>';
var savedSun = store.get("goa-sun", null);
var sunTz = PLACES[0][3];
function setPlace(i){
  sunPlace.value = String(i);
  if(i === "custom"){ sunTz = DEVICE_TZ; return; }
  var p = PLACES[+i]; $("#sunLat").value = p[1]; $("#sunLng").value = p[2]; sunTz = p[3];
}
if(savedSun && savedSun.place === "custom"){ setPlace("custom"); $("#sunLat").value = savedSun.lat; $("#sunLng").value = savedSun.lng; }
else setPlace(savedSun && PLACES[savedSun.place] ? savedSun.place : 0);
(function(){ var d = new Date(); $("#sunDate").value = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); })();

var SUN = (function(){
  var rad = Math.PI / 180, dayMs = 864e5, J1970 = 2440588, J2000 = 2451545, e = rad * 23.4397, J0 = 0.0009;
  function toDays(date){ return date.valueOf() / dayMs - 0.5 + J1970 - J2000; }
  function fromJulian(j){ return new Date((j + 0.5 - J1970) * dayMs); }
  function declination(l){ return Math.asin(Math.sin(e) * Math.sin(l)); }
  function meanAnomaly(d){ return rad * (357.5291 + 0.98560028 * d); }
  function eclLong(M){ var C = rad * (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M)); return M + C + rad * 102.9372 + Math.PI; }
  function transitJ(ds, M, L){ return J2000 + ds + 0.0053 * Math.sin(M) - 0.0069 * Math.sin(2 * L); }
  return function(date, lat, lng, angles){
    var lw = rad * -lng, phi = rad * lat, d = toDays(date);
    var n = Math.round(d - J0 - lw / (2 * Math.PI));
    var ds = J0 + lw / (2 * Math.PI) + n;
    var M = meanAnomaly(ds), L = eclLong(M), dec = declination(L), Jnoon = transitJ(ds, M, L);
    var out = {noon: fromJulian(Jnoon)};
    angles.forEach(function(h){
      var w = Math.acos((Math.sin(h * rad) - Math.sin(phi) * Math.sin(dec)) / (Math.cos(phi) * Math.cos(dec)));
      var a = J0 + (w + lw) / (2 * Math.PI) + n;
      var Jset = transitJ(a, M, L), Jrise = Jnoon - (Jset - Jnoon);
      out[h] = {rise: fromJulian(Jrise), set: fromJulian(Jset)};
    });
    return out;
  };
})();
function ok(d){ return d && !isNaN(d.getTime()); }
function fmtClock(d){
  if(!ok(d)) return "—";
  try{ return d.toLocaleTimeString([], {timeZone: sunTz, hour: "numeric", minute: "2-digit"}); }
  catch(e){ return d.toLocaleTimeString([], {hour: "numeric", minute: "2-digit"}); }
}
function minsOf(d){
  try{
    var parts = new Intl.DateTimeFormat("en-GB", {timeZone: sunTz, hour: "2-digit", minute: "2-digit", hourCycle: "h23"}).formatToParts(d);
    var h = +parts.filter(function(p){ return p.type === "hour"; })[0].value, m = +parts.filter(function(p){ return p.type === "minute"; })[0].value;
    return h * 60 + m;
  }catch(e){ return d.getHours() * 60 + d.getMinutes(); }
}
function drawSun(){
  var lat = +$("#sunLat").value, lng = +$("#sunLng").value, ds = $("#sunDate").value;
  var out = $("#sunOut"), bar = $("#sunBar");
  if(!ds || !isFinite(lat) || !isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180){ out.innerHTML = '<p class="small">Enter a valid place and date.</p>'; bar.innerHTML = ""; return; }
  store.set("goa-sun", {place: sunPlace.value, lat: lat, lng: lng});
  var y = +ds.slice(0, 4), mo = +ds.slice(5, 7), da = +ds.slice(8, 10);
  var date = new Date(Date.UTC(y, mo - 1, da, 12) - lng / 360 * 864e5);
  var T = SUN(date, lat, lng, [-6, -4, -0.833, 6]);
  function range(a, b){ return ok(a) && ok(b) ? fmtClock(a) + " – " + fmtClock(b) : "Not on this date"; }
  var rows = [
    ["Morning blue hour", range(T[-6].rise, T[-4].rise)],
    ["Morning golden hour", range(T[-4].rise, T[6].rise)],
    ["Sunrise", fmtClock(T[-0.833].rise)],
    ["Solar noon (sun highest)", fmtClock(T.noon)],
    ["Sunset", fmtClock(T[-0.833].set)],
    ["Evening golden hour", range(T[6].set, T[-4].set)],
    ["Evening blue hour", range(T[-4].set, T[-6].set)]
  ];
  var dayLen = ok(T[-0.833].rise) && ok(T[-0.833].set) ? (T[-0.833].set - T[-0.833].rise) / 36e5 : null;
  out.innerHTML = '<div class="sun-list">' + rows.map(function(r){ return "<div><span>" + r[0] + "</span><b>" + r[1] + "</b></div>"; }).join("") + '</div>' +
    (dayLen !== null ? '<p class="small" style="margin:10px 0 0">Daylight: ' + Math.floor(dayLen) + " h " + Math.round((dayLen % 1) * 60) + " min." + (sunPlace.value === "custom" ? " Times are in this device's time zone." : " Times are local to " + PLACES[+sunPlace.value][0] + ".") + "</p>" : "");
  var ev = [T[-6].rise, T[-4].rise, T[6].rise, T[6].set, T[-4].set, T[-6].set];
  var mins = ev.map(function(d){ return ok(d) ? minsOf(d) : NaN; });
  var mono = mins.every(function(m, i){ return !isNaN(m) && (i === 0 || m > mins[i - 1]); });
  if(!mono){ bar.innerHTML = ""; return; }
  var segs = [["tl-night", 0, mins[0]], ["tl-blue", mins[0], mins[1]], ["tl-gold", mins[1], mins[2]], ["tl-day", mins[2], mins[3]], ["tl-gold", mins[3], mins[4]], ["tl-blue", mins[4], mins[5]], ["tl-night", mins[5], 1440]];
  var html = segs.map(function(s){ return '<span class="' + s[0] + '" style="width:' + ((s[2] - s[1]) / 1440 * 100).toFixed(2) + '%"></span>'; }).join("");
  var now = new Date();
  var todayThere = (function(){ try{ return new Intl.DateTimeFormat("en-CA", {timeZone: sunTz, year: "numeric", month: "2-digit", day: "2-digit"}).format(now); }catch(e){ return ""; } })();
  if(todayThere === ds) html += '<i class="now" style="left:' + (minsOf(now) / 1440 * 100).toFixed(2) + '%" title="Now"></i>';
  bar.innerHTML = html;
}
sunPlace.addEventListener("change", function(){ setPlace(sunPlace.value); drawSun(); });
["#sunLat","#sunLng"].forEach(function(id){ $(id).addEventListener("input", function(){ if(sunPlace.value !== "custom") setPlace("custom"); drawSun(); }); });
$("#sunDate").addEventListener("change", drawSun);
$("#sunGeo").addEventListener("click", function(){
  var msg = $("#sunGeoMsg");
  if(!navigator.geolocation){ msg.textContent = "Location isn't available in this browser. Type your latitude and longitude instead."; return; }
  msg.textContent = "Finding you…";
  navigator.geolocation.getCurrentPosition(function(pos){
    setPlace("custom");
    $("#sunLat").value = pos.coords.latitude.toFixed(4);
    $("#sunLng").value = pos.coords.longitude.toFixed(4);
    msg.textContent = "Using your current location.";
    drawSun();
  }, function(){ msg.textContent = "Couldn't get your location. Check location permission, or pick a city."; }, {timeout: 10000, maximumAge: 600000});
});
drawSun();

/* ---------- Camera finder ---------- */
var FQ = [
  {k:"use", q:"What will you photograph most?", o:[["family","Family, kids and pets"],["travel","Travel and everyday life"],["action","Sport, birds and wildlife"],["creative","Landscapes, portraits and creative shots"],["video","Video, vlogging or content"],["film","I want the film experience"]]},
  {k:"now", q:"What do you use now?", o:[["phoneok","My phone, and it's mostly fine"],["phonebad","My phone, but it struggles with low light, zoom or action"],["camera","I already have a camera and want to upgrade"]]},
  {k:"size", q:"How big can it be?", o:[["pocket","It has to fit in a pocket"],["bag","Fine in a small bag"],["any","Size doesn't matter"]]},
  {k:"budget", q:"Rough budget for camera and lens?", o:[["b1","Under $800"],["b2","$800 to $1,500"],["b3","$1,500 to $3,000"],["b4","Over $3,000"]]},
  {k:"hands", q:"How hands-on do you want to be?", o:[["auto","Point and shoot, keep it simple"],["learn","I want to learn manual settings"],["know","I already shoot in manual"]]},
  {k:"filmq", q:"Interested in film photography?", o:[["no","Not really"],["curious","Curious"],["yes","Yes!"]]}
];
var fAns = {};
$("#finderBox").innerHTML = FQ.map(function(q){
  return '<div class="finder-q"><b>' + q.q + '</b><div class="seg soft" role="group" aria-label="' + q.q + '">' +
    q.o.map(function(o){ return '<button type="button" data-k="' + q.k + '" data-v="' + o[0] + '" aria-pressed="false">' + o[1] + '</button>'; }).join("") + '</div></div>';
}).join("") + '<button type="button" class="btn" id="finderGo" style="margin-top:14px" disabled>Show my recommendation</button> <span class="small" id="finderLeft"></span>';
function finderLeft(){
  var left = FQ.filter(function(q){ return !fAns[q.k]; }).length;
  $("#finderGo").disabled = left > 0;
  $("#finderLeft").textContent = left ? left + " question" + (left === 1 ? "" : "s") + " to go" : "";
}
$("#finderBox").addEventListener("click", function(e){
  var b = e.target.closest("button[data-k]"); if(!b) return;
  fAns[b.dataset.k] = b.dataset.v;
  $$('#finderBox button[data-k="' + b.dataset.k + '"]').forEach(function(x){ x.setAttribute("aria-pressed", x === b); });
  finderLeft();
});
finderLeft();
function filmRec(a){
  return a.hands === "auto" ?
    {title:"A 35mm point-and-shoot or instant camera", why:"Automatic film cameras load, focus and expose for you, so you get the film look without the learning curve. Instant cameras (Instax, Polaroid) give you a print on the spot.",
     lenses:["Point-and-shoots have a fixed lens, usually around 35mm: perfect for everyday shots."],
     extras:["ISO 400 colour negative film to start", "Fresh batteries for the camera", "A local lab that develops and scans film"]} :
    {title:"A manual 35mm film SLR with a working light meter", why:"It teaches you exposure better than anything: every setting is a dial in front of you. Second-hand ones are plentiful; check the meter and shutter work before buying.",
     lenses:["A 50mm f/1.8 or f/2 lens: sharp, bright and cheap on most older mounts"],
     extras:["ISO 400 colour negative or black and white film", "The meter's battery (check the type, some old cameras need adapters)", "A lens hood and a cheap UV filter to protect old glass", "A local film lab"]};
}
function recommend(a){
  var r, also = [];
  var common = ["A spare battery", "Two good memory cards from a reputable brand", "A comfortable strap or small bag", "A cleaning kit (blower, brush, microfibre cloth)"];
  if(a.use === "film"){ r = filmRec(a); also.push("Want digital too? A small mirrorless camera with a film-style look (many have film simulation modes) pairs nicely with a film camera."); }
  else if(a.size === "pocket"){
    if(a.use === "action") r = {title:"A travel zoom compact", why:"A pocketable camera with a long built-in zoom reaches far beyond any phone. Autofocus won't match an interchangeable-lens camera for fast birds, but it's great for travel and casual sport.", lenses:["Built in: look for at least 20× optical zoom"], extras:[]};
    else if(a.use === "video") r = {title:"A vlogging compact", why:"Small cameras built for video have a flip-out screen facing you, good face-tracking autofocus and a microphone input.", lenses:["Built in: wide enough to hold at arm's length (around 18–24mm equivalent)"], extras:["A small clip-on or on-camera microphone with a wind cover", "A mini tripod that doubles as a handle", "A V30 or faster memory card"]};
    else r = {title:"A premium compact camera", why:"A larger sensor than a phone (1-inch or bigger) in your pocket: better low light, real zoom and natural background blur without software tricks.", lenses:["Built in: a bright zoom (f/1.8–2.8) or a fixed wide prime"], extras:[]};
  }
  else if(a.use === "action"){
    if(a.budget === "b1") r = {title:"A bridge (superzoom) camera", why:"One body with a huge built-in zoom, often 40× or more, for birds and sport on a budget. Bigger than a compact but with no lenses to buy.", lenses:["Built in: very long zoom"], extras:["A fast memory card for bursts"]};
    else if(a.budget === "b4") r = {title:"A high-end mirrorless camera with fast tracking autofocus", why:"Top-tier subject detection (birds, animals, vehicles), fast bursts and a stacked or fast sensor make action far easier to capture. Full frame or a flagship APS-C both suit.", lenses:["A 100–400mm, 150–600mm or 200–600mm telephoto zoom", "Later: a fast prime or f/2.8 zoom for indoor sport"], extras:["Fast UHS-II or CFexpress cards (check which your body takes)", "A second battery or battery grip", "A monopod for long lenses"]};
    else r = {title:"An APS-C mirrorless camera with good subject tracking", why:"APS-C's 1.5× crop gives your lenses extra reach, and modern subject detection locks onto eyes, animals and birds.", lenses:["A telephoto zoom around 70–300mm or 100–400mm", "Keep the kit zoom for everything else"], extras:["Fast memory cards for bursts"]};
  }
  else if(a.use === "video"){
    if(a.budget === "b1") r = {title:"A vlogging compact or entry APS-C mirrorless with a flip screen", why:"A screen that faces you, reliable face-tracking and a microphone input matter more than resolution.", lenses:["The kit zoom, ideally starting around 15–16mm for arm's-length shots"], extras:[]};
    else if(a.budget === "b4") r = {title:"A full-frame hybrid mirrorless camera", why:"Full frame gives cleaner low-light footage and more background blur. Look for 10-bit recording, good heat management and in-body stabilisation.", lenses:["A stabilised standard zoom (around 24–70mm or 24–105mm)", "A wide prime around 20–24mm for vlogging"], extras:[]};
    else r = {title:"An APS-C mirrorless camera with a flip screen", why:"The sweet spot for video: good autofocus, 4K, a mic input and a screen you can see while filming yourself.", lenses:["A stabilised kit zoom", "A wide prime (around 16–24mm) for low light and vlogging"], extras:[]};
    r.extras = r.extras.concat(["An on-camera or wireless microphone", "A variable ND filter for daylight", "A small tripod or gimbal", "V30 or faster memory cards"]);
  }
  else {
    var lens = a.use === "travel" ? ["A travel zoom (around 18–135mm or 18–150mm on APS-C) so one lens covers everything", "A small 35mm-equivalent prime for evenings"]
      : a.use === "creative" ? ["The kit zoom to start", "A fast prime (35mm or 50mm f/1.8) for portraits and low light", "Later: an ultra-wide for landscapes"]
      : ["The kit zoom to start", "A fast prime (35mm or 50mm f/1.8): the best upgrade for indoor family photos without flash"];
    if(a.budget === "b1") r = {title:"An entry-level APS-C mirrorless camera with its kit lens", why:"Big image-quality jump from a phone, interchangeable lenses, and easy auto modes while you learn. A good second-hand DSLR or mirrorless body is also great value.", lenses:lens, extras:[]};
    else if(a.budget === "b2") r = {title:"An APS-C mirrorless camera, plus a fast prime", why:"Spend a bit on lenses instead of the body: a kit zoom plus an f/1.8 prime covers almost everything beautifully.", lenses:lens, extras:[]};
    else if(a.budget === "b3") r = {title:"An enthusiast APS-C or entry full-frame mirrorless camera", why:"Better grip, twin dials, a nicer viewfinder and stronger autofocus. Entry full frame gives cleaner low light and more background blur.", lenses:lens, extras:[]};
    else r = {title:"A full-frame mirrorless camera with quality lenses", why:"Excellent low light, dynamic range and background blur, with the best autofocus and build. Put plenty of the budget into lenses.", lenses:a.use === "travel" ? ["A 24–105mm or 24–120mm zoom", "A small fast prime"] : ["A 24–70mm f/2.8 or 24–105mm f/4 zoom, or a set of primes (35mm, 85mm)"], extras:[]};
    if(a.use === "creative") r.extras = ["A sturdy tripod", "A circular polariser"];
    if(a.use === "family") r.extras = ["A flash you can bounce off the ceiling"];
  }
  r.extras = r.extras.concat(common);
  if(a.now === "phoneok" && a.hands === "auto" && (a.use === "family" || a.use === "travel")) also.push("If your phone is mostly fine and you want simple, consider whether a newer phone does the job. A dedicated camera mainly wins at fast action, real zoom and natural blur.");
  if(a.now === "camera") also.push("Already own lenses? Staying with the same mount (or an adapter) can save a lot of money.");
  if(a.hands === "learn" && a.use !== "film") also.push("Make sure it has a mode dial with P, A, S and M, and ideally a viewfinder: it makes learning this course hands-on.");
  if(a.hands === "know" && a.use !== "film") also.push("Look for twin control dials, a good viewfinder and custom buttons so you rarely need the menus.");
  if((a.filmq === "curious" || a.filmq === "yes") && a.use !== "film"){ var f = filmRec(a); also.push("For film on the side: " + f.title.charAt(0).toLowerCase() + f.title.slice(1) + ". " + f.why); }
  r.also = also;
  return r;
}
$("#finderGo").addEventListener("click", function(){
  var r = recommend(fAns);
  $("#finderOut").innerHTML = '<div class="result"><p class="small" style="margin:0">We suggest</p><h3>' + r.title + '</h3><p>' + r.why + '</p>' +
    '<strong>Lenses</strong><ul>' + r.lenses.map(function(x){ return "<li>" + x + "</li>"; }).join("") + '</ul>' +
    '<strong>Worth adding</strong><ul>' + r.extras.map(function(x){ return "<li>" + x + "</li>"; }).join("") + '</ul>' +
    (r.also.length ? '<div class="also"><strong>Also think about</strong><ul>' + r.also.map(function(x){ return "<li>" + x + "</li>"; }).join("") + '</ul></div>' : '') +
    '<div class="also"><strong>Before you buy</strong><ul><li>Hold it with a lens on. Does the grip feel right? Can you reach the dials?</li><li>Look through the viewfinder (with your glasses, if you wear them).</li><li>Open the menus and see if they make sense to you.</li><li>Check the price of the lenses you\'ll want next, not just the body.</li></ul></div>' +
    '<button type="button" class="btn ghost" data-go="gear">Read the full buying guide</button></div>';
  $("#finderOut").scrollIntoView({behavior:"smooth", block:"start"});
});

/* ---------- Install & offline ---------- */
var deferredInstall = null;
var isStandalone = (window.matchMedia && matchMedia("(display-mode: standalone)").matches) || navigator.standalone === true;
if("serviceWorker" in navigator && location.protocol !== "file:"){
  navigator.serviceWorker.register("sw.js").catch(function(){});
}
if(!isStandalone && /iphone|ipad|ipod/i.test(navigator.userAgent)){
  $("#installBox").hidden = false;
  $("#installText").textContent = "Add this guide to your home screen and it works without signal: tap the Share button in Safari, then Add to Home Screen.";
}
window.addEventListener("beforeinstallprompt", function(e){
  e.preventDefault();
  deferredInstall = e;
  if(!isStandalone){ $("#installBox").hidden = false; $("#installBtn").hidden = false; }
});
$("#installBtn").addEventListener("click", function(){
  if(!deferredInstall) return;
  deferredInstall.prompt();
  deferredInstall.userChoice.then(function(){ deferredInstall = null; $("#installBtn").hidden = true; });
});
window.addEventListener("appinstalled", function(){ $("#installBox").hidden = true; });

/* ---------- Start ---------- */
renderToc(); syncMarks();
var startId = location.hash.slice(1) || "home";
if(!byId[startId]) startId = "home";
current = startId;
sections.forEach(function(s){ s.hidden = s.id !== startId; });
history.replaceState(null, "", "#" + startId);
show(startId, false);

})();
