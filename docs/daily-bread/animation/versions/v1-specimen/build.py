head = '''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Daily Bread — Specimen Plate (version 1)</title>
<style>
  html, body { margin: 0; background: #f3ead3; color: #1d2433; }
  body { font: 16px/1.5 Georgia, 'Times New Roman', serif; padding: 24px 16px 64px; }
  main { max-width: 1120px; margin: 0 auto; }
  h1 { font-weight: 400; font-size: clamp(28px, 5vw, 44px); margin: 0 0 4px; }
  .meta { font: 12px/1.4 ui-sans-serif, system-ui, sans-serif; letter-spacing: .08em; text-transform: uppercase; opacity: .7; }
  .band { position: relative; width: 100%; background: #ebdcb2; overflow: hidden; margin-top: 18px; }
  .band canvas { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
  .label { font: 12px/1.4 ui-sans-serif, system-ui, sans-serif; margin: 8px 0 28px; opacity: .75; }
  .phone { width: 390px; max-width: 100%; }
  body.capture { padding: 0; background: #000; }
  body.capture main { max-width: none; }
</style>
</head>
<body>
<main id="page">
  <div class="meta">Daily Bread · version 1 · Specimen Plate</div>
  <h1>The life of one seed</h1>
  <div class="meta">Matthew 13:3–8 · every frame drawn by code · no images</div>
  <div class="band" data-aspect="3"></div>
  <div class="label">Front band (3:1)</div>
  <div class="phone"><div class="band" data-aspect="2"></div><div class="label">Phone band (2:1)</div></div>
</main>
<script>
'''
parts = [open('shader.js').read(), open('../../engine-utils.js').read(), open('body.js').read(), open('runtime.js').read()]
open('index.html', 'w').write(head + '\n'.join(parts) + '\n</script>\n</body>\n</html>\n')
print('built')
