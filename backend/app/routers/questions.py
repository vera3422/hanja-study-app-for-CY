from fastapi import APIRouter, Query
from pydantic import BaseModel

from app.services.learning.factory import get_learning_method
from app.services.srs import srs_manager

router = APIRouter(prefix="/api", tags=["questions"])


class SubmitAnswerRequest(BaseModel):
    """POST 요청 본문 모델"""
    user_id: str = "default"
    hanja: str
    grade: str
    submitted: str
    method: str = "1-1"      # ← 핵심: method 필드 추가


@router.get("/next-question")
def get_next_question(
    user_id: str = Query("default", description="사용자 ID"),
    selected_grade: str = Query(..., description="목표 등급"),
    method: str = Query("1-1", description="학습 방법 (1-1, 1-2, 2-1, 2-2)")
):
    """학습 방법별 다음 문제 출제"""
    try:
        learning = get_learning_method(method)
        return learning.get_next_question(user_id, selected_grade)
    except ValueError as e:
        return {"error": str(e)}
    except Exception as e:
        return {"error": f"문제 생성 중 오류: {str(e)}"}


@router.post("/submit-answer")
def submit_answer(request: SubmitAnswerRequest):
    """학습 방법별 정답 제출 → 검증 → SRS 업데이트"""
    try:
        learning = get_learning_method(request.method)
        return learning.submit_answer(
            user_id=request.user_id,
            hanja=request.hanja,
            grade=request.grade,
            submitted=request.submitted
        )
    except ValueError as e:
        return {"error": str(e)}
    except Exception as e:
        return {"error": f"답안 처리 중 오류: {str(e)}"}


@router.get("/srs-weights")
def get_srs_weights(
    user_id: str = Query("default", description="사용자 ID"),
    grade: str | None = Query(None, description="급수 (예: 8급). 없으면 해당 user 전체"),
    method: str | None = Query(None, description="학습 방법 (1-1, 1-2, 2-1, 2-2). 없으면 전체"),
    changed_only: bool = Query(False, description="True면 performance_weight가 1.0이 아닌 항목만 반환"),
):
    """[임시 디버그] SRS weight 조회.
    학습 방법별로 분리된 performance_weight / last_seen / effective_weight 확인용.
    """
    raw = srs_manager.get_weights(user_id=user_id, grade=grade, method=method)

    if not raw:
        return {
            "user_id": user_id,
            "grade": grade,
            "method": method,
            "message": "아직 weight가 없습니다. 해당 급수·학습방법으로 문제를 한 번 이상 출제해 주세요.",
            "weights": {},
        }

    if changed_only:
        filtered = {}
        for key, mapping in raw.items():
            changed = {
                h: info
                for h, info in mapping.items()
                if info.get("weight", 1.0) != 1.0
            }
            if changed:
                filtered[key] = changed
        raw = filtered

    # effective_weight 내림차순 정렬
    sorted_out = {}
    for key, mapping in raw.items():
        sorted_out[key] = dict(
            sorted(
                mapping.items(),
                key=lambda x: (-x[1].get("effective_weight", 0), x[0]),
            )
        )

    return {
        "user_id": user_id,
        "grade": grade,
        "method": method,
        "changed_only": changed_only,
        "tau_hours": srs_manager.TAU_HOURS,
        "recovery_interval_hours": srs_manager.RECOVERY_INTERVAL_HOURS,
        "recovery_factor": srs_manager.RECOVERY_FACTOR,
        "weights": sorted_out,
    }
