import { useState } from 'react'; //useEffect
import { apiClient, type QuestionResponse } from '../../api/apiClient';
import HanjaDictLink from './HanjaDictLink';

interface MethodProps {
  selectedLevel: string;
  onBackToMenu: () => void;
}

export default function Method11({ selectedLevel, onBackToMenu }: MethodProps) {
  const [currentQuestion, setCurrentQuestion] = useState<QuestionResponse | null>(null);
  const [options, setOptions] = useState<string[]>([]);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ message: string; color: string } | null>(null);
  const [correctAnswer, setCorrectAnswer] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchNextQuestion = async () => {
    setIsLoading(true);
    try {
      const data = await apiClient.getNextQuestion('default', selectedLevel, '1-1');
      if (data.error) {
        alert(data.error);
        return;
      }
      setCurrentQuestion(data);
      setOptions(data.options || []);
      setSelectedOption(null);
      setFeedback(null);
      setCorrectAnswer(null);
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : String(err);
      alert(`문제를 불러오는 데 실패했습니다.\n\n원인: ${message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswer = async (submitted: string) => {
    if (!currentQuestion?.hanja) return;

    try {
      const result = await apiClient.submitAnswer(
        'default',
        currentQuestion.hanja,
        currentQuestion.grade,
        submitted,
        '1-1'
      );

      setFeedback({
        message: result.message,
        color: result.correct ? 'text-green-600' : 'text-red-600',
      });

      if (!result.correct && result.correct_answer) {
        setCorrectAnswer(result.correct_answer);
      }

    } catch (err) {
      console.error(err);
      setFeedback({ message: "제출 중 오류가 발생했습니다.", color: 'text-red-600' });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 sm:p-6">
      <div className="text-center max-w-md w-full">
        <div className="text-4xl sm:text-5xl md:text-6xl mb-4 sm:mb-6">📖</div>
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4">
          {selectedLevel} 학습 (1-1 객관식)
        </h2>

        {currentQuestion ? (
          <div className="bg-white p-5 sm:p-8 rounded-2xl sm:rounded-3xl shadow">
            {/* 정답 제출/확인 후 한자 왼쪽에 네이버 한자사전 링크 (반응형) */}
            <div className="flex items-center justify-center gap-2 sm:gap-3 md:gap-4 mb-6 sm:mb-10">
              {feedback && currentQuestion.hanja ? (
                <HanjaDictLink hanja={currentQuestion.hanja} className="flex-shrink-0" />
              ) : (
                <span className="w-8 h-8 sm:w-9 sm:h-9 flex-shrink-0 invisible" aria-hidden />
              )}
              <p className="text-[100px] sm:text-[140px] md:text-[180px] font-bold leading-none">
                {currentQuestion.hanja}
              </p>
              {/* 좌우 균형용 더미 (한자 중앙 정렬 유지) */}
              <span className="w-8 h-8 sm:w-9 sm:h-9 flex-shrink-0 invisible" aria-hidden />
            </div>

            <div className="space-y-2 sm:space-y-3 mb-6 sm:mb-8 text-left">
              <p className="text-base sm:text-xl font-medium mb-4 sm:mb-6 text-center">
                정답 훈·음을 선택하세요
              </p>

              {options.map((option, idx) => {
                const isSelected = selectedOption === option;
                const isCorrect = correctAnswer && option === correctAnswer;
                const number = ['①', '②', '③', '④', '⑤'][idx];

                return (
                  <button
                    key={idx}
                    onClick={() => !feedback && setSelectedOption(option)}
                    disabled={!!feedback}
                    className={`w-full flex items-center gap-3 sm:gap-4 py-3 sm:py-5 px-4 sm:px-6 rounded-xl sm:rounded-2xl text-left transition-all text-base sm:text-xl border-2 ${
                      isCorrect
                        ? 'bg-red-600 text-white font-bold border-red-700'
                        : isSelected
                        ? 'bg-green-600 text-white font-bold border-green-700'
                        : 'bg-white border-gray-200 hover:border-indigo-400 hover:bg-indigo-50'
                    }`}
                  >
                    <span className="text-xl sm:text-2xl flex-shrink-0 w-7 sm:w-8">{number}</span>
                    <span>{option}</span>
                  </button>
                );
              })}
            </div>

            {feedback && (
              <div className={`text-2xl sm:text-3xl font-bold mb-4 sm:mb-6 ${feedback.color}`}>
                {feedback.message}
              </div>
            )}

            <button
              onClick={() => {
                if (feedback) {
                  fetchNextQuestion();
                } else if (selectedOption) {
                  handleAnswer(selectedOption);
                } else {
                  alert("답안을 선택해주세요.");
                }
              }}
              disabled={!selectedOption && !feedback}
              className="w-full py-3 sm:py-5 bg-indigo-600 text-white rounded-2xl sm:rounded-3xl text-base sm:text-xl font-medium disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {feedback ? "다음 문제" : "답안 제출"}
            </button>
          </div>
        ) : (
          <button
            onClick={fetchNextQuestion}
            disabled={isLoading}
            className="px-8 sm:px-10 py-3 sm:py-5 bg-indigo-600 text-white rounded-2xl sm:rounded-3xl text-base sm:text-xl font-medium w-full"
          >
            {isLoading ? "문제 불러오는 중..." : "문제 시작하기"}
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