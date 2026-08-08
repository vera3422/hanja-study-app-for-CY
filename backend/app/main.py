from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.services.data_loader import load_hanja_data
from app.services.exam_loader import load_exam_data
from app.services.grade_range import get_grade_range
from app.routers.questions import router as questions_router
from app.routers.exam import router as exam_router
from app.routers.handwriting import router as handwriting_router

app = FastAPI(title="한자능력검정 학습 앱")

# 획순 이미지 등 정적 파일 (data/exam-strokes → /exam-strokes/...)
_data_dir = Path(__file__).resolve().parent.parent / "data"
_stroke_dir = _data_dir / "exam-strokes"
_stroke_dir.mkdir(parents=True, exist_ok=True)
app.mount(
    "/exam-strokes",
    StaticFiles(directory=str(_stroke_dir)),
    name="exam-strokes",
)

# CORS 설정 (프론트엔드에서 호출가능하도록 해줌)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "*"],  # * 추가
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 라우터 등록
app.include_router(questions_router)
app.include_router(exam_router)
app.include_router(handwriting_router)

# 데이터 로드 (한자 사전 + 기출)
df, grades = load_hanja_data()
load_exam_data()

@app.get("/")
def root():
    return {"message": "한자 학습 앱 API 서버가 정상 작동 중입니다."}

@app.get("/api/grade-range")
def get_grade_range_api(selected: str, mode: int = 1):
    """출제 범위 반환"""
    return {
        "selected": selected,
        "mode": mode,
        "grades": get_grade_range(selected, mode)
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
