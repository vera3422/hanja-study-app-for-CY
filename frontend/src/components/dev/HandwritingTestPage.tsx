/**
 * 필기 인식 엔진 비교 테스트 (실험용)
 *
 * - 홈 → 「필기 인식 테스트」에서만 진입
 * - 로컬 / Google / 하이브리드 / 병렬 비교
 * - 제거 시: 이 파일 + App의 handwriting-test mode·버튼만 삭제하면 됨
 */

import { useRef, useState } from 'react';
import HandwritingPad, { type HandwritingPadHandle } from '../learning/HandwritingPad';
import {
  recognizeByEngine,
  recognizeGoogle,
  recognizeLocal,
  type RecognizeEngine,
  type RecognizeResult,
} from '../../lib/recognizeEngines';

type TestMode = RecognizeEngine | 'parallel';

interface HandwritingTestPageProps {
  onBack: () => void;
}

export default function HandwritingTestPage({ onBack }: HandwritingTestPageProps) {
  const padRef = useRef<HandwritingPadHandle>(null);
  const [mode, setMode] = useState<TestMode>('hybrid');
  const [busy, setBusy] = useState(false);
  const [single, setSingle] = useState<RecognizeResult | null>(null);
  const [parallelLocal, setParallelLocal] = useState<RecognizeResult | null>(null);
  const [parallelGoogle, setParallelGoogle] = useState<RecognizeResult | null>(null);

  const getCanvasSize = () => {
    // HandwritingPad는 aspect-square w-full — 대략 영역 추정
    // 정확히는 pad DOM을 재지만, writing_guide는 상대 좌표와 비율이 중요
    const el = document.querySelector('canvas[aria-label="한자 필기 영역"]') as HTMLCanvasElement | null;
    if (el) {
      const r = el.getBoundingClientRect();
      return { width: Math.max(Math.round(r.width), 50), height: Math.max(Math.round(r.height), 50) };
    }
    return { width: 280, height: 280 };
  };

  const runRecognize = async () => {
    const strokes = padRef.current?.getStrokes() ?? [];
    if (strokes.length === 0) {
      alert('한자를 써 주세요.');
      return;
    }
    setBusy(true);
    setSingle(null);
    setParallelLocal(null);
    setParallelGoogle(null);
    const size = getCanvasSize();
    try {
      if (mode === 'parallel') {
        const [loc, goo] = await Promise.all([
          recognizeLocal(strokes),
          recognizeGoogle(strokes, size),
        ]);
        setParallelLocal(loc);
        setParallelGoogle(goo);
      } else {
        const r = await recognizeByEngine(mode, strokes, size);
        setSingle(r);
      }
    } catch (e) {
      console.error(e);
      alert('인식 중 오류가 발생했습니다.');
    } finally {
      setBusy(false);
    }
  };

  const clearPad = () => {
    padRef.current?.clear();
    setSingle(null);
    setParallelLocal(null);
    setParallelGoogle(null);
  };

  const modeButtons: { id: TestMode; label: string; desc: string }[] = [
    { id: 'local', label: '로컬만', desc: 'hanzilookup-js' },
    { id: 'google', label: 'Google만', desc: 'Backend 프록시' },
    { id: 'hybrid', label: '하이브리드', desc: 'Google → 로컬 fallback' },
    { id: 'parallel', label: '병렬 비교', desc: '둘 다 호출·나란히 표시' },
  ];

  const CandidateList = ({
    title,
    result,
  }: {
    title: string;
    result: RecognizeResult | null;
  }) => (
    <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-5 shadow-sm">
      <div className="flex items-baseline justify-between gap-2 mb-3">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900">{title}</h3>
        {result && (
          <span className="text-xs text-gray-500">
            {result.elapsedMs}ms · {result.usedEngine}
          </span>
        )}
      </div>
      {!result && <p className="text-sm text-gray-400">아직 결과 없음</p>}
      {result?.error && (
        <p className="text-xs sm:text-sm text-amber-700 mb-2 break-all">{result.error}</p>
      )}
      {result && result.candidates.length === 0 && !result.error && (
        <p className="text-sm text-gray-500">후보 없음</p>
      )}
      {result && result.candidates.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {result.candidates.map((c, i) => (
            <span
              key={`${c.character}-${i}`}
              className="inline-flex items-center justify-center min-w-[2.5rem] h-12 px-2
                text-2xl sm:text-3xl font-medium bg-indigo-50 text-indigo-950
                rounded-xl border border-indigo-100"
              title={c.source}
            >
              {c.character}
            </span>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm py-4 sm:py-6">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <p className="text-xs sm:text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mb-3">
            실험용 화면입니다. 실사용 Method 2-2와 분리되어 있으며, 나중에 쉽게 제거할 수 있습니다.
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">필기 인식 테스트</h1>
          <p className="text-sm text-gray-600 mt-1">
            엔진을 고른 뒤 한자를 쓰고 「인식 실행」을 누르세요. (언어: zh_TW)
          </p>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6">
        {/* 엔진 선택 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          {modeButtons.map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => {
                setMode(b.id);
                setSingle(null);
                setParallelLocal(null);
                setParallelGoogle(null);
              }}
              className={`p-3 sm:p-4 rounded-xl border text-left transition-all ${
                mode === b.id
                  ? 'border-indigo-500 bg-indigo-50 shadow-sm'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="text-sm sm:text-base font-semibold text-gray-900">{b.label}</div>
              <div className="text-xs text-gray-500 mt-0.5">{b.desc}</div>
            </button>
          ))}
        </div>

        {/* 캔버스 */}
        <div className="max-w-sm mx-auto w-full">
          <HandwritingPad ref={padRef} showGrid disabled={busy} />
        </div>

        <div className="flex flex-wrap gap-3 justify-center">
          <button
            type="button"
            onClick={runRecognize}
            disabled={busy}
            className="px-6 py-3 rounded-xl bg-indigo-600 text-white font-medium
              hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {busy ? '인식 중…' : '인식 실행'}
          </button>
          <button
            type="button"
            onClick={clearPad}
            disabled={busy}
            className="px-6 py-3 rounded-xl bg-white border border-gray-200 text-gray-800
              hover:bg-gray-50 disabled:opacity-50"
          >
            지우기
          </button>
          <button
            type="button"
            onClick={onBack}
            className="px-6 py-3 rounded-xl bg-white border border-gray-300 text-gray-700
              hover:bg-gray-50 font-medium"
          >
            ← 홈으로 돌아가기
          </button>
        </div>

        {/* 결과 */}
        {mode === 'parallel' ? (
          <div className="grid sm:grid-cols-2 gap-4">
            <CandidateList title="로컬 (hanzilookup-js)" result={parallelLocal} />
            <CandidateList title="Google (프록시)" result={parallelGoogle} />
          </div>
        ) : (
          <CandidateList
            title={
              mode === 'local'
                ? '로컬 결과'
                : mode === 'google'
                  ? 'Google 결과'
                  : '하이브리드 결과'
            }
            result={single}
          />
        )}

        <p className="text-xs text-gray-400 text-center pb-8">
          Google은 Backend(/api/recognize-handwriting)가 떠 있어야 합니다. 로컬만은 오프라인도 가능합니다.
        </p>
      </main>
    </div>
  );
}
