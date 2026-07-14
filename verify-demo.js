#!/usr/bin/env node
// narrowing-scenarios.html の自動検証。編集後は必ず実行すること。
// 検証: 構文 / 候補数推移 / 日英フレーム数一致 / ランタイム(DOMスタブで数フレーム実行)
const fs = require('fs');
const path = process.argv[2] || __dirname + '/narrowing-scenarios.html';

const EXPECTED = {
  intro: [120,120,8,4,1,1],
  case_: [120,96,8,2,1,1],
  hard:  [120,80,80,56,56,24,24,12,5,5,5],
  loop:  [120,120,108,102,66,102,66,60,60,60],
};

const html = fs.readFileSync(path,'utf8');
const js = html.match(/<script>([\s\S]*?)<\/script>/)[1];
new Function(js); // 構文
console.log('[1/4] syntax OK');

const dataEnd = js.indexOf('// ============ 状態と描画');
const dataJs = js.slice(0,dataEnd)
  .replace(/var cv=document[\s\S]*?getContext\('2d'\);/,'')
  .replace(/function setLang[\s\S]*?applyFrame\(false\);\n}/,'');
const sandbox = {Math, console, performance:{now:()=>0}, out:{}};
require('vm').runInNewContext(dataJs + `
out.counts=[0,1,2,3].map(i=>frameCounts(i));
out.sync=[0,1,2,3].every(i=>ENT[i].length===SCN[i].frames.length);
out.labels=SCN.map(s=>s.causeLabel);
`, sandbox);
const names = ['intro','case_','hard','loop'];
let ok = true;
names.forEach((n,i)=>{
  const got = sandbox.out.counts[i].join(',');
  const exp = EXPECTED[n].join(',');
  const pass = got===exp;
  ok = ok && pass;
  console.log(`  ${pass?'OK ':'NG!'} ${n}: ${got}${pass?'':' (expected '+exp+')'}`);
});
if(!sandbox.out.sync){ ok=false; console.log('  NG! 日英フレーム数の不一致'); }
console.log('[2/4] counts ' + (ok?'OK':'FAILED'));
console.log('[3/4] JA/EN sync ' + (sandbox.out.sync?'OK':'FAILED') + ' / causes: ' + sandbox.out.labels.join(' | '));

// ランタイム
const ctxStub={clearRect(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},arc(){},fill(){},fillText(){},
  measureText:()=>({width:20}),quadraticCurveTo(){},ellipse(){},createRadialGradient:()=>({addColorStop(){}})};
['globalAlpha','fillStyle','strokeStyle','lineWidth','font','textAlign']
  .forEach(k=>Object.defineProperty(ctxStub,k,{set(){},get(){return 1}}));
function el(){return {setAttribute(){},style:{},classList:{toggle(){}},addEventListener(){},setPointerCapture(){},
  getContext:()=>ctxStub,appendChild(){},set onclick(f){},set textContent(v){},set innerHTML(v){},set disabled(v){}};}
let rafCount=0, queue=[];
require('vm').runInNewContext(js,{Math,console,performance:{now:()=>rafCount*16},
  document:{getElementById:()=>el(),addEventListener(){},documentElement:{}},
  getComputedStyle:()=>({getPropertyValue:()=>'#fff'}),
  location:{search:''},
  requestAnimationFrame:(f)=>{if(rafCount<6)queue.push(f);}});
while(queue.length&&rafCount<6){rafCount++;const q=queue.splice(0);q.forEach(f=>f(rafCount*16));}
console.log('[4/4] runtime OK');
process.exit(ok?0:1);
