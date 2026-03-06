import streamlit as st
st.set_page_config(page_title="会場レイアウトシミュレーター | YEG彦根", page_icon="🏛", layout="wide")
st.markdown("<style>.block-container{padding-top:1rem}</style>", unsafe_allow_html=True)
st.title("🏛 会場レイアウトシミュレーター")
st.caption("日本YEG 未来フォーラム（彦根）｜彦根商工会議所 4階大ホール｜20m × 14m")

HTML = """<!DOCTYPE html><html lang="ja"><head><meta charset="UTF-8"><style>
*{box-sizing:border-box;margin:0;padding:0}
body{background:#f8f9fa;font-family:'Segoe UI',system-ui,sans-serif;padding:10px;user-select:none}
.row{display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-bottom:8px}
.tbtn{padding:6px 10px;border:2px solid transparent;border-radius:7px;cursor:pointer;font-size:11px;font-weight:700;transition:all .12s}
.tbtn:hover{filter:brightness(.92);transform:translateY(-1px)}
.tbtn.active{border-color:#333;box-shadow:0 0 0 2px rgba(0,0,0,.15)}
.rbtn{padding:4px 8px;border:1px solid #ddd;border-radius:5px;cursor:pointer;font-size:11px;font-weight:600;background:#fff;color:#555;transition:all .12s}
.rbtn:hover{background:#f0f0f0}
.rbtn.active{background:#4263eb;color:#fff;border-color:#4263eb}
.abtn{padding:3px 7px;border:1px solid #adb5bd;border-radius:5px;cursor:pointer;font-size:11px;background:#f8f9fa;color:#333;transition:all .12s}
.abtn:hover{background:#e9ecef}
.abtn:disabled{opacity:.35;cursor:default}
.red-btn{padding:6px 12px;background:#fa5252;color:#fff;border:none;border-radius:7px;cursor:pointer;font-size:12px;font-weight:700;margin-left:auto}
.green-btn{padding:6px 14px;background:#40c057;color:#fff;border:none;border-radius:7px;cursor:pointer;font-size:12px;font-weight:700}
.undo-btn{padding:6px 10px;background:#868e96;color:#fff;border:none;border-radius:7px;cursor:pointer;font-size:12px;font-weight:700}
.undo-btn:disabled{opacity:.4;cursor:default}
.panel{background:#fff;border:1px solid #e0e0e0;border-radius:8px;padding:8px 12px;margin-bottom:8px}
.lbl{font-size:11px;color:#666;white-space:nowrap}
.badge{background:linear-gradient(135deg,#4263eb,#7048e8);color:#fff;padding:5px 16px;border-radius:16px;font-size:13px;font-weight:700}
#wrap{border:2px solid #bbb;border-radius:6px;overflow:auto;display:block;box-shadow:0 4px 14px rgba(0,0,0,.08)}
canvas{display:block}
.stat-box{display:flex;gap:16px;align-items:center}
.stat-item{font-size:12px;color:#555}.stat-item b{color:#222}
#modal{display:none;position:fixed;inset:0;background:rgba(0,0,0,.5);justify-content:center;align-items:center;z-index:9999}
#modal.show{display:flex}
#modal-box{background:#fff;border-radius:12px;padding:24px 28px;max-width:340px;width:90%;text-align:center;box-shadow:0 8px 32px rgba(0,0,0,.3)}
#modal-msg{margin:0 0 18px;font-size:13px;color:#333;line-height:1.6}
.modal-btns{display:flex;gap:8px;justify-content:center}
.mbtn-cancel{padding:8px 20px;border:1px solid #ddd;border-radius:8px;cursor:pointer;font-size:13px;background:#f8f9fa;color:#555}
.mbtn-ok{padding:8px 20px;border:none;border-radius:8px;cursor:pointer;font-size:13px;font-weight:700;background:#4263eb;color:#fff}
.legend{display:flex;gap:12px;flex-wrap:wrap;margin-top:8px}
.li{display:flex;align-items:center;gap:4px;font-size:11px;color:#777}
.dot{width:13px;height:13px;border-radius:3px;border:1px solid #ddd;flex-shrink:0}
#toast{position:fixed;bottom:16px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,.72);color:#fff;padding:6px 16px;border-radius:20px;font-size:12px;opacity:0;transition:opacity .3s;pointer-events:none;z-index:9000}
#toast.show{opacity:1}
#coord{font-size:11px;color:#888;margin-top:3px;height:15px;font-family:monospace}
.minput{width:46px;font-size:11px;border:1px solid #ddd;border-radius:4px;padding:2px 4px;text-align:right}
.mgrid{display:grid;grid-template-columns:auto 1fr auto 1fr;gap:3px 6px;align-items:center}
#sel-info{font-size:11px;color:#4263eb;font-weight:700;min-width:60px}
</style></head><body>

<div id="modal"><div id="modal-box">
  <p id="modal-msg"></p>
  <div class="modal-btns">
    <button class="mbtn-cancel" id="modal-cancel">キャンセル</button>
    <button class="mbtn-ok" id="modal-ok">OK</button>
  </div>
</div></div>
<div id="toast"></div>

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
</div>

<div class="panel">
  <div class="row" style="margin-bottom:6px;gap:14px">
    <span class="lbl">⚙ ブロック設定</span>
    <div class="row" style="margin-bottom:0;gap:5px" id="n-row">
      <span class="lbl">席数</span>
      <input type="range" id="ni" min="2" max="20" value="8" oninput="setN(this.value)" style="width:80px">
      <b id="nv" style="font-size:11px;min-width:32px">8席</b>
    </div>
    <div class="row" style="margin-bottom:0;gap:5px">
      <span class="lbl">ブロック色</span>
      <input type="color" id="cpicker" value="#339af0" oninput="setColor(this.value)" style="width:30px;height:24px;border:1px solid #ddd;border-radius:4px;cursor:pointer;padding:1px">
      <button class="abtn" onclick="resetColor()" style="font-size:10px">リセット</button>
    </div>
    <div style="margin-left:auto;display:flex;gap:6px">
      <button class="undo-btn" id="btn-undo" onclick="undo()" title="Ctrl+Z">↩ Undo</button>
      <button class="undo-btn" id="btn-redo" onclick="redo()" title="Ctrl+Y">↪ Redo</button>
    </div>
  </div>
  <div class="row" style="margin-bottom:0;gap:10px;align-items:flex-start">
    <span class="lbl" style="line-height:22px">余白 (cm)</span>
    <div class="mgrid">
      <span class="lbl">↑ 上</span><input class="minput" id="mT" type="number" min="0" max="300" value="30" oninput="setM()">
      <span class="lbl">↓ 下</span><input class="minput" id="mB" type="number" min="0" max="300" value="30" oninput="setM()">
      <span class="lbl">← 左</span><input class="minput" id="mL" type="number" min="0" max="300" value="5" oninput="setM()">
      <span class="lbl">→ 右</span><input class="minput" id="mR" type="number" min="0" max="300" value="5" oninput="setM()">
    </div>
  </div>
</div>

<div class="panel">
  <div class="row" style="margin-bottom:6px;gap:10px">
    <span class="lbl">🖱 選択操作</span>
    <span id="sel-info">0 個選択中</span>
    <span class="lbl">整列:</span>
    <button class="abtn" id="al-l"  onclick="alignSel('left')"    title="左端揃え">⬛← 左</button>
    <button class="abtn" id="al-r"  onclick="alignSel('right')"   title="右端揃え">→⬛ 右</button>
    <button class="abtn" id="al-hc" onclick="alignSel('hcenter')" title="左右中央">↔ 中央</button>
    <button class="abtn" id="al-t"  onclick="alignSel('top')"     title="上端揃え">⬛↑ 上</button>
    <button class="abtn" id="al-b"  onclick="alignSel('bottom')"  title="下端揃え">↓⬛ 下</button>
    <button class="abtn" id="al-vc" onclick="alignSel('vcenter')" title="上下中央">↕ 中央</button>
    <button class="abtn" id="al-del" onclick="deleteSel()" style="background:#fff0f0;border-color:#ffa8a8;color:#c92a2a">🗑 削除</button>
  </div>
  <div class="row" style="margin-bottom:0;gap:8px">
    <span class="lbl">複製:</span>
    <span class="lbl">間隔</span>
    <input class="minput" id="copy-gap" type="number" min="0" max="2000" value="30" style="width:52px">
    <span class="lbl">cm</span>
    <span class="lbl">方向</span>
    <button class="rbtn active" id="cd-top"    onclick="setCopyDir('top')"   >↑</button>
    <button class="rbtn"        id="cd-bottom" onclick="setCopyDir('bottom')" >↓</button>
    <button class="rbtn"        id="cd-left"   onclick="setCopyDir('left')"  >←</button>
    <button class="rbtn"        id="cd-right"  onclick="setCopyDir('right')" >→</button>
    <button class="abtn" id="btn-copy" onclick="copyWithGap()" style="background:#e7f5ff;border-color:#74c0fc;color:#1864ab;font-weight:700">📋 複製</button>
    <span class="lbl" style="color:#aaa;font-size:10px">※ 元ブロックの端から間隔分離れた位置にコピー</span>
  </div>
</div>

<div class="panel">
  <div class="row" style="margin-bottom:0;gap:12px">
    <span class="lbl">⚡ 自動設営</span>
    <div class="row" style="margin-bottom:0;gap:3px">
      <span class="lbl">正面</span>
      <button class="rbtn active" id="d-top"    onclick="setDir('top')"   >↑ 上</button>
      <button class="rbtn"        id="d-bottom" onclick="setDir('bottom')" >↓ 下</button>
      <button class="rbtn"        id="d-left"   onclick="setDir('left')"  >← 左</button>
      <button class="rbtn"        id="d-right"  onclick="setDir('right')" >→ 右</button>
    </div>
    <button class="green-btn" onclick="autoPack()">▶ 自動詰め</button>
    <span class="lbl" style="color:#aaa">*ドラッグで範囲指定 ｜ 右クリックで削除</span>
  </div>
</div>

<div id="coord">カーソル: —</div>
<div id="wrap"><canvas id="cv"></canvas></div>
<div class="legend">
  <div class="li"><div class="dot" style="background:#339af0"></div>椅子・椅子列</div>
  <div class="li"><div class="dot" style="background:#ffc078"></div>机＋椅子</div>
  <div class="li"><div class="dot" style="background:#d0bfff"></div>ステージ</div>
  <div class="li"><div class="dot" style="background:#ffe066"></div>通路</div>
  <div class="li"><div class="dot" style="background:#bbb"></div>備品・柱</div>
</div>
<div style="font-size:10px;color:#bbb;margin-top:4px">[1-7]ツール [8]選択　Shift+クリック=複数選択　ドラッグ=範囲選択/移動　Ctrl+Z/Y=Undo/Redo</div>

<script>
var S=0.4,VW=2000,VH=1400;
var cv=document.getElementById('cv');
var ctx=cv.getContext('2d');
cv.width=VW*S; cv.height=VH*S;

// ===== デフォルトカラー =====
var DEF_COLOR={chair:'#339af0',theater_row:'#339af0',desk_2:'#ffb74d',desk_3:'#ffb74d',stage:'#d0bfff',aisle:'#ffe066',fixture:'#868e96'};

var state={
  blocks:[],tool:'theater_row',frontDir:'top',
  selected:[],          // 選択中ブロックIDリスト
  hover:null,
  dragStart:null,dragging:false,     // AREA ドラッグ
  rubberStart:null,rubberEnd:null,rubberActive:false,  // 範囲選択
  groupMoving:false,groupMoveStart:null,groupMoveBase:{},groupMoveDelta:{x:0,y:0},groupHistoryPushed:false,
  didDrag:false,        // クリック vs ドラッグ判定
  mouseDownBlock:null,  // mousedown 時にヒットしたブロック
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
function px(c){return c*S;}
function cmv(p){return p/S;}
function isH(d){return d==='top'||d==='bottom';}
function defColor(type){return DEF_COLOR[type]||'#999';}

// ===== dims =====
function dims(type,n,dir){
  n=n||state.n; dir=dir||state.frontDir;
  var cw=state.chairW,cs=state.chairSp,h=isH(dir);
  switch(type){
    case 'chair':       return{w:55,h:55,seats:1,st:'c'};
    case 'theater_row': return h?{w:n*cw+(n-1)*cs,h:55,seats:n,st:'c'}:{w:55,h:n*cw+(n-1)*cs,seats:n,st:'c'};
    case 'desk_2':      return h?{w:180,h:100,seats:2,st:'d'}:{w:100,h:180,seats:2,st:'d'};
    case 'desk_3':      return h?{w:180,h:100,seats:3,st:'d'}:{w:100,h:180,seats:3,st:'d'};
    default:            return{w:100,h:100,seats:0,st:null};
  }
}

function mkBlock(type,x,y,w,h){
  var d=dims(type,state.n,state.frontDir);
  return{id:state.nextId++,type,x:snap(x),y:snap(y),
    w:w||d.w,h:h||d.h,n:state.n,dir:state.frontDir,
    seats:d.seats,st:d.st,
    color:state.currentColor,
    mT:state.mT,mB:state.mB,mL:state.mL,mR:state.mR,locked:false};
}
function cloneBlocks(a){return a.map(function(b){return Object.assign({},b);});}

// ===== Undo/Redo =====
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

function hitBlock(x,y){
  for(var i=state.blocks.length-1;i>=0;i--){
    var b=state.blocks[i];
    if(x>=b.x&&x<b.x+b.w&&y>=b.y&&y<b.y+b.h)return b;
  }
  return null;
}

// ===== 描画 =====
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
  // プレビュー（配置ツール）
  if(state.tool!=='select'&&state.hover&&PLACE.indexOf(state.tool)>=0&&!state.dragging){
    var d=dims(state.tool,state.n,state.frontDir);
    drawBlock({type:state.tool,x:state.hover.x,y:state.hover.y,w:d.w,h:d.h,n:state.n,dir:state.frontDir,
      color:state.currentColor,mT:state.mT,mB:state.mB,mL:state.mL,mR:state.mR},true,0,0);
  }
  // AREA ドラッグプレビュー
  if(state.dragging&&state.dragStart&&state.hover){
    var rx=Math.min(state.dragStart.x,state.hover.x),ry=Math.min(state.dragStart.y,state.hover.y);
    ctx.globalAlpha=0.35;ctx.fillStyle=state.currentColor;
    ctx.fillRect(px(rx),px(ry),px(Math.abs(state.hover.x-state.dragStart.x)),px(Math.abs(state.hover.y-state.dragStart.y)));
    ctx.globalAlpha=1;
  }
  // 範囲選択ラバーバンド
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
  ctx.strokeStyle='#ebebeb';ctx.lineWidth=0.5;
  for(i=0;i<=VW;i+=10){ctx.beginPath();ctx.moveTo(px(i),0);ctx.lineTo(px(i),cv.height);ctx.stroke();}
  for(i=0;i<=VH;i+=10){ctx.beginPath();ctx.moveTo(0,px(i));ctx.lineTo(cv.width,px(i));ctx.stroke();}
  ctx.strokeStyle='#d8d8d8';ctx.lineWidth=0.8;
  for(i=0;i<=VW;i+=50){ctx.beginPath();ctx.moveTo(px(i),0);ctx.lineTo(px(i),cv.height);ctx.stroke();}
  for(i=0;i<=VH;i+=50){ctx.beginPath();ctx.moveTo(0,px(i));ctx.lineTo(cv.width,px(i));ctx.stroke();}
  ctx.strokeStyle='#aaa';ctx.lineWidth=1.5;
  ctx.fillStyle='#999';ctx.font='bold 9px sans-serif';ctx.textAlign='left';ctx.textBaseline='top';
  for(i=0;i<=VW;i+=100){ctx.beginPath();ctx.moveTo(px(i),0);ctx.lineTo(px(i),cv.height);ctx.stroke();if(i>0)ctx.fillText(i/100+'m',px(i)+2,2);}
  for(i=0;i<=VH;i+=100){ctx.beginPath();ctx.moveTo(0,px(i));ctx.lineTo(cv.width,px(i));ctx.stroke();if(i>0)ctx.fillText(i/100+'m',2,px(i)+2);}
  ctx.fillStyle='rgba(100,100,100,0.3)';
  for(var xi=0;xi<=VW;xi+=100)for(var yi=0;yi<=VH;yi+=100){ctx.beginPath();ctx.arc(px(xi),px(yi),2,0,Math.PI*2);ctx.fill();}
  ctx.save();ctx.shadowColor='rgba(220,30,30,0.4)';ctx.shadowBlur=8;ctx.strokeStyle='#e03131';ctx.lineWidth=3;ctx.strokeRect(0,0,px(VW),px(VH));ctx.restore();
}

function drawBlock(b,prev,dx,dy){
  dx=dx||0;dy=dy||0;
  var bx=b.x+dx,by=b.y+dy;
  ctx.globalAlpha=prev?0.45:1;
  var x=px(bx),y=px(by),w=px(b.w),h=px(b.h);
  var bdir=b.dir||'top';
  var col=b.color||defColor(b.type);

  // マージン破線
  if(!prev){
    var mT=b.mT!=null?b.mT:(b.mFB||0),mBb=b.mB!=null?b.mB:(b.mFB||0),mL=b.mL!=null?b.mL:(b.mLR||0),mR=b.mR!=null?b.mR:(b.mLR||0);
    if(mT||mBb||mL||mR){
      ctx.setLineDash([3,3]);ctx.strokeStyle='rgba(0,0,0,0.12)';ctx.lineWidth=1;
      ctx.strokeRect(px(bx-mL),px(by-mT),px(b.w+mL+mR),px(b.h+mT+mBb));ctx.setLineDash([]);
    }
  }

  switch(b.type){
    case 'chair':
      ctx.fillStyle=col;ctx.fillRect(x,y,w,h);
      ctx.fillStyle='rgba(255,255,255,0.8)';ctx.font='bold 8px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillText('C',x+w/2,y+h/2);break;
    case 'theater_row':{
      var n=b.n||state.n,cw=state.chairW,cs=state.chairSp;
      if(isH(bdir)){
        for(var i=0;i<n;i++){var cx=px(bx+i*(cw+cs));ctx.fillStyle=col;ctx.fillRect(cx,y,px(cw)-1,h);}
      } else {
        for(var i=0;i<n;i++){var cy=px(by+i*(cw+cs));ctx.fillStyle=col;ctx.fillRect(x,cy,w,px(cw)-1);}
      }
      break;}
    case 'desk_2':case 'desk_3':{
      var nc=(b.type==='desk_2')?2:3,cw2=55,dT=45,chT=55,len=180,fgap=(len-nc*cw2)/(nc+1);
      if(isH(bdir)){
        var deskY=(bdir==='top')?by:by+chT,chairY=(bdir==='top')?by+dT:by;
        ctx.fillStyle=col;ctx.fillRect(x,px(deskY),w,px(dT));
        ctx.fillStyle='rgba(0,0,0,0.45)';ctx.font='bold 8px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
        ctx.fillText(nc+'人掛け',x+w/2,px(deskY)+px(dT)/2);
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
  // 選択ハイライト
  if(!prev&&state.selected.indexOf(b.id)>=0){
    ctx.setLineDash([4,3]);ctx.strokeStyle='#228be6';ctx.lineWidth=2.5;
    ctx.strokeRect(x-2,y-2,w+4,h+4);ctx.setLineDash([]);
    // 移動中は元位置を暗く
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
  var dis=n<2;
  ['al-l','al-r','al-hc','al-t','al-b','al-vc'].forEach(function(id){document.getElementById(id).disabled=dis;});
  document.getElementById('al-del').disabled=n===0;
  document.getElementById('btn-copy').disabled=n===0;
}

// ===== イベント =====
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

cv.addEventListener('mousemove',function(e){
  var p=getXY(e);state.hover=p;
  document.getElementById('coord').textContent='カーソル: X '+(p.x/100).toFixed(2)+'m  Y '+(p.y/100).toFixed(2)+'m';
  if(state.tool==='select'){
    if(state.groupMoving){
      var dx=snap(p.x-state.groupMoveStart.x),dy=snap(p.y-state.groupMoveStart.y);
      if(!state.groupHistoryPushed&&(Math.abs(dx)>0||Math.abs(dy)>0)){pushHistory();state.groupHistoryPushed=true;}
      state.groupMoveDelta={x:dx,y:dy};
      state.didDrag=true;
    } else if(state.rubberActive){
      state.rubberEnd=p;updateRubberSelection();
    }
    var b=hitBlock(p.x,p.y);cv.style.cursor=(b&&state.selected.indexOf(b.id)>=0)?'move':(state.rubberActive?'crosshair':'default');
  } else {
    cv.style.cursor='crosshair';
  }
  drawAll();
});

cv.addEventListener('mousedown',function(e){
  if(e.button!==0)return;
  var p=getXY(e);state.hover=p;state.didDrag=false;
  if(state.tool==='select'){
    var b=hitBlock(p.x,p.y);
    if(b){
      if(e.shiftKey){
        var idx=state.selected.indexOf(b.id);
        if(idx>=0)state.selected.splice(idx,1);else state.selected.push(b.id);
      } else {
        if(state.selected.indexOf(b.id)<0)state.selected=[b.id];
      }
      state.mouseDownBlock=b;
      state.groupMoving=true;state.groupMoveStart=p;state.groupHistoryPushed=false;
      state.groupMoveBase={};
      state.blocks.forEach(function(blk){
        if(state.selected.indexOf(blk.id)>=0)state.groupMoveBase[blk.id]={x:blk.x,y:blk.y};
      });
      state.groupMoveDelta={x:0,y:0};
    } else {
      if(!e.shiftKey)state.selected=[];
      state.rubberActive=true;state.rubberStart=p;state.rubberEnd=p;
    }
  } else if(AREA.indexOf(state.tool)>=0){
    state.dragStart=p;state.dragging=true;
  } else {
    placeBlock(p.x,p.y);
  }
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
  if(state.groupMoving){
    // キャンバル外 → 移動キャンセル
    state.groupMoving=false;state.groupMoveDelta={x:0,y:0};
    if(state.groupHistoryPushed){undo();}
  }
  state.rubberActive=false;state.dragging=false;state.hover=null;
  document.getElementById('coord').textContent='カーソル: —';
  drawAll();
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

function placeBlock(x,y){
  var d=dims(state.tool,state.n,state.frontDir);
  if(x+d.w>VW||y+d.h>VH||x<0||y<0)return;
  for(var i=0;i<state.blocks.length;i++){if(overlaps(x,y,d.w,d.h,state.blocks[i].x,state.blocks[i].y,state.blocks[i].w,state.blocks[i].h))return;}
  pushHistory();
  state.blocks.push(mkBlock(state.tool,x,y,d.w,d.h));
  drawAll();
}

// ===== モーダル =====
function showModal(msg){
  return new Promise(function(res){
    document.getElementById('modal-msg').textContent=msg;
    document.getElementById('modal').className='show';
    document.getElementById('modal-ok').onclick=function(){document.getElementById('modal').className='';res(true);};
    document.getElementById('modal-cancel').onclick=function(){document.getElementById('modal').className='';res(false);};
  });
}
async function clearAll(){if(await showModal('全てのレイアウトをリセットしますか？')){pushHistory();state.blocks=[];state.selected=[];drawAll();}}

// ===== 選択操作 =====
function alignSel(dir){
  if(state.selected.length<2)return;
  pushHistory();
  var sel=state.blocks.filter(function(b){return state.selected.indexOf(b.id)>=0;});
  switch(dir){
    case 'left':   var ref=Math.min.apply(null,sel.map(function(b){return b.x;}));          sel.forEach(function(b){b.x=ref;});break;
    case 'right':  var ref=Math.max.apply(null,sel.map(function(b){return b.x+b.w;}));     sel.forEach(function(b){b.x=ref-b.w;});break;
    case 'top':    var ref=Math.min.apply(null,sel.map(function(b){return b.y;}));          sel.forEach(function(b){b.y=ref;});break;
    case 'bottom': var ref=Math.max.apply(null,sel.map(function(b){return b.y+b.h;}));     sel.forEach(function(b){b.y=ref-b.h;});break;
    case 'hcenter':var ref=(Math.min.apply(null,sel.map(function(b){return b.x;}))+Math.max.apply(null,sel.map(function(b){return b.x+b.w;})))/2;sel.forEach(function(b){b.x=snap(ref-b.w/2);});break;
    case 'vcenter':var ref=(Math.min.apply(null,sel.map(function(b){return b.y;}))+Math.max.apply(null,sel.map(function(b){return b.y+b.h;})))/2;sel.forEach(function(b){b.y=snap(ref-b.h/2);});break;
  }
  showToast('整列完了');drawAll();
}
function deleteSel(){
  if(!state.selected.length)return;
  pushHistory();
  state.blocks=state.blocks.filter(function(b){return state.selected.indexOf(b.id)<0;});
  state.selected=[];drawAll();
}
function copyWithGap(){
  if(!state.selected.length)return;
  var gap=parseInt(document.getElementById('copy-gap').value)||0;
  var dir=state.copyDir;
  pushHistory();
  var sel=state.blocks.filter(function(b){return state.selected.indexOf(b.id)>=0;});
  var newIds=[];
  sel.forEach(function(b){
    var nx=b.x+(dir==='right'?b.w+gap:dir==='left'?-(b.w+gap):0);
    var ny=b.y+(dir==='bottom'?b.h+gap:dir==='top'?-(b.h+gap):0);
    nx=Math.max(0,Math.min(VW-b.w,snap(nx)));
    ny=Math.max(0,Math.min(VH-b.h,snap(ny)));
    var nb=Object.assign({},b,{id:state.nextId++,x:nx,y:ny});
    state.blocks.push(nb);newIds.push(nb.id);
  });
  state.selected=newIds;showToast('複製完了');drawAll();
}
function setCopyDir(d){
  state.copyDir=d;
  ['top','bottom','left','right'].forEach(function(x){
    var el=document.getElementById('cd-'+x);if(el)el.className='rbtn'+(x===d?' active':'');
  });
}

// ===== 色 =====
function setColor(v){
  state.currentColor=v;
  // 選択中ブロックにも即時適用
  state.blocks.forEach(function(b){if(state.selected.indexOf(b.id)>=0)b.color=v;});
  drawAll();
}
function resetColor(){
  var c=defColor(state.tool);
  state.currentColor=c;document.getElementById('cpicker').value=c;
  state.blocks.forEach(function(b){if(state.selected.indexOf(b.id)>=0)b.color=c;});
  drawAll();
}

// ===== 自動詰め =====
async function autoPack(){
  if(!await showModal('選択中のブロックで自動詰め配置します。\\n椅子・机ブロックはクリアされます。（障害物は維持）'))return;
  if(PLACE.indexOf(state.tool)<0){alert('配置ブロックを選んでください');return;}
  pushHistory();
  state.blocks=state.blocks.filter(function(b){return AREA.indexOf(b.type)>=0;});
  var d=dims(state.tool,state.n,state.frontDir);
  var mT=state.mT,mB=state.mB,mL=state.mL,mR=state.mR;
  var stepX=d.w+mL+mR,stepY=d.h+mT+mB;
  function ok(x,y){
    if(x<0||y<0||x+d.w>VW||y+d.h>VH)return false;
    for(var i=0;i<state.blocks.length;i++){if(overlaps(x,y,d.w,d.h,state.blocks[i].x,state.blocks[i].y,state.blocks[i].w,state.blocks[i].h))return false;}
    return true;
  }
  var dir=state.frontDir;
  if(dir==='top'||dir==='bottom'){
    var y=(dir==='top')?mT:VH-mB-d.h,ystep=(dir==='top')?stepY:-stepY;
    while(dir==='top'?(y+d.h<=VH-mB+1):(y>=mT-1)){
      var x=mL;while(x+d.w<=VW-mR){if(ok(x,y))state.blocks.push(mkBlock(state.tool,x,y,d.w,d.h));x+=stepX;}
      y+=ystep;
    }
  } else {
    var xc=(dir==='left')?mL:VW-mR-d.w,xstep=(dir==='left')?stepX:-stepX;
    while(dir==='left'?(xc+d.w<=VW-mR+1):(xc>=mL-1)){
      var yc=mT;while(yc+d.h<=VH-mB){if(ok(xc,yc))state.blocks.push(mkBlock(state.tool,xc,yc,d.w,d.h));yc+=stepY;}
      xc+=xstep;
    }
  }
  state.selected=[];drawAll();
}

// ===== UI =====
function selTool(t){
  state.tool=t;
  document.querySelectorAll('.tbtn').forEach(function(b){b.classList.remove('active');});
  var el=document.getElementById('t-'+t);if(el)el.classList.add('active');
  document.getElementById('tlabel').textContent=NAMES[t]||t;
  document.getElementById('n-row').style.display=(t==='theater_row')?'flex':'none';
  // ツール切替時にデフォルト色を更新
  if(t!=='select'&&DEF_COLOR[t]){
    state.currentColor=DEF_COLOR[t];
    document.getElementById('cpicker').value=DEF_COLOR[t];
  }
  if(t!=='select'){state.selected=[];}
  cv.style.cursor=(t==='select')?'default':'crosshair';
  drawAll();
}
function setN(v){state.n=parseInt(v)||8;document.getElementById('nv').textContent=v+'席';drawAll();}
function setM(){
  state.mT=parseInt(document.getElementById('mT').value)||0;
  state.mB=parseInt(document.getElementById('mB').value)||0;
  state.mL=parseInt(document.getElementById('mL').value)||0;
  state.mR=parseInt(document.getElementById('mR').value)||0;
  drawAll();
}
function setDir(d){
  state.frontDir=d;
  ['top','bottom','left','right'].forEach(function(x){var el=document.getElementById('d-'+x);if(el)el.className='rbtn'+(x===d?' active':'');});
  drawAll();
}
document.addEventListener('keydown',function(e){
  // input/textarea にフォーカス中はスキップ
  var tag=(document.activeElement||{}).tagName||'';
  if(tag==='INPUT'||tag==='TEXTAREA') return;
  if(e.ctrlKey||e.metaKey){
    if(e.key==='z'){e.preventDefault();undo();return;}
    if(e.key==='y'||(e.shiftKey&&e.key==='Z')){e.preventDefault();redo();return;}
    if(e.key==='a'){e.preventDefault();state.selected=state.blocks.map(function(b){return b.id;});drawAll();return;}
  }
  if(e.key==='Delete'||e.key==='Backspace'){if(state.selected.length>0){e.preventDefault();deleteSel();}}
  if(e.key==='Escape'){state.selected=[];drawAll();}
});

selTool('theater_row');updateUndoBtn();setCopyDir('top');drawAll();
</script></body></html>"""

st.components.v1.html(HTML, height=1080, scrolling=True)
