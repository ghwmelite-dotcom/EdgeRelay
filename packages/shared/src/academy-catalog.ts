import { COURSE_LESSONS } from './three-strategies/academy.js';
import { GOLD_RANGE_LESSONS } from './gold-range-academy.js';
export const ACADEMY_LESSONS = [
 ...COURSE_LESSONS.map(lesson => ({...lesson, courseId: 'three-strategies'})),
 ...GOLD_RANGE_LESSONS.map(lesson => ({...lesson, courseId: 'gold-range-utc'})),
];
export function prerequisiteLessons(lessonId: string) {
 const lesson = ACADEMY_LESSONS.find(item => item.id === lessonId);
 return lesson ? ACADEMY_LESSONS.filter(item => item.courseId === lesson.courseId && item.levelId < lesson.levelId) : [];
}
