/**
 * 기출문제 공통 플레이어 (4-1 / 4-2)
 * - SRS 미적용, 클라이언트 채점
 * - 유형별 입력: 텍스트 / 보기 버튼 / 필기+8후보 (단·복수 글자)
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import type { ExamQuestion } from '../../api/apiClient';
import HandwritingPad, { type HandwritingPadHandle } from './HandwritingPad';
import { recognizeHanja } from '../../lib/hanjaRecognizer';
import HanjaDictLink from './HanjaDictLink';

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

  const padRef = useRef<HandwritingPadHandle>(null);
  const total = questions.length;
  const current = questions[index] ?? null;
  const kind = current ? getInputKind(current.question_type) : 'text';
  const progressLabel = total > 0 ? `${index + 1} / ${total}` : '';

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
      const list = await recognizeHanja(strokes);
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

  // ---------- 완료 화면 ----------
  if (completed) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 sm:p-6">
        <div className="text-center max-w-md w-full bg-white p-8 sm:p-12 rounded-2xl sm:rounded-3xl shadow">
          <div className="text-5xl sm:text-6xl mb-4">🎉</div>
          <h2 className="text-2xl sm:text-3xl font-bold mb-2">풀이 완료</h2>
          <p className="text-gray-600 mb-1">{title}</p>
          {subtitle && <p className="text-sm text-gray-500 mb-4">{subtitle}</p>}
          <div className="my-6 space-y-1">
            <p className="text-indigo-600 font-medium text-lg">
              총 {total}문항
            </p>
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
              onClick={onRestart}
              className="w-full py-3 sm:py-4 bg-indigo-600 text-white rounded-2xl sm:rounded-3xl text-base sm:text-xl font-medium"
            >
              다시 풀기
            </button>
            <button
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
        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold mb-1">{title}</h2>
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
                  {(current.answer || current.target) && (
                    <HanjaDictLink
                      hanja={(current.target || current.answer || '').slice(0, 1)}
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
