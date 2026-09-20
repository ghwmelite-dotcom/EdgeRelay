import {
  COURSE_LESSONS,
  COURSE_LEVELS,
  ADAPTED_PLAYBOOK_PAGES,
  MARKET_ADAPTATION, GOLD_RANGE_LESSONS, GOLD_RANGE_LEVELS,
} from "@edgerelay/shared";
export interface AcademyQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}
export interface LessonSection {
  heading: string;
  content: string;
  widgetId?: string;
}
export interface AcademyLesson {
  id: string;
  levelId: number;
  title: string;
  description: string;
  readTime: string;
  sections: LessonSection[];
  quiz: AcademyQuestion[];
  diagram?: string;
  chapter?: number;
}
export interface AcademyLevel {
  id: number;
  title: string;
  subtitle: string;
  accentColor: string;
  lessons: AcademyLesson[];
}
const escape = (s: string) =>
  s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
export const ACADEMY_CURRICULUM: AcademyLevel[] = COURSE_LEVELS.map(
  (title, i) => ({
    id: i + 1,
    title,
    subtitle: "Three Strategies · market-specific UTC sessions",
    accentColor: [
      "neon-cyan",
      "neon-green",
      "neon-amber",
      "neon-purple",
      "neon-cyan",
      "neon-green",
    ][i]!,
    lessons: COURSE_LESSONS.filter((l) => l.levelId === i + 1).map((l) => {
      const p = ADAPTED_PLAYBOOK_PAGES[l.page]!;
      return {
        id: l.id,
        levelId: l.levelId,
        title: p.title.replace("Pre-window", "Pre-session"),
        description: p.lead,
        readTime: "6 min + course chapter",
        diagram: p.diagram,
        chapter: l.chapter,
        sections: [
          {
            heading: "Market-specific timing takes precedence",
            content:
              "<p>" +
              escape(MARKET_ADAPTATION) +
              "</p><p>Record the UTC anchor, venue close, practice cutoff and pre-session interval before the session. The stock video and original diagrams retain their original example times. A missing or closed pre-session interval makes that setup unavailable. Keep one UTC risk-day boundary across all accounts; an overnight session does not reset the entry limit.</p>",
          },
          ...p.steps.map(([heading, content]) => ({
            heading,
            content: "<p>" + escape(content) + "</p>",
          })),
          {
            heading: "Practice boundary",
            content: "<p>" + escape(p.watch) + "</p>",
          },
        ],
        quiz: l.quiz,
      };
    }),
  }),
);

export const GOLD_RANGE_CURRICULUM: AcademyLevel[] = GOLD_RANGE_LEVELS.map((title, index) => ({
 id: index + 1, title, subtitle: 'TMPro Range Breakout · UTC only', accentColor: 'neon-amber',
 lessons: GOLD_RANGE_LESSONS.filter(l => l.levelId === index + 1).map(l => ({
  ...l, readTime: '4 min', sections: l.sections.map(s => ({heading: s.heading, content: '<p>' + escape(s.text) + '</p>'})),
 })),
}));
export function curriculumFor(courseId = 'three-strategies'): AcademyLevel[] {
 return courseId === 'gold-range-utc' ? GOLD_RANGE_CURRICULUM : ACADEMY_CURRICULUM;
}
export function courseForLesson(lessonId: string): string {
 return GOLD_RANGE_LESSONS.some(l => l.id === lessonId) ? 'gold-range-utc' : 'three-strategies';
}
