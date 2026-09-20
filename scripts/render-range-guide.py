"""Render constructed OHLC teaching charts. No historical data or trade outcomes implied."""
from pathlib import Path
import json,html,re,math
OUT=Path('apps/web/public/playbook')
PIP=.10 # Explicit illustration assumption, never a broker default.
INK='#26384b';MUTED='#526478';UP='#087e61';DOWN='#c83e4d';GOLD='#876315';BG='#f4f7fa'
all_data={}

def render(side,delayed):
 # Continuous opens, natural mixed candles, four fixed reference candles.
 ohlc=[(3351,3353,3349.8,3352.4),(3352.4,3353.1,3350.2,3350.8),(3350.8,3352,3349.4,3351.5),
       (3351.5,3353,3350,3352),(3352,3354,3349,3350.5),(3350.5,3352,3348,3351),(3351,3355,3350.5,3352)]
 # Breakout starts inside the range and closes outside: explicit close-outside test interpretation.
 ohlc.append((3352,3365 if delayed else 3359,3351.6,3364 if delayed else 3358))
 if delayed: ohlc.append((3364,3364.8,3357.8,3358.2))
 entry=3358.2 if delayed else 3358
 # Final bar is deliberately OPEN ONLY; no future outcome or completed entry candle is invented.
 if side=='sell':
  ohlc=[tuple(round(6704-v,2) for v in (o,l,h,c)) for o,h,l,c in ohlc]
  entry=round(6704-entry,2)
 ref=ohlc[3:7];high=max(r[1] for r in ref);low=min(r[2] for r in ref)
 bo,bh,bl,bc=ohlc[7];body=abs(bc-bo)/PIP;mid=(bo+bc)/2
 stop=entry+(-8 if side=='buy' else 8);tp=entry+(16 if side=='buy' else -16);tp3=entry+(24 if side=='buy' else -24)
 # Main chart zooms to observable candles. Full risk prices are shown separately, never squeezed into fake history.
 minp=math.floor(min(min(r) for r in ohlc)-2);maxp=math.ceil(max(max(r) for r in ohlc)+2)
 top=65;bottom=292;left=35;step=46
 y=lambda price: top+(maxp-price)/(maxp-minp)*(bottom-top)
 x=lambda i:left+step*i
 n=len(ohlc);entryx=x(n);chartend=entryx+30;axis=chartend+6;panel=575
 tag=f'{side}'+('-delayed' if delayed else '')
 svg=[f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 395" role="img" aria-labelledby="{tag}-title {tag}-desc">',f'<title id="{tag}-title">TMPro Range Breakout: {side}, {"half-body retracement" if delayed else "standard entry"}</title>',f'<desc id="{tag}-desc">Constructed XAUUSD M15 OHLC chart. Reference range 10:00–11:00 UTC. {body:.0f}-pip breakout body. '+(f'Later price retraces at least {body/2:.0f} pips to the midpoint, then entry at 11:30 UTC.' if delayed else 'Entry at 11:15 UTC after the breakout closes.')+f' Entry {entry:.2f}, stop {stop:.2f}, selected 2R target {tp:.2f}. Illustrative pip size 0.10, not a broker specification. Final bar shows its open only; no future result.</desc>',f'<rect width="800" height="395" rx="12" fill="{BG}"/>',f'<style>text{{font:14px Arial,sans-serif;fill:{INK}}}.muted{{fill:{MUTED}}}.strong{{font-weight:700}}</style>',f'<text x="20" y="25" class="strong">XAUUSD · M15 · {side.capitalize()} / {"wait for retracement" if delayed else "standard entry"}</text>',f'<text x="20" y="47" class="muted">Constructed teaching candles · UTC · 1 example pip = 0.10 price units</text>']
 for j in range(5):
  price=minp+(maxp-minp)*j/4;yy=y(price)
  svg += [f'<path d="M18 {yy:.2f}H{chartend}" stroke="#dde4ed"/>',f'<text x="{axis}" y="{yy+4:.2f}" class="muted">{price:.2f}</text>']
 svg += [f'<rect x="{x(3)-20}" y="{y(high):.2f}" width="{step*4-6}" height="{y(low)-y(high):.2f}" fill="#edcf7d" fill-opacity=".28"/>']
 for price,label in [(high,'Range high'),(low,'Range low')]:
  yy=y(price);svg += [f'<path d="M{x(3)-20} {yy:.2f}H{chartend}" stroke="{GOLD}" stroke-dasharray="5 4"/>',f'<text x="20" y="{yy-6:.2f}" fill="{GOLD}">{label}</text>']
 for i,(o,h,l,c) in enumerate(ohlc):
  color=UP if c>=o else DOWN;xx=x(i)
  svg += [f'<path d="M{xx} {y(h):.2f}V{y(l):.2f}" stroke="{color}" stroke-width="1.6"/>',f'<rect x="{xx-8}" y="{min(y(o),y(c)):.2f}" width="16" height="{max(abs(y(o)-y(c)),1.5):.2f}" fill="{color}"/>']
  # Time labels alternate before reference; all four range bars and later bars labelled.
  if i>=3 or i==1:
   mins=9*60+15+i*15;svg += [f'<text x="{xx}" y="316" text-anchor="middle" font-size="12">{mins//60:02}:{mins%60:02}</text>']
 # Midpoint only spans breakout forward, well separated from range labels.
 if delayed:
  svg += [f'<path d="M{x(7)-16} {y(mid):.2f}H{chartend}" stroke="#5d4fa4" stroke-width="1.7" stroke-dasharray="3 3"/>',f'<circle cx="{x(8)}" cy="{y(mid):.2f}" r="5" fill="none" stroke="#5d4fa4" stroke-width="2"/>']
 svg += [f'<path d="M{entryx-10} {y(entry):.2f}H{entryx+10}" stroke="#1765a5" stroke-width="3"/>',f'<circle cx="{entryx}" cy="{y(entry):.2f}" r="5" fill="#f4f7fa" stroke="#1765a5" stroke-width="2"/>',f'<path d="M{entryx} {y(entry)+10:.2f}V285" stroke="#1765a5" stroke-dasharray="3 4"/>',f'<text x="{entryx}" y="316" text-anchor="middle">{"11:30" if delayed else "11:15"}</text>',f'<text x="{entryx}" y="338" text-anchor="middle">Entry open</text>',f'<text x="{x(4.5)}" y="338" text-anchor="middle" fill="{GOLD}">Four range candles</text>',f'<path d="M565 66V342" stroke="#ccd5e1"/>']
 lines=[('Breakout body',f'{body:.0f} pips'),('Retracement required',f'At least {body/2:.0f} pips' if delayed else 'Not required'),('Body midpoint',f'{mid:.2f}' if delayed else '—'),('Entry / SL',f'{entry:.2f} / {stop:.2f}'),('2R / 3R targets',f'{tp:.2f} / {tp3:.2f}')]
 for j,(label,value) in enumerate(lines):
  yy=82+j*51;svg += [f'<text x="{panel+8}" y="{yy}" class="muted">{html.escape(label)}</text>',f'<text x="{panel+8}" y="{yy+22}" class="strong">{html.escape(value)}</text>']
 svg += [f'<text x="20" y="368" class="muted">Green = up · red = down · hollow marker = entry open only; no outcome shown.</text>',f'<text x="20" y="387" class="muted">Close-outside breakout interpretation. Example pip size is not a broker default.</text>','</svg>']
 result=''.join(svg);(OUT/f'tmpro-range-{tag}.svg').write_text(result,encoding='utf-8')
 all_data[tag]={'pipSize':PIP,'candles':[{'time':f'{(555+15*i)//60:02}:{(555+15*i)%60:02} UTC','open':o,'high':h,'low':l,'close':c} for i,(o,h,l,c) in enumerate(ohlc)],'rangeHigh':high,'rangeLow':low,'breakoutBodyPips':round(body,6),'midpoint':mid,'entry':entry,'stop':stop,'target2R':tp,'target3R':tp3,'entryTime':'11:30 UTC' if delayed else '11:15 UTC'}
 # Self-check geometry's underlying OHLC, continuity, pips and observed half retracement.
 assert all(l<=min(o,c)<=max(o,c)<=h for o,h,l,c in ohlc)
 assert all(abs(ohlc[i][0]-ohlc[i-1][3])<1e-8 for i in range(1,len(ohlc)))
 assert abs(abs(entry-stop)/PIP-80)<1e-6
 assert abs(abs(entry-tp)/PIP-160)<1e-6
 assert abs(abs(entry-tp3)/PIP-240)<1e-6
 if delayed:assert body>=100 and (ohlc[8][2]<=mid if side=='buy' else ohlc[8][1]>=mid)
 else:assert body<100
 return result
svgs={f'{side}{suffix}':render(side,bool(suffix)) for suffix in ['','-delayed'] for side in ['buy','sell']}
(OUT/'tmpro-range-examples.json').write_text(json.dumps({'provenance':'Constructed teaching data. Not historical XAUUSD prices.','examples':all_data},indent=2),encoding='utf-8')
# Portable two-page guide: standard buy and delayed sell; academy toggles show all four.
css = """*{box-sizing:border-box}body{margin:0;background:#f4f7fa;color:#26384b;font:16px/1.55 Arial,sans-serif}main{max-width:980px;margin:auto;padding:30px 24px}header{border-bottom:2px solid #876315;padding-bottom:14px}h1{font-size:34px;line-height:1.15;margin:8px 0}h2{font-size:23px;margin:18px 0 8px}p{margin:8px 0}.tag{color:#876315;font-weight:bold}.steps{display:grid;grid-template-columns:1fr 1fr;gap:18px;list-style:none;padding:0}.steps li{border-left:3px solid #876315;padding-left:14px}.steps strong{display:block}.steps p{margin:5px 0}.chart{overflow-x:auto}svg{width:100%;min-width:720px;height:auto}figure{margin:18px 0}figcaption,small{font-size:13px;color:#526478}.note{border:1px solid #c6d0dc;padding:14px;margin:16px 0}.page{margin-bottom:40px}button,a{display:inline-block;padding:12px 16px;color:#1765a5}button{font:inherit;cursor:pointer}button:focus-visible,a:focus-visible{outline:3px solid #1765a5}small{display:block}@media(max-width:650px){main{padding:20px 16px}.steps{grid-template-columns:1fr}h1{font-size:28px}}@media print{@page{size:A4;margin:12mm}body{background:white;font-size:11px;line-height:1.45}main{padding:0}h1{font-size:27px}h2{font-size:19px}svg{min-width:0;width:100%}.page{break-after:page;margin:0}.page:last-of-type{break-after:auto}.steps{gap:12px;margin:12px 0}.chart{overflow:visible}figure{margin:12px 0}figcaption,small{font-size:9px}.note{padding:10px;margin:12px 0}button,.course-link{display:none}}"""
page1 = """<section class="page"><header><p>TradeMetrics Pro · UTC visual guide</p><h1>TMPro Range Breakout</h1><p class="tag">The Worlds Simpliest Strategy</p><p>Gold / XAUUSD · M15 · constructed teaching charts</p></header><ol class="steps"><li><strong>1. Mark 10:00–11:00 UTC</strong><p>Four candles open at 10:00, 10:15, 10:30 and 10:45. Freeze their highest high and lowest low at 11:00.</p></li><li><strong>2. Wait for a completed breakout</strong><p>Above the high: buy direction. Below the low: sell direction. A wick outside with a close inside is not confirmation.</p></li><li><strong>3. Measure the candle body</strong><p>Below 100 pips: standard next M15 open. At 100 pips or more: use the retracement rule on page 2. Exclude wicks.</p></li><li><strong>4. Keep the distances fixed</strong><p>80-pip stop; choose a 160-pip (2R) or 240-pip (3R) target from the actual entry. No alignment? Let it go.</p></li></ol><h2>Standard buy: body below 100 pips</h2><figure><div class="chart">"""+svgs['buy']+"""</div><figcaption>Four candles in the shaded box form the reference range. The 11:00 candle closes above it with a 60-pip body. The hollow marker shows the 11:15 entry open only. For a sell, reverse the direction.</figcaption></figure><div class="note"><strong>Example arithmetic</strong><p>These drawings use 1 pip = 0.10 price units. An 80-pip stop is an 8.00 price move; 160 pips is 16.00. This is an illustration assumption, not a broker default. Verify your exact gold contract.</p><p>Charts illustrate the close-outside interpretation. The source does not settle whole-body versus close-only confirmation; declare your test interpretation first.</p></div><small>Constructed OHLC, not historical prices or results. Green = up; red = down. Entry markers do not show a completed future candle or trade outcome. Scroll charts sideways on small screens.</small></section>"""
page2 = """<section class="page"><header><p>TMPro Range Breakout · UTC</p><h1>Long body? Wait for half back.</h1><p class="tag">100+ pips includes exactly 100 pips.</p></header><ol class="steps"><li><strong>1. No immediate entry</strong><p>Measure the completed breakout open-to-close body in verified pips. Keep that candle as the fixed reference.</p></li><li><strong>2. Wait for at least 50%</strong><p>Midpoint = (open + close) / 2. Buy: retrace down to it or lower. Sell: retrace up to it or higher.</p></li><li><strong>3. Use the next M15 open</strong><p>A later candle must reach the midpoint. Let that candle finish; then consider the following open, only if all rules still align.</p></li><li><strong>4. Let unsuitable trades go</strong><p>No retracement means no entry. Candle count alone is not a signal. Do not chase or widen the stop.</p></li></ol><h2>Delayed sell: 120-pip body, at least 60 pips back</h2><figure><div class="chart">"""+svgs['sell-delayed']+"""</div><figcaption>The 11:00 candle completes at 11:15. The later 11:15–11:30 candle reaches the 50% midpoint. The hollow marker shows the 11:30 entry open. For a buy, mirror the direction. The breakout candle’s own wick does not qualify.</figcaption></figure><div class="note"><strong>Fixed distances, not frozen price levels</strong><p>Keep the 80-pip stop and chosen 160/240-pip target from the actual entry. The course reads retracement as a midpoint touch, then next-open entry after that candle completes; it does not add a midpoint-close requirement.</p><p>Verify the pip convention and declare a demo-test protocol for news, risk limits, cutoffs and re-entry. Break-even and partial exits are not specified in the supplied transcript. No martingale or grid.</p></div><small>Source: supplied MZITOH FX transcript, MFG 2.2, truncated at 30 minutes. The 100+ pip / half-body rule was supplied by the user. Original constructed charts and UTC teaching adaptation by TradeMetrics Pro. Educational testing; no verified profitability claim.</small></section>"""
(OUT/'tmpro-range-breakout.html').write_text('<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>TMPro Range Breakout — UTC visual guide</title><style>'+css+'</style><main>'+page1+page2+'<button onclick="window.print()">Print / save as PDF</button><p class="course-link"><a href="/academy?course=gold-range-utc">Open the academy course</a></p></main></html>',encoding='utf-8')
print('Rendered four realistic OHLC charts and a two-page guide; continuity, midpoint and risk arithmetic verified.')
