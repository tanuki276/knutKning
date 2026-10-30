// Small original pixel sprites. Families share silhouettes; markings vary by species.
const W=40,H=24;
export function fishProfile(f){
  const family=f.family||'',name=f.scientific||'';
  if(/Tetraodontidae|Diodontidae/.test(family))return 'puffer';
  if(/Muraenidae|Anguillidae|Eurypharyngidae|Congridae/.test(family))return 'eel';
  if(/Regalecidae|Trichiuridae/.test(family))return 'ribbon';
  if(/shark/i.test(name)||/Mitsukurinidae|Megachasmidae|Chlamydoselachidae|Carcharhinidae|Squalidae/.test(family))return 'shark';
  if(/Paralichthyidae|Pleuronectidae|Soleidae/.test(family))return 'flat';
  if(/Stomiidae|Ceratiidae|Melanocetidae/.test(family))return 'fang';
  if(/Acanthuridae|Pomacentridae|Chaetodontidae/.test(family))return 'reef';
  if(/Latimeriidae/.test(family))return 'coelacanth';
  return 'fish';
}
export function pixelFish(f){
  const pixels=Array(W*H).fill(0),profile=fishProfile(f),put=(x,y,v)=>{if(x>=0&&y>=0&&x<W&&y<H)pixels[y*W+x]=v;};
  const box=(x,y,w,h,v)=>{for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++)put(xx,yy,v);};
  const oval=(cx,cy,rx,ry)=>{for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(((x-cx)/rx)**2+((y-cy)/ry)**2<=1)put(x,y,y<cy-2?3:y>cy+3?2:1);};
  let palette=['transparent',f.color,f.fin,'#d7e8d0','#061d2a','#fff6d7'];
  const special=f.scientific==='Amphiprion ocellaris',tang=f.scientific==='Paracanthurus hepatus';
  if(special)palette=['transparent','#ec8d43','#b85634','#ffb462','#132f38','#fff6dd'];
  if(tang)palette=['transparent','#477cd9','#25469e','#77b6e8','#102b42','#f4d66e'];
  if(/Clupeidae|Engraulidae|Scombridae/.test(f.family))palette=['transparent','#9ecbc9','#4a7885','#dce6d4','#0d2f43','#fff9df'];
  if(f.rank>=4&&profile==='fang')palette=['transparent','#376574','#1b3f55','#719f9f','#071e2b','#bcefe0'];
  if(profile==='eel'||profile==='ribbon'){
    for(let x=3;x<35;x++){const y=12+Math.round(Math.sin(x*.21)*2),h=profile==='ribbon'?3:5;box(x,y-h/2|0,1,h,1);put(x,y-3,2);}box(30,8,7,6,1);box(35,10,3,3,3);
    if(profile==='ribbon')for(let x=8;x<32;x+=2)box(x,6,1,4,2);
  }else{
    const round=profile==='puffer'||profile==='reef'||profile==='flat';
    for(let x=2;x<11;x++){const half=Math.max(1,6-Math.floor((x-2)*.6));box(x,12-half,1,half*2+1,tang?5:2);}
    oval(23,12,profile==='shark'?14:profile==='puffer'?10:12,round?9:6);
    box(18,3,4,4,2);box(17,18,5,3,2);box(22,14,5,4,2);
    if(profile==='shark'){for(let n=0;n<7;n++)box(17+n,1+n,1,9-n,2);box(33,12,6,3,1);}
    if(profile==='coelacanth'){box(12,19,5,3,2);box(26,18,5,4,2);}
    if(profile==='puffer')for(let y=5;y<20;y+=4)for(let x=16;x<31;x+=5)if(pixels[y*W+x])box(x,y,2,2,2);
    if(profile==='flat'){oval(23,12,13,8);box(27,7,2,2,4);}
    if(profile==='fang'){box(30,12,7,4,4);for(let x=31;x<37;x+=2)put(x,12,5);box(27,2,1,5,3);box(27,1,3,2,5);}
  }
  if(special)for(const x of [13,22,30])for(let y=4;y<21;y++)if(pixels[y*W+x]){put(x,y,4);put(x+1,y,5);put(x+2,y,5);}
  if(tang)for(let x=16;x<30;x++)for(let y=10;y<14;y++)if(pixels[y*W+x])put(x,y,4);
  const eyeX=profile==='eel'||profile==='ribbon'?33:31;
  box(eyeX-1,8,3,3,5);box(eyeX,9,2,2,4);box(eyeX-1,8,1,1,5);
  const runs=[];for(let y=0;y<H;y++)for(let x=0;x<W;){const v=pixels[y*W+x],start=x;while(x<W&&pixels[y*W+x]===v)x++;if(v)runs.push({x:start,y,w:x-start,color:palette[v]});}
  return {width:W,height:H,profile,runs};
}
export function pixelFishSVG(f){const a=pixelFish(f);return `<svg viewBox="0 0 ${W} ${H}" shape-rendering="crispEdges" aria-hidden="true">${a.runs.map(r=>`<rect x="${r.x}" y="${r.y}" width="${r.w}" height="1" fill="${r.color}"/>`).join('')}</svg>`;}
