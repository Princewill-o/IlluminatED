"""IlluminatED vehicles (original models): rounded toy-like London traffic with
crisp panel lines, lights and plates. One .glb per model in public/world3d/cars/.
  python3 art/blender/cars.py export
  python3 art/blender/cars.py render out.png
Built with the front at +X; rotated on export to face glTF +Z like the old kit.
"""
import bpy, math, sys
from mathutils import Vector

COL = {"glass": (0.05, 0.07, 0.09), "rubber": (0.05, 0.05, 0.06), "hub": (0.78, 0.79, 0.8), "lamp": (1, 0.97, 0.85),
       "tail": (0.85, 0.05, 0.05), "amber": (1, 0.55, 0.05), "plate": (0.95, 0.95, 0.95), "rplate": (1, 0.8, 0.1),
       "trim": (0.12, 0.12, 0.14), "chrome": (0.8, 0.8, 0.82), "white": (0.95, 0.95, 0.95), "blue": (0.05, 0.2, 0.85),
       "yellow": (1, 0.85, 0.05), "green": (0.2, 0.75, 0.25), "line": (0.1, 0.1, 0.12)}

def hexc(h): return tuple((int(h[i:i + 2], 16) / 255) ** 2.2 for i in (1, 3, 5))

def build(paint, kind):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    mats = {}
    def mat(n):
        if n not in mats:
            m = bpy.data.materials.new(n); m.use_nodes = True; b = m.node_tree.nodes["Principled BSDF"]
            c = hexc(paint) if n == "paint" else COL[n]
            b.inputs["Base Color"].default_value = (*c, 1)
            b.inputs["Roughness"].default_value = 0.1 if n == "glass" else 0.3 if n in ("paint", "chrome") else 0.7
            if n in ("lamp", "tail", "amber"):
                b.inputs["Emission Color"].default_value = (*c, 1); b.inputs["Emission Strength"].default_value = 0.6
            mats[n] = m
        return mats[n]
    objs = []
    def rbox(n, x0, y0, z0, x1, y1, z1, bevel=0.0, segs=3):
        bpy.ops.mesh.primitive_cube_add(size=1, location=((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2))
        o = bpy.context.object; o.scale = (x1 - x0, y1 - y0, z1 - z0); bpy.ops.object.transform_apply(scale=True)
        if bevel:
            m = o.modifiers.new("b", "BEVEL"); m.width = bevel; m.segments = segs; m.limit_method = "NONE"
            bpy.ops.object.modifier_apply(modifier="b"); bpy.ops.object.shade_smooth()
        o.data.materials.append(mat(n)); objs.append(o); return o
    def taper(o, top_scale_x, top_scale_y, shift_x=0.0):
        """Narrow the top of a box (cabins and bonnets slope like real cars)."""
        zs = [v.co.z for v in o.data.vertices]; zmin, zmax = min(zs), max(zs)
        cx = sum(v.co.x for v in o.data.vertices) / len(o.data.vertices)
        for v in o.data.vertices:
            k = (v.co.z - zmin) / max(1e-6, zmax - zmin)
            v.co.x = cx + (v.co.x - cx) * (1 - k * (1 - top_scale_x)) + shift_x * k
            v.co.y *= 1 - k * (1 - top_scale_y)
    def wheel(x, y, r=0.17, w=0.12):
        for n, rr, ww in (("rubber", r, w), ("hub", r * 0.55, w + 0.01), ("trim", r * 0.2, w + 0.02)):
            bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=rr, depth=ww, location=(x, y, r))
            o = bpy.context.object; o.rotation_euler = (math.pi / 2, 0, 0); bpy.ops.object.shade_smooth()
            o.data.materials.append(mat(n)); objs.append(o)

    L, W = 1.9, 0.86
    spec = {
        "sedan": dict(h0=0.16, body=0.4, cab=(-0.58, 0.38, 0.34), roof=0.8),
        "hatchback-sports": dict(h0=0.12, body=0.36, cab=(-0.45, 0.25, 0.26), roof=0.64),
        "suv": dict(h0=0.2, body=0.55, cab=(-0.75, 0.48, 0.4), roof=1.0),
        "taxi": dict(h0=0.17, body=0.5, cab=(-0.7, 0.38, 0.45), roof=1.02),
        "police": dict(h0=0.16, body=0.4, cab=(-0.58, 0.38, 0.34), roof=0.8),
        "van": dict(h0=0.2, body=0.55, cab=(-0.95, 0.68, 0.48), roof=1.08),
        "ambulance": dict(h0=0.2, body=0.55, cab=(-0.95, 0.68, 0.5), roof=1.12),
        "delivery": dict(h0=0.22, body=0.55, cab=(-0.95, 0.5, 0.55), roof=1.25),
    }[kind]
    h0, body, (cx0, cx1, _), roof = spec["h0"], spec["body"], spec["cab"], spec["roof"]
    x0, x1 = -L / 2, L / 2
    # Lower body with a crisp dark sill line and bumpers.
    rbox("paint", x0, -W / 2, h0, x1, W / 2, h0 + body, bevel=0.07, segs=4)
    rbox("trim", x0 + 0.05, -W / 2 - 0.006, h0 - 0.01, x1 - 0.05, W / 2 + 0.006, h0 + 0.05)
    rbox("trim", x1 - 0.04, -W / 2 + 0.03, h0 - 0.02, x1 + 0.03, W / 2 - 0.03, h0 + 0.1, bevel=0.03)
    rbox("trim", x0 - 0.03, -W / 2 + 0.03, h0 - 0.02, x0 + 0.04, W / 2 - 0.03, h0 + 0.1, bevel=0.03)
    if kind == "delivery":
        rbox("white", x0 - 0.02, -W / 2 - 0.02, h0 + 0.05, x0 + 1.25, W / 2 + 0.02, roof, bevel=0.03)
        rbox("paint", x0 - 0.01, -W / 2 - 0.03, h0 + 0.35, x0 + 1.24, W / 2 + 0.03, h0 + 0.5)
        cab = rbox("paint", x0 + 1.28, -W / 2 + 0.02, h0 + body - 0.05, x1 - 0.02, W / 2 - 0.02, roof - 0.2, bevel=0.08, segs=4)
        rbox("glass", x1 - 0.17, -W / 2 + 0.06, h0 + body + 0.03, x1 - 0.04, W / 2 - 0.06, roof - 0.28, bevel=0.02)
        for s in (-1, 1): rbox("glass", x0 + 1.33, s * (W / 2 - 0.01) - 0.012, h0 + body + 0.04, x1 - 0.2, s * (W / 2 - 0.01) + 0.012, roof - 0.28)
    else:
        cab = rbox("paint", cx0, -W / 2 + 0.04, h0 + body - 0.04, cx1, W / 2 - 0.04, h0 + roof, bevel=0.1, segs=5)
        slope = 0.62 if kind in ("sedan", "police", "hatchback-sports") else 0.82
        taper(cab, slope, 0.9, shift_x=-0.04)
        # Glazing band all round the cabin, split by a dark B pillar.
        g = rbox("glass", cx0 + 0.02, -W / 2 + 0.03, h0 + body + 0.03, cx1 - 0.02, W / 2 - 0.03, h0 + roof - 0.07, bevel=0.06, segs=4)
        taper(g, slope, 0.9, shift_x=-0.04)
        mid = (cx0 + cx1) / 2 - 0.02
        for s in (-1, 1): rbox("paint", mid - 0.025, s * (W / 2 - 0.02) - 0.03, h0 + body, mid + 0.025, s * (W / 2 - 0.02) + 0.03, h0 + roof - 0.1)
    # Door shut lines and handles (makes the panels read clearly from above).
    for s in (-1, 1):
        for dx in ((-0.05, 0.4) if kind not in ("van", "ambulance", "delivery") else (0.45,)):
            rbox("line", dx - 0.006, s * W / 2 - 0.004, h0 + 0.06, dx + 0.006, s * W / 2 + 0.004, h0 + body - 0.03)
            rbox("chrome", dx + 0.06, s * W / 2 - 0.006, h0 + body - 0.12, dx + 0.14, s * W / 2 + 0.006, h0 + body - 0.09)
        # Mirrors.
        rbox("paint", cx1 - 0.08 if kind != "delivery" else x1 - 0.28, s * W / 2, h0 + body + 0.02, cx1 - 0.0 if kind != "delivery" else x1 - 0.2, s * (W / 2 + 0.09), h0 + body + 0.09, bevel=0.015)
    # Lights, grille and plates.
    for s in (-1, 1):
        rbox("lamp", x1 - 0.01, s * 0.3 - 0.08, h0 + body - 0.16, x1 + 0.012, s * 0.3 + 0.08, h0 + body - 0.07, bevel=0.015)
        rbox("tail", x0 - 0.012, s * 0.32 - 0.07, h0 + body - 0.16, x0 + 0.01, s * 0.32 + 0.07, h0 + body - 0.06, bevel=0.015)
        rbox("amber", x1 - 0.008, s * 0.38 - 0.02, h0 + body - 0.2, x1 + 0.01, s * 0.38 + 0.02, h0 + body - 0.17)
    rbox("trim", x1 - 0.005, -0.18, h0 + 0.12, x1 + 0.014, 0.18, h0 + body - 0.19, bevel=0.01)
    rbox("plate", x1 + 0.03, -0.11, h0 + 0.03, x1 + 0.04, 0.11, h0 + 0.09)
    rbox("rplate", x0 - 0.04, -0.11, h0 + 0.12, x0 - 0.03, 0.11, h0 + 0.18)
    # Model specifics.
    top = h0 + roof
    if kind == "taxi":
        rbox("amber", -0.2, -0.13, top - 0.01, 0.0, 0.13, top + 0.07, bevel=0.02)
    if kind in ("police", "ambulance"):
        rbox("blue", -0.25 if kind == "police" else 0.35, -0.3, top - 0.01, -0.05 if kind == "police" else 0.55, 0.3, top + 0.06, bevel=0.02)
        band = "blue" if kind == "police" else "green"
        for i in range(10):
            xa = x0 + 0.05 + i * (L - 0.1) / 10
            rbox(band if i % 2 == 0 else "yellow", xa, -W / 2 - 0.008, h0 + 0.17, xa + (L - 0.1) / 10, W / 2 + 0.008, h0 + 0.3)
    if kind == "suv":
        for s in (-1, 1): rbox("trim", cx0 + 0.05, s * 0.3 - 0.015, top - 0.005, cx1 - 0.1, s * 0.3 + 0.015, top + 0.04)
    if kind == "hatchback-sports":
        rbox("trim", x0 + 0.02, -W / 2 + 0.06, h0 + body + 0.01, x0 + 0.12, W / 2 - 0.06, h0 + body + 0.06)
        rbox("trim", x0 + 0.06, -0.3, h0 + body - 0.02, x0 + 0.09, -0.26, h0 + body + 0.03)
        rbox("trim", x0 + 0.06, 0.26, h0 + body - 0.02, x0 + 0.09, 0.3, h0 + body + 0.03)
    if kind == "van":
        for s in (-1, 1): rbox("line", -0.55, s * W / 2 - 0.004, h0 + 0.48, 0.3, s * W / 2 + 0.004, h0 + 0.49)
    # Wheels in their arches.
    r = 0.18 if kind in ("suv", "van", "ambulance", "delivery") else 0.16
    for x in (x1 - 0.38, x0 + 0.38):
        for s in (-1, 1): wheel(x, s * (W / 2 - 0.04), r)
    bpy.ops.object.select_all(action="SELECT")
    bpy.context.view_layer.objects.active = objs[0]; bpy.ops.object.join()
    car = bpy.context.object; car.name = kind
    return car

PAINT = {"sedan": "#3d6fd6", "hatchback-sports": "#e2402f", "suv": "#4f6b5a", "taxi": "#1d1d22", "police": "#f2f3f5",
         "van": "#eceef0", "ambulance": "#f3e43a", "delivery": "#f2a33a"}

if sys.argv[1] == "export":
    for kind, paint in PAINT.items():
        car = build(paint, kind)
        car.rotation_euler = (0, 0, -math.pi / 2); bpy.ops.object.transform_apply(rotation=True)
        bpy.ops.export_scene.gltf(filepath=f"/home/claude/illuminated/public/world3d/cars/{kind}.glb", export_format="GLB", export_yup=True, export_apply=True)
        print("exported", kind)
else:
    import os
    out = sys.argv[2]; tiles = []
    for kind, paint in PAINT.items():
        car = build(paint, kind)
        sc = bpy.context.scene; sc.render.engine = "CYCLES"; sc.cycles.samples = 24; sc.cycles.device = "CPU"
        sc.render.resolution_x = 480; sc.render.resolution_y = 320
        w = bpy.data.worlds.new("w"); sc.world = w; w.use_nodes = True
        w.node_tree.nodes["Background"].inputs[0].default_value = (0.78, 0.82, 0.88, 1)
        bpy.ops.mesh.primitive_plane_add(size=20)
        bpy.ops.object.light_add(type="SUN", location=(2, -3, 5)); s = bpy.context.object; s.data.energy = 3.5
        s.rotation_euler = (math.radians(40), 0, math.radians(30))
        cl = Vector((2.6, -2.4, 1.7))
        bpy.ops.object.camera_add(location=cl); cam = bpy.context.object; cam.data.lens = 40
        cam.rotation_euler = (Vector((0, 0, 0.4)) - cl).to_track_quat("-Z", "Y").to_euler(); sc.camera = cam
        sc.view_settings.view_transform = "Standard"
        p = f"{out}-{kind}.png"; sc.render.filepath = p; bpy.ops.render.render(write_still=True); tiles.append(p)
    from PIL import Image
    ims = [Image.open(p) for p in tiles]; sheet = Image.new("RGB", (480 * 4, 320 * 2))
    for i, im in enumerate(ims): sheet.paste(im, ((i % 4) * 480, (i // 4) * 320))
    sheet.save(out)
