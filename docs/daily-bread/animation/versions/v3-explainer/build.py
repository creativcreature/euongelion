#!/usr/bin/env python3
"""Assemble index.html from the shell, the print shader, the shared utilities and this version's code."""
import os
here = os.path.dirname(os.path.abspath(__file__))
read = lambda p: open(p).read()
head = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Daily Bread · five directions · 3 — The Explainer</title>
<style>
  html, body { margin: 0; background: #f3ead3; color: #1d2433; }
  body { font: 16px/1.5 Georgia, 'Times New Roman', serif; padding: 24px 16px 64px; }
  main { max-width: 1120px; margin: 0 auto; }
  h1 { font-weight: 400; font-size: clamp(28px, 5vw, 48px); margin: 0 0 4px; }
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
  <div class="meta">Daily Bread · direction 3 of 5 · The Explainer</div>
  <h1>A sower went out to sow</h1>
  <div class="meta">Matthew 13:3–8 · every frame computed · no images · no words</div>
  <div class="band" data-aspect="3"></div>
  <div class="label">Front band (3:1)</div>
  <div class="phone"><div class="band" data-aspect="2"></div><div class="label">Phone band (2:1)</div></div>
</main>
<script>
"""
utils = read(os.path.join(here, '..', '..', 'engine-utils.js'))
out = head + read(os.path.join(here, 'shader.js')) + utils + read(os.path.join(here, 'body.js')) + read(os.path.join(here, 'runtime.js')) + "</script>\n</body>\n</html>\n"
open(os.path.join(here, 'index.html'), 'w').write(out)
print('index.html', len(out))
