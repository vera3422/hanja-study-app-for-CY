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

// ========== 기출문제 (4-1 / 4-2) ==========

/** 기출 1문항 */
export interface ExamQuestion {
  level: string;
  session: number;
  exam_date: string;
  question_no: number;
  question_type: string;
  instruction: string;
  question_text: string;
  target: string;
  options: string[] | null;
  answer: string;
  answer_display: string;
}

export interface ExamSessionInfo {
  level: string;
  session: number;
  exam_date: string;
  total: number;
}

export interface ExamTypeInfo {
  code: string;
  label: string;
}

export interface ExamMetaResponse {
  levels: string[];
  sessions: Record<string, ExamSessionInfo[]>;
  types: ExamTypeInfo[];
  total_questions: number;
  error?: string;
}

export interface ExamSessionsResponse {
  level: string | null;
  sessions: ExamSessionInfo[];
  total: number;
  error?: string;
}

export interface ExamQuestionsResponse {
  level: string;
  session?: number;
  exam_date?: string;
  total: number;
  questions: ExamQuestion[];
  count_requested?: number;
  filters?: {
    types: string[];
    sessions: number[];
  };
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

  // ---------- 기출문제 API ----------

  /** 급수·회차·유형 메타 한 번에 */
  getExamMeta: async (): Promise<ExamMetaResponse> => {
    const res = await fetch(`${API_BASE_URL}/api/exam/meta`);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`서버 응답 오류 (${res.status}): ${text || res.statusText}`);
    }
    return res.json();
  },

  /** 회차 목록 */
  getExamSessions: async (level?: string): Promise<ExamSessionsResponse> => {
    const params = new URLSearchParams();
    if (level) params.set('level', level);
    const qs = params.toString();
    const res = await fetch(`${API_BASE_URL}/api/exam/sessions${qs ? `?${qs}` : ''}`);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`서버 응답 오류 (${res.status}): ${text || res.statusText}`);
    }
    return res.json();
  },

  /** 4-1: 특정 회차 전체 (번호순) */
  getExamQuestions: async (
    level: string,
    session: number
  ): Promise<ExamQuestionsResponse> => {
    const params = new URLSearchParams({
      level,
      session: String(session),
    });
    const res = await fetch(`${API_BASE_URL}/api/exam/questions?${params}`);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`서버 응답 오류 (${res.status}): ${text || res.statusText}`);
    }
    return res.json();
  },

  /** 4-2: 필터 후 랜덤 샘플 */
  getExamQuestionsRandom: async (opts: {
    level: string;
    count?: number;
    types?: string[];
    sessions?: number[];
  }): Promise<ExamQuestionsResponse> => {
    const params = new URLSearchParams({ level: opts.level });
    if (opts.count != null) params.set('count', String(opts.count));
    if (opts.types && opts.types.length > 0) {
      params.set('types', opts.types.join(','));
    }
    if (opts.sessions && opts.sessions.length > 0) {
      params.set('sessions', opts.sessions.join(','));
    }
    const res = await fetch(`${API_BASE_URL}/api/exam/questions/random?${params}`);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`서버 응답 오류 (${res.status}): ${text || res.statusText}`);
    }
    return res.json();
  },

  // ---------- 필기 인식 (Google 프록시) ----------

  /**
   * Backend → Google Input Tools Handwriting
   * strokes: HandwritingPad getStrokes() 결과 ({x,y}[][])
   * width/height: 캔버스 CSS 크기 (writing_guide용)
   */
  recognizeHandwriting: async (opts: {
    strokes: { x: number; y: number }[][];
    width: number;
    height: number;
    language?: string;
    max_results?: number;
  }): Promise<{
    candidates: string[];
    source: string;
    language?: string;
    error?: string | null;
  }> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    try {
      const res = await fetch(`${API_BASE_URL}/api/recognize-handwriting`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          strokes: opts.strokes,
          width: opts.width,
          height: opts.height,
          language: opts.language ?? 'zh_TW',
          max_results: opts.max_results ?? 8,
        }),
        signal: controller.signal,
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`서버 응답 오류 (${res.status}): ${text || res.statusText}`);
      }
      return res.json();
    } finally {
      clearTimeout(timer);
    }
  },
};
