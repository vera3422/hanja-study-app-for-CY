import { useState } from 'react';
import Method11 from './components/learning/Method11';
import Method12 from './components/learning/Method12';
import Method21 from './components/learning/Method21';
import Method22 from './components/learning/Method22';

function App() {
  const [selectedLevel, setSelectedLevel] = useState('8급');
  const [mode, setMode] = useState<'menu' | '1-1' | '1-2' | '2-1' | '2-2'>('menu');

  const levels = ['8급', '7급Ⅱ', '7급', '6급Ⅱ', '6급', '5급Ⅱ', '5급', '4급Ⅱ', '4급', '3급Ⅱ', '3급', '2급', '1급'];

  const handleBackToMenu = () => setMode('menu');

  // 학습 방법별 화면
  if (mode === '1-1') return <Method11 selectedLevel={selectedLevel} onBackToMenu={handleBackToMenu} />;
  if (mode === '1-2') return <Method12 selectedLevel={selectedLevel} onBackToMenu={handleBackToMenu} />;
  if (mode === '2-1') return <Method21 selectedLevel={selectedLevel} onBackToMenu={handleBackToMenu} />;
  if (mode === '2-2') return <Method22 selectedLevel={selectedLevel} onBackToMenu={handleBackToMenu} />;

  // 메뉴 화면
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm py-5 sm:py-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900">한자 학습</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1 sm:mt-2">
            한국어문회 한자능력검정시험 학습 도우미
          </p>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-16">
        <div className="max-w-md mx-auto text-center mb-10 sm:mb-16">
          <h2 className="text-2xl sm:text-3xl font-semibold mb-4 sm:mb-6">급수 선택</h2>
          
          <div className="bg-white p-5 sm:p-8 rounded-2xl sm:rounded-3xl shadow-sm border border-gray-100">
            <label className="block text-base sm:text-lg font-medium text-gray-700 mb-3 sm:mb-4">
              학습할 급수
            </label>
            
            <select 
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value)}
              className="w-full text-2xl sm:text-3xl md:text-4xl font-bold text-center bg-transparent focus:outline-none cursor-pointer py-3 sm:py-5 border-2 border-indigo-200 focus:border-indigo-500 rounded-xl sm:rounded-2xl"
            >
              {levels.map(level => (
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
      </main>
    </div>
  );
}

export default App;