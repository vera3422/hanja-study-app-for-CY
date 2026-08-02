# app/services/learning/method_11.py

from typing import Dict, Any
import random

from app.services.data_loader import df
from app.services.srs import srs_manager
from app.services.grade_range import get_grade_range
from app.services.checker import check_answer, _get_joined_option
from .base import LearningMethod


class Method11(LearningMethod):
    """1-1: 한자 → 훈/음 (객관식 5지선다)"""

    @property
    def method_id(self) -> str:
        return "1-1"

    def get_next_question(self, user_id: str = "default", selected_grade: str = "8급") -> Dict[str, Any]:
        target_grades = get_grade_range(selected_grade, mode=1)

        for grade in target_grades:
            grade_hanja = df[df["급수"] == grade].to_dict("records")
            if grade_hanja:
                srs_manager.initialize_weights(grade_hanja, user_id, grade, method=self.method_id)

        question = srs_manager.get_next_question(user_id, target_grades, method=self.method_id)
        if not question:
            return {"error": "문제를 찾을 수 없습니다."}

        hanja_info = df[df["한자"] == question["한자"]].to_dict("records")[0]
        correct_option = _get_joined_option(hanja_info)

        candidates = df[
            (df["급수"] == hanja_info["급수"]) &
            (df["한자"] != hanja_info["한자"])
        ]
        wrong_options = []
        seen = {correct_option}

        if len(candidates) > 0:
            sample_size = min(30, len(candidates))
            for _, row in candidates.sample(sample_size).iterrows():
                opt = _get_joined_option(row)
                if opt and opt not in seen:
                    wrong_options.append(opt)
                    seen.add(opt)
                if len(wrong_options) >= 4:
                    break

        options = [correct_option] + wrong_options[:4]
        random.shuffle(options)

        return {
            "hanja": hanja_info["한자"],
            "correct_hun_eum": correct_option,
            "grade": question["grade"],
            "method": self.method_id,
            "options": options,
            "correct_option": correct_option,
        }

    def submit_answer(
        self,
        user_id: str,
        hanja: str,
        grade: str,
        submitted: str,
        **kwargs
    ) -> Dict[str, Any]:
        hanja_info = df[df["한자"] == hanja].to_dict("records")
        if not hanja_info:
            return {"error": "한자를 찾을 수 없습니다."}

        info = hanja_info[0]
        correct_option = _get_joined_option(info)

        correct = check_answer(
            submitted,
            answer_type="hun",
            correct_hun_eum=correct_option
        )

        srs_manager.update_weight(user_id, grade, hanja, correct, method=self.method_id)

        return {
            "status": "success",
            "correct": correct,
            "submitted": submitted,
            "correct_answer": correct_option,
            "message": "정답입니다!" if correct else "오답입니다."
        }
