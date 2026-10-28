"""Pack the few GUI Pro-SuperCasual (Layer Lab, licensed single-entity) sprites the mobile UI skin uses into one
small atlas at 2x game scale (source is 1080-wide design, game is 270 logical -> 540 = 0.5x source), PNG8.
Output: src/03_guiatlas_mobile.js (only the packed atlas is embedded; raw pack never enters the repo/deploy).
Usage: python3 tools/gui_atlas.py "/path/to/GUI Pro-SuperCasual/ResourcesData/Sprites/Components" """
import base64, glob, io, json, os, sys
from PIL import Image
SRC = sys.argv[1]
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PICK = {  # frame name -> source path (without extension)
  'btn': 'Button/Button01_l_White_Bg', 'btn_lt': 'Button/Button01_l_White_Light1',
  'panel': 'Popup/Popup01_Basic_White_Bg',
  'slot': 'Frame/BorderFrame_Round20_White_Bg', 'card': 'Frame/CardFrame06_White_Bg', 'card_fr': 'Frame/CardFrame06_White_Frame',
  'sw_bg': 'UI_Etc/Switch_White_Bg', 'sw_fill': 'UI_Etc/Switch_White_Fill1', 'sw_h': 'UI_Etc/Switch_White_Handle',
  'ribbon': 'Label/Title_Ribbon02_White1', 'rbtn': 'Button/Button_Round03_WhiteBg',
  # 底部导航：选中凸起块（白，染色）+ 每个页签的图标（彩色道具图标保留原色；线性图标染色）
  'tab': 'Button/Menu_BottomBtn_TabFocus',
  'nav_gear': ('Icon_ItemIcons/128/ItemIcon_Gear_Sword', 48, True), 'nav_trig': ('Icon_ItemIcons/128/ItemIcon_Gem_Diamond_Purple', 48, True),
  'nav_battle': ('Icon_ItemIcons/128/ItemIcon_Battle', 64, True), 'nav_tree': ('Icon_ItemIcons/128/ItemIcon_Book_1_Purple', 48, True),
  'nav_craft': ('Icon_PictoIcons/128/PictoIcon_Blacksmith', 48, False), 'nav_lock': ('Icon_PictoIcons/128/PictoIcon_Lock_1', 24, False),
}
ims = {}
for k, p in PICK.items():
    p, size, color = p if isinstance(p, tuple) else (p, None, False)
    f = (glob.glob(os.path.join(SRC, p + '.png')) + glob.glob(os.path.join(SRC, p + '.Png')))[0]
    im = Image.open(f).convert('RGBA'); a = im.getchannel('A')
    if not color: im = Image.merge('RGBA', (*[im.convert('L')] * 3, a))  # 去色：颜色全靠运行时染
    if size: im.thumbnail((size, size), Image.LANCZOS); ims[k] = im
    else: ims[k] = im.resize((max(2, round(im.width / 2)), max(2, round(im.height / 2))), Image.LANCZOS)
# shelf pack, 1px padding (+ extrude not needed: LINEAR + nineslice inner edges are flat fills)
order = sorted(ims, key=lambda k: -ims[k].height); AW = 256; x = y = sh = 0; pos = {}
for k in order:
    w, h = ims[k].size
    if x + w + 2 > AW: x = 0; y += sh + 2; sh = 0
    pos[k] = (x + 1, y + 1); x += w + 2; sh = max(sh, h)
AH = y + sh + 2; atlas = Image.new('RGBA', (AW, AH), (0, 0, 0, 0))
for k, (px, py) in pos.items(): atlas.paste(ims[k], (px, py))
q = atlas.quantize(colors=255, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE)
b = io.BytesIO(); q.save(b, 'PNG', optimize=True); data = b.getvalue()
frames = {k: {'frame': {'x': px, 'y': py, 'w': ims[k].width, 'h': ims[k].height}} for k, (px, py) in pos.items()}
js = ('/* 手机界面皮肤图集：GUI Pro-SuperCasual（Layer Lab，单主体授权）里挑出来的少量白色件，2 倍游戏尺寸、PNG8。由 tools/gui_atlas.py 生成，别手改。 */\n'
      f'const GUI_ATLAS = {{ png: "data:image/png;base64,{base64.b64encode(data).decode()}", frames: {json.dumps(frames, separators=(",", ":"))}, size: [{AW}, {AH}] }};\n')
open(os.path.join(root, 'src', '03_guiatlas_mobile.js'), 'w', encoding='utf8').write(js)
atlas.save('/tmp/gui_atlas_preview.png'); print('atlas', AW, AH, len(data), 'bytes; js', len(js))
