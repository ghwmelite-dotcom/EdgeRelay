// ──────────────────────────────────────────────────────────────
// TradeMetrics Academy — Complete Curriculum Data
// 6 levels × 4 lessons = 24 lessons, each with 3-4 sections + 4 quiz questions
// ──────────────────────────────────────────────────────────────

export interface AcademyQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface LessonSection {
  heading: string;
  content: string; // HTML string
  widgetId?: string; // optional interactive widget to render after this section
}

export interface AcademyLesson {
  id: string; // format: "1-1", "1-2", etc.
  levelId: number;
  title: string;
  description: string;
  readTime: string;
  sections: LessonSection[];
  quiz: AcademyQuestion[];
}

export interface AcademyLevel {
  id: number;
  title: string;
  subtitle: string;
  accentColor: string;
  lessons: AcademyLesson[];
}

export const ACADEMY_CURRICULUM: AcademyLevel[] = [
  // ════════════════════════════════════════════════════════════
  // LEVEL 1 — FOUNDATION
  // ════════════════════════════════════════════════════════════
  {
    id: 1,
    title: 'Foundation',
    subtitle: 'Learn the basics of financial markets and how trading works',
    accentColor: 'neon-cyan',
    lessons: [
      // ── Lesson 1-1 ─────────────────────────────────────────
      {
        id: '1-1',
        levelId: 1,
        title: 'What Is Trading?',
        description:
          'Discover how financial markets work, the instruments you can trade, and who participates in the global marketplace.',
        readTime: '7 min',
        sections: [
          {
            heading: 'The Global Marketplace',
            content: `
<p>Trading is the act of buying and selling financial instruments — like currencies, gold, oil, or stock indices — with the goal of making a profit from price changes. Every day, trillions of dollars flow through global markets as traders, banks, hedge funds, and everyday people exchange assets.</p>
<p>Think of a market like a massive auction house that never closes. Prices go up when more people want to buy something than sell it (demand exceeds supply), and prices go down when more people want to sell than buy. Your job as a trader is to anticipate which direction the price will move and position yourself accordingly.</p>
<p>Unlike investing, where you might buy shares and hold them for years, trading typically involves shorter timeframes — from a few minutes to a few weeks. Traders profit from both <strong>rising</strong> and <strong>falling</strong> prices, which is one of the most powerful advantages of modern trading.</p>
<p>You don't need to be on Wall Street or have a finance degree. With a laptop, an internet connection, and the right education (that's what this academy is for), you can participate in the same markets as the biggest banks in the world.</p>`,
          },
          {
            heading: 'What Can You Trade?',
            content: `
<p>There are several major categories of instruments you can trade. Here are the most popular ones you'll encounter:</p>
<ul>
  <li><strong>Forex (Foreign Exchange)</strong> — Trading one currency against another. For example, EUR/USD means you're trading the Euro against the US Dollar. Forex is the largest market in the world, with over $7 trillion traded daily. It's open 24 hours a day, 5 days a week.</li>
  <li><strong>Gold (XAU/USD)</strong> — Gold is a "safe-haven" asset. When the world gets nervous — wars, recessions, inflation — traders flock to gold. It's quoted in US Dollars and is one of the most actively traded commodities.</li>
  <li><strong>Indices</strong> — An index tracks a basket of stocks. The S&P 500 tracks the top 500 US companies, the NASDAQ 100 focuses on tech stocks, and the DAX 40 covers major German companies. Instead of picking individual stocks, you trade the overall market direction.</li>
  <li><strong>Oil (WTI & Brent)</strong> — Crude oil is essential to the global economy. Its price is influenced by OPEC decisions, geopolitical tensions, and economic data. WTI (West Texas Intermediate) and Brent Crude are the two main benchmarks.</li>
</ul>
<p>As a beginner, you'll likely start with one or two instruments — most traders begin with a major Forex pair like EUR/USD or with Gold. The key is to learn one instrument well before spreading your attention across many.</p>`,
          },
          {
            heading: 'How CFDs Work',
            content: `
<p>Most retail traders don't physically buy barrels of oil or gold bars. Instead, they trade <strong>CFDs — Contracts for Difference</strong>. A CFD is a contract between you and your broker that pays the difference between the opening and closing price of a trade.</p>
<p>Here's a simple example: You believe Gold (currently at $2,000) will rise. You open a <em>buy</em> CFD. If Gold rises to $2,050, you pocket the $50 difference (multiplied by your position size). If it falls to $1,950, you lose $50. You never owned any physical gold — you simply profited (or lost) from the price movement.</p>
<p>The big advantage of CFDs is that you can <strong>sell first</strong> (called "going short"). If you think a price will fall, you can open a sell trade and profit as the price drops. This means you can make money in both bull markets (rising) and bear markets (falling).</p>
<p>CFDs also allow you to use <strong>leverage</strong>, which means you can control a large position with a smaller amount of money. We'll cover leverage in detail in Lesson 1-3, but for now just know that it amplifies both your profits <em>and</em> your losses.</p>`,
          },
          {
            heading: 'Who Participates in the Markets?',
            content: `
<p>Understanding who else is in the market helps you understand why prices move the way they do. Here are the major players:</p>
<ul>
  <li><strong>Central Banks</strong> — The Federal Reserve (US), European Central Bank, Bank of Japan, etc. They set interest rates and monetary policy, which have massive effects on currency values. When the Fed raises rates, the US Dollar typically strengthens.</li>
  <li><strong>Commercial Banks & Institutions</strong> — JP Morgan, Goldman Sachs, Deutsche Bank — these giants handle enormous volumes. They trade on behalf of clients and their own accounts. Their orders can move markets significantly.</li>
  <li><strong>Hedge Funds & Asset Managers</strong> — They manage billions in capital and use sophisticated strategies. Their large trades create the momentum that smaller traders can ride.</li>
  <li><strong>Corporations</strong> — Companies like Apple or Toyota need to exchange currencies for international business. A German car maker selling cars in the US needs to convert Dollars back to Euros, creating real demand in the Forex market.</li>
  <li><strong>Retail Traders (That's You!)</strong> — Individual traders like us make up a smaller portion of market volume, but modern technology gives us access to the same price movements as the big players.</li>
</ul>
<p>The key takeaway: you're not trading against your broker — you're participating in a global market with millions of other participants. Prices move because of the collective actions of all these players.</p>`,
          },
        ],
        quiz: [
          {
            id: '1-1-q1',
            question: 'What is the primary advantage of CFD trading compared to owning physical assets?',
            options: [
              'CFDs have no risk involved',
              'You can profit from both rising and falling prices',
              'CFDs guarantee a fixed return',
              'You receive dividends automatically',
            ],
            correctIndex: 1,
            explanation:
              'CFDs allow you to "go long" (buy) when you expect prices to rise, or "go short" (sell) when you expect prices to fall. This means you can potentially profit in any market direction. However, they still carry significant risk.',
          },
          {
            id: '1-1-q2',
            question: 'Which market has the highest daily trading volume in the world?',
            options: [
              'The US stock market',
              'The gold market',
              'The Forex (foreign exchange) market',
              'The cryptocurrency market',
            ],
            correctIndex: 2,
            explanation:
              'The Forex market trades over $7 trillion per day, making it by far the largest financial market in the world. It dwarfs the stock market and all other markets in daily volume.',
          },
          {
            id: '1-1-q3',
            question: 'What typically happens to the US Dollar when the Federal Reserve raises interest rates?',
            options: [
              'The Dollar typically strengthens',
              'The Dollar always crashes',
              'Interest rates have no effect on currencies',
              'The Dollar becomes worthless',
            ],
            correctIndex: 0,
            explanation:
              'Higher interest rates attract foreign investment into Dollar-denominated assets (like US bonds), increasing demand for the Dollar and typically causing it to strengthen against other currencies.',
          },
          {
            id: '1-1-q4',
            question: 'Why is gold considered a "safe-haven" asset?',
            options: [
              'Because its price never goes down',
              'Because it pays interest like a bond',
              'Because governments guarantee its value',
              'Because investors buy it during uncertainty and economic fear',
            ],
            correctIndex: 3,
            explanation:
              'Gold is called a safe-haven because traders and investors tend to buy it during times of geopolitical tension, inflation fears, and economic uncertainty. This increased demand often drives its price higher during crises.',
          },
        ],
      },

      // ── Lesson 1-2 ─────────────────────────────────────────
      {
        id: '1-2',
        levelId: 1,
        title: 'Reading a Price Chart',
        description:
          'Learn to read candlestick charts, understand timeframes, and see the story that price is telling you.',
        readTime: '8 min',
        sections: [
          {
            heading: 'The Three Chart Types',
            content: `
<p>A price chart is a visual representation of how the price of an instrument has moved over time. There are three main types of charts you'll encounter:</p>
<ul>
  <li><strong>Line Chart</strong> — The simplest form. It draws a single line connecting closing prices over time. It gives you a clean overview of the general direction, but hides a lot of detail about what happened during each period.</li>
  <li><strong>Bar Chart (OHLC)</strong> — Each bar shows four data points: the Open, High, Low, and Close for a given time period. A vertical line shows the range (High to Low), while small horizontal ticks on the left and right show the Open and Close respectively.</li>
  <li><strong>Candlestick Chart</strong> — The most popular chart type among traders. Like a bar chart, it shows Open, High, Low, and Close, but it uses a colored "body" that makes it much easier to read at a glance. This is the chart type you'll use 99% of the time.</li>
</ul>
<p>We'll focus on candlestick charts from here on, since they're the industry standard and the most informative for making trading decisions.</p>`,
          },
          {
            heading: 'Anatomy of a Candlestick',
            content: `
<p>Every candlestick tells you a story about what happened during a specific time period. Here's what each part means:</p>
<ul>
  <li><strong>The Body</strong> — The thick, colored part of the candle. It shows the range between the Open and Close prices. A <em>green</em> (or hollow) body means the price closed higher than it opened (bullish). A <em>red</em> (or filled) body means the price closed lower than it opened (bearish).</li>
  <li><strong>The Upper Wick (Shadow)</strong> — The thin line above the body. It shows the highest price reached during that period. A long upper wick means buyers pushed the price up, but sellers pushed it back down before the candle closed.</li>
  <li><strong>The Lower Wick (Shadow)</strong> — The thin line below the body. It shows the lowest price reached. A long lower wick means sellers pushed the price down, but buyers pushed it back up.</li>
  <li><strong>Open</strong> — Where the price started at the beginning of the time period.</li>
  <li><strong>Close</strong> — Where the price ended at the close of the time period.</li>
  <li><strong>High</strong> — The maximum price during that period (top of the upper wick).</li>
  <li><strong>Low</strong> — The minimum price during that period (bottom of the lower wick).</li>
</ul>
<p>For example, imagine a 1-hour green candle on EUR/USD: it opened at 1.0800, dropped to 1.0785 (lower wick), rallied to 1.0830 (upper wick), and closed at 1.0820 (top of the body). The story? Sellers tried early, but buyers took control and closed the hour near the highs.</p>
<p>Learning to "read" candles this way is like learning a language — soon you'll glance at a chart and immediately understand the battle between buyers and sellers.</p>`,
          },
          {
            heading: 'Understanding Timeframes',
            content: `
<p>Each candlestick represents a specific period of time. The <strong>timeframe</strong> you choose determines how much data each candle contains:</p>
<ul>
  <li><strong>M1 (1-minute)</strong> — Each candle = 1 minute of price action. Very noisy, used by scalpers.</li>
  <li><strong>M5, M15 (5 and 15-minute)</strong> — Popular for short-term (intraday) trading. Shows more structure than M1.</li>
  <li><strong>H1 (1-hour)</strong> — A balanced timeframe for day traders. Each candle covers one hour.</li>
  <li><strong>H4 (4-hour)</strong> — Great for swing traders. Filters out a lot of noise while still showing intraday detail.</li>
  <li><strong>D1 (Daily)</strong> — Each candle = one full trading day. The "gold standard" for most analysis. Many professional traders base their decisions on the daily chart.</li>
  <li><strong>W1 (Weekly)</strong> — Each candle = one week. Used for long-term trend analysis.</li>
</ul>
<p>Here's the crucial insight: the <em>same</em> instrument can look bullish on a 5-minute chart and bearish on a daily chart. A beginner mistake is trading a 5-minute signal without checking what the higher timeframes are doing. We'll cover multi-timeframe analysis in Level 6, but for now, start by practicing on the <strong>H1 and D1</strong> timeframes.</p>
<p>As a general rule: the higher the timeframe, the more reliable the signal. A support level on the daily chart is far more significant than one on the 5-minute chart.</p>`,
          },
          {
            heading: 'What the Chart Is Really Telling You',
            content: `
<p>A chart is not just lines and colors — it's a record of human emotion. Every candle represents real decisions by real people (and algorithms) putting real money on the line. Here's how to start reading the story:</p>
<p><strong>Big green candles</strong> = Strong buying pressure. Buyers were in full control. This often happens after positive news or a breakout above a key level.</p>
<p><strong>Big red candles</strong> = Strong selling pressure. Sellers dominated. This can follow negative news or a break below support.</p>
<p><strong>Small candles with long wicks (Doji)</strong> = Indecision. Neither buyers nor sellers won. The market is pausing, and a bigger move might be coming.</p>
<p><strong>A series of green candles getting smaller</strong> = Buyers are losing momentum. The trend might be about to slow down or reverse.</p>
<p>Don't try to memorize dozens of candlestick patterns right now. Instead, focus on understanding the <em>story</em> behind each candle: Who won the battle? Buyers or sellers? How convincingly did they win? That's the foundation of all chart reading.</p>`,
          },
        ],
        quiz: [
          {
            id: '1-2-q1',
            question: 'What does a long lower wick on a candlestick tell you?',
            options: [
              'The price closed at the lowest point of the period',
              'Strong selling pressure with no recovery',
              'Sellers pushed the price down, but buyers pushed it back up before the close',
              'The market was closed during that period',
            ],
            correctIndex: 2,
            explanation:
              'A long lower wick means the price went down significantly during the period (sellers were active), but then buyers stepped in and pushed the price back up before the candle closed. It signals buying interest at lower levels.',
          },
          {
            id: '1-2-q2',
            question: 'Which timeframe is generally considered the most reliable for analysis?',
            options: [
              'M1 (1-minute)',
              'The Daily (D1) chart',
              'M5 (5-minute)',
              'The tick chart',
            ],
            correctIndex: 1,
            explanation:
              'Higher timeframes filter out market noise and provide more reliable signals. The Daily chart is widely considered the gold standard because each candle represents a full day of trading, making support/resistance levels and patterns much more meaningful.',
          },
          {
            id: '1-2-q3',
            question: 'What does a green (bullish) candlestick body indicate?',
            options: [
              'The price closed higher than it opened',
              'The market is guaranteed to keep going up',
              'There was no selling during that period',
              'The price hit a new all-time high',
            ],
            correctIndex: 0,
            explanation:
              'A green (or hollow) body simply means the closing price was higher than the opening price for that candle period. It indicates buyers had more control than sellers during that specific timeframe, but it does not guarantee future direction.',
          },
          {
            id: '1-2-q4',
            question: 'What does a Doji candlestick (small body, long wicks) typically represent?',
            options: [
              'A strong bullish signal',
              'A guaranteed reversal',
              'Market indecision — neither buyers nor sellers dominated',
              'That the market is closed',
            ],
            correctIndex: 2,
            explanation:
              'A Doji candle shows that the open and close prices were nearly equal, meaning neither buyers nor sellers won the battle. It signals indecision and often appears before significant moves, as the market decides its next direction.',
          },
        ],
      },

      // ── Lesson 1-3 ─────────────────────────────────────────
      {
        id: '1-3',
        levelId: 1,
        title: 'The Language of Trading',
        description:
          'Master the essential terminology — pips, lots, spread, leverage, and margin — so you can speak the trader\'s language.',
        readTime: '8 min',
        sections: [
          {
            heading: 'Pips and Points',
            content: `
<p>A <strong>pip</strong> (Percentage in Point) is the standard unit of price movement in Forex trading. For most currency pairs, a pip is the fourth decimal place — 0.0001. So if EUR/USD moves from 1.0800 to 1.0825, that's a 25-pip move.</p>
<p>There are two exceptions to know:</p>
<ul>
  <li><strong>Japanese Yen pairs</strong> (like USD/JPY) — A pip is the second decimal place (0.01). If USD/JPY moves from 150.00 to 150.50, that's a 50-pip move.</li>
  <li><strong>Indices and commodities</strong> — These are usually measured in <strong>points</strong>, not pips. If the S&P 500 moves from 5,000.0 to 5,015.0, that's a 15-point move. Gold (XAU/USD) moves in dollars — a move from $2,000 to $2,010 is a $10 (or 1,000-pip) move.</li>
</ul>
<p>Many brokers now show a fifth decimal place (called a <strong>pipette</strong> or fractional pip). So EUR/USD at 1.08253 — the last digit (3) is a pipette, and the "25" before it represents 25 pips from 1.0800. Don't let the extra digit confuse you; focus on the fourth decimal.</p>
<p>Why do pips matter? Because they are how you measure your profit and loss. If you buy EUR/USD at 1.0800 and sell at 1.0850, you made 50 pips. How much that's worth in dollars depends on your <em>lot size</em>, which we'll cover next.</p>`,
          },
          {
            heading: 'Lots — Your Position Size',
            content: `
<p>A <strong>lot</strong> is the unit of measurement for your trade size. It determines how much money each pip of movement is worth to you. There are three standard lot sizes:</p>
<ul>
  <li><strong>Standard Lot (1.0)</strong> = 100,000 units of the base currency. On EUR/USD, 1 pip = approximately <strong>$10</strong>. A 50-pip move = $500 profit or loss.</li>
  <li><strong>Mini Lot (0.1)</strong> = 10,000 units. On EUR/USD, 1 pip ≈ <strong>$1</strong>. A 50-pip move = $50.</li>
  <li><strong>Micro Lot (0.01)</strong> = 1,000 units. On EUR/USD, 1 pip ≈ <strong>$0.10</strong>. A 50-pip move = $5.</li>
</ul>
<p>As a beginner, you should almost always trade <strong>micro lots (0.01)</strong>. This lets you participate in real markets while risking very small amounts. There's no prize for trading big — the goal is to learn, survive, and grow gradually.</p>
<p>Here's a practical example: You have a $1,000 account. You buy 0.05 lots of EUR/USD (5 micro lots). Each pip is worth about $0.50. If your stop loss is 20 pips away, your maximum risk on this trade is $10, or 1% of your account. That's smart risk management, which we'll dive deep into in Level 2.</p>`,
          },
          {
            heading: 'Spread and Commission',
            content: `
<p>The <strong>spread</strong> is the difference between the buying price (Ask) and the selling price (Bid) of an instrument. It's one of the main ways your broker makes money, and it's a cost you pay on every trade.</p>
<p>For example, if EUR/USD shows a Bid of 1.0800 and an Ask of 1.0802, the spread is <strong>2 pips</strong>. When you open a buy trade, you enter at 1.0802 (the Ask), but the market value is at 1.0800 (the Bid). You start 2 pips in the negative and need the price to move at least 2 pips in your favor just to break even.</p>
<p>Spreads vary by instrument and market conditions:</p>
<ul>
  <li><strong>EUR/USD</strong> — Typically 0.5 to 2 pips (one of the tightest spreads)</li>
  <li><strong>GBP/JPY</strong> — Often 2 to 4 pips (more volatile crosses have wider spreads)</li>
  <li><strong>Gold (XAU/USD)</strong> — Usually 15 to 35 cents ($0.15 to $0.35)</li>
  <li><strong>During major news events</strong> — Spreads can widen dramatically, sometimes 5-10x normal</li>
</ul>
<p>Some brokers also charge a <strong>commission</strong> per lot traded (for example, $3.50 per side per standard lot) in exchange for offering tighter spreads. This is called an ECN or Raw Spread account. Whether spread-based or commission-based pricing is cheaper depends on your trading volume and style.</p>`,
          },
          {
            heading: 'Leverage and Margin',
            content: `
<p><strong>Leverage</strong> allows you to control a large position with a relatively small amount of capital. If your broker offers 1:100 leverage, you can control $100,000 worth of currency (1 standard lot) with just $1,000 of your own money.</p>
<p>The money you "put down" to open a leveraged position is called <strong>margin</strong>. Think of it as a security deposit. With 1:100 leverage, the margin required to open 1 standard lot of EUR/USD is $1,000 (1% of $100,000). For a mini lot (0.1), you'd need $100. For a micro lot (0.01), just $10.</p>
<p>Leverage is often called a double-edged sword, and for good reason:</p>
<ul>
  <li><strong>The upside:</strong> A $1,000 account can open meaningful trades. Without leverage, you'd need $100,000 to trade 1 standard lot.</li>
  <li><strong>The downside:</strong> Losses are also amplified. With 1:100 leverage and a 1-lot position, a 100-pip move against you = $1,000 loss, which could wipe out your entire account.</li>
</ul>
<p>This is why risk management (Level 2) is the most important skill in trading. <strong>Just because you can use high leverage doesn't mean you should.</strong> Professional traders often use effective leverage of just 2:1 to 10:1 — meaning they control positions only 2 to 10 times their account size, even when their broker allows much more.</p>
<p>A common broker term you'll see is <strong>margin call</strong>. This happens when your losses eat into your margin to the point where you no longer have enough to maintain your open positions. The broker will either alert you to deposit more funds or automatically close your positions. The goal: never get anywhere near a margin call.</p>`,
          },
        ],
        quiz: [
          {
            id: '1-3-q1',
            question: 'If EUR/USD moves from 1.0800 to 1.0835, how many pips did it move?',
            options: ['3.5 pips', '35 pips', '350 pips', '0.35 pips'],
            correctIndex: 1,
            explanation:
              'A pip in EUR/USD is the fourth decimal place (0.0001). The move from 1.0800 to 1.0835 = 0.0035 = 35 pips. Count the difference in the fourth decimal: 35 - 00 = 35 pips.',
          },
          {
            id: '1-3-q2',
            question: 'How much is 1 pip worth when trading 1 standard lot (1.0) of EUR/USD?',
            options: ['$0.10', '$1', '$5', 'Approximately $10'],
            correctIndex: 3,
            explanation:
              'A standard lot is 100,000 units. On EUR/USD, 1 pip (0.0001) × 100,000 = $10. This means a 10-pip move in your favor equals $100 profit, but a 10-pip move against you equals $100 loss.',
          },
          {
            id: '1-3-q3',
            question: 'What is the spread in trading?',
            options: [
              'The difference between the buy (Ask) and sell (Bid) price',
              'The daily trading range of an instrument',
              'The commission your broker charges annually',
              'The gap between two consecutive candlesticks',
            ],
            correctIndex: 0,
            explanation:
              'The spread is the difference between the Ask price (what you pay to buy) and the Bid price (what you receive when selling). It represents an immediate cost on every trade and is one of the ways brokers earn revenue.',
          },
          {
            id: '1-3-q4',
            question: 'With 1:100 leverage, how much margin do you need to open 0.1 lots (a mini lot) of EUR/USD?',
            options: ['$1,000', '$10', '$100', '$100 (1% of $10,000)'],
            correctIndex: 2,
            explanation:
              'A mini lot (0.1) = 10,000 units. With 1:100 leverage, you need 1% as margin: 10,000 ÷ 100 = $100. Leverage lets you control larger positions, but remember — the risk on the full $10,000 position is real.',
          },
        ],
      },

      // ── Lesson 1-4 ─────────────────────────────────────────
      {
        id: '1-4',
        levelId: 1,
        title: 'Placing Your First Trade',
        description:
          'Walk through the mechanics of opening a trade — order types, stop losses, take profits, and using MT5.',
        readTime: '8 min',
        sections: [
          {
            heading: 'Buy vs. Sell — Going Long and Short',
            content: `
<p>Every trade starts with a decision: do you think the price will go <strong>up</strong> or <strong>down</strong>?</p>
<ul>
  <li><strong>Buy (Go Long)</strong> — You believe the price will rise. You open a buy position at the current price and close it later at a higher price. Your profit is the difference. Example: You buy EUR/USD at 1.0800 and close at 1.0850 = +50 pips profit.</li>
  <li><strong>Sell (Go Short)</strong> — You believe the price will fall. You open a sell position at the current price and close it later at a lower price. Example: You sell Gold at $2,000 and close at $1,980 = +$20 profit per unit.</li>
</ul>
<p>The ability to sell (short) is one of the most powerful features of CFD trading. Stock investors can only make money when prices rise, but as a CFD trader, you can profit whether the market goes up or down — as long as you correctly predict the direction.</p>
<p>A common beginner confusion: "How can I sell something I don't own?" With CFDs, you're not actually selling a physical asset. You're entering a contract with your broker based on the price difference. When you "sell" EUR/USD, you're essentially betting that the Euro will weaken against the Dollar.</p>`,
          },
          {
            heading: 'Order Types Explained',
            content: `
<p>An order is an instruction to your broker to execute a trade. There are several types, and understanding them is essential:</p>
<ul>
  <li><strong>Market Order</strong> — Executes immediately at the current market price. Use this when you want to get into a trade right now. The downside: during fast markets, you might get a slightly different price than you see on screen (called <em>slippage</em>).</li>
  <li><strong>Limit Order (Buy Limit / Sell Limit)</strong> — Executes only when the price reaches a specific level that's <em>better</em> than the current price. A Buy Limit is placed below the current price ("I want to buy, but only at a cheaper price"). A Sell Limit is placed above ("I want to sell, but only at a higher price").</li>
  <li><strong>Stop Order (Buy Stop / Sell Stop)</strong> — Executes when the price reaches a level <em>beyond</em> the current price. A Buy Stop is placed above the current price ("buy when price breaks above this level"). A Sell Stop is placed below ("sell when price breaks below"). Often used for breakout strategies.</li>
</ul>
<p>For your first trades, you'll mostly use <strong>Market Orders</strong> — simple, immediate execution. As you gain experience, you'll appreciate the precision and patience that Limit Orders provide, allowing you to enter at better prices while you're away from the screen.</p>`,
          },
          {
            heading: 'Stop Loss and Take Profit',
            content: `
<p>These two order types are attached to your trade and are absolutely essential for managing risk:</p>
<p><strong>Stop Loss (SL)</strong> — An automatic exit point that limits your loss. If you buy EUR/USD at 1.0800 and set a stop loss at 1.0780, your position will automatically close if the price drops to 1.0780, limiting your loss to 20 pips. <em>Never</em> trade without a stop loss. Period.</p>
<p><strong>Take Profit (TP)</strong> — An automatic exit point that locks in your profit. Using the same example, if you set a take profit at 1.0860, your trade automatically closes when the price reaches that level, securing 60 pips of profit even if you're asleep or away from your desk.</p>
<p>In this example, you're risking 20 pips to potentially gain 60 pips — that's a <strong>1:3 risk-to-reward ratio</strong>. This is a healthy ratio. We'll cover risk-to-reward in detail in Level 2, but the golden rule is: <strong>never risk more than you stand to gain</strong>. Ideally, aim for at least 1:2.</p>
<p>A critical mindset shift for beginners: the stop loss is not your enemy. It's your best friend. It prevents small losses from turning into account-destroying disasters. Every professional trader uses them. The ones who don't eventually blow up their accounts.</p>`,
          },
          {
            heading: 'How to Use MT5 (MetaTrader 5)',
            content: `
<p>MetaTrader 5 (MT5) is one of the most popular trading platforms in the world, and it's what most brokers offer. Here's a quick walkthrough of placing your first trade:</p>
<ul>
  <li><strong>Step 1: Open your chart</strong> — In the Market Watch panel (left side), double-click on the instrument you want to trade (e.g., EURUSD). A chart will open. Right-click the chart and select your preferred timeframe (start with H1 or D1).</li>
  <li><strong>Step 2: Analyze</strong> — Before placing any trade, know <em>why</em> you're trading. What does the chart tell you? Is there a clear direction? Don't trade just because you're staring at the screen. No signal = no trade.</li>
  <li><strong>Step 3: Open the order window</strong> — Press F9 or click "New Order" in the toolbar. Select your instrument, choose "Market Execution," set your lot size (start with 0.01), and enter your Stop Loss and Take Profit levels.</li>
  <li><strong>Step 4: Execute</strong> — Click "Buy" or "Sell." Your trade is now live. You'll see it appear in the "Trade" tab at the bottom of the screen.</li>
  <li><strong>Step 5: Monitor</strong> — Watch your trade in the Trade tab. You can modify your SL/TP by right-clicking the trade. To close it manually, double-click the trade and click "Close."</li>
</ul>
<p><strong>Pro tip for beginners:</strong> Start with a <strong>demo account</strong> before risking real money. Every broker offers free demo accounts with virtual funds. Practice placing trades, setting stop losses, and getting comfortable with the platform for at least 2-4 weeks before going live. There's no rush — the market will be there tomorrow.</p>`,
          },
        ],
        quiz: [
          {
            id: '1-4-q1',
            question: 'What type of order should you use if you want to buy only when the price drops to a specific lower level?',
            options: [
              'Market Order',
              'Buy Stop',
              'Buy Limit',
              'Sell Limit',
            ],
            correctIndex: 2,
            explanation:
              'A Buy Limit order is placed below the current market price. It says: "I want to buy, but only if the price comes down to this better (lower) level first." It executes automatically when the price reaches your specified level.',
          },
          {
            id: '1-4-q2',
            question: 'What is the primary purpose of a Stop Loss?',
            options: [
              'To automatically limit your maximum loss on a trade',
              'To guarantee profit on every trade',
              'To increase your leverage',
              'To widen the spread in your favor',
            ],
            correctIndex: 0,
            explanation:
              'A Stop Loss automatically closes your trade at a predetermined level to limit your loss. It does not guarantee profit — it protects you from catastrophic losses by ensuring a small loss doesn\'t become a devastating one.',
          },
          {
            id: '1-4-q3',
            question: 'You sell (short) EUR/USD at 1.0900 and set a Take Profit at 1.0840. How many pips of profit are you targeting?',
            options: [
              '40 pips',
              '900 pips',
              '84 pips',
              '60 pips',
            ],
            correctIndex: 3,
            explanation:
              'When selling, you profit when the price goes DOWN. From 1.0900 down to 1.0840 = 0.0060 = 60 pips. Since you sold high and your TP is set lower, you profit from the 60-pip drop.',
          },
          {
            id: '1-4-q4',
            question: 'How long should beginners practice on a demo account before trading real money?',
            options: [
              'Demo accounts are a waste of time',
              'At least 2-4 weeks to get comfortable with the platform',
              'Exactly 1 day',
              'Demo trading is only for professionals',
            ],
            correctIndex: 1,
            explanation:
              'Practicing on a demo account for at least 2-4 weeks lets you learn the platform, practice placing orders, and test your strategies with zero financial risk. It builds the muscle memory and confidence needed before risking real capital.',
          },
        ],
      },
    ],
  },

  // ════════════════════════════════════════════════════════════
  // LEVEL 2 — RISK MANAGEMENT
  // ════════════════════════════════════════════════════════════
  {
    id: 2,
    title: 'Risk Management',
    subtitle: 'The single most important skill that separates survivors from the 87% who fail',
    accentColor: 'neon-green',
    lessons: [
      // ── Lesson 2-1 ─────────────────────────────────────────
      {
        id: '2-1',
        levelId: 2,
        title: 'Why Most Traders Lose',
        description:
          'Understand the hard statistics, the common mistakes, and why emotion is the real enemy of profitable trading.',
        readTime: '7 min',
        sections: [
          {
            heading: 'The Brutal Statistics',
            content: `
<p>Let's start with the uncomfortable truth: <strong>approximately 70-87% of retail traders lose money</strong>. This isn't a myth or a scare tactic — brokers are required by regulators to publish these figures, and the numbers are consistent across the industry.</p>
<p>A study by the French financial regulator (AMF) tracked 14,799 retail Forex traders over four years and found that <strong>89% lost money</strong>, with an average loss of about €10,900 per trader. Similar studies from the US, UK, and Australia show comparable results.</p>
<p>But here's the important part: these numbers include people who opened an account, deposited $200, used maximum leverage, and blew up in a week. They include gamblers, thrill-seekers, and people who never spent a single hour learning. <strong>You're already ahead</strong> by taking this course seriously.</p>
<p>The goal of this lesson isn't to discourage you — it's to make you understand that trading is a skill that requires education, discipline, and practice, just like medicine, law, or any other profession. The 13% who are profitable aren't lucky — they've done the work.</p>`,
          },
          {
            heading: 'The Five Mistakes That Kill Accounts',
            content: `
<p>After studying thousands of losing traders, the same mistakes appear over and over:</p>
<ul>
  <li><strong>1. No stop loss</strong> — Trading without a stop loss is like driving without a seatbelt. It only takes one bad crash. A single trade without a stop loss can erase months of profits. "I'll close it manually if it goes against me" is a lie you tell yourself — you won't, because emotions will take over.</li>
  <li><strong>2. Overleveraging</strong> — Using too much leverage relative to your account size. A $500 account trading 1.0 lots means a 50-pip move = $500 = your entire account. Professional traders risk 1-2% per trade. Beginners often risk 20-50% without realizing it.</li>
  <li><strong>3. No trading plan</strong> — Entering trades based on gut feeling, tips from social media, or "it looks like it's going up." Without a written plan with specific entry and exit rules, you're gambling, not trading.</li>
  <li><strong>4. Revenge trading</strong> — After a loss, immediately jumping into another trade to "make it back." This almost always leads to bigger losses because you're trading from emotion, not logic.</li>
  <li><strong>5. Moving stop losses further away</strong> — You set a stop loss at 20 pips, the price gets close, and you panic and move it to 40 pips to "give it more room." You just doubled your risk. If your original analysis was wrong, accept it and move on.</li>
</ul>
<p>Notice something? Only one of these is about market analysis. The other four are about <strong>behavior and discipline</strong>. Most traders don't fail because they can't read charts — they fail because they can't manage themselves.</p>`,
          },
          {
            heading: 'The Emotional Trap',
            content: `
<p>Human brains are spectacularly bad at making financial decisions under pressure. Here's why:</p>
<p><strong>Loss aversion</strong> — Studies show that the pain of losing $100 is psychologically about <em>twice as intense</em> as the pleasure of gaining $100. This means traders tend to hold losing trades too long (hoping they'll recover) and cut winning trades too short (fearing the profit will disappear). This single bias destroys more accounts than any bad strategy.</p>
<p><strong>The dopamine trap</strong> — Winning a trade triggers a dopamine rush, the same chemical that makes gambling addictive. This can lead to overtrading — taking low-quality trades just to get that "hit." If you find yourself placing 15+ trades a day and feeling a rush, you might be trading for entertainment rather than profit.</p>
<p><strong>Confirmation bias</strong> — Once you decide the price should go up, your brain filters out all evidence that it might go down. You ignore bearish signals and focus only on bullish ones. This is why a written trading plan with objective rules is so important — it forces you to check your biases.</p>
<p>The solution isn't to become emotionless — that's impossible. The solution is to build systems and rules that protect you from yourself. That's what the rest of this level is all about.</p>`,
          },
        ],
        quiz: [
          {
            id: '2-1-q1',
            question: 'According to regulatory studies, approximately what percentage of retail traders lose money?',
            options: [
              '30-40%',
              '70-87%',
              '50-55%',
              '95-99%',
            ],
            correctIndex: 1,
            explanation:
              'Regulatory studies across multiple countries consistently show that 70-87% of retail traders lose money. This includes casual traders who never properly learned risk management, which is why education is so important.',
          },
          {
            id: '2-1-q2',
            question: 'What is "revenge trading"?',
            options: [
              'Immediately entering another trade after a loss to try to recover the money',
              'Trading against someone who gave you bad advice',
              'Shorting a stock after a company does something you disagree with',
              'A strategy where you reverse your previous trade direction',
            ],
            correctIndex: 0,
            explanation:
              'Revenge trading is the emotional reaction of jumping into a new trade immediately after a loss, driven by the desire to "make it back." It typically leads to even larger losses because decisions are made from emotion rather than analysis.',
          },
          {
            id: '2-1-q3',
            question: 'Why is "loss aversion" dangerous for traders?',
            options: [
              'It makes you avoid trading entirely',
              'It only affects professional traders',
              'It causes you to hold losing trades too long and cut winning trades too short',
              'It has no effect on trading decisions',
            ],
            correctIndex: 2,
            explanation:
              'Loss aversion — the tendency to feel losses more intensely than gains — causes traders to hold onto losers hoping they\'ll recover, and to close winners prematurely out of fear the profit will vanish. This creates a pattern of small wins and large losses.',
          },
          {
            id: '2-1-q4',
            question: 'Which of these is the most common reason traders fail?',
            options: [
              'Bad internet connection',
              'Using the wrong chart type',
              'Not having expensive software',
              'Poor risk management and emotional decision-making',
            ],
            correctIndex: 3,
            explanation:
              'The vast majority of trading failures come from poor risk management (no stop loss, overleveraging, no plan) and emotional decision-making (revenge trading, fear, greed). Technical skills matter, but discipline matters far more.',
          },
        ],
      },

      // ── Lesson 2-2 ─────────────────────────────────────────
      {
        id: '2-2',
        levelId: 2,
        title: 'Position Sizing — The 1% Rule',
        description:
          'Learn the exact formula to calculate your lot size so you never risk more than 1% of your account on a single trade.',
        readTime: '9 min',
        sections: [
          {
            heading: 'The 1% Rule Explained',
            content: `
<p>The 1% Rule is simple but powerful: <strong>never risk more than 1% of your account balance on a single trade</strong>. If you have a $5,000 account, the maximum you should risk on any one trade is $50.</p>
<p>Why 1%? Because it makes you nearly impossible to blow up. Even if you hit a losing streak of 10 trades in a row (which happens to every trader eventually), you'd only lose about 9.6% of your account. That's recoverable. Compare that to risking 10% per trade — 10 losses in a row would wipe out 65% of your account, which is devastatingly hard to recover from.</p>
<p>Here's the math on recovery:</p>
<ul>
  <li>A <strong>10% drawdown</strong> requires an 11% gain to recover — very doable.</li>
  <li>A <strong>25% drawdown</strong> requires a 33% gain to recover — challenging but possible.</li>
  <li>A <strong>50% drawdown</strong> requires a 100% gain to recover — extremely difficult.</li>
  <li>A <strong>75% drawdown</strong> requires a 300% gain to recover — nearly impossible.</li>
</ul>
<p>The 1% rule keeps you in the "recoverable" zone. Some experienced traders use 2%, but never more. As a beginner, <strong>stick strictly to 1%</strong>.</p>`,
          },
          {
            heading: 'The Lot Size Formula',
            content: `
<p>Knowing you should risk 1% is one thing — calculating the exact lot size is another. Here's the formula:</p>
<p><strong>Lot Size = (Account Balance × Risk %) ÷ (Stop Loss in Pips × Pip Value)</strong></p>
<p>Let's walk through an example step by step:</p>
<ul>
  <li><strong>Account Balance:</strong> $2,000</li>
  <li><strong>Risk per trade:</strong> 1% = $20</li>
  <li><strong>Stop Loss:</strong> 25 pips</li>
  <li><strong>Instrument:</strong> EUR/USD (pip value per standard lot = $10)</li>
</ul>
<p><strong>Step 1:</strong> Dollar risk = $2,000 × 0.01 = <strong>$20</strong></p>
<p><strong>Step 2:</strong> Lot Size = $20 ÷ (25 pips × $10) = $20 ÷ $250 = <strong>0.08 lots</strong></p>
<p>So you'd trade 0.08 lots. If your stop loss hits, you lose exactly $20 — 1% of your account. The key insight: <strong>your lot size changes with every trade</strong> because your stop loss distance changes. A trade with a 50-pip stop will have half the lot size of a trade with a 25-pip stop, but the dollar risk stays the same at $20.</p>`,
          },
          {
            heading: 'Practical Examples Across Instruments',
            content: `
<p>Let's apply the formula to different instruments and scenarios:</p>
<p><strong>Example 1: Gold (XAU/USD)</strong></p>
<ul>
  <li>Account: $5,000 | Risk: 1% = $50</li>
  <li>Stop Loss: 50 pips ($5.00 move, e.g., entry at $2,000, SL at $1,995)</li>
  <li>Pip value for Gold per standard lot: $10 (since 1 pip = $0.10 × 100 oz)</li>
  <li>Lot Size = $50 ÷ (50 × $10) = $50 ÷ $500 = <strong>0.10 lots</strong></li>
</ul>
<p><strong>Example 2: GBP/USD</strong></p>
<ul>
  <li>Account: $1,000 | Risk: 1% = $10</li>
  <li>Stop Loss: 40 pips</li>
  <li>Pip value per standard lot: ~$10</li>
  <li>Lot Size = $10 ÷ (40 × $10) = $10 ÷ $400 = <strong>0.025 → round down to 0.02 lots</strong></li>
</ul>
<p><strong>Always round down</strong>, never up. If the formula gives you 0.087 lots, use 0.08. It's better to risk slightly less than 1% than slightly more. Over hundreds of trades, this discipline compounds in your favor.</p>
<p><strong>Example 3: USD/JPY</strong></p>
<ul>
  <li>Account: $3,000 | Risk: 1% = $30</li>
  <li>Stop Loss: 30 pips</li>
  <li>Pip value per standard lot: ~$6.67 (varies with USD/JPY exchange rate)</li>
  <li>Lot Size = $30 ÷ (30 × $6.67) = $30 ÷ $200 = <strong>0.15 lots</strong></li>
</ul>`,
          },
          {
            heading: 'Common Mistakes in Position Sizing',
            content: `
<p>Even traders who know about the 1% rule make these errors:</p>
<ul>
  <li><strong>Using a fixed lot size</strong> — Trading 0.1 lots on every trade regardless of stop loss distance. A 20-pip stop and a 100-pip stop require very different lot sizes to maintain the same dollar risk. Always recalculate.</li>
  <li><strong>Forgetting the spread</strong> — If the spread is 2 pips and your stop loss is 20 pips, your effective risk is 22 pips. Always account for the spread, especially on wider-spread instruments.</li>
  <li><strong>Not adjusting for account changes</strong> — If you started with $5,000 and are now at $4,000 after some losses, your 1% is now $40, not $50. Always calculate based on your <em>current</em> balance.</li>
  <li><strong>Having multiple trades open</strong> — If you have 3 trades open, each risking 1%, your total risk is 3%. This is fine as long as the trades are on different, uncorrelated instruments. But 3 trades on EUR/USD, GBP/USD, and AUD/USD (all USD pairs that tend to move together) means your real risk might be closer to 3% on a single direction.</li>
</ul>
<p>Make position sizing a habit. Calculate it before every single trade. Use the calculator widget below to practice until it becomes second nature.</p>`,
            widgetId: 'position-size-calculator',
          },
        ],
        quiz: [
          {
            id: '2-2-q1',
            question: 'You have a $10,000 account and follow the 1% rule. What is the maximum dollar amount you should risk on a single trade?',
            options: [
              '$1,000',
              '$500',
              '$100',
              '$10',
            ],
            correctIndex: 2,
            explanation:
              '1% of $10,000 = $100. This means your stop loss should be placed so that if it\'s hit, your loss is no more than $100. Your lot size is then calculated based on the stop loss distance.',
          },
          {
            id: '2-2-q2',
            question: 'If your account balance is $2,000 and your stop loss is 40 pips on EUR/USD, what lot size should you use? (1% risk, pip value $10/standard lot)',
            options: [
              '0.10 lots',
              '0.05 lots',
              '0.02 lots',
              '1.00 lots',
            ],
            correctIndex: 1,
            explanation:
              'Dollar risk = $2,000 × 0.01 = $20. Lot size = $20 ÷ (40 pips × $10) = $20 ÷ $400 = 0.05 lots. At 0.05 lots, each pip is worth $0.50, so a 40-pip stop loss = $20 loss = exactly 1%.',
          },
          {
            id: '2-2-q3',
            question: 'A 50% account drawdown requires what percentage gain to recover?',
            options: [
              '50% gain',
              '75% gain',
              '150% gain',
              '100% gain',
            ],
            correctIndex: 3,
            explanation:
              'If you lose 50% of a $10,000 account, you have $5,000 left. To get back to $10,000, you need to make $5,000 on a $5,000 balance — that\'s a 100% gain. This is why preventing large drawdowns through proper position sizing is critical.',
          },
          {
            id: '2-2-q4',
            question: 'If the formula gives you a lot size of 0.087, what should you do?',
            options: [
              'Round down to 0.08 lots',
              'Round up to 0.09 lots',
              'Round up to 0.10 lots for easier math',
              'Skip the trade entirely',
            ],
            correctIndex: 0,
            explanation:
              'Always round down, never up. Using 0.08 lots means you risk slightly less than 1%, which is always safer. Rounding up would push your risk above 1%, violating your risk management rule.',
          },
        ],
      },

      // ── Lesson 2-3 ─────────────────────────────────────────
      {
        id: '2-3',
        levelId: 2,
        title: 'Stop Loss & Take Profit',
        description:
          'Learn why stop losses are non-negotiable, the different types, and how risk-to-reward ratios determine your profitability.',
        readTime: '9 min',
        sections: [
          {
            heading: 'Why Stop Losses Are Non-Negotiable',
            content: `
<p>A stop loss is an order that automatically closes your trade at a predetermined price if the market moves against you. It is the single most important tool in your risk management arsenal, and <strong>you must use one on every single trade, without exception</strong>.</p>
<p>Consider this scenario: You buy EUR/USD at 1.0800 without a stop loss. The price starts to drop. At 1.0750 (50 pips down), you think "it'll come back." At 1.0700 (100 pips down), you're in denial. At 1.0600 (200 pips down), you're paralyzed with fear. What started as a small loss has become a devastating one, all because you didn't set a simple stop loss.</p>
<p>This isn't hypothetical — this is the #1 reason traders blow up their accounts. A study by a major broker found that traders who used stop losses were <strong>3.4 times more likely</strong> to be profitable than those who didn't.</p>
<p>The stop loss removes emotion from the equation. You set it before the trade, based on your analysis, when you're thinking clearly. Then, if the market proves you wrong, the trade closes automatically — no hesitation, no hoping, no denial. Accept the small loss and move on to the next opportunity.</p>`,
          },
          {
            heading: 'Types of Stop Losses',
            content: `
<p>Not all stop losses are placed the same way. Here are the most common approaches:</p>
<ul>
  <li><strong>Structure-Based Stop</strong> — Placed beyond a key support or resistance level. If you buy at a support level (say 1.0800), you place your stop just below that support (maybe 1.0775). If price breaks through that support, your trade idea is invalidated, and the stop closes you out. This is the most logical approach.</li>
  <li><strong>ATR-Based Stop</strong> — The Average True Range (ATR) measures volatility. If the ATR on the H1 chart is 15 pips, you might set your stop at 1.5× ATR = 22.5 pips. This adjusts your stop to current market volatility — wider in volatile markets, tighter in calm ones.</li>
  <li><strong>Percentage-Based Stop</strong> — A fixed percentage of the entry price. Less common in Forex but sometimes used with indices and stocks.</li>
  <li><strong>Trailing Stop</strong> — A dynamic stop that follows the price as it moves in your favor. If you set a 30-pip trailing stop and the price moves 50 pips in your favor, your stop has moved up to just 20 pips behind the current price, locking in at least 20 pips of profit. Useful for riding trends.</li>
</ul>
<p>For beginners, the <strong>structure-based stop</strong> is the best starting point. It's logical, visual, and forces you to identify key levels on the chart before entering a trade. If you can't identify a clear level for your stop loss, that's usually a sign you shouldn't take the trade.</p>`,
          },
          {
            heading: 'Risk-to-Reward Ratios',
            content: `
<p>The <strong>risk-to-reward ratio (R:R)</strong> compares how much you're risking to how much you could gain. It's one of the most important concepts in trading.</p>
<p>Formula: <strong>R:R = Stop Loss Distance ÷ Take Profit Distance</strong></p>
<p>Examples:</p>
<ul>
  <li>SL = 20 pips, TP = 40 pips → R:R = 1:2 (you risk 1 to gain 2)</li>
  <li>SL = 30 pips, TP = 90 pips → R:R = 1:3 (you risk 1 to gain 3)</li>
  <li>SL = 50 pips, TP = 25 pips → R:R = 2:1 (you risk 2 to gain 1) — <strong>avoid this</strong></li>
</ul>
<p>Why does R:R matter so much? Because it determines how often you need to be right to be profitable:</p>
<ul>
  <li>With a 1:1 R:R, you need to win more than 50% of trades to profit.</li>
  <li>With a 1:2 R:R, you only need to win more than 33% of trades to profit.</li>
  <li>With a 1:3 R:R, you only need to win more than 25% of trades to profit.</li>
</ul>
<p>This is a game-changer. With a 1:3 R:R, you can be <em>wrong 70% of the time</em> and still make money. That takes enormous pressure off needing to be "right" on every trade. Aim for a minimum of <strong>1:2 R:R</strong> on every trade. Ideally 1:3.</p>`,
          },
          {
            heading: 'Putting It All Together',
            content: `
<p>Here's how a properly risk-managed trade setup looks:</p>
<ul>
  <li><strong>Analysis:</strong> EUR/USD is at 1.0820, sitting on a strong support level. The daily trend is up.</li>
  <li><strong>Entry:</strong> Buy at 1.0820 (Market Order)</li>
  <li><strong>Stop Loss:</strong> 1.0790 (30 pips below entry, just under the support level)</li>
  <li><strong>Take Profit:</strong> 1.0910 (90 pips above entry, at the next resistance level)</li>
  <li><strong>Risk-to-Reward:</strong> 1:3 (risking 30 pips to gain 90 pips)</li>
  <li><strong>Account:</strong> $3,000 | 1% risk = $30</li>
  <li><strong>Lot Size:</strong> $30 ÷ (30 pips × $10) = 0.10 lots</li>
</ul>
<p>If this trade loses, you lose $30 (1% of your account). If it wins, you gain $90 (3% of your account). That's the power of combining proper position sizing with a good risk-to-reward ratio.</p>
<p>Use the Risk-Reward Visualizer below to experiment with different scenarios and see how R:R affects your overall profitability.</p>`,
            widgetId: 'risk-reward-visualizer',
          },
        ],
        quiz: [
          {
            id: '2-3-q1',
            question: 'If your stop loss is 25 pips and your take profit is 75 pips, what is your risk-to-reward ratio?',
            options: [
              '1:3',
              '3:1',
              '1:2',
              '1:25',
            ],
            correctIndex: 0,
            explanation:
              'R:R = SL ÷ TP = 25 ÷ 75 = 1:3. You are risking 1 unit to potentially gain 3 units. With this ratio, you only need to win about 25% of your trades to be profitable overall.',
          },
          {
            id: '2-3-q2',
            question: 'With a 1:2 risk-to-reward ratio, what is the minimum win rate needed to be profitable?',
            options: [
              '50%',
              '25%',
              'Greater than 33%',
              '75%',
            ],
            correctIndex: 2,
            explanation:
              'With 1:2 R:R, each win is worth 2× each loss. If you win 34 out of 100 trades (34%), your profit = 34 × 2 = 68 units gained, minus 66 × 1 = 66 units lost = +2 net profit. So you need to win more than 33% of trades.',
          },
          {
            id: '2-3-q3',
            question: 'What is a "structure-based" stop loss?',
            options: [
              'A stop loss based on a fixed number of pips',
              'A stop loss placed beyond a key support or resistance level',
              'A stop loss that moves with the price',
              'A stop loss set by your broker automatically',
            ],
            correctIndex: 1,
            explanation:
              'A structure-based stop is placed just beyond a key chart level (support or resistance). The logic is: if price breaks through that level, your trade idea is invalidated. It\'s the most logical and widely-used method for placing stops.',
          },
          {
            id: '2-3-q4',
            question: 'What does a trailing stop do?',
            options: [
              'It keeps your stop loss at the original entry price',
              'It widens your stop loss during volatile markets',
              'It eliminates the need for a stop loss',
              'It moves your stop loss in the direction of profit as the price moves favorably',
            ],
            correctIndex: 3,
            explanation:
              'A trailing stop follows the price as it moves in your favor, locking in profit along the way. For example, with a 30-pip trailing stop, if price moves 50 pips in your favor, your stop is now at +20 pips — guaranteeing at least 20 pips of profit.',
          },
        ],
      },

      // ── Lesson 2-4 ─────────────────────────────────────────
      {
        id: '2-4',
        levelId: 2,
        title: 'Daily Loss Limits',
        description:
          'Protect yourself from catastrophic days by setting hard daily loss limits and knowing when to walk away.',
        readTime: '7 min',
        sections: [
          {
            heading: 'Why Daily Limits Matter',
            content: `
<p>Even with perfect position sizing and 1% risk per trade, you can still have a terrible day. Three losses in a row (3% down) can trigger frustration. Frustration leads to revenge trading. Revenge trading leads to five more losses. Suddenly you're down 8% in a single day — a hole that takes significant time to climb out of.</p>
<p>A <strong>daily loss limit</strong> is a predetermined maximum amount you allow yourself to lose in one day. When you hit this limit, you stop trading for the rest of the day. No exceptions, no "just one more trade," no negotiation with yourself.</p>
<p>Think of it like a circuit breaker on an electrical panel. When things get overloaded, the breaker trips to prevent a fire. Your daily loss limit is your emotional circuit breaker — it prevents a bad day from becoming a devastating one.</p>
<p>Most professional prop trading firms enforce daily loss limits on their traders. This isn't because they doubt their traders' skills — it's because they know that everyone has bad days, and the key to long-term survival is limiting the damage on those days.</p>`,
          },
          {
            heading: 'The 3% Daily and 6% Weekly Rule',
            content: `
<p>A widely recommended framework is:</p>
<ul>
  <li><strong>Daily Loss Limit: 3% of your account</strong> — On a $5,000 account, that's $150. If you lose $150 in one day, you stop. Period.</li>
  <li><strong>Weekly Loss Limit: 6% of your account</strong> — On a $5,000 account, that's $300. If you hit this at any point during the week, you stop trading until next week.</li>
</ul>
<p>With 1% risk per trade, a 3% daily limit means you can have 3 full-loss trades before being forced to stop. This is more than enough. If you're losing 3 trades in a row, something is wrong — either the market conditions are unfavorable, or your judgment is off that day. Either way, stopping is the correct response.</p>
<p>Some traders use a <strong>two-loss rule</strong> instead: after two consecutive losing trades, they take at least a 1-hour break. After three consecutive losses, they're done for the day. This variation is stricter but even more protective.</p>
<p>The specific numbers matter less than the principle: <strong>set a limit, write it down, and enforce it with zero flexibility</strong>.</p>`,
          },
          {
            heading: 'The 50% Buffer Rule',
            content: `
<p>Here's an advanced concept that many professional traders use: the <strong>50% buffer rule</strong>.</p>
<p>After you've had a winning day and accumulated, say, $200 in profit, set a new mental floor at 50% of your peak profit for the day. If your profit drops from $200 back to $100 (50% of the peak), you stop trading and lock in the $100.</p>
<p>This prevents a frustrating scenario where you turn a great $200 day into a $20 day (or worse, a losing day) by overtrading in the final hours. It's the "quit while you're ahead" principle, formalized into a rule.</p>
<p>Practical implementation:</p>
<ul>
  <li>You start the day and make 2 winning trades: +$150 profit. This is your "peak."</li>
  <li>Your 50% buffer is $75. As long as your daily profit stays above $75, you can keep trading.</li>
  <li>You take a third trade and lose: daily profit drops to $110. Still above $75, so you can continue.</li>
  <li>Fourth trade loses: daily profit drops to $70. That's below your $75 buffer. You stop and keep the $70.</li>
</ul>
<p>Without this rule, many traders would keep going, potentially turning that profitable day into a loss. The 50% buffer protects your winning days, which is just as important as limiting your losing days.</p>`,
          },
          {
            heading: 'What to Do When You Stop',
            content: `
<p>Hitting your daily limit doesn't mean your day is wasted. In fact, the hours after stopping can be the most productive of your trading career:</p>
<ul>
  <li><strong>Review your trades</strong> — Pull up each trade you took that day. Were your entries aligned with your strategy? Did you follow your rules? If you followed your plan and still lost, that's normal — no strategy wins 100%. If you broke your rules, identify why.</li>
  <li><strong>Journal the emotions</strong> — Write down how you felt before and during each trade. Were you calm and analytical, or rushed and emotional? Did you enter out of boredom? Did you see a setup that wasn't really there?</li>
  <li><strong>Study the market</strong> — Use the time to analyze charts, practice on a demo account, watch educational content, or review your longer-term analysis. Learning is productive; revenge-trading is destructive.</li>
  <li><strong>Do something else entirely</strong> — Go for a walk, exercise, spend time with family. Trading is a marathon, not a sprint. Clearing your mind after a losing session makes you sharper the next day.</li>
</ul>
<p>Remember: protecting your capital is the number one job of a trader. <strong>The money you don't lose today is available for opportunities tomorrow.</strong> The market is open 5 days a week, 52 weeks a year. There will always be another trade. There won't always be another account if you blow this one up.</p>`,
          },
        ],
        quiz: [
          {
            id: '2-4-q1',
            question: 'What is a recommended daily loss limit for most traders?',
            options: [
              '10% of account balance',
              '3% of account balance',
              '1 pip',
              'There is no need for a daily loss limit',
            ],
            correctIndex: 1,
            explanation:
              'A 3% daily loss limit is widely recommended. On a $5,000 account, that means stopping for the day after losing $150. This prevents a bad day from becoming a catastrophic one through revenge trading.',
          },
          {
            id: '2-4-q2',
            question: 'What is the 50% buffer rule?',
            options: [
              'Only trade with 50% of your account',
              'Set your stop loss at 50% of the daily range',
              'Use 50% of maximum leverage',
              'Stop trading when your daily profit drops to 50% of the day\'s peak profit',
            ],
            correctIndex: 3,
            explanation:
              'The 50% buffer rule means that once your daily profit reaches a peak, you set a floor at 50% of that peak. If your profit drops back to that level, you stop trading to protect the remaining gains.',
          },
          {
            id: '2-4-q3',
            question: 'What should you do after hitting your daily loss limit?',
            options: [
              'Review your trades, journal your emotions, and study — but do not trade again that day',
              'Switch to a different instrument and keep trading',
              'Double your position size on the next trade to recover',
              'Immediately deposit more money to keep trading',
            ],
            correctIndex: 0,
            explanation:
              'After hitting your daily limit, the best use of your time is reviewing trades, journaling emotions, and studying. These activities build long-term skill. Continuing to trade in a losing mindset almost always makes things worse.',
          },
          {
            id: '2-4-q4',
            question: 'Why do professional prop firms enforce daily loss limits on their traders?',
            options: [
              'To save on broker commissions',
              'Because they don\'t trust their traders',
              'Because everyone has bad days, and limiting daily damage protects long-term capital',
              'To reduce the number of trades per day',
            ],
            correctIndex: 2,
            explanation:
              'Prop firms enforce daily loss limits because they understand that even the best traders have bad days. The key to long-term profitability is not avoiding losses entirely, but preventing any single day from causing disproportionate damage to the account.',
          },
        ],
      },
    ],
  },

  // ════════════════════════════════════════════════════════════
  // LEVEL 3 — MARKET STRUCTURE
  // ════════════════════════════════════════════════════════════
  {
    id: 3,
    title: 'Market Structure',
    subtitle: 'Understand the framework that professional traders use to read any chart',
    accentColor: 'neon-amber',
    lessons: [
      // ── Lesson 3-1 ─────────────────────────────────────────
      {
        id: '3-1',
        levelId: 3,
        title: 'Support & Resistance',
        description:
          'Learn to identify the invisible floors and ceilings that control price movement and how to trade around them.',
        readTime: '8 min',
        sections: [
          {
            heading: 'What Are Support and Resistance?',
            content: `
<p><strong>Support</strong> is a price level where buying pressure is strong enough to prevent the price from falling further. Think of it as a "floor" — every time price drops to this level, buyers step in and push it back up. The more times a level holds, the stronger it becomes.</p>
<p><strong>Resistance</strong> is the opposite — a price level where selling pressure prevents the price from rising further. It acts like a "ceiling." Every time price reaches this level, sellers push it back down.</p>
<p>Here's a real-world analogy: Imagine a rubber ball bouncing on a floor (support) inside a room with a ceiling (resistance). The ball bounces between these two levels. Support and resistance create a similar "range" that price bounces within — until one of the levels finally breaks.</p>
<p>These levels exist because of human psychology and memory. If a trader bought EUR/USD at 1.0800 and watched it drop to 1.0750, they're nervous. When price recovers back to 1.0800, many of those nervous traders sell to "break even." That cluster of sell orders at 1.0800 creates resistance. The same psychology works in reverse for support.</p>`,
          },
          {
            heading: 'How to Identify Key Levels',
            content: `
<p>Not all support and resistance levels are created equal. Here's how to find the ones that actually matter:</p>
<ul>
  <li><strong>Multiple touches</strong> — A level that price has bounced from 3 or more times is more significant than one touched only once. Each touch confirms that traders are paying attention to that price.</li>
  <li><strong>Higher timeframes</strong> — A support level on the Daily chart is far more powerful than one on the 15-minute chart. Always start your analysis from the higher timeframes (Weekly → Daily → H4 → H1).</li>
  <li><strong>Round numbers</strong> — Prices like 1.0800, 1.1000, $2,000 (Gold), and 5,000 (S&P 500) attract orders because humans think in round numbers. These "psychological levels" often act as support or resistance.</li>
  <li><strong>Strong rejections</strong> — If price touched a level and immediately reversed with a large candle, that level is significant. A slow, grinding approach to a level is less meaningful than a sharp bounce.</li>
</ul>
<p>Practical tip: Open your Daily chart, zoom out, and draw horizontal lines at the most obvious levels where price has repeatedly bounced or stalled. You should have 3-5 key levels on your chart, not 20. Less is more — if you draw too many lines, none of them are useful.</p>`,
          },
          {
            heading: 'Role Reversals — When Support Becomes Resistance',
            content: `
<p>One of the most powerful concepts in technical analysis is the <strong>role reversal</strong>: when a broken support level becomes resistance, and vice versa.</p>
<p>Here's how it works: EUR/USD has support at 1.0800 — it has bounced from this level three times over the past month. Then, on the fourth approach, price breaks below 1.0800 decisively (a strong red candle closes well below the level).</p>
<p>Now what? That old support at 1.0800 often becomes <strong>new resistance</strong>. Price may rally back up to 1.0800, test it from below, fail to break above, and then continue falling. This is called a "retest" of the broken level, and it's one of the highest-probability trade setups in all of trading.</p>
<p>Why does this happen? All those traders who bought at 1.0800 support are now underwater. When price comes back to 1.0800, many of them sell to break even, creating selling pressure at that level. The former buyers become sellers, flipping the role of the level.</p>
<p>The same works in reverse: a broken resistance level often becomes new support. If price breaks above 1.1000 and then pulls back to test it, that 1.1000 level often holds as support for the continuation higher.</p>`,
          },
          {
            heading: 'Horizontal vs. Dynamic Support & Resistance',
            content: `
<p>So far we've discussed <strong>horizontal</strong> support and resistance — flat lines drawn at specific prices. But support and resistance can also be <strong>dynamic</strong>, meaning they move with time:</p>
<ul>
  <li><strong>Trendlines</strong> — A diagonal line connecting higher lows (in an uptrend) or lower highs (in a downtrend). As the trend progresses, the line moves, providing a "moving floor" or "moving ceiling."</li>
  <li><strong>Moving Averages</strong> — The 50-day and 200-day moving averages are widely watched by institutional traders. In an uptrend, price often bounces off the 50 MA like dynamic support. We'll cover moving averages in detail in Level 4.</li>
</ul>
<p>The strongest trading setups occur when multiple types of support or resistance converge at the same price. For example, if a horizontal support level, an uptrend line, and the 200-day moving average all meet around 1.0750, that's a <strong>confluence zone</strong> — a level that's extremely likely to hold.</p>
<p>Key rule: <strong>trade at levels, not between them</strong>. If price is floating in the middle of a range with no nearby support or resistance, there's no edge. Wait for price to reach a key level, then look for entry signals there. Patience at levels is what separates disciplined traders from impulsive ones.</p>`,
          },
        ],
        quiz: [
          {
            id: '3-1-q1',
            question: 'What happens when a support level is broken decisively?',
            options: [
              'It disappears and has no further relevance',
              'It always creates a new, stronger support level below',
              'It often becomes a new resistance level (role reversal)',
              'The price immediately returns to that level',
            ],
            correctIndex: 2,
            explanation:
              'When support is broken, it frequently becomes resistance. Traders who bought at that support are now losing and often sell when price returns to that level to "break even," creating selling pressure that turns the old floor into a new ceiling.',
          },
          {
            id: '3-1-q2',
            question: 'Which of these makes a support or resistance level more significant?',
            options: [
              'Multiple touches, higher timeframe, round numbers, and strong rejections',
              'Being on a 1-minute chart with a single touch',
              'Being exactly at a Fibonacci level',
              'Having been created in the last hour',
            ],
            correctIndex: 0,
            explanation:
              'The most significant S/R levels have multiple touches (confirming traders respect the level), appear on higher timeframes (more participants aware of it), often align with round numbers, and show strong price rejections.',
          },
          {
            id: '3-1-q3',
            question: 'What is a "confluence zone" in trading?',
            options: [
              'A zone where the market is closed for trading',
              'An area where multiple types of support or resistance converge at the same price',
              'The gap between the bid and ask price',
              'A period of low trading volume',
            ],
            correctIndex: 1,
            explanation:
              'A confluence zone occurs when multiple technical factors line up at the same price — for example, horizontal support, a trendline, and a moving average all meeting around the same level. These zones have a higher probability of holding.',
          },
          {
            id: '3-1-q4',
            question: 'Why do round numbers like 1.1000 or $2,000 often act as support or resistance?',
            options: [
              'Because brokers set their prices at round numbers',
              'Because charts look cleaner at round numbers',
              'Because algorithms only trade at round numbers',
              'Because humans think in round numbers and place many orders at these levels',
            ],
            correctIndex: 3,
            explanation:
              'Round numbers act as psychological levels because traders — both retail and institutional — tend to place their orders, stop losses, and take profits at clean, round numbers. This concentration of orders creates natural support and resistance.',
          },
        ],
      },

      // ── Lesson 3-2 ─────────────────────────────────────────
      {
        id: '3-2',
        levelId: 3,
        title: 'Trends & Market Direction',
        description:
          'Learn to identify uptrends, downtrends, and ranges — and understand why "the trend is your friend" is more than a cliche.',
        readTime: '8 min',
        sections: [
          {
            heading: 'The Three Market States',
            content: `
<p>At any given time, a market is in one of three states:</p>
<ul>
  <li><strong>Uptrend</strong> — Price is generally moving higher, making higher highs and higher lows. Buyers are in control. Each pullback (dip) finds support at a higher level than the previous one.</li>
  <li><strong>Downtrend</strong> — Price is generally moving lower, making lower highs and lower lows. Sellers are in control. Each rally finds resistance at a lower level than the previous one.</li>
  <li><strong>Range (Consolidation)</strong> — Price is moving sideways between a support floor and a resistance ceiling. Neither buyers nor sellers have a clear advantage. The market is "deciding" its next direction.</li>
</ul>
<p>Understanding which state the market is in right now is critical because <strong>different strategies work in different conditions</strong>. A trend-following strategy will get chopped up in a range, and a range-trading strategy will miss the big moves during a trend.</p>
<p>A common mistake is trying to predict when a trend will end. Trends can last much longer than you expect. The saying "the trend is your friend" exists because trading with the trend is statistically more profitable than trading against it. Until the trend structure clearly breaks, respect the direction.</p>`,
          },
          {
            heading: 'Higher Highs, Higher Lows — Reading Trend Structure',
            content: `
<p>The most reliable way to identify a trend is by looking at the <strong>swing points</strong> — the peaks (highs) and valleys (lows) that price creates as it moves.</p>
<p><strong>Uptrend structure:</strong></p>
<ul>
  <li>Each new peak is higher than the previous peak = <strong>Higher High (HH)</strong></li>
  <li>Each new valley is higher than the previous valley = <strong>Higher Low (HL)</strong></li>
  <li>Pattern: HL → HH → HL → HH → HL → HH</li>
</ul>
<p><strong>Downtrend structure:</strong></p>
<ul>
  <li>Each new peak is lower than the previous peak = <strong>Lower High (LH)</strong></li>
  <li>Each new valley is lower than the previous valley = <strong>Lower Low (LL)</strong></li>
  <li>Pattern: LH → LL → LH → LL → LH → LL</li>
</ul>
<p>A trend is considered "broken" when this pattern stops. For example, an uptrend breaks when price makes a <strong>Lower Low</strong> — it fails to hold above the previous valley. This doesn't guarantee a reversal (it could just be a deeper pullback), but it's the first warning sign.</p>
<p>Practice by pulling up any Daily chart and labeling the swing highs and lows. Can you see the HH/HL pattern? Or the LH/LL pattern? If neither pattern is clear, the market is probably ranging.</p>`,
          },
          {
            heading: 'Drawing Trendlines',
            content: `
<p>A <strong>trendline</strong> is a diagonal line drawn to connect swing points and visualize the trend's trajectory:</p>
<ul>
  <li><strong>Uptrend line</strong> — Draw a line connecting two or more <strong>Higher Lows</strong>. This line represents the "floor" of the trend. As long as price stays above this line, the uptrend is intact. A break below the trendline is a warning that the trend may be weakening.</li>
  <li><strong>Downtrend line</strong> — Draw a line connecting two or more <strong>Lower Highs</strong>. This represents the "ceiling." As long as price stays below this line, the downtrend continues.</li>
</ul>
<p>Important rules for drawing trendlines:</p>
<ul>
  <li>You need at least <strong>2 touch points</strong> to draw a trendline, and <strong>3 touches</strong> to confirm it's valid.</li>
  <li>Don't force it — if you have to adjust the line multiple times to make it "fit," it's probably not a valid trendline.</li>
  <li>Trendlines on higher timeframes are more significant. A daily trendline that has held for 3 months is far more powerful than an H1 trendline from the past 2 days.</li>
  <li>When a trendline breaks, wait for the <strong>retest</strong>. Just like horizontal support/resistance, a broken uptrend line often gets retested from above (becoming resistance) before price continues lower.</li>
</ul>`,
          },
          {
            heading: 'Trading With the Trend',
            content: `
<p>The simplest and most effective approach for beginners is: <strong>identify the trend on a higher timeframe, then look for entries on a lower timeframe in the direction of that trend</strong>.</p>
<p>Practical example:</p>
<ul>
  <li><strong>Step 1:</strong> Open the Daily chart of EUR/USD. You see a clear uptrend — Higher Highs and Higher Lows over the past month.</li>
  <li><strong>Step 2:</strong> Switch to the H1 chart. Look for pullbacks (dips) to support levels, trendlines, or moving averages.</li>
  <li><strong>Step 3:</strong> When price pulls back to a support level on H1 and shows signs of bouncing (a strong green candle, a long lower wick), enter a buy trade.</li>
  <li><strong>Step 4:</strong> Place your stop loss below the H1 support level. Set your take profit at the next resistance level.</li>
</ul>
<p>This approach puts the odds heavily in your favor because you're trading in the same direction as the larger trend. It's like swimming with the current instead of against it. You won't catch every move, but the moves you do catch are more likely to work out.</p>
<p><strong>Avoid counter-trend trading</strong> as a beginner. Trying to "call the top" or "catch the reversal" is one of the most common ways newer traders lose money. Let the trend tell you what to do.</p>`,
          },
        ],
        quiz: [
          {
            id: '3-2-q1',
            question: 'What pattern of swing points defines a downtrend?',
            options: [
              'Higher highs and higher lows',
              'Lower highs and lower lows',
              'Equal highs and equal lows',
              'Random highs and lows',
            ],
            correctIndex: 1,
            explanation:
              'A downtrend is defined by Lower Highs (each rally peaks at a lower level) and Lower Lows (each decline reaches a lower level). This pattern confirms sellers are in control and the overall direction is down.',
          },
          {
            id: '3-2-q2',
            question: 'What is the first warning sign that an uptrend might be ending?',
            options: [
              'A single red candle on the chart',
              'The price makes a very strong new high',
              'Volume increases slightly',
              'Price fails to make a higher low and instead makes a lower low',
            ],
            correctIndex: 3,
            explanation:
              'An uptrend is defined by Higher Highs and Higher Lows. The first structural break occurs when price makes a Lower Low — it drops below the previous valley. This doesn\'t guarantee a reversal, but it breaks the uptrend pattern.',
          },
          {
            id: '3-2-q3',
            question: 'How many touch points do you need to confirm a valid trendline?',
            options: [
              'At least 3 touches',
              'Exactly 1 touch',
              'At least 5 touches',
              'Touch points don\'t matter for trendlines',
            ],
            correctIndex: 0,
            explanation:
              'You need a minimum of 2 touch points to draw a trendline, but 3 touches to confirm it\'s valid. Each additional touch increases confidence that the trendline is meaningful and that traders are respecting it.',
          },
          {
            id: '3-2-q4',
            question: 'Why should beginners avoid counter-trend trading?',
            options: [
              'Because counter-trend trades are illegal',
              'Because trending markets don\'t offer opportunities',
              'Because it requires predicting reversals, which is extremely difficult and risky for new traders',
              'Because brokers don\'t allow counter-trend orders',
            ],
            correctIndex: 2,
            explanation:
              'Counter-trend trading means trying to trade against the current direction — "calling the top" or "catching the bottom." This is extremely difficult because trends can persist much longer than expected. Trading with the trend gives you the natural momentum working in your favor.',
          },
        ],
      },

      // ── Lesson 3-3 ─────────────────────────────────────────
      {
        id: '3-3',
        levelId: 3,
        title: 'Trading Sessions',
        description:
          'Understand the four major trading sessions, when they overlap, and which times offer the best opportunities for your instruments.',
        readTime: '7 min',
        sections: [
          {
            heading: 'The Four Major Sessions',
            content: `
<p>The Forex market is open 24 hours a day, 5 days a week — but that doesn't mean every hour is equally active. Trading activity follows the sun around the globe through four major sessions:</p>
<ul>
  <li><strong>Sydney Session</strong> (10:00 PM – 7:00 AM GMT) — The quietest session. Low volatility and narrow ranges. AUD, NZD, and JPY pairs see the most activity. It's a good time for beginners to practice because price moves are smaller and less chaotic.</li>
  <li><strong>Tokyo Session</strong> (12:00 AM – 9:00 AM GMT) — Moderate activity. JPY pairs dominate. This is when the Bank of Japan often makes announcements. Good for trading USD/JPY, EUR/JPY, and AUD/JPY.</li>
  <li><strong>London Session</strong> (8:00 AM – 5:00 PM GMT) — The biggest and most active session, accounting for about 35% of total Forex volume. EUR, GBP, and CHF pairs are most active. Major moves often start here. This is the session most professional Forex traders focus on.</li>
  <li><strong>New York Session</strong> (1:00 PM – 10:00 PM GMT) — The second-largest session. USD pairs see the most activity. US economic data releases (like NFP, CPI, FOMC) occur during this session and often cause major price moves.</li>
</ul>
<p>Note: These times are approximate and shift by one hour during daylight saving time changes in various countries.</p>`,
          },
          {
            heading: 'The Power of Session Overlaps',
            content: `
<p>The most volatile and opportunity-rich periods happen when two sessions overlap — meaning traders from two major financial centers are active simultaneously:</p>
<ul>
  <li><strong>London–New York Overlap (1:00 PM – 5:00 PM GMT)</strong> — This is the <em>most active period</em> in the entire Forex market. The world's two largest financial centers are both open. EUR/USD spreads are tightest, volume is highest, and the biggest moves of the day often happen here. If you can only trade for 4 hours a day, this is the window to choose.</li>
  <li><strong>Tokyo–London Overlap (8:00 AM – 9:00 AM GMT)</strong> — A brief but active period. EUR/JPY and GBP/JPY tend to see increased volatility as London traders react to overnight Asian price action.</li>
</ul>
<p>During overlaps, you get tighter spreads (lower cost), more volume (more reliable signals), and bigger moves (more profit potential). Outside of overlaps — particularly during the Sydney session or the last hours of New York — markets tend to be quieter with wider spreads.</p>
<p>A practical rule: <strong>avoid placing new trades during the first and last 15 minutes of any session</strong>. These transition periods can be erratic as one group of traders logs off and another logs on.</p>`,
          },
          {
            heading: 'Which Sessions Suit Which Instruments',
            content: `
<p>Different instruments "wake up" during different sessions. Here's a guide to help you pick the right time for your preferred instrument:</p>
<ul>
  <li><strong>EUR/USD, GBP/USD, EUR/GBP</strong> — Best during the London session and the London-New York overlap. These European and major USD pairs see the tightest spreads and most reliable moves during European business hours.</li>
  <li><strong>USD/JPY, EUR/JPY, AUD/JPY</strong> — Best during the Tokyo session and the Tokyo-London overlap. Japanese Yen pairs move when Japanese institutions and traders are active.</li>
  <li><strong>AUD/USD, NZD/USD</strong> — Active during the Sydney and Tokyo sessions when Australian and New Zealand economic data is released.</li>
  <li><strong>Gold (XAU/USD)</strong> — Active across all sessions but sees the biggest moves during the London and New York sessions. Gold tends to react strongly to US economic data and Fed announcements.</li>
  <li><strong>US Indices (S&P 500, NASDAQ)</strong> — Most active during the New York session (US market hours). Pre-market activity starts around 12:00 PM GMT. Major moves happen at the US open (2:30 PM GMT) and often in the final hour before close.</li>
  <li><strong>Oil (WTI)</strong> — Most active during the New York session, particularly around the weekly US crude oil inventory report (Wednesdays at 3:30 PM GMT).</li>
</ul>`,
          },
          {
            heading: 'Building Your Trading Schedule',
            content: `
<p>One of the best things you can do as a beginner is create a consistent trading schedule that aligns with the session(s) that match your instruments and your personal life:</p>
<ul>
  <li><strong>Full-time traders</strong> — Focus on the London session open (8:00 AM GMT) through the London-New York overlap (until 5:00 PM GMT). This gives you the best 9-hour window with maximum opportunity.</li>
  <li><strong>Part-time traders (morning)</strong> — Trade the London session open for 2-3 hours (8:00–11:00 AM GMT). Plenty of movement and setups during this window.</li>
  <li><strong>Part-time traders (afternoon/evening)</strong> — Trade the New York session, especially the London-New York overlap (1:00–5:00 PM GMT). Ideal if you have a day job and trade after work (depending on your timezone).</li>
  <li><strong>Asian timezone traders</strong> — Focus on the Tokyo session for JPY pairs, or trade the London open if you're willing to stay up late. Avoid forcing trades during the quiet Sydney session.</li>
</ul>
<p><strong>Consistency is more important than screen time.</strong> Trading the same 2-3 hours every day, during the same session, helps you recognize patterns specific to that time window. A trader who trades London open every day will develop an intuition for how price behaves at that time — something you can't get by randomly checking charts throughout the day.</p>`,
          },
        ],
        quiz: [
          {
            id: '3-3-q1',
            question: 'Which trading session accounts for the largest share of daily Forex volume?',
            options: [
              'The London session',
              'The Tokyo session',
              'The Sydney session',
              'The New York session',
            ],
            correctIndex: 0,
            explanation:
              'The London session accounts for approximately 35% of total daily Forex volume, making it the largest and most active session. It\'s when EUR, GBP, and CHF pairs see their biggest moves.',
          },
          {
            id: '3-3-q2',
            question: 'What is the most active period in the Forex market?',
            options: [
              'The Sydney session opening hour',
              'The middle of the Tokyo session',
              'The London–New York overlap (1:00 PM – 5:00 PM GMT)',
              'The last hour of the New York session',
            ],
            correctIndex: 2,
            explanation:
              'The London–New York overlap is the most active period because the world\'s two largest financial centers are both open simultaneously. This creates the highest volume, tightest spreads, and biggest price moves.',
          },
          {
            id: '3-3-q3',
            question: 'When are Japanese Yen pairs (like USD/JPY) most active?',
            options: [
              'During the New York session',
              'During the London session',
              'During the Sydney session only',
              'During the Tokyo session and Tokyo-London overlap',
            ],
            correctIndex: 3,
            explanation:
              'JPY pairs are most active when Japanese institutions and traders are active, which is during the Tokyo session (12:00 AM – 9:00 AM GMT) and the brief Tokyo-London overlap when European traders react to Asian price action.',
          },
          {
            id: '3-3-q4',
            question: 'Why is trading the same session every day beneficial?',
            options: [
              'Because different sessions have different trading rules',
              'It helps you develop intuition for how price behaves during that specific time window',
              'Because brokers offer better spreads to consistent traders',
              'It doesn\'t matter — all sessions are identical',
            ],
            correctIndex: 1,
            explanation:
              'Each session has its own "personality" — typical volatility patterns, common move sizes, and behavioral quirks. By consistently trading the same session, you build familiarity with these patterns, helping you recognize setups and avoid traps specific to that time window.',
          },
        ],
      },

      // ── Lesson 3-4 ─────────────────────────────────────────
      {
        id: '3-4',
        levelId: 3,
        title: 'How News Moves Markets',
        description:
          'Understand the economic calendar, learn which news events matter most, and know how to prepare for high-impact releases.',
        readTime: '8 min',
        sections: [
          {
            heading: 'The Economic Calendar',
            content: `
<p>Financial markets are driven by two forces: <strong>technicals</strong> (chart patterns, support/resistance) and <strong>fundamentals</strong> (economic data, central bank decisions, geopolitical events). The economic calendar is your guide to the fundamental side.</p>
<p>An economic calendar lists upcoming data releases and events, categorized by their expected market impact:</p>
<ul>
  <li><strong>High Impact (Red)</strong> — These can move markets 50-200+ pips in minutes. Examples: Non-Farm Payrolls (NFP), interest rate decisions (FOMC, ECB), Consumer Price Index (CPI), GDP. These are the events you <em>must</em> be aware of.</li>
  <li><strong>Medium Impact (Orange)</strong> — Can cause 20-50 pip moves. Examples: Retail Sales, Manufacturing PMI, Trade Balance. Worth noting but less dramatic.</li>
  <li><strong>Low Impact (Yellow)</strong> — Rarely move markets significantly. Examples: Building Permits, Consumer Confidence surveys. You can generally ignore these unless you're trading the specific currency they affect.</li>
</ul>
<p>Every trading day should start by checking the economic calendar. Free calendars are available on ForexFactory, Investing.com, and most broker platforms. Look at what's scheduled, what time it hits, and which currency it affects. This takes 2 minutes and can save you from nasty surprises.</p>`,
          },
          {
            heading: 'The Events That Move Markets Most',
            content: `
<p>Not all news events are created equal. Here are the "big five" that every trader must know:</p>
<ul>
  <li><strong>Non-Farm Payrolls (NFP)</strong> — Released on the first Friday of every month at 1:30 PM GMT. It reports how many jobs the US economy added or lost. NFP can move the Dollar 50-150 pips in seconds. It's the most-watched economic data release in the world.</li>
  <li><strong>FOMC / Interest Rate Decisions</strong> — The Federal Reserve meets roughly every 6 weeks to decide on US interest rates. The statement and press conference that follow can move every USD pair and gold dramatically. Other central banks (ECB, BOE, BOJ) have equivalent events.</li>
  <li><strong>Consumer Price Index (CPI)</strong> — Measures inflation. Since central banks use interest rates to control inflation, CPI data directly affects rate expectations. Higher-than-expected CPI = potential rate hike = stronger currency.</li>
  <li><strong>GDP (Gross Domestic Product)</strong> — The broadest measure of economic health. A GDP number above expectations signals a strong economy and typically strengthens the currency. Below expectations signals weakness.</li>
  <li><strong>Central Bank Speeches</strong> — When the Fed Chair, ECB President, or other central bank officials speak publicly, their words are analyzed for hints about future policy. A single sentence like "we may need to raise rates further" can move markets instantly.</li>
</ul>`,
          },
          {
            heading: 'How to Read a News Release',
            content: `
<p>When a news event is released, three numbers matter:</p>
<ul>
  <li><strong>Previous</strong> — What the data was last time (e.g., NFP last month was +180K jobs)</li>
  <li><strong>Forecast (Expected)</strong> — What economists predict this time (e.g., NFP forecast is +200K)</li>
  <li><strong>Actual</strong> — The real number that gets released (e.g., NFP actual is +280K)</li>
</ul>
<p>The market reaction is based on the <strong>surprise</strong> — the difference between the Actual and the Forecast. If NFP was expected at +200K and came in at +280K, that's a significant positive surprise for the US Dollar. If it came in at +120K, that's a negative surprise.</p>
<p>Important: markets are <strong>forward-looking</strong>. Prices often move <em>before</em> the data is released, based on expectations and positioning. This is called "pricing in." Sometimes, even if the data is good, the price drops because the good result was already expected and traders "sell the news" to take profits.</p>
<p>This is why the phrase "<strong>buy the rumor, sell the fact</strong>" exists. Prices can rally in anticipation of good data, and then drop when the good data actually arrives because everyone who wanted to buy has already bought.</p>`,
          },
          {
            heading: 'How to Prepare for High-Impact News',
            content: `
<p>Here's a practical checklist for handling news events:</p>
<ul>
  <li><strong>Before the event (30+ minutes):</strong> Check if you have any open positions that could be affected. Consider closing them or moving your stop loss to breakeven to remove risk. Do NOT open new trades within 30 minutes of a high-impact event.</li>
  <li><strong>During the event:</strong> Stay out. The initial reaction to major news is often chaotic — massive spreads, slippage, and whipsaw moves that can trigger your stop loss in both directions. Trying to trade the first few minutes of an NFP release is gambling, not trading.</li>
  <li><strong>After the event (15-30 minutes later):</strong> Once the initial volatility settles, the market often establishes a clear direction. This is when you can look for trade setups. The post-news direction is usually more reliable than the initial spike.</li>
</ul>
<p><strong>Beginner rule: Avoid trading during high-impact news events entirely.</strong> Close your positions or set your stops to breakeven before the release. There will always be clean, low-risk setups during normal trading hours. You don't need to trade the chaos.</p>
<p>As you gain experience, you may develop strategies for trading around news events, but that's an advanced skill. For now, let the news pass and trade the aftermath.</p>`,
          },
        ],
        quiz: [
          {
            id: '3-4-q1',
            question: 'What determines the market\'s reaction to a news release?',
            options: [
              'The absolute value of the number',
              'Whether the number is positive or negative',
              'The color of the economic calendar event',
              'The surprise — the difference between the actual result and the forecast',
            ],
            correctIndex: 3,
            explanation:
              'Markets react to surprises, not absolute numbers. If NFP was expected at +200K and came in at +280K, the +80K surprise matters more than the +280K itself. Markets have already "priced in" the expected number.',
          },
          {
            id: '3-4-q2',
            question: 'When is the Non-Farm Payrolls (NFP) report typically released?',
            options: [
              'Every Monday at midnight',
              'The first Friday of every month at 1:30 PM GMT',
              'Every Wednesday at 3:00 PM GMT',
              'The last business day of each quarter',
            ],
            correctIndex: 1,
            explanation:
              'NFP is released on the first Friday of every month at 1:30 PM GMT (8:30 AM Eastern Time). It\'s the most-watched economic data release in the world and can move USD pairs 50-150+ pips.',
          },
          {
            id: '3-4-q3',
            question: 'What does "buy the rumor, sell the fact" mean?',
            options: [
              'Only trade based on unverified rumors',
              'Always buy before news and sell after',
              'Prices often move in anticipation of expected news, then reverse when the news actually arrives',
              'Rumors are more reliable than economic data',
            ],
            correctIndex: 2,
            explanation:
              'This phrase means that markets are forward-looking. Traders position themselves based on what they expect (the rumor/forecast), pushing prices in advance. When the actual data confirms expectations, there\'s no one left to buy, so early buyers take profits and the price reverses.',
          },
          {
            id: '3-4-q4',
            question: 'What should beginners do during high-impact news events like NFP?',
            options: [
              'Avoid trading entirely — close positions or set stops to breakeven before the release',
              'Trade aggressively because volatility means bigger profits',
              'Only use market orders for faster execution',
              'Increase lot size to take advantage of the move',
            ],
            correctIndex: 0,
            explanation:
              'Beginners should avoid trading during major news events. The initial reaction is often chaotic with massive spreads, slippage, and whipsaw moves. It\'s safer to let the storm pass and look for cleaner setups once volatility settles 15-30 minutes later.',
          },
        ],
      },
    ],
  },

  // ════════════════════════════════════════════════════════════
  // LEVEL 4 — YOUR FIRST STRATEGY
  // ════════════════════════════════════════════════════════════
  {
    id: 4,
    title: 'Your First Strategy',
    subtitle: 'Build, document, journal, and backtest a complete trading strategy',
    accentColor: 'neon-purple',
    lessons: [
      // ── Lesson 4-1 ─────────────────────────────────────────
      {
        id: '4-1',
        levelId: 4,
        title: 'Moving Averages',
        description:
          'Learn how moving averages work, the difference between SMA and EMA, and how to use crossover signals for trend confirmation.',
        readTime: '8 min',
        sections: [
          {
            heading: 'What Is a Moving Average?',
            content: `
<p>A <strong>moving average (MA)</strong> is one of the simplest and most widely used indicators in trading. It calculates the average price over a specific number of periods and plots it as a smooth line on your chart.</p>
<p>For example, a 20-period moving average on a Daily chart adds up the last 20 closing prices and divides by 20. Each day, the oldest price drops off and the newest is added, so the average "moves" with time — hence the name.</p>
<p>Moving averages serve two key purposes:</p>
<ul>
  <li><strong>Smooth out price noise</strong> — Instead of reacting to every small candle, the MA shows you the underlying direction. If the MA is pointing up, the overall trend is up, regardless of a few red candles along the way.</li>
  <li><strong>Act as dynamic support/resistance</strong> — Price often bounces off moving averages as if they were horizontal support or resistance levels. The 50 MA and 200 MA are particularly respected by institutional traders.</li>
</ul>
<p>A moving average is a <strong>lagging indicator</strong>, meaning it's based on past data. It tells you what has happened, not what will happen. This is actually useful — it keeps you from jumping into trades too early and helps you confirm the trend before committing.</p>`,
          },
          {
            heading: 'SMA vs. EMA',
            content: `
<p>There are two main types of moving averages:</p>
<p><strong>Simple Moving Average (SMA)</strong> — Gives equal weight to every price in the period. A 20 SMA treats the price from 20 days ago the same as yesterday's price. It produces a smoother line but reacts more slowly to new price changes.</p>
<p><strong>Exponential Moving Average (EMA)</strong> — Gives more weight to recent prices. This makes it more responsive to current price action. A 20 EMA will react faster to a sudden price spike than a 20 SMA.</p>
<p>Which is better? Neither — they serve different purposes:</p>
<ul>
  <li>Use <strong>SMA</strong> when you want a stable, reliable trend line that doesn't whipsaw. Good for identifying the big-picture trend on higher timeframes (Daily/Weekly).</li>
  <li>Use <strong>EMA</strong> when you want faster signals, particularly on lower timeframes (H1, M15). It reacts quicker, but this also means more false signals.</li>
</ul>
<p>Most traders use a mix. A common setup is the <strong>9 EMA and 21 EMA</strong> on lower timeframes for short-term signals, combined with the <strong>50 SMA and 200 SMA</strong> on the Daily chart for the big-picture trend. Don't overthink it — pick one approach, learn it, and stick with it.</p>`,
          },
          {
            heading: 'Key Moving Average Periods',
            content: `
<p>Different periods highlight different timeframes of trend:</p>
<ul>
  <li><strong>9 and 14 EMA</strong> — Short-term trend. Reacts quickly. Good for timing entries on lower timeframes. If price is above the 9 EMA, short-term momentum is bullish.</li>
  <li><strong>21 EMA</strong> — The "swing trader's MA." Many swing traders use price's relationship with the 21 EMA to gauge the intermediate trend. Pullbacks to the 21 EMA in a trend often provide good entry opportunities.</li>
  <li><strong>50 SMA/EMA</strong> — Medium-term trend. Widely watched by institutions. When price pulls back to the 50 MA in a strong trend, it often bounces. A break of the 50 MA is a warning sign.</li>
  <li><strong>200 SMA</strong> — The "king" of moving averages. Represents the long-term trend. Institutional traders and algorithms pay close attention to it. If price is above the 200 SMA, the long-term trend is up; below, it's down. It's also one of the strongest dynamic support/resistance levels.</li>
</ul>
<p>A practical setup for beginners: put the <strong>50 EMA</strong> and <strong>200 SMA</strong> on your Daily chart. If price is above both, only look for buy trades. If price is below both, only look for sell trades. This simple filter will keep you on the right side of the trend more often than not.</p>`,
          },
          {
            heading: 'Moving Average Crossover Signals',
            content: `
<p>A <strong>crossover</strong> occurs when a faster (shorter-period) moving average crosses above or below a slower (longer-period) moving average. It's one of the oldest and most straightforward trading signals:</p>
<ul>
  <li><strong>Golden Cross</strong> — The faster MA crosses <em>above</em> the slower MA. This is a bullish signal, suggesting momentum is shifting upward. The most famous golden cross is the 50 SMA crossing above the 200 SMA on the Daily chart.</li>
  <li><strong>Death Cross</strong> — The faster MA crosses <em>below</em> the slower MA. This is a bearish signal, suggesting momentum is shifting downward.</li>
</ul>
<p>A common beginner strategy:</p>
<ul>
  <li>Plot the 9 EMA and 21 EMA on the H4 or Daily chart</li>
  <li>When the 9 EMA crosses above the 21 EMA, look for buy entries</li>
  <li>When the 9 EMA crosses below the 21 EMA, look for sell entries</li>
</ul>
<p><strong>Warning:</strong> Crossover signals work well in trending markets but generate false signals in ranging markets. If price is chopping sideways, the MAs will cross back and forth repeatedly, causing "whipsaw" losses. This is why you should <em>always</em> combine crossovers with other confirmation (support/resistance, trend structure, candlestick patterns) rather than blindly trading every crossover.</p>
<p>Moving averages are a building block, not a complete strategy. In the next lesson, we'll combine them with other elements to build a full, rules-based strategy.</p>`,
          },
        ],
        quiz: [
          {
            id: '4-1-q1',
            question: 'What is the main difference between an SMA and an EMA?',
            options: [
              'SMA uses closing prices while EMA uses opening prices',
              'EMA gives more weight to recent prices, making it more responsive to current price action',
              'SMA is only used on daily charts while EMA is for intraday',
              'There is no practical difference between them',
            ],
            correctIndex: 1,
            explanation:
              'The EMA (Exponential Moving Average) applies more weight to recent prices, so it reacts faster to current price changes. The SMA (Simple Moving Average) gives equal weight to all prices in the period, making it smoother but slower to react.',
          },
          {
            id: '4-1-q2',
            question: 'What is a "Golden Cross"?',
            options: [
              'When price touches the 200 SMA',
              'When two moving averages have the same value',
              'When a faster moving average crosses above a slower moving average',
              'When the price crosses above the 50 SMA',
            ],
            correctIndex: 2,
            explanation:
              'A Golden Cross occurs when a faster (shorter-period) moving average crosses above a slower (longer-period) one — for example, the 50 SMA crossing above the 200 SMA. It\'s considered a bullish signal indicating upward momentum.',
          },
          {
            id: '4-1-q3',
            question: 'The 200 SMA on a Daily chart is primarily used to identify:',
            options: [
              'The long-term trend direction',
              'Short-term scalping entries',
              'The exact reversal point',
              'Tomorrow\'s opening price',
            ],
            correctIndex: 0,
            explanation:
              'The 200 SMA on the Daily chart is the most widely watched moving average, used to determine the long-term trend. If price is above the 200 SMA, the long-term trend is considered up; below it, the trend is down.',
          },
          {
            id: '4-1-q4',
            question: 'In what market condition do moving average crossover signals tend to fail?',
            options: [
              'During strong uptrends',
              'During strong downtrends',
              'During high-volume sessions',
              'During ranging (sideways/choppy) markets',
            ],
            correctIndex: 3,
            explanation:
              'In ranging markets, price chops sideways and the moving averages cross back and forth repeatedly, generating false signals known as "whipsaws." Crossover strategies work best in trending markets where the direction is clear.',
          },
        ],
      },

      // ── Lesson 4-2 ─────────────────────────────────────────
      {
        id: '4-2',
        levelId: 4,
        title: 'Building a Complete Strategy',
        description:
          'Combine entry rules, exit rules, stop placement, and position sizing into a documented, repeatable trading strategy.',
        readTime: '9 min',
        sections: [
          {
            heading: 'What Makes a Complete Strategy',
            content: `
<p>A trading strategy is a <strong>written set of rules</strong> that tell you exactly when to enter a trade, where to place your stop loss and take profit, how much to risk, and when to stay out. It removes guesswork and emotion from your decisions.</p>
<p>A complete strategy must answer these five questions:</p>
<ul>
  <li><strong>1. What do I trade?</strong> — Which instruments? (e.g., EUR/USD and Gold only)</li>
  <li><strong>2. When do I trade?</strong> — Which session and timeframe? (e.g., London session, H1 chart)</li>
  <li><strong>3. How do I enter?</strong> — What specific conditions must be true to open a trade? (e.g., price at support + 9 EMA above 21 EMA + bullish engulfing candle)</li>
  <li><strong>4. How do I exit?</strong> — Where is my stop loss? Where is my take profit? Under what conditions would I close early?</li>
  <li><strong>5. How much do I risk?</strong> — What percentage per trade? How do I calculate lot size?</li>
</ul>
<p>If you can't answer all five questions <em>before</em> entering a trade, you're not trading a strategy — you're gambling with a strategy-shaped justification. Write your rules down. Print them. Tape them next to your monitor. Follow them without exception.</p>`,
          },
          {
            heading: 'Defining Your Entry Rules',
            content: `
<p>Entry rules are the conditions that must all be true before you open a trade. The key is being <strong>specific and objective</strong> — no room for interpretation. Here's an example of a simple but effective trend-following strategy:</p>
<p><strong>"London Session Trend Pullback" — Buy Entry Rules:</strong></p>
<ul>
  <li>The Daily chart shows an uptrend (price above the 200 SMA, making higher highs and higher lows)</li>
  <li>On the H1 chart, the 9 EMA is above the 21 EMA (short-term trend aligns with daily)</li>
  <li>Price has pulled back to the 21 EMA or a horizontal support level</li>
  <li>A bullish rejection candle forms at that level (long lower wick, closing green)</li>
  <li>It's during the London session or London-New York overlap</li>
</ul>
<p>All five conditions must be met. If even one is missing, you don't take the trade. This might mean you only get 2-3 trades per week. That's fine — quality over quantity.</p>
<p>For sell entries, you'd invert the rules: Daily downtrend, 9 EMA below 21 EMA, pullback to 21 EMA or resistance, bearish rejection candle, during London/New York.</p>
<p>Start simple. Many beginners make the mistake of adding 10 indicators to their chart, requiring 8 conditions to align. More conditions = fewer trades = fewer opportunities to learn. A strategy with 3-5 clear rules is better than one with 12 ambiguous ones.</p>`,
          },
          {
            heading: 'Exit Rules — Stop Loss and Take Profit Placement',
            content: `
<p>Your exit rules are just as important as your entry rules. Here's how to define them:</p>
<p><strong>Stop Loss Placement:</strong></p>
<ul>
  <li>Place your stop loss below the most recent swing low (for buy trades) or above the most recent swing high (for sell trades).</li>
  <li>Add a small buffer (5-10 pips) beyond the swing point to avoid getting stopped out by a wick that barely touches your level.</li>
  <li>Example: If the swing low is at 1.0780 and you're buying, place your SL at 1.0770 (10 pips below the low).</li>
</ul>
<p><strong>Take Profit Placement:</strong></p>
<ul>
  <li>Place your take profit at the next significant resistance level (for buy trades) or support level (for sell trades).</li>
  <li>Ensure the distance to your TP is at least 2× the distance to your SL (minimum 1:2 R:R).</li>
  <li>If no clear level provides at least 1:2 R:R, <strong>skip the trade</strong>. Not every setup is worth taking.</li>
</ul>
<p><strong>Early Exit Rules:</strong></p>
<ul>
  <li>If a high-impact news event is approaching and your trade is in profit, consider closing early to protect gains.</li>
  <li>If the trade reaches 1:1 R:R (your profit equals your risk), consider moving your stop loss to breakeven. This makes the trade "risk-free."</li>
</ul>`,
          },
          {
            heading: 'Documenting Your Strategy',
            content: `
<p>Once you've defined your rules, write them in a structured document — your <strong>Trading Strategy Document</strong>. Here's a template:</p>
<ul>
  <li><strong>Strategy Name:</strong> London Session Trend Pullback</li>
  <li><strong>Instruments:</strong> EUR/USD, GBP/USD</li>
  <li><strong>Timeframes:</strong> D1 for trend direction, H1 for entry</li>
  <li><strong>Session:</strong> London (8:00 AM – 5:00 PM GMT)</li>
  <li><strong>Entry Rules (Buy):</strong> [list all 5 conditions]</li>
  <li><strong>Entry Rules (Sell):</strong> [list all 5 inverted conditions]</li>
  <li><strong>Stop Loss:</strong> Below the recent swing low + 10 pip buffer</li>
  <li><strong>Take Profit:</strong> Next resistance level (minimum 1:2 R:R)</li>
  <li><strong>Risk:</strong> 1% per trade, calculated using the lot size formula</li>
  <li><strong>Daily Loss Limit:</strong> 3% (3 losing trades = done for the day)</li>
  <li><strong>Situations to avoid:</strong> 30 minutes before/after high-impact news, Fridays after 3:00 PM GMT, first trading day after a holiday</li>
</ul>
<p>This document is your playbook. Before every trade, check it. Does the setup match your rules? If yes, calculate your position size and execute with confidence. If no, walk away. The discipline to follow your documented strategy is what separates the 13% who profit from the 87% who don't.</p>`,
          },
        ],
        quiz: [
          {
            id: '4-2-q1',
            question: 'Which of these is NOT one of the five essential questions a complete strategy must answer?',
            options: [
              'What do I trade?',
              'How do I enter?',
              'What will the market do tomorrow?',
              'How much do I risk?',
            ],
            correctIndex: 2,
            explanation:
              'A strategy defines what you trade, when, how you enter, how you exit, and how much you risk. It does NOT try to predict what the market will do — it defines how YOU will respond to what the market does. Prediction is impossible; preparation is essential.',
          },
          {
            id: '4-2-q2',
            question: 'Why should you write down your trading strategy in a document?',
            options: [
              'To remove emotion and guesswork by having objective, pre-defined rules to follow',
              'Because it\'s a legal requirement',
              'To impress other traders',
              'Written strategies automatically make more money',
            ],
            correctIndex: 0,
            explanation:
              'A written strategy removes the need to make decisions under pressure. When you\'re in a live trade with real money, emotions run high. Having pre-defined rules means you just follow the checklist instead of making emotional, impulsive decisions.',
          },
          {
            id: '4-2-q3',
            question: 'If your analysis shows no clear take profit level that provides at least a 1:2 risk-to-reward ratio, what should you do?',
            options: [
              'Take the trade anyway with a smaller position',
              'Move your stop loss further away to improve the ratio',
              'Enter the trade without a take profit',
              'Skip the trade entirely',
            ],
            correctIndex: 3,
            explanation:
              'If you can\'t find a take profit level that gives at least 1:2 R:R, the trade doesn\'t offer enough reward for the risk. Skip it. There will always be better setups. Forcing trades with poor R:R is a losing habit over time.',
          },
          {
            id: '4-2-q4',
            question: 'What should you consider doing when your trade reaches 1:1 risk-to-reward (profit equals your risk)?',
            options: [
              'Immediately close the trade for guaranteed profit',
              'Move your stop loss to breakeven to make the trade risk-free',
              'Double your position size',
              'Remove your stop loss entirely',
            ],
            correctIndex: 1,
            explanation:
              'Moving your stop loss to breakeven when profit equals your risk makes the trade "free" — the worst outcome is now zero loss instead of a full loss. This protects your capital while still allowing the trade to reach its full take profit target.',
          },
        ],
      },

      // ── Lesson 4-3 ─────────────────────────────────────────
      {
        id: '4-3',
        levelId: 4,
        title: 'Keeping a Trade Journal',
        description:
          'Learn what to log, why journaling is the secret weapon of profitable traders, and how to conduct a meaningful weekly review.',
        readTime: '7 min',
        sections: [
          {
            heading: 'Why Journaling Matters',
            content: `
<p>A trade journal is a detailed log of every trade you take — and it's the single most underused tool in a trader's arsenal. Ask any consistently profitable trader about their journey, and almost all of them will tell you that journaling was a turning point.</p>
<p>Why? Because without a journal, you're learning from <strong>feelings</strong> instead of <strong>facts</strong>. After a losing week, you might "feel" like your strategy isn't working, when in reality you followed your rules on 3 trades (2 won, 1 lost) and broke your rules on 4 trades (all lost). The problem wasn't your strategy — it was your discipline. Only a journal reveals this.</p>
<p>A journal transforms trading from gambling into a data-driven business. Over time, patterns emerge:</p>
<ul>
  <li>"I win 70% of my trades on EUR/USD but only 30% on GBP/JPY — I should stop trading GBP/JPY"</li>
  <li>"My Monday trades have a 60% win rate, but Fridays are only 25% — something about Fridays doesn't work for me"</li>
  <li>"Every time I trade after a losing streak without a break, my next trade loses 80% of the time"</li>
</ul>
<p>These insights are invisible without data. The journal makes them obvious.</p>`,
          },
          {
            heading: 'What to Log for Every Trade',
            content: `
<p>For every trade, record the following information <em>before, during, and after</em> the trade:</p>
<p><strong>Before the trade (at entry):</strong></p>
<ul>
  <li>Date and time of entry</li>
  <li>Instrument (e.g., EUR/USD)</li>
  <li>Direction (Buy or Sell)</li>
  <li>Entry price</li>
  <li>Stop loss and take profit levels</li>
  <li>Lot size</li>
  <li>Risk-to-reward ratio</li>
  <li>The reason for the trade — what setup did you see? Which rules were met?</li>
  <li>A screenshot of the chart at entry</li>
</ul>
<p><strong>After the trade (at close):</strong></p>
<ul>
  <li>Close price and time</li>
  <li>Result (profit/loss in pips and dollars)</li>
  <li>Did you follow your rules? (Yes/No — be brutally honest)</li>
  <li>What happened? Brief description of how the trade played out</li>
  <li>A screenshot of the chart at exit</li>
  <li>Emotional state — how were you feeling before and during the trade?</li>
  <li>Lessons learned — what would you do differently?</li>
</ul>
<p>The screenshots are especially important. When you review your journal, seeing the actual chart at the moment of entry reveals things your memory distorts. "I had a great setup" might look very different when you see the actual chart weeks later.</p>`,
          },
          {
            heading: 'Reviewing Patterns — The Weekly Review',
            content: `
<p>Logging trades is only half the battle. The real value comes from <strong>reviewing</strong> your journal regularly. Set aside 30-60 minutes every weekend for your weekly review.</p>
<p>Here's a structured review process:</p>
<ul>
  <li><strong>Step 1: Count the numbers</strong> — How many trades this week? Win rate? Average win size vs. average loss size? Total P&L? Expectancy per trade?</li>
  <li><strong>Step 2: Rule compliance</strong> — How many trades followed your strategy rules? How many broke them? Calculate your rule-following rate. This is more important than your P&L.</li>
  <li><strong>Step 3: Best and worst trades</strong> — Identify your best trade (highest quality setup, regardless of result) and your worst trade (lowest quality, biggest rule violation). Study both.</li>
  <li><strong>Step 4: Patterns</strong> — Are certain days, times, or instruments performing better than others? Are losses clustered (suggesting tilt or market conditions) or spread out (normal variance)?</li>
  <li><strong>Step 5: Action items</strong> — Write 1-2 specific things to focus on next week. "Be more patient" is too vague. "Only enter trades where R:R is 1:2 or better" is specific and actionable.</li>
</ul>
<p>The weekly review is where compound improvement happens. Each week you fix one small thing. Over months, those small improvements stack into a dramatically better trader.</p>`,
          },
          {
            heading: 'Tools for Journaling',
            content: `
<p>You can journal with whatever tool works for you — the best journal is one you'll actually use:</p>
<ul>
  <li><strong>Spreadsheet (Google Sheets / Excel)</strong> — The most common choice. Create columns for each data point and use formulas to auto-calculate win rate, average R:R, and P&L. Add a "Notes" column for emotional state and lessons. Simple, free, and customizable.</li>
  <li><strong>Dedicated journaling apps</strong> — Tools like TradeMetrics (that's us!), Edgewonk, or TraderSync offer built-in analytics, screenshot attachments, and performance dashboards. They automate much of the analysis work.</li>
  <li><strong>Physical notebook</strong> — Some traders prefer handwriting. The act of writing forces you to think more carefully. The downside is you lose automatic calculations and chart screenshots.</li>
</ul>
<p>Whatever tool you choose, the key habit is: <strong>journal the trade immediately after closing it</strong>. Don't say "I'll do it later" — you won't, or your memory will be distorted. Take 2 minutes to log it right away. Those 2 minutes invested per trade will compound into the most valuable data you've ever collected about your trading.</p>
<p>Remember: you're building a <em>personal database</em> of your trading behavior. After 100 logged trades, you'll have a clear, data-backed picture of your strengths, weaknesses, and the specific changes that will make you more profitable.</p>`,
          },
        ],
        quiz: [
          {
            id: '4-3-q1',
            question: 'What is the primary benefit of keeping a trade journal?',
            options: [
              'It reveals data-driven patterns about your trading behavior that feelings and memory cannot',
              'It satisfies regulatory requirements for retail traders',
              'It automatically improves your win rate',
              'It provides tax deductions for traders',
            ],
            correctIndex: 0,
            explanation:
              'A journal turns subjective feelings into objective data. It reveals patterns you can\'t see otherwise — like which instruments, times, or conditions produce your best and worst results. This data-driven feedback loop is how traders systematically improve.',
          },
          {
            id: '4-3-q2',
            question: 'In your weekly review, which metric is MORE important than your P&L?',
            options: [
              'The number of trades you took',
              'Your account balance',
              'How many hours you spent watching charts',
              'Your rule-following rate — how consistently you followed your strategy',
            ],
            correctIndex: 3,
            explanation:
              'Rule compliance is more important than short-term P&L because a good strategy followed consistently will be profitable over time. If you followed your rules and still lost, that\'s normal variance. If you broke your rules and won, that\'s dangerous — you\'re rewarding bad behavior.',
          },
          {
            id: '4-3-q3',
            question: 'When should you journal a trade?',
            options: [
              'At the end of the week during your review',
              'Immediately after closing the trade',
              'Before you enter the trade',
              'Only when you have a losing trade',
            ],
            correctIndex: 1,
            explanation:
              'Journal each trade immediately after closing it. Memory distorts quickly — what felt like a clear setup might look very different even a few hours later. Immediate logging ensures accuracy. It only takes 2 minutes per trade.',
          },
          {
            id: '4-3-q4',
            question: 'What makes a good action item from your weekly review?',
            options: [
              '"Try to do better next week"',
              '"Watch more YouTube trading videos"',
              '"Only enter trades where R:R is 1:2 or better" — specific and measurable',
              '"Make more money"',
            ],
            correctIndex: 2,
            explanation:
              'Good action items are specific, measurable, and actionable. "Only enter trades where R:R is 1:2 or better" is a concrete rule you can follow and verify. Vague goals like "do better" or "make more money" provide no clear path to improvement.',
          },
        ],
      },

      // ── Lesson 4-4 ─────────────────────────────────────────
      {
        id: '4-4',
        levelId: 4,
        title: 'Introduction to Backtesting',
        description:
          'Learn what backtesting is, why it\'s essential before trading real money, and how to avoid common pitfalls like curve fitting.',
        readTime: '8 min',
        sections: [
          {
            heading: 'What Is Backtesting?',
            content: `
<p><strong>Backtesting</strong> is the process of testing your trading strategy against historical price data to see how it would have performed in the past. Before risking real money, you scroll back through past charts and apply your entry and exit rules as if you were trading in real time.</p>
<p>Think of it like a flight simulator for traders. A pilot doesn't fly a real plane for the first time with passengers aboard — they spend hundreds of hours in a simulator first. Backtesting is your trading simulator.</p>
<p>Here's the process in simple steps:</p>
<ul>
  <li><strong>Step 1:</strong> Open a chart and scroll back 6-12 months in history.</li>
  <li><strong>Step 2:</strong> Move forward candle by candle (most platforms have a bar-replay or scroll feature).</li>
  <li><strong>Step 3:</strong> At each candle, ask: "Do my entry rules say to take a trade here?" If yes, record the entry, stop loss, take profit, and lot size — exactly as your strategy dictates.</li>
  <li><strong>Step 4:</strong> Continue forward to see whether the trade hit the stop loss or take profit.</li>
  <li><strong>Step 5:</strong> Log the result and move to the next potential setup.</li>
</ul>
<p>After processing 50-100 historical trades, you'll have a clear picture: What's the win rate? Average profit vs. average loss? Maximum drawdown? Is this strategy worth trading with real money?</p>`,
          },
          {
            heading: 'Why Backtesting Matters',
            content: `
<p>Backtesting serves several critical purposes:</p>
<ul>
  <li><strong>Validates (or invalidates) your strategy</strong> — A strategy that sounded great in theory might perform terribly on historical data. Better to find out for free than with your real money. If your backtest shows a losing strategy, you've saved yourself thousands of dollars.</li>
  <li><strong>Builds confidence</strong> — When you've seen your strategy produce profits over 100 historical trades, you'll have the confidence to follow it during live trading — even through a losing streak. You'll know that losing streaks are normal and temporary because you've seen them in the backtest.</li>
  <li><strong>Sets realistic expectations</strong> — A backtest tells you what to expect: "My strategy wins about 45% of the time, with an average win of 2.1× the average loss, and the worst drawdown was 8% over 12 months." This prevents disappointment and reckless behavior.</li>
  <li><strong>Identifies edge cases</strong> — Backtesting reveals how your strategy performs during different market conditions: strong trends, ranges, high-volatility news events, holidays. You'll discover which conditions to avoid and which are your bread and butter.</li>
</ul>
<p>A strategy without backtesting data is like a medicine without clinical trials. It might work. It might not. You don't know until you test it. And you'd rather test it on historical data than on your live account.</p>`,
          },
          {
            heading: 'Avoiding Curve Fitting',
            content: `
<p><strong>Curve fitting</strong> (also called over-optimization) is the biggest trap in backtesting. It happens when you adjust your strategy rules to perfectly match past data, creating a strategy that looks amazing historically but fails miserably in live trading.</p>
<p>Here's what curve fitting looks like:</p>
<ul>
  <li>You backtest a moving average crossover: 10 EMA / 20 EMA. Results are okay — 52% win rate.</li>
  <li>You try 12 EMA / 23 EMA. Better — 58% win rate.</li>
  <li>You try 13 EMA / 27 EMA. Even better — 64% win rate.</li>
  <li>You keep tweaking until you find 11 EMA / 24.5 EMA gives 71% win rate on the last 6 months.</li>
</ul>
<p>The problem? You've found a combination that fits the <em>specific</em> past data, but it has no edge on future data. The 71% win rate was a statistical coincidence for that specific period. In live trading, it'll likely perform no better than the original 52%.</p>
<p>How to avoid curve fitting:</p>
<ul>
  <li><strong>Use standard periods</strong> — Stick to commonly used values (9, 14, 21, 50, 200) rather than exotic numbers. These work because millions of traders watch them, creating self-fulfilling prophecy.</li>
  <li><strong>Keep rules simple</strong> — A strategy with 3 rules is less likely to be curve-fitted than one with 12 rules. Complexity ≠ profitability.</li>
  <li><strong>Test on unseen data</strong> — Split your data in half. Build your strategy on the first 6 months, then test it on the second 6 months (data it has never "seen"). If it still works, it's more likely to be robust.</li>
</ul>`,
          },
          {
            heading: 'Walk-Forward Testing',
            content: `
<p><strong>Walk-forward testing</strong> is the gold standard for strategy validation. It's a more sophisticated version of the "split your data" approach:</p>
<ul>
  <li><strong>Step 1: In-sample period</strong> — Develop and optimize your strategy on the first portion of data (e.g., January–June 2024).</li>
  <li><strong>Step 2: Out-of-sample test</strong> — Test the strategy, with no changes, on the next portion (e.g., July–September 2024). Record the results.</li>
  <li><strong>Step 3: Roll forward</strong> — Move the window: now develop on April–September 2024, and test on October–December 2024.</li>
  <li><strong>Step 4: Repeat</strong> — Keep rolling the window forward, each time testing on data the strategy has never seen.</li>
</ul>
<p>If your strategy performs consistently across multiple out-of-sample periods, it likely has a genuine edge. If it works great in-sample but fails out-of-sample, it was curve-fitted.</p>
<p><strong>Minimum sample size:</strong> You need at least <strong>30 trades</strong> in your backtest to draw any meaningful conclusions, and ideally <strong>100+</strong> for statistical confidence. Five winning trades in a row doesn't prove a strategy works — it could be luck. One hundred trades with a positive expectancy is much harder to attribute to luck.</p>
<p>After backtesting, before going live, do a <strong>forward test</strong> (also called paper trading): trade your strategy in real-time on a demo account for 4-8 weeks. This bridges the gap between historical results and live execution, accounting for factors like slippage, spread variations, and your own psychological reactions.</p>`,
          },
        ],
        quiz: [
          {
            id: '4-4-q1',
            question: 'What is the minimum number of trades recommended for a statistically meaningful backtest?',
            options: [
              '5 trades',
              '10 trades',
              '15 trades',
              'At least 30 trades, ideally 100+',
            ],
            correctIndex: 3,
            explanation:
              'You need at least 30 trades for basic statistical meaning, and ideally 100+ for confidence. Small sample sizes can be misleading — 5 wins in a row could be pure luck. A larger sample reveals the true win rate and expectancy of your strategy.',
          },
          {
            id: '4-4-q2',
            question: 'What is "curve fitting" in backtesting?',
            options: [
              'Drawing trendlines on a chart',
              'Over-optimizing strategy parameters to perfectly match past data, creating a strategy that fails on new data',
              'Testing your strategy on multiple timeframes',
              'Using curved moving averages instead of straight ones',
            ],
            correctIndex: 1,
            explanation:
              'Curve fitting is the dangerous practice of tweaking your strategy rules until they perfectly match historical data. The resulting strategy looks great in the backtest but has no genuine edge — it was just fitted to specific past conditions that won\'t repeat exactly.',
          },
          {
            id: '4-4-q3',
            question: 'In walk-forward testing, what is the "out-of-sample" period?',
            options: [
              'The period when markets are closed',
              'Data you haven\'t included in your analysis',
              'A portion of historical data that the strategy has never "seen" during development — used to verify the strategy works on new data',
              'Future data that doesn\'t exist yet',
            ],
            correctIndex: 2,
            explanation:
              'The out-of-sample period is historical data that was deliberately kept separate during strategy development. By testing on data the strategy wasn\'t optimized for, you verify whether its edge is genuine or the result of curve fitting.',
          },
          {
            id: '4-4-q4',
            question: 'What should you do after backtesting and before trading with real money?',
            options: [
              'Immediately start live trading to test in real conditions',
              'Forward test (paper trade) on a demo account for 4-8 weeks',
              'Post your backtest results on social media for validation',
              'Optimize your strategy further until the backtest shows 90%+ win rate',
            ],
            correctIndex: 0,
            explanation:
              'After backtesting, you should forward test (paper trade) on a demo account for 4-8 weeks. This bridges the gap between historical results and live execution, accounting for real-world factors like slippage, spread changes, and your psychological reactions to live trades.',
          },
        ],
      },
    ],
  },

  // ════════════════════════════════════════════════════════════
  // LEVEL 5 — PSYCHOLOGY & DISCIPLINE
  // ════════════════════════════════════════════════════════════
  {
    id: 5,
    title: 'Psychology & Discipline',
    subtitle: 'Master the mental game that determines 80% of your trading success',
    accentColor: 'neon-red',
    lessons: [
      // ── Lesson 5-1 ─────────────────────────────────────────
      {
        id: '5-1',
        levelId: 5,
        title: 'The Emotions That Destroy Traders',
        description:
          'Identify the six destructive emotions — fear, greed, FOMO, revenge, hope, and euphoria — and learn to recognize them in yourself.',
        readTime: '8 min',
        sections: [
          {
            heading: 'Fear — The Paralysis',
            content: `
<p><strong>Fear</strong> is the emotion that stops you from taking valid trades or causes you to close winning trades too early. It manifests in several ways:</p>
<ul>
  <li><strong>Fear of losing</strong> — After a losing streak, you become afraid to pull the trigger on the next trade, even when your strategy gives a clear signal. You hesitate, second-guess, and eventually miss the trade — which, of course, turns out to be a winner, reinforcing your frustration.</li>
  <li><strong>Fear of giving back profit</strong> — You're in a winning trade, up 30 pips, targeting 60. At 35 pips, you panic and close early because "what if it reverses?" You've just cut your winner short, destroying your risk-to-reward ratio.</li>
  <li><strong>Fear of being wrong</strong> — You avoid setting a stop loss because the stop loss being hit would "prove" you were wrong. This is ego masquerading as analysis. The market doesn't care about your ego.</li>
</ul>
<p>The antidote to fear is <strong>confidence built through preparation</strong>. If you've backtested your strategy over 100 trades and know it has a positive expectancy, individual losses don't matter. You trust the process. You've seen losing streaks before in your backtest — they ended, and so will this one.</p>`,
          },
          {
            heading: 'Greed and FOMO',
            content: `
<p><strong>Greed</strong> makes you take too much risk or hold trades too long. It whispers: "Why risk only 1% when you could risk 5% and make 5x more?" or "The trade is at my take profit, but it could go even higher — let me remove my TP." Greed leads to outsized positions, removed stop losses, and the eventual devastating loss that wipes out weeks of small wins.</p>
<p><strong>FOMO (Fear of Missing Out)</strong> is greed's cousin. You see a pair making a big move and think "I need to get in NOW before I miss it!" You enter without analysis, without checking your rules, at the worst possible time — usually right before the move reverses. Social media amplifies FOMO tremendously. Someone posts a +500 pip trade, and you feel compelled to start trading the same pair immediately.</p>
<p>How greed and FOMO typically end:</p>
<ul>
  <li>You chase a big move → enter late → price reverses → you hold because "it has to come back" → loss grows → you finally close for a large loss</li>
  <li>You increase position size after a winning streak → "I'm on fire!" → the next trade loses → the oversized loss wipes out several previous wins</li>
</ul>
<p>The rule that protects you: <strong>Never deviate from your position sizing rules</strong>. Risk 1%, calculated by the formula, on every single trade. No exceptions because you "feel confident." Confidence is wonderful — but it should make you follow your rules better, not abandon them.</p>`,
          },
          {
            heading: 'Revenge Trading and Hope',
            content: `
<p><strong>Revenge trading</strong> is the impulsive act of immediately entering a new trade after a loss, driven not by analysis but by the desperate need to "get your money back." It's one of the most destructive patterns in trading.</p>
<p>The cycle looks like this:</p>
<ul>
  <li>Trade 1 loses → Frustration → "I need to make it back right now"</li>
  <li>Trade 2 (taken in anger, no proper setup) → Loses → More frustration</li>
  <li>Trade 3 (larger position because "I need to recover faster") → Loses → Panic</li>
  <li>Trade 4 (no stop loss, maximum leverage) → Account destroyed</li>
</ul>
<p>This entire spiral can happen in a single afternoon. The daily loss limit from Level 2 is your defense against this pattern.</p>
<p><strong>Hope</strong> is the silent killer. It's what keeps you in a losing trade long after your analysis has been invalidated. "I know it's below my stop loss level, but it'll come back." "I know the news was bearish, but maybe the market will ignore it." Hope turns small, manageable losses into account-threatening disasters.</p>
<p>The professional mindset replaces hope with acceptance: "My analysis was wrong this time. That's normal — I have a 55% win rate, meaning I'm wrong 45% of the time. I'll take the planned loss and move on to the next opportunity."</p>`,
          },
          {
            heading: 'Euphoria — The Hidden Danger',
            content: `
<p><strong>Euphoria</strong> is the most surprising entry on this list because it feels <em>good</em>. But euphoria after a winning streak is just as dangerous as despair after a losing streak — it distorts your judgment in the opposite direction.</p>
<p>After five winning trades in a row, you feel invincible. "I've figured this out. I can't lose." This overconfidence leads to:</p>
<ul>
  <li>Increasing position sizes beyond your risk rules ("I'm so hot right now, let me go 3% on this one")</li>
  <li>Taking marginal setups that don't fully meet your rules ("Close enough — I'm on a roll")</li>
  <li>Ignoring warning signs on the chart ("I don't need to check the Daily trend, I can feel the direction")</li>
  <li>Skipping your trading plan and journaling ("I don't need that right now, I'm winning")</li>
</ul>
<p>The solution is the same as for every other emotion: <strong>stick to your process</strong>. Your rules don't change because you're winning. Your position size doesn't change because you're confident. Your checklist doesn't become optional because you're on a streak.</p>
<p>The best traders are emotionally flat. They don't celebrate wins or mourn losses. Each trade is just one of the next thousand — a single data point in a long career. This emotional neutrality is the ultimate psychological skill, and it takes years to develop. But awareness of these six emotions is the first step.</p>`,
          },
        ],
        quiz: [
          {
            id: '5-1-q1',
            question: 'What is the main danger of "euphoria" after a winning streak?',
            options: [
              'It makes you stop trading entirely',
              'It causes physical health problems',
              'It leads to overconfidence, increased risk-taking, and abandoning your rules',
              'Euphoria has no negative effects on trading',
            ],
            correctIndex: 2,
            explanation:
              'Euphoria creates a dangerous sense of invincibility. Traders increase their position sizes, take marginal setups, and ignore their rules — believing they "can\'t lose." This overconfidence often leads to a large loss that erases the entire winning streak.',
          },
          {
            id: '5-1-q2',
            question: 'What is the typical "revenge trading" cycle?',
            options: [
              'Losing a trade → frustration → impulsive trades with bigger size and no proper setup → bigger losses → potential account destruction',
              'Winning a trade → taking a break → carefully planning the next trade',
              'Losing a trade → reviewing the journal → waiting for the next valid setup',
              'Winning a trade → increasing position size → winning more',
            ],
            correctIndex: 0,
            explanation:
              'Revenge trading follows a destructive spiral: a loss triggers frustration, which leads to impulsive trades with poor setups and larger sizes, creating more losses and more frustration. The daily loss limit is the circuit breaker that stops this cycle.',
          },
          {
            id: '5-1-q3',
            question: 'How does "fear of giving back profit" hurt your trading?',
            options: [
              'It makes you add to winning positions',
              'It causes you to close winning trades too early, destroying your risk-to-reward ratio',
              'It prevents you from placing stop losses',
              'It leads to overleveraging',
            ],
            correctIndex: 1,
            explanation:
              'Fear of giving back profit causes you to close winners prematurely. If your strategy targets 1:3 R:R but you consistently close at 1:1 out of fear, you need a much higher win rate to be profitable. Let your winners run to target — that\'s what the take profit order is for.',
          },
          {
            id: '5-1-q4',
            question: 'What is the healthiest emotional state for trading?',
            options: [
              'Extremely excited and optimistic',
              'Slightly nervous to stay alert',
              'Emotionally detached — no need for emotions',
              'Emotionally neutral — treating each trade as one data point in a long series, following the process regardless of recent results',
            ],
            correctIndex: 3,
            explanation:
              'The best traders are emotionally neutral. They don\'t celebrate wins or mourn losses excessively. Each trade is just one of thousands — a single data point. This neutrality prevents both euphoria-driven overconfidence and fear-driven paralysis.',
          },
        ],
      },

      // ── Lesson 5-2 ─────────────────────────────────────────
      {
        id: '5-2',
        levelId: 5,
        title: 'Building a Trading Plan',
        description:
          'Create a comprehensive trading plan that covers your strategy, risk rules, routines, and the pre-trade checklist that keeps you disciplined.',
        readTime: '8 min',
        sections: [
          {
            heading: 'What Is a Trading Plan?',
            content: `
<p>A <strong>trading plan</strong> is a comprehensive document that governs every aspect of your trading. It goes beyond your strategy (which focuses on entry/exit rules) to include your risk management, daily routines, personal rules, and contingency plans.</p>
<p>Think of it this way: your <em>strategy</em> tells you how to trade. Your <em>plan</em> tells you how to <strong>be</strong> a trader — the complete operating manual for your trading business.</p>
<p>A proper trading plan covers:</p>
<ul>
  <li><strong>Your strategy</strong> — Entry rules, exit rules, instruments, timeframes (from Level 4)</li>
  <li><strong>Risk management</strong> — Max risk per trade, daily/weekly loss limits, max open positions</li>
  <li><strong>Trading schedule</strong> — Which sessions you trade, what time you start/stop, days off</li>
  <li><strong>Daily routines</strong> — Pre-market preparation, during-market process, post-market review</li>
  <li><strong>Personal rules</strong> — What you do after wins, after losses, during streaks</li>
  <li><strong>Emergency protocols</strong> — What to do during a flash crash, platform outage, or personal crisis</li>
</ul>
<p>The trading plan is your accountability partner. When emotions scream "take this trade NOW," you check the plan. When greed whispers "double the position size," you check the plan. The plan is the rational, clear-headed version of you that made these rules when not under pressure.</p>`,
          },
          {
            heading: 'The Pre-Trade Checklist',
            content: `
<p>Before every single trade, run through this checklist. If any answer is "no," you don't trade:</p>
<ul>
  <li><strong>1. Am I within my trading hours?</strong> — Am I in my designated session? If it's outside my window, I don't trade.</li>
  <li><strong>2. Have I checked the economic calendar?</strong> — Are there high-impact events in the next 60 minutes? If yes, I wait.</li>
  <li><strong>3. Does the higher timeframe agree?</strong> — Is the Daily trend aligned with my trade direction? Am I trading with the trend?</li>
  <li><strong>4. Do all my entry conditions pass?</strong> — Check each rule against the chart. Every condition must be true. No "close enough."</li>
  <li><strong>5. Have I calculated my position size?</strong> — Run the lot size formula. Know my exact risk in dollars. Is it within 1%?</li>
  <li><strong>6. Is the R:R at least 1:2?</strong> — Can I identify a take profit level that gives me at least 2× my stop loss distance?</li>
  <li><strong>7. Am I in the right headspace?</strong> — Am I calm, focused, and trading from analysis — not anger, boredom, FOMO, or revenge?</li>
  <li><strong>8. Have I hit my daily loss limit?</strong> — If I've already lost 3% today, the answer is "don't trade."</li>
</ul>
<p>Print this checklist. Put it next to your monitor. Go through it out loud before every trade. It takes 30 seconds and will save you thousands of dollars in prevented bad trades.</p>`,
          },
          {
            heading: 'Daily Routines — Your Trading Day Structure',
            content: `
<p>Consistency in your routine builds consistency in your results. Here's a template for structuring your trading day:</p>
<p><strong>Pre-Market (30 minutes before your session):</strong></p>
<ul>
  <li>Check the economic calendar — note any high-impact events and their times</li>
  <li>Review the Daily charts of your instruments — what happened overnight? Any key levels broken?</li>
  <li>Mark your support/resistance levels on the H1/H4 charts</li>
  <li>Write down potential scenarios: "If price reaches X, I'll look for a buy setup. If price breaks below Y, I'll look for a sell setup."</li>
  <li>Mental check: "Am I calm, well-rested, and focused? Or am I tired, stressed, or distracted?"</li>
</ul>
<p><strong>During Market (your trading session):</strong></p>
<ul>
  <li>Monitor your charts, but don't stare at them non-stop. Check every 15-30 minutes on H1 trades.</li>
  <li>When a setup appears, run the pre-trade checklist.</li>
  <li>If you enter a trade, journal it immediately.</li>
  <li>If you hit your daily loss limit, stop. No negotiation.</li>
</ul>
<p><strong>Post-Market (15 minutes after your session):</strong></p>
<ul>
  <li>Close any unnecessary charts and alerts.</li>
  <li>Update your trade journal with results.</li>
  <li>Review any trades taken: Did you follow the rules? What did you learn?</li>
  <li>Note your emotional state at the end of the session.</li>
</ul>`,
          },
          {
            heading: 'Personal Rules and Contingencies',
            content: `
<p>Beyond strategy and routine, your trading plan should include personal rules — the guardrails specific to your psychology and life:</p>
<p><strong>After-Win Rules:</strong></p>
<ul>
  <li>Do not increase position size after a winning streak. Stick to 1%.</li>
  <li>After 3 wins in a row, take a 30-minute break. Euphoria is dangerous.</li>
  <li>Celebrate by reviewing what went right, not by taking another trade.</li>
</ul>
<p><strong>After-Loss Rules:</strong></p>
<ul>
  <li>After 2 consecutive losses, take a 1-hour break.</li>
  <li>After 3 consecutive losses (daily limit), stop for the day.</li>
  <li>Do not increase position size to "recover." The next trade is 1% regardless.</li>
  <li>Review the losing trades — did you follow rules? If yes, it's normal. If no, diagnose why.</li>
</ul>
<p><strong>Life Rules:</strong></p>
<ul>
  <li>Do not trade after fewer than 6 hours of sleep.</li>
  <li>Do not trade when sick, highly stressed, or after a major personal event.</li>
  <li>Do not trade after consuming alcohol.</li>
  <li>If you're on vacation, you're on vacation. Don't check charts.</li>
</ul>
<p>These rules might seem excessive, but they exist because experienced traders have learned (often the hard way) that these situations lead to poor decisions. Your plan protects future-you from the bad judgment of current-you under unfavorable conditions.</p>`,
          },
        ],
        quiz: [
          {
            id: '5-2-q1',
            question: 'What is the difference between a "trading strategy" and a "trading plan"?',
            options: [
              'They are the same thing',
              'A strategy defines entry/exit rules; a plan is a comprehensive document covering strategy, risk management, routines, personal rules, and contingencies',
              'A strategy is for beginners; a plan is for professionals',
              'A strategy is written; a plan is mental',
            ],
            correctIndex: 1,
            explanation:
              'A strategy is a subset of a trading plan. The strategy tells you HOW to trade (entry/exit rules). The plan tells you how to BE a trader — encompassing risk management, daily routines, personal rules, emotional safeguards, and contingency protocols.',
          },
          {
            id: '5-2-q2',
            question: 'In the pre-trade checklist, what should you do if even ONE condition is not met?',
            options: [
              'Take the trade but with a smaller position',
              'Take the trade if at least half the conditions pass',
              'Journal the near-miss and look for a trade with all conditions met',
              'Don\'t take the trade — all conditions must be true',
            ],
            correctIndex: 3,
            explanation:
              'The pre-trade checklist is binary: all conditions must pass or you don\'t trade. "Close enough" is how discipline erodes. If one condition fails, the setup isn\'t valid according to your plan, and taking it would be breaking your own rules.',
          },
          {
            id: '5-2-q3',
            question: 'Why should you NOT trade when you haven\'t slept well?',
            options: [
              'Poor sleep impairs judgment, reaction time, and emotional regulation — leading to impulsive decisions',
              'Because the markets are different at night',
              'Because brokers can detect sleep-deprived traders',
              'Sleep has no effect on trading performance',
            ],
            correctIndex: 0,
            explanation:
              'Sleep deprivation impairs cognitive function, decision-making, and emotional regulation — all critical for trading. Studies show that being awake for 24 hours impairs judgment as much as a blood alcohol level of 0.10%. Trading tired leads to impulsive, emotional decisions.',
          },
          {
            id: '5-2-q4',
            question: 'After 3 consecutive winning trades, what does the recommended trading plan suggest?',
            options: [
              'Increase your position size to maximize the streak',
              'Take a bonus trade outside your normal strategy',
              'Take a 30-minute break to avoid euphoria-driven decisions',
              'Stop trading for the rest of the week to protect profits',
            ],
            correctIndex: 2,
            explanation:
              'After 3 consecutive wins, taking a 30-minute break helps prevent euphoria from distorting your judgment. Winning streaks can create overconfidence, leading to bigger positions, marginal setups, and ultimately giving back the gains.',
          },
        ],
      },

      // ── Lesson 5-3 ─────────────────────────────────────────
      {
        id: '5-3',
        levelId: 5,
        title: 'Process Over Outcome',
        description:
          'Learn to judge your trading by whether you followed your rules, not by whether individual trades made money.',
        readTime: '7 min',
        sections: [
          {
            heading: 'The Process Mindset',
            content: `
<p>Here's a counterintuitive truth: <strong>a winning trade can be a bad trade, and a losing trade can be a good trade</strong>. What determines whether a trade was "good" or "bad" is not whether it made money — it's whether you followed your process.</p>
<p>Consider two traders:</p>
<ul>
  <li><strong>Trader A</strong> breaks all their rules — no setup, no stop loss, 5% risk — and happens to make $500 on the trade. Result: profit. Quality: terrible. This trader just got rewarded for gambling, and they'll do it again until it destroys them.</li>
  <li><strong>Trader B</strong> follows every rule perfectly — clear setup, proper position size, stop loss in place — and loses $50 when the stop is hit. Result: loss. Quality: excellent. This trader executed their edge correctly, and if they keep doing this, they will be profitable over time.</li>
</ul>
<p>Trader A is on the path to ruin. Trader B is on the path to consistency. The outcome of a single trade is largely random — your edge only manifests over many trades. But the <em>process</em> is within your control on every single trade.</p>
<p>This is the most important mindset shift in all of trading: <strong>judge yourself by your process, not your P&L</strong>.</p>`,
          },
          {
            heading: 'The Discipline Compound Effect',
            content: `
<p>Discipline doesn't show dramatic results on any single day. But over weeks, months, and years, it compounds into something extraordinary.</p>
<p>Imagine two traders starting with $5,000 and the same strategy (55% win rate, 1:2 R:R, 1% risk per trade):</p>
<ul>
  <li><strong>Trader A follows their rules 90% of the time</strong> — Occasionally doubles position size when "feeling it," sometimes enters without full confirmation, skips journaling some weeks. After 200 trades, their actual win rate drops to 48% because of the low-quality extra trades, and their average loss increases due to the oversized positions.</li>
  <li><strong>Trader B follows their rules 100% of the time</strong> — Never deviates. 1% per trade, every trade. Pre-trade checklist, every trade. Journals, every trade. After 200 trades, their actual win rate matches the backtest at 55%, and their risk per trade is consistently controlled.</li>
</ul>
<p>After 200 trades, Trader B has grown their account by approximately 30%. Trader A, despite having the same strategy and starting capital, is roughly flat or slightly negative — all because of the 10% of trades where discipline broke down.</p>
<p>That's the compound effect: small, consistent discipline produces large results over time. Small, occasional lapses erode those results.</p>`,
          },
          {
            heading: 'Measuring Process Quality',
            content: `
<p>If you're not judging yourself by P&L, what metrics should you track? Here are the most useful process metrics:</p>
<ul>
  <li><strong>Rule Compliance Rate</strong> — What percentage of your trades fully followed your strategy rules? Target: 90%+ to start, aiming for 95%+.</li>
  <li><strong>Pre-Trade Checklist Completion</strong> — Did you run the checklist before every trade? Not "I glanced at the chart" but actually went through each point? Target: 100%.</li>
  <li><strong>Journal Completion Rate</strong> — What percentage of trades were logged in your journal within 30 minutes of closing? Target: 100%.</li>
  <li><strong>Daily Limit Respect</strong> — Did you stop trading every time you hit your daily loss limit? Even once failing this metric should be a major red flag.</li>
  <li><strong>Emotional Awareness Score</strong> — Rate your emotional state 1-10 before each trade. Over time, did you avoid trading when your score was low?</li>
</ul>
<p>In your weekly review, give yourself a "Process Score" (e.g., 8/10) alongside your P&L. Track this over time. You'll notice something powerful: weeks with high process scores tend to produce better P&L over time, while weeks with low process scores tend to produce losses — regardless of market conditions.</p>`,
          },
          {
            heading: 'When You Break Your Rules',
            content: `
<p>Nobody is perfect. You will break your rules sometimes, especially early in your trading career. What matters is how you respond:</p>
<ul>
  <li><strong>Step 1: Recognize it immediately</strong> — The moment you realize you've broken a rule, acknowledge it. "I just entered without checking the economic calendar. That's a rule violation."</li>
  <li><strong>Step 2: Close or manage the trade</strong> — If you entered a trade that breaks your rules, consider closing it immediately and taking the small loss. Don't compound the violation by holding a trade you shouldn't have entered.</li>
  <li><strong>Step 3: Document it honestly</strong> — In your journal, mark this trade as a rule violation. Note which rule you broke and why. Were you bored? Distracted? Chasing? Be specific.</li>
  <li><strong>Step 4: Identify the trigger</strong> — What was the pattern that led to the violation? "I tend to break rules after lunch when I'm tired" or "I break rules most often on Fridays" or "I break rules when my last trade was a loss."</li>
  <li><strong>Step 5: Create a safeguard</strong> — Based on the trigger, add a new personal rule to your plan. "I will take a 15-minute walk after lunch before looking at charts" or "I will not trade on Fridays until my rule compliance is above 95%."</li>
</ul>
<p>The goal isn't perfection — it's <em>continuous improvement</em>. Each rule violation is feedback. Use it to make your process stronger, and over time, violations become rarer and rarer.</p>`,
          },
        ],
        quiz: [
          {
            id: '5-3-q1',
            question: 'A trader breaks all their rules, uses no stop loss, risks 5% of their account — and makes $500 profit. How should this trade be evaluated?',
            options: [
              'As an excellent trade because it made money',
              'As a neutral trade — profit is profit',
              'As a terrible trade because the process was wrong, regardless of the profitable outcome',
              'It doesn\'t matter as long as the weekly P&L is positive',
            ],
            correctIndex: 0,
            explanation:
              'Wait — this was a TERRIBLE trade, despite the profit! The correct answer highlights that judging by outcome alone is misleading. A profitable trade taken without rules is gambling that happened to work. The trader was rewarded for bad behavior, making them likely to repeat it until it causes a devastating loss.',
          },
          {
            id: '5-3-q2',
            question: 'What is the "discipline compound effect"?',
            options: [
              'The way discipline gets easier after the first month',
              'A mathematical formula for calculating lot sizes',
              'Small, consistent rule-following that compounds into dramatically better results over hundreds of trades',
              'The effect of compounding profits in your account',
            ],
            correctIndex: 2,
            explanation:
              'The discipline compound effect means that consistently following your rules on every trade — even when it feels unnecessary — compounds into significantly better results over time. A 10% lapse in discipline can erase the edge that 90% compliance would have produced.',
          },
          {
            id: '5-3-q3',
            question: 'What is the most important "process metric" to track?',
            options: [
              'Number of trades per day',
              'Total account profit this month',
              'Time spent watching charts',
              'Rule Compliance Rate — the percentage of trades that fully followed your strategy rules',
            ],
            correctIndex: 3,
            explanation:
              'Rule Compliance Rate is the most important process metric because it directly measures whether you\'re executing your edge. A high win rate means nothing if you\'re breaking rules to get it. A high compliance rate ensures your backtest results translate to live trading.',
          },
          {
            id: '5-3-q4',
            question: 'When you catch yourself violating a trading rule mid-trade, what should you do first?',
            options: [
              'Ignore it and hope the trade works out',
              'Acknowledge the violation immediately and consider closing or properly managing the trade',
              'Close the trade completely and never trade again',
              'Add to the position to compensate',
            ],
            correctIndex: 1,
            explanation:
              'The correct first step is to acknowledge the violation immediately and take corrective action — which usually means closing the trade and taking the small loss. Holding a rule-breaking trade compounds the error. Then document it, identify the trigger, and create a safeguard.',
          },
        ],
      },

      // ── Lesson 5-4 ─────────────────────────────────────────
      {
        id: '5-4',
        levelId: 5,
        title: 'When to Step Away',
        description:
          'Recognize the signs of tilt, understand mandatory breaks, and learn to identify the warning signs of trading addiction.',
        readTime: '7 min',
        sections: [
          {
            heading: 'What Is Tilt?',
            content: `
<p><strong>Tilt</strong> is a term borrowed from poker that describes a state of emotional and mental compromise where you can no longer make rational decisions. When you're on tilt, you know what you should do, but your emotions override your logic.</p>
<p>Tilt can be triggered by:</p>
<ul>
  <li><strong>Losing streaks</strong> — Three or more losses in a row create frustration that builds with each loss.</li>
  <li><strong>A single large loss</strong> — Especially if caused by a news event or something "unfair." The anger at the market can be overwhelming.</li>
  <li><strong>Missing a big move</strong> — You didn't take the trade, watched it go 200 pips in your predicted direction, and now you're furious at yourself.</li>
  <li><strong>External stress</strong> — Relationship problems, work stress, financial pressure, lack of sleep — any of these can pre-load you for tilt.</li>
  <li><strong>Winning streaks</strong> — Euphoria-driven tilt is less obvious but equally dangerous. Overconfidence makes you sloppy.</li>
</ul>
<p>The danger of tilt is that it feels like heightened awareness — "I'm more focused now, I'm determined to fix this." In reality, your decision-making is severely impaired. Studies show that emotional stress reduces prefrontal cortex activity (the rational brain) and increases amygdala activity (the reactive, fight-or-flight brain). You're literally making decisions with the wrong part of your brain.</p>`,
          },
          {
            heading: 'The Mandatory Break Protocol',
            content: `
<p>Having pre-defined break rules removes the decision from your impaired, emotional self. Here's a graduated break protocol:</p>
<ul>
  <li><strong>2 consecutive losses:</strong> Take a 30-minute break. Stand up, walk around, drink water. Do not look at charts during this break.</li>
  <li><strong>3 consecutive losses (daily limit):</strong> Done for the day. Close your trading platform. Do something completely unrelated to trading.</li>
  <li><strong>3 losing days in a row:</strong> Take the next day completely off. No charts, no analysis, no "just checking." Full reset.</li>
  <li><strong>Weekly loss limit hit (6%):</strong> Stop trading until next Monday. Use the remaining days for education, backtesting on a demo account, or simply resting.</li>
  <li><strong>Maximum drawdown hit (15-20% from peak):</strong> Take a full week off. When you return, trade on a demo account for at least 1 week before going live again. Review your entire strategy and plan.</li>
</ul>
<p>These breaks are not punishment — they are <strong>protection</strong>. The market will be there when you come back. Your capital might not be if you trade through tilt.</p>`,
          },
          {
            heading: 'The Cooling Period',
            content: `
<p>A <strong>cooling period</strong> is a deliberate pause between the moment you identify a potential trade and the moment you execute it. It's a mini-break that applies to every trade, not just after losses.</p>
<p>Here's how it works: When you see a potential setup, instead of immediately clicking "Buy" or "Sell," wait 60-120 seconds. During this pause:</p>
<ul>
  <li>Run through your pre-trade checklist</li>
  <li>Check the economic calendar one more time</li>
  <li>Ask yourself: "Am I trading this because it meets my rules, or because I'm bored/excited/angry/FOMO?"</li>
  <li>Calculate your exact position size (if you haven't already)</li>
  <li>Take three deep breaths</li>
</ul>
<p>This simple practice eliminates a huge percentage of impulsive trades. Many times, after the 60-second cooling period, you'll realize the setup isn't as clean as it looked in the heat of the moment, and you'll walk away. That walk-away is worth money — every bad trade you don't take is money saved.</p>
<p>Some traders go further and use a physical ritual: they stand up, walk to a specific spot in the room, and review their checklist there before returning to their desk to execute. The physical movement breaks the spell of screen-induced impulse.</p>`,
          },
          {
            heading: 'Signs of Trading Addiction',
            content: `
<p>Trading can become addictive. The variable rewards (random wins and losses), the adrenaline, and the constant stimulation create a psychological pattern similar to gambling addiction. Here are warning signs to watch for:</p>
<ul>
  <li><strong>Trading for excitement</strong> — You open trades not because of a setup but because you crave the thrill. The chart is your slot machine.</li>
  <li><strong>Inability to stop</strong> — You blow past your daily loss limit, telling yourself "just one more." You trade through breaks you know you should take.</li>
  <li><strong>Hiding losses</strong> — You avoid telling your partner or friends how much you've lost. You lie about your results or minimize the damage.</li>
  <li><strong>Trading with money you can't afford to lose</strong> — Using rent money, emergency funds, or borrowed money to fund your trading account.</li>
  <li><strong>Neglecting responsibilities</strong> — Work, relationships, health, and sleep suffer because you're constantly watching charts or thinking about trades.</li>
  <li><strong>Emotional dependence</strong> — You feel empty, anxious, or depressed on weekends when markets are closed. You need the "fix" of being in a trade.</li>
  <li><strong>Chasing losses with deposits</strong> — After blowing an account, immediately depositing more money to "win it back" instead of pausing to reassess.</li>
</ul>
<p>If you recognize three or more of these signs in yourself, <strong>stop trading immediately</strong> and seek support. Talk to someone you trust. Consider speaking with a professional counselor. Many countries have gambling helplines that also assist people with trading addiction.</p>
<p>Trading should enhance your life, not consume it. If it's causing more stress than it's worth, the bravest and smartest thing you can do is step away.</p>`,
          },
        ],
        quiz: [
          {
            id: '5-4-q1',
            question: 'What is "tilt" in trading?',
            options: [
              'A type of chart pattern',
              'A technical indicator',
              'A strategy for volatile markets',
              'A state of emotional compromise where emotions override rational decision-making',
            ],
            correctIndex: 3,
            explanation:
              'Tilt is an emotional state where your logic is overridden by frustration, anger, or euphoria. During tilt, you know what you should do but can\'t make yourself do it — your decisions come from the reactive part of your brain rather than the rational part.',
          },
          {
            id: '5-4-q2',
            question: 'After 3 consecutive losing days, what does the recommended break protocol suggest?',
            options: [
              'Increase position size to recover losses faster',
              'Take the next day completely off — no charts, no analysis, full reset',
              'Switch to a different strategy immediately',
              'Trade on a lower timeframe for faster results',
            ],
            correctIndex: 1,
            explanation:
              'After 3 losing days, the protocol recommends a full day off with no charts, no analysis, and no "just checking." This break allows your mind to reset and prevents the compounding of poor decisions that often follows extended losing periods.',
          },
          {
            id: '5-4-q3',
            question: 'What is a "cooling period" before a trade?',
            options: [
              'Waiting for the market to close before deciding',
              'Taking a vacation before starting to trade',
              'A deliberate 60-120 second pause between seeing a setup and executing it, used to run your checklist and check your emotional state',
              'Waiting for a pullback in price before entering',
            ],
            correctIndex: 2,
            explanation:
              'A cooling period is a short, intentional pause (60-120 seconds) between seeing a potential trade and executing it. During this time, you run your checklist, verify the setup, and check your emotional state. It eliminates many impulsive trades.',
          },
          {
            id: '5-4-q4',
            question: 'Which of these is a warning sign of trading addiction?',
            options: [
              'Taking breaks after losing streaks',
              'Following your trading plan consistently',
              'Keeping detailed journal records',
              'Being unable to stop trading after hitting your daily loss limit, hiding losses from loved ones, or trading with money you can\'t afford to lose',
            ],
            correctIndex: 0,
            explanation:
              'Signs of trading addiction include inability to stop despite hitting limits, hiding losses, trading with money you can\'t afford to lose, neglecting responsibilities, and emotional dependence on being in trades. If you recognize these signs, stop trading and seek support.',
          },
        ],
      },
    ],
  },

  // ════════════════════════════════════════════════════════════
  // LEVEL 6 — ADVANCED GROWTH
  // ════════════════════════════════════════════════════════════
  {
    id: 6,
    title: 'Advanced Growth',
    subtitle: 'Refine your edge with advanced techniques and scale your trading career',
    accentColor: 'neon-cyan',
    lessons: [
      // ── Lesson 6-1 ─────────────────────────────────────────
      {
        id: '6-1',
        levelId: 6,
        title: 'Multi-Timeframe Analysis',
        description:
          'Master the 3-timeframe framework, learn top-down analysis, and understand how confluence across timeframes creates high-probability setups.',
        readTime: '9 min',
        sections: [
          {
            heading: 'The 3-Timeframe Framework',
            content: `
<p>Multi-timeframe analysis is the practice of looking at the same instrument across multiple timeframes to get a complete picture before making a decision. The <strong>3-timeframe framework</strong> is the most practical approach:</p>
<ul>
  <li><strong>Higher Timeframe (HTF) — The Trend</strong> — This tells you the big-picture direction. You trade in this direction. Typical choices: Weekly for position traders, Daily for swing traders, H4 for day traders.</li>
  <li><strong>Middle Timeframe (MTF) — The Setup</strong> — This is where you identify specific trade setups. You look for patterns, levels, and signals here. Typical choices: Daily for position traders, H4 for swing traders, H1 for day traders.</li>
  <li><strong>Lower Timeframe (LTF) — The Entry</strong> — This is where you fine-tune your entry for the best possible price. You zoom in to time your entry precisely. Typical choices: H4 for position traders, H1 for swing traders, M15 for day traders.</li>
</ul>
<p>A common framework for day traders: <strong>Daily (trend) → H4 (setup) → H1 (entry)</strong>. For swing traders: <strong>Weekly (trend) → Daily (setup) → H4 (entry)</strong>.</p>
<p>The rule: each timeframe should be roughly <strong>4-6× the next one</strong>. Daily → H4 → H1 works (6× and 4× ratios). Daily → H1 → M5 does not (skipping H4 creates too large a gap and can give conflicting signals).</p>`,
          },
          {
            heading: 'Top-Down Analysis in Practice',
            content: `
<p><strong>Top-down analysis</strong> means you always start from the highest timeframe and work your way down. Never start from the lower timeframe — it gives you a biased, incomplete view. Here's a step-by-step example:</p>
<p><strong>Step 1: Daily Chart (The Trend)</strong></p>
<ul>
  <li>EUR/USD has been in an uptrend for 3 weeks — Higher Highs and Higher Lows</li>
  <li>Price is above the 50 EMA and 200 SMA</li>
  <li>Decision: I will <strong>only look for buy trades</strong> today</li>
</ul>
<p><strong>Step 2: H4 Chart (The Setup)</strong></p>
<ul>
  <li>Price has pulled back from the recent high and is approaching a horizontal support zone around 1.0850</li>
  <li>The 21 EMA on H4 is right at 1.0855, adding confluence</li>
  <li>Decision: I have a <strong>potential buy zone</strong> at 1.0845-1.0855</li>
</ul>
<p><strong>Step 3: H1 Chart (The Entry)</strong></p>
<ul>
  <li>Price reaches 1.0850 and forms a bullish engulfing candle on H1</li>
  <li>The 9 EMA just crossed above the 21 EMA on H1 (short-term momentum shift)</li>
  <li>Decision: <strong>Enter buy</strong> at 1.0855, SL at 1.0820 (below the support zone), TP at 1.0950 (next H4 resistance)</li>
  <li>R:R = 35 pips risk / 95 pips reward = approximately 1:2.7</li>
</ul>
<p>Notice how each timeframe adds information: the Daily gives direction, the H4 identifies the zone, and the H1 provides the precise entry trigger. This layered approach produces higher-quality trades than any single timeframe analysis.</p>`,
          },
          {
            heading: 'Understanding Confluence',
            content: `
<p><strong>Confluence</strong> is when multiple independent factors align at the same price level. The more factors that converge, the stronger the setup. Here are the types of confluence to look for:</p>
<ul>
  <li><strong>Timeframe confluence</strong> — A support level visible on both the Daily AND H4 chart is stronger than one only visible on H4.</li>
  <li><strong>Indicator confluence</strong> — Price is at a horizontal support level AND the 50 EMA AND a trendline. Three reasons to expect a bounce.</li>
  <li><strong>Pattern confluence</strong> — The Daily shows an uptrend AND the H4 shows a pullback to support AND the H1 shows a bullish candlestick pattern. Story aligns across all levels.</li>
  <li><strong>Level confluence</strong> — A round number (1.1000) aligns with a previous support/resistance level AND a Fibonacci retracement level. Multiple reasons for the level to hold.</li>
</ul>
<p>Think of each factor as a "vote." One vote (a single M15 support level) isn't very convincing. Five votes (Daily trend + H4 support + H1 bullish candle + 50 EMA + round number) is very convincing. The more votes, the higher the probability.</p>
<p>However, don't fall into the trap of requiring 10 factors to align before trading — you'll never trade. Three strong factors is usually enough. The key is quality of confluence, not quantity.</p>`,
          },
          {
            heading: 'Common Multi-Timeframe Mistakes',
            content: `
<p>Avoid these pitfalls as you implement multi-timeframe analysis:</p>
<ul>
  <li><strong>Bottom-up analysis</strong> — Starting from the M15 chart, finding a setup, and then "checking" the Daily to confirm. This is backwards — you see what you want to see. Always start from the top.</li>
  <li><strong>Analysis paralysis</strong> — Checking 6 different timeframes and finding conflicting signals on each one. Stick to exactly 3 timeframes. If the top 2 don't agree on direction, don't trade.</li>
  <li><strong>Timeframe whipsawing</strong> — Entering on the H1 but then panic-checking the M5 chart and closing because a 5-minute candle went red. Your entry was on H1 — manage the trade on H1. Don't drop to a lower timeframe after entering.</li>
  <li><strong>Ignoring the higher timeframe</strong> — Finding a beautiful buy setup on H1 while the Daily chart is in a clear downtrend. Trading against the higher timeframe trend significantly reduces your success rate.</li>
</ul>
<p>The golden rule of multi-timeframe analysis: <strong>the higher timeframe always wins</strong>. If the Daily says "bearish," no H1 buy setup is strong enough to override that. Wait for the higher timeframe to give permission, then use the lower timeframe to time your entry.</p>`,
          },
        ],
        quiz: [
          {
            id: '6-1-q1',
            question: 'In the 3-timeframe framework for day traders, what is the typical timeframe combination?',
            options: [
              'Weekly, Daily, H4',
              'Daily (trend), H4 (setup), H1 (entry)',
              'M1, M5, M15',
              'H1, M15, M1',
            ],
            correctIndex: 1,
            explanation:
              'For day traders, the standard 3-timeframe framework is Daily for identifying the overall trend, H4 for finding the setup/zone, and H1 for timing the precise entry. Each timeframe is roughly 4-6× the next, maintaining consistent scaling.',
          },
          {
            id: '6-1-q2',
            question: 'Why should you always start analysis from the highest timeframe (top-down)?',
            options: [
              'Because higher timeframes load faster on trading platforms',
              'Because lower timeframes don\'t have candlesticks',
              'Because starting from the top establishes the trend direction first, preventing bias from lower-timeframe noise',
              'Because it\'s a regulatory requirement',
            ],
            correctIndex: 2,
            explanation:
              'Top-down analysis ensures you establish the big-picture trend before looking for entries. Starting bottom-up creates confirmation bias — you find an entry on a lower timeframe and then selectively look for reasons to justify it on higher timeframes.',
          },
          {
            id: '6-1-q3',
            question: 'What is "confluence" in multi-timeframe analysis?',
            options: [
              'When multiple independent technical factors align at the same price level, increasing the probability of a setup',
              'When two charts show different information',
              'When the bid and ask prices converge',
              'When moving averages are parallel',
            ],
            correctIndex: 0,
            explanation:
              'Confluence occurs when multiple independent factors — like a support level, a moving average, a trendline, and a round number — all converge at the same price. Each factor acts as a "vote" for that level, increasing the probability that it will hold.',
          },
          {
            id: '6-1-q4',
            question: 'What is the golden rule of multi-timeframe analysis?',
            options: [
              'Always use at least 5 timeframes',
              'The lower timeframe provides the most accurate signals',
              'All timeframes are equally important',
              'The higher timeframe always wins — never trade against the higher timeframe trend',
            ],
            correctIndex: 3,
            explanation:
              'The higher timeframe always takes priority. If the Daily chart shows a clear downtrend, no H1 buy signal is strong enough to override it. The higher timeframe represents bigger players, more capital, and a more established trend that can overwhelm lower-timeframe signals.',
          },
        ],
      },

      // ── Lesson 6-2 ─────────────────────────────────────────
      {
        id: '6-2',
        levelId: 6,
        title: 'Supply & Demand Zones',
        description:
          'Learn how institutional order blocks create supply and demand zones, how to identify fresh vs. tested zones, and precise entry methods.',
        readTime: '9 min',
        sections: [
          {
            heading: 'What Are Supply and Demand Zones?',
            content: `
<p>Supply and demand zones are areas on the chart where large institutional orders were previously executed, creating imbalances between buyers and sellers. They're similar to support and resistance but with an important distinction: while S/R is typically drawn as a line, supply and demand zones are drawn as <strong>price ranges (zones)</strong> because institutional orders are filled across a range of prices, not at a single point.</p>
<p><strong>Demand Zone</strong> — An area where strong buying occurred, pushing price sharply higher. When price returns to this zone later, unfilled buy orders may still be waiting, creating buying pressure that pushes price up again. Think of it as "institutional support."</p>
<p><strong>Supply Zone</strong> — An area where strong selling occurred, pushing price sharply lower. When price returns, unfilled sell orders may create selling pressure. Think of it as "institutional resistance."</p>
<p>The concept behind these zones is that institutional traders (banks, hedge funds) can't fill their entire order at once because their orders are so large they'd move the market. They fill in stages, leaving unfilled orders at certain price levels. When price returns, those remaining orders get filled, causing the bounce.</p>
<p>For example, if a bank wants to buy $500 million worth of EUR/USD, they can't do it in one click — it would spike the price. They buy in chunks over a range (say, 1.0820 to 1.0840). That range becomes a demand zone. If they only filled 60% of their order before price moved up, the remaining 40% sits waiting at 1.0820-1.0840 for when price returns.</p>`,
          },
          {
            heading: 'Identifying Order Blocks',
            content: `
<p>An <strong>order block</strong> is the specific candle or group of candles that represent the origin of a strong move. Here's how to identify them:</p>
<p><strong>Bullish Order Block (Demand Zone):</strong></p>
<ul>
  <li>Find a sharp, impulsive move upward (multiple consecutive green candles with large bodies)</li>
  <li>The last red candle before that impulsive move up is the order block</li>
  <li>Draw a zone from the high to the low of that candle (or the cluster of candles at the base)</li>
  <li>This zone is where institutional buyers were filling their orders before the big move</li>
</ul>
<p><strong>Bearish Order Block (Supply Zone):</strong></p>
<ul>
  <li>Find a sharp, impulsive move downward</li>
  <li>The last green candle before that impulsive move down is the order block</li>
  <li>Draw a zone from the high to the low of that candle</li>
  <li>This zone is where institutional sellers were positioning</li>
</ul>
<p>Key quality filters for order blocks:</p>
<ul>
  <li><strong>The move away must be strong</strong> — A gentle drift doesn't indicate institutional involvement. Look for sharp, impulsive moves with full-bodied candles.</li>
  <li><strong>The move should break structure</strong> — The best order blocks are at the origin of moves that create new Higher Highs (for demand) or new Lower Lows (for supply).</li>
  <li><strong>Higher timeframe zones are stronger</strong> — An H4 order block is more significant than an M15 one. The most powerful zones appear on the Daily chart.</li>
</ul>`,
          },
          {
            heading: 'Fresh vs. Tested Zones',
            content: `
<p>Not all zones are created equal. The key distinction is between <strong>fresh</strong> and <strong>tested</strong> zones:</p>
<p><strong>Fresh Zone</strong> — A zone that price has NOT returned to since it was created. All the unfilled institutional orders are still waiting. This is the highest-probability zone to trade from. When price first returns to a fresh zone, the bounce is often strong and immediate.</p>
<p><strong>Tested Zone (First Retest)</strong> — A zone that price has returned to once. Some of the unfilled orders were filled on the first retest, but there may be enough remaining for another bounce. Still tradable but with lower probability than a fresh zone.</p>
<p><strong>Mitigated Zone (Multiple Tests)</strong> — A zone that price has tested 2-3+ times. Most institutional orders have been filled. The zone is "used up." <strong>Do not trade from mitigated zones</strong> — they're likely to break on the next test.</p>
<p>Practical rule: <strong>Trade fresh zones first, tested zones cautiously, and never trade mitigated zones.</strong></p>
<p>To identify fresh zones, scroll through your chart and mark zones where strong moves originated. Then check if price has returned to those zones since. If it hasn't, mark it as "fresh" and put it on your watchlist. When price approaches a fresh zone, it's time to look for entries.</p>`,
          },
          {
            heading: 'Entry Methods at Supply/Demand Zones',
            content: `
<p>Once price reaches your identified zone, you have several entry methods:</p>
<p><strong>1. Aggressive Entry (Limit Order)</strong></p>
<ul>
  <li>Place a limit order at the edge of the zone (the closest price to current market within the zone)</li>
  <li>Stop loss goes beyond the far edge of the zone + a small buffer</li>
  <li>Advantage: Best entry price, tightest stop loss, best R:R</li>
  <li>Disadvantage: Price might not respect the zone and blow through it, triggering your stop</li>
</ul>
<p><strong>2. Confirmation Entry (Candlestick Pattern)</strong></p>
<ul>
  <li>Wait for price to enter the zone AND form a rejection candle (long wick, engulfing pattern, pin bar)</li>
  <li>Enter after the confirmation candle closes</li>
  <li>Stop loss below the low of the confirmation candle</li>
  <li>Advantage: Higher win rate because you have visual confirmation of a reaction</li>
  <li>Disadvantage: Slightly worse entry price and wider stop loss, reducing R:R</li>
</ul>
<p><strong>3. Break-and-Retest Entry (Lower Timeframe)</strong></p>
<ul>
  <li>When price reaches the zone on H4, drop to the H1 or M15 chart</li>
  <li>Wait for price to create a short-term structure shift (e.g., break above a lower-timeframe resistance)</li>
  <li>Enter on the retest of that broken structure</li>
  <li>Advantage: Best confirmation, highest win rate</li>
  <li>Disadvantage: You might miss fast reversals if you're waiting for structure shifts</li>
</ul>
<p>For beginners, start with the <strong>Confirmation Entry</strong> method. It balances good R:R with reasonable confirmation. As you gain experience, you can explore aggressive entries at fresh, high-timeframe zones and lower-timeframe structure entries for more precision.</p>`,
          },
        ],
        quiz: [
          {
            id: '6-2-q1',
            question: 'What is the key difference between traditional support/resistance and supply/demand zones?',
            options: [
              'There is no difference',
              'Supply/demand zones only work on lower timeframes',
              'Supply/demand zones are drawn as price ranges (areas), not single lines, because institutional orders fill across a range of prices',
              'Support/resistance is for stocks; supply/demand is for Forex',
            ],
            correctIndex: 2,
            explanation:
              'Supply and demand zones are drawn as price ranges because institutional orders are too large to be filled at a single price. They\'re filled across a range, creating a zone of interest rather than a single line. This makes them more accurate representations of where institutional activity occurred.',
          },
          {
            id: '6-2-q2',
            question: 'What is a "bullish order block" on a chart?',
            options: [
              'Any green candle on the chart',
              'The last red candle(s) before a sharp impulsive move upward — representing where institutional buyers filled their orders',
              'A pattern that only appears on weekly charts',
              'A cluster of candles with equal highs',
            ],
            correctIndex: 0,
            explanation:
              'A bullish order block is the last bearish (red) candle or cluster of candles at the base of a strong impulsive move upward. It represents the price range where institutional buyers accumulated their positions before the big move.',
          },
          {
            id: '6-2-q3',
            question: 'Which type of supply/demand zone has the highest probability of holding?',
            options: [
              'A zone tested 3 or more times',
              'A zone that has been broken and retested',
              'A mitigated zone',
              'A fresh zone — one that price has NOT returned to since it was created',
            ],
            correctIndex: 3,
            explanation:
              'Fresh zones have the highest probability because all unfilled institutional orders are still waiting. Each time a zone is tested, orders get filled and the zone weakens. By the third test, most orders have been filled and the zone is likely to break.',
          },
          {
            id: '6-2-q4',
            question: 'For beginners, which entry method at supply/demand zones is recommended?',
            options: [
              'Aggressive limit orders at the edge of every zone',
              'Always waiting for lower-timeframe structure shifts',
              'Entering blindly whenever price enters any zone',
              'Confirmation entry — waiting for a rejection candle pattern within the zone before entering',
            ],
            correctIndex: 1,
            explanation:
              'The Confirmation Entry method (waiting for a rejection candle in the zone) is recommended for beginners because it balances a good entry price with visual confirmation that the zone is being respected. This reduces the number of times you\'ll be stopped out at zones that fail to hold.',
          },
        ],
      },

      // ── Lesson 6-3 ─────────────────────────────────────────
      {
        id: '6-3',
        levelId: 6,
        title: 'Statistical Edge Validation',
        description:
          'Use statistics to prove whether your strategy has a genuine edge, including Monte Carlo simulation, profit factor, and confidence intervals.',
        readTime: '10 min',
        sections: [
          {
            heading: 'What Is a Statistical Edge?',
            content: `
<p>A <strong>statistical edge</strong> is a quantifiable advantage that, over a large number of trades, produces a positive expected value. In simpler terms: if you execute your strategy perfectly over hundreds of trades, you end up with more money than you started with.</p>
<p>The key formula is <strong>Expectancy</strong>:</p>
<p><em>Expectancy = (Win Rate × Average Win) - (Loss Rate × Average Loss)</em></p>
<p>Let's calculate a real example:</p>
<ul>
  <li>Win Rate: 55% (you win 55 out of 100 trades)</li>
  <li>Loss Rate: 45% (you lose 45 out of 100 trades)</li>
  <li>Average Win: $100 (1:2 R:R, risking $50 per trade)</li>
  <li>Average Loss: $50</li>
  <li>Expectancy = (0.55 × $100) - (0.45 × $50) = $55 - $22.50 = <strong>$32.50 per trade</strong></li>
</ul>
<p>This means that on average, every trade you take is "worth" $32.50. Over 200 trades, you'd expect to make approximately $6,500 (before spreads and commissions). That's your edge.</p>
<p>But here's the critical question: <strong>is your edge real, or is it just luck?</strong> You had a good 6 months — but was it because your strategy works, or because you happened to trade during favorable conditions? This is where statistical validation becomes essential.</p>`,
          },
          {
            heading: 'Monte Carlo Simulation',
            content: `
<p>A <strong>Monte Carlo simulation</strong> takes your actual trade results and randomly reshuffles the order thousands of times to see how your strategy performs under different sequences. This answers a crucial question: "What's the worst that could realistically happen?"</p>
<p>Here's how it works in practice:</p>
<ul>
  <li>You have 200 historical trades with their actual results (wins and losses).</li>
  <li>The simulation randomly reorders these 200 trades and calculates the resulting equity curve, maximum drawdown, and final balance.</li>
  <li>It repeats this process 1,000 to 10,000 times, each time with a different random order.</li>
  <li>The result: a distribution of possible outcomes showing the best, worst, median, and various percentile scenarios.</li>
</ul>
<p>Why does the order matter? Because even with a winning strategy, the sequence of wins and losses varies. You might get 8 losses in a row at the start (devastating drawdown) or 8 wins in a row (smooth equity curve). Monte Carlo shows you the range of possibilities.</p>
<p>What to look for in Monte Carlo results:</p>
<ul>
  <li><strong>95th percentile maximum drawdown</strong> — In 95% of simulations, the worst drawdown was less than this number. If it's 35%, you should be prepared for a 35% drawdown at some point. Can you handle that emotionally and financially?</li>
  <li><strong>5th percentile final balance</strong> — Even in the worst 5% of scenarios, this is where your balance ends up. If it's still profitable, your edge is robust.</li>
  <li><strong>Probability of ruin</strong> — What percentage of simulations ended in a blown account? If this is above 2%, your strategy needs work.</li>
</ul>`,
          },
          {
            heading: 'Profit Factor and Key Metrics',
            content: `
<p>Beyond expectancy, several metrics help you evaluate your strategy's robustness:</p>
<p><strong>Profit Factor</strong> = Total Gross Profit ÷ Total Gross Loss</p>
<ul>
  <li>A profit factor above <strong>1.0</strong> means you're profitable overall.</li>
  <li>Below <strong>1.2</strong> — Marginal. Commissions and spreads might erase the edge. Risky to trade live.</li>
  <li><strong>1.2 to 1.5</strong> — Decent edge. Viable for live trading with careful execution.</li>
  <li><strong>1.5 to 2.0</strong> — Strong edge. You have a clear advantage.</li>
  <li>Above <strong>2.0</strong> — Excellent, but verify it's not curve-fitted. Very few strategies sustain 2.0+ long term.</li>
</ul>
<p><strong>Sharpe Ratio</strong> = (Average Return - Risk-Free Rate) ÷ Standard Deviation of Returns</p>
<ul>
  <li>Measures risk-adjusted return. A Sharpe ratio above 1.0 is good, above 2.0 is excellent.</li>
  <li>A strategy that makes 5% per month with low volatility (Sharpe 2.5) is better than one making 10% per month with wild swings (Sharpe 0.8).</li>
</ul>
<p><strong>Maximum Drawdown</strong> — The largest peak-to-trough decline in your equity curve. If your account went from $10,000 to $7,500 before recovering, your max drawdown was 25%. As a rule of thumb, be prepared for your future max drawdown to be <strong>1.5-2× your historical max drawdown</strong>.</p>
<p><strong>Recovery Factor</strong> = Total Net Profit ÷ Maximum Drawdown. A recovery factor above 3 indicates a robust strategy. Below 1 means your total profit doesn't justify the risk of the drawdowns.</p>`,
          },
          {
            heading: 'Confidence Intervals and Sample Size',
            content: `
<p>How many trades do you need to be confident your edge is real and not just luck? This is where <strong>confidence intervals</strong> and <strong>sample size</strong> come in.</p>
<p>The statistical reality:</p>
<ul>
  <li><strong>20 trades</strong> — Your win rate could easily be 15-20% different from your true win rate. With a "true" 55% win rate, you might observe anywhere from 35% to 75% over 20 trades. This is why 20 trades proves nothing.</li>
  <li><strong>50 trades</strong> — Slightly better, but still a wide margin of error (~±10-14%). Your observed 60% win rate might actually be 46-74%.</li>
  <li><strong>100 trades</strong> — Now you're getting somewhere. Margin of error narrows to ~±8-10%. If you're showing 55% over 100 trades, your true win rate is likely between 45-65%.</li>
  <li><strong>200+ trades</strong> — Statistically meaningful. If your strategy is profitable over 200+ trades, there's a high probability (95%+) that you have a genuine edge.</li>
</ul>
<p>The key takeaway: <strong>don't make strategy decisions based on small samples</strong>. If you have a losing week (5 trades), that tells you almost nothing about your strategy's viability. Don't abandon a backtested strategy because of 10 bad trades. And don't declare a strategy "proven" because of 15 good trades.</p>
<p>Think in hundreds of trades, not dozens. Your edge is a statistical tendency that manifests over large samples — like a casino. A casino loses on individual bets regularly, but over millions of bets, the house edge guarantees profitability. Your trading strategy works the same way.</p>`,
          },
        ],
        quiz: [
          {
            id: '6-3-q1',
            question: 'What is "expectancy" in trading?',
            options: [
              'The average dollar amount you expect to win or lose per trade over a large number of trades',
              'How much you expect the market to move tomorrow',
              'Your confidence level before entering a trade',
              'The expected win rate of any trading strategy',
            ],
            correctIndex: 0,
            explanation:
              'Expectancy = (Win Rate × Average Win) - (Loss Rate × Average Loss). It tells you how much each trade is "worth" on average over many trades. A positive expectancy means your strategy has a genuine edge; negative means you\'ll lose money over time.',
          },
          {
            id: '6-3-q2',
            question: 'What does a Monte Carlo simulation do for traders?',
            options: [
              'It predicts which direction the market will move',
              'It calculates the perfect entry point',
              'It generates fake trade results for practice',
              'It randomly reshuffles your trade results thousands of times to show the range of possible outcomes, including worst-case drawdowns',
            ],
            correctIndex: 3,
            explanation:
              'Monte Carlo simulation takes your actual trade results and randomly reorders them thousands of times to show what could happen with different sequences of wins and losses. This reveals your probable worst-case drawdown and the overall robustness of your edge.',
          },
          {
            id: '6-3-q3',
            question: 'What is considered a "strong" profit factor?',
            options: [
              '0.5 to 0.8',
              '1.5 to 2.0',
              'Exactly 1.0',
              'Above 10.0',
            ],
            correctIndex: 1,
            explanation:
              'A profit factor of 1.5 to 2.0 indicates a strong edge — your gross profits are 1.5 to 2× your gross losses. Below 1.2 is marginal (commissions may erase the edge), and above 2.0 is excellent but should be verified for curve fitting.',
          },
          {
            id: '6-3-q4',
            question: 'How many trades do you need for statistically meaningful results?',
            options: [
              '10 trades is enough',
              '25 trades provides certainty',
              '200+ trades for high statistical confidence',
              '5 trades if they\'re all winners',
            ],
            correctIndex: 2,
            explanation:
              'You need 200+ trades for statistically meaningful results with high confidence (95%+). With fewer trades, the margin of error is too wide — a 20-trade sample could show 60% win rate when the true rate is anywhere from 35-80%. Large samples reveal the true edge.',
          },
        ],
      },

      // ── Lesson 6-4 ─────────────────────────────────────────
      {
        id: '6-4',
        levelId: 6,
        title: 'Scaling Your Trading',
        description:
          'Explore paths to grow your trading career — multiple accounts, signal copying, prop firm challenges, and the power of compound growth.',
        readTime: '9 min',
        sections: [
          {
            heading: 'When Are You Ready to Scale?',
            content: `
<p>Scaling means increasing the capital you trade with and the income you generate from trading. But scaling prematurely is one of the fastest ways to blow up. You're ready to scale <strong>only</strong> when:</p>
<ul>
  <li>You have a strategy with a verified statistical edge over <strong>200+ trades</strong> (backtest and live combined)</li>
  <li>Your live trading results are consistent over at least <strong>6 months</strong> (not just 1-2 good months)</li>
  <li>Your rule compliance rate is above <strong>90%</strong> consistently</li>
  <li>You have survived and recovered from a significant drawdown (15%+) without abandoning your plan</li>
  <li>Your emotions are under control — you don't revenge trade, you don't overtrade, you respect your limits</li>
</ul>
<p>If all five of these are true, you've built the foundation for scaling. If even one is shaky, keep working at your current level until it's solid. <strong>Scaling a broken process just creates bigger problems.</strong></p>
<p>There are several paths to scale, and they're not mutually exclusive. Let's explore each one.</p>`,
          },
          {
            heading: 'Multiple Accounts and Signal Copying',
            content: `
<p><strong>Multiple accounts</strong> let you diversify your risk and take advantage of different broker conditions:</p>
<ul>
  <li>Trade your primary strategy on Account A with Broker 1</li>
  <li>Run a second strategy (different instruments or timeframe) on Account B with Broker 2</li>
  <li>Keep a separate account for higher-risk or experimental trades, completely isolated from your main capital</li>
</ul>
<p>The key rule: each account should be treated as independent with its own risk rules. Never move money between accounts to "save" a trade or add to a losing position.</p>
<p><strong>Signal copying (Trade copying)</strong> is the ability to automatically replicate your trades from one account to one or more other accounts. This is how many traders scale their income:</p>
<ul>
  <li>You trade your strategy manually on your master account</li>
  <li>A copier tool replicates every trade to your other personal accounts, or to accounts of friends/family/investors who've agreed to follow your signals</li>
  <li>This multiplies your results without multiplying your workload</li>
</ul>
<p>Signal copying is also how many signal-providing services work. If you develop a strong, consistent track record, you can offer your signals as a service — but only after you've proven your edge over a significant period. No one should copy a trader with less than 12 months of live, verified results.</p>`,
          },
          {
            heading: 'Prop Firm Challenges',
            content: `
<p><strong>Proprietary trading firms (prop firms)</strong> offer one of the most exciting paths to scaling: they let you trade their capital in exchange for a share of the profits (typically 70-90% goes to you). You don't risk your own money beyond the challenge fee.</p>
<p>How it works:</p>
<ul>
  <li><strong>Step 1: Pay a challenge fee</strong> — Usually $100 to $500, depending on the account size (ranging from $10,000 to $200,000+).</li>
  <li><strong>Step 2: Pass the evaluation</strong> — You must reach a profit target (usually 8-10%) without exceeding a maximum drawdown (usually 5-10% daily, 8-12% total). This evaluation typically has 2 phases, each lasting 30-60 days.</li>
  <li><strong>Step 3: Receive a funded account</strong> — Once you pass, you trade the firm's capital. Profits are split (commonly 80/20 in your favor).</li>
  <li><strong>Step 4: Scale up</strong> — Many firms offer scaling plans: hit consistent profit targets, and they increase your account size — from $50,000 to $100,000 to $200,000+.</li>
</ul>
<p>The math is compelling: Trading a $100,000 funded account with 80% profit split, making just 3% per month = $2,400/month to you. With a $200,000 account, that's $4,800/month. All without risking your own capital beyond the initial challenge fee.</p>
<p>Important cautions:</p>
<ul>
  <li>Choose reputable firms — research reviews and verify they actually pay out profits</li>
  <li>The challenge rules (daily drawdown limits, time constraints) are strict — your risk management must be airtight</li>
  <li>Don't rush it — failing a $300 challenge three times costs $900. Pass once with proper preparation instead</li>
</ul>`,
          },
          {
            heading: 'The Power of Compound Growth',
            content: `
<p><strong>Compound growth</strong> is the most powerful force in long-term trading. Instead of withdrawing all profits, you reinvest a portion, allowing your account to grow exponentially over time.</p>
<p>Let's look at the numbers with a $5,000 starting account, making a conservative 3% per month:</p>
<ul>
  <li><strong>After 12 months:</strong> $5,000 × 1.03^12 = approximately <strong>$7,128</strong> (+42.6%)</li>
  <li><strong>After 24 months:</strong> approximately <strong>$10,163</strong> (doubled your money)</li>
  <li><strong>After 36 months:</strong> approximately <strong>$14,488</strong> (nearly tripled)</li>
  <li><strong>After 60 months (5 years):</strong> approximately <strong>$29,457</strong> (nearly 6×)</li>
</ul>
<p>3% per month might not sound exciting, but compounded over time, it's extraordinary. The key is <strong>consistency</strong> — not having any months where you lose 20% and wipe out months of progress. This is why risk management is the foundation of everything.</p>
<p>A practical compounding strategy:</p>
<ul>
  <li>Reinvest 70% of profits, withdraw 30% as income</li>
  <li>As your account grows, your 1% risk per trade grows too — $50 risk on a $5,000 account becomes $100 risk on $10,000, without changing any rules</li>
  <li>Set quarterly milestones rather than monthly — smooths out variance</li>
  <li>If you hit a drawdown, your position sizes automatically shrink (1% of a smaller balance = smaller risk), which is a built-in safety mechanism</li>
</ul>
<p>Use the compounding calculator below to see how your account could grow with different monthly returns and reinvestment rates. Remember: consistency beats intensity. A steady 2% per month beats alternating between +10% and -8%.</p>`,
            widgetId: 'compounding-calculator',
          },
        ],
        quiz: [
          {
            id: '6-4-q1',
            question: 'What is the minimum recommended track record before considering scaling your trading?',
            options: [
              '2 winning weeks',
              '1 month of profits',
              '1 good trade',
              'At least 6 months of consistent live results with 200+ trades showing a verified edge',
            ],
            correctIndex: 3,
            explanation:
              'Scaling requires a solid foundation: at least 6 months of consistent live results, 200+ trades with a verified edge, high rule compliance, and proven emotional control. Scaling prematurely amplifies problems — both the losses AND the psychological pressure.',
          },
          {
            id: '6-4-q2',
            question: 'How do prop firm challenges typically work?',
            options: [
              'They give you free money with no conditions',
              'You pay a challenge fee, meet a profit target without exceeding drawdown limits, then trade their capital for a profit split (typically 70-90% to you)',
              'You must deposit $100,000 of your own money first',
              'They require a finance degree to participate',
            ],
            correctIndex: 1,
            explanation:
              'Prop firm challenges require a fee ($100-$500), after which you must hit a profit target (8-10%) without exceeding drawdown limits. Pass the evaluation and you trade the firm\'s capital (often $25,000-$200,000+), keeping 70-90% of profits.',
          },
          {
            id: '6-4-q3',
            question: 'Starting with $5,000 and making 3% per month (compounded), approximately how much would your account be worth after 2 years?',
            options: [
              '$5,360',
              '$6,800',
              'Approximately $10,163 — roughly doubled',
              '$50,000',
            ],
            correctIndex: 0,
            explanation:
              'With 3% monthly compounding: $5,000 × 1.03^24 ≈ $10,163. That\'s doubling your money in 2 years through the power of compound growth. The key is consistency — maintaining steady returns month after month without large drawdowns.',
          },
          {
            id: '6-4-q4',
            question: 'Why does a compounding strategy automatically reduce risk during drawdowns?',
            options: [
              'Because the broker reduces your leverage during losses',
              'Because you should manually lower your risk after losses',
              'Because 1% risk calculated on a smaller balance means smaller position sizes, acting as a built-in safety mechanism',
              'It doesn\'t — risk stays the same',
            ],
            correctIndex: 2,
            explanation:
              'When you always risk 1% of your current balance, a drawdown automatically shrinks your position sizes. If your $10,000 account drops to $8,000, your 1% risk drops from $100 to $80 per trade. This built-in mechanism slows losses during bad periods and is one of the most elegant features of percentage-based position sizing.',
          },
        ],
      },
    ],
  },
];
