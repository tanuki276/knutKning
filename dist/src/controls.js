export function thumbInput(dx,dy,radius=42){
  const distance=Math.hypot(dx,dy);
  if(distance<7)return {x:0,y:0};
  return {x:dx/Math.max(radius,distance),y:dy/Math.max(radius,distance)};
}
export function portraitViewport(width,height){return width<=950&&height>width;}
