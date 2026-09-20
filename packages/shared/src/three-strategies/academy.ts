import { PLAYBOOK_PAGES } from "./playbook.js";
export const COURSE_VIDEO = {
  title: "The Simplest Way To Start Day Trading In 2026 (Full Course)",
  owner: "Scarface Trades",
  channel: "https://www.youtube.com/@ScarfaceTrades",
  duration: 2648,
  path: "/academy-media/course",
} as const;
export interface CourseQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}
export interface CourseLesson {
  id: string;
  levelId: number;
  page: number;
  chapter: number;
  quiz: CourseQuestion[];
}
export const COURSE_LEVELS = [
  "Source and preparation",
  "Risk and opening range",
  "Retest and previous day",
  "Previous day and pre-window",
  "Pre-window and management",
  "Arithmetic and evidence",
];
export const COURSE_LESSONS: CourseLesson[] = [
  {
    id: "ts-v1-01",
    levelId: 1,
    page: 0,
    chapter: 0,
    quiz: [
      {
        id: "ts-v1-01-q1",
        question: "How many strategies do you follow in one practice session?",
        options: [
          "One chosen before the session",
          "All three until one wins",
          "Any strategy after a loss",
        ],
        correctIndex: 0,
        explanation:
          "Choose one strategy in advance; do not switch after a failed attempt.",
      },
      {
        id: "ts-v1-01-q2",
        question: "Does the course establish a profitable FX or BTC edge?",
        options: [
          "Yes, automatically",
          "No; the cross-market adaptation needs testing",
          "Yes, after twenty examples",
        ],
        correctIndex: 1,
        explanation:
          "Examples explain mechanics; they do not validate performance.",
      },
    ],
  },
  {
    id: "ts-v1-02",
    levelId: 1,
    page: 1,
    chapter: 1392,
    quiz: [
      {
        id: "ts-v1-02-q1",
        question: "When is a 15m swing confirmed?",
        options: [
          "While the middle candle is forming",
          "After its right-hand neighbour closes",
          "At the first wick",
        ],
        correctIndex: 1,
        explanation:
          "The strict three-candle pivot must have a completed right-hand neighbour.",
      },
      {
        id: "ts-v1-02-q2",
        question: "What if the latest highs rise but lows fall?",
        options: ["Buy", "Sell", "Skip"],
        correctIndex: 2,
        explanation:
          "Both pairs must agree. Mixed, equal or missing structure is a skip.",
      },
    ],
  },
  {
    id: "ts-v1-03",
    levelId: 2,
    page: 2,
    chapter: 925,
    quiz: [
      {
        id: "ts-v1-03-q1",
        question: "What is the maximum practice risk including costs?",
        options: [
          "2% of balance",
          "0.5% of current demo equity",
          "Whatever margin allows",
        ],
        correctIndex: 1,
        explanation:
          "Budget risk from current demo equity and include the cost reserve.",
      },
      {
        id: "ts-v1-03-q2",
        question:
          "The required stop violates the broker minimum distance. What happens?",
        options: ["Widen it", "Skip", "Double the position"],
        correctIndex: 1,
        explanation:
          "The fixed stop is one actual tick beyond the trigger candle; do not invent a different stop.",
      },
    ],
  },
  {
    id: "ts-v1-04",
    levelId: 2,
    page: 3,
    chapter: 790,
    quiz: [
      {
        id: "ts-v1-04-q1",
        question: "When can the first opening-range breakout be confirmed?",
        options: [
          "Anchor + 5 minutes",
          "Anchor + 10 minutes",
          "Anchor + 1 minute",
        ],
        correctIndex: 1,
        explanation:
          "Freeze the first five complete session minutes; the next complete session-aligned 5m candle ends ten minutes after the anchor.",
      },
      {
        id: "ts-v1-04-q2",
        question: "A wick crosses ORH but closes inside. Is it a breakout?",
        options: ["Yes", "Only if large", "No"],
        correctIndex: 2,
        explanation:
          "A strict completed 5m close beyond the range is required.",
      },
    ],
  },
  {
    id: "ts-v1-05",
    levelId: 3,
    page: 4,
    chapter: 952,
    quiz: [
      {
        id: "ts-v1-05-q1",
        question: "When does the retest clock start?",
        options: [
          "At the first breakout wick",
          "After the 5m breakout closes",
          "Before the range freezes",
        ],
        correctIndex: 1,
        explanation: "Only the next five completed 1m candles are eligible.",
      },
      {
        id: "ts-v1-05-q2",
        question: "A retest closes exactly at the edge. What happens?",
        options: [
          "Enter",
          "Cancel immediately",
          "Consume one candle; neither trigger nor cancel",
        ],
        correctIndex: 2,
        explanation: "Equality is not a reclaim and is not a wrong-side close.",
      },
    ],
  },
  {
    id: "ts-v1-06",
    levelId: 3,
    page: 5,
    chapter: 1021,
    quiz: [
      {
        id: "ts-v1-06-q1",
        question: "For FX, which day defines the previous-day range?",
        options: [
          "Any chart provider day",
          "The previous complete broker D1 with recorded cutoff",
          "Always UTC midnight",
        ],
        correctIndex: 1,
        explanation:
          "Record the broker server cutoff and exclude incomplete Sunday or holiday stubs.",
      },
      {
        id: "ts-v1-06-q2",
        question:
          "The selected session open equals the previous-day high. What happens?",
        options: ["Skip", "Buy immediately", "Use another strategy"],
        correctIndex: 0,
        explanation:
          "This practice setup requires the open strictly inside PDH/PDL.",
      },
    ],
  },
  {
    id: "ts-v1-07",
    levelId: 4,
    page: 6,
    chapter: 1136,
    quiz: [
      {
        id: "ts-v1-07-q1",
        question:
          "A buy retest closes below the selected high before a trigger. What happens?",
        options: [
          "Wait indefinitely",
          "Cancel this strategy for the day",
          "Short immediately",
        ],
        correctIndex: 1,
        explanation: "A wrong-side close cancels the first attempt.",
      },
      {
        id: "ts-v1-07-q2",
        question:
          "A valid trigger finishes just as the declared UTC cutoff is reached. What happens?",
        options: ["Enter", "Skip", "Use a smaller size"],
        correctIndex: 1,
        explanation: "No new entry at or after the declared UTC cutoff.",
      },
    ],
  },
  {
    id: "ts-v1-08",
    levelId: 4,
    page: 7,
    chapter: 1203,
    quiz: [
      {
        id: "ts-v1-08-q1",
        question: "Which pre-window bars are included?",
        options: [
          "The declared pre-session start through the session anchor, exclusive",
          "Bars after the session anchor",
          "Any thirty minutes with no recorded boundary",
        ],
        correctIndex: 0,
        explanation:
          "Freeze the complete declared pre-session interval; exclude the session-opening bar. If no valid pre-session feed exists, this setup is unavailable.",
      },
      {
        id: "ts-v1-08-q2",
        question: "What if part of the pre-window feed is missing?",
        options: [
          "Estimate it",
          "Skip until complete verified data is available",
          "Use another provider to fill gaps",
        ],
        correctIndex: 1,
        explanation: "Do not manufacture levels or mix providers.",
      },
    ],
  },
  {
    id: "ts-v1-09",
    levelId: 5,
    page: 8,
    chapter: 1263,
    quiz: [
      {
        id: "ts-v1-09-q1",
        question:
          "The selected session open gaps outside the pre-window. What happens?",
        options: ["Chase the move", "Skip", "Double the retest window"],
        correctIndex: 1,
        explanation: "The gap-outside rule invalidates this practice setup.",
      },
      {
        id: "ts-v1-09-q2",
        question:
          "No trigger appears in the next five 1m candles. What happens?",
        options: ["Expire the attempt", "Wait another five", "Enter at market"],
        correctIndex: 0,
        explanation: "The first expiry ends the chosen strategy for the day.",
      },
    ],
  },
  {
    id: "ts-v1-10",
    levelId: 5,
    page: 9,
    chapter: 1980,
    quiz: [
      {
        id: "ts-v1-10-q1",
        question: "May you move the stop to break-even or trail it?",
        options: [
          "Yes after 1R",
          "No in this fixed practice version",
          "Only after a loss",
        ],
        correctIndex: 1,
        explanation:
          "Management is fixed stop, fixed 2R gross target, or the declared UTC cutoff exit.",
      },
      {
        id: "ts-v1-10-q2",
        question:
          "Both stop and target are touched within one historical candle with unknown sequence. How is it recorded?",
        options: [
          "Target first",
          "Stop first and mark ambiguous",
          "Ignore the candle",
        ],
        correctIndex: 1,
        explanation:
          "Use the conservative stop-first convention and retain the ambiguity flag.",
      },
    ],
  },
  {
    id: "ts-v1-11",
    levelId: 6,
    page: 10,
    chapter: 925,
    quiz: [
      {
        id: "ts-v1-11-q1",
        question:
          "A $50 budget and $210 loss per lot permit what quantity with a 0.01 lot step?",
        options: ["0.24", "0.23", "0.25"],
        correctIndex: 1,
        explanation:
          "Floor 50 / 210 to 0.23 lots, reserving $48.30 including costs.",
      },
      {
        id: "ts-v1-11-q2",
        question: "Does a 2R gross price target guarantee 2R net profit?",
        options: ["Yes", "No, costs reduce the net result", "Only for gold"],
        correctIndex: 1,
        explanation:
          "Fees, spread, slippage and funding affect net results; example specs are not broker defaults.",
      },
    ],
  },
  {
    id: "ts-v1-12",
    levelId: 6,
    page: 11,
    chapter: 1375,
    quiz: [
      {
        id: "ts-v1-12-q1",
        question:
          "A relevant major release is exactly ten minutes away. May you enter?",
        options: ["Yes", "No", "Only a small position"],
        correctIndex: 1,
        explanation: "The blackout includes both ten-minute boundaries.",
      },
      {
        id: "ts-v1-12-q2",
        question: "What does completing twenty practice examples establish?",
        options: [
          "A guaranteed profitable strategy",
          "Readiness for live capital",
          "Practice evidence to review before untouched testing and demo forward observation",
        ],
        correctIndex: 2,
        explanation:
          "Counts alone do not prove an edge; include failures and skips and preserve chronological evidence.",
      },
    ],
  },
];
export { PLAYBOOK_PAGES };
