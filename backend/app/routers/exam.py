# app/routers/exam.py
"""
기출문제 API (학습 방법 4-1, 4-2)
- SRS 미적용
- Frontend가 리스트를 받아 순차 학습 / 클라이언트 채점
"""
from typing import List, Optional

from fastapi import APIRouter, Query

from app.services import exam_loader

router = APIRouter(prefix="/api/exam", tags=["exam"])


@router.get("/meta")
def get_exam_meta():
    """
    기출 메타 정보 한 번에 조회.
    - levels: 사용 가능한 급수 (기출 CSV 존재 분)
    - sessions: 급수별 회차 목록 (해당 급수 CSV에 있는 회차만, 최신순)
    - types: 전체 유형 (하위 호환)
    - types_by_level: 급수별 유형 (4-2에서 선택 급수 유형 버튼만 표시)
    """
    if exam_loader.exam_df is None:
        return {
            "error": "기출 데이터가 로드되지 않았습니다.",
            "levels": [],
            "sessions": {},
            "types": [],
            "types_by_level": {},
        }

    levels = exam_loader.get_levels()
    sessions_by_level = {}
    for lv in levels:
        sessions_by_level[lv] = exam_loader.get_sessions(lv)

    return {
        "levels": levels,
        "sessions": sessions_by_level,
        "types": exam_loader.get_types(),
        "types_by_level": exam_loader.get_types_by_level(),
        "total_questions": int(len(exam_loader.exam_df)),
    }


@router.get("/levels")
def get_exam_levels():
    """사용 가능한 기출 급수 목록"""
    levels = exam_loader.get_levels()
    if not levels and exam_loader.exam_df is None:
        return {"error": "기출 데이터가 로드되지 않았습니다.", "levels": []}
    return {"levels": levels}


@router.get("/sessions")
def get_exam_sessions(
    level: Optional[str] = Query(None, description="급수 (예: 4급). 없으면 전체"),
):
    """
    회차 목록.
    level 지정 시 해당 급수만, 없으면 전체.
    session 내림차순 (최신 회차 먼저).
    """
    if exam_loader.exam_df is None:
        return {"error": "기출 데이터가 로드되지 않았습니다.", "sessions": []}

    sessions = exam_loader.get_sessions(level)
    return {
        "level": level,
        "sessions": sessions,
        "total": len(sessions),
    }


@router.get("/types")
def get_exam_types(
    level: Optional[str] = Query(None, description="급수 (예: 8급). 지정 시 해당 급수 유형만"),
):
    """문제 유형 목록 (코드 + 한글 라벨). level 지정 시 해당 급수에 존재하는 유형만."""
    if exam_loader.exam_df is None:
        return {"error": "기출 데이터가 로드되지 않았습니다.", "types": [], "level": level}
    return {
        "level": level,
        "types": exam_loader.get_types(level),
    }


@router.get("/questions")
def get_exam_questions(
    level: str = Query(..., description="급수 (예: 4급)"),
    session: int = Query(..., description="회차 번호 (예: 113)"),
):
    """
    학습 방법 4-1용.
    지정 급수·회차의 문제를 question_no 오름차순으로 반환.
    Frontend에서 순서대로 풀이.
    """
    return exam_loader.get_session_questions(level=level, session=session)


@router.get("/questions/random")
def get_exam_questions_random(
    level: str = Query(..., description="급수 (예: 4급)"),
    count: int = Query(20, ge=1, le=200, description="가져올 문항 수 (1~200)"),
    types: Optional[str] = Query(
        None,
        description="쉼표 구분 유형 필터 (예: dokum,hunum,bushu). 없으면 전체 유형",
    ),
    sessions: Optional[str] = Query(
        None,
        description="쉼표 구분 회차 필터 (예: 113,112,111). 없으면 전체 회차",
    ),
):
    """
    학습 방법 4-2용.
    level 필수, types / sessions 선택 필터 후 랜덤 샘플.
    """
    type_list: Optional[List[str]] = None
    if types:
        type_list = [t.strip() for t in types.split(",") if t.strip()]

    session_list: Optional[List[int]] = None
    if sessions:
        session_list = []
        for s in sessions.split(","):
            s = s.strip()
            if not s:
                continue
            try:
                session_list.append(int(s))
            except ValueError:
                return {
                    "error": f"sessions 값이 정수가 아닙니다: '{s}'",
                    "questions": [],
                    "total": 0,
                }

    return exam_loader.get_random_questions(
        level=level,
        count=count,
        types=type_list,
        sessions=session_list,
    )
