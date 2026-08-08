/**
 * 학습 방법 4-2: 랜덤 기출 풀이
 * - 급수 · 문항 수 · 유형 · 회차 필터 → 랜덤 샘플 풀이
 * - SRS 미적용, 클라이언트 채점
 */
import { useState, useCallback, useEffect } from 'react';
import {
  apiClient,
  type ExamQuestion,
  type ExamSessionInfo,
  type ExamTypeInfo,
} from '../../api/apiClient';
import ExamPlayer from './ExamPlayer';

interface MethodProps {
  onBackToMenu: () => void;
  /** 정답/오답 표시 시점: each=매 문항, end=마지막에만 (기본 each) */
  feedbackMode?: 'each' | 'end';
}

type Phase = 'setup' | 'playing';

const COUNT_OPTIONS = [10, 20, 30, 50, 100];

export default function Method42({ onBackToMenu, feedbackMode = 'each' }: MethodProps) {
  const [phase, setPhase] = useState<Phase>('setup');
  const [levels, setLevels] = useState<string[]>([]);
  const [selectedLevel, setSelectedLevel] = useState('4급');
  const [sessions, setSessions] = useState<ExamSessionInfo[]>([]);
  /** 급수별 유형 맵 (meta.types_by_level). 선택 급수에 해당하는 버튼만 표시 */
  const [typesByLevel, setTypesByLevel] = useState<Record<string, ExamTypeInfo[]>>({});
  const [types, setTypes] = useState<ExamTypeInfo[]>([]);
  // 회차 범위: null = 전체 (시작·종료 모두 null일 때)
  const [sessionFrom, setSessionFrom] = useState<number | null>(null);
  const [sessionTo, setSessionTo] = useState<number | null>(null);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]); // 빈 배열 = 전체
  const [count, setCount] = useState(20);
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playKey, setPlayKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      setError(null);
      try {
        const meta = await apiClient.getExamMeta();
        if (cancelled) return;
        if (meta.error) {
          setError(meta.error);
          return;
        }
        const lv = meta.levels?.length ? meta.levels : ['4급'];
        setLevels(lv);
        const initial = lv.includes('4급') ? '4급' : lv[0];
        setSelectedLevel(initial);
        setSessions(meta.sessions?.[initial] ?? []);

        // 급수별 유형: types_by_level 우선, 없으면 전체 types로 폴백
        const byLevel = meta.types_by_level ?? {};
        setTypesByLevel(byLevel);
        const levelTypes =
          byLevel[initial]?.length
            ? byLevel[initial]
            : meta.types ?? [];
        setTypes(levelTypes);

        // 기본: 전체 유형·회차
        setSelectedTypes([]);
        setSessionFrom(null);
        setSessionTo(null);
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : String(err);
        setError(`기출 정보를 불러오지 못했습니다.\n${message}`);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // 급수 변경 시: 해당 급수 회차만 + 해당 급수 유형만 표시, 선택값 초기화
  useEffect(() => {
    if (!selectedLevel) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await apiClient.getExamSessions(selectedLevel);
        if (cancelled) return;
        setSessions(data.sessions ?? []);
        // 급수 바꾸면 회차 범위 초기화 (전체)
        setSessionFrom(null);
        setSessionTo(null);
      } catch {
        /* ignore */
      }
    })();

    // 선택 급수에 존재하는 유형 버튼만 표시
    const levelTypes = typesByLevel[selectedLevel];
    if (levelTypes && levelTypes.length > 0) {
      setTypes(levelTypes);
      // 이전 급수에서 고른 유형 중 현재 급수에 없는 것은 제거
      const allowed = new Set(levelTypes.map((t) => t.code));
      setSelectedTypes((prev) => prev.filter((c) => allowed.has(c)));
    }

    return () => {
      cancelled = true;
    };
  }, [selectedLevel, typesByLevel]);

  const toggleType = (code: string) => {
    setSelectedTypes((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const selectAllTypes = () => setSelectedTypes([]);
  const selectAllSessions = () => {
    setSessionFrom(null);
    setSessionTo(null);
  };

  /** 시작·종료 회차로 실제 존재하는 회차 번호 배열 생성 (전체면 undefined) */
  const buildSessionFilter = useCallback((): number[] | undefined => {
    if (sessionFrom == null && sessionTo == null) return undefined;
    if (sessions.length === 0) return undefined;
    const nums = sessions.map((s) => s.session);
    const lo =
      sessionFrom != null
        ? sessionTo != null
          ? Math.min(sessionFrom, sessionTo)
          : sessionFrom
        : Math.min(...nums);
    const hi =
      sessionTo != null
        ? sessionFrom != null
          ? Math.max(sessionFrom, sessionTo)
          : sessionTo
        : Math.max(...nums);
    const filtered = nums.filter((n) => n >= lo && n <= hi);
    return filtered.length > 0 ? filtered : undefined;
  }, [sessionFrom, sessionTo, sessions]);

  const startRandom = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const sessionsFilter = buildSessionFilter();
      const data = await apiClient.getExamQuestionsRandom({
        level: selectedLevel,
        count,
        types: selectedTypes.length > 0 ? selectedTypes : undefined,
        sessions: sessionsFilter,
      });
      if (data.error) {
        setError(data.error);
        return;
      }
      if (!data.questions?.length) {
        setError('조건에 맞는 문항이 없습니다. 필터를 바꿔 보세요.');
        return;
      }
      setQuestions(data.questions);
      setPlayKey((k) => k + 1);
      setPhase('playing');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(`문제를 불러오지 못했습니다.\n${message}`);
    } finally {
      setIsLoading(false);
    }
  }, [selectedLevel, count, selectedTypes, buildSessionFilter]);

  const handleRestart = () => {
    // 같은 필터로 다시 랜덤 샘플
    startRandom();
  };

  const handleBackToSetup = () => {
    setPhase('setup');
    setQuestions([]);
  };

  if (phase === 'playing' && questions.length > 0) {
    const typeDisplay = (code: string) =>
      code === 'mean' ? '단어 뜻' : code;
    const typeLabel =
      selectedTypes.length === 0
        ? '전체 유형'
        : selectedTypes.length <= 2
          ? selectedTypes.map(typeDisplay).join(', ')
          : `${selectedTypes.length}개 유형`;
    const sessLabel = (() => {
      if (sessionFrom == null && sessionTo == null) return '전체 회차';
      if (sessionFrom != null && sessionTo != null) {
        const lo = Math.min(sessionFrom, sessionTo);
        const hi = Math.max(sessionFrom, sessionTo);
        return lo === hi ? `${lo}회` : `${lo}~${hi}회`;
      }
      if (sessionFrom != null) return `${sessionFrom}회~`;
      return `~${sessionTo}회`;
    })();
    return (
      <ExamPlayer
        key={playKey}
        questions={questions}
        title={`${selectedLevel} 랜덤 기출`}
        subtitle={`${questions.length}문항 · ${typeLabel} · ${sessLabel}`}
        onBackToMenu={handleBackToSetup}
        onRestart={handleRestart}
        feedbackMode={feedbackMode}
      />
    );
  }

  // ---------- 설정 화면 ----------
  return (
    <div className="min-h-screen bg-gray-50 py-8 sm:py-12 px-4 sm:px-6">
      <div className="max-w-lg mx-auto text-center">
        <div className="text-4xl sm:text-5xl md:text-6xl mb-4">🎲</div>
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-2">
          랜덤 기출 풀이
        </h2>
        <p className="text-sm sm:text-base text-gray-600 mb-6">
          유형·회차를 골라 무작위로 풉니다 (4-2)
        </p>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-xl text-sm whitespace-pre-line text-left">
            {error}
          </div>
        )}

        <div className="bg-white p-5 sm:p-8 rounded-2xl sm:rounded-3xl shadow-sm border border-gray-100 text-left space-y-6">
          {/* 급수 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">급수</label>
            <select
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value)}
              disabled={isLoading || levels.length === 0}
              className="w-full text-xl font-bold text-center py-3 border-2 border-indigo-200 focus:border-indigo-500 rounded-xl outline-none bg-white"
            >
              {levels.map((lv) => (
                <option key={lv} value={lv}>
                  {lv}
                </option>
              ))}
            </select>
          </div>

          {/* 문항 수 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">문항 수</label>
            <div className="flex flex-wrap gap-2 justify-center">
              {COUNT_OPTIONS.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setCount(n)}
                  className={`px-4 py-2 rounded-xl text-sm sm:text-base font-medium border-2 transition-colors ${
                    count === n
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-gray-200 text-gray-600 hover:border-indigo-300'
                  }`}
                >
                  {n}문항
                </button>
              ))}
            </div>
          </div>

          {/* 유형 필터 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">문제 유형</label>
              <button
                type="button"
                onClick={selectAllTypes}
                className="text-xs text-indigo-600 underline"
              >
                전체
              </button>
            </div>
            <p className="text-xs text-gray-400 mb-2">
              {selectedTypes.length === 0
                ? '전체 유형 (선택 없음 = 전체)'
                : `${selectedTypes.length}개 선택`}
            </p>
            <div className="flex flex-wrap gap-2">
              {types.map((t) => {
                const on = selectedTypes.includes(t.code);
                // 화면 표시명만 한글화 (내부 코드 mean 등은 유지)
                const displayLabel =
                  t.code === 'mean' ? '단어 뜻' : t.label;
                return (
                  <button
                    key={t.code}
                    type="button"
                    onClick={() => toggleType(t.code)}
                    className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium border transition-colors ${
                      on
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                        : 'border-gray-200 text-gray-600 hover:border-indigo-300'
                    }`}
                  >
                    {displayLabel}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 회차 범위 필터 (시작 ~ 종료) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">회차 범위</label>
              <button
                type="button"
                onClick={selectAllSessions}
                className="text-xs text-indigo-600 underline"
              >
                전체
              </button>
            </div>
            <p className="text-xs text-gray-400 mb-2">
              {sessionFrom == null && sessionTo == null
                ? '전체 회차 (시작·종료 미선택 = 전체)'
                : sessionFrom != null && sessionTo != null
                  ? `${Math.min(sessionFrom, sessionTo)}회 ~ ${Math.max(sessionFrom, sessionTo)}회`
                  : sessionFrom != null
                    ? `${sessionFrom}회부터`
                    : `${sessionTo}회까지`}
            </p>
            {sessions.length === 0 ? (
              <p className="text-gray-400 text-sm">회차 없음</p>
            ) : (
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="flex-1">
                  <label className="block text-xs text-gray-500 mb-1">시작 회차</label>
                  <select
                    value={sessionFrom ?? ''}
                    onChange={(e) => {
                      const v = e.target.value;
                      setSessionFrom(v === '' ? null : Number(v));
                    }}
                    disabled={isLoading}
                    className="w-full text-sm sm:text-base font-medium text-center py-2.5 border-2 border-gray-200 focus:border-indigo-500 rounded-xl outline-none bg-white"
                  >
                    <option value="">전체</option>
                    {sessions.map((s) => (
                      <option key={s.session} value={s.session}>
                        {s.session}회
                      </option>
                    ))}
                  </select>
                </div>
                <span className="pt-5 text-gray-400 font-medium">~</span>
                <div className="flex-1">
                  <label className="block text-xs text-gray-500 mb-1">종료 회차</label>
                  <select
                    value={sessionTo ?? ''}
                    onChange={(e) => {
                      const v = e.target.value;
                      setSessionTo(v === '' ? null : Number(v));
                    }}
                    disabled={isLoading}
                    className="w-full text-sm sm:text-base font-medium text-center py-2.5 border-2 border-gray-200 focus:border-indigo-500 rounded-xl outline-none bg-white"
                  >
                    <option value="">전체</option>
                    {sessions.map((s) => (
                      <option key={s.session} value={s.session}>
                        {s.session}회
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={startRandom}
            disabled={isLoading}
            className="w-full py-3 sm:py-5 bg-indigo-600 text-white rounded-2xl sm:rounded-3xl text-base sm:text-xl font-medium disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {isLoading ? '불러오는 중...' : '풀이 시작하기'}
          </button>
        </div>

        <button
          onClick={onBackToMenu}
          className="mt-4 sm:mt-6 text-gray-500 underline text-sm sm:text-base"
        >
          ← 기출문제 메뉴로 돌아가기
        </button>
      </div>
    </div>
  );
}
