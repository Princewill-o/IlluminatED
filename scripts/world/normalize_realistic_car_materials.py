"""Correct the original FBX import's zero-alpha diffuse colors in supplied car GLBs.
Quaternius car bodies use solid material colors, including the dark window material;
these models have no texture masks. Keep all geometry and color values unchanged.
Run with ordinary Python after converting the supplied FBX files to GLB.
"""
import json, struct
from pathlib import Path
root=Path(__file__).resolve().parents[2]/'public/world3d/cars-realistic'
for path in root.glob('*.glb'):
    raw=path.read_bytes();chunks=[];offset=12
    while offset<len(raw):
        size,kind=struct.unpack_from('<II',raw,offset);chunks.append((kind,raw[offset+8:offset+8+size]));offset+=size+8
    data=json.loads(chunks[0][1])
    for material in data.get('materials',[]):
        color=material.setdefault('pbrMetallicRoughness',{}).setdefault('baseColorFactor',[1,1,1,1])
        color[3]=1
        material['alphaMode']='OPAQUE';material.pop('alphaCutoff',None)
    encoded=json.dumps(data,separators=(',',':')).encode();encoded+=b' '*((-len(encoded))%4)
    chunks[0]=(chunks[0][0],encoded)
    body=b''.join(struct.pack('<II',len(value),kind)+value for kind,value in chunks)
    path.write_bytes(struct.pack('<III',0x46546c67,2,12+len(body))+body)
    print(path.name)
