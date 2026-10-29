import {TILE,COLS,ROWS,rng,dist,clamp,SECTORS} from './world.js';
const TAU=Math.PI*2;
export class Renderer {
  constructor(canvas){this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:false});this.camera={x:0,y:0};this.particles=[];this.shake=0;this.reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;this.resize();}
  resize(){this.w=innerWidth;this.h=innerHeight;this.dpr=Math.min(devicePixelRatio||1,2);this.canvas.width=this.w*this.dpr;this.canvas.height=this.h*this.dpr;this.scale=Math.max(.65,Math.min(1.45,Math.min(this.w/1000,this.h/650)));this.ctx.setTransform(this.dpr,0,0,this.dpr,0,0);this.ctx.imageSmoothingEnabled=false;this.fog=document.createElement('canvas');this.fog.width=this.w;this.fog.height=this.h;this.fogCtx=this.fog.getContext('2d');}
  setWorld(map){
    this.map=map;const random=rng(map.seed+map.sector*81231+998),W=COLS*TILE,H=ROWS*TILE;
    this.base=document.createElement('canvas');this.base.width=W;this.base.height=H;const c=this.base.getContext('2d');
    c.fillStyle='#081b23';c.fillRect(0,0,W,H);
    const colors=map.sector===1?['#1b2c3c','#1d2e3f','#1c3040','#1e3242','#203344','#192b3b']:map.sector===2?['#2e302e','#30352f','#303730','#343831','#333932','#2b302e']:['#102e36','#113039','#12333b','#14363c','#15363b','#102c34'];
    for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){
      const X=x*TILE,Y=y*TILE,wall=map.grid[y*COLS+x];
      if(wall){c.fillStyle=['#132f32','#153537','#173b3b','#1a3c39'][Math.floor(random()*4)];c.fillRect(X,Y,24,24);c.fillStyle='#214744';c.fillRect(X+2,Y+2,18,2);c.fillStyle='#0c252a';c.fillRect(X+2,Y+20,21,4);c.fillRect(X+21,Y+2,3,21);if(random()<.5){c.fillStyle='#28534a';c.fillRect(X+4+Math.floor(random()*12),Y+4,3,6);}if(y<ROWS-1&&!map.grid[(y+1)*COLS+x]){c.fillStyle='#386251';c.fillRect(X,Y+20,24,2);c.fillStyle='#071d24';c.fillRect(X,Y+24,24,8);} }
      else {c.fillStyle=colors[Math.floor(random()*colors.length)];c.fillRect(X,Y,24,24);c.fillStyle='#1c4146';if((x+y)%3===0)c.fillRect(X,Y+23,23,1);c.fillStyle='#244749';for(let n=0;n<3;n++)c.fillRect(X+Math.floor(random()*24),Y+Math.floor(random()*24),random()<.5?2:1,1);if(random()<.05){c.strokeStyle='#295254';c.strokeRect(X+3,Y+3,17,17);c.fillStyle='#315d5b';c.fillRect(X+5,Y+5,2,2);}}
    }
    // Relics of an industrial city: broken conduits, bulkheads, cable runs.
    for(let n=0;n<map.rooms.length;n++){const r=map.rooms[n],left=r.x-r.w/2+12,top=r.y-r.h/2+12;
      c.strokeStyle='#295354';c.lineWidth=3;c.strokeRect(left+5,top+6,r.w-35,r.h-36);c.strokeStyle='#0b242c';c.lineWidth=2;c.strokeRect(left+10,top+11,r.w-45,r.h-46);
      for(let k=0;k<3;k++){const xx=left+25+k*36,yy=top+22;c.fillStyle='#091e28';c.fillRect(xx+3,yy+6,24,35);c.fillStyle='#294b4b';c.fillRect(xx,yy,24,32);c.fillStyle='#3a6159';c.fillRect(xx+2,yy+2,20,3);c.fillStyle='#17383f';c.fillRect(xx+4,yy+9,16,17);c.fillStyle=n%2?'#55735b':'#395d5c';c.fillRect(xx+5,yy+12,2,7);c.fillRect(xx+10,yy+12,9,2);}
      for(let k=0;k<4;k++){c.fillStyle='#34554e';c.fillRect(left+20+k*12,top+r.h-35,5,3);}
      if(n){c.save();c.translate(r.x+44,r.y+25);c.rotate((n%3-1)*.23);c.fillStyle='#0a2028';c.fillRect(-8,-15,55,32);c.fillStyle='#2b5051';c.fillRect(-12,-20,50,28);c.fillStyle='#4a6a5b';c.fillRect(-10,-18,46,3);c.fillStyle='#16363e';c.fillRect(-8,-10,42,5);c.fillRect(-8,0,42,4);c.fillStyle='#527364';c.fillRect(-7,-9,3,3);c.restore();}
    }
    this.corals=[];
    for(let i=0;i<470;i++){const x=1+Math.floor(random()*(COLS-2)),y=1+Math.floor(random()*(ROWS-2));if(!map.grid[y*COLS+x])continue;const edge=!map.grid[y*COLS+x+1]||!map.grid[y*COLS+x-1]||!map.grid[(y+1)*COLS+x]||!map.grid[(y-1)*COLS+x];if(!edge&&random()<.8)continue;
      this.corals.push({x:x*TILE+random()*24,y:y*TILE+random()*24,h:9+random()*23,color:map.sector===1?(random()<.3?'#bba2c0':'#738dba'):map.sector===2?(random()<.4?'#d6ab78':'#8f9e76'):random()<.24?'#d28370':random()<.55?'#4a967c':'#477e6c',phase:random()*TAU});
    }
    this.dust=Array.from({length:100},()=>({x:random()*W,y:random()*H,s:random()*2+.5,phase:random()*TAU}));
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
    const hub=m.hub,all=m.cores.every(v=>v.done);
    this.glow(c,hub.x,hub.y,130,all?'#56e9c1':'#378b96',.25);
    c.save();c.translate(hub.x,hub.y);c.strokeStyle='#426e6b';c.lineWidth=3;c.beginPath();c.arc(0,0,52,0,TAU);c.stroke();c.strokeStyle='#173d45';c.lineWidth=10;c.beginPath();c.arc(0,0,45,0,TAU);c.stroke();c.strokeStyle=all?'#7fefd0':'#688f87';c.lineWidth=2;c.setLineDash([6,9]);c.beginPath();c.arc(0,0,43,-et*.08,TAU-et*.08);c.stroke();c.setLineDash([]);c.fillStyle='#0a252e';c.fillRect(-26,-24,52,48);c.strokeStyle='#477b78';c.strokeRect(-26,-24,52,48);c.fillStyle=all?'#85edd1':'#7b9e96';c.fillRect(-13,-13,26,4);c.fillRect(-13,0,26,4);c.fillRect(-13,13,26,2);for(let a=0;a<4;a++){c.save();c.rotate(a*Math.PI/2);c.fillStyle='#436964';c.fillRect(-6,-64,12,19);c.fillStyle='#af9e70';c.fillRect(-4,-63,8,4);c.restore();}c.restore();
    for(const core of m.cores){this.glow(c,core.x,core.y,100,core.done?'#53dcba':'#eeae6e',core.done?.12:.26);c.save();c.translate(core.x,core.y);c.fillStyle='#081e28';c.fillRect(-23,-23,48,50);c.fillStyle='#45685f';c.fillRect(-22,-28,44,48);c.fillStyle='#75917a';c.fillRect(-20,-27,40,3);c.fillStyle='#183c43';c.fillRect(-17,-20,34,32);c.fillStyle=core.done?'#589d8c':'#dfad78';c.fillRect(-9,-15,18,21);c.fillStyle=core.done?'#173e40':'#ffe0ac';c.fillRect(-6,-12,12,4);c.fillRect(-6,-4,12,2);c.fillStyle='#6d8c74';c.fillRect(-25,12,8,13);c.fillRect(17,12,8,13);c.strokeStyle=core.done?'#65c9ab':'#edc28c';c.lineWidth=1;c.beginPath();c.arc(0,-5,37+Math.sin(et*2)*2,0,TAU);c.stroke();c.font='9px monospace';c.textAlign='center';c.fillStyle=core.done?'#8dd1bc':'#f3c68f';c.fillText(core.done?'RECOVERED':`ARCHIVE 0${core.id+1}`,0,-48);if(core.progress>0&&!core.done){c.strokeStyle='#fff1cb';c.lineWidth=4;c.beginPath();c.arc(0,-5,38,-Math.PI/2,-Math.PI/2+TAU*core.progress);c.stroke();}c.restore();}
    for(const v of m.vents){c.fillStyle='#255a58';c.fillRect(v.x-10,v.y-7,20,14);c.fillStyle=v.used?'#3a6562':'#76d9bd';c.fillRect(v.x-7,v.y-4,14,4);if(!v.used){this.glow(c,v.x,v.y,40,'#71d7b7',.2);for(let i=0;i<4;i++){c.strokeStyle='#8ac6b3';c.lineWidth=1;const t=(et*.35+i*.27)%1;c.strokeRect(v.x+Math.sin(i*7+t*4)*6-1,v.y-7-t*35,2+i%2,2+i%2);}}}
    for(const shard of m.shards)if(!shard.taken){const yy=shard.y+Math.sin(et*2+shard.x)*3;this.glow(c,shard.x,yy,28,'#c6dfbd',.16);c.fillStyle='#c9dcc0';c.beginPath();c.moveTo(shard.x,yy-5);c.lineTo(shard.x+4,yy);c.lineTo(shard.x,yy+5);c.lineTo(shard.x-4,yy);c.closePath();c.fill();}
    for(const e of m.enemies){this.glow(c,e.x,e.y,65,e.stun?'#91d8d2':'#e16b65',e.alert>.1?.23:.09);c.save();c.translate(e.x,e.y);c.rotate(e.angle);c.fillStyle='#0a2027';c.fillRect(-18,-10,35,23);c.fillStyle=e.stun?'#487577':'#4d5355';c.fillRect(-16,-9,25,18);c.fillStyle='#78817a';c.fillRect(-13,-10,18,3);c.fillStyle='#2a4149';c.fillRect(-20,-13,12,6);c.fillRect(-20,7,12,6);c.fillStyle=e.stun?'#9cdaca':e.alert>0?'#ff9688':'#bc7c70';c.fillRect(7,-6,6,12);c.fillStyle='#f7d3a4';c.fillRect(11,-3,3,6);c.fillStyle='#65716c';c.fillRect(-7,-3,8,6);c.restore();if(e.alert>0&&!e.stun){c.fillStyle='#f6a090';c.font='12px monospace';c.textAlign='center';c.fillText('!',e.x,e.y-26);}}
    // Player: hand-drawn pixel submersible with rotating fins and dual thrusters.
    this.glow(c,p.x,p.y,95,'#65c4b8',.17);
    c.save();c.translate(p.x,p.y);c.rotate(p.angle);const speed=Math.hypot(p.vx,p.vy);if(speed>15||menu){const f=menu?10:clamp(speed/8,4,32);c.fillStyle='#3c8c92';c.fillRect(-30-f,-5,f+11,10);c.fillStyle='#9ce6d6';c.fillRect(-23-f*.65,-3,f*.7,6);c.fillStyle='#e0f5d8';c.fillRect(-28,-2,8,4);}
    c.fillStyle='#061c25';c.fillRect(-27,-9,53,24);c.fillStyle='#997a50';c.fillRect(-17,-12,29,25);c.fillStyle='#e5b477';c.fillRect(-19,-9,36,19);c.fillStyle='#ffe3aa';c.fillRect(-13,-10,24,4);c.fillStyle='#ead2a0';c.fillRect(17,-6,7,13);c.fillStyle='#88d9d5';c.fillRect(10,-5,8,10);c.fillStyle='#c3f4dc';c.fillRect(11,-5,6,3);c.fillStyle='#3a655f';c.fillRect(-25,-8,7,17);c.fillStyle='#b4b39a';c.fillRect(-12,-17,15,6);c.fillRect(-12,12,15,6);c.fillStyle='#d7d7b4';c.fillRect(-11,-17,14,2);c.fillRect(-11,12,14,2);c.fillStyle='#b57f55';c.fillRect(-9,-6,12,12);c.fillStyle='#f4ce8c';c.fillRect(-7,-5,8,3);c.fillStyle='#375d5c';c.fillRect(-6,1,6,3);c.fillStyle='#a3ded1';c.fillRect(23,-3,4,6);c.restore();
    if(p.invincible>0&&!menu){c.strokeStyle=`rgba(144,234,215,${.2+Math.sin(time*15)*.15})`;c.beginPath();c.arc(p.x,p.y,35,0,TAU);c.stroke();}
    for(const a of this.particles){a.life-=dt;a.x+=a.vx*dt;a.y+=a.vy*dt;a.vx*=1-dt*1.5;a.vy-=dt*6;c.globalAlpha=Math.max(0,a.life);c.fillStyle=a.color;c.fillRect(a.x,a.y,3,3);}c.globalAlpha=1;this.particles=this.particles.filter(a=>a.life>0);
    // Light mask preserves discovered geometry; pulse waves reveal distant rooms temporarily.
    const fog=this.fog,f=this.fogCtx;f.globalCompositeOperation='source-over';f.clearRect(0,0,w,h);f.fillStyle=menu?'rgba(3,15,24,.28)':'rgba(2,11,20,.83)';f.fillRect(0,0,w,h);f.globalCompositeOperation='destination-out';
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
  minimap(canvas,game){const c=canvas.getContext('2d'),m=game.map,W=146,H=106;c.clearRect(0,0,W,H);for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++)if(!m.grid[y*COLS+x]){c.fillStyle='#24474c';c.fillRect(x*2,y*2,2,2);}for(const core of m.cores){c.fillStyle=core.done?'#6a9a8a':'#e6b87b';c.fillRect(core.x/TILE*2-2,core.y/TILE*2-2,4,4);}c.strokeStyle='#a6d6c6';c.strokeRect(m.hub.x/TILE*2-3,m.hub.y/TILE*2-3,6,6);c.fillStyle='#eff9de';c.beginPath();c.arc(game.player.x/TILE*2,game.player.y/TILE*2,2.7,0,TAU);c.fill();}
}
