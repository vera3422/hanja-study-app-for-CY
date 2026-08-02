import { useState, useCallback } from 'react';
import { apiClient, type StudyItem } from '../../api/apiClient';
import HanjaDictLink from './HanjaDictLink';

interface MethodProps {
  selectedLevel: string;
  onBackToMenu: () => void;
}

/** 배열을 복사한 뒤 Fisher–Yates 셔플 */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function Method31({ selectedLevel, onBackToMenu }: MethodProps) {
  const [items, setItems] = useState<StudyItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [started, setStarted] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const current = items[currentIndex] ?? null;
  const total = items.length;
  const progressLabel = total > 0 ? `${currentIndex + 1} / ${total}` : '';

  const loadList = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setCompleted(false);
    setRevealed(false);
    setCurrentIndex(0);
    try {
      const data = await apiClient.getStudyList(selectedLevel);
      if (data.error) {
        setError(data.error);
        setItems([]);
        return;
      }
      if (!data.items || data.items.length === 0) {
        setError(`'${selectedLevel}'에 해당하는 한자가 없습니다.`);
        setItems([]);
        return;
      }
      setItems(shuffle(data.items));
      setStarted(true);
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : String(err);
      setError(`목록을 불러오는 데 실패했습니다.\n${message}`);
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedLevel]);

  const handleReveal = () => {
    setRevealed(true);
  };

  const handleNext = () => {
    if (currentIndex + 1 >= total) {
      setCompleted(true);
      setRevealed(false);
      return;
    }
    setCurrentIndex((i) => i + 1);
    setRevealed(false);
  };

  const handleRestart = () => {
    // 같은 급수로 다시 셔플해서 시작
    loadList();
  };

  // ---------- 완료 화면 ----------
  if (completed) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 sm:p-6">
        <div className="text-center max-w-md w-full bg-white p-8 sm:p-12 rounded-2xl sm:rounded-3xl shadow">
          <div className="text-5xl sm:text-6xl mb-4">🎉</div>
          <h2 className="text-2xl sm:text-3xl font-bold mb-2">학습 완료</h2>
          <p className="text-gray-600 mb-1">{selectedLevel} · 한자 → 훈/음 보기</p>
          <p className="text-indigo-600 font-medium mb-8">
            총 {total}자를 모두 확인했습니다
          </p>
          <div className="space-y-3">
            <button
              onClick={handleRestart}
              className="w-full py-3 sm:py-4 bg-indigo-600 text-white rounded-2xl sm:rounded-3xl text-base sm:text-xl font-medium"
            >
              다시 학습하기
            </button>
            <button
              onClick={onBackToMenu}
              className="w-full py-3 sm:py-4 text-gray-500 underline text-sm sm:text-base"
            >
              ← 학습 하기 메뉴로 돌아가기
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---------- 시작 전 / 로딩 / 에러 ----------
  if (!started || isLoading || error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 sm:p-6">
        <div className="text-center max-w-md w-full">
          <div className="text-4xl sm:text-5xl md:text-6xl mb-4 sm:mb-6">🈶</div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4">
            {selectedLevel} 학습 (3-1)
          </h2>
          <p className="text-sm sm:text-base text-gray-600 mb-6 sm:mb-8">
            한자를 보고 훈/음을 떠올린 뒤 확인합니다
          </p>

          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-xl text-sm sm:text-base whitespace-pre-line">
              {error}
            </div>
          )}

          <button
            onClick={loadList}
            disabled={isLoading}
            className="w-full py-3 sm:py-5 bg-indigo-600 text-white rounded-2xl sm:rounded-3xl text-base sm:text-xl font-medium disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {isLoading ? '목록 불러오는 중...' : '학습 시작하기'}
          </button>

          <button
            onClick={onBackToMenu}
            className="mt-4 sm:mt-6 text-gray-500 underline text-sm sm:text-base"
          >
            ← 학습 하기 메뉴로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  // ---------- 학습 중 ----------
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 sm:p-6">
      <div className="text-center max-w-md w-full">
        <div className="text-4xl sm:text-5xl md:text-6xl mb-2 sm:mb-3">🈶</div>
        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold mb-1 sm:mb-2">
          {selectedLevel} 학습 (3-1)
        </h2>
        <p className="text-sm sm:text-base text-gray-500 mb-4 sm:mb-6">
          {progressLabel}
        </p>

        {current && (
          <div className="bg-white p-5 sm:p-8 rounded-2xl sm:rounded-3xl shadow">
            {/* 한자 (네이버 링크는 공개 후에만 표시) */}
            <div className="flex items-center justify-center gap-2 sm:gap-3 md:gap-4 mb-6 sm:mb-8">
              {revealed && current.hanja ? (
                <HanjaDictLink hanja={current.hanja} className="flex-shrink-0" />
              ) : (
                <span className="w-8 h-8 sm:w-9 sm:h-9 flex-shrink-0 invisible" aria-hidden />
              )}
              <p className="text-[100px] sm:text-[140px] md:text-[180px] font-bold leading-none">
                {current.hanja}
              </p>
              <span className="w-8 h-8 sm:w-9 sm:h-9 flex-shrink-0 invisible" aria-hidden />
            </div>

            {/* 훈/음 영역 */}
            <div className="min-h-[3rem] sm:min-h-[3.5rem] mb-6 sm:mb-8 flex items-center justify-center">
              {revealed ? (
                <p className="text-xl sm:text-2xl md:text-3xl font-medium text-gray-800">
                  {current.correct_hun_eum || '(훈/음 없음)'}
                </p>
              ) : (
                <p className="text-base sm:text-lg text-gray-400">
                  마음속으로 훈/음을 떠올려 보세요
                </p>
              )}
            </div>

            {/* 버튼 */}
            {!revealed ? (
              <button
                onClick={handleReveal}
                className="w-full py-3 sm:py-5 bg-indigo-600 text-white rounded-2xl sm:rounded-3xl text-base sm:text-xl font-medium"
              >
                훈/음 보기
              </button>
            ) : (
              <button
                onClick={handleNext}
                className="w-full py-3 sm:py-5 bg-indigo-600 text-white rounded-2xl sm:rounded-3xl text-base sm:text-xl font-medium"
              >
                {currentIndex + 1 >= total ? '학습 완료' : '다음 한자'}
              </button>
            )}
          </div>
        )}

        <button
          onClick={onBackToMenu}
          className="mt-4 sm:mt-6 text-gray-500 underline text-sm sm:text-base"
        >
          ← 학습 하기 메뉴로 돌아가기
        </button>
      </div>
    </div>
  );
}
