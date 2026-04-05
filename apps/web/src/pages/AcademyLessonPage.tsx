import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, CheckCircle2, XCircle, BookOpen, Brain,
  ChevronRight, Loader2, RotateCcw, GraduationCap,
} from 'lucide-react';
import { useAcademyStore, type QuizAnswer, type QuizResult } from '@/stores/academy';
import { InlineAITutor } from '@/components/academy/InlineAITutor';
import { ACADEMY_CURRICULUM, type AcademyLesson, type AcademyLevel } from '@/data/academy-curriculum';
import { PositionSizeCalculator } from '@/components/academy/widgets/PositionSizeCalculator';
import { RiskRewardVisualizer } from '@/components/academy/widgets/RiskRewardVisualizer';
import { CompoundingCalculator } from '@/components/academy/widgets/CompoundingCalculator';
import { CandlestickQuiz } from '@/components/academy/widgets/CandlestickQuiz';
import { SessionTimezoneMap } from '@/components/academy/widgets/SessionTimezoneMap';
import { MovingAverageCrossover } from '@/components/academy/widgets/MovingAverageCrossover';
import { EmotionCheckIn } from '@/components/academy/widgets/EmotionCheckIn';

const WIDGET_REGISTRY: Record<string, React.ComponentType> = {
  'position-size-calculator': PositionSizeCalculator,
  'risk-reward-visualizer': RiskRewardVisualizer,
  'compounding-calculator': CompoundingCalculator,
  'candlestick-quiz': CandlestickQuiz,
  'session-timezone-map': SessionTimezoneMap,
  'moving-average-crossover': MovingAverageCrossover,
  'emotion-check-in': EmotionCheckIn,
};

const ACCENT_MAP: Record<string, string> = {
  'neon-cyan': '#00e5ff', 'neon-green': '#00ff9d', 'neon-amber': '#ffb800',
  'neon-purple': '#b18cff', 'neon-red': '#ff3d57',
};

function findLessonAndLevel(lessonId: string): { lesson: AcademyLesson; level: AcademyLevel } | null {
  for (const level of ACADEMY_CURRICULUM) {
    const lesson = level.lessons.find((l) => l.id === lessonId);
    if (lesson) return { lesson, level };
  }
  return null;
}

function getNextLesson(currentId: string): string | null {
  const allLessons = ACADEMY_CURRICULUM.flatMap((l) => l.lessons);
  const idx = allLessons.findIndex((l) => l.id === currentId);
  return idx >= 0 && idx < allLessons.length - 1 ? allLessons[idx + 1].id : null;
}

export function AcademyLessonPage() {
  const { lessonId } = useParams<{ lessonId: string }>();
  const navigate = useNavigate();
  const { progress, fetchProgress, updateLessonStatus, submitQuiz, isLevelUnlocked } = useAcademyStore();

  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});
  const [quizResult, setQuizResult] = useState<QuizResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [tutorOpen, setTutorOpen] = useState(false);
  const [tutorPrompt, setTutorPrompt] = useState<string | undefined>();

  const found = lessonId ? findLessonAndLevel(lessonId) : null;

  useEffect(() => {
    fetchProgress();
    window.scrollTo(0, 0);
  }, [lessonId, fetchProgress]);

  // Mark as in_progress when opened
  useEffect(() => {
    if (found && !progress[found.lesson.id]?.quiz_passed) {
      updateLessonStatus(found.lesson.id, found.level.id, 'in_progress');
    }
  }, [found?.lesson.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!found) {
    return (
      <div className="page-enter flex flex-col items-center justify-center py-20">
        <BookOpen size={40} className="text-terminal-muted/30 mb-4" />
        <h2 className="text-lg font-bold text-white">Lesson not found</h2>
        <Link to="/academy" className="mt-4 text-sm text-neon-cyan hover:underline">Back to Academy</Link>
      </div>
    );
  }

  const { lesson, level } = found;
  const accent = ACCENT_MAP[level.accentColor] || '#00e5ff';
  const locked = !isLevelUnlocked(level.id);
  const lp = progress[lesson.id];
  const isPassed = lp?.quiz_passed;
  const nextLessonId = getNextLesson(lesson.id);

  if (locked) {
    return (
      <div className="page-enter flex flex-col items-center justify-center py-20">
        <GraduationCap size={40} className="text-terminal-muted/30 mb-4" />
        <h2 className="text-lg font-bold text-white">Level {level.id} is locked</h2>
        <p className="text-sm text-terminal-muted mt-1">Complete all lessons in Level {level.id - 1} first</p>
        <Link to="/academy" className="mt-4 text-sm text-neon-cyan hover:underline">Back to Academy</Link>
      </div>
    );
  }

  const handleQuizSubmit = async () => {
    if (lesson.quiz.some((q) => quizAnswers[q.id] === undefined)) return;
    setSubmitting(true);
    const answers: QuizAnswer[] = lesson.quiz.map((q) => ({ questionId: q.id, selected: quizAnswers[q.id] }));
    const result = await submitQuiz(lesson.id, level.id, answers);
    if (result) setQuizResult(result);
    setSubmitting(false);
  };

  const handleRetry = () => {
    setQuizAnswers({});
    setQuizResult(null);
  };

  const allAnswered = lesson.quiz.every((q) => quizAnswers[q.id] !== undefined);

  return (
    <div className="page-enter max-w-3xl mx-auto pb-16">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-2 text-[11px] font-mono-nums text-terminal-muted">
        <Link to="/academy" className="hover:text-neon-cyan transition-colors">Academy</Link>
        <ChevronRight size={10} />
        <span>Level {level.id}: {level.title}</span>
        <ChevronRight size={10} />
        <span className="text-slate-400 truncate">{lesson.title}</span>
      </nav>

      {/* Lesson header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <span className="font-mono-nums text-[10px] uppercase tracking-widest" style={{ color: accent }}>
            Level {level.id} · Lesson {lesson.id.split('-')[1]}
          </span>
          <span className="font-mono-nums text-[10px] text-terminal-muted">{lesson.readTime}</span>
          {isPassed && <CheckCircle2 size={14} style={{ color: accent }} />}
        </div>
        <h1 className="font-display text-2xl font-bold text-white">{lesson.title}</h1>
        <p className="mt-2 text-sm text-terminal-muted">{lesson.description}</p>
      </div>

      {/* Lesson content */}
      <div className="space-y-8">
        {lesson.sections.map((section, i) => (
          <section key={i}>
            <h2 className="mb-4 font-display text-lg font-bold text-white" style={{ borderLeft: `3px solid ${accent}`, paddingLeft: '14px' }}>
              {section.heading}
            </h2>
            <div className="prose-blog text-[15px] leading-[1.8] text-slate-300" dangerouslySetInnerHTML={{ __html: section.content }} />

            {/* Ask Sage about this section */}
            <button
              onClick={() => {
                setTutorPrompt(`Explain the concept of "${section.heading}" from the lesson "${lesson.title}" in simple terms. I'm a beginner.`);
                setTutorOpen(true);
              }}
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-neon-purple/20 bg-neon-purple/[0.05] px-3 py-1.5 text-[11px] text-neon-purple hover:bg-neon-purple/10 transition-all cursor-pointer"
            >
              <Brain size={12} /> Ask Sage about this
            </button>

            {/* Interactive widget */}
            {section.widgetId && WIDGET_REGISTRY[section.widgetId] && (
              <div className="mt-6 rounded-xl border border-terminal-border/30 bg-terminal-card/20 p-5">
                <p className="font-mono-nums text-[9px] uppercase tracking-widest text-neon-cyan mb-3">Interactive Exercise</p>
                {(() => { const Widget = WIDGET_REGISTRY[section.widgetId!]; return <Widget />; })()}
              </div>
            )}
          </section>
        ))}
      </div>

      {/* Quiz */}
      <div className="mt-12 rounded-2xl border border-terminal-border/40 bg-terminal-card/20 overflow-hidden">
        <div className="flex items-center justify-between border-b border-terminal-border/30 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <GraduationCap size={18} style={{ color: accent }} />
            <h2 className="font-display text-base font-bold text-white">Lesson Quiz</h2>
          </div>
          <span className="font-mono-nums text-[10px] text-terminal-muted">Score 80% or higher to pass</span>
        </div>

        <div className="p-6 space-y-6">
          {quizResult ? (
            /* Quiz results */
            <div className="space-y-6">
              <div className={`rounded-xl p-6 text-center ${quizResult.passed ? 'bg-neon-green/[0.05] border border-neon-green/20' : 'bg-neon-red/[0.05] border border-neon-red/20'}`}>
                {quizResult.passed ? <CheckCircle2 size={36} className="mx-auto text-neon-green mb-3" /> : <XCircle size={36} className="mx-auto text-neon-red mb-3" />}
                <p className="font-display text-xl font-bold text-white">{quizResult.passed ? 'Lesson Complete!' : 'Not Quite — Try Again'}</p>
                <p className="mt-1 font-mono-nums text-lg" style={{ color: quizResult.passed ? '#00ff9d' : '#ff3d57' }}>
                  {quizResult.score}% ({quizResult.correct}/{quizResult.total} correct)
                </p>
              </div>

              {/* Show correct answers */}
              {lesson.quiz.map((q, qi) => {
                const r = quizResult.results[qi];
                return (
                  <div key={q.id} className="rounded-xl border border-terminal-border/20 bg-terminal-bg/50 p-4">
                    <p className="text-sm font-semibold text-white mb-3">{qi + 1}. {q.question}</p>
                    <div className="space-y-1.5">
                      {q.options.map((opt, oi) => (
                        <div key={oi} className={`rounded-lg px-3 py-2 text-[13px] ${
                          oi === r?.correctIndex ? 'bg-neon-green/10 border border-neon-green/20 text-neon-green' :
                          oi === r?.selected && !r?.isCorrect ? 'bg-neon-red/10 border border-neon-red/20 text-neon-red' :
                          'text-slate-400'
                        }`}>
                          {opt}
                        </div>
                      ))}
                    </div>
                    <p className="mt-2 text-[12px] text-terminal-muted">{q.explanation}</p>
                  </div>
                );
              })}

              <div className="flex gap-3 flex-wrap">
                {!quizResult.passed && (
                  <>
                    <button onClick={handleRetry} className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-terminal-border bg-terminal-card/60 py-3 text-sm font-semibold text-slate-200 cursor-pointer">
                      <RotateCcw size={14} /> Retry Quiz
                    </button>
                    <button
                      onClick={() => {
                        const wrongQs = quizResult.results.filter(r => !r.isCorrect);
                        const wrongTopics = wrongQs.map(r => {
                          const q = lesson.quiz.find(q => q.id === r.questionId);
                          return q ? `"${q.question}" (correct answer: ${q.options[r.correctIndex]})` : '';
                        }).filter(Boolean).join('\n');
                        setTutorPrompt(`I just failed the quiz for "${lesson.title}". I got these questions wrong:\n${wrongTopics}\n\nCan you explain these concepts to me in a simple way?`);
                        setTutorOpen(true);
                      }}
                      className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-neon-purple/25 bg-neon-purple/10 py-3 text-sm font-semibold text-neon-purple cursor-pointer hover:bg-neon-purple/20 transition-all"
                    >
                      <Brain size={14} /> Review with Sage
                    </button>
                  </>
                )}
                {quizResult.passed && nextLessonId && (
                  <Link to={`/academy/${nextLessonId}`} className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-terminal-bg" style={{ backgroundColor: accent }}>
                    Next Lesson <ArrowRight size={14} />
                  </Link>
                )}
                <Link to="/academy" className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-terminal-border bg-terminal-card/60 py-3 text-sm font-semibold text-slate-200">
                  Back to Academy
                </Link>
              </div>
            </div>
          ) : (
            /* Quiz questions */
            <>
              {lesson.quiz.map((q, qi) => (
                <div key={q.id}>
                  <p className="text-sm font-semibold text-white mb-3">{qi + 1}. {q.question}</p>
                  <div className="space-y-2">
                    {q.options.map((opt, oi) => (
                      <button
                        key={oi}
                        onClick={() => setQuizAnswers((prev) => ({ ...prev, [q.id]: oi }))}
                        className={`w-full text-left rounded-xl px-4 py-3 text-[13px] transition-all cursor-pointer ${
                          quizAnswers[q.id] === oi
                            ? 'border-2 text-white' : 'border border-terminal-border/30 text-slate-400 hover:border-terminal-border-hover hover:text-white'
                        }`}
                        style={quizAnswers[q.id] === oi ? { borderColor: `${accent}50`, backgroundColor: `${accent}08`, color: accent } : undefined}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              <button
                onClick={handleQuizSubmit}
                disabled={!allAnswered || submitting}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-semibold text-terminal-bg disabled:opacity-40 cursor-pointer"
                style={{ backgroundColor: accent }}
              >
                {submitting ? <><Loader2 size={14} className="animate-spin" /> Submitting...</> : 'Submit Quiz'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Inline AI Tutor */}
      {tutorOpen ? (
        <div className="mt-6">
          <InlineAITutor
            lessonTitle={lesson.title}
            levelTitle={`Level ${level.id}: ${level.title}`}
            initialPrompt={tutorPrompt}
            onClose={() => { setTutorOpen(false); setTutorPrompt(undefined); }}
          />
        </div>
      ) : (
        <div className="mt-6 rounded-xl border border-neon-purple/20 bg-neon-purple/[0.03] p-4 flex items-center gap-3">
          <Brain size={18} className="text-neon-purple shrink-0" />
          <div className="flex-1">
            <p className="text-[13px] text-slate-300">Confused about something in this lesson?</p>
            <p className="text-[11px] text-terminal-muted">Sage can explain any concept in simple terms</p>
          </div>
          <button
            onClick={() => setTutorOpen(true)}
            className="shrink-0 rounded-lg border border-neon-purple/25 bg-neon-purple/10 px-3 py-2 text-[11px] font-semibold text-neon-purple hover:bg-neon-purple/20 transition-all cursor-pointer"
          >
            Ask Sage
          </button>
        </div>
      )}
    </div>
  );
}
