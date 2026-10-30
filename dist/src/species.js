// Fictional fauna of the NULL TIDE world, shared by simulation, drawing and journal.
export const SPECIES = [
  {id:'lantern',name:'ヒカリイワシ',color:'#99e4cf',fin:'#4ba9a0',size:11,speed:24,value:90,rarity:'よく見かける',shape:'fish',note:'群れの間で小さな光を交わす。静かに近づくと、艇のそばでもゆったり泳いでいる。'},
  {id:'azure',name:'アオハナダイ',color:'#88bbee',fin:'#447eae',size:14,speed:31,value:130,rarity:'よく見かける',shape:'fish',note:'青い尾をひるがえし、サンゴの棚を泳ぐ。大きな音には敏感。'},
  {id:'puffer',name:'ランタンフグ',color:'#edc884',fin:'#c58b54',size:15,speed:18,value:180,rarity:'やや珍しい',shape:'round',note:'泳ぐのはゆっくり。暖かな光を腹にため込む、小さな海のランタン。'},
  {id:'ribbon',name:'リボンクラゲ',color:'#d8a9df',fin:'#9777b1',size:15,speed:18,value:200,rarity:'やや珍しい',shape:'jelly',note:'長い触手を潮に預けて漂う。餌を置くと、ゆっくり近づいてくる。'},
  {id:'shrimp',name:'ガラスエビ',color:'#d6e5c6',fin:'#78b5a8',size:9,speed:34,value:150,rarity:'やや珍しい',shape:'shrimp',note:'透き通る体で遺跡の隙間に隠れる。小柄なので、見失わないように。'},
  {id:'amber',name:'コハクトビウオ',color:'#f2a778',fin:'#c67869',size:17,speed:48,value:350,rarity:'希少',shape:'fish',note:'深い海域に現れる琥珀色の魚。追いかけるより、餌でおびき寄せたい。'},
  {id:'slug',name:'シロウミウシ',color:'#e9ddbc',fin:'#9aada0',size:12,speed:11,value:170,rarity:'やや珍しい',shape:'round',note:'海底を散歩するように進む。サンゴの根元にいることが多い。'},
  {id:'crown',name:'星冠クラゲ',color:'#eadc9c',fin:'#b59c75',size:19,speed:29,value:500,rarity:'希少',shape:'jelly',note:'記憶の底に浮かぶ星の冠。見つけたら音を立てずに近づこう。'},
];
export function fishSVG(index) {
  const f=SPECIES[index];
  const body=f.shape==='jelly'?'<path d="M13 25c0-21 38-21 38 0Z"/><path d="M17 29q-6 10 0 20m10-20q6 13 0 23m10-23q-5 13 1 21m9-21q6 10 0 17" fill="none" stroke-width="2"/>':f.shape==='round'?'<ellipse cx="32" cy="29" rx="18" ry="15"/><path d="m17 27-10-7v16l10-5m12-16 3-5 4 5"/>':f.shape==='shrimp'?'<path d="M10 29q15 12 36-7l7 5q-16 23-35 10Z"/><path d="m44 23 10-9m-9 11 14-2M21 38l-5 7m14-7-4 8m11-11-3 9" fill="none" stroke-width="2"/>':'<path d="M14 29C24 8 48 12 56 29 44 46 25 47 14 29Zm0-1L4 18v22l10-10Z"/><path d="m29 15 3-8 10 10m-13 23 6 9 6-10"/>';
  return `<svg viewBox="0 0 64 58" aria-hidden="true" fill="${f.color}" stroke="${f.fin}" stroke-width="2" stroke-linejoin="round">${body}<circle cx="${f.shape==='jelly'?40:44}" cy="${f.shape==='jelly'?21:26}" r="2.5" fill="#153c45" stroke="none"/></svg>`;
}
