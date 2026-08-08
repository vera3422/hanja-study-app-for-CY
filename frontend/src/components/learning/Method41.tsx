/**
 * 학습 방법 4-1: 회차별 기출 풀이
 * - 급수·회차 선택 → 해당 회차 100문항을 번호순으로 풀이
 * - SRS 미적용, 클라이언트 채점
 */
import { useState, useCallback, useEffect } from 'react';
import {
  apiClient,
  type ExamQuestion,
  type ExamSessionInfo,
} from '../../api/apiClient';
import ExamPlayer from './ExamPlayer';

interface MethodProps {
  onBackToMenu: () => void;
  /** 정답/오답 표시 시점: each=매 문항, end=마지막에만 (기본 each) */
  feedbackMode?: 'each' | 'end';
}

type Phase = 'setup' | 'playing';

export default function Method41({ onBackToMenu, feedbackMode = 'each' }: MethodProps) {
  const [phase, setPhase] = useState<Phase>('setup');
  const [levels, setLevels] = useState<string[]>([]);
  const [selectedLevel, setSelectedLevel] = useState('4급');
  const [sessions, setSessions] = useState<ExamSessionInfo[]>([]);
  const [selectedSession, setSelectedSession] = useState<number | null>(null);
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playKey, setPlayKey] = useState(0); // ExamPlayer 리마운트용

  // 메타 로드
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
        // 기출 CSV가 있는 모든 급수 (8급~특급II)
        const lv = meta.levels?.length ? meta.levels : ['4급'];
        setLevels(lv);
        const initial = lv.includes('4급') ? '4급' : lv[0];
        setSelectedLevel(initial);
        // 선택 급수의 기출 CSV에 실제 존재하는 회차만
        const sess = meta.sessions?.[initial] ?? [];
        setSessions(sess);
        if (sess.length > 0) setSelectedSession(sess[0].session);
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

  // 급수 변경 시 회차 목록 갱신
  useEffect(() => {
    if (!selectedLevel) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await apiClient.getExamSessions(selectedLevel);
        if (cancelled) return;
        setSessions(data.sessions ?? []);
        if (data.sessions?.length) {
          setSelectedSession(data.sessions[0].session);
        } else {
          setSelectedSession(null);
        }
      } catch {
        /* meta 이미 로드된 경우 무시 */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedLevel]);

  const startSession = useCallback(async () => {
    if (selectedSession == null) {
      alert('회차를 선택해 주세요.');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiClient.getExamQuestions(selectedLevel, selectedSession);
      if (data.error) {
        setError(data.error);
        return;
      }
      if (!data.questions?.length) {
        setError('해당 회차에 문제가 없습니다.');
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
  }, [selectedLevel, selectedSession]);

  const handleRestart = () => {
    // 같은 회차 다시 풀기
    setPlayKey((k) => k + 1);
  };

  const handleBackToSetup = () => {
    setPhase('setup');
    setQuestions([]);
  };

  // ---------- 플레이 중 ----------
  if (phase === 'playing' && questions.length > 0) {
    const sessInfo = sessions.find((s) => s.session === selectedSession);
    const dateLabel = sessInfo?.exam_date ? ` · ${sessInfo.exam_date}` : '';
    return (
      <ExamPlayer
        key={playKey}
        questions={questions}
        title={`${selectedLevel} 제${selectedSession}회 기출`}
        subtitle={`번호순 풀이${dateLabel}`}
        onBackToMenu={handleBackToSetup}
        onRestart={handleRestart}
        feedbackMode={feedbackMode}
      />
    );
  }

  // ---------- 설정 화면 ----------
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 sm:p-6">
      <div className="text-center max-w-md w-full">
        <div className="text-4xl sm:text-5xl md:text-6xl mb-4 sm:mb-6">📜</div>
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-2">
          회차별 기출 풀이
        </h2>
        <p className="text-sm sm:text-base text-gray-600 mb-6 sm:mb-8">
          선택한 회차의 문제를 번호 순서대로 풉니다 (4-1)
        </p>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-xl text-sm sm:text-base whitespace-pre-line text-left">
            {error}
          </div>
        )}

        <div className="bg-white p-5 sm:p-8 rounded-2xl sm:rounded-3xl shadow-sm border border-gray-100 text-left space-y-5">
          {/* 급수 */}
          <div>
            <label className="block text-sm sm:text-base font-medium text-gray-700 mb-2">
              급수
            </label>
            <select
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value)}
              disabled={isLoading || levels.length === 0}
              className="w-full text-xl sm:text-2xl font-bold text-center py-3 border-2 border-indigo-200 focus:border-indigo-500 rounded-xl outline-none bg-white"
            >
              {levels.map((lv) => (
                <option key={lv} value={lv}>
                  {lv}
                </option>
              ))}
            </select>
          </div>

          {/* 회차 */}
          <div>
            <label className="block text-sm sm:text-base font-medium text-gray-700 mb-2">
              회차
            </label>
            {sessions.length === 0 ? (
              <p className="text-gray-400 text-sm py-3 text-center">
                {isLoading ? '불러오는 중...' : '등록된 회차가 없습니다'}
              </p>
            ) : (
              <select
                value={selectedSession ?? ''}
                onChange={(e) => setSelectedSession(Number(e.target.value))}
                disabled={isLoading}
                className="w-full text-lg sm:text-xl font-semibold text-center py-3 border-2 border-indigo-200 focus:border-indigo-500 rounded-xl outline-none bg-white"
              >
                {sessions.map((s) => (
                  <option key={s.session} value={s.session}>
                    제{s.session}회 ({s.exam_date}) · {s.total}문항
                  </option>
                ))}
              </select>
            )}
          </div>

          <button
            type="button"
            onClick={startSession}
            disabled={isLoading || selectedSession == null}
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
