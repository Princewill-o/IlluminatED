"""Reference-led original London streets and domestic furniture.
Run: blender --background --python art/blender/reference_realism.py
References and design notes: docs/world-reference-design.md
"""
import bpy, math, os, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
import london_kit as K

ROOT = Path(__file__).resolve().parents[2]
K.OUT = str(ROOT / 'public/world3d/realism')
PREVIEW = False

def terrace(variant, floors):
    # London stock brick, red brick, and soot-weathered brown: not pastel paint.
    palettes = {'a': ((.58,.47,.30),(.82,.80,.73),(.055,.075,.07),'flower_w'),
                'b': ((.47,.22,.14),(.84,.81,.72),(.10,.17,.18),'flower_r'),
                'c': ((.34,.29,.23),(.78,.76,.70),(.13,.16,.19),'flower_w')}
    K.TERRACES.update(palettes)
    K.NO_EXPORT = True
    K.terrace(variant, floors)
    base = bpy.context.object
    K.OBJS.clear(); K.OBJS.append(base)
    K.NO_EXPORT = PREVIEW
    # Raised mortar joints and staggered brick courses, recessed behind sash frames.
    K.colour('mortar',(.39,.36,.30),.98)
    top = 3.6 if floors == 3 else 2.65
    row = 0; z = 1.75
    while z < top:
        K.box('mortar',.22,.548,z,2.78,.554,z+.009)
        for i in range(9):
            x = .23+i*.31 + (.155 if row%2 else 0)
            if x < 2.78: K.box('mortar',x,.547,z,x+.008,.555,z+.115)
        z += .125; row += 1
    # Cast-iron rainwater pipe and a shallow stone threshold.
    K.cyl('iron',2.82,.47,.25,top,.028,v=8)
    K.box('stone',.22,.18,.0,1.1,.55,.12,bevel=.015)
    return K.export(f'terrace-{variant}-{floors}')

def materials():
    for name,c,r in [('oak',(.40,.27,.15),.65),('linen',(.55,.60,.52),.94),('cushion',(.83,.75,.62),.95),('seam',(.35,.41,.34),.96),('porcelain',(.87,.85,.79),.45),('rug',(.65,.58,.45),1.0)]: K.colour(name,c,r)

def furniture(name):
    materials()
    if name == 'sofa':
        for x in (.2,2.6):
            for y in (.16,1.2): K.cyl('oak',x,y,0,.24,.065,v=10)
        K.box('linen',.08,.08,.23,2.72,1.36,.52,bevel=.07,segs=3)
        K.box('linen',.1,.99,.5,2.70,1.38,1.26,bevel=.09,segs=3)
        for x in (.08,2.45): K.box('linen',x,.08,.48,x+.27,1.35,1.02,bevel=.065,segs=3)
        for x in (.40,1.43):
            K.box('linen',x,.15,.52,x+.96,1.02,.71,bevel=.055,segs=3)
            K.box('seam',x,.14,.56,x+.96,.16,.58)
            K.box('cushion',x+.12,.89,.76,x+.64,1.04,1.12,bevel=.08,segs=3)
    elif name == 'bed':
        K.box('oak',.08,.06,.08,1.92,2.65,.38,bevel=.025,segs=2)
        K.box('linen',.08,2.5,.2,1.92,2.73,1.25,bevel=.07,segs=3)
        K.box('porcelain',.14,.11,.38,1.86,2.5,.64,bevel=.09,segs=3)
        K.box('linen',.10,.08,.64,1.90,1.77,.72,bevel=.035,segs=2)
        for x in (.27,1.05): K.box('cushion',x,1.94,.65,x+.64,2.38,.84,bevel=.1,segs=3)
    elif name == 'desk':
        for x in (.12,1.88):
            for y in (.12,.78): K.box('oak',x,y,0,x+.09,y+.09,.85,bevel=.015)
        K.box('oak',.02,.02,.83,2.08,.98,.93,bevel=.03,segs=2)
        K.box('iron',.72,.64,.94,1.48,.71,1.52,bevel=.015)
        K.box('glass',.75,.625,1.0,1.45,.64,1.48)
        K.box('iron',.91,.55,.94,1.29,.78,.98)
        K.box('porcelain',.55,.22,.94,1.4,.45,.97,bevel=.01)
    else:
        for x in (.14,1.74):
            for y in (.14,1.14): K.box('oak',x,y,0,x+.10,y+.10,.7,bevel=.02)
        K.box('oak',.02,.02,.69,1.98,1.38,.80,bevel=.055,segs=3)
        K.box('porcelain',.3,.3,.8,.77,.67,.84,bevel=.02)
        K.cyl('porcelain',1.35,.72,.8,1.10,.15,v=20)
        K.cyl('leaf',1.35,.72,1.1,1.48,.045,v=8)
        for z in (1.15,1.29,1.42): K.sphere('leaf2',1.39,.72,z,.13,sub=1,sz=.45)
    return K.export(name)

for variant in ('a','b','c'):
    for floors in (2,3):
        K.reset(); terrace(variant,floors)
for name in ('sofa','bed','desk','table'):
    K.reset(); furniture(name)

# Save a source scene and render an overview for visual QA.
PREVIEW = True
K.NO_EXPORT = True
K.reset()
for i,variant in enumerate(('a','b','c')):
    o=terrace(variant,3); o.location.x=i*3.1-4.5; K.OBJS.clear()
K.box('stone_dark',-5,-2,-.14,5,3,.0)
K.box('stone',-5,-1,.0,5,.25,.05)
for name,x in [('sofa',-4),('bed',-1),('desk',2),('table',4)]:
    K.OBJS.clear(); o=furniture(name); o.location=(x,-3,0); K.OBJS.clear()
K.render_setup((12,-18,10),(0,0,2),lens=42,res=(1200,800))
bpy.context.scene.cycles.samples=24
bpy.context.scene.render.engine='CYCLES'
bpy.context.preferences.filepaths.save_version=0
out=ROOT/'output/graphics'; out.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'art/blender/reference-realism.blend'))
bpy.context.scene.render.filepath=str(out/'reference-realism.png')
bpy.ops.render.render(write_still=True)
