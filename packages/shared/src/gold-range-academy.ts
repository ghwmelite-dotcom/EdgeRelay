import type { CourseQuestion } from './three-strategies/academy.js';
export interface GoldRangeLesson {
 id: string; levelId: number; title: string; description: string;
 sections: Array<{heading: string; text: string}>; quiz: CourseQuestion[];
}
export const GOLD_RANGE_COURSE = {
  "id": "gold-range-utc",
  "title": "TMPro Range Breakout",
  "tag": "The Worlds Simpliest Strategy",
  "source": "MZITOH FX · MFG 2.2 · supplied transcript (truncated at 30 minutes)"
} as const;
export const GOLD_RANGE_LEVELS = ['Clock and range', 'Confirmation and entry', 'Risk and testing'];
export const GOLD_RANGE_LESSONS: GoldRangeLesson[] = [
  {
    "id": "gr-v1-01",
    "levelId": 1,
    "title": "One market, one clock",
    "description": "Understand the source and the fixed UTC schedule.",
    "sections": [
      {
        "heading": "The setup in one sentence",
        "text": "For gold (XAUUSD), mark the 10:00–11:00 UTC range and wait for a later M15 breakout. Measure the completed breakout body: below 100 pips, use the standard next-open entry; at 100 pips or more, wait for at least a half-body retracement before the next-open entry."
      },
      {
        "heading": "Source and course identity",
        "text": "This course is adapted from the supplied MZITOH FX transcript, where the speaker calls the method MFG 2.2. The Worlds Simpliest Strategy is our course tag, not a verified performance claim. This is a separate course from Three Strategies and is not attributed to Scarface Trades."
      },
      {
        "heading": "UTC only",
        "text": "Use 10:00–11:00 UTC every test day. Display and record candle timestamps in UTC, including broker-to-UTC conversion. Do not shift this window to the London open or to a broker opening bell. The source demonstrates gold; other instruments would be separate, unvalidated adaptations."
      }
    ],
    "quiz": [
      {
        "id": "gr-v1-01-q1",
        "question": "Which range window does this course use?",
        "options": [
          "10:00–11:00 UTC",
          "09:30–10:30 UTC",
          "The broker opening hour"
        ],
        "correctIndex": 0,
        "explanation": "The fixed reference window is 10:00–11:00 UTC."
      },
      {
        "id": "gr-v1-01-q2",
        "question": "Which market is demonstrated in the transcript?",
        "options": [
          "Every market",
          "Gold",
          "USDJPY"
        ],
        "correctIndex": 1,
        "explanation": "The source method is demonstrated on gold. Other markets need separate testing."
      }
    ]
  },
  {
    "id": "gr-v1-02",
    "levelId": 1,
    "title": "Draw the four-candle box",
    "description": "Freeze the high and low after the fourth candle closes.",
    "sections": [
      {
        "heading": "Four completed candles",
        "text": "Use M15 candles opening at 10:00, 10:15, 10:30 and 10:45 UTC. At 11:00, all four are complete. The 11:00 candle is outside the reference range."
      },
      {
        "heading": "Two lines",
        "text": "The range high is the highest high, including wicks, across those four candles. The range low is the lowest low. Freeze both boundaries at 11:00; do not move them to include later candles."
      },
      {
        "heading": "Data check for our testing",
        "text": "Use one provider and verify all four timestamped candles exist. Missing candles or an unresolved clock conversion mean an incomplete example, not a range to guess. Label this data-quality check as our testing procedure."
      }
    ],
    "quiz": [
      {
        "id": "gr-v1-02-q1",
        "question": "Which candle is excluded from the reference range?",
        "options": [
          "10:15 UTC",
          "10:45 UTC",
          "11:00 UTC"
        ],
        "correctIndex": 2,
        "explanation": "The range ends at 11:00 UTC; that opening candle belongs to the next interval."
      },
      {
        "id": "gr-v1-02-q2",
        "question": "What happens to the range after 11:00 UTC?",
        "options": [
          "It stays fixed",
          "It expands with each candle",
          "It follows the entry price"
        ],
        "correctIndex": 0,
        "explanation": "The four completed reference candles define fixed boundaries."
      }
    ]
  },
  {
    "id": "gr-v1-03",
    "levelId": 2,
    "title": "Wait for the close",
    "description": "Tell a completed breakout from a wick excursion.",
    "sections": [
      {
        "heading": "M15 confirmation",
        "text": "After 11:00 UTC, a buy setup breaks above the range high; a sell setup breaks below the range low. Wait for the M15 candle to finish. A wick outside with a close back inside is not confirmation."
      },
      {
        "heading": "An unresolved source detail",
        "text": "The transcript says the candle should close beyond the boundary with its body. It does not unambiguously distinguish a close outside from an entire body outside. Record a chosen interpretation before a test batch and keep separate results for each interpretation. Do not select whichever interpretation makes an individual example win."
      },
      {
        "heading": "How to read our diagrams",
        "text": "The realistic constructed OHLC charts illustrate the close-outside interpretation of the initial breakout. Declare that interpretation before a test batch; the source does not unambiguously resolve full-body versus close-only. Green candles close up, red candles close down, and the hollow final marker shows an entry open only. Prices are invented, with an explicit example pip convention; these are not historical market results. The separate user-confirmed 100+ pip body rule requires a half-body retracement; there is no M1 entry."
      }
    ],
    "quiz": [
      {
        "id": "gr-v1-03-q1",
        "question": "A wick crosses the range but the candle closes inside. What does the source support?",
        "options": [
          "Enter immediately",
          "Wait; no confirmed breakout",
          "Switch to M1"
        ],
        "correctIndex": 1,
        "explanation": "A wick-only excursion does not satisfy the completed breakout requirement."
      },
      {
        "id": "gr-v1-03-q2",
        "question": "How should the body ambiguity be handled in testing?",
        "options": [
          "Choose after seeing the result",
          "Ignore the ambiguity",
          "Declare the interpretation before the batch"
        ],
        "correctIndex": 2,
        "explanation": "Keep each declared interpretation consistent and its results separate."
      }
    ]
  },
  {
    "id": "gr-v1-04",
    "levelId": 2,
    "title": "Choose the entry: immediate or retraced",
    "description": "Measure the breakout body before choosing the next-open entry.",
    "sections": [
      {
        "heading": "Standard entry: body below 100 pips",
        "text": "After a valid M15 close above the range high (buy) or below the range low (sell), measure the absolute open-to-close body in verified broker pips. If it is less than 100 pips, the standard entry is at the next M15 open. Do not include either wick in the body measurement."
      },
      {
        "heading": "Long body: 100 pips or more",
        "text": "User-confirmed course rule: do not enter immediately when the breakout body is 100 pips or more. Wait for price to retrace at least 50% of that breakout body. The reference is the completed breakout candle, not the range width and not the high-to-low candle length. Body midpoint = (breakout open + breakout close) / 2."
      },
      {
        "heading": "Buy and sell use the same rule",
        "text": "For a buy, wait for price to move down from the breakout close to the body midpoint or lower. For a sell, wait for price to move up from the breakout close to the midpoint or higher. The retracement must happen after the breakout candle is complete; its own wick cannot satisfy the wait. Keep the reference candle and its midpoint fixed."
      },
      {
        "heading": "Then use the next M15 open",
        "text": "Once a later M15 candle has traded to at least that midpoint, let that candle finish and consider entry at the following M15 open, provided the setup still satisfies the rules. This operational reading uses a midpoint touch, not an added requirement to close beyond the midpoint. It does not mean enter automatically after the second candle: the retracement must actually happen. If price does not align with the rules, let the trade go."
      },
      {
        "heading": "UTC example",
        "text": "A 120-pip breakout body requires at least a 60-pip retracement from its close. If the 11:00–11:15 UTC candle is the breakout and the 11:15–11:30 candle provides that retracement, the next possible entry is 11:30 UTC. With no qualifying retracement, there is no entry at 11:30. A sub-100-pip standard breakout can instead allow 11:15. These times illustrate the earliest sequence, not daily trade signals."
      },
      {
        "heading": "Keep the risk distances fixed",
        "text": "The course keeps an 80-pip stop and a preselected 160-pip or 240-pip target measured from the actual entry. A delayed entry changes the absolute price levels, not those distances. Do not widen the stop or chase a move to force a trade. Verify the broker pip convention and record actual executable prices and costs. This rule is taught for demo testing, not automatic execution."
      }
    ],
    "quiz": [
      {
        "id": "gr-v1-04-q1",
        "question": "For a valid breakout body smaller than 100 pips, when is the standard entry?",
        "options": [
          "At its first wick outside",
          "At the next M15 candle open",
          "After a mandatory M1 retest"
        ],
        "correctIndex": 1,
        "explanation": "The entry follows the completed M15 confirmation."
      },
      {
        "id": "gr-v1-04-q2",
        "question": "For a valid sub-100-pip breakout in the first post-range candle, when is the earliest possible entry?",
        "options": [
          "11:15 UTC, if the first later candle qualifies",
          "11:00 UTC regardless of price",
          "10:45 UTC"
        ],
        "correctIndex": 0,
        "explanation": "The 11:00–11:15 candle must first complete and qualify."
      },
      {
        "id": "gr-v1-04-q3",
        "question": "The completed breakout body is exactly 100 pips. What happens?",
        "options": [
          "Enter at once",
          "Wait for at least a 50-pip retracement, then the next M15 open",
          "Widen the stop to 100 pips"
        ],
        "correctIndex": 1,
        "explanation": "100 pips is included in the delayed-entry branch. Half of 100 is 50."
      },
      {
        "id": "gr-v1-04-q4",
        "question": "A breakout body is 120 pips. Price retraces 59 pips. Is it enough?",
        "options": [
          "Yes",
          "No; at least 60 pips is required",
          "Only if it is the second candle"
        ],
        "correctIndex": 1,
        "explanation": "The minimum is half the body: 120 / 2 = 60 pips. Do not round a short retracement up."
      },
      {
        "id": "gr-v1-04-q5",
        "question": "Which measurement determines whether the body is 100+ pips?",
        "options": [
          "The entire range width",
          "High to low, including wicks",
          "Absolute open-to-close distance in verified broker pips"
        ],
        "correctIndex": 2,
        "explanation": "Use the body, not wick-to-wick size or range width."
      },
      {
        "id": "gr-v1-04-q6",
        "question": "The market never retraces half the long breakout body. What should you do?",
        "options": [
          "Let the trade go",
          "Enter after exactly two candles",
          "Increase risk to catch up"
        ],
        "correctIndex": 0,
        "explanation": "No qualifying retracement means no entry. The candle count alone never replaces the rule."
      }
    ]
  },
  {
    "id": "gr-v1-05",
    "levelId": 3,
    "title": "Define the 80-pip risk",
    "description": "Understand the source distances before using price or money.",
    "sections": [
      {
        "heading": "Source distances",
        "text": "The source specifies an 80-pip stop and targets of 160 pips (2R) or 240 pips (3R). For a buy, the stop is below entry and targets above. For a sell, the stop is above entry and targets below. In this course, measure those distances from the actual entry, including a delayed entry; absolute price levels move with the fill."
      },
      {
        "heading": "Pips are not a universal gold price unit",
        "text": "Verify what one pip means for the exact broker contract before converting distances. Price distance = stated pips × verified price units per pip. Tick size, tick value, lot size, spread and fees are separate inputs. The speaker’s 0.01-lot / $8-risk example is not a universal sizing rule."
      },
      {
        "heading": "Keep target variants separate",
        "text": "Choose 2R or 3R before a test batch, and record the choice. The supplied text names TP1 and TP2 but does not define partial-exit percentages. It also mentions break-even without giving its rule. Do not invent those mechanics or silently import them from another course."
      },
      {
        "heading": "Do not force the stop to fit",
        "text": "The source mentions the stop often sitting beyond the breakout candle, but repeatedly specifies 80 pips. The user-confirmed 100+ pip body exception adds a wait for at least a half-body retracement. It does not authorize a wider stop. If the setup still does not fit the rules, skip it. Costs affect net reward."
      }
    ],
    "quiz": [
      {
        "id": "gr-v1-05-q1",
        "question": "What is the source stop and 2R target?",
        "options": [
          "80 and 160 pips",
          "160 and 80 pips",
          "80 and 240 pips"
        ],
        "correctIndex": 0,
        "explanation": "160 / 80 = 2R; 240 / 80 = 3R."
      },
      {
        "id": "gr-v1-05-q2",
        "question": "Before translating 80 pips into an XAUUSD price distance, what is needed?",
        "options": [
          "A universal $8 assumption",
          "A verified contract pip convention",
          "A larger lot size"
        ],
        "correctIndex": 1,
        "explanation": "Gold pip conventions and monetary values must be verified for the exact contract."
      }
    ]
  },
  {
    "id": "gr-v1-06",
    "levelId": 3,
    "title": "Run a repeatable demo test",
    "description": "Keep source rules, test choices and results separate.",
    "sections": [
      {
        "heading": "Write the protocol first",
        "text": "Record the instrument/provider, UTC conversion, body interpretation, verified pip definition and target variant. Also declare maximum entries, re-entry/opposite-breakout handling, entry deadline, forced-close time, per-trade risk, daily loss cap and news policy. These missing details are test choices, not rules supplied by the speaker."
      },
      {
        "heading": "Keep a complete journal",
        "text": "For every chronological example record UTC date, four range candles, range high/low, confirmation time, breakout body in pips, midpoint, retracement time and depth, standard or delayed next-open entry, stop and target, lot size and money at risk, costs, exit, net R, skips and screenshots. Do not fill data gaps from another provider or omit losing days."
      },
      {
        "heading": "Homework: one buy, one sell, one non-entry",
        "text": "Annotate a standard entry, a 100+ pip breakout with a valid half-body retracement, and a skipped long-body breakout that never retraces enough. Include buy and sell examples. Then use a declared protocol for demo forward observation. Homework practices recognition; passing a quiz does not establish profitability."
      },
      {
        "heading": "Evidence boundary",
        "text": "The supplied transcript cuts off at 30 minutes during the buy explanation. No complete verified trade log is included. Break-even, partial exits and several daily controls remain unspecified. This course sends no orders. No martingale or grid; use demo testing before any live-capital decision."
      }
    ],
    "quiz": [
      {
        "id": "gr-v1-06-q1",
        "question": "Are the missing daily controls established source rules?",
        "options": [
          "Yes",
          "No; declare them as test choices",
          "Only on winning days"
        ],
        "correctIndex": 1,
        "explanation": "Label additions explicitly rather than attributing them to the source."
      },
      {
        "id": "gr-v1-06-q2",
        "question": "What does passing this course establish?",
        "options": [
          "A profitable edge",
          "Permission for live capital",
          "Understanding of the taught rules and their limits"
        ],
        "correctIndex": 2,
        "explanation": "Profitability requires separate evidence; a quiz measures learning."
      }
    ]
  }
];
export const GOLD_RANGE_TEACHING_CONTEXT = `SECOND ACADEMY COURSE: TMPro Range Breakout, tagged The Worlds Simpliest Strategy. Source: supplied MZITOH FX MFG 2.2 transcript (truncated at 30 minutes), supplemented by the user-confirmed long-body rule. Separate from Three Strategies: gold/XAUUSD, M15 only, reference candles opening 10:00/10:15/10:30/10:45 UTC, freeze high/low at 11:00 UTC. After a valid completed breakout, measure abs(close-open) in verified broker pips, excluding wicks. Below 100 pips: standard next-M15-open entry. At least 100 pips: do not enter immediately; wait for a later candle to retrace at least half the breakout body. Buy: later low at/below (open+close)/2; sell: later high at/above that midpoint. The breakout candle's own wick is not a later retracement. Let the qualifying retracement candle complete, then consider next-M15-open entry only if rules still align. This is the course's explicit touch-based operational reading, not an extra midpoint-close requirement. It is not an automatic second-candle entry. Never chase; let nonconforming trades go. Keep 80-pip stop and selected 160/240-pip target distances from actual entry, not original absolute levels. No widened stop. Full-body vs close-only initial breakout remains ambiguous in source; keep a declared test interpretation. Broker pip convention must be verified. Break-even, partial allocations, entry limits, re-entry, daily cutoffs and news policy need an explicit test protocol. Never import Three Strategies rules or Scarface Trades media into this course. Demo testing, no martingale/grid, no invented profitability.`;
