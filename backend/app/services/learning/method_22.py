# app/services/learning/method_22.py

from typing import Dict, Any

from app.services.data_loader import df
from app.services.srs import srs_manager
from app.services.grade_range import get_grade_range
from app.services.checker import _get_joined_option
from .base import LearningMethod


class Method22(LearningMethod):
    """2-2: 훈/음 → 한자 (쓰기 입력)
    현재는 텍스트 입력으로 검증. 추후 터치 필기 + 인식으로 교체 예정.
    """

    @property
    def method_id(self) -> str:
        return "2-2"

    def get_next_question(self, user_id: str = "default", selected_grade: str = "8급") -> Dict[str, Any]:
        # 2-x 는 mode=2 (선택 등급 - 2단계까지)
        target_grades = get_grade_range(selected_grade, mode=2)

        for grade in target_grades:
            grade_hanja = df[df['급수'] == grade].to_dict('records')
            if grade_hanja:
                srs_manager.initialize_weights(grade_hanja, user_id, grade, method=self.method_id)

        question = srs_manager.get_next_question(user_id, target_grades, method=self.method_id)
        if not question:
            return {"error": "문제를 찾을 수 없습니다. (해당 등급 범위에 한자가 부족할 수 있습니다)"}

        hanja_info = df[df['한자'] == question['한자']].to_dict('records')[0]
        correct_hanja = hanja_info['한자']
        question_text = _get_joined_option(hanja_info)

        return {
            "hanja": correct_hanja,              # SRS/제출 검증용
            "question_text": question_text,      # 화면에 표시할 훈/음
            "correct_hun_eum": question_text,
            "grade": question['grade'],
            "method": self.method_id,
            # options 없음 (쓰기 모드)
        }

    def submit_answer(
        self,
        user_id: str,
        hanja: str,
        grade: str,
        submitted: str,
        **kwargs
    ) -> Dict[str, Any]:
        # 현재는 텍스트 exact match. 추후 필기 인식 결과와 비교하도록 확장
        correct = (submitted.strip() == hanja.strip())

        srs_manager.update_weight(user_id, grade, hanja, correct, method=self.method_id)

        return {
            "status": "success",
            "correct": correct,
            "submitted": submitted,
            "correct_answer": hanja,
            "message": "정답입니다!" if correct else "오답입니다."
        }
