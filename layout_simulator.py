import streamlit as st
st.set_page_config(page_title="会場レイアウトシミュレーター | YEG彦根", page_icon="🏛", layout="wide")
st.markdown("<style>.block-container{padding-top:1rem}</style>", unsafe_allow_html=True)
st.title("🏛 会場レイアウトシミュレーター")
st.caption("日本YEG 未来フォーラム（彦根）｜彦根商工会議所 4階大ホール｜20m × 14m")

HTML = """<!DOCTYPE html><html lang="ja"><head><meta charset="UTF-8"><style>
*{box-sizing:border-box;margin:0;padding:0}
body{background:#f8f9fa;font-family:'Segoe UI',system-ui,sans-serif;padding:8px;user-select:none}
#wrap{border:2px solid #bbb;border-radius:6px;overflow:auto;display:inline-block;box-shadow:0 4px 14px rgba(0,0,0,.08)}
canvas{display:block;background:#fff}
.row{display:flex;gap:5px;align-items:center;flex-wrap:wrap;margin-bottom:6px}
.tbtn{padding:5px 9px;border:2px solid transparent;border-radius:7px;cursor:pointer;font-size:11px;font-weight:700;transition:all .12s}
.tbtn:hover{filter:brightness(.92);transform:translateY(-1px)}
.tbtn.active{border-color:#333;box-shadow:0 0 0 2px rgba(0,0,0,.15)}
.rbtn{padding:3px 7px;border:1px solid #ddd;border-radius:5px;cursor:pointer;font-size:11px;font-weight:600;background:#fff;color:#555;transition:all .12s}
.rbtn:hover{background:#f0f0f0}
.rbtn.active{background:#4263eb;color:#fff;border-color:#4263eb}
.abtn{padding:2px 6px;border:1px solid #adb5bd;border-radius:5px;cursor:pointer;font-size:11px;background:#f8f9fa;color:#333;transition:all .12s}
.abtn:hover{background:#e9ecef}
.abtn:disabled{opacity:.35;cursor:default}
.red-btn{padding:5px 10px;background:#fa5252;color:#fff;border:none;border-radius:7px;cursor:pointer;font-size:11px;font-weight:700}
.green-btn{padding:5px 12px;background:#40c057;color:#fff;border:none;border-radius:7px;cursor:pointer;font-size:11px;font-weight:700}
.io-btn{padding:5px 10px;background:#7048e8;color:#fff;border:none;border-radius:7px;cursor:pointer;font-size:11px;font-weight:700}
.io-btn:hover{background:#5f3dc4}
.undo-btn{padding:4px 8px;background:#868e96;color:#fff;border:none;border-radius:7px;cursor:pointer;font-size:11px;font-weight:700}
.undo-btn:disabled{opacity:.4;cursor:default}
.panel{background:#fff;border:1px solid #e0e0e0;border-radius:8px;padding:6px 10px;margin-bottom:6px}
.lbl{font-size:11px;color:#666;white-space:nowrap}
.badge{background:linear-gradient(135deg,#4263eb,#7048e8);color:#fff;padding:4px 14px;border-radius:16px;font-size:12px;font-weight:700}
.stat-box{display:flex;gap:12px;align-items:center}
.stat-item{font-size:11px;color:#555}.stat-item b{color:#222}
#modal{display:none;position:fixed;inset:0;background:rgba(0,0,0,.5);justify-content:center;align-items:center;z-index:9999}
#modal.show{display:flex}
#modal-box{background:#fff;border-radius:12px;padding:22px 26px;max-width:320px;width:90%;text-align:center;box-shadow:0 8px 32px rgba(0,0,0,.3)}
#modal-msg{margin:0 0 16px;font-size:13px;color:#333;line-height:1.6;white-space:pre-line}
.modal-btns{display:flex;gap:8px;justify-content:center}
.mbtn-cancel{padding:7px 18px;border:1px solid #ddd;border-radius:8px;cursor:pointer;font-size:13px;background:#f8f9fa;color:#555}
.mbtn-ok{padding:7px 18px;border:none;border-radius:8px;cursor:pointer;font-size:13px;font-weight:700;background:#4263eb;color:#fff}
.legend{display:flex;gap:10px;flex-wrap:wrap;margin-top:4px}
.li{display:flex;align-items:center;gap:4px;font-size:10px;color:#777}
.dot{width:12px;height:12px;border-radius:3px;border:1px solid #ddd;flex-shrink:0}
#toast{position:fixed;bottom:12px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,.72);color:#fff;padding:5px 14px;border-radius:20px;font-size:11px;opacity:0;transition:opacity .3s;pointer-events:none;z-index:9000}
#toast.show{opacity:1}
#coord{font-size:11px;color:#888;height:15px;font-family:monospace;margin-bottom:3px}
.minput{width:44px;font-size:11px;border:1px solid #ddd;border-radius:4px;padding:2px 4px;text-align:right}
#sel-info{font-size:11px;color:#4263eb;font-weight:700;min-width:52px}
#blk-info{font-size:10px;color:#888;font-family:monospace;min-width:180px}
</style></head><body>

<div id="modal"><div id="modal-box">
  <p id="modal-msg"></p>
  <div class="modal-btns">
    <button class="mbtn-cancel" id="modal-cancel">キャンセル</button>
    <button class="mbtn-ok" id="modal-ok">OK</button>
  </div>
</div></div>
<div id="toast"></div>
<input type="file" id="file-input" accept=".json" style="display:none" onchange="loadJSON(this)">

<div class="row">
  <div class="lbl">ツール: <b id="tlabel">椅子列</b></div>
  <div class="stat-box" style="margin-left:auto">
    <div class="stat-item">🪑椅子席: <b id="sc">0</b></div>
    <div class="stat-item">🗃机席: <b id="sd">0</b></div>
    <div class="badge">合計 <span id="st">0</span> 名</div>
  </div>
</div>

<div class="row">
  <button id="t-chair" class="tbtn" onclick="selTool('chair')" style="background:#74c0fc;color:#1864ab">🪑 椅子</button>
  <button id="t-theater_row" class="tbtn active" onclick="selTool('theater_row')" style="background:#339af0;color:#fff">↔ 椅子列</button>
  <button id="t-desk_2" class="tbtn" onclick="selTool('desk_2')" style="background:#ffc078;color:#c05202">🗃 2人掛け</button>
  <button id="t-desk_3" class="tbtn" onclick="selTool('desk_3')" style="background:#ffb347;color:#7c3c00">🗃 3人掛け</button>
  <button id="t-stage" class="tbtn" onclick="selTool('stage')" style="background:#d0bfff;color:#5f3dc4">🎤 ステージ*</button>
  <button id="t-aisle" class="tbtn" onclick="selTool('aisle')" style="background:#ffe066;color:#946300">↔ 通路*</button>
  <button id="t-fixture" class="tbtn" onclick="selTool('fixture')" style="background:#bbb;color:#333">🏗 備品・柱*</button>
  <button id="t-select" class="tbtn" onclick="selTool('select')" style="background:#e3fafc;color:#0c7a9a">🖱 選択</button>
  <button class="red-btn" onclick="clearAll()">🗑 全消去</button>
  <button class="io-btn" onclick="saveJSON()">💾 保存</button>
  <button class="io-btn" onclick="document.getElementById('file-input').click()">📂 読込</button>
  <span style="margin-left:8px;display:flex;align-items:center;gap:4px;background:#fff;border:1px solid #ddd;border-radius:8px;padding:2px 6px">
    <button class="abtn" onclick="setZoom(Z/1.25)" title="縮小 (Ctrl+-)" style="font-size:14px;padding:1px 5px">−</button>
    <span id="zoom-label" style="font-size:11px;font-weight:700;min-width:36px;text-align:center">100%</span>
    <button class="abtn" onclick="setZoom(Z*1.25)" title="拡大 (Ctrl++)" style="font-size:14px;padding:1px 5px">＋</button>
    <button class="abtn" onclick="setZoom(1.0)" title="リセット" style="font-size:10px;padding:2px 4px">⤢</button>
  </span>
</div>

<div class="panel" style="display:flex;flex-wrap:wrap;gap:0;align-items:flex-start;padding:5px 8px">
  <div style="display:flex;flex-direction:column;gap:4px;padding-right:12px;border-right:1px solid #e8e8e8;margin-right:12px">
    <div class="row" style="margin-bottom:0;gap:8px">
      <span class="lbl" style="font-weight:700">⚙ 設定</span>
      <div class="row" style="margin-bottom:0;gap:4px" id="n-row">
        <span class="lbl">席数</span>
        <input type="range" id="ni" min="2" max="20" value="8" oninput="setN(this.value)" style="width:65px">
        <b id="nv" style="font-size:11px;min-width:26px">8席</b>
      </div>
      <div class="row" style="margin-bottom:0;gap:4px" id="cw-row">
        <span class="lbl">橏子サイズ</span>
        <input class="minput" id="cw-inp" type="number" min="30" max="100" value="55" oninput="setCW(this.value)" style="width:40px">
        <span class="lbl">cm</span>
      </div>
      <div class="row" style="margin-bottom:0;gap:3px">
        <span class="lbl">色</span>
        <input type="color" id="cpicker" value="#339af0" oninput="setColor(this.value)" style="width:26px;height:20px;border:1px solid #ddd;border-radius:4px;cursor:pointer;padding:1px">
        <button class="abtn" onclick="resetColor()" style="font-size:10px">↺</button>
      </div>
      <button class="undo-btn" id="btn-undo" onclick="undo()" title="Ctrl+Z">↩ Undo</button>
      <button class="undo-btn" id="btn-redo" onclick="redo()" title="Ctrl+Y">↪ Redo</button>
    </div>
    <div class="row" style="margin-bottom:0;gap:5px">
      <span class="lbl">余白(cm)</span>
      <span class="lbl">↑</span><input class="minput" id="mT" type="number" min="0" max="300" value="30" oninput="setM()">
      <span class="lbl">↓</span><input class="minput" id="mB" type="number" min="0" max="300" value="30" oninput="setM()">
      <span class="lbl">←</span><input class="minput" id="mL" type="number" min="0" max="300" value="5"  oninput="setM()">
      <span class="lbl">→</span><input class="minput" id="mR" type="number" min="0" max="300" value="5"  oninput="setM()">
    </div>
  </div>
  <div style="display:flex;flex-direction:column;gap:4px;padding-right:12px;border-right:1px solid #e8e8e8;margin-right:12px">
    <div class="row" style="margin-bottom:0;gap:5px">
      <span class="lbl" style="font-weight:700">🖱 選択</span>
      <span id="sel-info">0個選択中</span>
      <span id="blk-info"></span>
      <span class="lbl">整列:</span>
      <button class="abtn" id="al-l"   onclick="alignSel('left')"    title="左端">⬛←</button>
      <button class="abtn" id="al-r"   onclick="alignSel('right')"   title="右端">→⬛</button>
      <button class="abtn" id="al-hc"  onclick="alignSel('hcenter')" title="左右中央">↔中</button>
      <button class="abtn" id="al-t"   onclick="alignSel('top')"     title="上端">⬛↑</button>
      <button class="abtn" id="al-b"   onclick="alignSel('bottom')"  title="下端">↓⬛</button>
      <button class="abtn" id="al-vc"  onclick="alignSel('vcenter')" title="上下中央">↕中</button>
      <button class="abtn" id="al-del" onclick="deleteSel()" style="background:#fff0f0;border-color:#ffa8a8;color:#c92a2a">🗑</button>
    </div>
    <div class="row" style="margin-bottom:0;gap:5px">
      <span class="lbl">複製:</span>
      <span class="lbl">間隔</span>
      <input class="minput" id="copy-gap" type="number" min="0" max="2000" value="30" style="width:48px">
      <span class="lbl">cm</span>
      <button class="rbtn active" id="cd-top"    onclick="setCopyDir('top')"   >↑</button>
      <button class="rbtn"        id="cd-bottom" onclick="setCopyDir('bottom')" >↓</button>
      <button class="rbtn"        id="cd-left"   onclick="setCopyDir('left')"  >←</button>
      <button class="rbtn"        id="cd-right"  onclick="setCopyDir('right')" >→</button>
      <button class="abtn" id="btn-copy" onclick="copyWithGap()" style="background:#e7f5ff;border-color:#74c0fc;color:#1864ab;font-weight:700">📋 複製</button>
    </div>
  </div>
  <div style="display:flex;flex-direction:column;gap:4px">
    <div class="row" style="margin-bottom:0;gap:7px">
      <span class="lbl" style="font-weight:700">⚡ 自動設営</span>
      <span class="lbl">正面</span>
      <button class="rbtn active" id="d-top"    onclick="setDir('top')"   >↑ 上</button>
      <button class="rbtn"        id="d-bottom" onclick="setDir('bottom')" >↓ 下</button>
      <button class="rbtn"        id="d-left"   onclick="setDir('left')"  >← 左</button>
      <button class="rbtn"        id="d-right"  onclick="setDir('right')" >→ 右</button>
      <button class="green-btn" onclick="autoPack()">▶ 自動詰め</button>
    </div>
    <div style="font-size:10px;color:#bbb">*ドラッグ=範囲選択 ｜ 右クリック=削除 ｜ Ctrl+Z/Y=Undo/Redo ｜ Ctrl+A=全選択 ｜ Del=削除 ｜ 矢印=移動(5cm) ｜ Shift+矢印=移動(50cm)</div>
  </div>
</div>

<div id="coord">カーソル: —</div>
<div id="wrap"><canvas id="cv" width="800" height="560"></canvas></div>
<div class="legend">
  <div class="li"><div class="dot" style="background:#339af0"></div>椅子・椅子列</div>
  <div class="li"><div class="dot" style="background:#ffc078"></div>机＋椅子</div>
  <div class="li"><div class="dot" style="background:#d0bfff"></div>ステージ</div>
  <div class="li"><div class="dot" style="background:#ffe066"></div>通路</div>
  <div class="li"><div class="dot" style="background:#bbb"></div>備品・柱</div>
</div>

<script>
// ===== グローバル変数（必ずスクリプト先頭で宣言）=====
var S=0.4, VW=2000, VH=1400;
var Z=1.0, MIN_Z=0.3, MAX_Z=3.0;
var cv, ctx;
var DEF_COLOR={chair:'#339af0',theater_row:'#339af0',desk_2:'#ffb74d',desk_3:'#ffb74d',stage:'#d0bfff',aisle:'#ffe066',fixture:'#868e96'};
var state={
  blocks:[],tool:'theater_row',frontDir:'top',
  selected:[],hover:null,
  dragStart:null,dragging:false,
  rubberStart:null,rubberEnd:null,rubberActive:false,
  groupMoving:false,groupMoveStart:null,groupMoveBase:{},groupMoveDelta:{x:0,y:0},groupHistoryPushed:false,
  didDrag:false,mouseDownBlock:null,
  nextId:1,n:8,chairW:55,chairSp:10,
  mT:30,mB:30,mL:5,mR:5,
  currentColor:'#339af0',
  copyDir:'top',
  history:[],future:[]
};
var AREA=['stage','aisle','fixture'];
var PLACE=['chair','theater_row','desk_2','desk_3'];
var NAMES={chair:'椅子',theater_row:'椅子列',desk_2:'2人掛け',desk_3:'3人掛け',stage:'ステージ',aisle:'通路',fixture:'備品・柱',select:'選択'};

function snap(v){return Math.round(v/5)*5;}
function PS(){return S*Z;}       // 現在の1cm→pixelスケール
function px(c){return c*PS();}
function cmv(p){return p/PS();}
function isH(d){return d==='top'||d==='bottom';}
function defColor(type){return DEF_COLOR[type]||'#999';}

function dims(type,n,dir){
  n=n||state.n; dir=dir||state.frontDir;
  var cw=state.chairW,cs=state.chairSp,h=isH(dir);
  switch(type){
    case 'chair':       return{w:55,h:55,seats:1,st:'c'};
    case 'theater_row': return h?{w:n*cw+(n-1)*cs,h:cw,seats:n,st:'c'}:{w:cw,h:n*cw+(n-1)*cs,seats:n,st:'c'};
    case 'desk_2':      return h?{w:180,h:100,seats:2,st:'d'}:{w:100,h:180,seats:2,st:'d'};
    case 'desk_3':      return h?{w:180,h:100,seats:3,st:'d'}:{w:100,h:180,seats:3,st:'d'};
    default:            return{w:100,h:100,seats:0,st:null};
  }
}

function mkBlock(type,x,y,w,h){
  var d=dims(type,state.n,state.frontDir);
  return{id:state.nextId++,type:type,x:snap(x),y:snap(y),
    w:w||d.w,h:h||d.h,n:state.n,dir:state.frontDir,
    seats:d.seats,st:d.st,color:state.currentColor,
    mT:state.mT,mB:state.mB,mL:state.mL,mR:state.mR,locked:false};
}
function cloneBlocks(a){return a.map(function(b){return Object.assign({},b);});}

function pushHistory(){
  state.history.push(cloneBlocks(state.blocks));
  if(state.history.length>60)state.history.shift();
  state.future=[];updateUndoBtn();
}
function undo(){
  if(!state.history.length)return;
  state.future.push(cloneBlocks(state.blocks));
  state.blocks=state.history.pop();
  state.selected=[];updateUndoBtn();showToast('Undo');drawAll();
}
function redo(){
  if(!state.future.length)return;
  state.history.push(cloneBlocks(state.blocks));
  state.blocks=state.future.pop();
  state.selected=[];updateUndoBtn();showToast('Redo');drawAll();
}
function updateUndoBtn(){
  document.getElementById('btn-undo').disabled=!state.history.length;
  document.getElementById('btn-redo').disabled=!state.future.length;
}
var _tt=null;
function showToast(m){var t=document.getElementById('toast');t.textContent=m;t.className='show';clearTimeout(_tt);_tt=setTimeout(function(){t.className='';},1200);}

function overlaps(ax,ay,aw,ah,bx,by,bw,bh){return ax<bx+bw&&ax+aw>bx&&ay<by+bh&&ay+ah>by;}
function footprint(b){
  var mL=b.mL!=null?b.mL:0,mR=b.mR!=null?b.mR:0,mT=b.mT!=null?b.mT:0,mB=b.mB!=null?b.mB:0;
  return{x:b.x-mL,y:b.y-mT,w:b.w+mL+mR,h:b.h+mT+mB};
}
function canPlaceAt(nx,ny,nw,nh,nmL,nmR,nmT,nmB,blocks){
  if(nx<0||ny<0||nx+nw>VW||ny+nh>VH) return false;
  var nfx=nx-nmL,nfy=ny-nmT,nfw=nw+nmL+nmR,nfh=nh+nmT+nmB;
  for(var i=0;i<blocks.length;i++){var fp=footprint(blocks[i]);if(overlaps(nfx,nfy,nfw,nfh,fp.x,fp.y,fp.w,fp.h)) return false;}
  return true;
}
function hitBlock(x,y){
  for(var i=state.blocks.length-1;i>=0;i--){
    var b=state.blocks[i];
    if(x>=b.x&&x<b.x+b.w&&y>=b.y&&y<b.y+b.h)return b;
  }
  return null;
}

function drawAll(){
  ctx.clearRect(0,0,cv.width,cv.height);
  ctx.fillStyle='#fff';ctx.fillRect(0,0,cv.width,cv.height);
  drawGrid();
  state.blocks.forEach(function(b){
    var inSel=state.selected.indexOf(b.id)>=0;
    var dx=0,dy=0;
    if(inSel&&state.groupMoving){dx=state.groupMoveDelta.x;dy=state.groupMoveDelta.y;}
    drawBlock(b,false,dx,dy);
  });
  if(state.tool!=='select'&&state.hover&&PLACE.indexOf(state.tool)>=0&&!state.dragging){
    var d=dims(state.tool,state.n,state.frontDir);
    drawBlock({type:state.tool,x:state.hover.x,y:state.hover.y,w:d.w,h:d.h,n:state.n,dir:state.frontDir,
      color:state.currentColor,mT:state.mT,mB:state.mB,mL:state.mL,mR:state.mR},true,0,0);
  }
  if(state.dragging&&state.dragStart&&state.hover){
    var rx=Math.min(state.dragStart.x,state.hover.x),ry=Math.min(state.dragStart.y,state.hover.y);
    ctx.globalAlpha=0.35;ctx.fillStyle=state.currentColor;
    ctx.fillRect(px(rx),px(ry),px(Math.abs(state.hover.x-state.dragStart.x)),px(Math.abs(state.hover.y-state.dragStart.y)));
    ctx.globalAlpha=1;
  }
  if(state.rubberActive&&state.rubberStart&&state.rubberEnd){
    var rx=Math.min(state.rubberStart.x,state.rubberEnd.x),ry=Math.min(state.rubberStart.y,state.rubberEnd.y);
    var rw=Math.abs(state.rubberEnd.x-state.rubberStart.x),rh=Math.abs(state.rubberEnd.y-state.rubberStart.y);
    ctx.globalAlpha=0.18;ctx.fillStyle='#4263eb';ctx.fillRect(px(rx),px(ry),px(rw),px(rh));ctx.globalAlpha=1;
    ctx.setLineDash([4,3]);ctx.strokeStyle='#4263eb';ctx.lineWidth=1.5;ctx.strokeRect(px(rx),px(ry),px(rw),px(rh));ctx.setLineDash([]);
  }
  updateStats();
}

function drawGrid(){
  var i;
  ctx.strokeStyle='#e0e0e0';ctx.lineWidth=0.5;
  for(i=0;i<=VW;i+=10){ctx.beginPath();ctx.moveTo(px(i),0);ctx.lineTo(px(i),cv.height);ctx.stroke();}
  for(i=0;i<=VH;i+=10){ctx.beginPath();ctx.moveTo(0,px(i));ctx.lineTo(cv.width,px(i));ctx.stroke();}
  ctx.strokeStyle='#ccc';ctx.lineWidth=1;
  for(i=0;i<=VW;i+=50){ctx.beginPath();ctx.moveTo(px(i),0);ctx.lineTo(px(i),cv.height);ctx.stroke();}
  for(i=0;i<=VH;i+=50){ctx.beginPath();ctx.moveTo(0,px(i));ctx.lineTo(cv.width,px(i));ctx.stroke();}
  ctx.strokeStyle='#aaa';ctx.lineWidth=1.5;
  ctx.fillStyle='#888';ctx.font='bold 9px sans-serif';ctx.textAlign='left';ctx.textBaseline='top';
  for(i=0;i<=VW;i+=100){ctx.beginPath();ctx.moveTo(px(i),0);ctx.lineTo(px(i),cv.height);ctx.stroke();if(i>0)ctx.fillText(i/100+'m',px(i)+2,2);}
  for(i=0;i<=VH;i+=100){ctx.beginPath();ctx.moveTo(0,px(i));ctx.lineTo(cv.width,px(i));ctx.stroke();if(i>0)ctx.fillText(i/100+'m',2,px(i)+2);}
  ctx.fillStyle='rgba(80,80,80,0.25)';
  for(var xi=0;xi<=VW;xi+=100)for(var yi=0;yi<=VH;yi+=100){ctx.beginPath();ctx.arc(px(xi),px(yi),2,0,Math.PI*2);ctx.fill();}
  ctx.save();ctx.shadowColor='rgba(220,30,30,0.5)';ctx.shadowBlur=6;ctx.strokeStyle='#e03131';ctx.lineWidth=3;ctx.strokeRect(1,1,px(VW)-2,px(VH)-2);ctx.restore();
}

function drawBlock(b,prev,dx,dy){
  dx=dx||0;dy=dy||0;
  var bx=b.x+dx,by=b.y+dy;
  ctx.globalAlpha=prev?0.45:1;
  var x=px(bx),y=px(by),w=px(b.w),h=px(b.h);
  var bdir=b.dir||'top';
  var col=b.color||defColor(b.type);
  if(!prev){
    var mT=b.mT!=null?b.mT:0,mBb=b.mB!=null?b.mB:0,mL=b.mL!=null?b.mL:0,mR=b.mR!=null?b.mR:0;
    if(mT||mBb||mL||mR){ctx.setLineDash([3,3]);ctx.strokeStyle='rgba(0,0,0,0.12)';ctx.lineWidth=1;ctx.strokeRect(px(bx-mL),px(by-mT),px(b.w+mL+mR),px(b.h+mT+mBb));ctx.setLineDash([]);}
  }
  switch(b.type){
    case 'chair':
      ctx.fillStyle=col;ctx.fillRect(x,y,w,h);
      ctx.fillStyle='rgba(255,255,255,0.8)';ctx.font='bold 8px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillText('C',x+w/2,y+h/2);break;
    case 'theater_row':{
      var n=b.n||state.n,cw=state.chairW,cs=state.chairSp;
      if(isH(bdir)){for(var i=0;i<n;i++){ctx.fillStyle=col;ctx.fillRect(px(bx+i*(cw+cs)),y,px(cw)-1,h);}}
      else{for(var i=0;i<n;i++){ctx.fillStyle=col;ctx.fillRect(x,px(by+i*(cw+cs)),w,px(cw)-1);}}
      break;}
    case 'desk_2':case 'desk_3':{
      var nc=(b.type==='desk_2')?2:3,cw2=55,dT=45,chT=55,len=180,fgap=(len-nc*cw2)/(nc+1);
      if(isH(bdir)){
        var deskY=(bdir==='top')?by:by+chT,chairY=(bdir==='top')?by+dT:by;
        ctx.fillStyle=col;ctx.fillRect(x,px(deskY),w,px(dT));
        ctx.fillStyle='rgba(0,0,0,0.45)';ctx.font='bold 8px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(nc+'人掛け',x+w/2,px(deskY)+px(dT)/2);
        for(var j=0;j<nc;j++){ctx.fillStyle='#339af0';ctx.fillRect(px(bx+fgap*(j+1)+cw2*j),px(chairY),px(cw2)-1,px(chT));}
      } else {
        var deskX=(bdir==='left')?bx:bx+chT,chairX=(bdir==='left')?bx+dT:bx;
        ctx.fillStyle=col;ctx.fillRect(px(deskX),y,px(dT),h);
        ctx.fillStyle='rgba(0,0,0,0.45)';ctx.font='bold 7px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
        ctx.save();ctx.translate(px(deskX)+px(dT)/2,y+h/2);ctx.rotate(-Math.PI/2);ctx.fillText(nc+'人掛け',0,0);ctx.restore();
        for(var j=0;j<nc;j++){ctx.fillStyle='#339af0';ctx.fillRect(px(chairX),px(by+fgap*(j+1)+cw2*j),px(chT),px(cw2)-1);}
      }
      break;}
    case 'stage':
      ctx.fillStyle=col;ctx.fillRect(x,y,w,h);ctx.strokeStyle='#7048e8';ctx.lineWidth=2;ctx.strokeRect(x,y,w,h);
      ctx.fillStyle='#7048e8';ctx.font='bold 10px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('STAGE',x+w/2,y+h/2);break;
    case 'aisle':
      ctx.fillStyle=col;ctx.fillRect(x,y,w,h);ctx.strokeStyle='#f59f00';ctx.lineWidth=1.5;ctx.strokeRect(x,y,w,h);
      ctx.fillStyle='#946300';ctx.font='9px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('通路',x+w/2,y+h/2);break;
    case 'fixture':
      ctx.fillStyle=col;ctx.fillRect(x,y,w,h);
      ctx.strokeStyle='rgba(255,255,255,0.6)';ctx.lineWidth=1.5;
      ctx.beginPath();ctx.moveTo(x+3,y+3);ctx.lineTo(x+w-3,y+h-3);ctx.moveTo(x+w-3,y+3);ctx.lineTo(x+3,y+h-3);ctx.stroke();break;
  }
  if(!prev&&state.selected.indexOf(b.id)>=0){
    ctx.setLineDash([4,3]);ctx.strokeStyle='#228be6';ctx.lineWidth=2.5;
    ctx.strokeRect(x-2,y-2,w+4,h+4);ctx.setLineDash([]);
    if(state.groupMoving&&dx===0){ctx.globalAlpha=0.25;ctx.fillStyle='#000';ctx.fillRect(x,y,w,h);ctx.globalAlpha=1;}
  }
  ctx.globalAlpha=1;
}

function updateStats(){
  var c=0,d=0;
  state.blocks.forEach(function(b){if(b.st==='c')c+=b.seats||0;if(b.st==='d')d+=b.seats||0;});
  document.getElementById('sc').textContent=c;
  document.getElementById('sd').textContent=d;
  document.getElementById('st').textContent=c+d;
  var n=state.selected.length;
  document.getElementById('sel-info').textContent=n>0?n+'個選択中':'0個選択中';
  var info='';
  if(n===1){
    var b=state.blocks.find(function(x){return x.id===state.selected[0];});
    if(b)info='X:'+(b.x/100).toFixed(2)+'m Y:'+(b.y/100).toFixed(2)+'m  W:'+(b.w/100).toFixed(2)+'m H:'+(b.h/100).toFixed(2)+'m'+(b.seats?' 席:'+b.seats:'');
  }
  document.getElementById('blk-info').textContent=info;
  var dis=n<2;
  ['al-l','al-r','al-hc','al-t','al-b','al-vc'].forEach(function(id){document.getElementById(id).disabled=dis;});
  document.getElementById('al-del').disabled=n===0;
  document.getElementById('btn-copy').disabled=n===0;
}

function getXY(e){
  var rect=cv.getBoundingClientRect(),sx=cv.width/rect.width,sy=cv.height/rect.height;
  return{x:snap(cmv((e.clientX-rect.left)*sx)),y:snap(cmv((e.clientY-rect.top)*sy))};
}
function updateRubberSelection(){
  if(!state.rubberStart||!state.rubberEnd)return;
  var rx=Math.min(state.rubberStart.x,state.rubberEnd.x),ry=Math.min(state.rubberStart.y,state.rubberEnd.y);
  var rw=Math.abs(state.rubberEnd.x-state.rubberStart.x),rh=Math.abs(state.rubberEnd.y-state.rubberStart.y);
  state.selected=[];
  state.blocks.forEach(function(b){if(overlaps(rx,ry,rw,rh,b.x,b.y,b.w,b.h))state.selected.push(b.id);});
}

function initCanvas(){
  cv=document.getElementById('cv');
  if(!cv){setTimeout(initCanvas,50);return;}
  ctx=cv.getContext('2d');
  cv.width=VW*S; cv.height=VH*S;
  cv.addEventListener('mousemove',function(e){
    var p=getXY(e);state.hover=p;
    document.getElementById('coord').textContent='カーソル: X '+(p.x/100).toFixed(2)+'m  Y '+(p.y/100).toFixed(2)+'m';
    if(state.tool==='select'){
      if(state.groupMoving){
        var dx=snap(p.x-state.groupMoveStart.x),dy=snap(p.y-state.groupMoveStart.y);
        if(!state.groupHistoryPushed&&(Math.abs(dx)>0||Math.abs(dy)>0)){pushHistory();state.groupHistoryPushed=true;}
        state.groupMoveDelta={x:dx,y:dy};state.didDrag=true;
      } else if(state.rubberActive){state.rubberEnd=p;updateRubberSelection();}
      var b=hitBlock(p.x,p.y);cv.style.cursor=(b&&state.selected.indexOf(b.id)>=0)?'move':(state.rubberActive?'crosshair':'default');
    } else {cv.style.cursor='crosshair';}
    drawAll();
  });
  cv.addEventListener('mousedown',function(e){
    if(e.button!==0)return;
    var p=getXY(e);state.hover=p;state.didDrag=false;
    if(state.tool==='select'){
      var b=hitBlock(p.x,p.y);
      if(b){
        if(e.shiftKey){var idx=state.selected.indexOf(b.id);if(idx>=0)state.selected.splice(idx,1);else state.selected.push(b.id);}
        else{if(state.selected.indexOf(b.id)<0)state.selected=[b.id];}
        state.mouseDownBlock=b;state.groupMoving=true;state.groupMoveStart=p;state.groupHistoryPushed=false;state.groupMoveBase={};
        state.blocks.forEach(function(blk){if(state.selected.indexOf(blk.id)>=0)state.groupMoveBase[blk.id]={x:blk.x,y:blk.y};});
        state.groupMoveDelta={x:0,y:0};
      } else {if(!e.shiftKey)state.selected=[];state.rubberActive=true;state.rubberStart=p;state.rubberEnd=p;}
    } else if(AREA.indexOf(state.tool)>=0){state.dragStart=p;state.dragging=true;}
    else{placeBlock(p.x,p.y);}
  });
  cv.addEventListener('mouseup',function(e){
    if(state.tool==='select'){
      if(state.groupMoving){
        if(state.didDrag&&state.groupHistoryPushed){
          state.blocks.forEach(function(b){
            if(state.groupMoveBase[b.id]){
              b.x=Math.max(0,Math.min(VW-b.w,snap(state.groupMoveBase[b.id].x+state.groupMoveDelta.x)));
              b.y=Math.max(0,Math.min(VH-b.h,snap(state.groupMoveBase[b.id].y+state.groupMoveDelta.y)));
            }
          });
        }
        state.groupMoving=false;state.groupMoveDelta={x:0,y:0};state.mouseDownBlock=null;
      }
      if(state.rubberActive){state.rubberActive=false;state.rubberStart=null;state.rubberEnd=null;}
    } else if(state.dragging){
      state.dragging=false;
      var p=getXY(e);
      var x=Math.min(state.dragStart.x,p.x),y=Math.min(state.dragStart.y,p.y);
      var w=snap(Math.abs(p.x-state.dragStart.x)),h=snap(Math.abs(p.y-state.dragStart.y));
      if(w>=5&&h>=5){pushHistory();state.blocks.push(mkBlock(state.tool,x,y,w,h));}
      state.dragStart=null;
    }
    drawAll();
  });
  cv.addEventListener('mouseleave',function(){
    if(state.groupMoving){state.groupMoving=false;state.groupMoveDelta={x:0,y:0};if(state.groupHistoryPushed){undo();}}
    state.rubberActive=false;state.dragging=false;state.hover=null;
    document.getElementById('coord').textContent='カーソル: —';drawAll();
  });
  cv.addEventListener('contextmenu',function(e){
    e.preventDefault();var p=getXY(e);
    for(var i=state.blocks.length-1;i>=0;i--){
      var b=state.blocks[i];
      if(p.x>=b.x&&p.x<b.x+b.w&&p.y>=b.y&&p.y<b.y+b.h){
        pushHistory();state.blocks.splice(i,1);
        state.selected=state.selected.filter(function(id){return id!==b.id;});
        drawAll();break;
      }
    }
  });
  selTool('theater_row');updateUndoBtn();setCopyDir('top');drawAll();
}

function setZoom(newZ, e){
  var oldZ=Z;
  Z=Math.max(MIN_Z,Math.min(MAX_Z,newZ));
  // キャンバスサイズ更新
  var wrap=document.getElementById('wrap');
  var scrollX=wrap.scrollLeft, scrollY=wrap.scrollTop;
  // マウス基点でスクロール位置調整（ホイール時）
  if(e){
    var rect=cv.getBoundingClientRect();
    var mouseX=(e.clientX-rect.left);var mouseY=(e.clientY-rect.top);
    var ratio=Z/oldZ;
    wrap.scrollLeft=mouseX*ratio-mouseX+scrollX*ratio;
    wrap.scrollTop=mouseY*ratio-mouseY+scrollY*ratio;
  }
  cv.width=Math.round(VW*PS()); cv.height=Math.round(VH*PS());
  var pct=Math.round(Z*100);
  document.getElementById('zoom-label').textContent=pct+'%';
  drawAll();
}

function placeBlock(x,y){
  var d=dims(state.tool,state.n,state.frontDir);
  if(!canPlaceAt(x,y,d.w,d.h,state.mL,state.mR,state.mT,state.mB,state.blocks)) return;
  pushHistory();state.blocks.push(mkBlock(state.tool,x,y,d.w,d.h));drawAll();
}

function showModal(msg){
  return new Promise(function(res){
    document.getElementById('modal-msg').textContent=msg;
    document.getElementById('modal').className='show';
    document.getElementById('modal-ok').onclick=function(){document.getElementById('modal').className='';res(true);};
    document.getElementById('modal-cancel').onclick=function(){document.getElementById('modal').className='';res(false);};
  });
}
async function clearAll(){if(await showModal('全てのレイアウトをリセットしますか？')){pushHistory();state.blocks=[];state.selected=[];drawAll();}}

function alignSel(dir){
  if(state.selected.length<2)return;
  pushHistory();
  var sel=state.blocks.filter(function(b){return state.selected.indexOf(b.id)>=0;});
  if(dir==='left'){var ref=Math.min.apply(null,sel.map(function(b){return b.x;}));sel.forEach(function(b){b.x=ref;});}
  else if(dir==='right'){var ref=Math.max.apply(null,sel.map(function(b){return b.x+b.w;}));sel.forEach(function(b){b.x=ref-b.w;});}
  else if(dir==='top'){var ref=Math.min.apply(null,sel.map(function(b){return b.y;}));sel.forEach(function(b){b.y=ref;});}
  else if(dir==='bottom'){var ref=Math.max.apply(null,sel.map(function(b){return b.y+b.h;}));sel.forEach(function(b){b.y=ref-b.h;});}
  else if(dir==='hcenter'){var ref=(Math.min.apply(null,sel.map(function(b){return b.x;}))+Math.max.apply(null,sel.map(function(b){return b.x+b.w;})))/2;sel.forEach(function(b){b.x=snap(ref-b.w/2);});}
  else if(dir==='vcenter'){var ref=(Math.min.apply(null,sel.map(function(b){return b.y;}))+Math.max.apply(null,sel.map(function(b){return b.y+b.h;})))/2;sel.forEach(function(b){b.y=snap(ref-b.h/2);});}
  showToast('整列完了');drawAll();
}
function deleteSel(){if(!state.selected.length)return;pushHistory();state.blocks=state.blocks.filter(function(b){return state.selected.indexOf(b.id)<0;});state.selected=[];drawAll();}
function copyWithGap(){
  if(!state.selected.length)return;
  var gap=parseInt(document.getElementById('copy-gap').value)||0;
  var dir=state.copyDir;pushHistory();
  var sel=state.blocks.filter(function(b){return state.selected.indexOf(b.id)>=0;});
  var newIds=[];
  sel.forEach(function(b){
    var nx=b.x+(dir==='right'?b.w+gap:dir==='left'?-(b.w+gap):0);
    var ny=b.y+(dir==='bottom'?b.h+gap:dir==='top'?-(b.h+gap):0);
    nx=Math.max(0,Math.min(VW-b.w,snap(nx)));ny=Math.max(0,Math.min(VH-b.h,snap(ny)));
    var nb=Object.assign({},b,{id:state.nextId++,x:nx,y:ny});
    state.blocks.push(nb);newIds.push(nb.id);
  });
  state.selected=newIds;showToast('複製完了');drawAll();
}
function setCopyDir(d){
  state.copyDir=d;
  ['top','bottom','left','right'].forEach(function(x){var el=document.getElementById('cd-'+x);if(el)el.className='rbtn'+(x===d?' active':'');});
}
function setColor(v){state.currentColor=v;state.blocks.forEach(function(b){if(state.selected.indexOf(b.id)>=0)b.color=v;});drawAll();}
function resetColor(){var c=defColor(state.tool);state.currentColor=c;document.getElementById('cpicker').value=c;state.blocks.forEach(function(b){if(state.selected.indexOf(b.id)>=0)b.color=c;});drawAll();}

async function autoPack(){
  if(!await showModal('自動詰め配置します。\\n椅子・机はクリアされます。（障害物は維持）'))return;
  if(PLACE.indexOf(state.tool)<0){showToast('配置ブロックを選んでください');return;}
  pushHistory();
  state.blocks=state.blocks.filter(function(b){return AREA.indexOf(b.type)>=0;});
  var d=dims(state.tool,state.n,state.frontDir);
  var mT=state.mT,mB=state.mB,mL=state.mL,mR=state.mR;
  var stepX=d.w+mL+mR,stepY=d.h+mT+mB;
  function ok(x,y){return canPlaceAt(x,y,d.w,d.h,mL,mR,mT,mB,state.blocks);}
  var dir=state.frontDir;
  if(dir==='top'||dir==='bottom'){
    var y=(dir==='top')?mT:VH-mB-d.h,ystep=(dir==='top')?stepY:-stepY;
    while(dir==='top'?(y+d.h<=VH-mB+1):(y>=mT-1)){var x=mL;while(x+d.w<=VW-mR){if(ok(x,y))state.blocks.push(mkBlock(state.tool,x,y,d.w,d.h));x+=stepX;}y+=ystep;}
  } else {
    var xc=(dir==='left')?mL:VW-mR-d.w,xstep=(dir==='left')?stepX:-stepX;
    while(dir==='left'?(xc+d.w<=VW-mR+1):(xc>=mL-1)){var yc=mT;while(yc+d.h<=VH-mB){if(ok(xc,yc))state.blocks.push(mkBlock(state.tool,xc,yc,d.w,d.h));yc+=stepY;}xc+=xstep;}
  }
  state.selected=[];drawAll();
}

function saveJSON(){
  var data={version:1,frontDir:state.frontDir,nextId:state.nextId,blocks:state.blocks};
  var json=JSON.stringify(data,null,2);
  var blob=new Blob([json],{type:'application/json'});
  var url=URL.createObjectURL(blob);
  var a=document.createElement('a');a.href=url;a.download='layout_'+new Date().toISOString().slice(0,10)+'.json';a.click();URL.revokeObjectURL(url);
  showToast('保存しました');
}
function loadJSON(input){
  var file=input.files[0];if(!file)return;
  var reader=new FileReader();
  reader.onload=function(e){
    try{
      var data=JSON.parse(e.target.result);
      if(!data.blocks||!Array.isArray(data.blocks))throw new Error('invalid');
      pushHistory();state.blocks=data.blocks;
      state.nextId=data.nextId||Math.max.apply(null,data.blocks.map(function(b){return b.id||0;}).concat([0]))+1;
      if(data.frontDir)setDir(data.frontDir);
      state.selected=[];drawAll();showToast('読込完了 ('+data.blocks.length+'個)');
    }catch(err){showToast('読込エラー: JSONが不正です');}
    input.value='';
  };
  reader.readAsText(file);
}

function selTool(t){
  state.tool=t;
  document.querySelectorAll('.tbtn').forEach(function(b){b.classList.remove('active');});
  var el=document.getElementById('t-'+t);if(el)el.classList.add('active');
  document.getElementById('tlabel').textContent=NAMES[t]||t;
  document.getElementById('n-row').style.display=(t==='theater_row')?'flex':'none';
  document.getElementById('cw-row').style.display=(t==='theater_row'||t==='chair')?'flex':'none';
  if(t!=='select'&&DEF_COLOR[t]){state.currentColor=DEF_COLOR[t];document.getElementById('cpicker').value=DEF_COLOR[t];}
  if(t!=='select'){state.selected=[];}
  if(cv)cv.style.cursor=(t==='select')?'default':'crosshair';
  drawAll();
}
function setN(v){state.n=parseInt(v)||8;document.getElementById('nv').textContent=v+'席';drawAll();}
function setCW(v){state.chairW=Math.max(30,Math.min(100,parseInt(v)||55));drawAll();}
function setM(){
  state.mT=parseInt(document.getElementById('mT').value)||0;state.mB=parseInt(document.getElementById('mB').value)||0;
  state.mL=parseInt(document.getElementById('mL').value)||0;state.mR=parseInt(document.getElementById('mR').value)||0;drawAll();
}
function setDir(d){
  state.frontDir=d;
  ['top','bottom','left','right'].forEach(function(x){var el=document.getElementById('d-'+x);if(el)el.className='rbtn'+(x===d?' active':'');});
  drawAll();
}

document.addEventListener('keydown',function(e){
  var tag=(document.activeElement||{}).tagName||'';
  if(tag==='INPUT'||tag==='TEXTAREA') return;
  if(e.ctrlKey||e.metaKey){
    if(e.key==='z'){e.preventDefault();undo();return;}
    if(e.key==='y'||(e.shiftKey&&e.key==='Z')){e.preventDefault();redo();return;}
    if(e.key==='a'){e.preventDefault();state.selected=state.blocks.map(function(b){return b.id;});drawAll();return;}
  }
  if(e.key==='Delete'||e.key==='Backspace'){if(state.selected.length>0){e.preventDefault();deleteSel();}}
  if(e.key==='Escape'){state.selected=[];drawAll();}
  if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].indexOf(e.key)>=0&&state.selected.length>0){
    e.preventDefault();
    var step=e.shiftKey?50:5;var dx=0,dy=0;
    if(e.key==='ArrowLeft')dx=-step;if(e.key==='ArrowRight')dx=step;
    if(e.key==='ArrowUp')dy=-step;if(e.key==='ArrowDown')dy=step;
    pushHistory();
    state.blocks.forEach(function(b){
      if(state.selected.indexOf(b.id)>=0){b.x=Math.max(0,Math.min(VW-b.w,b.x+dx));b.y=Math.max(0,Math.min(VH-b.h,b.y+dy));}
    });
    drawAll();
  }
});

// ===== 初期化（DOMContentLoaded または即時実行）=====
if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded', initCanvas);
} else {
  initCanvas();
}
</script></body></html>"""

st.components.v1.html(HTML, height=900, scrolling=True)
