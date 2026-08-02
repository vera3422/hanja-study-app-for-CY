from typing import Dict, List, Optional
from datetime import datetime, timezone
import math
import random


class SRSManager:
    """학습 방법별(1-1 / 1-2 / 2-1 / 2-2)로 분리된 SRS 가중치 관리.

    한자별 저장 항목
    - performance_weight : 정답/오답에 따라 변하는 기본 가중치
    - last_seen          : 마지막 응답 시각 (ISO 문자열, 없으면 None)

    출제 시 사용 가중치
    - effective_weight = performance_weight × time_multiplier(last_seen)
    - time_multiplier  = 1.0 (기록 없음) 또는 1 - exp(-t/τ)
    """

    # 시간 상수 (시간 단위). 추후 조정 가능
    TAU_HOURS: float = 24.0

    # 회복 주기 및 회귀 계수. 추후 변경 가능
    RECOVERY_INTERVAL_HOURS: float = 24.0
    RECOVERY_FACTOR: float = 0.92  # performance_weight = 1.0 + (w - 1.0) * 0.92

    def __init__(self):
        # key: "user_id:grade:method"
        # value: { hanja: {"weight": float, "last_seen": str | None}, ... }
        self.data: Dict[str, Dict[str, dict]] = {}

        # key: "user_id:grade:method" → 마지막 회복 적용 시각 (ISO)
        self.last_recovery: Dict[str, str] = {}

    # ------------------------------------------------------------------
    # 키 / 시간 유틸
    # ------------------------------------------------------------------
    def _key(self, user_id: str, grade: str, method: str) -> str:
        return f"{user_id}:{grade}:{method}"

    def _now_iso(self) -> str:
        return datetime.now(timezone.utc).isoformat()

    def _parse_iso(self, iso_str: str) -> datetime:
        # Python 3.11+ 는 fromisoformat이 Z를 지원하지만, 안전하게 처리
        if iso_str.endswith("Z"):
            iso_str = iso_str[:-1] + "+00:00"
        return datetime.fromisoformat(iso_str)

    def _hours_since(self, iso_str: Optional[str]) -> Optional[float]:
        """last_seen 이후 경과 시간(시간). 없으면 None."""
        if not iso_str:
            return None
        try:
            last = self._parse_iso(iso_str)
            now = datetime.now(timezone.utc)
            # naive datetime이 들어오면 UTC로 간주
            if last.tzinfo is None:
                last = last.replace(tzinfo=timezone.utc)
            delta = now - last
            return max(0.0, delta.total_seconds() / 3600.0)
        except Exception:
            return None

    def _time_multiplier(self, last_seen: Optional[str]) -> float:
        """last_seen 이 없으면 1.0, 있으면 1 - exp(-t/τ)."""
        t = self._hours_since(last_seen)
        if t is None:
            return 1.0
        return 1.0 - math.exp(-t / self.TAU_HOURS)

    # ------------------------------------------------------------------
    # 회복 (24시간마다 performance_weight를 1.0 방향으로 회귀)
    # 경과 시간이 주기(N배)이면 회귀를 N회 적용 (다중 회복)
    # ------------------------------------------------------------------
    def _maybe_recover(self, key: str) -> None:
        """해당 key의 모든 한자에 대해 회복 주기가 지났으면 회귀 적용.
        예: 50시간 경과 → floor(50/24)=2회 회귀 적용.
        """
        now = datetime.now(timezone.utc)
        last_iso = self.last_recovery.get(key)

        # 첫 기록이 없으면 기준 시각만 남기고 종료 (회복 없음)
        if not last_iso:
            self.last_recovery[key] = self._now_iso()
            return

        try:
            last = self._parse_iso(last_iso)
            if last.tzinfo is None:
                last = last.replace(tzinfo=timezone.utc)
            elapsed_hours = (now - last).total_seconds() / 3600.0
        except Exception:
            # 파싱 실패 시 기준 시각만 갱신
            self.last_recovery[key] = self._now_iso()
            return

        interval = self.RECOVERY_INTERVAL_HOURS
        n = int(elapsed_hours // interval)  # 적용할 회복 횟수
        if n < 1:
            return

        if key not in self.data:
            # 데이터 없어도 기준 시각은 경과분만큼 전진
            advanced = last.timestamp() + n * interval * 3600.0
            self.last_recovery[key] = datetime.fromtimestamp(
                advanced, tz=timezone.utc
            ).isoformat()
            return

        for _ in range(n):
            for hanja, entry in self.data[key].items():
                w = entry.get("weight", 1.0)
                # 1.0 방향으로 천천히 회귀
                new_w = 1.0 + (w - 1.0) * self.RECOVERY_FACTOR
                # 최댓값 1.0, 하한 0.1 유지
                entry["weight"] = max(0.1, min(1.0, new_w))

        # last_recovery를 n주기만큼 전진 (나머지 시간은 다음 주기에 누적)
        advanced = last.timestamp() + n * interval * 3600.0
        self.last_recovery[key] = datetime.fromtimestamp(
            advanced, tz=timezone.utc
        ).isoformat()


    # ------------------------------------------------------------------
    # 초기화 / 조회 / 업데이트
    # ------------------------------------------------------------------
    def initialize_weights(
        self,
        hanja_list: List[dict],
        user_id: str = "default",
        grade: str = "8급",
        method: str = "1-1",
    ):
        """특정 급수·학습방법의 SRS 가중치 초기화.
        이미 존재하는 한자는 덮어쓰지 않고, 없는 한자만 weight=1.0 / last_seen=None 으로 추가.
        (매 출제마다 호출되어도 학습 중인 weight가 리셋되지 않도록)
        """
        key = self._key(user_id, grade, method)
        if key not in self.data:
            self.data[key] = {}

        for item in hanja_list:
            if item.get("급수") != grade:
                continue
            hanja = item.get("한자")
            if hanja and hanja not in self.data[key]:
                self.data[key][hanja] = {
                    "weight": 1.0,
                    "last_seen": None,
                }

    def get_weights(
        self,
        user_id: str = "default",
        grade: str | None = None,
        method: str | None = None,
    ) -> Dict:
        """디버그용: 현재 weight 조회.
        grade / method 가 있으면 해당 조합만, 없으면 해당 user의 전체.
        """
        prefix = f"{user_id}:"
        result = {}
        for k, mapping in self.data.items():
            if not k.startswith(prefix):
                continue
            parts = k.split(":")
            # user_id:grade:method  (grade에 콜론이 없다고 가정)
            if len(parts) < 3:
                continue
            g, m = parts[1], parts[2]
            if grade is not None and g != grade:
                continue
            if method is not None and m != method:
                continue
            result[k] = {
                h: {
                    "weight": entry.get("weight", 1.0),
                    "last_seen": entry.get("last_seen"),
                    "time_multiplier": self._time_multiplier(entry.get("last_seen")),
                    "effective_weight": entry.get("weight", 1.0)
                    * self._time_multiplier(entry.get("last_seen")),
                }
                for h, entry in mapping.items()
            }
        return result

    def update_weight(
        self,
        user_id: str,
        grade: str,
        hanja: str,
        correct: bool,
        method: str = "1-1",
    ):
        """정답/오답에 따라 performance_weight 업데이트 + last_seen 갱신."""
        key = self._key(user_id, grade, method)
        if key not in self.data:
            self.data[key] = {}

        # 회복 체크 (업데이트 시점에도 적용)
        self._maybe_recover(key)

        entry = self.data[key].get(hanja)
        if entry is None:
            entry = {"weight": 1.0, "last_seen": None}
            self.data[key][hanja] = entry

        current = entry.get("weight", 1.0)

        if correct:
            # 정답 → 0.5배 (출현 확률 ↓), 최댓값 1.0
            new_weight = min(1.0, max(0.1, current * 0.5))
        else:
            # 오답 → 1.0배 (변동 없음), 최댓값 1.0
            new_weight = min(1.0, current * 1.0)

        entry["weight"] = new_weight
        entry["last_seen"] = self._now_iso()  # 응답 시점에 갱신

    def get_next_question(
        self,
        user_id: str,
        grades: List[str],
        method: str = "1-1",
    ):
        """가중 랜덤으로 다음 문제 선택.
        effective_weight = performance_weight × time_multiplier(last_seen)
        """
        candidates = []
        weights = []

        for grade in grades:
            key = self._key(user_id, grade, method)
            if key not in self.data:
                continue

            # 출제 직전에 회복 적용
            self._maybe_recover(key)

            for hanja, entry in self.data[key].items():
                perf = entry.get("weight", 1.0)
                last_seen = entry.get("last_seen")
                tm = self._time_multiplier(last_seen)
                effective = perf * tm

                # 너무 작은 값은 선택 확률을 거의 0으로 만들기 위해 하한 유지
                if effective < 1e-6:
                    effective = 1e-6

                candidates.append({"한자": hanja, "grade": grade})
                weights.append(effective)

        if not candidates:
            return None

        selected = random.choices(candidates, weights=weights, k=1)[0]
        return selected


# 전역 인스턴스
srs_manager = SRSManager()
