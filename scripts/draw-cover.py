"""Draw the original cover artwork as a dependency-free, editable SVG."""
from pathlib import Path
import random
r = random.Random(840)
p = ['''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1000" fill="none">
<defs><linearGradient id="sea" x1="1000" y1="0" x2="800" y2="1000" gradientUnits="userSpaceOnUse"><stop stop-color="#245b61"/><stop offset=".48" stop-color="#123d49"/><stop offset="1" stop-color="#092b37"/></linearGradient><radialGradient id="light"><stop stop-color="#9ad0b5" stop-opacity=".23"/><stop offset="1" stop-color="#9ad0b5" stop-opacity="0"/></radialGradient><linearGradient id="left"><stop stop-color="#082631" stop-opacity=".95"/><stop offset=".8" stop-color="#082631" stop-opacity="0"/></linearGradient><pattern id="speckle" width="83" height="77" patternUnits="userSpaceOnUse"><path d="M5 6h2v1H5zm28 42h1v2h-1zm31-21h2v1h-2zM13 67h1v1h-1z" fill="#c7dac0" opacity=".17"/></pattern></defs>
<path fill="url(#sea)" d="M0 0h1600v1000H0z"/>
<ellipse cx="1180" cy="330" rx="600" ry="540" fill="url(#light)"/>
<path d="M1040 0h61L850 760 660 898Zm143 0h90l-34 808-160-14Z" fill="#a6cbb2" opacity=".06"/>
<path d="M1460 0h48l92 620-145-55Z" fill="#a6cbb2" opacity=".04"/>
<g fill="#35666a" opacity=".24"><path d="M670 781V406h43v-24h100v24h27v375Z"/><path d="M854 790V270h32v-33h69v33h20v520Z"/><path d="M1010 775V430h30v-27h59v27h26v345Z"/><path d="M1195 800V336h26v-29h65v29h27v464Z"/></g>
<g stroke="#447779" stroke-width="6" opacity=".2"><path d="M690 450h135m-135 77h135m-135 77h135m-135 77h135M875 310h83m-83 93h83m-83 93h83m-83 93h83M1224 373h64m-64 80h64m-64 80h64m-64 80h64"/></g>
<path d="M604 837V630h39v-42h54v42h36v207h-35V692c0-32-51-32-51 0v145Z" fill="#264e54"/>
<path d="M730 839V602h46v-31h41v31h58v237h-41V675c0-36-64-36-64 0v164Z" fill="#2e595c"/>
<path d="M876 839V590h42v-37h53v37h49v249h-34V666c0-37-67-37-67 0v173Z" fill="#315e60"/>
<path d="M1017 840V611h38v-21h58v21h44v229h-36V687c0-41-66-41-66 0v153Z" fill="#2c575b"/>
<path d="m584 631 112-3m42-24h127m22-11 128-3m11 23h126" stroke="#628278" stroke-width="5" opacity=".65"/>
<path d="M600 830h570v25H600z" fill="#1a454d"/>
<path d="M640 855h500v10H640z" fill="#456d65"/>
<path d="M599 822c79-18 125-15 164-9 75 12 83-13 131-7 60 8 104 0 179-11l88 21v20H599Z" fill="#38695e"/>
<g fill="#c8b58b" opacity=".65"><path d="M713 646h4v8h-4zm178-39h6v3h-6zm125 27h5v4h-5zM809 827h3v4h-3z"/></g>
<path d="M0 757c79-8 82-83 169-46 59 26 84 37 122 91 42 60 121 0 196 41 40 22 68 48 139 37 71-11 115-24 151 13 30 29 83-30 161-12 66 16 114-16 168-8 51 7 87-16 131-61 49-49 62-46 81-86 31-63 74-58 99-103 29-54 91-62 183-26v403H0Z" fill="#0b2a35"/>
<path d="M1279 750c45-22 48-67 80-67 35 0 28-75 70-80 30-4 90-41 171-12v46c-53-12-74 2-102 11-34 12-85 3-98 44-20 64-77 38-96 81Z" fill="#18424a"/>
<path d="M0 764c75-6 86-74 159-46 41 16 67 33 95 72-72-20-106-15-136 16-46 48-81 42-118 29Z" fill="#184149"/>
<path d="M546 897c70-22 132-21 169-2 30 15 61 13 98-1-37 38-160 58-267 23Z" fill="#204b4b"/>
<path d="M1043 910c49-20 91-15 146-60 34-27 61-35 94-32-22 26-41 43-62 55-65 37-85 26-119 56Z" fill="#214a4d"/>
<g stroke="#6caa98" opacity=".13"><circle cx="1142" cy="444" r="159"/><circle cx="1142" cy="444" r="197" stroke-dasharray="4 9"/><path d="M940 444h26m349 0h26m-199-200v26m0 349v26"/></g>
''']
# Sediment is sparse and directional, rather than a uniform noise overlay.
for _ in range(175):
    x,y=r.randint(650,1580),r.randint(80,820)
    p.append(f'<circle cx="{x}" cy="{y}" r="{r.choice([1,1,1,1.5,2])}" fill="#bed4bb" opacity="{r.uniform(.08,.3):.2f}"/>')
# Quiet fish schools break the mechanical architecture silhouettes.
for cx,cy in [(1250,240),(835,450),(1430,550)]:
    for i in range(9):
        x=cx+r.randint(-70,70);y=cy+r.randint(-23,23);a=r.randint(4,9)
        p.append(f'<path d="M{x} {y}q{a} -{a} {a*2} 0l5-4v8l-5-4q-{a} {a}-{a*2} 0Z" fill="#9cbaa7" opacity=".27"/>')
# Deliberately uneven foreground kelp and small warm coral clusters.
for cx,cy,color in [(1314,798,'#699486'),(1450,706,'#ba8b72'),(1540,701,'#789b7e'),(371,899,'#49776b'),(479,930,'#a77b66'),(647,945,'#527e6f'),(1210,923,'#c09075'),(1355,864,'#40786c'),(219,856,'#577f70')]:
    for i in range(r.randint(4,8)):
        x=cx+r.randint(-25,25);height=r.randint(29,100);bend=r.randint(-20,20)
        p.append(f'<path d="M{x} {cy}q{bend-10} -{height//3} {bend} -{height}" stroke="{color}" stroke-width="{r.randint(4,8)}" stroke-linecap="round" opacity=".8"/>')
        if i%2==0:
            p.append(f'<path d="M{x+bend//3} {cy-height//3}q-25-3-26-25m30 14q24-4 25-26" stroke="{color}" stroke-width="4" stroke-linecap="round"/>')
for _ in range(110):
    x,y=r.randint(300,1600),r.randint(890,995)
    p.append(f'<path d="M{x} {y}h{r.randint(2,5)}v2h-{r.randint(2,5)}Z" fill="{r.choice(["#527a68","#295958","#8f9c7b"])}" opacity=".35"/>')
p += ['<path fill="url(#speckle)" d="M0 0h1600v1000H0z"/>','<path fill="url(#left)" d="M0 0h1050v1000H0z"/>','</svg>']
Path('dist/assets/cover.svg').write_text('\n'.join(p))
