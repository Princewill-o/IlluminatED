"""The Lumen League and The Fog, drawn in the game's current style: the blocky
character model (public/world3d/blocky-characters) recoloured into each hero's
suit, with blocky gear, cape and emblem, and black outlines like the 3D world.

  python3 art/blender/heroes_blocky.py            # every hero + the Fog
  python3 art/blender/heroes_blocky.py photon     # one hero

Run from art/blender. Writes public/heroes/<id>.webp, fog.webp and fog-hurt.webp.
Hero colours and gear are read from src/game/core/heroes.ts so they never drift.
"""
import bpy, math, os, re, sys, random
from mathutils import Vector

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
OUT = os.path.join(ROOT, "public", "heroes")
MODEL = os.path.join(ROOT, "public", "world3d", "blocky-characters", "blocky_01_hero.glb")

def hexc(h):
    h = h.lstrip("#")
    srgb = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in srgb)

def heroes():
    src = open(os.path.join(ROOT, "src", "game", "core", "heroes.ts")).read()
    out = []
    for m in re.finditer(r'\{ id: "([a-z]+)".*?colours: \{ suit: "(#\w+)", trim: "(#\w+)", accent: "(#\w+)" \}, gear: "(\w+)", emblem: "(\w+)", cape: (true|false)', src):
        out.append(dict(id=m[1], suit=hexc(m[2]), trim=hexc(m[3]), accent=hexc(m[4]), gear=m[5], emblem=m[6], cape=m[7] == "true"))
    return out

# A spread of skin tones and hair colours, so the league looks like London.
SKINS = {"quotient": "#8d5a3b", "photon": "#f1c9a5", "helix": "#c68a5c", "catalyst": "#5a3520", "byte": "#e0ac83", "quill": "#a0673f"}
HAIRS = {"quotient": "#1d1512", "photon": "#d9b06b", "helix": "#2a1d17", "catalyst": "#111111", "byte": "#6b3a1e", "quill": "#3a2a20"}

def mat(name, c, emit=0.0, rough=0.75):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*c, 1); b.inputs["Roughness"].default_value = rough
    if emit:
        b.inputs["Emission Color"].default_value = (*c, 1); b.inputs["Emission Strength"].default_value = emit
    return m

def block(m, lo, hi, parent=None):
    c = [(a + b) / 2 for a, b in zip(lo, hi)]
    bpy.ops.mesh.primitive_cube_add(size=1, location=c)
    o = bpy.context.object; o.scale = [abs(b - a) for a, b in zip(lo, hi)]
    o.data.materials.append(m)
    if parent: o.parent = parent; o.matrix_parent_inverse = parent.matrix_world.inverted()
    return o

def scene_setup(res, cam, target, lens):
    sc = bpy.context.scene
    sc.render.engine = "CYCLES"; sc.cycles.samples = 48; sc.cycles.device = "CPU"
    sc.render.resolution_x, sc.render.resolution_y = res
    sc.render.film_transparent = True
    sc.view_settings.view_transform = "Standard"
    # Black outlines, like the 3D world's outline pass.
    sc.render.use_freestyle = True; sc.render.line_thickness_mode = "ABSOLUTE"; sc.render.line_thickness = 2.6
    ls = sc.view_layers[0].freestyle_settings.linesets.active or sc.view_layers[0].freestyle_settings.linesets.new("outline")
    ls.select_by_visibility = True; ls.select_by_edge_types = True
    ls.select_silhouette = True; ls.select_border = True; ls.select_crease = True
    if ls.linestyle is None: ls.linestyle = bpy.data.linestyles.new("ink")
    ls.linestyle.color = (0, 0, 0); ls.linestyle.thickness = 2.6
    w = bpy.data.worlds.new("w"); sc.world = w; w.use_nodes = True
    w.node_tree.nodes["Background"].inputs[0].default_value = (0.85, 0.88, 0.95, 1)
    w.node_tree.nodes["Background"].inputs[1].default_value = 0.9
    bpy.ops.object.light_add(type="SUN", location=(3, -5, 6)); s = bpy.context.object
    s.data.energy = 3.2; s.rotation_euler = (math.radians(50), 0, math.radians(-30)); s.data.angle = math.radians(10)
    cl = Vector(cam)
    bpy.ops.object.camera_add(location=cl); c = bpy.context.object; c.data.lens = lens
    c.rotation_euler = (Vector(target) - cl).to_track_quat("-Z", "Y").to_euler(); sc.camera = c

def save(path_png, path_webp):
    bpy.context.scene.render.filepath = path_png
    bpy.ops.render.render(write_still=True)
    from PIL import Image
    im = Image.open(path_png); im = im.crop(im.getbbox())
    im.save(path_webp, "WEBP", quality=90)
    os.remove(path_png)

def hero(h):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=MODEL)
    for o in list(bpy.data.objects):
        if o.name.startswith("Icosphere"): bpy.data.objects.remove(o)
    body = bpy.data.objects["Body"]; arm = bpy.data.objects["Armature"]
    # Pose: the cheer clip, arms up.
    act = bpy.data.actions.get("cheer") or bpy.data.actions.get("idle")
    arm.animation_data_create(); arm.animation_data.action = act
    if hasattr(arm.animation_data, "action_slot") and act.slots: arm.animation_data.action_slot = act.slots[0]
    f0, f1 = act.frame_range; bpy.context.scene.frame_set(int(f0 + (f1 - f0) * 0.3))

    # Recolour face by face from the palette colour each face used.
    pal = [n.image for n in body.active_material.node_tree.nodes if n.type == "TEX_IMAGE" and "emissive" not in n.image.name][0]
    W, H = pal.size; px = pal.pixels[:]
    uv = body.data.uv_layers.active.data
    dark = tuple(c * 0.45 for c in h["suit"])
    remap = {
        (0.18, 0.55, 1.0): h["suit"], (0.14, 0.2, 0.47): dark, (0.2, 0.22, 0.29): h["accent"],
        (1.0, 0.77, 0.12): h["trim"], (1.0, 0.52, 0.09): h["trim"], (0.94, 0.95, 0.97): h["trim"],
        (0.97, 0.78, 0.59): hexc(SKINS.get(h["id"], "#c68a5c")), (0.42, 0.25, 0.13): hexc(HAIRS.get(h["id"], "#2a1d17")),
    }
    mats = {}
    face_colour = {}
    body.data.materials.clear()
    for p in body.data.polygons:
        u = sum(uv[i].uv.x for i in p.loop_indices) / p.loop_total; v = sum(uv[i].uv.y for i in p.loop_indices) / p.loop_total
        k = (min(H - 1, int(v * H)) * W + min(W - 1, int(u * W))) * 4
        orig = tuple(round(px[k + j], 2) for j in range(3))
        face_colour[p.index] = orig
        lin = remap.get(orig, tuple(c ** 2.2 for c in orig))
        key = tuple(round(c, 3) for c in lin)
        if key not in mats:
            mats[key] = len(body.data.materials); body.data.materials.append(mat(f"c{len(mats)}", lin))
        p.material_index = mats[key]

    # Find the face: front is where the eyes are.
    bpy.context.view_layer.update()
    dg = bpy.context.evaluated_depsgraph_get(); ev = body.evaluated_get(dg); me = ev.to_mesh()
    vs = [body.matrix_world @ v.co for v in me.vertices]
    lo = Vector((min(v.x for v in vs), min(v.y for v in vs), min(v.z for v in vs))); hi = Vector((max(v.x for v in vs), max(v.y for v in vs), max(v.z for v in vs)))
    def faces_of(colour):
        pts = []
        for p in me.polygons:
            if face_colour.get(p.index) == colour: pts += [vs[i] for i in p.vertices]
        return pts
    eyes = faces_of((0.1, 0.1, 0.13)); shirt = faces_of((0.18, 0.55, 1.0)); hair = faces_of((0.42, 0.25, 0.13))
    ex = sum(v.x for v in eyes) / len(eyes)
    skin = [v for v in faces_of((0.97, 0.78, 0.59)) if v.z > min(v.z for v in eyes) - 0.4]
    # Hands go up beside the head in this pose: keep only what's within a head's width of the eyes.
    hairx = [v for v in hair if abs(v.x - ex) < 0.6]
    half = max(abs(v.x - ex) for v in hairx) if hairx else 0.4
    headpts = [v for v in skin + hair if abs(v.x - ex) <= half + 0.01]
    hx0, hx1 = min(v.x for v in headpts), max(v.x for v in headpts); hy0, hy1 = min(v.y for v in headpts), max(v.y for v in headpts); hz1 = max(v.z for v in headpts)
    ez0, ez1 = min(v.z for v in eyes), max(v.z for v in eyes)
    front = min(v.y for v in eyes)
    core = [v for v in shirt if abs(v.x - (hx0 + hx1) / 2) < 0.28]
    ty0, ty1 = min(v.y for v in core), max(v.y for v in core); sz0, sz1 = min(v.z for v in core), max(v.z for v in core)
    ev.to_mesh_clear()
    cx = (hx0 + hx1) / 2
    em = (ez0 + ez1) / 2  # eye line
    trim, accent, suit = mat("trim", h["trim"]), mat("accent", h["accent"]), mat("suit", h["suit"])
    glow = mat("glow", h["trim"], emit=1.5)
    g = h["gear"]
    if g == "visor":
        block(glow, (hx0 - 0.02, front - 0.05, em - 0.06), (hx1 + 0.02, front + 0.02, em + 0.06))
    elif g == "goggles":
        for sx in (-1, 1): block(glow, (cx + sx * 0.06 - 0.09 + (0.09 if sx > 0 else 0), front - 0.06, em - 0.07), (cx + sx * 0.06 + (0.09 if sx > 0 else 0), front + 0.01, em + 0.07))
        block(accent, (hx0 - 0.03, front - 0.02, em - 0.025), (hx1 + 0.03, hy1 + 0.03, em + 0.025))
    elif g == "mask":
        block(accent, (hx0 - 0.02, front - 0.04, em - 0.08), (cx - 0.04, front + 0.02, em + 0.08))
        block(accent, (cx + 0.04, front - 0.04, em - 0.08), (hx1 + 0.02, front + 0.02, em + 0.08))
        block(accent, (cx - 0.05, front - 0.04, em), (cx + 0.05, front + 0.02, em + 0.08))
    elif g == "flaskhelm":
        block(trim, (hx0 - 0.04, hy0 - 0.04, hz1 - 0.24), (hx1 + 0.04, hy1 + 0.04, hz1 + 0.06))
        block(glow, (cx - 0.08, (hy0 + hy1) / 2 - 0.08, hz1 + 0.06), (cx + 0.08, (hy0 + hy1) / 2 + 0.08, hz1 + 0.26))
    elif g == "crest":
        block(trim, (hx0 - 0.04, hy0 - 0.04, hz1 - 0.24), (hx1 + 0.04, hy1 + 0.04, hz1 + 0.05))
        block(accent, (cx - 0.04, hy0 - 0.02, hz1 + 0.05), (cx + 0.04, hy1 + 0.1, hz1 + 0.24))
    elif g == "pixelvisor":
        block(mat("black", (0.02, 0.02, 0.03)), (hx0 + 0.02, front - 0.05, em - 0.07), (hx1 - 0.02, front + 0.01, em + 0.07))
        block(glow, (cx - 0.12, front - 0.06, em - 0.02), (cx - 0.04, front - 0.05, em + 0.02))
    # Chest emblem.
    ez = sz1 - 0.16
    block(trim, (cx - 0.09, ty0 - 0.04, ez - 0.09), (cx + 0.09, ty0 + 0.01, ez + 0.09))
    block(mat("emb", h["accent"], emit=0.3), (cx - 0.05, ty0 - 0.05, ez - 0.05), (cx + 0.05, ty0 - 0.03, ez + 0.05))
    # Cape behind the shoulders.
    if h["cape"]:
        block(mat("cape", tuple(c * 0.8 for c in h["accent"]) if h["id"] != "quotient" else h["accent"]), (cx - 0.3, ty1 + 0.01, sz0 - 0.55), (cx + 0.3, ty1 + 0.07, sz1 + 0.02))
    # A little plinth in the hero's colour.
    block(mat("plinth", tuple(c * 0.6 for c in h["suit"])), (lo.x - 0.1, -0.5, -0.12), (hi.x + 0.1, 0.5, 0.0))
    scene_setup((640, 800), (1.4, -4.2, 1.6), (0, 0, 0.85), 50)
    save(os.path.join(OUT, f"_{h['id']}.png"), os.path.join(OUT, f"{h['id']}.webp"))

def fog(hurt):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    body = mat("fog", (0.09, 0.08, 0.17) if not hurt else (0.2, 0.18, 0.3), rough=0.9)
    dark = mat("dark", (0.01, 0.01, 0.02)); eye = mat("eye", (1, 0.62, 0.05), emit=0.8)
    random.seed(7)
    def puff(r, loc):
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=r, location=loc)
        o = bpy.context.object; o.data.materials.append(body); o.rotation_euler = (random.random(), random.random(), random.random())
    for i in range(14):
        a = i / 14 * math.pi * 2
        puff(0.6 + random.random() * 0.25, (math.cos(a) * 1.05, random.uniform(0.1, 0.4), 0.95 + math.sin(a) * 0.6))
    puff(1.15, (0, 0.2, 0.95))
    # Blocky glowing eyes and heavy brows.
    for sx in (1, -1):
        block(eye, (sx * 0.42 - 0.14, -1.2, 1.0), (sx * 0.42 + 0.14, -1.0, 1.0 + (0.24 if not hurt else 0.08)))
        b = block(dark, (sx * 0.42 - 0.24, -1.25, 1.36), (sx * 0.42 + 0.24, -1.05, 1.48))
        b.rotation_euler = (0, sx * (0.35 if not hurt else -0.3), 0)
    if hurt:
        block(dark, (-0.16, -1.2, 0.5), (0.16, -1.0, 0.78))  # an "oof" mouth
    else:
        for i, x in enumerate((-0.3, -0.1, 0.1, 0.3)):  # zigzag frown
            block(dark, (x - 0.1, -1.2, 0.6 + (0.08 if i % 2 else 0)), (x + 0.1, -1.0, 0.7 + (0.08 if i % 2 else 0)))
    for x, z in ((-2.0, 1.7), (2.0, 1.5), (-1.7, 0.2), (1.8, 0.1)):  # crackling bolts
        for k in range(3):
            bl = block(eye, (x - 0.05, -0.4, z - k * 0.2 - 0.1), (x + 0.05, -0.3, z - k * 0.2 + 0.1)); bl.rotation_euler = (0, 0.5 if k % 2 else -0.5, 0)
    scene_setup((900, 700), (0.5, -7.4, 1.5), (0, 0, 0.95), 42)
    save(os.path.join(OUT, "_fog.png"), os.path.join(OUT, "fog-hurt.webp" if hurt else "fog.webp"))

if __name__ == "__main__":
    want = sys.argv[1:]
    for h in heroes():
        if not want or h["id"] in want: hero(h); print("hero", h["id"])
    if not want or "fog" in want:
        fog(False); fog(True); print("fog")
