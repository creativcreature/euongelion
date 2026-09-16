# Assemble index.html from the test-04 page shell + shader, the shared engine utils, and body.js
import re, pathlib
here = pathlib.Path(__file__).parent
src = (here / '..' / '..' / '04-life-of-a-seed.html').resolve().read_text()

head = src[:src.index('<script>')]
head = (head
        .replace('Daily Bread scene test 04 — the life of a seed', 'Daily Bread scene test 09 — Patent Drawing')
        .replace('Daily Bread · scene test 04', 'Daily Bread · scene test 09 · Patent Drawing')
        .replace('A sower went out to sow', 'A sower went out to sow')
        .replace('Matthew 13:3–8 · every frame computed · no images', 'Matthew 13:3–8 · exploded patent diagram · every frame computed · no images'))

fa = src.index('const FRAG = `')
fb = src.index('const VERT')
frag = src[fa:fb]
# crisper plate for technical line work: finer screen, slightly lighter tone speckle
frag = frag.replace("float aa = 1.6 / cell;", "float aa = 1.45 / cell;")
frag = frag.replace("dB *= 1. - .5 * step(.97, hash(floor(px / 1.6) + boil * 1.3));",
                    "dB *= 1. - .42 * step(.972, hash(floor(px / 1.6) + boil * 1.3));")
vert = src[fb:src.index('\n', fb) + 1]

utils = (here / 'engine-utils.js').read_text()
body = (here / 'body.js').read_text()

out = head + "<script>\n" + frag + vert + utils + body + "\n</script>\n</body>\n</html>\n"
(here / 'index.html').write_text(out)
print('index.html', len(out), 'bytes')
