import type {Object3D} from 'three';
/** Asset helper geometry is not renderable architecture or a new physics source. Operate on the clone only. */
export function removeCrayonColliders(root:Object3D){
 const remove:Object3D[]=[];
 root.traverse(o=>{if(o.name==='Colliders'||o.name.startsWith('Collider_'))remove.push(o)});
 for(const o of remove)o.removeFromParent();
}
