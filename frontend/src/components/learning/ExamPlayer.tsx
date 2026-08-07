/**
 * 기출문제 공통 플레이어 (4-1 / 4-2)
 * - SRS 미적용, 클라이언트 채점
 * - 유형별 입력: 텍스트 / 보기 버튼 / 필기+8후보 (단·복수 글자)
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import type { ExamQuestion } from '../../api/apiClient';
import HandwritingPad, { type HandwritingPadHandle } from './HandwritingPad';
import { recognizeCharsByEngine } from '../../lib/recognizeEngines';
import HanjaDictLink from './HanjaDictLink';

/** Google writing_guide용 캔버스 CSS 크기 */
function getPadSize(): { width: number; height: number } {
  const el = document.querySelector('canvas[aria-label="한자 필기 영역"]') as HTMLCanvasElement | null;
  if (el) {
    const r = el.getBoundingClientRect();
    return {
      width: Math.max(Math.round(r.width), 50),
      height: Math.max(Math.round(r.height), 50),
    };
  }
  return { width: 280, height: 280 };
}

/** 텍스트 입력 유형 */
const TEXT_TYPES = new Set(['dokum', 'hunum']);
/** 객관식(보기 버튼) 유형 */
const CHOICE_TYPES = new Set(['jangum', 'uut_select']);
/** 한자 필기 (1글자) */
const HANJA_SINGLE = new Set(['bushu', 'yakja', 'banui', 'yui', 'seong-eo']);
/** 한자 필기 (복수 글자 — 글자 단위 순차 입력) */
const HANJA_MULTI = new Set(['dongeum', 'hanjaeo_write']);

export type InputKind = 'text' | 'choice' | 'hanja_single' | 'hanja_multi';

export function getInputKind(type: string): InputKind {
  if (TEXT_TYPES.has(type)) return 'text';
  if (CHOICE_TYPES.has(type)) return 'choice';
  if (HANJA_MULTI.has(type)) return 'hanja_multi';
  if (HANJA_SINGLE.has(type)) return 'hanja_single';
  // 알 수 없는 유형 → 텍스트 폴백
  return 'text';
}

/** 채점용 정규화 */
function normalizeText(s: string): string {
  return s.replace(/\s+/g, '').trim().toLowerCase();
}

/** 보기 번호 추출 (① → ①, "1" → 가능하면 원문자 매핑은 하지 않고 원문 비교) */
function normalizeChoice(s: string): string {
  return s.replace(/\s+/g, '').trim();
}

export function checkExamAnswer(q: ExamQuestion, submitted: string): boolean {
  const kind = getInputKind(q.question_type);
  const correct = q.answer ?? '';
  if (kind === 'text') {
    return normalizeText(submitted) === normalizeText(correct);
  }
  if (kind === 'choice') {
    // 번호 exact (② vs 2 등은 1차에서 exact만)
    const sub = normalizeChoice(submitted);
    const ans = normalizeChoice(correct);
    if (sub === ans) return true;
    // 보기 전체 문자열을 고른 경우: "② 老人" → 앞 번호만 비교
    const m = sub.match(/^[①②③④⑤⑥⑦⑧⑨⑩⑫]/);
    if (m && m[0] === ans) return true;
    return false;
  }
  // 한자: 공백 제거 후 exact
  return normalizeText(submitted) === normalizeText(correct);
}

interface ExamPlayerProps {
  questions: ExamQuestion[];
  title: string;
  subtitle?: string;
  onBackToMenu: () => void;
  onRestart: () => void;
}

export default function ExamPlayer({
  questions,
  title,
  subtitle,
  onBackToMenu,
  onRestart,
}: ExamPlayerProps) {
  const [index, setIndex] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [userAnswer, setUserAnswer] = useState('');
  const [textInput, setTextInput] = useState('');
  const [candidates, setCandidates] = useState<string[] | null>(null);
  const [isRecognizing, setIsRecognizing] = useState(false);
  // 복수 글자: 지금까지 확정한 글자 버퍼
  const [charBuffer, setCharBuffer] = useState('');
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [completed, setCompleted] = useState(false);
  /** 문항별 채점 결과 (풀이 순서 index 기준) */
  const [results, setResults] = useState<Array<{ correct: boolean; userAnswer: string } | null>>(
    () => Array.from({ length: questions.length }, () => null)
  );
  /** 완료 후: 점수 요약 | 번호 표 | 문항 복습 */
  const [resultPhase, setResultPhase] = useState<'summary' | 'detail' | 'review'>('summary');
  /** 세부/복습 공통: 모두 보기 | 오답만 */
  const [resultFilter, setResultFilter] = useState<'all' | 'wrong'>('all');
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  /** 복습 중인 문항 index (questions 배열 기준) */
  const [reviewIndex, setReviewIndex] = useState(0);

  const padRef = useRef<HandwritingPadHandle>(null);
  const total = questions.length;
  const current = questions[index] ?? null;
  const kind = current ? getInputKind(current.question_type) : 'text';
  const progressLabel = total > 0 ? `${index + 1} / ${total}` : '';

  /** 필터에 따른 표시용 문항 index 목록 (0-based) */
  const filteredIndices = (() => {
    const all = questions.map((_, i) => i);
    if (resultFilter === 'wrong') {
      return all.filter((i) => results[i]?.correct === false);
    }
    return all;
  })();

  const resetInputState = useCallback(() => {
    setSubmitted(false);
    setIsCorrect(false);
    setUserAnswer('');
    setTextInput('');
    setCandidates(null);
    setIsRecognizing(false);
    setCharBuffer('');
    padRef.current?.clear();
  }, []);

  // 문제 전환 시 입력 초기
  useEffect(() => {
    resetInputState();
  }, [index, resetInputState]);

  const applyResult = (answer: string) => {
    if (!current || submitted) return;
    const ok = checkExamAnswer(current, answer);
    setUserAnswer(answer);
    setIsCorrect(ok);
    setSubmitted(true);
    setCandidates(null);
    if (ok) setCorrectCount((c) => c + 1);
    else setWrongCount((c) => c + 1);
    // 문항별 결과 저장 (세부 결과·복습용)
    setResults((prev) => {
      const next = prev.slice();
      while (next.length < total) next.push(null);
      next[index] = { correct: ok, userAnswer: answer };
      return next;
    });
  };

  const handleTextSubmit = () => {
    if (!textInput.trim()) {
      alert('답을 입력해 주세요.');
      return;
    }
    applyResult(textInput.trim());
  };

  const handleChoiceSelect = (opt: string) => {
    // 번호만 추출해 제출 (① 勞動 → ①)
    const m = opt.match(/^[①②③④⑤⑥⑦⑧⑨⑩⑪⑫]/);
    applyResult(m ? m[0] : opt);
  };

  /** 필기 → 인식 → 후보 표시 */
  const handleRecognize = async () => {
    const strokes = padRef.current?.getStrokes() ?? [];
    if (strokes.length === 0) {
      alert('한자를 써 주세요.');
      return;
    }
    setIsRecognizing(true);
    try {
      // hybrid: Google 주력 + 실패 시 로컬(hanzilookup-js) fallback
      const list = await recognizeCharsByEngine('hybrid', strokes, getPadSize());
      if (list.length === 0) {
        alert('인식된 후보가 없습니다. 다시 써 주세요.');
        return;
      }
      setCandidates(list.slice(0, 8));
    } catch (err) {
      console.error(err);
      alert('인식 중 오류가 발생했습니다.');
    } finally {
      setIsRecognizing(false);
    }
  };

  /** 단글자: 후보 선택 → 바로 채점 */
  const handlePickSingle = (char: string) => {
    applyResult(char);
  };

  /** 복수 글자: 후보 선택 → 버퍼에 추가 */
  const handlePickMulti = (char: string) => {
    if (!current) return;
    const next = charBuffer + char;
    setCharBuffer(next);
    setCandidates(null);
    padRef.current?.clear();

    const targetLen = (current.answer || '').replace(/\s+/g, '').length;
    // 목표 글자 수에 도달하면 자동 제출
    if (targetLen > 0 && next.length >= targetLen) {
      applyResult(next);
    }
  };

  const handleMultiSubmitNow = () => {
    if (!charBuffer) {
      alert('한 글자 이상 입력해 주세요.');
      return;
    }
    applyResult(charBuffer);
  };

  const handleNext = () => {
    if (index + 1 >= total) {
      setCompleted(true);
      return;
    }
    setIndex((i) => i + 1);
  };

  // ---------- 완료 화면 (점수 / 세부 결과 표 / 복습) ----------
  if (completed) {
    const FILTER_LABELS: Record<'all' | 'wrong', string> = {
      all: '모두 보기',
      wrong: '오답 보기',
    };

    /** 우측 상단: 모두 보기 / 오답 보기 드롭다운 (Method22 모드 선택과 동일 패턴) */
    const FilterDropdown = () => (
      <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-20">
        <div className="relative" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => setFilterMenuOpen((o) => !o)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border-2 border-gray-200 shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50"
            aria-haspopup="listbox"
            aria-expanded={filterMenuOpen}
          >
            <span className="text-xs text-gray-400">모드</span>
            <span>{FILTER_LABELS[resultFilter]}</span>
            <span className="text-gray-400 text-xs">{filterMenuOpen ? '▲' : '▼'}</span>
          </button>
          {filterMenuOpen && (
            <ul
              role="listbox"
              className="absolute right-0 mt-1 w-40 rounded-xl border-2 border-gray-200 bg-white shadow-lg overflow-hidden text-left"
            >
              {(['all', 'wrong'] as const).map((key) => (
                <li key={key}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={resultFilter === key}
                    onClick={() => {
                      setResultFilter(key);
                      setFilterMenuOpen(false);
                      // 복습 중 필터 변경 시: 목록에 없으면 첫 항목으로
                      if (resultPhase === 'review') {
                        const nextList =
                          key === 'wrong'
                            ? questions
                                .map((_, i) => i)
                                .filter((i) => results[i]?.correct === false)
                            : questions.map((_, i) => i);
                        if (nextList.length === 0) {
                          setResultPhase('detail');
                        } else if (!nextList.includes(reviewIndex)) {
                          setReviewIndex(nextList[0]);
                        }
                      }
                    }}
                    className={`w-full px-3 py-2.5 text-left text-sm hover:bg-indigo-50 ${
                      resultFilter === key
                        ? 'bg-indigo-50 text-indigo-700 font-medium'
                        : 'text-gray-800'
                    }`}
                  >
                    {FILTER_LABELS[key]}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    );

    // ----- 복습 화면 -----
    if (resultPhase === 'review') {
      const q = questions[reviewIndex];
      const r = results[reviewIndex];
      const posInFilter = filteredIndices.indexOf(reviewIndex);
      const hasPrev = posInFilter > 0;
      const hasNext = posInFilter >= 0 && posInFilter < filteredIndices.length - 1;

      const goPrev = () => {
        if (!hasPrev) return;
        setReviewIndex(filteredIndices[posInFilter - 1]);
      };
      const goNext = () => {
        if (!hasNext) return;
        setReviewIndex(filteredIndices[posInFilter + 1]);
      };

      if (!q) {
        // 예외: 목록이 비면 번호 표로 (렌더 중 setState 대신 폴백 UI)
        return (
          <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <button
              type="button"
              onClick={() => setResultPhase('detail')}
              className="text-indigo-600 underline"
            >
              번호 표로 돌아가기
            </button>
          </div>
        );
      }

      const typeLabel =
        q.question_type === 'mean' ? '단어 뜻' : q.question_type;

      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 sm:p-6 relative">
          {/* 좌측 상단: 번호 표로 */}
          <button
            type="button"
            onClick={() => {
              setFilterMenuOpen(false);
              setResultPhase('detail');
            }}
            className="absolute top-3 left-3 sm:top-4 sm:left-4 z-20 px-3 py-2 rounded-xl bg-white border-2 border-gray-200 shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            ← 번호 표
          </button>
          <FilterDropdown />

          <div className="text-center max-w-md w-full mt-10 sm:mt-8">
            <p className="text-sm text-gray-500 mb-1">
              복습 {posInFilter + 1} / {filteredIndices.length}
              {resultFilter === 'wrong' ? ' (오답)' : ''}
            </p>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">
              {reviewIndex + 1}번 문제
            </h2>
            <p className="text-xs sm:text-sm text-gray-400 mb-4">
              {q.level} · {q.session}회 · {typeLabel}
            </p>

            <div className="bg-white p-5 sm:p-8 rounded-2xl sm:rounded-3xl shadow text-left">
              {q.instruction && (
                <p className="text-sm sm:text-base text-gray-500 mb-3 leading-relaxed">
                  {q.instruction}
                </p>
              )}
              <QuestionStem q={q} revealed />

              {/* 정답 */}
              <div className="mt-5 p-4 rounded-xl sm:rounded-2xl border bg-green-50 border-green-200 text-green-800">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 text-center">
                    <p className="text-sm opacity-80 mb-1">정답</p>
                    <p
                      className={`font-bold leading-tight break-all ${
                        hasHanja(q.answer_display || q.answer)
                          ? 'text-5xl sm:text-7xl md:text-8xl'
                          : 'text-2xl sm:text-3xl md:text-4xl'
                      }`}
                    >
                      {q.answer_display || q.answer}
                    </p>
                    {r && !r.correct && r.userAnswer && (
                      <p className="mt-2 text-sm text-red-600">
                        제출:{' '}
                        <span
                          className={
                            hasHanja(r.userAnswer) ? 'text-xl sm:text-2xl font-medium' : 'font-medium'
                          }
                        >
                          {r.userAnswer}
                        </span>
                      </p>
                    )}
                    {r && (
                      <p
                        className={`mt-2 text-sm font-medium ${
                          r.correct ? 'text-green-700' : 'text-red-600'
                        }`}
                      >
                        {r.correct ? '정답' : '오답'}
                      </p>
                    )}
                  </div>
                  {getExamDictQuery(q) && (
                    <HanjaDictLink
                      hanja={getExamDictQuery(q)}
                      className="flex-shrink-0 mt-1"
                    />
                  )}
                </div>
              </div>
            </div>

            {/* 이전 / 다음 (필터된 목록 기준) */}
            <div className="flex items-center justify-center gap-4 mt-5 sm:mt-6">
              <button
                type="button"
                onClick={goPrev}
                disabled={!hasPrev}
                className="w-12 h-12 sm:w-14 sm:h-14 rounded-full border-2 border-gray-200 bg-white text-xl sm:text-2xl font-bold text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed hover:border-indigo-300 hover:bg-indigo-50"
                aria-label="이전 문제"
              >
                ←
              </button>
              <span className="text-sm text-gray-500 min-w-[4rem]">
                {reviewIndex + 1}번
              </span>
              <button
                type="button"
                onClick={goNext}
                disabled={!hasNext}
                className="w-12 h-12 sm:w-14 sm:h-14 rounded-full border-2 border-gray-200 bg-white text-xl sm:text-2xl font-bold text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed hover:border-indigo-300 hover:bg-indigo-50"
                aria-label="다음 문제"
              >
                →
              </button>
            </div>
          </div>
        </div>
      );
    }

    // ----- 세부 결과 (문제 번호 표) -----
    if (resultPhase === 'detail') {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 sm:p-6 relative">
          <FilterDropdown />
          <div className="text-center max-w-md w-full mt-10 sm:mt-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">세부 결과</h2>
            <p className="text-sm text-gray-500 mb-1">{title}</p>
            {subtitle && <p className="text-xs text-gray-400 mb-4">{subtitle}</p>}
            <p className="text-xs text-gray-400 mb-4">
              {resultFilter === 'all'
                ? `전체 ${total}문항 · 번호를 누르면 복습`
                : `오답 ${filteredIndices.length}문항 · 번호를 누르면 복습`}
            </p>

            <div className="bg-white p-5 sm:p-6 rounded-2xl sm:rounded-3xl shadow">
              {filteredIndices.length === 0 ? (
                <p className="text-gray-500 py-8">
                  {resultFilter === 'wrong' ? '오답이 없습니다.' : '문항이 없습니다.'}
                </p>
              ) : (
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  {filteredIndices.map((i) => {
                    const ok = results[i]?.correct === true;
                    const wrong = results[i]?.correct === false;
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          setReviewIndex(i);
                          setFilterMenuOpen(false);
                          setResultPhase('review');
                        }}
                        className={`py-3 sm:py-4 rounded-xl border-2 text-lg sm:text-xl font-bold transition-colors ${
                          ok
                            ? 'border-blue-200 bg-blue-50 text-blue-600 hover:border-blue-400'
                            : wrong
                              ? 'border-red-200 bg-red-50 text-red-600 hover:border-red-400'
                              : 'border-gray-200 text-gray-400'
                        }`}
                      >
                        {i + 1}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="mt-5 sm:mt-6 space-y-2">
              <button
                type="button"
                onClick={() => {
                  setFilterMenuOpen(false);
                  setResultPhase('summary');
                }}
                className="w-full py-3 text-gray-600 underline text-sm sm:text-base"
              >
                ← 점수 화면으로
              </button>
              <button
                type="button"
                onClick={onBackToMenu}
                className="w-full py-2 text-gray-400 underline text-xs sm:text-sm"
              >
                기출문제 메뉴로 돌아가기
              </button>
            </div>
          </div>
        </div>
      );
    }

    // ----- 점수 요약 (기본) -----
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 sm:p-6">
        <div className="text-center max-w-md w-full bg-white p-8 sm:p-12 rounded-2xl sm:rounded-3xl shadow">
          <div className="text-5xl sm:text-6xl mb-4">🎉</div>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">풀이 완료</h2>
          <p className="text-gray-600 mb-1">{title}</p>
          {subtitle && <p className="text-sm text-gray-500 mb-4">{subtitle}</p>}
          <div className="my-6 space-y-1">
            <p className="text-indigo-600 font-medium text-lg">총 {total}문항</p>
            <p className="text-green-600 font-medium">정답 {correctCount}</p>
            <p className="text-red-500 font-medium">오답 {wrongCount}</p>
            {total > 0 && (
              <p className="text-gray-500 text-sm mt-2">
                정답률 {Math.round((correctCount / total) * 100)}%
              </p>
            )}
          </div>
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => {
                setResultFilter('all');
                setResultPhase('detail');
              }}
              className="w-full py-3 sm:py-4 bg-white border-2 border-indigo-500 text-indigo-700 rounded-2xl sm:rounded-3xl text-base sm:text-xl font-medium hover:bg-indigo-50"
            >
              세부 결과
            </button>
            <button
              type="button"
              onClick={onRestart}
              className="w-full py-3 sm:py-4 bg-indigo-600 text-white rounded-2xl sm:rounded-3xl text-base sm:text-xl font-medium"
            >
              다시 풀기
            </button>
            <button
              type="button"
              onClick={onBackToMenu}
              className="w-full py-3 sm:py-4 text-gray-500 underline text-sm sm:text-base"
            >
              ← 기출문제 메뉴로 돌아가기
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!current) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <p className="text-gray-500">문제가 없습니다.</p>
      </div>
    );
  }

  // ---------- 문제 화면 ----------
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 sm:p-6">
      <div className="text-center max-w-lg w-full">
        <div className="text-3xl sm:text-4xl mb-2">📜</div>
        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-1">{title}</h2>
        <p className="text-sm sm:text-base text-gray-500 mb-1">{progressLabel}</p>
        {subtitle && (
          <p className="text-xs sm:text-sm text-gray-400 mb-3">{subtitle}</p>
        )}

        <div className="bg-white p-5 sm:p-8 rounded-2xl sm:rounded-3xl shadow text-left">
          {/* 지시문 */}
          <p className="text-sm sm:text-base text-gray-500 mb-3 leading-relaxed">
            {current.instruction}
          </p>

          {/* 유형 뱃지 + 회차·번호 */}
          <div className="flex flex-wrap items-center gap-2 mb-4 text-xs sm:text-sm text-gray-400">
            <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 font-medium">
              {current.question_type === 'mean'
                ? '단어 뜻'
                : current.question_type}
            </span>
            <span>
              {current.level} · {current.session}회 · {current.question_no}번
            </span>
          </div>

          {/* 문제 본문 */}
          <QuestionStem q={current} revealed={submitted} />

          {/* ----- 입력 영역 ----- */}
          {!submitted && (
            <div className="mt-5 sm:mt-6">
              {kind === 'text' && (
                <div>
                  <input
                    type="text"
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleTextSubmit();
                    }}
                    placeholder={
                      current.question_type === 'hunum'
                        ? '예: 깊을 심'
                        : '독음을 입력하세요'
                    }
                    className="w-full text-center text-xl sm:text-2xl font-medium py-3 sm:py-4 border-2 border-indigo-200 focus:border-indigo-500 rounded-xl sm:rounded-2xl outline-none"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={handleTextSubmit}
                    className="mt-4 w-full py-3 sm:py-4 bg-indigo-600 text-white rounded-2xl sm:rounded-3xl text-base sm:text-xl font-medium"
                  >
                    제출
                  </button>
                </div>
              )}

              {kind === 'choice' && current.options && (
                <div className="space-y-2 sm:space-y-3">
                  {current.options.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => handleChoiceSelect(opt)}
                      className="w-full text-left px-4 py-3 sm:py-4 rounded-xl sm:rounded-2xl border-2 border-indigo-100 hover:border-indigo-400 hover:bg-indigo-50 text-base sm:text-lg font-medium text-gray-800 transition-colors"
                    >
                      <ChoiceOptionLabel text={opt} />
                    </button>
                  ))}
                </div>
              )}

              {(kind === 'hanja_single' || kind === 'hanja_multi') && (
                <div className="text-center">
                  {kind === 'hanja_multi' && (
                    <div className="mb-3">
                      <p className="text-sm text-gray-500 mb-1">
                        한 글자씩 쓰고 후보를 고르세요
                        {(current.answer || '').length > 0 && (
                          <span className="ml-1">
                            ({charBuffer.length}/{(current.answer || '').replace(/\s+/g, '').length})
                          </span>
                        )}
                      </p>
                      {/* 한자 버퍼: 기존 text-3xl/4xl → 2배 */}
                      <p className="text-6xl sm:text-8xl font-bold text-indigo-700 min-h-[3.5rem] sm:min-h-[5rem] tracking-wider leading-none">
                        {charBuffer || '·'}
                      </p>
                    </div>
                  )}

                  <HandwritingPad
                    ref={padRef}
                    disabled={isRecognizing || !!candidates}
                    className="mb-3 sm:mb-4 max-w-[240px] sm:max-w-xs mx-auto"
                  />

                  {!candidates && (
                    <div className="flex gap-2 sm:gap-3 mb-3 sm:mb-4">
                      <button
                        type="button"
                        onClick={() => padRef.current?.clear()}
                        disabled={isRecognizing}
                        className="flex-1 py-2 sm:py-3 rounded-xl sm:rounded-2xl border-2 border-gray-200 text-gray-700 text-sm sm:text-base font-medium hover:bg-gray-50 disabled:opacity-50"
                      >
                        지우기
                      </button>
                      <button
                        type="button"
                        onClick={() => padRef.current?.undo()}
                        disabled={isRecognizing}
                        className="flex-1 py-2 sm:py-3 rounded-xl sm:rounded-2xl border-2 border-gray-200 text-gray-700 text-sm sm:text-base font-medium hover:bg-gray-50 disabled:opacity-50"
                      >
                        실행취소
                      </button>
                    </div>
                  )}

                  {candidates && (
                    <div className="mb-4">
                      <p className="text-sm text-gray-600 mb-3">인식된 후보 중 선택하세요</p>
                      <div className="grid grid-cols-4 gap-2 sm:gap-3 max-w-sm sm:max-w-md mx-auto">
                        {candidates.map((char) => (
                          <button
                            key={char}
                            type="button"
                            onClick={() =>
                              kind === 'hanja_multi'
                                ? handlePickMulti(char)
                                : handlePickSingle(char)
                            }
                            /* 한자 후보: 기존 text-3xl/4xl → 2배 */
                            className="aspect-square flex items-center justify-center rounded-xl border-2 border-indigo-200 bg-indigo-50 text-6xl sm:text-8xl font-bold text-indigo-800 hover:bg-indigo-100 leading-none"
                          >
                            {char}
                          </button>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setCandidates(null);
                          padRef.current?.clear();
                        }}
                        className="mt-3 text-sm text-gray-500 underline"
                      >
                        다시 쓰기
                      </button>
                    </div>
                  )}

                  {!candidates && (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleRecognize}
                        disabled={isRecognizing}
                        className="flex-1 py-3 sm:py-4 bg-indigo-600 text-white rounded-2xl sm:rounded-3xl text-base sm:text-xl font-medium disabled:bg-gray-300"
                      >
                        {isRecognizing ? '인식 중...' : '인식하기'}
                      </button>
                      {kind === 'hanja_multi' && charBuffer.length > 0 && (
                        <button
                          type="button"
                          onClick={handleMultiSubmitNow}
                          className="flex-1 py-3 sm:py-4 bg-emerald-600 text-white rounded-2xl sm:rounded-3xl text-base sm:text-xl font-medium"
                        >
                          제출
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ----- 채점 결과 ----- */}
          {submitted && (
            <div className="mt-5 sm:mt-6">
              <div
                className={`text-center text-2xl sm:text-3xl font-bold mb-4 ${
                  isCorrect ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {isCorrect ? '정답입니다!' : '오답입니다'}
              </div>

              <div
                className={`p-4 rounded-xl sm:rounded-2xl border mb-4 ${
                  isCorrect
                    ? 'bg-green-50 border-green-200 text-green-800'
                    : 'bg-red-50 border-red-200 text-red-700'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 text-center">
                    <p className="text-sm opacity-80 mb-1">정답</p>
                    {/* 한자 정답만 2배, 한글(독음·훈음 등)은 기존 크기 유지 */}
                    <p
                      className={`font-bold leading-tight break-all ${
                        hasHanja(current.answer_display || current.answer)
                          ? 'text-6xl sm:text-8xl md:text-9xl'
                          : 'text-3xl sm:text-4xl md:text-5xl'
                      }`}
                    >
                      {current.answer_display || current.answer}
                    </p>
                    {userAnswer && !isCorrect && (
                      <p className="mt-2 text-sm">
                        제출:{' '}
                        <span
                          className={`font-medium ${
                            hasHanja(userAnswer) ? 'text-2xl sm:text-3xl' : ''
                          }`}
                        >
                          {userAnswer}
                        </span>
                      </p>
                    )}
                  </div>
                  {/* 한자가 정답에 포함되면 사전 링크 */}
                  {getExamDictQuery(current) && (
                    <HanjaDictLink
                      hanja={getExamDictQuery(current)}
                      className="flex-shrink-0 mt-1"
                    />
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={handleNext}
                className="w-full py-3 sm:py-5 bg-indigo-600 text-white rounded-2xl sm:rounded-3xl text-base sm:text-xl font-medium"
              >
                {index + 1 >= total ? '결과 보기' : '다음 문제'}
              </button>
            </div>
          )}
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

/** CJK 한자 포함 여부 (한글·숫자·기호만이면 false) */
function hasHanja(s: string): boolean {
  return /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/.test(s);
}

/** 문자열에서 CJK 한자만 추출 (사전 검색용 정리) */
function extractHanjaOnly(s: string): string {
  const m = s.match(/[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]+/g);
  return m ? m.join('') : '';
}

/**
 * 기출 유형별 네이버 한자사전 검색어.
 * - 독음/뜻고르기/단어뜻: target 한자(어)
 * - 훈음/부수/약자: target 한자
 * - 장음: 정답 번호에 해당하는 보기 한자어
 * - 반의·상대/유의: 빈칸 위치에 따라 target+정답 결합
 * - 동음/한자어쓰기: 정답 한자어
 * - 성어: target의 (훈) 자리를 정답 한자로 채운 사자성어
 */
function getExamDictQuery(q: ExamQuestion): string {
  const type = q.question_type || '';
  const target = (q.target || '').trim();
  const answer = (q.answer || '').trim();
  const answerDisp = (q.answer_display || answer).trim();

  switch (type) {
    case 'dokum':
    case 'uut_select':
    case 'mean':
      return target || extractHanjaOnly(q.question_text || '');

    case 'hunum':
    case 'bushu':
    case 'yakja':
      return target;

    case 'jangum':
      return extractJangumDictWord(q);

    case 'banui':
    case 'yui':
      return combineBlankWithTarget(q);

    case 'dongeum':
    case 'hanjaeo_write':
      return extractHanjaOnly(answerDisp || answer) || answerDisp || answer;

    case 'seong-eo':
      return completeSeongEoDictWord(q);

    default:
      return target || extractHanjaOnly(answerDisp || answer) || answerDisp || answer;
  }
}

/** 장음: 정답 번호(①②…)에 해당하는 보기에서 한자어 추출 */
function extractJangumDictWord(q: ExamQuestion): string {
  const opts = q.options ?? [];
  const ans = (q.answer || '').trim();
  if (!ans || opts.length === 0) return '';
  const hit = opts.find((o) => o.trim().startsWith(ans));
  if (!hit) return '';
  // "② 老人" → 老人
  const rest = hit.replace(/^[①②③④⑤⑥⑦⑧⑨⑩⑪⑫]\s*/, '').trim();
  return extractHanjaOnly(rest) || rest;
}

/**
 * 반의·상대 / 유의: 문장 속 빈칸(  ) 위치에 따라
 * 빈칸이 target 앞이면 정답+target, 뒤이면 target+정답.
 */
function combineBlankWithTarget(q: ExamQuestion): string {
  const text = q.question_text || '';
  const target = (q.target || '').trim();
  const answer = (q.answer || '').trim();
  if (!target && !answer) return '';
  if (!target) return answer;
  if (!answer) return target;

  const blankRe = /\(\s*\)|（\s*）/;
  const blankMatch = text.match(blankRe);
  const tIdx = text.indexOf(target);

  if (blankMatch && blankMatch.index != null && tIdx >= 0) {
    // 빈칸이 target보다 앞 → 加減 형태 / 뒤 → 孤獨 형태
    if (blankMatch.index < tIdx) return answer + target;
    return target + answer;
  }

  // 문장에 target이 없으면 기본: target + answer
  return target + answer;
}

/**
 * 성어: target의 (한글훈) 자리를 정답 한자로 치환 → 온전한 사자성어
 * 예: 惡戰(고)鬪 + 苦 → 惡戰苦鬪
 */
function completeSeongEoDictWord(q: ExamQuestion): string {
  const target = (q.target || '').trim();
  const answer = (q.answer || '').trim();
  if (!target) return answer;
  if (!answer) return extractHanjaOnly(target) || target;

  const filled = target
    .replace(/\([^)]*\)/g, answer)
    .replace(/（[^）]*）/g, answer);
  return extractHanjaOnly(filled) || filled;
}

/**
 * 객관식 보기 라벨: 번호·한글은 기존 크기, 한자만 2배
 * 예: "① 勞動" → ①(기본) + 勞動(2배)
 */
function ChoiceOptionLabel({ text }: { text: string }) {
  // 원문자 번호 + 나머지 분리
  const m = text.match(/^([①②③④⑤⑥⑦⑧⑨⑩⑪⑫]\s*)(.*)$/);
  if (!m) {
    return hasHanja(text) ? (
      <span className="text-2xl sm:text-3xl font-bold tracking-wide">{text}</span>
    ) : (
      <span>{text}</span>
    );
  }
  const [, prefix, rest] = m;
  if (!rest || !hasHanja(rest)) {
    return <span>{text}</span>;
  }
  return (
    <span>
      <span>{prefix}</span>
      <span className="text-2xl sm:text-3xl font-bold tracking-wide align-middle">
        {rest}
      </span>
    </span>
  );
}

/** 문제 본문 표시: target(한자)만 2배, 한글 문장은 기존 크기 유지 */
function QuestionStem({ q, revealed }: { q: ExamQuestion; revealed: boolean }) {
  const text = q.question_text || '';
  const target = q.target || '';

  // jangum 등 본문 없는 경우
  if (!text && !target) {
    return null;
  }

  // target만 있는 경우 (hunum, bushu 등) — 한자 단독 표시 → 2배
  // 기존 text-5xl/6xl/7xl → text-[6rem]/[7.5rem]/[9rem]
  if (!text && target) {
    return (
      <div className="text-center my-4 sm:my-6">
        <p className="text-[6rem] sm:text-[7.5rem] md:text-[9rem] font-bold leading-none">
          {target}
        </p>
      </div>
    );
  }

  // 문장 + target 강조: 한글 문장 크기 유지, 밑줄 한자(target)만 2배
  // 문장: text-lg/xl/2xl 유지
  // target: 약 2배 → text-4xl / text-[2.5rem] / text-5xl
  if (text && target && text.includes(target)) {
    const parts = text.split(target);
    return (
      <p className="text-lg sm:text-xl md:text-2xl font-medium leading-relaxed text-gray-900 text-center my-3 sm:my-4">
        {parts.map((part, i) => (
          <span key={i}>
            {part}
            {i < parts.length - 1 && (
              <span
                className={`inline-block font-bold underline decoration-2 underline-offset-4 text-4xl sm:text-[2.5rem] md:text-5xl mx-0.5 align-middle leading-none ${
                  revealed
                    ? 'text-indigo-700 decoration-indigo-400'
                    : 'text-indigo-600 decoration-indigo-300'
                }`}
              >
                {target}
              </span>
            )}
          </span>
        ))}
      </p>
    );
  }

  // 문장만 (한글 크기 유지) + 별도 target이 한자면 2배
  return (
    <div className="text-center my-3 sm:my-4">
      <p className="text-lg sm:text-xl md:text-2xl font-medium leading-relaxed text-gray-900">
        {text}
      </p>
      {target && target !== text && (
        <p
          className={`mt-3 font-bold text-indigo-700 leading-none ${
            hasHanja(target)
              ? 'text-6xl sm:text-8xl'
              : 'text-3xl sm:text-4xl'
          }`}
        >
          {target}
        </p>
      )}
    </div>
  );
}
