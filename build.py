# Menggabungkan sumber landing page menjadi satu file HTML.
# Pemakaian: python3 build.py src dist/index.html [--potongan]
#   tanpa --potongan : dokumen HTML lengkap (siap dibuka langsung / GitHub Pages)
#   --potongan       : isi halaman saja (untuk Artifact claude.ai yang menambahkan kerangkanya sendiri)
import re, sys, pathlib
src = pathlib.Path(sys.argv[1]); out = pathlib.Path(sys.argv[2])
def baca(n): return (src / n).read_text()
def ke_style(t):
    # fill="var(--x)" -> style="fill:var(--x)" supaya didukung semua mesin browser
    return re.sub(r'(?<![\w-])(fill|stroke|stop-color)="(var\([^"]+\))"', r'style="\1:\2"', t)
js = '\n'.join(ke_style(baca(n)) for n in ['art.js', 'hp.js', 'kebun3d.js', 'hadiah.js', 'demo.js'])
body = ke_style(baca('body.html'))
dobel = re.findall(r'<[a-zA-Z][^<>]*\bstyle="[^"]*"[^<>]*\bstyle="', js + body)
if dobel:
    print('ATRIBUT STYLE GANDA:', *dobel[:5], sep='\n'); sys.exit(1)
(src.parent / 'gabung.js').write_text(js)  # untuk cek sintaks: node --check gabung.js
html = f'''<title>AgroSync</title>
<meta name="claude:viewport-fit-sides" content="cover">
<meta name="description" content="AgroSync: pantau kebun hidroponik dari handphone. Coba demo aplikasi dan kebun 3D yang bergerak bersamaan.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700&family=Inter:wght@400;500;600;700&family=Poppins:wght@600;700&display=swap">
<style>
{baca('styles.css')}
</style>
{body}
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
<script>
{js}
</script>
'''
if '--potongan' not in sys.argv:
    kepala, isi = html.split('<style>', 1)
    gaya, sisa = isi.split('</style>', 1)
    html = ('<!doctype html>\n<html lang="id">\n<head>\n<meta charset="utf-8">\n'
            '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n'
            + kepala.strip() + '\n<style>\n:root{box-sizing:border-box}*,*::before,*::after{box-sizing:inherit}'
            'body{margin:0}[hidden]:not([hidden=until-found i]){display:none!important}\n'
            + gaya.strip() + '\n</style>\n</head>\n<body>\n' + sisa.strip() + '\n</body>\n</html>\n')
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(html)
print('ukuran', len(html.encode()), 'byte')
