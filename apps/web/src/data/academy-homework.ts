import { COURSE_LEVELS } from "@edgerelay/shared";
export interface HomeworkAssignment {
  id: string;
  levelId: number;
  title: string;
  description: string;
  objective: string;
  verificationMethod: "quiz";
  requiredCount: number;
  icon: string;
  accentColor: string;
  tips: string[];
}
export const HOMEWORK_ASSIGNMENTS: HomeworkAssignment[] = COURSE_LEVELS.map(
  (title, i) => ({
    id: "ts-hw-" + (i + 1),
    levelId: i + 1,
    title,
    description:
      "Read both source lessons and pass their rule-compliance quizzes. No live trade is required.",
    objective:
      "Pass both quizzes. Practice examples and forward-test results require separate review.",
    verificationMethod: "quiz",
    requiredCount: 2,
    icon: "BookOpen",
    accentColor: "neon-cyan",
    tips: [
      "Explain the reason for each skip.",
      "Save practice evidence before considering live capital.",
      "Do not take extra trades to complete coursework.",
    ],
  }),
);
