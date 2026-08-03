# app/services/exam_loader.py
"""
기출문제 CSV 로더.
- Phase 0에서 생성한 data/기출_4급.csv 등을 로드
- 4-1(회차별) / 4-2(필터·랜덤) API에서 사용
- SRS 미적용. Frontend에서 리스트를 받아 순차/셔플 학습
"""
from __future__ import annotations

import json
import random
from pathlib import Path
from typing import Any, Dict, List, Optional

import pandas as pd

# 모듈 전역 캐시
exam_df: Optional[pd.DataFrame] = None

# 유형 코드 → 표시용 한글 이름 (메타 API용)
TYPE_LABELS: Dict[str, str] = {
    "dokum": "독음 (讀音)",
    "hunum": "훈·음",
    "bushu": "부수",
    "yakja": "약자",
    "jangum": "장음",
    "banui": "반의·상대",
    "yui": "유의",
    "dongeum": "동음어",
    "uut_select": "뜻 고르기",
    "seong-eo": "성어",
    "hanjaeo_write": "한자어 쓰기",
    "mean": "단어 뜻",  # 표시용 라벨만 변경 (코드 mean 유지)
}


def _data_dir() -> Path:
    current_file = Path(__file__).resolve()
    return current_file.parent.parent.parent / "data"


def _safe_str(val: Any) -> str:
    """NaN / None → 빈 문자열, 그 외 str"""
    if val is None:
        return ""
    if isinstance(val, float) and pd.isna(val):
        return ""
    s = str(val).strip()
    if s.lower() == "nan":
        return ""
    return s


def _parse_options(raw: Any) -> Optional[List[str]]:
    """options 컬럼(JSON 문자열 또는 NaN) → list 또는 None"""
    s = _safe_str(raw)
    if not s:
        return None
    try:
        parsed = json.loads(s)
        if isinstance(parsed, list):
            return [str(x) for x in parsed]
        return None
    except (json.JSONDecodeError, TypeError):
        return None


def _row_to_question(row: pd.Series) -> Dict[str, Any]:
    """DataFrame 한 행 → API 응답용 dict"""
    return {
        "level": _safe_str(row.get("level")),
        "session": int(row["session"]) if pd.notna(row.get("session")) else 0,
        "exam_date": _safe_str(row.get("exam_date")),
        "question_no": int(row["question_no"]) if pd.notna(row.get("question_no")) else 0,
        "question_type": _safe_str(row.get("question_type")),
        "instruction": _safe_str(row.get("instruction")),
        "question_text": _safe_str(row.get("question_text")),
        "target": _safe_str(row.get("target")),
        "options": _parse_options(row.get("options")),
        "answer": _safe_str(row.get("answer")),
        "answer_display": _safe_str(row.get("answer_display")),
    }


def load_exam_data() -> Optional[pd.DataFrame]:
    """
    data/ 아래 기출_*.csv 를 모두 로드해 하나로 합친다.
    현재는 기출_4급.csv 만 존재. 이후 급수 추가 시 자동 반영.
    """
    global exam_df
    data_dir = _data_dir()
    if not data_dir.exists():
        print(f"[exam_loader] 경로 오류: {data_dir}")
        exam_df = None
        return None

    csv_files = sorted(data_dir.glob("기출_*.csv"))
    if not csv_files:
        print(f"[exam_loader] 기출 CSV 없음: {data_dir}")
        exam_df = None
        return None

    frames: List[pd.DataFrame] = []
    for path in csv_files:
        try:
            # UTF-8 BOM 호환
            frame = pd.read_csv(path, encoding="utf-8-sig")
            frames.append(frame)
            print(f"[exam_loader] 로드: {path.name} ({len(frame)}행)")
        except Exception as e:
            print(f"[exam_loader] 로드 실패 {path.name}: {e}")

    if not frames:
        exam_df = None
        return None

    exam_df = pd.concat(frames, ignore_index=True)

    # session / question_no 를 숫자로 정규화
    exam_df["session"] = pd.to_numeric(exam_df["session"], errors="coerce").fillna(0).astype(int)
    exam_df["question_no"] = pd.to_numeric(exam_df["question_no"], errors="coerce").fillna(0).astype(int)

    print(f"✅ [exam_loader] 총 {len(exam_df)}개 기출 문항 로드 완료.")
    return exam_df


def get_levels() -> List[str]:
    """사용 가능한 급수 목록 (정렬: 4급 등 존재하는 것만)"""
    if exam_df is None or exam_df.empty:
        return []
    levels = exam_df["level"].dropna().astype(str).unique().tolist()
    # 급수 관례 순서로 정렬 시도
    grade_order = [
        "8급", "7급Ⅱ", "7급", "6급Ⅱ", "6급", "5급Ⅱ", "5급",
        "4급Ⅱ", "4급", "3급Ⅱ", "3급", "2급", "1급",
    ]
    order_map = {g: i for i, g in enumerate(grade_order)}
    return sorted(levels, key=lambda x: order_map.get(x, 999))


def get_sessions(level: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    회차 메타 목록.
    level 지정 시 해당 급수만, 없으면 전체.
    반환: [{session, exam_date, level, total}, ...]  (session 내림차순)
    """
    if exam_df is None or exam_df.empty:
        return []

    df = exam_df
    if level:
        df = df[df["level"].astype(str) == level]
    if df.empty:
        return []

    grouped = (
        df.groupby(["level", "session", "exam_date"], dropna=False)
        .size()
        .reset_index(name="total")
    )
    rows = []
    for _, r in grouped.iterrows():
        rows.append({
            "level": _safe_str(r["level"]),
            "session": int(r["session"]),
            "exam_date": _safe_str(r["exam_date"]),
            "total": int(r["total"]),
        })
    # 최신 회차 먼저
    rows.sort(key=lambda x: (-x["session"], x["level"]))
    return rows


def get_types() -> List[Dict[str, str]]:
    """문제 유형 코드 + 한글 라벨 목록 (데이터에 실제 존재하는 것만)"""
    if exam_df is None or exam_df.empty:
        return []
    present = exam_df["question_type"].dropna().astype(str).unique().tolist()
    # TYPE_LABELS 순서 유지
    result = []
    for code, label in TYPE_LABELS.items():
        if code in present:
            result.append({"code": code, "label": label})
    # 라벨에 없는 새 유형이 있으면 뒤에 추가
    for code in present:
        if code not in TYPE_LABELS:
            result.append({"code": code, "label": code})
    return result


def get_session_questions(
    level: str,
    session: int,
) -> Dict[str, Any]:
    """
    4-1용: 특정 급수·회차의 문제를 question_no 오름차순으로 반환.
    """
    if exam_df is None or exam_df.empty:
        return {"error": "기출 데이터가 로드되지 않았습니다.", "questions": [], "total": 0}

    mask = (
        (exam_df["level"].astype(str) == level)
        & (exam_df["session"] == int(session))
    )
    subset = exam_df.loc[mask].sort_values("question_no")
    if subset.empty:
        return {
            "error": f"'{level}' {session}회 기출이 없습니다.",
            "level": level,
            "session": session,
            "questions": [],
            "total": 0,
        }

    questions = [_row_to_question(row) for _, row in subset.iterrows()]
    exam_date = questions[0]["exam_date"] if questions else ""
    return {
        "level": level,
        "session": int(session),
        "exam_date": exam_date,
        "total": len(questions),
        "questions": questions,
    }


def get_random_questions(
    level: str,
    count: int = 20,
    types: Optional[List[str]] = None,
    sessions: Optional[List[int]] = None,
) -> Dict[str, Any]:
    """
    4-2용: 필터 후 랜덤 샘플.
    - level 필수
    - types: 지정 시 해당 유형만
    - sessions: 지정 시 해당 회차만
    - count: 최대 문항 수 (부족하면 있는 만큼)
    """
    if exam_df is None or exam_df.empty:
        return {"error": "기출 데이터가 로드되지 않았습니다.", "questions": [], "total": 0}

    df = exam_df[exam_df["level"].astype(str) == level]
    if df.empty:
        return {
            "error": f"'{level}' 기출 데이터가 없습니다.",
            "level": level,
            "questions": [],
            "total": 0,
        }

    if sessions:
        session_set = {int(s) for s in sessions}
        df = df[df["session"].isin(session_set)]
    if types:
        type_set = {t.strip() for t in types if t and t.strip()}
        if type_set:
            df = df[df["question_type"].astype(str).isin(type_set)]

    if df.empty:
        return {
            "error": "조건에 맞는 기출 문항이 없습니다.",
            "level": level,
            "questions": [],
            "total": 0,
        }

    n = min(max(1, int(count)), len(df))
    # 샘플링 (재현성보다 다양성 우선 → 매번 다른 집합)
    sampled = df.sample(n=n, replace=False)
    # 화면에서는 랜덤 순서로 보여주므로 한 번 더 섞음
    indices = list(sampled.index)
    random.shuffle(indices)
    questions = [_row_to_question(exam_df.loc[i]) for i in indices]

    return {
        "level": level,
        "count_requested": int(count),
        "total": len(questions),
        "filters": {
            "types": types or [],
            "sessions": sessions or [],
        },
        "questions": questions,
    }


# 모듈 import 시 자동 로드
load_exam_data()

if __name__ == "__main__":
    load_exam_data()
    print("levels:", get_levels())
    print("sessions sample:", get_sessions("4급")[:3])
    print("types:", get_types())
    q = get_session_questions("4급", 113)
    print("113회 total:", q.get("total"), "first type:", q["questions"][0]["question_type"] if q.get("questions") else None)
    r = get_random_questions("4급", count=5, types=["dokum", "hunum"])
    print("random sample types:", [x["question_type"] for x in r.get("questions", [])])
