import { useState } from 'react';
import { apiClient, type QuestionResponse } from '../../api/apiClient';

interface MethodProps {
  selectedLevel: string;
  onBackToMenu: () => void;
}

export default function Method22({ selectedLevel, onBackToMenu }: MethodProps) {
  const [currentQuestion, setCurrentQuestion] = useState<QuestionResponse | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [feedback, setFeedback] = useState<{ message: string; color: string } | null>(null);
  const [correctAnswer, setCorrectAnswer] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchNextQuestion = async () => {
    setIsLoading(true);
    try {
      const data = await apiClient.getNextQuestion('default', selectedLevel, '2-2');
      if (data.error) {
        alert(data.error);
        return;
      }
      setCurrentQuestion(data);
      setInputValue('');
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

  const handleAnswer = async () => {
    if (!currentQuestion?.hanja || !inputValue.trim()) return;

    try {
      const result = await apiClient.submitAnswer(
        'default',
        currentQuestion.hanja,
        currentQuestion.grade,
        inputValue.trim(),
        '2-2'
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
        <div className="text-6xl mb-6">🖋️</div>
        <h2 className="text-4xl font-bold mb-4">{selectedLevel} 학습 (2-2 훈/음 → 한자 쓰기)</h2>

        {currentQuestion ? (
          <div className="bg-white p-8 rounded-3xl shadow">
            <p className="text-xl font-medium mb-4 text-gray-600">다음 뜻·음의 한자를 입력하세요</p>
            <p className="text-4xl mb-10 font-bold text-indigo-700 leading-relaxed">
              {(currentQuestion as any).question_text || currentQuestion.correct_hun_eum}
            </p>

            {/* 현재는 텍스트 입력. 추후 터치 필기 캔버스로 교체 예정 */}
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="한자를 입력하세요"
              className="w-full py-5 px-6 rounded-2xl text-4xl text-center border-2 border-gray-200 focus:border-indigo-500 focus:outline-none mb-6"
              disabled={!!feedback}
            />

            {feedback && (
              <div className={`text-3xl font-bold mb-6 ${feedback.color}`}>
                {feedback.message}
              </div>
            )}

            {feedback && correctAnswer && (
              <div className="text-4xl font-bold text-red-600 mt-4 p-4 bg-red-50 rounded-2xl border border-red-200">
                정답: {correctAnswer}
              </div>
            )}

            <button
              onClick={() => {
                if (feedback) {
                  fetchNextQuestion();
                } else if (inputValue.trim()) {
                  handleAnswer();
                } else {
                  alert("한자를 입력해주세요.");
                }
              }}
              disabled={!inputValue.trim() && !feedback}
              className="w-full py-5 bg-indigo-600 text-white rounded-3xl text-xl font-medium disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {feedback ? "다음 문제" : "제출"}
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
