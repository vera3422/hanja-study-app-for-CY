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
}

type Phase = 'setup' | 'playing';

const COUNT_OPTIONS = [10, 20, 30, 50, 100];

export default function Method42({ onBackToMenu }: MethodProps) {
  const [phase, setPhase] = useState<Phase>('setup');
  const [levels, setLevels] = useState<string[]>([]);
  const [selectedLevel, setSelectedLevel] = useState('4급');
  const [sessions, setSessions] = useState<ExamSessionInfo[]>([]);
  const [types, setTypes] = useState<ExamTypeInfo[]>([]);
  const [selectedSessions, setSelectedSessions] = useState<number[]>([]); // 빈 배열 = 전체
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
        setTypes(meta.types ?? []);
        // 기본: 전체 유형·회차 (선택 없음 = 전체)
        setSelectedTypes([]);
        setSelectedSessions([]);
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

  useEffect(() => {
    if (!selectedLevel) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await apiClient.getExamSessions(selectedLevel);
        if (cancelled) return;
        setSessions(data.sessions ?? []);
        setSelectedSessions([]); // 급수 바꾸면 회차 필터 초기화
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedLevel]);

  const toggleType = (code: string) => {
    setSelectedTypes((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const toggleSession = (session: number) => {
    setSelectedSessions((prev) =>
      prev.includes(session) ? prev.filter((s) => s !== session) : [...prev, session]
    );
  };

  const selectAllTypes = () => setSelectedTypes([]);
  const selectAllSessions = () => setSelectedSessions([]);

  const startRandom = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiClient.getExamQuestionsRandom({
        level: selectedLevel,
        count,
        types: selectedTypes.length > 0 ? selectedTypes : undefined,
        sessions: selectedSessions.length > 0 ? selectedSessions : undefined,
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
  }, [selectedLevel, count, selectedTypes, selectedSessions]);

  const handleRestart = () => {
    // 같은 필터로 다시 랜덤 샘플
    startRandom();
  };

  const handleBackToSetup = () => {
    setPhase('setup');
    setQuestions([]);
  };

  if (phase === 'playing' && questions.length > 0) {
    const typeLabel =
      selectedTypes.length === 0
        ? '전체 유형'
        : selectedTypes.length <= 2
          ? selectedTypes.join(', ')
          : `${selectedTypes.length}개 유형`;
    const sessLabel =
      selectedSessions.length === 0
        ? '전체 회차'
        : selectedSessions.length <= 3
          ? selectedSessions.map((s) => `${s}회`).join(', ')
          : `${selectedSessions.length}개 회차`;
    return (
      <ExamPlayer
        key={playKey}
        questions={questions}
        title={`${selectedLevel} 랜덤 기출`}
        subtitle={`${questions.length}문항 · ${typeLabel} · ${sessLabel}`}
        onBackToMenu={handleBackToSetup}
        onRestart={handleRestart}
      />
    );
  }

  // ---------- 설정 화면 ----------
  return (
    <div className="min-h-screen bg-gray-50 py-8 sm:py-12 px-4 sm:px-6">
      <div className="max-w-lg mx-auto text-center">
        <div className="text-4xl sm:text-5xl md:text-6xl mb-4">🎲</div>
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2">
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
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 회차 필터 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">회차</label>
              <button
                type="button"
                onClick={selectAllSessions}
                className="text-xs text-indigo-600 underline"
              >
                전체
              </button>
            </div>
            <p className="text-xs text-gray-400 mb-2">
              {selectedSessions.length === 0
                ? '전체 회차 (선택 없음 = 전체)'
                : `${selectedSessions.length}개 선택`}
            </p>
            {sessions.length === 0 ? (
              <p className="text-gray-400 text-sm">회차 없음</p>
            ) : (
              <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto">
                {sessions.map((s) => {
                  const on = selectedSessions.includes(s.session);
                  return (
                    <button
                      key={s.session}
                      type="button"
                      onClick={() => toggleSession(s.session)}
                      className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium border transition-colors ${
                        on
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                          : 'border-gray-200 text-gray-600 hover:border-indigo-300'
                      }`}
                    >
                      {s.session}회
                    </button>
                  );
                })}
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
