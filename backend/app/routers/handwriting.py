# app/routers/handwriting.py
"""
한자 필기 인식 프록시 (Google Input Tools Handwriting)
- FE → 이 API → inputtools.google.com
- CORS 회피 + 비공식 API 응답 정규화
- 언어 기본값: zh_TW (繁體, 한국어문회 한자 기준)
"""
from __future__ import annotations

import json
import urllib.error
import urllib.request
from typing import Any, List, Optional

from fastapi import APIRouter
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api", tags=["handwriting"])

GOOGLE_HANDWRITING_URL = "https://inputtools.google.com/request?ime=handwriting&app=0&cs=1&oe=UTF-8"
REQUEST_TIMEOUT_SEC = 8.0


class StrokePoint(BaseModel):
    x: float
    y: float


class RecognizeRequest(BaseModel):
    """FE HandwritingPad 획 데이터"""
    # 획 배열: [[{x,y}, ...], ...] 또는 [[[x,y],...], ...]
    strokes: List[Any] = Field(default_factory=list)
    width: float = Field(280, description="필기 영역 가로(px)")
    height: float = Field(280, description="필기 영역 세로(px)")
    language: str = Field("zh_TW", description="Google 언어 코드 (권장: zh_TW)")
    max_results: int = Field(8, ge=1, le=20)


def _normalize_strokes(raw_strokes: List[Any]) -> List[List[List[float]]]:
    """
    FE 형식 통일 → [[ [x,y], [x,y], ... ], ...]
    - {x,y} 객체 배열 또는 [x,y] 배열 모두 허용
    """
    out: List[List[List[float]]] = []
    for stroke in raw_strokes or []:
        if not stroke:
            continue
        points: List[List[float]] = []
        for p in stroke:
            if isinstance(p, dict):
                x = float(p.get("x", 0))
                y = float(p.get("y", 0))
                points.append([x, y])
            elif isinstance(p, (list, tuple)) and len(p) >= 2:
                points.append([float(p[0]), float(p[1])])
        if len(points) >= 1:
            out.append(points)
    return out


def _strokes_to_ink(strokes: List[List[List[float]]]) -> List[List[List[float]]]:
    """
    Google ink 형식: 획마다 [x좌표들, y좌표들, t좌표들]
    t가 비어 있어도 동작하는 사례가 있어, 없으면 단순 인덱스 기반 시각 부여
    """
    ink: List[List[List[float]]] = []
    for stroke in strokes:
        xs = [pt[0] for pt in stroke]
        ys = [pt[1] for pt in stroke]
        # 대략적인 시간축 (ms 간격 가정)
        ts = [float(i * 15) for i in range(len(stroke))]
        ink.append([xs, ys, ts])
    return ink


def _parse_google_candidates(data: Any, max_results: int) -> List[str]:
    """
    Google 응답 예:
      ["SUCCESS", [[[ "字", "후보2", ... ], ... ]]]
    구조가 다소 가변적이므로 재귀적으로 한자 문자열 후보를 수집
    """
    candidates: List[str] = []

    def is_single_hanja(s: str) -> bool:
        """앱은 단글자 한자만 사용 — 2글자 이상 후보는 제외"""
        if not s or not isinstance(s, str):
            return False
        if len(s) != 1:
            return False
        ch = s[0]
        return (
            "\u4e00" <= ch <= "\u9fff"
            or "\u3400" <= ch <= "\u4dbf"
        )

    def walk(node: Any, depth: int = 0) -> None:
        if depth > 8 or len(candidates) >= max_results * 3:
            return
        if isinstance(node, str):
            if is_single_hanja(node) and node not in candidates:
                candidates.append(node)
            return
        if isinstance(node, list):
            for item in node:
                walk(item, depth + 1)

    if not isinstance(data, list) or not data:
        return []

    status = data[0] if data else None
    if status != "SUCCESS":
        return []

    # 본문만 탐색
    if len(data) > 1:
        walk(data[1])
    return candidates[:max_results]


@router.post("/recognize-handwriting")
def recognize_handwriting(body: RecognizeRequest):
    """
    필기 획 → Google Handwriting 인식 → 후보 한자 목록
    """
    strokes = _normalize_strokes(body.strokes)
    if not strokes:
        return {
            "candidates": [],
            "source": "google",
            "error": "유효한 획이 없습니다.",
        }

    ink = _strokes_to_ink(strokes)
    width = max(int(body.width or 280), 50)
    height = max(int(body.height or 280), 50)
    language = (body.language or "zh_TW").replace("-", "_")
    max_results = body.max_results or 8
    # 단글자 필터로 일부가 빠지므로 Google에는 여유 있게 요청 후 최종 max_results개만 반환
    google_num = min(max(max_results * 3, 16), 20)

    payload = {
        "options": "enable_pre_space",
        "requests": [
            {
                "writing_guide": {
                    "writing_area_width": width,
                    "writing_area_height": height,
                },
                "max_num_results": google_num,
                "max_completions": 0,
                "language": language,
                "ink": ink,
            }
        ],
    }

    req = urllib.request.Request(
        GOOGLE_HANDWRITING_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json; charset=utf-8",
            "User-Agent": "hanja-study-app/1.0",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=REQUEST_TIMEOUT_SEC) as resp:
            raw = resp.read().decode("utf-8", errors="replace")
            data = json.loads(raw)
    except urllib.error.HTTPError as e:
        return {
            "candidates": [],
            "source": "google",
            "error": f"Google HTTP 오류: {e.code}",
        }
    except urllib.error.URLError as e:
        return {
            "candidates": [],
            "source": "google",
            "error": f"Google 연결 실패: {getattr(e, 'reason', e)}",
        }
    except json.JSONDecodeError:
        return {
            "candidates": [],
            "source": "google",
            "error": "Google 응답 JSON 파싱 실패",
        }
    except Exception as e:
        return {
            "candidates": [],
            "source": "google",
            "error": f"인식 요청 실패: {e}",
        }

    candidates = _parse_google_candidates(data, max_results)
    return {
        "candidates": candidates,
        "source": "google",
        "language": language,
        "error": None if candidates else "후보 없음 (또는 파싱 실패)",
    }
