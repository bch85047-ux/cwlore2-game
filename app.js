/* ── 工具 ───────────────────────────────── */
function $(s,r){return (r||document).querySelector(s)}
function $$(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))}
function esc(s){
  return String(s).replace(/[&<>"]/g,function(c){
    return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c];
  });
}
function pad2(n){return (n<10?"0":"")+n}
function fmt(n){return n.toLocaleString("en-US")}

/* 从外貌取“整体像…”那句，作为肖像位主视觉 */
function quote(p){
  var ms=(p.look||"").match(/整体[^。！？\n]{2,46}[。！？]/g);
  if(ms&&ms.length) return ms[ms.length-1].replace(/[。！？]$/,"");
  var s=(p.look||"").trim();
  if(!s) return "未收录肖像";
  var i=s.lastIndexOf("。");
  return (i>0?s.slice(i+1):s).replace(/[。！？]$/,"");
}
/* 卡组正文（去掉“卡组特色：”开头） */
function deckBody(p){
  var d=p.deck||"",i=d.indexOf("卡组特色：");
  if(i<0) return d;
  var j=d.indexOf("。",i);
  return j<0?d.slice(i+5):d.slice(j+1).trim();
}
function facColor(p){return FAC[(p.factions||[])[0]]||TIER[p.tier].c||"#8b8173"}
function sealChar(p){
  var f=(p.factions||[])[0]||"";
  if(!f) return "谜";
  if(f==="未定"||f==="游离"||f==="架子班") return f==="架子班"?"架":f[0];
  return f[0];
}

/* ── 索引 ───────────────────────────────── */
var TIERS=["顶尖","第二","第三","第四","旧大陆","未知"];
var facets={},tags={},byName={};
PEOPLE.forEach(function(p,i){
  p._i=i;
  byName[p.name]=p;
  (p.factions||[]).forEach(function(f){facets[f]=(facets[f]||0)+1});
  tags[p.tag]=(tags[p.tag]||0)+1;
});
var facetsArr=Object.keys(facets).sort(function(a,b){
  return facets[b]-facets[a]||a.localeCompare(b,"zh");
});
var tagsArr=Object.keys(tags).sort(function(a,b){
  return tags[b]-tags[a]||a.localeCompare(b,"zh");
});

/* ── 选项渲染 ───────────────────────────── */
var selT=new Set(), selF=new Set(), selG=new Set(), sort="orig";

function opt(t,k,c,ct){
  return '<div class="opt'+(t.has(k)?" sel":"")+'" data-k="'+esc(k)+'">'
    +(c?'<i class="dot" style="--c:'+c+'"></i>':'')
    +'<span class="k">'+esc(k)+'</span><span class="ct">'+ct+'</span></div>';
}
function renderFilters(){
  $("#fTier").innerHTML=TIERS.map(function(t){
    var ct=PEOPLE.filter(function(p){return p.tier===t}).length;
    return opt(selT,t,TIER[t].c,ct);
  }).join("");
  $("#fFac").innerHTML=facetsArr.map(function(f){
    return opt(selF,f,FAC[f],facets[f]);
  }).join("");
  $("#fTag").innerHTML=tagsArr.map(function(t){
    return opt(selG,t,null,tags[t]);
  }).join("");
}

/* ── 卡牌 ───────────────────────────────── */
function cardHTML(p){
  var tc=TIER[p.tier].c||"#8b8173";
  return '<article class="cd" style="--tc:'+tc+'" data-i="'+p._i+'">'
    +'<header class="cd-h"><span class="cd-n">'+esc(p.name)+'</span>'
      +'<span class="cd-id">№'+pad2(p._i+1)+'</span></header>'
    +'<div class="cd-pt"><div class="cd-q">「'+esc(quote(p))+'」</div>'
      +'<span class="cd-seal">'+esc(sealChar(p))+'</span></div>'
    +'<div class="cd-bd">'
      +'<div class="cd-tk"><b>卡组特色：</b>'+esc(p.tag)
        +'<br>'+esc(deckBody(p)).slice(0,150)+'</div>'
    +'<div class="cd-mt"><span class="cd-ti">'+esc(p.tier)+'</span>'
      +'<span class="cd-fc">'+esc((p.factions||[]).join(" · "))+'</span>'
      +'<span class="cd-dt">'+(p.deck||"").length+'字</span></div>'
    +'</div></article>';
}

function passFilter(p){
  if(selT.size && !selT.has(p.tier)) return false;
  if(selF.size){
    var ok=(p.factions||[]).some(function(f){return selF.has(f)});
    if(!ok) return false;
  }
  if(selG.size && !selG.has(p.tag)) return false;
  var q=$("#q").value.trim().toLowerCase();
  if(q){
    var hay=(p.name+" "+p.tag+" "+p.note+" "+p.look+" "+p.deck+" "
      +(p.factions||[]).join(" ")+" "+p.tier).toLowerCase();
    if(hay.indexOf(q)<0) return false;
  }
  return true;
}
function doSort(list){
  if(sort==="orig") return list;
  if(sort==="tier") return list.slice().sort(function(a,b){
    var x=(TIER[a.tier]||{r:9}).r-(TIER[b.tier]||{r:9}).r;
    return x||a._i-b._i;
  });
  if(sort==="len") return list.slice().sort(function(a,b){
    return (b.deck||"").length-(a.deck||"").length;
  });
  return list.slice().sort(function(a,b){
    return a.name.localeCompare(b.name,"zh");
  });
}
function renderGrid(){
  var list=doSort(PEOPLE.filter(passFilter));
  $("#cnt").innerHTML="档案 <b>"+list.length+"</b> / "+PEOPLE.length;
  $("#grid").innerHTML = list.length
    ? list.map(cardHTML).join("")
    : '<div class="empty"><div class="z">空卷</div>没有匹配的人。改一下筛选条件。</div>';
}

/* ── 详情抽屉 ───────────────────────────── */
/* WebView 可能冻结 CSS transition 时钟，元素会停在 from 帧。
   这里在切类后强制一次 reflow，保证终态一定到位。 */
function settle(el){
  el.style.transition="none";
  void el.offsetWidth;
  el.style.transition="";
}
function openSheet(i){
  var p=PEOPLE[i]; if(!p) return;
  var tc=TIER[p.tier].c||"#8b8173";
  var html='<button class="sh-x" data-x="1" aria-label="关闭">×</button>'
    +'<div class="sh-in">'
    +'<div class="sh-top">'
      +'<div><div class="id">档案 №'+pad2(p._i+1)+' / '+pad2(PEOPLE.length)+'</div>'
      +'<div class="nm">'+esc(p.name)+'</div>'
      +'<div class="tg"><span style="background:'+tc+'">'+esc(p.tier)+'</span>'
      +(p.factions||[]).map(function(f){
        return '<span style="background:'+esc(FAC[f]||"#8b8173")+'">'+esc(f)+'</span>';
      }).join("")+'</div></div>'
      +'<div class="rt">外貌 '+(p.look||"").length+' 字<br>卡组 '+(p.deck||"").length+' 字</div>'
    +'</div>'
    +'<div class="sh-port"><div class="sh-q">「'+esc(quote(p))+'」</div></div>'
    +'<div class="sh-cols">'
      +'<div><h4>外 貌</h4><p>'+esc(p.look||"（原文注明：外貌不可知）")+'</p></div>'
      +'<div><h4>卡 组</h4><p>'+esc(p.deck||"（未收录卡组）")+'</p></div>'
    +'</div>'
    +(p.note?'<div class="sh-note"><b>标签</b>　'+esc(p.note)+'</div>':'')
    +'</div>';
  $("#shIn").innerHTML=html;
  $("#sh").classList.add("on");
  $("#ov").classList.add("on");
  settle($("#sh")); settle($("#ov"));
  $("#sh").scrollTop=0;
}
function closeSheet(){
  $("#sh").classList.remove("on");
  $("#ov").classList.remove("on");
  settle($("#sh")); settle($("#ov"));
}

/* ── 段位页 ─────────────────────────────── */
function renderLadder(){
  var max=Math.max.apply(null,LAD.map(function(x){return x.per}));
  $("#lad").innerHTML=LAD.map(function(x){
    return '<div class="lr">'
      +'<div class="lr-l"><span class="r">'+x.s+'</span>'
        +'<span class="u">×'+x.spans+'段</span></div>'
      +'<div class="lr-b '+x.cls+'"><i style="width:'+x.w+'%"></i></div>'
      +'<div class="lr-r"><div class="v">'+fmt(x.per)+'</div>'
        +'<div class="c">累计 '+fmt(x.cum)+'</div></div></div>';
  }).join("")
  +'<div class="lad-cap">'
    +'<span>净胜分 <b>'+fmt(LAD[LAD.length-1].cum)+'</b> 分 · 24 段</span>'
    +'<span>原文口径 <b>两万七千多场</b> · 每场 20 分钟 / 9 小时 / 一周</span>'
  +'</div>';

  $("#rules").innerHTML=LAD.map(function(x,i){
    return '<div class="rule"><h4>'+x.s+'<span class="p">每段 '+fmt(x.per)+'</span></h4>'
      +'<p>'+x.rule+'</p></div>';
  }).join("");

  $("#funnel").innerHTML=FUN.map(function(f){
    return '<div class="fn-row"><span class="lb">'+f.lb+'</span>'
      +'<span class="br"><i style="width:'+f.w+'%"></i></span>'
      +'<span class="vv">'+fmt(f.v)+'</span></div>';
  }).join("")
  +'<div class="lad-cap">'
    +'<span>正赛入围率 <b>1 : 1,563</b></span>'
    +'<span>冠军：八幡 · SIE · Tangentle/Spoker ｜ Jking7 年轻时包揽三十年</span>'
  +'</div>';

  $("#gaps").innerHTML=GAPS.map(function(g,i){
    return '<div class="gap"><span class="no">'+pad2(i+1)+'</span><span class="tx">'+g+'</span></div>';
  }).join("");
}

/* ── 势力页 ─────────────────────────────── */
function renderLands(){
  $("#land").innerHTML=LANDS.map(function(L){
    return '<div class="lcol"><h4>'+L.title+'<span class="en">'+L.en+'</span></h4>'
      +L.items.map(function(f){
        return '<div class="fa" style="--fc:'+(f.fc||"#8b8173")+'">'
          +'<div class="fa-h"><span class="n">'+esc(f.n)+'</span>'
            +'<span class="t">'+esc(f.t)+'</span>'
            +(f.cr?'<span class="sp"></span><span class="cr">复制皇冠</span>':'<span class="sp"></span>')
          +'</div>'
          +'<p>'+esc(f.txt)+'</p>'
          +'<div class="who">'+f.who.map(function(w){
            var exist=!!byName[w];
            return '<span data-name="'+esc(w)+'"'+(exist?'':' title="档案中未收录"')+'>'
              +esc(w)+(exist?'':' ∅')+'</span>';
          }).join("")+'</div>'
          +(f.rel&&f.rel.length
            ?'<div class="rel">'+f.rel.map(function(r){
                return '<b class="'+r[2]+'">'+esc(r[0])+'</b> '+esc(r[1]);
              }).join('<br>')+'</div>'
            :'')
        +'</div>';
      }).join("")+'</div>';
  }).join("");
}

/* ── 词条页 ─────────────────────────────── */
var glC=null;
function renderGloss(){
  var cs=Object.keys(GLOSS.reduce(function(a,g){a[g.c]=(a[g.c]||0)+1;return a},{}))
    .sort(function(a,b){return a.localeCompare(b,"zh")});
  $("#glf").innerHTML='<button class="'+(glC===null?"on":"")+'" data-c="">全部<span style="opacity:.5"> '
    +GLOSS.length+'</span></button>'
    +cs.map(function(c){
      return '<button class="'+(glC===c?"on":"")+'" data-c="'+esc(c)+'">'+esc(c)
        +'<span style="opacity:.5"> '+GLOSS.filter(function(g){return g.c===c}).length+'</span></button>';
    }).join("");

  var list=glC===null?GLOSS:GLOSS.filter(function(g){return g.c===glC});
  $("#gls").innerHTML=list.map(function(g){
    var src=(g.src||[]).filter(function(n){return byName[n]})
      .map(function(n){return '<a data-name="'+esc(n)+'">'+esc(n)+'</a>'});
    return '<div class="gl"><div class="gl-h"><span class="n">'+esc(g.n)+'</span>'
      +'<span class="c">'+esc(g.c)+'</span><span class="sp"></span></div>'
      +'<p>'+g.def+'</p>'
      +'<div class="mech"><b>机制映射</b>　'+g.mech+'</div>'
      +(src.length?'<div class="src">出处　'+src.join(" · ")+'</div>':'')
    +'</div>';
  }).join("");
}

/* ── 交互 ───────────────────────────────── */
function bindTabs(){
  $$("#tabs .tab").forEach(function(b){
    b.addEventListener("click",function(){
      $$("#tabs .tab").forEach(function(x){x.classList.remove("on")});
      b.classList.add("on");
      $$(".v").forEach(function(v){v.classList.remove("on")});
      $("#v-"+b.dataset.v).classList.add("on");
      window.scrollTo(0,0);
    });
  });
}
function bindFilters(){
  function bind(el,set){
    el.addEventListener("click",function(e){
      var d=e.target.closest(".opt"); if(!d) return;
      var k=d.dataset.k;
      if(set.has(k)) set.delete(k); else set.add(k);
      $$(".opt",el).forEach(function(x){
        x.classList.toggle("sel",set.has(x.dataset.k));
      });
      renderGrid();
    });
  }
  bind($("#fTier"),selT); bind($("#fFac"),selF); bind($("#fTag"),selG);
  var t;
  $("#q").addEventListener("input",function(){
    clearTimeout(t); t=setTimeout(renderGrid,120);
  });
  $("#clr").addEventListener("click",function(){
    selT.clear(); selF.clear(); selG.clear();
    $("#q").value="";
    renderFilters(); renderGrid();
  });
  $$("#sorts button").forEach(function(b){
    b.addEventListener("click",function(){
      $$("#sorts button").forEach(function(x){x.classList.remove("on")});
      b.classList.add("on"); sort=b.dataset.s; renderGrid();
    });
  });
}
function bindClicks(){
  document.addEventListener("click",function(e){
    var c=e.target.closest(".cd");
    if(c){ openSheet(+c.dataset.i); return; }
    var n=e.target.closest("[data-name]");
    if(n && n.dataset.name && byName[n.dataset.name]){
      openSheet(byName[n.dataset.name]._i); return;
    }
    if(e.target.closest("#ov")) closeSheet();
    if(e.target.closest('[data-x="1"]')) closeSheet();
    var g=e.target.closest("#glf button");
    if(g){ glC=g.dataset.c||null; renderGloss(); }
  });
  document.addEventListener("keydown",function(e){
    if(e.key==="Escape") closeSheet();
  });
}

/* ── 启动 ───────────────────────────────── */
$("#tbCards").textContent=PEOPLE.length+" 人";
$("#tbGloss").textContent=GLOSS.length;
$("#ftStat").textContent="档案 "+PEOPLE.length+" 人 · 词条 "+GLOSS.length+" 条 · 段位 25—1";
renderFilters(); renderGrid(); renderLadder(); renderLands(); renderGloss();
bindTabs(); bindFilters(); bindClicks();
