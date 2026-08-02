# app/services/learning/method_21.py

from typing import Dict, Any
import random

from app.services.data_loader import df
from app.services.srs import srs_manager
from app.services.grade_range import get_grade_range
from app.services.checker import _get_joined_option
from .base import LearningMethod


class Method21(LearningMethod):
    """2-1: 훈/음 → 한자 (객관식 5지선다)"""

    @property
    def method_id(self) -> str:
        return "2-1"

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
        question_text = _get_joined_option(hanja_info)  # 화면에 보여줄 훈/음

        # 오답 한자 생성: 같은 급수에서 정답 제외 + 중복 없는 한자 4개
        candidates = df[
            (df['급수'] == hanja_info['급수']) &
            (df['한자'] != correct_hanja)
        ]
        wrong_options = []
        seen = {correct_hanja}

        if len(candidates) > 0:
            sample_size = min(30, len(candidates))
            for _, row in candidates.sample(sample_size).iterrows():
                opt = row['한자']
                if opt and opt not in seen:
                    wrong_options.append(opt)
                    seen.add(opt)
                if len(wrong_options) >= 4:
                    break

        options = [correct_hanja] + wrong_options[:4]
        random.shuffle(options)

        return {
            "hanja": correct_hanja,              # SRS/제출 검증용
            "question_text": question_text,      # 화면에 표시할 훈/음
            "correct_hun_eum": question_text,
            "grade": question['grade'],
            "method": self.method_id,
            "options": options,                  # 한자 5개
            "correct_option": correct_hanja,
        }

    def submit_answer(
        self,
        user_id: str,
        hanja: str,
        grade: str,
        submitted: str,
        **kwargs
    ) -> Dict[str, Any]:
        # 객관식이므로 제출된 한자와 정답 한자 exact match
        correct = (submitted.strip() == hanja.strip())

        srs_manager.update_weight(user_id, grade, hanja, correct, method=self.method_id)

        return {
            "status": "success",
            "correct": correct,
            "submitted": submitted,
            "correct_answer": hanja,
            "message": "정답입니다!" if correct else "오답입니다."
        }
