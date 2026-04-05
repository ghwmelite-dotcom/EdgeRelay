import { create } from 'zustand';
import { api } from '@/lib/api';
import { ACADEMY_CURRICULUM } from '@/data/academy-curriculum';

export interface LessonProgress {
  lesson_id: string;
  level_id: number;
  status: 'not_started' | 'in_progress' | 'completed';
  quiz_score: number | null;
  quiz_passed: boolean;
  completed_at: string | null;
}

export interface QuizAnswer {
  questionId: string;
  selected: number;
}

export interface QuizResult {
  score: number;
  passed: boolean;
  correct: number;
  total: number;
  results: Array<{ questionId: string; selected: number; correctIndex: number; isCorrect: boolean }>;
}

interface AcademyState {
  progress: Record<string, LessonProgress>;
  loading: boolean;
  error: string | null;

  fetchProgress: () => Promise<void>;
  updateLessonStatus: (lessonId: string, levelId: number, status: string) => Promise<void>;
  submitQuiz: (lessonId: string, levelId: number, answers: QuizAnswer[]) => Promise<QuizResult | null>;
  isLevelUnlocked: (levelId: number) => boolean;
  getLevelProgress: (levelId: number) => { completed: number; total: number };
}

export const useAcademyStore = create<AcademyState>()((set, get) => ({
  progress: {},
  loading: false,
  error: null,

  fetchProgress: async () => {
    set({ loading: true });
    const res = await api.get<{ progress: LessonProgress[] }>('/academy/progress');
    if (res.data) {
      const map: Record<string, LessonProgress> = {};
      for (const p of res.data.progress) {
        map[p.lesson_id] = { ...p, quiz_passed: !!p.quiz_passed };
      }
      set({ progress: map, loading: false });
    } else {
      set({ loading: false, error: res.error?.message || 'Failed to load progress' });
    }
  },

  updateLessonStatus: async (lessonId, levelId, status) => {
    await api.post('/academy/progress', { lessonId, levelId, status });
    set((state) => ({
      progress: {
        ...state.progress,
        [lessonId]: {
          ...state.progress[lessonId],
          lesson_id: lessonId,
          level_id: levelId,
          status: status as LessonProgress['status'],
          quiz_score: state.progress[lessonId]?.quiz_score ?? null,
          quiz_passed: state.progress[lessonId]?.quiz_passed ?? false,
          completed_at: state.progress[lessonId]?.completed_at ?? null,
        },
      },
    }));
  },

  submitQuiz: async (lessonId, levelId, answers) => {
    const res = await api.post<QuizResult>('/academy/quiz', { lessonId, levelId, answers });
    if (res.data) {
      set((state) => ({
        progress: {
          ...state.progress,
          [lessonId]: {
            lesson_id: lessonId,
            level_id: levelId,
            status: res.data!.passed ? 'completed' : (state.progress[lessonId]?.status || 'in_progress'),
            quiz_score: Math.max(res.data!.score, state.progress[lessonId]?.quiz_score ?? 0),
            quiz_passed: res.data!.passed || (state.progress[lessonId]?.quiz_passed ?? false),
            completed_at: res.data!.passed ? new Date().toISOString() : (state.progress[lessonId]?.completed_at ?? null),
          },
        },
      }));
      return res.data;
    }
    return null;
  },

  isLevelUnlocked: (levelId) => {
    if (levelId <= 1) return true;
    const { progress } = get();
    const prevLevel = ACADEMY_CURRICULUM.find((l) => l.id === levelId - 1);
    if (!prevLevel) return false;
    return prevLevel.lessons.every((lesson) => progress[lesson.id]?.quiz_passed);
  },

  getLevelProgress: (levelId) => {
    const { progress } = get();
    const level = ACADEMY_CURRICULUM.find((l) => l.id === levelId);
    if (!level) return { completed: 0, total: 0 };
    const completed = level.lessons.filter((l) => progress[l.id]?.quiz_passed).length;
    return { completed, total: level.lessons.length };
  },
}));
