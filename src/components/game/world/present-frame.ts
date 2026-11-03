/** A canvas resize discards its drawing buffer. Complete it before drawing and
 * publishing, so the browser never receives a cleared frame between resolutions. */
export function presentSceneFrame<Canvas>(
  renderer: {getPixelRatio():number;setPixelRatio(ratio:number):void;domElement:Canvas},
  presentation: {render():void},
  capture: {frame(canvas:Canvas):void},
  fit:()=>void,
  targetRatio:number|null,
) {
  if(targetRatio!==null&&Number.isFinite(targetRatio)&&targetRatio>0&&Math.abs(targetRatio-renderer.getPixelRatio())>.005){
    renderer.setPixelRatio(targetRatio);
    fit();
  }
  presentation.render();
  capture.frame(renderer.domElement);
}
