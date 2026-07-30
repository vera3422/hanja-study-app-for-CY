import { useState } from 'react';
import { apiClient, type QuestionResponse } from '../../api/apiClient';

interface MethodProps {
  selectedLevel: string;
  onBackToMenu: () => void;
}

export default function Method21({ selectedLevel, onBackToMenu }: MethodProps) {
  const [currentQuestion, setCurrentQuestion] = useState<QuestionResponse | null>(null);
  const [options, setOptions] = useState<string[]>([]);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ message: string; color: string } | null>(null);
  const [correctAnswer, setCorrectAnswer] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchNextQuestion = async () => {
    setIsLoading(true);
    try {
      const data = await apiClient.getNextQuestion('default', selectedLevel, '2-1');
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
        '2-1'
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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="text-center max-w-md w-full">
        <div className="text-6xl mb-6">🔍</div>
        <h2 className="text-4xl font-bold mb-4">{selectedLevel} 학습 (2-1 훈/음 → 한자)</h2>

        {currentQuestion ? (
          <div className="bg-white p-8 rounded-3xl shadow">
            <p className="text-xl font-medium mb-4 text-gray-600">다음 뜻·음의 한자를 선택하세요</p>
            <p className="text-4xl mb-10 font-bold text-indigo-700 leading-relaxed">
              {(currentQuestion as any).question_text || currentQuestion.correct_hun_eum}
            </p>

            <div className="space-y-3 mb-8 text-left">
              {options.map((option, idx) => {
                const isSelected = selectedOption === option;
                const isCorrect = correctAnswer && option === correctAnswer;
                const number = ['①', '②', '③', '④', '⑤'][idx];

                return (
                  <button
                    key={idx}
                    onClick={() => !feedback && setSelectedOption(option)}
                    disabled={!!feedback}
                    className={`w-full flex items-center gap-4 py-5 px-6 rounded-2xl text-left transition-all text-3xl border-2 ${
                      isCorrect
                        ? 'bg-red-600 text-white font-bold border-red-700'
                        : isSelected
                        ? 'bg-green-600 text-white font-bold border-green-700'
                        : 'bg-white border-gray-200 hover:border-indigo-400 hover:bg-indigo-50'
                    }`}
                  >
                    <span className="text-2xl flex-shrink-0 w-8">{number}</span>
                    <span>{option}</span>
                  </button>
                );
              })}
            </div>

            {feedback && (
              <div className={`text-3xl font-bold mb-6 ${feedback.color}`}>
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
              className="w-full py-5 bg-indigo-600 text-white rounded-3xl text-xl font-medium disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {feedback ? "다음 문제" : "답안 제출"}
            </button>
          </div>
        ) : (
          <button
            onClick={fetchNextQuestion}
            disabled={isLoading}
            className="px-10 py-5 bg-indigo-600 text-white rounded-3xl text-xl font-medium w-full"
          >
            {isLoading ? "문제 불러오는 중..." : "문제 시작하기"}
          </button>
        )}

        <button
          onClick={onBackToMenu}
          className="mt-6 text-gray-500 underline"
        >
          ← 메뉴로 돌아가기
        </button>
      </div>
    </div>
  );
}
