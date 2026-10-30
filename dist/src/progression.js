export const MILESTONES=[
  {count:5,title:'はじめての採集家',coins:300},
  {count:15,title:'サンゴ礁の観察者',coins:600},
  {count:40,title:'海を渡る調査員',coins:1200},
  {count:80,title:'深海の探究者',coins:2400},
  {count:160,title:'深淵の記録者',coins:5000},
  {count:240,title:'大洋の博物学者',coins:8000},
  {count:320,title:'海の記憶を継ぐ者',coins:15000},
];
export const RELICS=[
  ['流れ着いた手紙','海の向こうから届いた、小さな航海の記憶。',1,240,'letter'],
  ['古い真鍮の羅針盤','沈んでもなお、北を指す針。',2,480,'compass'],
  ['青磁の小瓶','海草に包まれた、遠い時代の暮らし。',2,600,'vase'],
  ['海草の琥珀','小さな葉を閉じ込めた、黄金色のかけら。',3,900,'amber'],
  ['船長の航海時計','最後の航路で、針は止まった。',3,1200,'clock'],
  ['沈船の名板','波に削られた文字が、船の名を伝える。',2,850,'plate'],
  ['夜光の石版','光を当てると、失われた星図が浮かぶ。',3,1600,'tablet'],
  ['潮流のオルゴール','音の代わりに、青い光を奏でる。',4,2200,'music'],
  ['深海観測カプセル','知られざる深度の記録を抱えて眠る。',3,2600,'capsule'],
  ['星砂のレンズ','小さなガラスに、海の星が集まる。',4,3200,'lens'],
  ['熱水の黒曜石','海底の熱が生んだ、艶やかな黒。',4,4000,'obsidian'],
  ['始まりの潮流核','いくつもの潮を越えて、ここに辿り着いた。',5,6000,'core'],
].map(([name,note,rank,value,shape],i)=>({id:'relic-'+i,name,note,rank,value,shape,grams:120+i*85}));
export function collectionRank(count){return [...MILESTONES].reverse().find(m=>count>=m.count)?.title||'見習い調査員';}
export function relicForSite(sector,index){return RELICS[Math.min(5,Math.floor(sector/4))*2+index%2];}
export function relicSVG(relic){
 const color=['','#b9dbbc','#85cfc1','#9fb8ee','#cca5e8','#f4c580'][relic.rank];
 const shapes={
  letter:'M9 17h46v32H9Zm0 0 23 19 23-19M9 49l16-17m30 17L39 32',
  compass:'M24 8h16v5h9v8h6v22h-6v8h-9v5H24v-5h-9v-8H9V21h6v-8h9ZM32 18l8 14-8 14-8-14Z',
  vase:'M25 7h15v8h-3v11l10 10v17H17V36l11-10V15h-3Zm-6 34h26',
  amber:'M30 7h9l15 23-7 22H19L9 33Zm0 0 3 22 21 1M9 33l24-4 14 23',
  clock:'M25 5h14v8h8v7h7v26h-8v8H18v-8h-8V20h8v-7h7Zm7 15v14l11 6',
  plate:'M7 18h50v29H7Zm8 9h8m5 0h20M15 37h28',
  tablet:'M18 8h30v48H13V16h5Zm6 11h13m-13 9h17m-17 9h9m-9 9h18',
  music:'M13 27h38v27H13Zm5-15h29v15H18Zm8 23h13v12H26Z',
  capsule:'M24 5h17v8h8v38h-8v8H24v-8h-8V13h8Zm0 14h17v15H24Zm0 24h17',
  lens:'M20 7h25v7h9v35h-9v8H20v-8h-9V14h9Zm3 11h18v28H23Zm4 5h9',
  obsidian:'M28 4h9l19 46-24 10L8 48Zm0 0 4 39 24 7M8 48l24-5v17',
  core:'M27 4h11v15h10v8h12v10H47v10h-9v13H27V47H16V37H4V27h12v-8h11Zm0 23v10h11V27Z',
 };
 return `<svg viewBox="0 0 64 64" aria-hidden="true" shape-rendering="crispEdges"><path d="${shapes[relic.shape]}" fill="${color}" stroke="#244c5b" stroke-width="3" stroke-linejoin="miter"/><path d="M22 18h8v3h-8z" fill="#fff5ce" opacity=".7"/></svg>`;
}
