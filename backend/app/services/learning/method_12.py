# app/services/learning/method_12.py
from typing import Dict, Any
import random

from app.services.data_loader import df
from app.services.srs import srs_manager
from app.services.grade_range import get_grade_range
from app.services.checker import check_answer, _get_joined_option
from .base import LearningMethod

class Method12(LearningMethod):
    """1-2: 한자 → 훈/음 (타이핑 입력)"""

    @property
    def method_id(self) -> str:
        return "1-2"

    def get_next_question(self, user_id: str = "default", selected_grade: str = "8급") -> Dict[str, Any]:
        """한자 제시 + 정답만 반환 (타이핑용)"""
        target_grades = get_grade_range(selected_grade, mode=1)

        # SRS 초기화
        for grade in target_grades:
            grade_hanja = df[df['급수'] == grade].to_dict('records')
            if grade_hanja:
                srs_manager.initialize_weights(grade_hanja, user_id, grade)

        question = srs_manager.get_next_question(user_id, target_grades)
        if not question:
            return {"error": "문제를 찾을 수 없습니다."}

        hanja_info = df[df['한자'] == question['한자']].to_dict('records')[0]
        correct_option = _get_joined_option(hanja_info)

        return {
            "hanja": hanja_info['한자'],
            "correct_hun_eum": correct_option,
            "grade": question['grade'],
            "method": self.method_id,
            # options는 타이핑 모드에서는 사용하지 않음
        }

    def submit_answer(
        self,
        user_id: str,
        hanja: str,
        grade: str,
        submitted: str,
        **kwargs
    ) -> Dict[str, Any]:
        """타이핑 정답 검증"""
        hanja_info = df[df['한자'] == hanja].to_dict('records')
        if not hanja_info:
            return {"error": "한자를 찾을 수 없습니다."}

        info = hanja_info[0]
        correct_option = _get_joined_option(info)

        correct = check_answer(
            submitted,
            answer_type="typing",
            correct_hun_eum=correct_option
        )

        # SRS 업데이트
        srs_manager.update_weight(user_id, grade, hanja, correct)

        return {
            "status": "success",
            "correct": correct,
            "submitted": submitted,
            "correct_answer": correct_option,
            "message": "정답입니다!" if correct else "오답입니다."
        }