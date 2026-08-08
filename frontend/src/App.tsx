import { useState, type ReactNode } from 'react';
import { Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import Method11 from './components/learning/Method11';
import Method12 from './components/learning/Method12';
import Method21 from './components/learning/Method21';
import Method22 from './components/learning/Method22';
import Method31 from './components/learning/Method31';
import Method32 from './components/learning/Method32';
import Method41 from './components/learning/Method41';
import Method42 from './components/learning/Method42';
import HandwritingTestPage from './components/dev/HandwritingTestPage';

// ---------- 공통 헤더 ----------
function Header() {
  return (
    <header className="bg-white shadow-sm py-5 sm:py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900">한자 학습</h1>
        <p className="text-sm sm:text-base text-gray-600 mt-1 sm:mt-2">
          한국어문회 한자능력검정시험 학습 도우미
        </p>
      </div>
    </header>
  );
}

const LEVELS = [
  '8급', '7급Ⅱ', '7급', '6급Ⅱ', '6급', '5급Ⅱ', '5급',
  '4급Ⅱ', '4급', '3급Ⅱ', '3급', '2급', '1급',
];

// ---------- 홈 ----------
function HomePage() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-16">
        <div className="max-w-2xl mx-auto space-y-4 sm:space-y-6 md:space-y-8">
          {/* 학습 하기 */}
          <button
            onClick={() => navigate('/study')}
            className="w-full p-5 sm:p-8 md:p-10 bg-white rounded-2xl sm:rounded-3xl border border-gray-100 hover:border-indigo-400 hover:shadow-2xl transition-all group"
          >
            <div className="flex items-start gap-4 sm:gap-6 md:gap-8">
              <div className="text-4xl sm:text-5xl md:text-7xl flex-shrink-0">📖</div>
              <div className="text-left">
                <h3 className="text-xl sm:text-2xl md:text-3xl font-semibold text-gray-900 mb-1 sm:mb-2 md:mb-3">
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
            onClick={() => navigate('/quiz')}
            className="w-full p-5 sm:p-8 md:p-10 bg-white rounded-2xl sm:rounded-3xl border border-gray-100 hover:border-indigo-400 hover:shadow-2xl transition-all group"
          >
            <div className="flex items-start gap-4 sm:gap-6 md:gap-8">
              <div className="text-4xl sm:text-5xl md:text-7xl flex-shrink-0">✏️</div>
              <div className="text-left">
                <h3 className="text-xl sm:text-2xl md:text-3xl font-semibold text-gray-900 mb-1 sm:mb-2 md:mb-3">
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
            onClick={() => navigate('/exam')}
            className="w-full p-5 sm:p-8 md:p-10 bg-white rounded-2xl sm:rounded-3xl border border-gray-100 hover:border-indigo-400 hover:shadow-2xl transition-all group"
          >
            <div className="flex items-start gap-4 sm:gap-6 md:gap-8">
              <div className="text-4xl sm:text-5xl md:text-7xl flex-shrink-0">📜</div>
              <div className="text-left">
                <h3 className="text-xl sm:text-2xl md:text-3xl font-semibold text-gray-900 mb-1 sm:mb-2 md:mb-3">
                  기출문제 풀이
                </h3>
                <p className="text-sm sm:text-base md:text-xl text-gray-600">
                  실제 시험 기출을 회차·랜덤으로 풉니다 (4-1, 4-2)
                </p>
              </div>
            </div>
          </button>

          {/* 실험: 필기 인식 엔진 비교 (나중에 제거 가능) */}
          <button
            onClick={() => navigate('/dev/handwriting')}
            className="w-full p-4 sm:p-5 bg-gray-100 rounded-2xl border border-dashed border-gray-300
              hover:border-gray-400 hover:bg-gray-50 transition-all text-left"
          >
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="text-2xl sm:text-3xl flex-shrink-0">🧪</div>
              <div>
                <h3 className="text-base sm:text-lg font-medium text-gray-700">
                  필기 인식 테스트 (실험)
                </h3>
                <p className="text-xs sm:text-sm text-gray-500">
                  로컬 / Google / 하이브리드 인식 비교 · 실사용과 분리
                </p>
              </div>
            </div>
          </button>
        </div>
      </main>
    </div>
  );
}

// ---------- 학습 하기 메뉴 (3-1, 3-2) ----------
function StudyMenuPage({
  studyLevel,
  setStudyLevel,
}: {
  studyLevel: string;
  setStudyLevel: (v: string) => void;
}) {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-16">
        <div className="max-w-md mx-auto text-center mb-10 sm:mb-16">
          <h2 className="text-2xl sm:text-3xl font-semibold text-gray-900 mb-4 sm:mb-6">급수 선택</h2>
          <div className="bg-white p-5 sm:p-8 rounded-2xl sm:rounded-3xl shadow-sm border border-gray-100">
            <label className="block text-base sm:text-lg font-medium text-gray-700 mb-3 sm:mb-4">
              학습할 급수
            </label>
            <select
              value={studyLevel}
              onChange={(e) => setStudyLevel(e.target.value)}
              className="w-full text-2xl sm:text-3xl md:text-4xl font-bold text-center bg-transparent focus:outline-none cursor-pointer py-3 sm:py-5 border-2 border-indigo-200 focus:border-indigo-500 rounded-xl sm:rounded-2xl"
            >
              {LEVELS.map((level) => (
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
            onClick={() => navigate('/study/3-1')}
            className="w-full p-5 sm:p-8 md:p-10 bg-white rounded-2xl sm:rounded-3xl border border-gray-100 hover:border-indigo-400 hover:shadow-2xl transition-all group"
          >
            <div className="flex items-start gap-4 sm:gap-6 md:gap-8">
              <div className="text-4xl sm:text-5xl md:text-7xl flex-shrink-0">🈶</div>
              <div className="text-left">
                <h3 className="text-xl sm:text-2xl md:text-3xl font-semibold text-gray-900 mb-1 sm:mb-2 md:mb-3">
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
            onClick={() => navigate('/study/3-2')}
            className="w-full p-5 sm:p-8 md:p-10 bg-white rounded-2xl sm:rounded-3xl border border-gray-100 hover:border-indigo-400 hover:shadow-2xl transition-all group"
          >
            <div className="flex items-start gap-4 sm:gap-6 md:gap-8">
              <div className="text-4xl sm:text-5xl md:text-7xl flex-shrink-0">✍️</div>
              <div className="text-left">
                <h3 className="text-xl sm:text-2xl md:text-3xl font-semibold text-gray-900 mb-1 sm:mb-2 md:mb-3">
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
            onClick={() => navigate('/')}
            className="text-gray-500 underline text-sm sm:text-base"
          >
            ← 홈으로 돌아가기
          </button>
        </div>
      </main>
    </div>
  );
}

/** 기출 정답/오답 표시 시점 */
export type ExamFeedbackMode = 'each' | 'end';

// ---------- 기출문제 메뉴 (4-1, 4-2) ----------
function ExamMenuPage({
  feedbackMode,
  setFeedbackMode,
}: {
  feedbackMode: ExamFeedbackMode;
  setFeedbackMode: (m: ExamFeedbackMode) => void;
}) {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-16">
        <div className="max-w-md mx-auto text-center mb-8 sm:mb-10">
          <h2 className="text-2xl sm:text-3xl font-semibold text-gray-900 mb-2">기출문제 풀이</h2>
          <p className="text-sm sm:text-base text-gray-500">
            실제 시험 문항으로 연습합니다 (SRS 미적용)
          </p>
        </div>

        {/* 정답/오답 표시 시점 선택 — 학습 방법 버튼 상단 */}
        <div className="max-w-2xl mx-auto mb-6 sm:mb-8">
          <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl shadow-sm border border-gray-100">
            <p className="text-lg sm:text-2xl font-medium text-gray-700 mb-3 text-center">
              정답/오답 표시
            </p>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => setFeedbackMode('each')}
                className={`flex-1 py-3 sm:py-3.5 px-4 rounded-xl sm:rounded-2xl border-2 text-sm sm:text-base font-medium transition-colors ${
                  feedbackMode === 'each'
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-800'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                }`}
              >
                1문제 풀 때마다 보기
              </button>
              <button
                type="button"
                onClick={() => setFeedbackMode('end')}
                className={`flex-1 py-3 sm:py-3.5 px-4 rounded-xl sm:rounded-2xl border-2 text-sm sm:text-base font-medium transition-colors ${
                  feedbackMode === 'end'
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-800'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                }`}
              >
                마지막에 한 번에 보기
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-2xl mx-auto space-y-4 sm:space-y-6 md:space-y-8">
          {/* 4-1 */}
          <button
            onClick={() => navigate('/exam/4-1')}
            className="w-full p-5 sm:p-8 md:p-10 bg-white rounded-2xl sm:rounded-3xl border border-gray-100 hover:border-indigo-400 hover:shadow-2xl transition-all group"
          >
            <div className="flex items-start gap-4 sm:gap-6 md:gap-8">
              <div className="text-4xl sm:text-5xl md:text-7xl flex-shrink-0">📜</div>
              <div className="text-left">
                <h3 className="text-xl sm:text-2xl md:text-3xl font-semibold text-gray-900 mb-1 sm:mb-2 md:mb-3">
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
            onClick={() => navigate('/exam/4-2')}
            className="w-full p-5 sm:p-8 md:p-10 bg-white rounded-2xl sm:rounded-3xl border border-gray-100 hover:border-indigo-400 hover:shadow-2xl transition-all group"
          >
            <div className="flex items-start gap-4 sm:gap-6 md:gap-8">
              <div className="text-4xl sm:text-5xl md:text-7xl flex-shrink-0">🎲</div>
              <div className="text-left">
                <h3 className="text-xl sm:text-2xl md:text-3xl font-semibold text-gray-900 mb-1 sm:mb-2 md:mb-3">
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
            onClick={() => navigate('/')}
            className="text-gray-500 underline text-sm sm:text-base"
          >
            ← 홈으로 돌아가기
          </button>
        </div>
      </main>
    </div>
  );
}

// ---------- 맞추기 메뉴 (1-1 ~ 2-2) ----------
function QuizMenuPage({
  quizLevel,
  setQuizLevel,
}: {
  quizLevel: string;
  setQuizLevel: (v: string) => void;
}) {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-16">
        <div className="max-w-md mx-auto text-center mb-10 sm:mb-16">
          <h2 className="text-2xl sm:text-3xl font-semibold text-gray-900 mb-4 sm:mb-6">급수 선택</h2>
          <div className="bg-white p-5 sm:p-8 rounded-2xl sm:rounded-3xl shadow-sm border border-gray-100">
            <label className="block text-base sm:text-lg font-medium text-gray-700 mb-3 sm:mb-4">
              학습할 급수
            </label>
            <select
              value={quizLevel}
              onChange={(e) => setQuizLevel(e.target.value)}
              className="w-full text-2xl sm:text-3xl md:text-4xl font-bold text-center bg-transparent focus:outline-none cursor-pointer py-3 sm:py-5 border-2 border-indigo-200 focus:border-indigo-500 rounded-xl sm:rounded-2xl"
            >
              {LEVELS.map((level) => (
                <option key={level} value={level}>{level}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="max-w-2xl mx-auto space-y-4 sm:space-y-6 md:space-y-8">
          {/* 1-1 */}
          <button
            onClick={() => navigate('/quiz/1-1')}
            className="w-full p-5 sm:p-8 md:p-10 bg-white rounded-2xl sm:rounded-3xl border border-gray-100 hover:border-indigo-400 hover:shadow-2xl transition-all group"
          >
            <div className="flex items-start gap-4 sm:gap-6 md:gap-8">
              <div className="text-4xl sm:text-5xl md:text-7xl flex-shrink-0">📝</div>
              <div className="text-left">
                <h3 className="text-xl sm:text-2xl md:text-3xl font-semibold text-gray-900 mb-1 sm:mb-2 md:mb-3">
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
            onClick={() => navigate('/quiz/1-2')}
            className="w-full p-5 sm:p-8 md:p-10 bg-white rounded-2xl sm:rounded-3xl border border-gray-100 hover:border-indigo-400 hover:shadow-2xl transition-all group"
          >
            <div className="flex items-start gap-4 sm:gap-6 md:gap-8">
              <div className="text-4xl sm:text-5xl md:text-7xl flex-shrink-0">⌨️</div>
              <div className="text-left">
                <h3 className="text-xl sm:text-2xl md:text-3xl font-semibold text-gray-900 mb-1 sm:mb-2 md:mb-3">
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
            onClick={() => navigate('/quiz/2-1')}
            className="w-full p-5 sm:p-8 md:p-10 bg-white rounded-2xl sm:rounded-3xl border border-gray-100 hover:border-indigo-400 hover:shadow-2xl transition-all group"
          >
            <div className="flex items-start gap-4 sm:gap-6 md:gap-8">
              <div className="text-4xl sm:text-5xl md:text-7xl flex-shrink-0">🔍</div>
              <div className="text-left">
                <h3 className="text-xl sm:text-2xl md:text-3xl font-semibold text-gray-900 mb-1 sm:mb-2 md:mb-3">
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
            onClick={() => navigate('/quiz/2-2')}
            className="w-full p-5 sm:p-8 md:p-10 bg-white rounded-2xl sm:rounded-3xl border border-gray-100 hover:border-indigo-400 hover:shadow-2xl transition-all group"
          >
            <div className="flex items-start gap-4 sm:gap-6 md:gap-8">
              <div className="text-4xl sm:text-5xl md:text-7xl flex-shrink-0">🖋️</div>
              <div className="text-left">
                <h3 className="text-xl sm:text-2xl md:text-3xl font-semibold text-gray-900 mb-1 sm:mb-2 md:mb-3">
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
            onClick={() => navigate('/')}
            className="text-gray-500 underline text-sm sm:text-base"
          >
            ← 홈으로 돌아가기
          </button>
        </div>
      </main>
    </div>
  );
}

// 학습 화면에서 "메뉴로 돌아가기" 버튼용 — 부모 메뉴로 명시 이동
// (브라우저 뒤로가기와 별개로, 직접 URL 진입 시에도 안전)
function BackToStudyMenu({ children }: { children: (go: () => void) => ReactNode }) {
  const navigate = useNavigate();
  return <>{children(() => navigate('/study'))}</>;
}
function BackToQuizMenu({ children }: { children: (go: () => void) => ReactNode }) {
  const navigate = useNavigate();
  return <>{children(() => navigate('/quiz'))}</>;
}
function BackToExamMenu({ children }: { children: (go: () => void) => ReactNode }) {
  const navigate = useNavigate();
  return <>{children(() => navigate('/exam'))}</>;
}
function BackToHome({ children }: { children: (go: () => void) => ReactNode }) {
  const navigate = useNavigate();
  return <>{children(() => navigate('/'))}</>;
}

// ---------- App (라우트 + 급수 state) ----------
function App() {
  // 학습 하기 / 맞추기 급수를 서로 독립적으로 관리
  const [studyLevel, setStudyLevel] = useState('8급');
  const [quizLevel, setQuizLevel] = useState('8급');
  // 기출: 정답/오답 표시 시점 (each = 매 문항, end = 마지막에만)
  const [examFeedbackMode, setExamFeedbackMode] = useState<ExamFeedbackMode>('each');

  return (
    <Routes>
      {/* 홈 */}
      <Route path="/" element={<HomePage />} />
      <Route path="/home" element={<Navigate to="/" replace />} />

      {/* 학습 하기 */}
      <Route
        path="/study"
        element={
          <StudyMenuPage studyLevel={studyLevel} setStudyLevel={setStudyLevel} />
        }
      />
      <Route
        path="/study/3-1"
        element={
          <BackToStudyMenu>
            {(go) => (
              <Method31 selectedLevel={studyLevel} onBackToMenu={go} />
            )}
          </BackToStudyMenu>
        }
      />
      <Route
        path="/study/3-2"
        element={
          <BackToStudyMenu>
            {(go) => (
              <Method32 selectedLevel={studyLevel} onBackToMenu={go} />
            )}
          </BackToStudyMenu>
        }
      />

      {/* 맞추기 */}
      <Route
        path="/quiz"
        element={
          <QuizMenuPage quizLevel={quizLevel} setQuizLevel={setQuizLevel} />
        }
      />
      <Route
        path="/quiz/1-1"
        element={
          <BackToQuizMenu>
            {(go) => (
              <Method11 selectedLevel={quizLevel} onBackToMenu={go} />
            )}
          </BackToQuizMenu>
        }
      />
      <Route
        path="/quiz/1-2"
        element={
          <BackToQuizMenu>
            {(go) => (
              <Method12 selectedLevel={quizLevel} onBackToMenu={go} />
            )}
          </BackToQuizMenu>
        }
      />
      <Route
        path="/quiz/2-1"
        element={
          <BackToQuizMenu>
            {(go) => (
              <Method21 selectedLevel={quizLevel} onBackToMenu={go} />
            )}
          </BackToQuizMenu>
        }
      />
      <Route
        path="/quiz/2-2"
        element={
          <BackToQuizMenu>
            {(go) => (
              <Method22 selectedLevel={quizLevel} onBackToMenu={go} />
            )}
          </BackToQuizMenu>
        }
      />

      {/* 기출 */}
      <Route
        path="/exam"
        element={
          <ExamMenuPage
            feedbackMode={examFeedbackMode}
            setFeedbackMode={setExamFeedbackMode}
          />
        }
      />
      <Route
        path="/exam/4-1"
        element={
          <BackToExamMenu>
            {(go) => (
              <Method41 onBackToMenu={go} feedbackMode={examFeedbackMode} />
            )}
          </BackToExamMenu>
        }
      />
      <Route
        path="/exam/4-2"
        element={
          <BackToExamMenu>
            {(go) => (
              <Method42 onBackToMenu={go} feedbackMode={examFeedbackMode} />
            )}
          </BackToExamMenu>
        }
      />

      {/* 실험용 필기 인식 테스트 */}
      <Route
        path="/dev/handwriting"
        element={
          <BackToHome>
            {(go) => <HandwritingTestPage onBack={go} />}
          </BackToHome>
        }
      />

      {/* 잘못된 경로 → 홈 */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
