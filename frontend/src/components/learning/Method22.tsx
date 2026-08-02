import { useState, useRef, useEffect } from 'react';
import { apiClient, type QuestionResponse } from '../../api/apiClient';
import HandwritingPad, { type HandwritingPadHandle } from './HandwritingPad';
import { recognizeHanja } from '../../lib/hanjaRecognizer';
import HanjaDictLink from './HanjaDictLink';

interface MethodProps {
  selectedLevel: string;
  onBackToMenu: () => void;
}

/** 인식·채점 모드 */
type RecognizeMode = 'strict' | 'top3' | 'pick';

const MODE_LABELS: Record<RecognizeMode, string> = {
  strict: '정확히 쓰기',
  top3: '상위 3개 허용',
  pick: '후보에서 선택',
};

const MODE_DESCRIPTIONS: Record<RecognizeMode, string> = {
  strict: '1순위만 정답으로 인정 (엄격)',
  top3: '인식 상위 3개 안에 있으면 정답',
  pick: '인식 후보를 보여 주고 직접 고름',
};

const STORAGE_KEY = 'method22_recognize_mode';

export default function Method22({ selectedLevel, onBackToMenu }: MethodProps) {
  const [currentQuestion, setCurrentQuestion] = useState<QuestionResponse | null>(null);
  const [feedback, setFeedback] = useState<{ message: string; color: string } | null>(null);
  const [correctAnswer, setCorrectAnswer] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 인식 모드 (기본: 정확히 쓰기)
  const [mode, setMode] = useState<RecognizeMode>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as RecognizeMode | null;
      if (saved === 'strict' || saved === 'top3' || saved === 'pick') return saved;
    } catch {
      /* ignore */
    }
    return 'strict';
  });
  const [modeMenuOpen, setModeMenuOpen] = useState(false);

  // pick 모드: 인식 후 후보 선택 대기
  const [candidates, setCandidates] = useState<string[] | null>(null);

  const padRef = useRef<HandwritingPadHandle>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      /* ignore */
    }
  }, [mode]);

  // 메뉴 바깥 클릭 시 닫기
  useEffect(() => {
    if (!modeMenuOpen) return;
    const onDocClick = () => setModeMenuOpen(false);
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, [modeMenuOpen]);

  const fetchNextQuestion = async () => {
    setIsLoading(true);
    try {
      const data = await apiClient.getNextQuestion('default', selectedLevel, '2-2');
      if (data.error) {
        alert(data.error);
        return;
      }
      setCurrentQuestion(data);
      setFeedback(null);
      setCorrectAnswer(null);
      setCandidates(null);
      // 다음 문제로 넘어갈 때만 캔버스 초기화 (오답 시에는 필기 유지)
      padRef.current?.clear();
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : String(err);
      alert(`문제를 불러오는 데 실패했습니다.\n\n원인: ${message}`);
    } finally {
      setIsLoading(false);
    }
  };

  /** 서버에 제출하고 피드백 표시 */
  const submitToServer = async (submitted: string) => {
    if (!currentQuestion?.hanja) return;

    const result = await apiClient.submitAnswer(
      'default',
      currentQuestion.hanja,
      currentQuestion.grade,
      submitted,
      '2-2'
    );

    setFeedback({
      message: result.message,
      color: result.correct ? 'text-green-600' : 'text-red-600',
    });
    setCorrectAnswer(result.correct_answer || currentQuestion.hanja || null);
    setCandidates(null);
  };

  const handleAnswer = async () => {
    if (!currentQuestion?.hanja) return;

    const strokes = padRef.current?.getStrokes() ?? [];
    if (strokes.length === 0) {
      alert('한자를 써 주세요.');
      return;
    }

    setIsSubmitting(true);
    try {
      const list = await recognizeHanja(strokes);
      const answerHanja = currentQuestion.hanja;

      // ----- 모드별 처리 -----
      if (mode === 'strict') {
        // 1순위만 제출
        const submitted = list[0] ?? '';
        await submitToServer(submitted);
      } else if (mode === 'top3') {
        // 상위 3개 안에 정답이 있으면 정답 한자로 제출 (서버 정답 처리)
        const top = list.slice(0, 3);
        const hit = top.includes(answerHanja);
        const submitted = hit ? answerHanja : (list[0] ?? '');
        await submitToServer(submitted);
      } else {
        // pick: 후보를 보여주고 사용자가 선택
        if (list.length === 0) {
          // 후보 없음 → 빈 제출 (오답)
          await submitToServer('');
        } else {
          setCandidates(list.slice(0, 8));
        }
      }
    } catch (err) {
      console.error(err);
      setFeedback({ message: '제출 중 오류가 발생했습니다.', color: 'text-red-600' });
    } finally {
      setIsSubmitting(false);
    }
  };

  /** pick 모드에서 후보 선택 */
  const handlePickCandidate = async (char: string) => {
    setIsSubmitting(true);
    try {
      await submitToServer(char);
    } catch (err) {
      console.error(err);
      setFeedback({ message: '제출 중 오류가 발생했습니다.', color: 'text-red-600' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const changeMode = (next: RecognizeMode) => {
    setMode(next);
    setModeMenuOpen(false);
    // 모드 변경 시 진행 중 후보 선택 상태만 초기화 (필기는 유지)
    setCandidates(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 sm:p-6 relative">
      {/* 우측 상단: 인식 모드 선택 */}
      <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-20">
        <div className="relative" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => setModeMenuOpen((o) => !o)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border-2 border-gray-200 shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50"
            aria-haspopup="listbox"
            aria-expanded={modeMenuOpen}
          >
            <span className="text-xs text-gray-400">모드</span>
            <span>{MODE_LABELS[mode]}</span>
            <span className="text-gray-400 text-xs">{modeMenuOpen ? '▲' : '▼'}</span>
          </button>

          {modeMenuOpen && (
            <ul
              role="listbox"
              className="absolute right-0 mt-1 w-56 rounded-xl border-2 border-gray-200 bg-white shadow-lg overflow-hidden text-left"
            >
              {(Object.keys(MODE_LABELS) as RecognizeMode[]).map((key) => (
                <li key={key}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={mode === key}
                    onClick={() => changeMode(key)}
                    className={`w-full px-3 py-2.5 text-left hover:bg-indigo-50 ${
                      mode === key ? 'bg-indigo-50 text-indigo-700' : 'text-gray-800'
                    }`}
                  >
                    <div className="font-medium text-sm">{MODE_LABELS[key]}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{MODE_DESCRIPTIONS[key]}</div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="text-center max-w-md w-full">
        <div className="text-4xl sm:text-5xl md:text-6xl mb-4 sm:mb-6">🖋️</div>
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4">
          {selectedLevel} 학습 (2-2 훈/음 → 한자 쓰기)
        </h2>

        {currentQuestion ? (
          <div className="bg-white p-5 sm:p-8 rounded-2xl sm:rounded-3xl shadow">
            <p className="text-base sm:text-xl font-medium mb-3 sm:mb-4 text-gray-600">
              다음 뜻·음의 한자를 쓰세요
            </p>
            {/* 정답 제출/확인 후 문제(훈·음) 왼쪽에 네이버 한자사전 링크 (반응형) */}
            <div className="flex items-center justify-center gap-2 sm:gap-3 md:gap-4 mb-4 sm:mb-6">
              {feedback && currentQuestion.hanja ? (
                <HanjaDictLink hanja={currentQuestion.hanja} className="flex-shrink-0" />
              ) : (
                <span className="w-8 h-8 sm:w-9 sm:h-9 flex-shrink-0 invisible" aria-hidden />
              )}
              <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-indigo-700 leading-relaxed">
                {(currentQuestion as any).question_text || currentQuestion.correct_hun_eum}
              </p>
              {/* 좌우 균형용 더미 (문제 텍스트 중앙 정렬 유지) */}
              <span className="w-8 h-8 sm:w-9 sm:h-9 flex-shrink-0 invisible" aria-hidden />
            </div>

            {/* 필기 캔버스 — 오답 후에도 그대로 유지 (비교용) */}
            <HandwritingPad
              ref={padRef}
              disabled={!!feedback || isSubmitting || !!candidates}
              className="mb-3 sm:mb-4"
            />

            {/* 지우기 / 실행취소 — 제출·후보 선택 전에는 사용 가능 */}
            {!feedback && !candidates && (
              <div className="flex gap-2 sm:gap-3 mb-4 sm:mb-6">
                <button
                  type="button"
                  onClick={() => padRef.current?.clear()}
                  disabled={isSubmitting}
                  className="flex-1 py-2 sm:py-3 rounded-xl sm:rounded-2xl border-2 border-gray-200 text-gray-700 text-sm sm:text-base font-medium hover:bg-gray-50 disabled:opacity-50"
                >
                  지우기
                </button>
                <button
                  type="button"
                  onClick={() => padRef.current?.undo()}
                  disabled={isSubmitting}
                  className="flex-1 py-2 sm:py-3 rounded-xl sm:rounded-2xl border-2 border-gray-200 text-gray-700 text-sm sm:text-base font-medium hover:bg-gray-50 disabled:opacity-50"
                >
                  실행취소
                </button>
              </div>
            )}

            {/* pick 모드: 인식 후보 선택 */}
            {candidates && !feedback && (
              <div className="mb-4 sm:mb-6">
                <p className="text-sm sm:text-base text-gray-600 mb-3">인식된 후보 중 선택하세요</p>
                {/* 윗줄 4개 + 아랫줄 4개 */}
                <div className="grid grid-cols-4 gap-2 sm:gap-3 max-w-xs sm:max-w-sm mx-auto">
                  {candidates.slice(0, 8).map((char) => (
                    <button
                      key={char}
                      type="button"
                      onClick={() => handlePickCandidate(char)}
                      disabled={isSubmitting}
                      className="aspect-square flex items-center justify-center rounded-xl border-2 border-indigo-200 bg-indigo-50 text-3xl sm:text-4xl font-bold text-indigo-800 hover:bg-indigo-100 disabled:opacity-50"
                    >
                      {char}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setCandidates(null)}
                  disabled={isSubmitting}
                  className="mt-3 text-sm text-gray-500 underline"
                >
                  다시 쓰기
                </button>
              </div>
            )}

            {feedback && (
              <div className={`text-2xl sm:text-3xl font-bold mb-4 sm:mb-6 ${feedback.color}`}>
                {feedback.message}
              </div>
            )}

            {feedback && correctAnswer && (
              <div
                className={`font-bold mt-3 sm:mt-4 mb-4 sm:mb-6 p-3 sm:p-4 rounded-xl sm:rounded-2xl border ${
                  feedback.color === 'text-green-600'
                    ? 'text-green-700 bg-green-50 border-green-200'
                    : 'text-red-600 bg-red-50 border-red-200'
                }`}
              >
                <span className="text-base sm:text-lg block mb-1 opacity-80">정답</span>
                <span className="text-5xl sm:text-6xl md:text-7xl leading-none">
                  {correctAnswer}
                </span>
              </div>
            )}

            {/* 후보 선택 중에는 제출 버튼 숨김 */}
            {!candidates && (
              <button
                onClick={() => {
                  if (feedback) {
                    fetchNextQuestion();
                  } else {
                    handleAnswer();
                  }
                }}
                disabled={isSubmitting || isLoading}
                className="w-full py-3 sm:py-5 bg-indigo-600 text-white rounded-2xl sm:rounded-3xl text-base sm:text-xl font-medium disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {isSubmitting
                  ? '인식·제출 중...'
                  : feedback
                    ? '다음 문제'
                    : '제출'}
              </button>
            )}
          </div>
        ) : (
          <button
            onClick={fetchNextQuestion}
            disabled={isLoading}
            className="px-8 sm:px-10 py-3 sm:py-5 bg-indigo-600 text-white rounded-2xl sm:rounded-3xl text-base sm:text-xl font-medium w-full"
          >
            {isLoading ? '문제 불러오는 중...' : '문제 시작하기'}
          </button>
        )}

        <button
          onClick={onBackToMenu}
          className="mt-4 sm:mt-6 text-gray-500 underline text-sm sm:text-base"
        >
          ← 메뉴로 돌아가기
        </button>
      </div>
    </div>
  );
}
