"""Snapshot 3,000 accepted, named fish species from ENA taxonomy via GBIF."""
import urllib.request,urllib.parse,json,re,time
from pathlib import Path
BASE='https://api.gbif.org/v1/'
DATASET='6b6b2923-0a10-4708-b170-5b7c611aceef'
def get(path,params=None):
 u=BASE+path+('?' + urllib.parse.urlencode(params) if params else '')
 with urllib.request.urlopen(u,timeout=45) as r:return json.load(r)
meta=get('dataset/'+DATASET)
print('source',meta['title'],'license',meta.get('license'),flush=True)
rows={};offset=0
while len(rows)<3000:
 d=get('species/search',{'highertaxonKey':177709486,'rank':'SPECIES','status':'ACCEPTED','limit':1000,'offset':offset})
 for f in d['results']:
  name=f.get('canonicalName','')
  if f.get('nameType')=='SCIENTIFIC' and f.get('genus') and f.get('family') and re.fullmatch(r'[A-Z][a-z]+ [a-z][a-z-]+',name):rows.setdefault(name,[name,f['family'],f['key']])
 offset+=len(d['results']);print(offset,len(rows),flush=True)
 if d.get('endOfRecords'):break
 time.sleep(.3)
assert len(rows)>=3000
# Sort for reproducibility, while the runtime assigns stable game depth bands.
rows=sorted(rows.values())[:3000]
Path('dist/src/species-data.js').write_text('// ENA taxonomy via GBIF, retrieved 2026-10-30; see DATA-SOURCES.md.\nexport const FISH_DATA='+json.dumps(rows,ensure_ascii=False,separators=(',',':'))+';\n')
Path('docs/fish-source.json').write_text(json.dumps({k:meta.get(k) for k in ['key','title','doi','license','citation']},ensure_ascii=False,indent=2)+'\n')
print('saved',len(rows),rows[:2],flush=True)
