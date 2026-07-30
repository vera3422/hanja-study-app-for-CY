# app/services/learning/factory.py
from .method_11 import Method11
from .method_12 import Method12
from .method_21 import Method21
from .method_22 import Method22

from .base import LearningMethod

_METHODS = {
    "1-1": Method11(),
    "1-2": Method12(),
    "2-1": Method21(),
    "2-2": Method22(),
}

def get_learning_method(method: str) -> LearningMethod:
    """학습 방법별 구현체 반환"""
    if method not in _METHODS:
        raise ValueError(f"지원하지 않는 학습 방법: {method}. 지원: {list(_METHODS.keys())}")
    return _METHODS[method]