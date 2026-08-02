const API_BASE_URL = import.meta.env.PROD
  ? 'https://hanja-study-app-for-cy-backend.onrender.com'  // 배포(GitHub Pages)용
  : 'http://127.0.0.1:8000'; //로컬 개발용

export interface QuestionResponse {
  hanja?: string;
  correct_hun_eum?: string;
  question_text?: string;   // 2-1, 2-2에서 화면에 보여줄 훈/음
  grade: string;
  method: string;
  options?: string[];
  correct_option?: string;
  error?: string;
}

export interface SubmitResult {
  status: string;
  correct: boolean;
  submitted: string;
  correct_answer: string;
  message: string;
  error?: string;
}

/** 학습 방법 3-1 / 3-2 용 한자 1개 항목 */
export interface StudyItem {
  hanja: string;
  correct_hun_eum: string;
  grade: string;
}

/** GET /api/study-list 응답 */
export interface StudyListResponse {
  grade: string;
  total: number;
  items: StudyItem[];
  error?: string;
}

export const apiClient = {
  getNextQuestion: async (
    userId: string = 'default',
    selectedGrade: string,
    method: string = '1-1'
  ): Promise<QuestionResponse> => {
    const params = new URLSearchParams({
      user_id: userId,
      selected_grade: selectedGrade,
      method: method,
    });
    const res = await fetch(`${API_BASE_URL}/api/next-question?${params}`);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`서버 응답 오류 (${res.status}): ${text || res.statusText}`);
    }
    return res.json();
  },

  submitAnswer: async (
    user_id: string,
    hanja: string,
    grade: string,
    submitted: string,
    method: string = '1-1'
  ): Promise<SubmitResult> => {
    const response = await fetch(`${API_BASE_URL}/api/submit-answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id,
        hanja,
        grade,
        submitted,
        method,
      }),
    });

    if (!response.ok) {
      throw new Error('제출 실패');
    }
    return response.json();
  },

  /**
   * 학습 방법 3-1 / 3-2용: 선택한 급수의 한자 전체 리스트 조회
   * Frontend에서 셔플 후 1회씩 순차 학습하는 용도 (SRS 미적용)
   */
  getStudyList: async (
    selectedGrade: string
  ): Promise<StudyListResponse> => {
    const params = new URLSearchParams({
      selected_grade: selectedGrade,
    });
    const res = await fetch(`${API_BASE_URL}/api/study-list?${params}`);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`서버 응답 오류 (${res.status}): ${text || res.statusText}`);
    }
    return res.json();
  },
};
