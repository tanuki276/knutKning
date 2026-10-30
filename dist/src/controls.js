export function thumbInput(dx,dy,radius=42){
  const distance=Math.hypot(dx,dy);
  if(distance<7)return {x:0,y:0};
  return {x:dx/Math.max(radius,distance),y:dy/Math.max(radius,distance)};
}
export function portraitViewport(width,height){return width<=950&&height>width;}

// Touchscreen compatibility clicks are not guaranteed for a second finger.
// Act on every pointer's down event; reserve click for keyboard/assistive input.
export function bindGameAction(button, action, enabled = () => true) {
  const activate = () => { if (!button.disabled && enabled()) action(); };
  button.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    activate();
  });
  button.addEventListener('click', event => {
    event.preventDefault();
    event.stopPropagation();
    if (event.detail === 0 && !event.pointerType) activate();
  });
  button.addEventListener('contextmenu', event => event.preventDefault());
}

export function bindThumbStick(zone, stick, knob, onMove, enabled = () => true) {
  let pointerId = null;
  let center = null;
  const showPosition = () => {
    const rect = zone.getBoundingClientRect(), half = stick.offsetWidth / 2;
    stick.style.left = `${center.x - rect.left - half}px`;
    stick.style.top = `${center.y - rect.top - half}px`;
  };
  const move = event => {
    if (event.pointerId !== pointerId) return;
    event.preventDefault();
    const radius = (stick.offsetWidth - knob.offsetWidth) / 2;
    const vector = thumbInput(event.clientX - center.x, event.clientY - center.y, radius);
    knob.style.transform = `translate(${vector.x * radius}px,${vector.y * radius}px)`;
    onMove(vector);
  };
  const reset = () => {
    const oldId = pointerId;
    pointerId = null;
    center = null;
    if (oldId !== null && zone.hasPointerCapture(oldId)) zone.releasePointerCapture(oldId);
    zone.classList.remove('steering');
    stick.style.left = ''; stick.style.top = ''; knob.style.transform = '';
    onMove({x: 0, y: 0});
  };
  zone.addEventListener('pointerdown', event => {
    if (event.button !== 0 || pointerId !== null || !enabled()) return;
    event.preventDefault();
    pointerId = event.pointerId;
    const rect = zone.getBoundingClientRect(), half = stick.offsetWidth / 2;
    center = {
      x: Math.max(rect.left + half, Math.min(rect.right - half, event.clientX)),
      y: Math.max(rect.top + half, Math.min(rect.bottom - half, event.clientY)),
    };
    zone.classList.add('steering');
    showPosition();
    zone.setPointerCapture(pointerId);
    move(event);
  });
  zone.addEventListener('pointermove', move);
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    zone.addEventListener(type, event => { if (event.pointerId === pointerId) reset(); });
  }
  // Mobile browser chrome can resize the viewport mid-gesture. Repaint the
  // stick at its screen position without dropping the held movement vector.
  return {reset, relayout: () => { if (center) showPosition(); }};
}
