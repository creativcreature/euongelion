// ============================================================================
// Runtime: plates → print shader, capture contract, live bands
function createScene(canvas){
  const gl = canvas.getContext('webgl', { antialias: false, alpha: false, preserveDrawingBuffer: true, powerPreference: 'low-power' });
  if (!gl) return null;
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
  const prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG)); gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
  gl.useProgram(prog);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const pos = gl.getAttribLocation(prog, 'a_position'); gl.enableVertexAttribArray(pos); gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);
  const u = (n) => gl.getUniformLocation(prog, n);
  const tex = (unit) => { const tx = gl.createTexture(); gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, tx);
    for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v); return tx; };
  const toneTex = tex(0), lineTex = tex(1);
  gl.uniform1i(u('u_tone'), 0); gl.uniform1i(u('u_line'), 1);
  const plates = new Plates();
  return {
    render(t, W, H){
      plates.begin(W, H);
      drawFrame(plates, ((t % LOOP) + LOOP) % LOOP);
      for (const [tx, src, unit] of [[toneTex, plates.tc, 0], [lineTex, plates.lc, 1]]) { gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, tx); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, src); }
      gl.viewport(0, 0, W, H);
      gl.uniform1f(u('u_time'), t); gl.uniform2f(u('u_resolution'), W, H); gl.uniform1f(u('u_dot'), Math.max(4, W / 300));
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
  };
}

const STILL_AT = 21.1;
const params = new URLSearchParams(location.search);
if (params.has('capture')) {
  document.body.classList.add('capture');
  const page = document.getElementById('page'); page.innerHTML = '';
  const w = Number(params.get('w') || 1500), aspect = Number(params.get('aspect') || 3);
  const c = document.createElement('canvas'); c.width = w; c.height = Math.round(w / aspect);
  c.style.cssText = `width:${c.width}px;height:${c.height}px;display:block`; page.appendChild(c);
  const scene = createScene(c);
  // one loop in: past the first-play print-in, so captured loops are seamless
  window.__render = (t) => scene.render(t + LOOP, c.width, c.height);
  window.__loop = LOOP;
  window.__ready = true;
} else {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const bands = [...document.querySelectorAll('.band')].map((el) => { el.style.aspectRatio = `${el.dataset.aspect} / 1`; const canvas = document.createElement('canvas'); el.appendChild(canvas); return { el, canvas, scene: createScene(canvas), time: 0, visible: true }; });
  const io = new IntersectionObserver((es) => { for (const e of es) { const b = bands.find((x) => x.el === e.target); if (b) b.visible = e.isIntersecting; } });
  bands.forEach((b) => io.observe(b.el));
  let last = 0;
  const frame = (now) => {
    requestAnimationFrame(frame);
    if (now - last < 1000 / 30 - 1) return;
    const dt = last ? Math.min(100, now - last) / 1000 : 0; last = now;
    for (const b of bands) {
      if (!b.scene || !b.visible) continue;
      const dpr = Math.min(1.5, devicePixelRatio || 1);
      const w = Math.max(1, Math.round(b.el.clientWidth * dpr)), h = Math.max(1, Math.round(b.el.clientHeight * dpr));
      if (b.canvas.width !== w) b.canvas.width = w; if (b.canvas.height !== h) b.canvas.height = h;
      b.time = reduced.matches ? LOOP + STILL_AT : b.time + dt;
      b.scene.render(b.time, w, h);
    }
  };
  requestAnimationFrame(frame);
}
