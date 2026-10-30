import {TILE,COLS,ROWS,rng,dist,clamp,sectorInfo} from './world.js';
import { SPECIES } from './species.js';
const TAU=Math.PI*2;
export class Renderer {
  constructor(canvas){this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:false});this.camera={x:0,y:0};this.particles=[];this.shake=0;this.reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;this.resize();}
  resize(){this.w=innerWidth;this.h=innerHeight;this.dpr=.5;this.canvas.width=this.w*this.dpr;this.canvas.height=this.h*this.dpr;this.scale=Math.max(.65,Math.min(1.45,Math.min(this.w/1000,this.h/650)));this.ctx.setTransform(this.dpr,0,0,this.dpr,0,0);this.ctx.imageSmoothingEnabled=false;this.fog=document.createElement('canvas');this.fog.width=this.w;this.fog.height=this.h;this.fogCtx=this.fog.getContext('2d');}
  setWorld(map){
    this.map=map;const zone=Math.floor(map.sector/4);const random=rng(map.seed+map.sector*81231+998),W=COLS*TILE,H=ROWS*TILE;
    this.base=document.createElement('canvas');this.base.width=W;this.base.height=H;const c=this.base.getContext('2d');
    c.fillStyle='#081b23';c.fillRect(0,0,W,H);
    const colors=zone%3===1?['#1b2c3c','#1d2e3f','#1c3040','#1e3242','#203344','#192b3b']:zone%3===2?['#2e302e','#30352f','#303730','#343831','#333932','#2b302e']:['#102e36','#113039','#12333b','#14363c','#15363b','#102c34'];
    for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){
      const X=x*TILE,Y=y*TILE;
      if(map.grid[y*COLS+x]){
        c.fillStyle=['#152e34','#19353a','#1b383a'][Math.floor((Math.sin(x*.23)+Math.cos(y*.19)+2)*.74)];c.fillRect(X,Y,24,24);
        c.fillStyle='#203f40';c.beginPath();c.ellipse(X+12,Y+11,12+random()*5,9+random()*6,random(),0,TAU);c.fill();
        c.strokeStyle='#2a514a';c.lineWidth=1;c.beginPath();c.moveTo(X+3,Y+5);c.lineTo(X+13,Y+3);c.lineTo(X+21,Y+8);c.stroke();
      }else{
        c.fillStyle=colors[Math.floor(random()*colors.length)];c.fillRect(X,Y,24,24);
        for(let n=0;n<4;n++){c.fillStyle=random()<.5?'#36504a':'#0d2933';c.fillRect(X+random()*24,Y+random()*24,1+random()*2,1);}
        if(random()<.04){c.fillStyle='#405650';c.beginPath();c.ellipse(X+12,Y+12,3+random()*5,2+random()*3,random()*3,0,TAU);c.fill();}
      }
    }
    // Sand shoals and seagrass follow irregular pockets; no room frames or paving.
    for(const r of map.rooms){
      const wash=c.createRadialGradient(r.x,r.y,8,r.x,r.y,r.w*.5);wash.addColorStop(0,r.biome===2?'#85947722':'#567e6420');wash.addColorStop(1,'transparent');c.fillStyle=wash;c.fillRect(r.x-r.w/2,r.y-r.w/2,r.w,r.w);
      for(let n=0;n<16;n++){const a=random()*TAU,rr=random()*r.w*.35,x=r.x+Math.cos(a)*rr,y=r.y+Math.sin(a)*rr*.75;c.strokeStyle=r.biome===3?'#6e8f70':'#426c59';c.lineWidth=1.5;c.beginPath();c.moveTo(x,y);c.quadraticCurveTo(x-6,y-8,x+Math.sin(a)*7,y-12-random()*12);c.stroke();}
    }
    // Depth-specific landmarks and an ancient tidal observatory.
    for(const r of map.rooms.slice(1)){
      c.save();c.translate(r.x,r.y);
      if(zone===0){c.fillStyle='#b6ad7628';c.beginPath();c.ellipse(0,0,110,70,.2,0,TAU);c.fill();for(let n=0;n<6;n++){c.strokeStyle=n%2?'#bd8d83':'#80b78a';c.lineWidth=5;c.beginPath();c.moveTo(n*22-70,45);c.lineTo(n*22-77,-10-random()*35);c.moveTo(n*22-74,0);c.lineTo(n*22-92,-18);c.stroke();}}
      else if(zone===1){for(let n=0;n<8;n++){c.strokeStyle=n%2?'#6b9b58':'#376f58';c.lineWidth=7;c.beginPath();c.moveTo(n*25-100,80);c.bezierCurveTo(n*25-130,10,n*25-60,-40,n*25-90,-100);c.stroke();}}
      else if(zone===2){c.rotate(.4);c.fillStyle='#493f382e';c.fillRect(-100,-40,200,80);c.strokeStyle='#91765a';c.lineWidth=5;for(let n=0;n<7;n++){c.beginPath();c.ellipse(n*27-85,0,14,42,0,0,Math.PI);c.stroke();}}
      else{for(let n=0;n<6;n++){c.fillStyle=zone>=5?'#df7e4c':'#6887c0';c.beginPath();c.moveTo(n*25-70,30);c.lineTo(n*25-61,-25-random()*40);c.lineTo(n*25-48,30);c.fill();}this.glow(c,0,0,170,zone>=5?'#e06e43':'#658ac8',.13);}
      c.restore();
    }
    const ruin=map.ruin;c.save();c.translate(ruin.x,ruin.y);c.strokeStyle='#96a392';c.lineWidth=7;c.beginPath();c.arc(0,-5,92,Math.PI,TAU);c.stroke();for(const x of [-92,92]){c.fillStyle='#416c67';c.fillRect(x-13,-5,26,100);c.fillStyle='#7b9282';c.fillRect(x-18,-12,36,12);c.fillRect(x-18,87,36,12);}c.strokeStyle='#a8bfa0';c.lineWidth=2;for(let n=0;n<3;n++){c.strokeRect(-50+n*35,15,22,33);}c.fillStyle='#d5d5ad';c.font='12px sans-serif';c.textAlign='center';c.fillText('古代の潮流神殿',0,-111);c.restore();
    this.corals=[];
    for(let i=0;i<1000;i++){const x=1+Math.floor(random()*(COLS-2)),y=1+Math.floor(random()*(ROWS-2));if(!map.grid[y*COLS+x])continue;const edge=!map.grid[y*COLS+x+1]||!map.grid[y*COLS+x-1]||!map.grid[(y+1)*COLS+x]||!map.grid[(y-1)*COLS+x];if(!edge&&random()<.8)continue;
      this.corals.push({x:x*TILE+random()*24,y:y*TILE+random()*24,h:9+random()*23,color:zone%3===1?(random()<.3?'#bba2c0':'#738dba'):zone%3===2?(random()<.4?'#d6ab78':'#8f9e76'):random()<.24?'#d28370':random()<.55?'#4a967c':'#477e6c',phase:random()*TAU});
    }
    this.dust=Array.from({length:230},()=>({x:random()*W,y:random()*H,s:random()*2+.5,phase:random()*TAU}));
    this.camera.x=map.hub.x;this.camera.y=map.hub.y;this.particles=[];
  }
  burst(x,y,color,n=18){for(let i=0;i<n;i++){const a=Math.random()*TAU,s=20+Math.random()*85;this.particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:1,max:1,color});}}
  glow(c,x,y,r,color,alpha=.3){const g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);g.addColorStop(1,'transparent');c.globalAlpha=alpha;c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2);c.globalAlpha=1;}
  render(game,time,dt,menu=false){
    const c=this.ctx,p=game.player,m=game.map,w=this.w,h=this.h,s=this.scale,et=this.reduced?0:time;
    const targetX=p.x+(menu?-(w/s)*.14:0),targetY=p.y+(menu?-20:0);this.camera.x+=(targetX-this.camera.x)*(1-Math.exp(-dt*4));this.camera.y+=(targetY-this.camera.y)*(1-Math.exp(-dt*4));
    c.setTransform(this.dpr,0,0,this.dpr,0,0);c.fillStyle='#07161f';c.fillRect(0,0,w,h);
    c.save();c.translate(w/2,h/2);c.scale(s,s);const shake=this.reduced?0:this.shake;this.shake=Math.max(0,this.shake-dt*25);c.translate(-Math.round(this.camera.x)+(Math.random()-.5)*shake,-Math.round(this.camera.y)+(Math.random()-.5)*shake);
    c.drawImage(this.base,0,0);
    const sx=this.camera.x-w/s/2-40,sy=this.camera.y-h/s/2-40,ex=sx+w/s+80,ey=sy+h/s+80;
    // Sediment and gentle, intersecting light ribbons.
    c.save();c.globalAlpha=.055;c.strokeStyle='#9ae8cd';c.lineWidth=7;for(let i=0;i<15;i++){const yy=Math.floor(sy/100)*100+i*100;c.beginPath();for(let j=0;j<20;j++){const xx=sx+j*80,yyy=yy+Math.sin(xx*.007+et*.18+i)*22;if(!j)c.moveTo(xx,yyy);else c.lineTo(xx,yyy);}c.stroke();}c.restore();
    for(const a of this.corals){if(a.x<sx||a.x>ex||a.y<sy||a.y>ey)continue;const sway=this.reduced?0:Math.sin(time*.8+a.phase)*2;c.strokeStyle='#0b292b';c.lineWidth=5;c.beginPath();c.moveTo(a.x+2,a.y+3);c.lineTo(a.x+2+sway,a.y-a.h+3);c.stroke();c.strokeStyle=a.color;c.lineWidth=2;c.beginPath();c.moveTo(a.x,a.y);c.lineTo(a.x+sway,a.y-a.h);c.moveTo(a.x,a.y-a.h*.4);c.lineTo(a.x-6+sway,a.y-a.h*.7);c.lineTo(a.x-7+sway,a.y-a.h);c.moveTo(a.x,a.y-a.h*.55);c.lineTo(a.x+7+sway,a.y-a.h*.75);c.lineTo(a.x+7+sway,a.y-a.h*1.1);c.stroke();c.fillStyle='#91c49c';c.fillRect(a.x+sway-1,a.y-a.h-2,2,2);}
    const hub=m.hub,all=true;
    this.glow(c,hub.x,hub.y,130,all?'#56e9c1':'#378b96',.25);
    c.save();c.translate(hub.x,hub.y);c.strokeStyle='#426e6b';c.lineWidth=3;c.beginPath();c.arc(0,0,52,0,TAU);c.stroke();c.strokeStyle='#173d45';c.lineWidth=10;c.beginPath();c.arc(0,0,45,0,TAU);c.stroke();c.strokeStyle=all?'#7fefd0':'#688f87';c.lineWidth=2;c.setLineDash([6,9]);c.beginPath();c.arc(0,0,43,-et*.08,TAU-et*.08);c.stroke();c.setLineDash([]);c.fillStyle='#0a252e';c.fillRect(-26,-24,52,48);c.strokeStyle='#477b78';c.strokeRect(-26,-24,52,48);c.fillStyle=all?'#85edd1':'#7b9e96';c.fillRect(-13,-13,26,4);c.fillRect(-13,0,26,4);c.fillRect(-13,13,26,2);for(let a=0;a<4;a++){c.save();c.rotate(a*Math.PI/2);c.fillStyle='#436964';c.fillRect(-6,-64,12,19);c.fillStyle='#af9e70';c.fillRect(-4,-63,8,4);c.restore();}c.restore();
    const gate=m.descent;c.save();c.translate(gate.x,gate.y);this.glow(c,0,0,100,'#e3b778',.23);c.strokeStyle='#c69d68';c.lineWidth=2;c.beginPath();c.ellipse(0,0,36,23,0,0,TAU);c.stroke();c.fillStyle='#132c35';c.beginPath();c.ellipse(0,0,29,17,0,0,TAU);c.fill();c.strokeStyle='#f3ca8b';c.lineWidth=3;c.beginPath();c.moveTo(0,-12);c.lineTo(0,9);c.moveTo(-7,2);c.lineTo(0,10);c.lineTo(7,2);c.stroke();c.font='11px sans-serif';c.textAlign='center';c.fillStyle='#e9c38d';c.fillText(game.unlocked()?'潜降口 · 開放済み':`潮流鍵 ${m.cores.filter(k=>k.done).length}/3`,0,-36);c.font='10px sans-serif';c.fillText(sectorInfo(game.sector+1).depth.toLocaleString()+' m',0,43);c.restore();
    for(const key of m.cores){if(key.done)continue;this.glow(c,key.x,key.y,110,'#8be0c6',.26);c.save();c.translate(key.x,key.y+Math.sin(et*2)*3);c.fillStyle='#b2ecd6';c.strokeStyle='#5d9e99';c.lineWidth=2;c.beginPath();c.moveTo(0,-23);c.lineTo(14,-3);c.lineTo(0,24);c.lineTo(-14,-3);c.closePath();c.fill();c.stroke();c.font='11px sans-serif';c.textAlign='center';c.fillStyle='#d9f0d6';c.fillText('潮流鍵 '+(key.id+1),0,-39);if(key.progress){c.strokeStyle='#f1cb95';c.lineWidth=3;c.beginPath();c.arc(0,0,31,-Math.PI/2,-Math.PI/2+TAU*key.progress);c.stroke();}c.restore();}
    if(game.sector>0){const up=m.ascent;this.glow(c,up.x,up.y,85,'#9acbea',.23);c.strokeStyle='#9ccada';c.lineWidth=2;c.beginPath();c.ellipse(up.x,up.y,30,22,0,0,TAU);c.stroke();c.beginPath();c.moveTo(up.x,up.y+11);c.lineTo(up.x,up.y-10);c.moveTo(up.x-7,up.y-3);c.lineTo(up.x,up.y-11);c.lineTo(up.x+7,up.y-3);c.stroke();c.fillStyle='#c4dfdd';c.font='11px sans-serif';c.textAlign='center';c.fillText('浅い海へ',up.x,up.y-35);}
    for(const v of m.vents){c.fillStyle='#255a58';c.fillRect(v.x-10,v.y-7,20,14);c.fillStyle=v.used?'#3a6562':'#76d9bd';c.fillRect(v.x-7,v.y-4,14,4);if(!v.used){this.glow(c,v.x,v.y,40,'#71d7b7',.2);for(let i=0;i<4;i++){c.strokeStyle='#8ac6b3';c.lineWidth=1;const t=(et*.35+i*.27)%1;c.strokeRect(v.x+Math.sin(i*7+t*4)*6-1,v.y-7-t*35,2+i%2,2+i%2);}}}
    for(const shard of m.shards)if(!shard.taken){const yy=shard.y+Math.sin(et*2+shard.x)*3;this.glow(c,shard.x,yy,28,'#c6dfbd',.16);c.fillStyle='#c9dcc0';c.beginPath();c.moveTo(shard.x,yy-5);c.lineTo(shard.x+4,yy);c.lineTo(shard.x,yy+5);c.lineTo(shard.x-4,yy);c.closePath();c.fill();}
    for(const e of m.enemies){this.glow(c,e.x,e.y,65,e.stun?'#91d8d2':'#e16b65',e.alert>.1?.23:.09);c.save();c.translate(e.x,e.y);c.rotate(e.angle);c.fillStyle='#0a2027';c.fillRect(-18,-10,35,23);c.fillStyle=e.stun?'#487577':'#4d5355';c.fillRect(-16,-9,25,18);c.fillStyle='#78817a';c.fillRect(-13,-10,18,3);c.fillStyle='#2a4149';c.fillRect(-20,-13,12,6);c.fillRect(-20,7,12,6);c.fillStyle=e.stun?'#9cdaca':e.alert>0?'#ff9688':'#bc7c70';c.fillRect(7,-6,6,12);c.fillStyle='#f7d3a4';c.fillRect(11,-3,3,6);c.fillStyle='#65716c';c.fillRect(-7,-3,8,6);c.restore();if(e.alert>0&&!e.stun){c.fillStyle='#f6a090';c.font='12px monospace';c.textAlign='center';c.fillText('!',e.x,e.y-26);}}
    this.ecology(c,game,time,sx,sy,ex,ey);
    // Player: hand-drawn pixel submersible with rotating fins and dual thrusters.
    this.glow(c,p.x,p.y,95,'#65c4b8',.17);
    c.save();c.translate(p.x,p.y);c.rotate(p.angle);const speed=Math.hypot(p.vx,p.vy);if(speed>15||menu){const f=menu?10:clamp(speed/8,4,32);c.fillStyle='#3c8c92';c.fillRect(-30-f,-5,f+11,10);c.fillStyle='#9ce6d6';c.fillRect(-23-f*.65,-3,f*.7,6);c.fillStyle='#e0f5d8';c.fillRect(-28,-2,8,4);}
    c.fillStyle='#061c25';c.fillRect(-27,-9,53,24);c.fillStyle='#997a50';c.fillRect(-17,-12,29,25);c.fillStyle='#e5b477';c.fillRect(-19,-9,36,19);c.fillStyle='#ffe3aa';c.fillRect(-13,-10,24,4);c.fillStyle='#ead2a0';c.fillRect(17,-6,7,13);c.fillStyle='#88d9d5';c.fillRect(10,-5,8,10);c.fillStyle='#c3f4dc';c.fillRect(11,-5,6,3);c.fillStyle='#3a655f';c.fillRect(-25,-8,7,17);c.fillStyle='#b4b39a';c.fillRect(-12,-17,15,6);c.fillRect(-12,12,15,6);c.fillStyle='#d7d7b4';c.fillRect(-11,-17,14,2);c.fillRect(-11,12,14,2);c.fillStyle='#b57f55';c.fillRect(-9,-6,12,12);c.fillStyle='#f4ce8c';c.fillRect(-7,-5,8,3);c.fillStyle='#375d5c';c.fillRect(-6,1,6,3);c.fillStyle='#a3ded1';c.fillRect(23,-3,4,6);c.restore();
    if(game.catchProgress>0){c.save();c.strokeStyle='#cbe8c4';c.lineWidth=2;c.setLineDash([3,5]);c.beginPath();c.arc(p.x,p.y,108,0,TAU);c.stroke();c.setLineDash([]);c.strokeStyle='#f8d399';c.lineWidth=4;c.beginPath();c.arc(p.x,p.y,38,-Math.PI/2,-Math.PI/2+TAU*Math.min(1,game.catchProgress));c.stroke();const f=m.fish.find(f=>f.id===game.catchTarget);if(f){c.lineWidth=1;c.strokeStyle='#bfdabb';c.beginPath();c.moveTo(p.x,p.y);c.lineTo(f.x,f.y);c.stroke();}c.restore();}
    if(p.invincible>0&&!menu){c.strokeStyle=`rgba(144,234,215,${.2+Math.sin(time*15)*.15})`;c.beginPath();c.arc(p.x,p.y,35,0,TAU);c.stroke();}
    for(const a of this.particles){a.life-=dt;a.x+=a.vx*dt;a.y+=a.vy*dt;a.vx*=1-dt*1.5;a.vy-=dt*6;c.globalAlpha=Math.max(0,a.life);c.fillStyle=a.color;c.fillRect(a.x,a.y,3,3);}c.globalAlpha=1;this.particles=this.particles.filter(a=>a.life>0);
    // Light mask preserves discovered geometry; pulse waves reveal distant rooms temporarily.
    const fog=this.fog,f=this.fogCtx;f.globalCompositeOperation='source-over';f.clearRect(0,0,w,h);f.fillStyle=menu?'rgba(3,15,24,.28)':(game.sector<4?'rgba(6,45,49,.45)':game.sector<12?'rgba(2,20,30,.7)':'rgba(2,8,22,.88)');f.fillRect(0,0,w,h);f.globalCompositeOperation='destination-out';
    const light=(x,y,r,a)=>{const xx=(x-this.camera.x)*s+w/2,yy=(y-this.camera.y)*s+h/2,g=f.createRadialGradient(xx,yy,0,xx,yy,r*s);g.addColorStop(0,`rgba(0,0,0,${a})`);g.addColorStop(.48,`rgba(0,0,0,${a*.7})`);g.addColorStop(1,'transparent');f.fillStyle=g;f.fillRect(xx-r*s,yy-r*s,r*s*2,r*s*2);};
    light(p.x,p.y,menu?570:250,.96);light(hub.x,hub.y,100,.45);for(const core of m.cores)light(core.x,core.y,75,.22);
    for(const pulse of game.pulses)if(pulse.r<pulse.max+200){light(pulse.x,pulse.y,Math.min(pulse.r,pulse.max),Math.max(0,.8-pulse.age*.16));}
    c.restore();c.drawImage(fog,0,0,w,h);
    c.save();c.translate(w/2,h/2);c.scale(s,s);c.translate(-this.camera.x,-this.camera.y);
    for(const pulse of game.pulses){if(pulse.r>pulse.max)continue;const a=(1-pulse.r/pulse.max)*.65;c.strokeStyle=`rgba(139,235,211,${a})`;c.lineWidth=2;c.beginPath();c.arc(pulse.x,pulse.y,pulse.r,0,TAU);c.stroke();c.lineWidth=1;c.strokeStyle=`rgba(139,235,211,${a*.3})`;c.beginPath();c.arc(pulse.x,pulse.y,Math.max(0,pulse.r-12),0,TAU);c.stroke();}
    for(const a of this.dust){const x=a.x+Math.sin(et*.16+a.phase)*12,y=a.y-(et*3)%45;if(x<sx||x>ex||y<sy||y>ey)continue;c.fillStyle=`rgba(169,221,209,${.08+(.5+.5*Math.sin(et+a.phase))*.17})`;c.fillRect(x,y,a.s,a.s);}
    c.restore();
    const vignette=c.createRadialGradient(w*.53,h*.47,h*.2,w*.5,h*.5,Math.max(w,h)*.68);vignette.addColorStop(0,'transparent');vignette.addColorStop(1,'rgba(2,9,17,.7)');c.fillStyle=vignette;c.fillRect(0,0,w,h);
    if(p.oxygen<35&&!menu){c.fillStyle=`rgba(158,56,42,${.06+Math.sin(time*3)*.04})`;c.fillRect(0,0,w,h);}
  }
  ecology(c,game,time,sx,sy,ex,ey){
    const m=game.map;
    for(const site of m.sites){if(site.x<sx||site.x>ex||site.y<sy||site.y>ey)continue;
      c.save();c.translate(site.x,site.y);this.glow(c,0,0,95,site.kind==='wreck'?'#d6b679':'#a4a9dd',site.done?.05:.16);
      if(site.kind==='wreck'){c.rotate(-.23);c.fillStyle='#0b222b';c.fillRect(-40,-18,80,47);c.fillStyle=site.done?'#3c5550':'#816d50';c.fillRect(-35,-24,70,43);c.fillStyle='#a49470';c.fillRect(-31,-22,61,4);c.fillStyle='#1f4146';c.fillRect(-25,-13,49,20);c.fillStyle='#486a64';c.fillRect(-21,-10,10,10);c.fillRect(-3,-10,10,10);c.fillRect(14,-10,7,10);c.fillStyle='#c5ae7a';c.fillRect(-41,-8,8,25);c.fillRect(33,-8,8,25);}
      else{c.fillStyle='#334b56';c.beginPath();c.moveTo(-18,20);c.lineTo(-12,-25);c.lineTo(7,-40);c.lineTo(22,16);c.closePath();c.fill();c.strokeStyle=site.done?'#527a77':'#a1b8d6';c.lineWidth=2;c.beginPath();c.moveTo(-3,12);c.lineTo(-2,-20);c.lineTo(7,-30);c.stroke();c.strokeStyle='#638791';c.strokeRect(-28,20,56,6);}
      c.rotate(site.kind==='wreck'?.23:0);c.font='11px sans-serif';c.textAlign='center';c.fillStyle=site.done?'#82aa95':'#e0cba1';c.fillText(site.done?'調査済み':site.kind==='wreck'?'沈船・サルベージ':'生態調査ポイント',0,-47);
      if(site.progress>0&&!site.done){c.strokeStyle='#f1d49c';c.lineWidth=3;c.beginPath();c.arc(0,0,47,-Math.PI/2,-Math.PI/2+TAU*site.progress);c.stroke();}c.restore();
    }
    for(const bait of game.baits){c.strokeStyle='#d5b17a66';c.beginPath();c.arc(bait.x,bait.y,23+Math.sin(time*3)*5,0,TAU);c.stroke();c.fillStyle='#e4ae70';for(let i=0;i<5;i++)c.fillRect(bait.x+Math.sin(i*2.3)*8,bait.y+Math.cos(i*2.3)*8,3,3);}
    const labeledFish=this.compact?game.closestFish()?.id:null;
    for(const f of m.fish){if(f.caught||f.x<sx||f.x>ex||f.y<sy||f.y>ey)continue;const type=SPECIES[f.species],size=type.size;
      if(type.rarity==='希少'||type.shape==='jelly')this.glow(c,f.x,f.y,45,type.color,.12);
      c.save();c.translate(Math.round(f.x),Math.round(f.y));c.rotate(f.angle);c.fillStyle=type.fin;
      const tail=Math.sin(time*8+f.phase)*3;
      if(type.shape==='jelly'){c.fillStyle=type.color;c.beginPath();c.arc(0,0,size,Math.PI,TAU);c.lineTo(size,4);c.lineTo(-size,4);c.closePath();c.fill();c.strokeStyle=type.fin;c.lineWidth=2;for(let i=-2;i<=2;i++){c.beginPath();c.moveTo(i*5,4);c.quadraticCurveTo(i*6+tail,13,i*5-tail,23);c.stroke();}}
      else{c.beginPath();c.moveTo(-size+3,0);c.lineTo(-size-8,-7+tail);c.lineTo(-size-8,7+tail);c.closePath();c.fill();c.fillStyle=type.color;
        if(type.shape==='round'){c.beginPath();c.ellipse(0,0,size,size*.8,0,0,TAU);c.fill();}
        else{c.fillRect(-size+3,-6,size*2-4,12);c.fillRect(-size+7,-9,size,18);c.fillStyle=type.fin;c.fillRect(-3,-12,7,5);c.fillRect(-3,7,7,5);}
        c.fillStyle='#e9f4d8';c.fillRect(3,-6,5,4);c.fillStyle='#10343e';c.fillRect(6,-5,3,3);if(type.shape==='shrimp'){c.strokeStyle=type.color;c.lineWidth=1;c.beginPath();c.moveTo(size,0);c.lineTo(size+12,-7);c.moveTo(size,2);c.lineTo(size+13,5);c.stroke();}}
      c.restore();
      if(dist(f,game.player)<120&&(!this.compact||f.id===labeledFish)){c.font='10px sans-serif';c.textAlign='center';c.fillStyle=f.alert>0?'#e7a489':type.rarity==='希少'?'#f5d7a1':'#bddebf';c.fillText((type.rarity==='希少'?'✦ ':'')+type.name+(f.alert>0?' !':''),f.x,f.y-size-15);}
    }
  }
  minimap(canvas,game){
    const c=canvas.getContext('2d'),m=game.map,W=canvas.width,H=canvas.height,sx=W/COLS,sy=H/ROWS;
    c.fillStyle='#09232e';c.fillRect(0,0,W,H);
    for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){const k=y*COLS+x;if(!m.grid[k]){c.fillStyle=m.seen[k]?'#3a625e':'#183a40';c.fillRect(x*sx,y*sy,Math.ceil(sx),Math.ceil(sy));}}
    const mark=(o,color,r=2)=>{c.fillStyle=color;c.fillRect(o.x/TILE*sx-r,o.y/TILE*sy-r,r*2,r*2);};
    for(const site of m.sites){const k=Math.floor(site.y/TILE)*COLS+Math.floor(site.x/TILE);if(m.seen[k])mark(site,site.done?'#5f8973':'#b4a8d7',2);}
    for(const core of m.cores){const k=Math.floor(core.y/TILE)*COLS+Math.floor(core.x/TILE);if(!core.done){mark(core,'#a4e6cb',3);if(W>400){c.fillStyle='#c8ead6';c.font='12px sans-serif';c.fillText('鍵 '+(core.id+1),core.x/TILE*sx,core.y/TILE*sy-9);}}}
    mark(m.ruin,'#c8b48d',4);mark(m.descent,'#f0bd79',4);if(game.sector>0)mark(m.ascent,'#9acbea',3);
    c.strokeStyle='#c5e3c4';c.lineWidth=1.5;c.strokeRect(m.hub.x/TILE*sx-4,m.hub.y/TILE*sy-4,8,8);
    c.fillStyle='#fff3d7';c.beginPath();c.arc(game.player.x/TILE*sx,game.player.y/TILE*sy,3,0,TAU);c.fill();
  }
}
