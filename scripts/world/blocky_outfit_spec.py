import json
from pathlib import Path
root=Path(__file__).resolve().parents[2]
families=[('casual','Everyday Tee','Easy city layers','mood'),('hoodie','Campus Hoodie','A roomy hood and front pouch','energy'),('business','Tailored Blazer','Lapel jacket, tie and smart trousers','focus'),('workwear','Utility Workwear','Tool pockets and protective panels','energy'),('sport','Training Kit','Team jersey and athletic stripes','energy'),('police','Police Uniform','Role-play uniform with radio and duty vest','social'),('pharmacy','Pharmacy Coat','Clinical coat, name badge and pockets','focus'),('paramedic','Paramedic Uniform','Medical utility uniform and reflective panels','energy'),('chef','Kitchen Apron','Double-breasted jacket and long apron','hygiene'),('student','Study Cardigan','Layered knitwear and a shoulder satchel','focus'),('raincoat','Rain Shell','Long weatherproof shell and backpack','energy'),('explorer','Trail Outfit','Outdoor vest, straps and hiking boots','social')]
palettes=[('navy','Midnight','#23334d','#e9edf4','#223042'),('teal','Lagoon','#217e83','#d5ede8','#183d48'),('emerald','Evergreen','#2d704d','#daf0d3','#233c32'),('coral','Coral','#c66760','#ffe6c2','#403b51'),('amber','Ochre','#c99637','#f4e6bb','#423d35'),('lavender','Wisteria','#8670ac','#eee5ff','#39384d'),('sky','Bluebird','#548dbb','#e6f5ff','#29475e'),('rose','Rosewood','#ad607d','#ffe5ed','#483548'),('sand','Sandstone','#bba587','#fff2d6','#514d45'),('slate','Graphite','#626c7c','#dce4eb','#303946')]
out=[]
for family,name,description,perk in families:
 for index,(palette,label,primary,accent,pants) in enumerate(palettes):
  if family=='police':primary=['#172844','#253b54','#243b39','#363346','#343943','#24283b','#173a53','#39314a','#414035','#222a34'][index]
  if family=='pharmacy':accent=primary;primary=['#ecf2f4','#d9f1ec','#e2f0df','#f5e7e4','#faf1dc','#eee7f5','#e0f0fa','#f7e5ec','#f4eedf','#e9edf0'][index]
  if family=='paramedic':accent='#d1e66b';primary=['#26415d','#256c6c','#226246','#59617b','#8d7543','#565b7c','#297ba0','#755767','#6e7b59','#415765'][index]
  out.append(dict(id=f'top-blocky-{family}-{palette}',family=family,palette=palette,name=f'{name} · {label}',description=description,primary=primary,accent=accent,pants=pants,perk=perk,file=f'{family}-{palette}.glb',thumbnail=f'{family}-{palette}.webp'))
(root/'public/world3d/blocky-outfits/manifest.json').write_text(json.dumps({'version':1,'count':len(out),'families':len(families),'palettes':10,'outfits':out},indent=2))
