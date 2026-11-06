"""
Specialised cars, built from the car models already in the game (public/world3d/cars-realistic).

Run headless:  python3 blender/cars/build_cars.py [--preview DIR]

Each variant imports an existing body (NormalCar1, NormalCar2, SportsCar, SportsCar2, SUV),
renames its body material to "paint" (so the paint shop can respray it), sets a factory
colour, and bolts on a kit sized from the body's own bounds: roof pods, wings, light bars,
cargo boxes, pop-top roofs, stripes. The kit is joined into the body so the game's vehicle
rig treats it exactly like the originals.

Exports public/world3d/cars-blender/<id>.glb and, with --preview, a still per car.
"""
import math
import os
import sys

import bpy  # noqa: I001  (bpy must load before bmesh)
import bmesh
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "..", "..", "public", "world3d", "cars-realistic")
OUT = os.path.join(HERE, "..", "..", "public", "world3d", "cars-blender")
BODY = {"NormalCar1": "Blue", "NormalCar2": "LightBlue", "SportsCar": "Orange", "SportsCar2": "White", "SUV": "White.001"}


def lin(hex_):
    r, g, b = (int(hex_[i:i + 2], 16) / 255 for i in (1, 3, 5))
    return [c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in (r, g, b)]


def mat(name, colour, rough=0.6, metal=0.0, emit=0.0):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True
    b = next(n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    # Some bodies take their colour from a texture; paint must be a flat colour the game can respray.
    for link in list(b.inputs["Base Color"].links):
        m.node_tree.links.remove(link)
    b.inputs["Base Color"].default_value = (*lin(colour), 1)
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal
    if emit:
        b.inputs["Emission Color"].default_value = (*lin(colour), 1)
        b.inputs["Emission Strength"].default_value = emit
    return m


class Car:
    """An imported body plus helpers for placing kit relative to it."""

    def __init__(self, base, colour):
        bpy.ops.wm.read_factory_settings(use_empty=True)
        bpy.ops.import_scene.gltf(filepath=os.path.join(SRC, f"{base}.glb"))
        self.body = next(o for o in bpy.context.scene.objects if o.type == "MESH")
        pts = [self.body.matrix_world @ Vector(c) for c in self.body.bound_box]
        self.x0, self.x1 = min(p.x for p in pts), max(p.x for p in pts)
        self.y0, self.y1 = min(p.y for p in pts), max(p.y for p in pts)
        self.top = max(p.z for p in pts)
        # Which end is the front: where the headlights are.
        me = self.body.data
        head = [i for i, m in enumerate(me.materials) if m and m.name.startswith("Headlights")]
        ys = [(self.body.matrix_world @ me.vertices[v].co).y for p in me.polygons if p.material_index in head for v in p.vertices]
        self.front = 1 if ys and sum(ys) / len(ys) > 0 else -1
        paint = me.materials[[m.name if m else "" for m in me.materials].index(BODY[base])]
        paint.name = "paint"
        mat("paint", colour, 0.35, 0.2)
        self.kit = bmesh.new()
        self.mats = list(me.materials)
        # Roof height near the middle of the car (the bound box top is the cabin roof).
        self.roof = self.top

    @property
    def length(self):
        return self.y1 - self.y0

    @property
    def width(self):
        return self.x1 - self.x0

    def along(self, f):
        """A position along the car: f=1 is the front bumper, f=-1 the rear."""
        mid = (self.y0 + self.y1) / 2
        return mid + self.front * f * self.length / 2

    def slot(self, material):
        if material.name not in [m.name for m in self.mats]:
            self.mats.append(material)
        return [m.name for m in self.mats].index(material.name)

    def box(self, material, cx, cy, z0, sx, sy, sz):
        res = bmesh.ops.create_cube(self.kit, size=1.0)
        for v in res["verts"]:
            v.co = Vector((cx + v.co.x * sx, cy + v.co.y * sy, z0 + (v.co.z + 0.5) * sz))
        i = self.slot(material)
        for f in {f for v in res["verts"] for f in v.link_faces}:
            f.material_index = i

    def cylinder(self, material, cx, cy, z0, r, depth, axis="z", segs=10):
        res = bmesh.ops.create_cone(self.kit, cap_ends=True, segments=segs, radius1=r, radius2=r, depth=depth)
        for v in res["verts"]:
            c = v.co.copy()
            if axis == "x":
                c = Vector((c.z, c.y, c.x))
            elif axis == "y":
                c = Vector((c.x, c.z, c.y))
            v.co = Vector((cx + c.x, cy + c.y, z0 + c.z))
        i = self.slot(material)
        for f in {f for v in res["verts"] for f in v.link_faces}:
            f.material_index = i

    def finish(self):
        if not self.kit.verts:
            return [self.body]
        me = bpy.data.meshes.new("kit")
        self.kit.to_mesh(me)
        self.kit.free()
        kit = bpy.data.objects.new("kit", me)
        for m in self.mats:
            kit.data.materials.append(m)
        bpy.context.collection.objects.link(kit)
        for p in kit.data.polygons:
            p.use_smooth = False
        bpy.ops.object.select_all(action="DESELECT")
        kit.select_set(True)
        self.body.select_set(True)
        bpy.context.view_layer.objects.active = self.body
        bpy.ops.object.join()
        return [self.body]


# Shared kit materials.
def kit_mats():
    return dict(
        black=mat("kit-black", "#1f2126", 0.7),
        chrome=mat("kit-chrome", "#c9ced6", 0.25, 0.8),
        white=mat("kit-white", "#f4f2ea", 0.5),
        amber=mat("kit-amber", "#ffb21a", 0.3, emit=2.0),
        cyan=mat("kit-cyan", "#7fe7ff", 0.3, emit=2.5),
        canvas=mat("kit-canvas", "#e9dcc0", 0.9),
        stripe=mat("kit-stripe", "#ffffff", 0.5),
        tyre=mat("kit-tyre", "#1b1c20", 0.9),
        wood=mat("kit-wood", "#8a6440", 0.8),
    )


def mini():
    c = Car("NormalCar2", "#c8322d")
    k = kit_mats()
    # Contrast roof, twin bonnet stripes and a little roof rack.
    c.box(k["white"], 0, c.along(-0.05), c.roof - 0.04, c.width * 0.72, c.length * 0.42, 0.06)
    for x in (-0.16, 0.16):
        c.box(k["stripe"], x, c.along(0.72), 0.86, 0.12, c.length * 0.26, 0.03)
    for y in (-0.22, 0.22):
        c.box(k["chrome"], 0, c.along(-0.05) + y, c.roof + 0.02, c.width * 0.66, 0.05, 0.05)
    return c.finish()


def ev_hatch():
    c = Car("NormalCar1", "#f4f4f0")
    k = kit_mats()
    # Light bars across the nose and tail, blue charging-port trim and aero hubs.
    c.box(k["cyan"], 0, c.along(0.97), 0.6, c.width * 0.62, 0.05, 0.04)
    c.box(k["cyan"], 0, c.along(-0.97), 0.7, c.width * 0.62, 0.05, 0.04)
    c.box(k["cyan"], c.x1 - 0.03, c.along(-0.55), 0.78, 0.04, 0.2, 0.1)
    return c.finish()


def pickup():
    c = Car("SUV", "#2f6b3e")
    k = kit_mats()
    # Roof light bar, bull bar, side steps and a spare wheel on the tailgate.
    c.box(k["black"], 0, c.along(0.1), c.roof + 0.02, c.width * 0.86, 0.12, 0.06)
    for x in (-0.55, -0.2, 0.2, 0.55):
        c.box(k["amber"], x * c.width / 2.1, c.along(0.1) + c.front * 0.07, c.roof + 0.03, 0.16, 0.04, 0.08)
    c.box(k["black"], 0, c.along(1.02), 0.25, c.width * 0.8, 0.08, 0.5)
    for x in (-1, 1):
        c.box(k["black"], x * (c.width / 2 + 0.06), c.along(0.0), 0.28, 0.12, c.length * 0.5, 0.05)
    c.cylinder(k["tyre"], 0, c.along(-1.04), 0.5, 0.36, 0.2, axis="y", segs=12)
    c.cylinder(k["chrome"], 0, c.along(-1.04) - c.front * 0.06, 0.5, 0.18, 0.12, axis="y", segs=10)
    return c.finish()


def box_van():
    c = Car("SUV", "#f4f4f0")
    k = kit_mats()
    # A tall cargo box over the back two-thirds, with a stripe and a roof deflector.
    start, end = c.along(0.25), c.along(-1.0)
    mid, ln = (start + end) / 2, abs(start - end)
    c.box(k["white"], 0, mid, 0.42, c.width * 1.02, ln, c.roof + 0.32 - 0.42)
    c.box(mat("kit-van-stripe", "#2b6fe0", 0.5), 0, mid, 1.0, c.width * 1.04, ln * 0.96, 0.12)
    c.box(k["black"], 0, end - c.front * 0.01, 0.45, c.width * 0.9, 0.04, c.roof - 0.2)
    return c.finish()


def camper():
    c = Car("NormalCar2", "#2fa8a0")
    k = kit_mats()
    # Two-tone: cream pop-top roof tent, roof box and a bike on the back.
    c.box(k["white"], 0, c.along(-0.1), c.roof - 0.03, c.width * 0.7, c.length * 0.48, 0.08)
    c.box(k["canvas"], 0, c.along(-0.1), c.roof + 0.05, c.width * 0.64, c.length * 0.42, 0.16)
    c.box(k["white"], 0, c.along(-0.1), c.roof + 0.21, c.width * 0.72, c.length * 0.5, 0.05)
    c.box(k["black"], 0, c.along(-1.04), 0.45, c.width * 0.6, 0.06, 0.06)
    for x in (-0.28, 0.28):
        c.cylinder(k["black"], x, c.along(-1.08), 0.62, 0.22, 0.03, axis="x", segs=12)
    return c.finish()


def rally():
    c = Car("SportsCar", "#2b6fe0")
    k = kit_mats()
    # Roof light pod, rear spoiler, twin racing stripes and door roundels.
    for x in (-0.33, -0.11, 0.11, 0.33):
        c.cylinder(k["amber"], x, c.along(0.25), c.roof + 0.02, 0.09, 0.08, axis="y", segs=10)
    c.box(k["black"], 0, c.along(0.25) - c.front * 0.05, c.roof - 0.02, c.width * 0.6, 0.08, 0.14)
    c.box(k["black"], 0, c.along(-0.9), 0.98, c.width * 0.9, 0.22, 0.04)
    for x in (-0.6, 0.6):
        c.box(k["black"], x * c.width / 2.2, c.along(-0.88), 0.82, 0.05, 0.12, 0.17)
    for x in (-1, 1):
        c.cylinder(k["white"], x * (c.width / 2 + 0.005), c.along(0.05), 0.62, 0.17, 0.02, axis="x", segs=14)
    return c.finish()


def supercar():
    c = Car("SportsCar2", "#f2c418")
    k = kit_mats()
    # Big rear wing on uprights, carbon splitter, side skirts and a centre stripe.
    c.box(k["black"], 0, c.along(-0.92), c.roof + 0.04, c.width * 1.02, 0.3, 0.05)
    for x in (-0.55, 0.55):
        c.box(k["black"], x * c.width / 2, c.along(-0.9), c.roof * 0.7, 0.05, 0.12, c.roof * 0.36)
    c.box(k["black"], 0, c.along(1.0), 0.1, c.width * 0.96, 0.18, 0.05)
    for x in (-1, 1):
        c.box(k["black"], x * (c.width / 2 + 0.02), c.along(0.0), 0.16, 0.06, c.length * 0.56, 0.08)
    return c.finish()


def preview(name, folder):
    scene = bpy.context.scene
    cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam"))
    scene.collection.objects.link(cam)
    cam.location = (5.5, -6.5, 4.2)
    cam.rotation_euler = (math.radians(62), 0, math.radians(40))
    scene.camera = cam
    sun = bpy.data.objects.new("sun", bpy.data.lights.new("sun", "SUN"))
    sun.data.energy = 3.5
    sun.rotation_euler = (math.radians(45), math.radians(15), math.radians(35))
    scene.collection.objects.link(sun)
    world = bpy.data.worlds.new("w")
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs[0].default_value = (1, 1, 1, 1)
    world.node_tree.nodes["Background"].inputs[1].default_value = 0.8
    scene.world = world
    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = 16
    scene.render.film_transparent = True
    scene.render.resolution_x, scene.render.resolution_y = 400, 300
    scene.render.image_settings.file_format = "PNG"
    os.makedirs(folder, exist_ok=True)
    scene.render.filepath = os.path.join(folder, f"{name}.png")
    bpy.ops.render.render(write_still=True)
    bpy.data.objects.remove(cam)
    bpy.data.objects.remove(sun)


def export(name, parts, preview_dir=None):
    if preview_dir:
        preview(name, preview_dir)
    bpy.ops.object.select_all(action="DESELECT")
    for ob in parts:
        ob.select_set(True)
    os.makedirs(OUT, exist_ok=True)
    path = os.path.join(OUT, f"{name}.glb")
    bpy.ops.export_scene.gltf(filepath=path, export_format="GLB", use_selection=True, export_apply=True,
                              export_yup=True, export_materials="EXPORT", export_cameras=False, export_lights=False)
    tris = sum(len(p.vertices) - 2 for ob in parts for p in ob.data.polygons)
    print(f"{name}: ~{tris} tris, {os.path.getsize(path) // 1024} KB")


if __name__ == "__main__":
    pv = sys.argv[sys.argv.index("--preview") + 1] if "--preview" in sys.argv else None
    for name, build in (("mini", mini), ("ev-hatch", ev_hatch), ("pickup", pickup), ("box-van", box_van),
                        ("camper", camper), ("rally", rally), ("supercar", supercar)):
        export(name, build(), pv)
