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
  {id:'coral',name:'サンゴベラ',color:'#ed917f',fin:'#b36468',size:13,speed:28,value:120,rarity:'よく見かける',shape:'fish',note:'浅い海のサンゴに紛れる、桃色の小魚。'},
  {id:'leaf',name:'コノハカレイ',color:'#b7ca83',fin:'#77986a',size:15,speed:20,value:180,rarity:'やや珍しい',shape:'round',note:'海草の葉そっくりな姿で、潮をやりすごす。'},
  {id:'sail',name:'アオバセイル',color:'#96d6d1',fin:'#4e98ac',size:17,speed:36,value:220,rarity:'やや珍しい',shape:'fish',note:'帆のようなヒレで、薄暗い潮目を渡る。'},
  {id:'ruby',name:'ルビーテトラ',color:'#db7e91',fin:'#a35075',size:11,speed:38,value:240,rarity:'やや珍しい',shape:'fish',note:'群れの光は、沈船の窓に映る小さな宝石。'},
  {id:'moon',name:'ツキアカリウオ',color:'#d8dbe9',fin:'#8d9fbd',size:16,speed:24,value:280,rarity:'やや珍しい',shape:'round',note:'太陽を知らない体に、月の色だけを宿している。'},
  {id:'glassfin',name:'ガラスヒレ',color:'#a5d7ea',fin:'#648bb6',size:16,speed:32,value:300,rarity:'やや珍しい',shape:'fish',note:'透明なヒレで、水の層をすり抜ける。'},
  {id:'copper',name:'アカガネオコゼ',color:'#c99476',fin:'#815e67',size:18,speed:17,value:340,rarity:'やや珍しい',shape:'round',note:'赤銅色の岩にじっと寄り添う、静かな住人。'},
  {id:'ink',name:'スミゾメダイ',color:'#8e8fad',fin:'#5a617f',size:15,speed:40,value:390,rarity:'希少',shape:'fish',note:'暗闇に溶ける青黒い魚。ソナーの後は静かに待とう。'},
  {id:'veil',name:'薄絹クラゲ',color:'#c8b1e6',fin:'#947cae',size:18,speed:18,value:410,rarity:'希少',shape:'jelly',note:'海の中に垂れた、一枚の薄いカーテン。'},
  {id:'gold',name:'キンメランタン',color:'#e3b56c',fin:'#a77360',size:20,speed:27,value:440,rarity:'希少',shape:'round',note:'金の目で、深淵へ続く道を見つめている。'},
  {id:'comet',name:'流星ハゼ',color:'#a7e0d4',fin:'#617fa5',size:13,speed:45,value:480,rarity:'希少',shape:'fish',note:'長い尾を一瞬だけ輝かせ、岩の陰へ消える。'},
  {id:'frost',name:'シモバシラウオ',color:'#d4ecdf',fin:'#90b8bd',size:19,speed:21,value:520,rarity:'希少',shape:'fish',note:'冷たい海に立つ、白い霜柱のような魚。'},
  {id:'prism',name:'深層プリズム',color:'#d5b5d4',fin:'#7b90b8',size:20,speed:29,value:560,rarity:'希少',shape:'round',note:'光がないはずの海で、淡い虹をまとっている。'},
  {id:'abyss',name:'アビスリボン',color:'#a29fd3',fin:'#666b99',size:22,speed:32,value:600,rarity:'希少',shape:'fish',note:'深淵の潮に体を預けて、長い旅を続ける。'},
  {id:'ember',name:'地熱ホタル',color:'#f1a56f',fin:'#b56968',size:14,speed:23,value:650,rarity:'希少',shape:'fish',note:'海底の熱い割れ目から、火の粉のように浮かぶ。'},
  {id:'origin',name:'暁のヌルフィッシュ',color:'#f0deb0',fin:'#b99f87',size:24,speed:26,value:900,rarity:'希少',shape:'fish',note:'最も深い場所で見つかる、まだ誰も知らなかった夜明け。'},
];
// Minimum and maximum depths make each layer a distinct collecting destination.
const DEPTHS = [[200,1700],[200,2000],[500,2900],[800,3800],[200,2600],[1700,4100],[500,2300],[3200,6500],[200,1400],[800,2300],[1100,2900],[1400,3200],[1700,3500],[2000,4100],[2300,4400],[2600,4700],[2900,5000],[3500,5600],[3800,5900],[4100,Infinity],[4400,Infinity],[4700,Infinity],[5300,Infinity],[5900,Infinity]];
SPECIES.forEach((fish,i)=>{fish.minDepth=DEPTHS[i][0];fish.maxDepth=DEPTHS[i][1];});
export function fishSVG(index) {
  const f=SPECIES[index];
  const body=f.shape==='jelly'?'<path d="M13 25c0-21 38-21 38 0Z"/><path d="M17 29q-6 10 0 20m10-20q6 13 0 23m10-23q-5 13 1 21m9-21q6 10 0 17" fill="none" stroke-width="2"/>':f.shape==='round'?'<ellipse cx="32" cy="29" rx="18" ry="15"/><path d="m17 27-10-7v16l10-5m12-16 3-5 4 5"/>':f.shape==='shrimp'?'<path d="M10 29q15 12 36-7l7 5q-16 23-35 10Z"/><path d="m44 23 10-9m-9 11 14-2M21 38l-5 7m14-7-4 8m11-11-3 9" fill="none" stroke-width="2"/>':'<path d="M14 29C24 8 48 12 56 29 44 46 25 47 14 29Zm0-1L4 18v22l10-10Z"/><path d="m29 15 3-8 10 10m-13 23 6 9 6-10"/>';
  return `<svg viewBox="0 0 64 58" aria-hidden="true" fill="${f.color}" stroke="${f.fin}" stroke-width="2" stroke-linejoin="round">${body}<circle cx="${f.shape==='jelly'?40:44}" cy="${f.shape==='jelly'?21:26}" r="2.5" fill="#153c45" stroke="none"/></svg>`;
}
