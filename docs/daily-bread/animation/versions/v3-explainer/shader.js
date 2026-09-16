const FRAG = `
precision highp float;
uniform float u_time;
uniform vec2 u_resolution;
uniform float u_dot;
uniform sampler2D u_tone;
uniform sampler2D u_line;
const float TAU = 6.2831853;
const vec3 PAPER = vec3(235., 220., 178.) / 255.;
const vec3 COBALT = vec3(26., 77., 152.) / 255.;
const vec3 GOLD = vec3(239., 188., 63.) / 255.;
const vec3 CRIMSON = vec3(206., 52., 66.) / 255.;
float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3. - 2. * f);
  return mix(mix(hash(i), hash(i + vec2(1., 0.)), u.x), mix(hash(i + vec2(0., 1.)), hash(i + vec2(1., 1.)), u.x), u.y); }
float fbm(vec2 p){ float a = .5, s = 0.; for (int i = 0; i < 4; i++){ s += a * vnoise(p); p = p * 2.03 + 17.; a *= .5; } return s; }
float spotInk(vec2 px, float k, float ang, float cell, float boil){
  float c = cos(ang), s = sin(ang);
  vec2 q = mat2(c, -s, s, c) * px / cell;
  float spot = .5 - .25 * (cos(TAU * q.x) + cos(TAU * q.y));
  spot += (hash(floor(px) + boil) - .5) * .14;
  float aa = 1.6 / cell;
  return smoothstep(spot - aa, spot + aa, k) * smoothstep(0., .025, k);
}
void main(){
  vec2 R = u_resolution;
  vec2 px = vec2(gl_FragCoord.x, R.y - gl_FragCoord.y);
  float t = u_time;
  float boil = floor(t * 8.);
  float cell = u_dot, unit = cell / 5.;
  // print-in on first play: gold, crimson, then cobalt springs into register
  float spring = exp(-5.5 * max(t - .4, 0.)) * cos(11. * max(t - .4, 0.));
  vec2 offB = vec2(24., -16.) * unit * spring + vec2(.0, .0);
  vec2 offG = vec2(1.2, -.8) * unit;
  vec2 offR = vec2(-1., 1.1) * unit;
  vec3 tB = texture2D(u_tone, (px + offB) / R).rgb;
  vec3 tG = texture2D(u_tone, (px + offG) / R).rgb;
  vec3 tR = texture2D(u_tone, (px + offR) / R).rgb;
  vec3 lB = texture2D(u_line, (px + offB) / R).rgb;
  vec3 lG = texture2D(u_line, (px + offG) / R).rgb;
  vec3 lR = texture2D(u_line, (px + offR) / R).rgb;
  float lay = fbm(px / 90. + 7.);
  float inG = smoothstep(lay - .05, lay + .05, clamp(t / .6, 0., 1.) * 1.15 - .05);
  float inR = smoothstep(lay - .05, lay + .05, clamp((t - .2) / .6, 0., 1.) * 1.15 - .05);
  float inB = smoothstep(lay - .05, lay + .05, clamp((t - .4) / .6, 0., 1.) * 1.15 - .05);
  float density = .84 + .16 * fbm(px / 160. + boil * .37);
  float dB = spotInk(px, tB.r * inB, radians(15.), cell, boil) * density;
  float dG = spotInk(px, tG.g * inG, radians(75.), cell, boil) * (.92 + .08 * density);
  float dR = spotInk(px, tR.b * inR, radians(45.), cell, boil) * (.9 + .1 * density);
  dB *= 1. - .5 * step(.97, hash(floor(px / 1.6) + boil * 1.3));
  float lineB = lB.r * inB * (.88 + .12 * density), lineG = lG.g * inG, lineR = lR.b * inR;
  float grain = .955 + .045 * vnoise(px * .75 + boil * 13.1) + .02 * (fbm(px * vec2(.02, .3)) - .5);
  vec3 col = PAPER * grain;
  col *= mix(vec3(1.), min(vec3(1.), GOLD / PAPER), max(dG, lineG));
  col *= mix(vec3(1.), CRIMSON / PAPER, max(dR, lineR) * .95);
  col *= mix(vec3(1.), COBALT / PAPER, dB);
  col *= mix(vec3(1.), COBALT / PAPER * .9, lineB);
  gl_FragColor = vec4(col, 1.);
}`;
const VERT = `attribute vec2 a_position; void main(){ gl_Position = vec4(a_position, 0., 1.); }`;
