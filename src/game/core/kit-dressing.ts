import { hospitalAsset } from './additional-world-assets';
import { assetSeed, kaykitAsset } from './kaykit-world-assets';
import type { OfficeTheme } from './office-design';
import { TILE, type WorldMap } from './world';

export interface KitDetail {
  asset: string;
  x: number;
  z: number;
  y: number;
  w: number;
  d: number;
  height: number;
}

/** Counter modules vary by position, while a given room keeps the same layout on every visit. */
export function counterKitAsset(id: string, theme: string | undefined, x: number, z: number) {
  if (theme === 'science') return kaykitAsset('restaurant', 'kitchencounter_straight_B');
  const modules = ['kitchencounter_straight_A', 'kitchencounter_sink_backsplash', 'stove_multi', 'kitchencounter_straight_B'];
  return kaykitAsset('restaurant', modules[(assetSeed(id) + x + z * 3) % modules.length]);
}

/** All dressing stands on existing solid furniture; it never adds a new obstacle to a route. */
export function roomKitDetails(map: WorldMap): KitDetail[] {
  if (map.kind !== 'office' || !map.design) return [];
  const out: KitDetail[] = [], theme = map.design.theme;
  const voxelOffice = (name: string) => `/world3d/voxel-office/${name}.glb`;
  const deskProps: Partial<Record<OfficeTheme, string[]>> = {
    technology: [voxelOffice('computer-a'), voxelOffice('computer-b'), kaykitAsset('resources', 'Parts_Pile_Small')],
    finance: [voxelOffice('computer-b'), voxelOffice('plant-a'), kaykitAsset('resources', 'Gold_Bars_Stack_Small')],
    creative: [voxelOffice('computer-a'), voxelOffice('plant-b'), kaykitAsset('resources', 'Textiles_Stack_Small')],
    logistics: [voxelOffice('computer-b'), voxelOffice('plant-a'), kaykitAsset('city', 'box_A')],
    retail: [voxelOffice('computer-a'), voxelOffice('plant-b'), kaykitAsset('resources', 'Textiles_Stack_Large_Colored')],
    science: [voxelOffice('computer-a'), voxelOffice('computer-b'), voxelOffice('plant-a')],
    hospitality: [voxelOffice('computer-b'), voxelOffice('plant-a')],
  };
  const add = (asset: string, x: number, z: number, y: number, w: number, d: number, height: number) => {
    if (out.length >= 48) return;
    for (let yy = Math.floor(z); yy <= Math.floor(z + d - .0001); yy++)
      for (let xx = Math.floor(x); xx <= Math.floor(x + w - .0001); xx++)
        if (!'dktroAbv'.includes(map.tiles[yy]?.[xx] ?? ' ')) return;
    if (map.portals.some(p => x < (p.rect.x + p.rect.w) / TILE && x + w > p.rect.x / TILE && z < (p.rect.y + p.rect.h) / TILE && z + d > p.rect.y / TILE)) return;
    out.push({asset, x, z, y, w, d, height});
  };
  for (let z = 0; z < map.rows; z++) {
    for (let x = 0; x < map.cols;) {
      const tile = map.tiles[z][x];
      let run = 1;
      while (map.tiles[z][x + run] === tile) run++;
      if (tile === 'd' && deskProps[theme]) {
        for (let i = 0; i < run; i += 3) {
          const choices = deskProps[theme]!;
          const asset = choices[(assetSeed(map.id) + x + i + z) % choices.length];
          const voxel = asset.includes('/voxel-office/');
          add(asset, x + i + .14, z + .1, .99, Math.min(.48, run - i - .2), .4, voxel ? (asset.includes('plant-') ? .48 : .38) : theme === 'logistics' ? .3 : .18);
        }
      }
      if (tile === 'k' && ['hospitality', 'technology', 'finance', 'creative', 'logistics', 'retail', 'science'].includes(theme)) {
        for (let i = 0; i < run; i += 2)
          add(voxelOffice('coffee-machine'), x + i + .18, z + .18, 1.34, .62, .62, .48);
      }
      if (tile === 'k' && theme === 'science') {
        for (let i = 0; i < run; i += 2) add(hospitalAsset((x + i + z) % 2 ? 'machine_1' : 'machine_2'), x + i + .18, z + .18, .93, .6, .6, .55);
      }
      if (tile === 'k' && (theme === 'hospitality' || map.id === 'venture-hub') && !(map.id === 'venture-hub' && z >= 15)) {
        for (let i = 0; i < run; i++) {
          if (!counterKitAsset(map.id, theme, x + i, z).includes('straight_')) continue;
          add(kaykitAsset('restaurant', 'cuttingboard'), x + i + .2, z + .2, .93, .55, .5, .035);
          add(kaykitAsset('restaurant', 'food_ingredient_tomato_slices'), x + i + .29, z + .28, .97, .32, .28, .1);
        }
      }
      if (tile === 't' && (theme === 'hospitality' || map.id === 'venture-hub')) {
        add(kaykitAsset('restaurant', 'plate'), x + .2, z + .22, .815, .38, .38, .035);
        if (run >= 2) add(kaykitAsset('restaurant', 'plate'), x + run - .58, z + .22, .815, .38, .38, .035);
      }
      if (tile === 'b' && theme === 'retail') {
        for (let i = 0; i < run; i += 2) add(kaykitAsset('restaurant', (x + i + z) % 2 ? 'crate_carrots' : 'crate_tomatoes'), x + i + .22, z + .2, 1.03, .55, .55, .32);
      }
      if (tile === 'b' && theme === 'logistics') {
        for (let i = 0; i < run; i += 2) add(kaykitAsset('city', 'box_B'), x + i + .23, z + .2, 1.03, .5, .55, .38);
      }
      x += run;
    }
  }
  return out;
}

/** An inscribed rectangle keeps every mountain vertex inside its existing collision ellipse. */
export function mountainKitPlan(t: {x: number; y: number; w: number; h: number; peak: number}) {
  const shape = ['A', 'B', 'C'][assetSeed(`${t.x}:${t.y}`) % 3];
  return {asset: kaykitAsset('medieval', `decoration/nature/mountain_${shape}_grass_trees`), x: t.x + t.w * .16, z: t.y + t.h * .16, w: t.w * .68, d: t.h * .68, height: t.peak};
}

export function roofKitDetail(id: string) {
  return assetSeed(id) % 2
    ? {asset: kaykitAsset('city', 'bush'), w: .8, d: .65, height: .45}
    : {asset: kaykitAsset('city', 'watertower'), w: .9, d: .9, height: 1.25};
}
