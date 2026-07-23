/**
 * ICC Lesson Illustrations — SVG visuals for each of the 14 lesson days.
 */

const W = 640;
const H = 300;

function bg(children: React.ReactNode) {
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} className="rounded-xl bg-[#0a0f16] border border-terminal-border/20" style={{ minHeight: 200 }}>
      {children}
    </svg>
  );
}

// Candle helper
function C({ x, o, c, h, l, w = 12 }: { x: number; o: number; c: number; h: number; l: number; w?: number }) {
  const bull = c >= o;
  const color = bull ? '#00ff9d' : '#ff3d57';
  const top = Math.min(o, c);
  const bodyH = Math.max(3, Math.abs(c - o));
  return (
    <g>
      <line x1={x + w / 2} y1={h} x2={x + w / 2} y2={l} stroke={color} strokeWidth={1.5} opacity={0.6} />
      <rect x={x} y={top} width={w} height={bodyH} fill={color} opacity={0.8} rx={1} />
    </g>
  );
}

// Label helper
function Label({ x, y, text, color = '#8899aa', size = 14 }: { x: number; y: number; text: string; color?: string; size?: number }) {
  return <text x={x} y={y} fill={color} fontSize={size} fontFamily="monospace" textAnchor="middle" fontWeight="500">{text}</text>;
}

// Arrow helper
function Arrow({ x1, y1, x2, y2, color = '#00e5ff' }: { x1: number; y1: number; x2: number; y2: number; color?: string }) {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const headLen = 10;
  return (
    <g>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={1.5} />
      <line x1={x2} y1={y2} x2={x2 - headLen * Math.cos(angle - 0.4)} y2={y2 - headLen * Math.sin(angle - 0.4)} stroke={color} strokeWidth={1.5} />
      <line x1={x2} y1={y2} x2={x2 - headLen * Math.cos(angle + 0.4)} y2={y2 - headLen * Math.sin(angle + 0.4)} stroke={color} strokeWidth={1.5} />
    </g>
  );
}

// Zone overlay
function Zone({ x, w, color, label }: { x: number; w: number; color: string; label?: string }) {
  return (
    <g>
      <rect x={x} y={16} width={w} height={H - 32} fill={color} opacity={0.1} rx={6} />
      <line x1={x} y1={16} x2={x} y2={H - 16} stroke={color} strokeWidth={1.5} strokeDasharray="6,3" opacity={0.5} />
      <line x1={x + w} y1={16} x2={x + w} y2={H - 16} stroke={color} strokeWidth={1.5} strokeDasharray="6,3" opacity={0.5} />
      {label && <text x={x + 8} y={36} fill={color} fontSize={13} fontFamily="monospace" fontWeight="600" opacity={0.8}>{label}</text>}
    </g>
  );
}

// ===== DAY 1: What Is Trading =====
function Day1() {
  return bg(
    <>
      <Label x={320} y={28} text="BUY = Price goes UP, you profit" color="#00ff9d" size={16} />
      {/* Buy side */}
      <line x1={40} y1={190} x2={270} y2={190} stroke="#6b7f9540" strokeWidth={1.5} strokeDasharray="6,3" />
      <Label x={35} y={210} text="Entry" color="#8899aa" size={12} />
      <C x={60} o={190} c={170} h={165} l={195} />
      <C x={85} o={170} c={150} h={145} l={175} />
      <C x={110} o={150} c={125} h={120} l={155} />
      <C x={135} o={125} c={100} h={95} l={130} />
      <C x={160} o={100} c={80} h={75} l={105} />
      <Arrow x1={200} y1={185} x2={200} y2={85} color="#00ff9d" />
      <Label x={230} y={100} text="PROFIT" color="#00ff9d" size={16} />
      {/* Sell side */}
      <line x1={340} y1={80} x2={570} y2={80} stroke="#6b7f9540" strokeWidth={1.5} strokeDasharray="6,3" />
      <Label x={340} y={70} text="Entry" color="#8899aa" size={12} />
      <C x={370} o={80} c={100} h={105} l={75} />
      <C x={395} o={100} c={125} h={130} l={95} />
      <C x={420} o={125} c={150} h={155} l={120} />
      <C x={445} o={150} c={175} h={180} l={145} />
      <C x={470} o={175} c={195} h={200} l={170} />
      <Arrow x1={505} y1={85} x2={505} y2={195} color="#ff3d57" />
      <Label x={540} y={190} text="PROFIT" color="#ff3d57" size={16} />
      <Label x={320} y={270} text="SELL = Price goes DOWN, you profit" color="#ff3d57" size={16} />
    </>
  );
}

// ===== DAY 1B: Uptrend / Downtrend / Consolidation =====
function Day1b() {
  return bg(
    <>
      {/* Uptrend */}
      <Label x={110} y={28} text="UPTREND" color="#00ff9d" size={16} />
      <polyline points="30,230 70,160 100,195 140,115 175,150 210,70" fill="none" stroke="#00ff9d" strokeWidth={2.5} />
      <circle cx={70} cy={160} r={4} fill="#00ff9d" />
      <circle cx={140} cy={115} r={4} fill="#00ff9d" />
      <circle cx={210} cy={70} r={4} fill="#00ff9d" />
      <Label x={75} y={155} text="HL" color="#00ff9d" size={13} />
      <Label x={145} y={110} text="HL" color="#00ff9d" size={13} />
      <Label x={215} y={65} text="HH" color="#00ff9d" size={13} />
      {/* Downtrend */}
      <Label x={350} y={28} text="DOWNTREND" color="#ff3d57" size={16} />
      <polyline points="260,70 300,140 330,105 370,185 400,150 430,230" fill="none" stroke="#ff3d57" strokeWidth={2.5} />
      <circle cx={300} cy={140} r={4} fill="#ff3d57" />
      <circle cx={370} cy={185} r={4} fill="#ff3d57" />
      <Label x={305} y={155} text="LH" color="#ff3d57" size={13} />
      <Label x={375} y={200} text="LL" color="#ff3d57" size={13} />
      {/* Consolidation */}
      <Label x={555} y={28} text="RANGE" color="#ffb800" size={16} />
      <line x1={470} y1={95} x2={630} y2={95} stroke="#ffb800" strokeWidth={1.2} strokeDasharray="5,3" opacity={0.5} />
      <line x1={470} y1={195} x2={630} y2={195} stroke="#ffb800" strokeWidth={1.2} strokeDasharray="5,3" opacity={0.5} />
      <polyline points="480,145 500,100 520,165 545,95 565,185 585,105 610,150" fill="none" stroke="#ffb800" strokeWidth={2} />
      <rect x={466} y={88} width={168} height={115} fill="none" stroke="#ff3d57" strokeWidth={1.2} strokeDasharray="6,3" opacity={0.3} />
      <Label x={555} y={255} text="DON'T TRADE" color="#ff3d57" size={16} />
    </>
  );
}

// ===== DAY 2: Indication =====
function Day2() {
  return bg(
    <>
      <line x1={20} y1={130} x2={260} y2={130} stroke="#ffb800" strokeWidth={1.2} strokeDasharray="6,3" opacity={0.5} />
      <Label x={140} y={122} text="SWING HIGH" color="#ffb800" size={14} />
      <polyline points="30,190 60,145 90,175 120,140 150,168 180,145 210,160" fill="none" stroke="#6b7f95" strokeWidth={1.5} />
      <Label x={120} y={220} text="Consolidation — no trade" color="#8899aa" size={13} />
      <Zone x={220} w={130} color="#00e5ff" label="INDICATION" />
      <C x={228} o={155} c={125} h={120} l={160} />
      <C x={252} o={125} c={90} h={85} l={130} />
      <C x={276} o={90} c={60} h={55} l={95} />
      <C x={300} o={60} c={35} h={30} l={65} />
      <Arrow x1={215} y1={130} x2={310} y2={40} color="#00e5ff" />
      <rect x={380} y={45} width={230} height={80} fill="#ff3d5710" rx={10} stroke="#ff3d57" strokeWidth={1} strokeDasharray="5,3" />
      <Label x={495} y={72} text="DON'T trade this!" color="#ff3d57" size={16} />
      <Label x={495} y={95} text="It's just information" color="#8899aa" size={13} />
      <Label x={495} y={175} text="Wait for correction" color="#ffb800" size={15} />
      <Label x={495} y={200} text="Then enter on continuation" color="#00ff9d" size={15} />
    </>
  );
}

// ===== DAY 3: Correction =====
function Day3() {
  return bg(
    <>
      <Label x={320} y={28} text="Indication → Correction → Wait" color="#8899aa" size={15} />
      <Zone x={20} w={140} color="#00e5ff" label="INDICATION" />
      <C x={30} o={210} c={185} h={180} l={215} />
      <C x={55} o={185} c={155} h={150} l={190} />
      <C x={80} o={155} c={120} h={115} l={160} />
      <C x={105} o={120} c={80} h={75} l={125} />
      <Zone x={170} w={150} color="#ffb800" label="CORRECTION" />
      <C x={180} o={80} c={100} h={105} l={75} />
      <C x={205} o={100} c={120} h={125} l={95} />
      <C x={230} o={120} c={138} h={142} l={115} />
      <C x={255} o={138} c={148} h={152} l={133} />
      <C x={280} o={148} c={142} h={153} l={138} />
      <Arrow x1={245} y1={240} x2={210} y2={110} color="#ff3d57" />
      <Label x={280} y={255} text="FOMO traders get trapped here" color="#ff3d57" size={13} />
      <rect x={365} y={70} width={250} height={100} fill="#ffb80008" rx={12} stroke="#ffb800" strokeWidth={1} />
      <Label x={490} y={100} text="Like a Coke bottle:" color="#ffb800" size={15} />
      <Label x={490} y={122} text="Explodes → slows down" color="#8899aa" size={13} />
      <Label x={490} y={142} text="→ dies off → mess everywhere" color="#8899aa" size={13} />
      <Label x={490} y={225} text="Wait for the mess to clear" color="#00ff9d" size={16} />
    </>
  );
}

// ===== DAY 4: Continuation =====
function Day4() {
  return bg(
    <>
      <Zone x={15} w={120} color="#00e5ff" label="IND (1H)" />
      <C x={25} o={210} c={185} h={180} l={215} />
      <C x={50} o={185} c={150} h={145} l={190} />
      <C x={75} o={150} c={110} h={105} l={155} />
      <Zone x={145} w={110} color="#ffb800" label="COR (15M)" />
      <C x={155} o={110} c={130} h={135} l={105} />
      <C x={180} o={130} c={145} h={150} l={125} />
      <C x={205} o={145} c={138} h={150} l={132} />
      <Zone x={265} w={120} color="#00ff9d" label="CON (5M)" />
      <C x={275} o={138} c={115} h={140} l={110} />
      <C x={300} o={115} c={85} h={118} l={80} />
      <C x={325} o={85} c={55} h={88} l={50} />
      <circle cx={280} cy={130} r={7} fill="none" stroke="#00ff9d" strokeWidth={2} />
      <Label x={280} y={165} text="ENTRY" color="#00ff9d" size={14} />
      <line x1={265} y1={152} x2={395} y2={152} stroke="#ff3d57" strokeWidth={1.2} strokeDasharray="5,3" />
      <Label x={410} y={156} text="SL" color="#ff3d57" size={14} />
      <line x1={265} y1={50} x2={395} y2={50} stroke="#00ff9d" strokeWidth={1.2} strokeDasharray="5,3" />
      <Label x={410} y={54} text="TP" color="#00ff9d" size={14} />
      <rect x={430} y={50} width={190} height={100} fill="#00ff9d08" rx={10} stroke="#00ff9d" strokeWidth={0.8} />
      <Label x={525} y={78} text="2nd push = safe" color="#00ff9d" size={15} />
      <Label x={525} y={100} text="1st breakout = trap" color="#ff3d57" size={15} />
      <Label x={525} y={125} text="Use 1H for TP level" color="#00e5ff" size={13} />
      <Label x={320} y={265} text="4H → 1H → 15M → 5M" color="#b18cff" size={17} />
    </>
  );
}

// ===== DAY 5: Market Structure & Reaction =====
function Day5() {
  return bg(
    <>
      <Label x={320} y={28} text="Buyers & Sellers at Every Level" color="#8899aa" size={16} />
      <line x1={30} y1={65} x2={600} y2={65} stroke="#ff3d57" strokeWidth={1.2} strokeDasharray="6,3" opacity={0.5} />
      <Label x={80} y={55} text="SELLERS" color="#ff3d57" size={15} />
      <Arrow x1={120} y1={70} x2={120} y2={100} color="#ff3d57" />
      <line x1={30} y1={220} x2={600} y2={220} stroke="#00ff9d" strokeWidth={1.2} strokeDasharray="6,3" opacity={0.5} />
      <Label x={80} y={245} text="BUYERS" color="#00ff9d" size={15} />
      <Arrow x1={120} y1={215} x2={120} y2={185} color="#00ff9d" />
      <polyline points="160,210 220,75 280,200 340,70 400,195 460,80 520,180" fill="none" stroke="#00e5ff" strokeWidth={2.5} opacity={0.7} />
      <rect x={380} y={120} width={230} height={60} fill="#b18cff08" rx={10} />
      <Label x={495} y={145} text="Above low = BULLISH" color="#00ff9d" size={15} />
      <Label x={495} y={168} text="Below high = BEARISH" color="#ff3d57" size={15} />
    </>
  );
}

// ===== DAY 6: Timeframe Correlation =====
function Day6() {
  return bg(
    <>
      <Label x={320} y={28} text="All Timeframes Must Align" color="#b18cff" size={17} />
      <rect x={20} y={50} width={180} height={90} fill="#ff3d5708" rx={10} stroke="#ff3d57" strokeWidth={0.8} />
      <Label x={110} y={72} text="4H (Strongest)" color="#ff3d57" size={14} />
      <polyline points="40,115 80,85 120,105 160,75" fill="none" stroke="#ff3d57" strokeWidth={2.5} />
      <Label x={110} y={132} text="Sets the trend" color="#8899aa" size={12} />
      <Arrow x1={210} y1={95} x2={230} y2={95} color="#8899aa" />
      <rect x={235} y={50} width={160} height={90} fill="#00e5ff08" rx={10} stroke="#00e5ff" strokeWidth={0.8} />
      <Label x={315} y={72} text="1H (Medium)" color="#00e5ff" size={14} />
      <polyline points="255,110 285,88 310,100 340,80 370,90" fill="none" stroke="#00e5ff" strokeWidth={2} />
      <Label x={315} y={132} text="Marks levels" color="#8899aa" size={12} />
      <Arrow x1={405} y1={95} x2={425} y2={95} color="#8899aa" />
      <rect x={430} y={50} width={190} height={90} fill="#00ff9d08" rx={10} stroke="#00ff9d" strokeWidth={0.8} />
      <Label x={525} y={72} text="15M / 5M (Entry)" color="#00ff9d" size={14} />
      <polyline points="450,105 480,88 510,98 540,82 570,90 600,78" fill="none" stroke="#00ff9d" strokeWidth={1.8} />
      <Label x={525} y={132} text="Precise entries" color="#8899aa" size={12} />
      <rect x={80} y={170} width={480} height={50} fill="#b18cff08" rx={12} stroke="#b18cff" strokeWidth={0.8} />
      <Label x={320} y={195} text="4H bullish → 1H bullish → 15M bullish → ENTER" color="#b18cff" size={15} />
      <Label x={320} y={255} text="If any disagree → DON'T trade" color="#ff3d57" size={15} />
    </>
  );
}

// ===== DAY 7: Chart Markup =====
function Day7() {
  return bg(
    <>
      <Label x={320} y={28} text="Only Mark Swing Highs & Lows" color="#ffb800" size={17} />
      <polyline points="40,195 90,115 130,160 180,75 225,125 270,55 310,100" fill="none" stroke="#00e5ff" strokeWidth={2} />
      <line x1={250} y1={55} x2={330} y2={55} stroke="#ff3d57" strokeWidth={1.5} strokeDasharray="6,3" />
      <circle cx={270} cy={55} r={6} fill="none" stroke="#ff3d57" strokeWidth={1.5} />
      <Label x={310} y={45} text="Swing High" color="#ff3d57" size={14} />
      <line x1={20} y1={195} x2={110} y2={195} stroke="#00ff9d" strokeWidth={1.5} strokeDasharray="6,3" />
      <circle cx={40} cy={195} r={6} fill="none" stroke="#00ff9d" strokeWidth={1.5} />
      <Label x={75} y={215} text="Swing Low" color="#00ff9d" size={14} />
      <rect x={370} y={60} width={130} height={120} fill="#ffb80008" rx={10} stroke="#ffb800" strokeWidth={1.2} strokeDasharray="6,3" />
      <Label x={435} y={110} text="NO TRADE" color="#ffb800" size={18} />
      <Label x={435} y={135} text="ZONE" color="#ffb800" size={18} />
      <Label x={555} y={95} text="1-3" color="#8899aa" size={14} />
      <Label x={555} y={115} text="sessions" color="#8899aa" size={14} />
      <Label x={555} y={135} text="only" color="#8899aa" size={14} />
      <Label x={320} y={265} text="Keep your charts CLEAN — not a mess" color="#00e5ff" size={15} />
    </>
  );
}

function Day8() {
  return bg(
    <>
      <Label x={320} y={28} text="Keep It Simple" color="#00ff9d" size={18} />
      <rect x={30} y={55} width={260} height={160} fill="#ff3d5706" rx={12} stroke="#ff3d57" strokeWidth={0.8} />
      <Label x={160} y={82} text="WRONG" color="#ff3d57" size={16} />
      {[90, 110, 130, 150, 170, 190].map((y, i) => <line key={y} x1={40} y1={y} x2={280} y2={y + (i % 2 === 0 ? 5 : -5)} stroke="#6b7f9530" strokeWidth={1} />)}
      <Label x={160} y={205} text="20 indicators" color="#8899aa" size={12} />
      <rect x={350} y={55} width={260} height={160} fill="#00ff9d06" rx={12} stroke="#00ff9d" strokeWidth={0.8} />
      <Label x={480} y={82} text="RIGHT" color="#00ff9d" size={16} />
      <polyline points="370,175 420,120 470,155 530,90 590,110" fill="none" stroke="#00e5ff" strokeWidth={2.5} />
      <line x1={370} y1={175} x2={600} y2={175} stroke="#00ff9d" strokeWidth={1} strokeDasharray="5,3" opacity={0.4} />
      <line x1={370} y1={90} x2={600} y2={90} stroke="#ff3d57" strokeWidth={1} strokeDasharray="5,3" opacity={0.4} />
      <Label x={480} y={205} text="Just H & L" color="#8899aa" size={12} />
      <Label x={320} y={260} text="2 trades per week is enough" color="#00e5ff" size={16} />
    </>
  );
}

function Day9() {
  return bg(
    <>
      <Label x={320} y={28} text="Trend Reversal = Structure Break" color="#ff3d57" size={16} />
      <polyline points="40,65 100,110 130,85 200,145 230,115 280,180" fill="none" stroke="#ff3d57" strokeWidth={2.5} />
      <Label x={60} y={58} text="LH" color="#ff3d57" size={13} />
      <Label x={130} y={78} text="LH" color="#ff3d57" size={13} />
      <Label x={230} y={108} text="LH" color="#ff3d57" size={13} />
      <line x1={200} y1={115} x2={420} y2={115} stroke="#ffb800" strokeWidth={1.2} strokeDasharray="6,3" opacity={0.5} />
      <Label x={350} y={108} text="Lower High Level" color="#ffb800" size={13} />
      <polyline points="280,180 320,150 350,165 395,100 430,130 480,65" fill="none" stroke="#00ff9d" strokeWidth={2.5} />
      <Arrow x1={395} y1={105} x2={395} y2={75} color="#00ff9d" />
      <Label x={460} y={62} text="BREAKS LH!" color="#00ff9d" size={16} />
      <rect x={420} y={165} width={200} height={65} fill="#ff3d5708" rx={10} />
      <Label x={520} y={192} text="Stop thinking bearish" color="#ff3d57" size={14} />
      <Label x={520} y={215} text="Trend is changing" color="#00ff9d" size={14} />
    </>
  );
}

function Day10() {
  return bg(
    <>
      <Label x={320} y={28} text="No-Trade Zone → Wait for Indication" color="#00e5ff" size={15} />
      <line x1={50} y1={70} x2={400} y2={70} stroke="#ff3d57" strokeWidth={1.5} strokeDasharray="6,3" />
      <Label x={440} y={74} text="SWING HIGH" color="#ff3d57" size={14} />
      <line x1={50} y1={210} x2={400} y2={210} stroke="#00ff9d" strokeWidth={1.5} strokeDasharray="6,3" />
      <Label x={440} y={214} text="SWING LOW" color="#00ff9d" size={14} />
      <rect x={50} y={75} width={350} height={130} fill="#ffb80006" />
      <Label x={225} y={140} text="NO TRADE ZONE" color="#ffb800" size={20} />
      <Arrow x1={420} y1={70} x2={500} y2={38} color="#00e5ff" />
      <Label x={555} y={42} text="INDICATION" color="#00e5ff" size={16} />
      <Label x={555} y={62} text="Now you trade" color="#00ff9d" size={14} />
      <Label x={320} y={265} text="Structure is the same on ALL timeframes" color="#b18cff" size={14} />
    </>
  );
}

function Day11() {
  return bg(
    <>
      <Label x={320} y={32} text="ICC = Kindergarten Price Action" color="#b18cff" size={18} />
      <rect x={40} y={65} width={160} height={90} fill="#00e5ff10" rx={12} stroke="#00e5ff" strokeWidth={0.8} />
      <Label x={120} y={100} text="I" color="#00e5ff" size={28} />
      <Label x={120} y={140} text="Indication" color="#00e5ff" size={14} />
      <rect x={240} y={65} width={160} height={90} fill="#ffb80010" rx={12} stroke="#ffb800" strokeWidth={0.8} />
      <Label x={320} y={100} text="C" color="#ffb800" size={28} />
      <Label x={320} y={140} text="Correction" color="#ffb800" size={14} />
      <rect x={440} y={65} width={160} height={90} fill="#00ff9d10" rx={12} stroke="#00ff9d" strokeWidth={0.8} />
      <Label x={520} y={100} text="C" color="#00ff9d" size={28} />
      <Label x={520} y={140} text="Continuation" color="#00ff9d" size={14} />
      <Arrow x1={205} y1={110} x2={235} y2={110} color="#8899aa" />
      <Arrow x1={405} y1={110} x2={435} y2={110} color="#8899aa" />
      <Label x={320} y={200} text="If it works, keep doing it" color="#00ff9d" size={16} />
      <Label x={320} y={225} text="Don't try to be creative with the market" color="#8899aa" size={14} />
      <Label x={320} y={260} text="Follow what price is showing you" color="#00e5ff" size={14} />
    </>
  );
}

function Day12() {
  return bg(
    <>
      <Label x={320} y={28} text="Market Decision: Check Before You Trade" color="#ffb800" size={15} />
      {[
        { y: 65, text: '4H trend direction?' },
        { y: 95, text: '1H aligns with 4H?' },
        { y: 125, text: '15M showing entry?' },
        { y: 155, text: 'New high/low to chase?' },
        { y: 185, text: 'In session (volume)?' },
      ].map((item, i) => (
        <g key={i}>
          <rect x={40} y={item.y - 12} width={18} height={18} fill="#00ff9d15" rx={3} stroke="#00ff9d" strokeWidth={1.2} />
          <text x={49} y={item.y + 3} fill="#00ff9d" fontSize={14} textAnchor="middle" fontWeight="bold">✓</text>
          <text x={70} y={item.y + 4} fill="#c8d6e5" fontSize={14} fontFamily="monospace">{item.text}</text>
        </g>
      ))}
      <rect x={390} y={70} width={220} height={130} fill="#00ff9d08" rx={12} stroke="#00ff9d" strokeWidth={0.8} />
      <Label x={500} y={110} text="All align?" color="#8899aa" size={15} />
      <Label x={500} y={145} text="ENTER" color="#00ff9d" size={24} />
      <Label x={500} y={180} text="If not → WAIT" color="#ff3d57" size={15} />
      <Label x={320} y={255} text="It's okay to miss a trade" color="#00e5ff" size={16} />
    </>
  );
}

function Day13() {
  return bg(
    <>
      <Label x={320} y={28} text="Think POSITION, Not Trade" color="#00ff9d" size={17} />
      <rect x={30} y={55} width={260} height={100} fill="#ff3d5706" rx={10} stroke="#ff3d57" strokeWidth={0.8} />
      <Label x={160} y={82} text="Trade Mindset" color="#ff3d57" size={15} />
      <Label x={160} y={105} text="20 trades/day" color="#8899aa" size={13} />
      <Label x={160} y={125} text="Stressed, overtrading" color="#8899aa" size={12} />
      <rect x={350} y={55} width={260} height={100} fill="#00ff9d06" rx={10} stroke="#00ff9d" strokeWidth={0.8} />
      <Label x={480} y={82} text="Position Mindset" color="#00ff9d" size={15} />
      <Label x={480} y={105} text="2 trades/week" color="#8899aa" size={13} />
      <Label x={480} y={125} text="Calm, trending, scaling" color="#8899aa" size={12} />
      <Arrow x1={295} y1={105} x2={345} y2={105} color="#00e5ff" />
      <rect x={60} y={180} width={520} height={60} fill="#00e5ff08" rx={12} />
      <Label x={320} y={205} text="Save capital from a job → trade with saved money" color="#00e5ff" size={14} />
      <Label x={320} y={228} text="Don't trade your way out of your job" color="#ffb800" size={14} />
    </>
  );
}

function Day14() {
  return bg(
    <>
      <Label x={320} y={28} text="Structure is MANDATORY" color="#b18cff" size={18} />
      <polyline points="40,210 110,120 160,168 230,75 295,125 360,40" fill="none" stroke="#00ff9d" strokeWidth={3} />
      <Label x={110} y={112} text="HH" color="#00ff9d" size={14} />
      <Label x={160} y={180} text="HL" color="#00e5ff" size={14} />
      <Label x={230} y={67} text="HH" color="#00ff9d" size={14} />
      <Label x={295} y={137} text="HL" color="#00e5ff" size={14} />
      <Label x={360} y={32} text="HH" color="#00ff9d" size={14} />
      <Arrow x1={118} y1={125} x2={152} y2={162} color="#00e5ff" />
      <Arrow x1={168} y1={162} x2={222} y2={82} color="#00ff9d" />
      <Arrow x1={238} y1={82} x2={287} y2={120} color="#00e5ff" />
      <Arrow x1={303} y1={120} x2={352} y2={48} color="#00ff9d" />
      <rect x={400} y={55} width={220} height={95} fill="#b18cff08" rx={12} stroke="#b18cff" strokeWidth={0.8} />
      <Label x={510} y={82} text="Momentum = Wave" color="#b18cff" size={15} />
      <Label x={510} y={105} text="Down fast → hits bottom" color="#8899aa" size={12} />
      <Label x={510} y={125} text="→ pushes up 2x force" color="#00ff9d" size={12} />
      <Label x={320} y={210} text="Higher TF = HIGHLY respected" color="#b18cff" size={17} />
      <Label x={320} y={240} text="HH → HL → HH → HL is the law" color="#00ff9d" size={15} />
      <Label x={320} y={268} text="If it breaks → trend is changing" color="#ff3d57" size={14} />
    </>
  );
}

// Export mapping
export const LESSON_ILLUSTRATIONS: Record<string, () => React.ReactNode> = {
  'day-1': Day1,
  'day-1b': Day1b,
  'day-2': Day2,
  'day-3': Day3,
  'day-4': Day4,
  'day-5': Day5,
  'day-6': Day6,
  'day-7': Day7,
  'day-8': Day8,
  'day-9': Day9,
  'day-10': Day10,
  'day-11': Day11,
  'day-12': Day12,
  'day-13': Day13,
  'day-14': Day14,
};
