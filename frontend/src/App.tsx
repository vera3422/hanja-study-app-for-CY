import { useState } from 'react';
import Method11 from './components/learning/Method11';
import Method12 from './components/learning/Method12';
import Method21 from './components/learning/Method21';
import Method22 from './components/learning/Method22';
import Method31 from './components/learning/Method31';
import Method32 from './components/learning/Method32';
import Method41 from './components/learning/Method41';
import Method42 from './components/learning/Method42';

type AppMode =
  | 'home'
  | 'study-menu'
  | 'quiz-menu'
  | 'exam-menu'
  | '1-1' | '1-2' | '2-1' | '2-2'
  | '3-1' | '3-2'
  | '4-1' | '4-2';

function App() {
  // 학습 하기 / 맞추기 급수를 서로 독립적으로 관리
  const [studyLevel, setStudyLevel] = useState('8급');
  const [quizLevel, setQuizLevel] = useState('8급');
  const [mode, setMode] = useState<AppMode>('home');

  const levels = [
    '8급', '7급Ⅱ', '7급', '6급Ⅱ', '6급', '5급Ⅱ', '5급',
    '4급Ⅱ', '4급', '3급Ⅱ', '3급', '2급', '1급',
  ];

  // 맞추기(1-1~2-2) → quiz-menu 로 복귀
  const handleBackToQuizMenu = () => setMode('quiz-menu');
  // 학습 하기(3-1/3-2) → study-menu 로 복귀
  const handleBackToStudyMenu = () => setMode('study-menu');
  // 기출(4-1/4-2) → exam-menu 로 복귀
  const handleBackToExamMenu = () => setMode('exam-menu');

  // ---------- 학습 방법별 화면 ----------
  if (mode === '1-1') return <Method11 selectedLevel={quizLevel} onBackToMenu={handleBackToQuizMenu} />;
  if (mode === '1-2') return <Method12 selectedLevel={quizLevel} onBackToMenu={handleBackToQuizMenu} />;
  if (mode === '2-1') return <Method21 selectedLevel={quizLevel} onBackToMenu={handleBackToQuizMenu} />;
  if (mode === '2-2') return <Method22 selectedLevel={quizLevel} onBackToMenu={handleBackToQuizMenu} />;
  if (mode === '3-1') return <Method31 selectedLevel={studyLevel} onBackToMenu={handleBackToStudyMenu} />;
  if (mode === '3-2') return <Method32 selectedLevel={studyLevel} onBackToMenu={handleBackToStudyMenu} />;
  if (mode === '4-1') return <Method41 onBackToMenu={handleBackToExamMenu} />;
  if (mode === '4-2') return <Method42 onBackToMenu={handleBackToExamMenu} />;

  // ---------- 공통 헤더 ----------
  const Header = () => (
    <header className="bg-white shadow-sm py-5 sm:py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900">한자 학습</h1>
        <p className="text-sm sm:text-base text-gray-600 mt-1 sm:mt-2">
          한국어문회 한자능력검정시험 학습 도우미
        </p>
      </div>
    </header>
  );

  // ---------- 1) 홈 화면 ----------
  if (mode === 'home') {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-16">
          <div className="max-w-2xl mx-auto space-y-4 sm:space-y-6 md:space-y-8">
            {/* 학습 하기 */}
            <button
              onClick={() => setMode('study-menu')}
              className="w-full p-5 sm:p-8 md:p-10 bg-white rounded-2xl sm:rounded-3xl border border-gray-100 hover:border-indigo-400 hover:shadow-2xl transition-all group"
            >
              <div className="flex items-start gap-4 sm:gap-6 md:gap-8">
                <div className="text-4xl sm:text-5xl md:text-7xl flex-shrink-0">📖</div>
                <div className="text-left">
                  <h3 className="text-xl sm:text-2xl md:text-3xl font-semibold mb-1 sm:mb-2 md:mb-3">
                    학습 하기
                  </h3>
                  <p className="text-sm sm:text-base md:text-xl text-gray-600">
                    한자·훈/음을 하나씩 확인하며 공부합니다 (3-1, 3-2)
                  </p>
                </div>
              </div>
            </button>

            {/* 한자 or 훈/음 맞추기 */}
            <button
              onClick={() => setMode('quiz-menu')}
              className="w-full p-5 sm:p-8 md:p-10 bg-white rounded-2xl sm:rounded-3xl border border-gray-100 hover:border-indigo-400 hover:shadow-2xl transition-all group"
            >
              <div className="flex items-start gap-4 sm:gap-6 md:gap-8">
                <div className="text-4xl sm:text-5xl md:text-7xl flex-shrink-0">✏️</div>
                <div className="text-left">
                  <h3 className="text-xl sm:text-2xl md:text-3xl font-semibold mb-1 sm:mb-2 md:mb-3">
                    한자 or 훈/음 맞추기
                  </h3>
                  <p className="text-sm sm:text-base md:text-xl text-gray-600">
                    문제를 풀며 복습합니다 (1-1 ~ 2-2)
                  </p>
                </div>
              </div>
            </button>

            {/* 기출문제 풀이 */}
            <button
              onClick={() => setMode('exam-menu')}
              className="w-full p-5 sm:p-8 md:p-10 bg-white rounded-2xl sm:rounded-3xl border border-gray-100 hover:border-indigo-400 hover:shadow-2xl transition-all group"
            >
              <div className="flex items-start gap-4 sm:gap-6 md:gap-8">
                <div className="text-4xl sm:text-5xl md:text-7xl flex-shrink-0">📜</div>
                <div className="text-left">
                  <h3 className="text-xl sm:text-2xl md:text-3xl font-semibold mb-1 sm:mb-2 md:mb-3">
                    기출문제 풀이
                  </h3>
                  <p className="text-sm sm:text-base md:text-xl text-gray-600">
                    실제 시험 기출을 회차·랜덤으로 풉니다 (4-1, 4-2)
                  </p>
                </div>
              </div>
            </button>
          </div>
        </main>
      </div>
    );
  }

  // ---------- 2) 학습 하기 메뉴 (3-1, 3-2) ----------
  if (mode === 'study-menu') {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-16">
          <div className="max-w-md mx-auto text-center mb-10 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl font-semibold mb-4 sm:mb-6">급수 선택</h2>
            <div className="bg-white p-5 sm:p-8 rounded-2xl sm:rounded-3xl shadow-sm border border-gray-100">
              <label className="block text-base sm:text-lg font-medium text-gray-700 mb-3 sm:mb-4">
                학습할 급수
              </label>
              <select
                value={studyLevel}
                onChange={(e) => setStudyLevel(e.target.value)}
                className="w-full text-2xl sm:text-3xl md:text-4xl font-bold text-center bg-transparent focus:outline-none cursor-pointer py-3 sm:py-5 border-2 border-indigo-200 focus:border-indigo-500 rounded-xl sm:rounded-2xl"
              >
                {levels.map((level) => (
                  <option key={level} value={level}>{level}</option>
                ))}
              </select>
              <p className="mt-3 text-xs sm:text-sm text-gray-500">
                선택한 급수에 해당하는 한자만 학습합니다
              </p>
            </div>
          </div>

          <div className="max-w-2xl mx-auto space-y-4 sm:space-y-6 md:space-y-8">
            {/* 3-1 */}
            <button
              onClick={() => setMode('3-1')}
              className="w-full p-5 sm:p-8 md:p-10 bg-white rounded-2xl sm:rounded-3xl border border-gray-100 hover:border-indigo-400 hover:shadow-2xl transition-all group"
            >
              <div className="flex items-start gap-4 sm:gap-6 md:gap-8">
                <div className="text-4xl sm:text-5xl md:text-7xl flex-shrink-0">🈶</div>
                <div className="text-left">
                  <h3 className="text-xl sm:text-2xl md:text-3xl font-semibold mb-1 sm:mb-2 md:mb-3">
                    한자 → 훈/음 보기
                  </h3>
                  <p className="text-sm sm:text-base md:text-xl text-gray-600">
                    한자를 보고 훈/음을 떠올린 뒤 확인합니다 (3-1)
                  </p>
                </div>
              </div>
            </button>

            {/* 3-2 */}
            <button
              onClick={() => setMode('3-2')}
              className="w-full p-5 sm:p-8 md:p-10 bg-white rounded-2xl sm:rounded-3xl border border-gray-100 hover:border-indigo-400 hover:shadow-2xl transition-all group"
            >
              <div className="flex items-start gap-4 sm:gap-6 md:gap-8">
                <div className="text-4xl sm:text-5xl md:text-7xl flex-shrink-0">✍️</div>
                <div className="text-left">
                  <h3 className="text-xl sm:text-2xl md:text-3xl font-semibold mb-1 sm:mb-2 md:mb-3">
                    훈/음 → 한자 쓰기
                  </h3>
                  <p className="text-sm sm:text-base md:text-xl text-gray-600">
                    훈/음을 보고 한자를 써 본 뒤 확인합니다 (3-2)
                  </p>
                </div>
              </div>
            </button>
          </div>

          <div className="max-w-2xl mx-auto mt-8 sm:mt-10 text-center">
            <button
              onClick={() => setMode('home')}
              className="text-gray-500 underline text-sm sm:text-base"
            >
              ← 홈으로 돌아가기
            </button>
          </div>
        </main>
      </div>
    );
  }

  // ---------- 2-b) 기출문제 메뉴 (4-1, 4-2) ----------
  if (mode === 'exam-menu') {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-16">
          <div className="max-w-md mx-auto text-center mb-10 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl font-semibold mb-2">기출문제 풀이</h2>
            <p className="text-sm sm:text-base text-gray-500">
              실제 시험 문항으로 연습합니다 (SRS 미적용)
            </p>
          </div>

          <div className="max-w-2xl mx-auto space-y-4 sm:space-y-6 md:space-y-8">
            {/* 4-1 */}
            <button
              onClick={() => setMode('4-1')}
              className="w-full p-5 sm:p-8 md:p-10 bg-white rounded-2xl sm:rounded-3xl border border-gray-100 hover:border-indigo-400 hover:shadow-2xl transition-all group"
            >
              <div className="flex items-start gap-4 sm:gap-6 md:gap-8">
                <div className="text-4xl sm:text-5xl md:text-7xl flex-shrink-0">📜</div>
                <div className="text-left">
                  <h3 className="text-xl sm:text-2xl md:text-3xl font-semibold mb-1 sm:mb-2 md:mb-3">
                    회차별 기출 풀이
                  </h3>
                  <p className="text-sm sm:text-base md:text-xl text-gray-600">
                    선택한 회차의 100문항을 번호 순서대로 풉니다 (4-1)
                  </p>
                </div>
              </div>
            </button>

            {/* 4-2 */}
            <button
              onClick={() => setMode('4-2')}
              className="w-full p-5 sm:p-8 md:p-10 bg-white rounded-2xl sm:rounded-3xl border border-gray-100 hover:border-indigo-400 hover:shadow-2xl transition-all group"
            >
              <div className="flex items-start gap-4 sm:gap-6 md:gap-8">
                <div className="text-4xl sm:text-5xl md:text-7xl flex-shrink-0">🎲</div>
                <div className="text-left">
                  <h3 className="text-xl sm:text-2xl md:text-3xl font-semibold mb-1 sm:mb-2 md:mb-3">
                    랜덤 기출 풀이
                  </h3>
                  <p className="text-sm sm:text-base md:text-xl text-gray-600">
                    유형·회차를 골라 무작위로 풉니다 (4-2)
                  </p>
                </div>
              </div>
            </button>
          </div>

          <div className="max-w-2xl mx-auto mt-8 sm:mt-10 text-center">
            <button
              onClick={() => setMode('home')}
              className="text-gray-500 underline text-sm sm:text-base"
            >
              ← 홈으로 돌아가기
            </button>
          </div>
        </main>
      </div>
    );
  }

  // ---------- 3) 맞추기 메뉴 (1-1 ~ 2-2) — 기존 메인과 동일 구성 ----------
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-16">
        <div className="max-w-md mx-auto text-center mb-10 sm:mb-16">
          <h2 className="text-2xl sm:text-3xl font-semibold mb-4 sm:mb-6">급수 선택</h2>
          <div className="bg-white p-5 sm:p-8 rounded-2xl sm:rounded-3xl shadow-sm border border-gray-100">
            <label className="block text-base sm:text-lg font-medium text-gray-700 mb-3 sm:mb-4">
              학습할 급수
            </label>
            <select
              value={quizLevel}
              onChange={(e) => setQuizLevel(e.target.value)}
              className="w-full text-2xl sm:text-3xl md:text-4xl font-bold text-center bg-transparent focus:outline-none cursor-pointer py-3 sm:py-5 border-2 border-indigo-200 focus:border-indigo-500 rounded-xl sm:rounded-2xl"
            >
              {levels.map((level) => (
                <option key={level} value={level}>{level}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="max-w-2xl mx-auto space-y-4 sm:space-y-6 md:space-y-8">
          {/* 1-1 */}
          <button
            onClick={() => setMode('1-1')}
            className="w-full p-5 sm:p-8 md:p-10 bg-white rounded-2xl sm:rounded-3xl border border-gray-100 hover:border-indigo-400 hover:shadow-2xl transition-all group"
          >
            <div className="flex items-start gap-4 sm:gap-6 md:gap-8">
              <div className="text-4xl sm:text-5xl md:text-7xl flex-shrink-0">📝</div>
              <div className="text-left">
                <h3 className="text-xl sm:text-2xl md:text-3xl font-semibold mb-1 sm:mb-2 md:mb-3">
                  한자 → 훈/음
                </h3>
                <p className="text-sm sm:text-base md:text-xl text-gray-600">
                  한자를 보고 뜻과 음을 학습합니다 (객관식)
                </p>
              </div>
            </div>
          </button>

          {/* 1-2 */}
          <button
            onClick={() => setMode('1-2')}
            className="w-full p-5 sm:p-8 md:p-10 bg-white rounded-2xl sm:rounded-3xl border border-gray-100 hover:border-indigo-400 hover:shadow-2xl transition-all group"
          >
            <div className="flex items-start gap-4 sm:gap-6 md:gap-8">
              <div className="text-4xl sm:text-5xl md:text-7xl flex-shrink-0">⌨️</div>
              <div className="text-left">
                <h3 className="text-xl sm:text-2xl md:text-3xl font-semibold mb-1 sm:mb-2 md:mb-3">
                  한자 → 훈/음 타이핑
                </h3>
                <p className="text-sm sm:text-base md:text-xl text-gray-600">
                  직접 입력하며 학습합니다 (1-2)
                </p>
              </div>
            </div>
          </button>

          {/* 2-1 */}
          <button
            onClick={() => setMode('2-1')}
            className="w-full p-5 sm:p-8 md:p-10 bg-white rounded-2xl sm:rounded-3xl border border-gray-100 hover:border-indigo-400 hover:shadow-2xl transition-all group"
          >
            <div className="flex items-start gap-4 sm:gap-6 md:gap-8">
              <div className="text-4xl sm:text-5xl md:text-7xl flex-shrink-0">🔍</div>
              <div className="text-left">
                <h3 className="text-xl sm:text-2xl md:text-3xl font-semibold mb-1 sm:mb-2 md:mb-3">
                  훈/음 → 한자 (객관식)
                </h3>
                <p className="text-sm sm:text-base md:text-xl text-gray-600">
                  뜻과 음을 보고 한자를 선택합니다 (2-1)
                </p>
              </div>
            </div>
          </button>

          {/* 2-2 */}
          <button
            onClick={() => setMode('2-2')}
            className="w-full p-5 sm:p-8 md:p-10 bg-white rounded-2xl sm:rounded-3xl border border-gray-100 hover:border-indigo-400 hover:shadow-2xl transition-all group"
          >
            <div className="flex items-start gap-4 sm:gap-6 md:gap-8">
              <div className="text-4xl sm:text-5xl md:text-7xl flex-shrink-0">🖋️</div>
              <div className="text-left">
                <h3 className="text-xl sm:text-2xl md:text-3xl font-semibold mb-1 sm:mb-2 md:mb-3">
                  훈/음 → 한자 쓰기
                </h3>
                <p className="text-sm sm:text-base md:text-xl text-gray-600">
                  뜻과 음을 보고 직접 한자를 씁니다 (2-2)
                </p>
              </div>
            </div>
          </button>
        </div>

        <div className="max-w-2xl mx-auto mt-8 sm:mt-10 text-center">
          <button
            onClick={() => setMode('home')}
            className="text-gray-500 underline text-sm sm:text-base"
          >
            ← 홈으로 돌아가기
          </button>
        </div>
      </main>
    </div>
  );
}

export default App;
