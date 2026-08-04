/**
 * 한자 필기 캔버스 컴포넌트
 *
 * - 터치(모바일) + 마우스(PC) 모두 지원
 * - clear / undo / getStrokes 를 ref로 제공
 * - 획 데이터는 hanjaRecognizer의 Strokes 타입과 호환
 *
 * 사용 예:
 *   const padRef = useRef<HandwritingPadHandle>(null);
 *   <HandwritingPad ref={padRef} disabled={!!feedback} />
 *   const strokes = padRef.current?.getStrokes() ?? [];
 *   padRef.current?.clear();
 *   padRef.current?.undo();
 */

import {
  useRef,
  useEffect,
  useImperativeHandle,
  forwardRef,
  useCallback,
} from 'react';
import type { StrokePoint, Strokes } from '../../lib/hanjaRecognizer';

export interface HandwritingPadHandle {
  /** 현재까지 그린 모든 획 반환 */
  getStrokes: () => Strokes;
  /** 전체 지우기 */
  clear: () => void;
  /** 마지막 획 하나만 되돌리기 */
  undo: () => void;
  /** 획이 하나라도 있는지 */
  hasStrokes: () => boolean;
}

interface HandwritingPadProps {
  /** true면 그리기 비활성화 (제출 후 등) */
  disabled?: boolean;
  /** 캔버스 클래스 (크기·테두리 등 Tailwind 조절용) */
  className?: string;
  /** 선 색상 */
  strokeColor?: string;
  /** 선 두께 */
  strokeWidth?: number;
}

const HandwritingPad = forwardRef<HandwritingPadHandle, HandwritingPadProps>(
  function HandwritingPad(
    {
      disabled = false,
      className = '',
      strokeColor = '#1e1b4b', // indigo-950 계열
      strokeWidth = 4,
    },
    ref
  ) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const strokesRef = useRef<Strokes>([]);
    const currentStrokeRef = useRef<StrokePoint[]>([]);
    const isDrawingRef = useRef(false);

    // 캔버스 실제 픽셀 크기와 CSS 표시 크기를 맞춤 (고해상도 대응)
    const resizeCanvas = useCallback(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;

      // 내부 해상도 설정
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = strokeWidth;
      }

      // 리사이즈 후 기존 획 다시 그리기
      redrawAll();
    }, [strokeColor, strokeWidth]);

    const redrawAll = useCallback(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const rect = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, rect.width, rect.height);

      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = strokeWidth;

      for (const stroke of strokesRef.current) {
        if (stroke.length < 2) continue;
        ctx.beginPath();
        ctx.moveTo(stroke[0].x, stroke[0].y);
        for (let i = 1; i < stroke.length; i++) {
          ctx.lineTo(stroke[i].x, stroke[i].y);
        }
        ctx.stroke();
      }
    }, [strokeColor, strokeWidth]);

    // 좌표 변환 (캔버스 기준)
    const getPoint = (clientX: number, clientY: number): StrokePoint => {
      const canvas = canvasRef.current!;
      const rect = canvas.getBoundingClientRect();
      return {
        x: clientX - rect.left,
        y: clientY - rect.top,
      };
    };

    const startStroke = (clientX: number, clientY: number) => {
      if (disabled) return;
      isDrawingRef.current = true;
      const point = getPoint(clientX, clientY);
      currentStrokeRef.current = [point];
    };

    const moveStroke = (clientX: number, clientY: number) => {
      if (!isDrawingRef.current || disabled) return;
      const point = getPoint(clientX, clientY);
      currentStrokeRef.current.push(point);

      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!ctx || currentStrokeRef.current.length < 2) return;

      const prev = currentStrokeRef.current[currentStrokeRef.current.length - 2];
      ctx.beginPath();
      ctx.moveTo(prev.x, prev.y);
      ctx.lineTo(point.x, point.y);
      ctx.stroke();
    };

    const endStroke = () => {
      if (!isDrawingRef.current) return;
      isDrawingRef.current = false;

      if (currentStrokeRef.current.length > 0) {
        strokesRef.current.push([...currentStrokeRef.current]);
      }
      currentStrokeRef.current = [];
    };

    // --- Pointer Events (터치 + 마우스 통합) ---
    // 모바일에서 캔버스 위 드래그가 페이지 스크롤로 해석되지 않도록
    // { passive: false }로 preventDefault를 허용하고, Touch 경로도 함께 차단한다.
    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const onPointerDown = (e: PointerEvent) => {
        e.preventDefault();
        canvas.setPointerCapture(e.pointerId);
        startStroke(e.clientX, e.clientY);
      };

      const onPointerMove = (e: PointerEvent) => {
        e.preventDefault();
        moveStroke(e.clientX, e.clientY);
      };

      const onPointerUp = (e: PointerEvent) => {
        e.preventDefault();
        endStroke();
      };

      const onPointerCancel = () => {
        endStroke();
      };

      // Touch 전용 경로 스크롤 차단 (그리기는 Pointer가 담당)
      const onTouchStart = (e: TouchEvent) => {
        e.preventDefault();
      };
      const onTouchMove = (e: TouchEvent) => {
        e.preventDefault();
      };

      const opts: AddEventListenerOptions = { passive: false };

      canvas.addEventListener('pointerdown', onPointerDown, opts);
      canvas.addEventListener('pointermove', onPointerMove, opts);
      canvas.addEventListener('pointerup', onPointerUp, opts);
      canvas.addEventListener('pointercancel', onPointerCancel, opts);
      canvas.addEventListener('touchstart', onTouchStart, opts);
      canvas.addEventListener('touchmove', onTouchMove, opts);
      // CSS 레벨 터치 제스처 차단 (스크롤·줌 등)
      canvas.style.touchAction = 'none';

      return () => {
        canvas.removeEventListener('pointerdown', onPointerDown, opts);
        canvas.removeEventListener('pointermove', onPointerMove, opts);
        canvas.removeEventListener('pointerup', onPointerUp, opts);
        canvas.removeEventListener('pointercancel', onPointerCancel, opts);
        canvas.removeEventListener('touchstart', onTouchStart, opts);
        canvas.removeEventListener('touchmove', onTouchMove, opts);
      };
    }, [disabled]);

    // 초기 리사이즈 + 창 크기 변경 대응
    useEffect(() => {
      resizeCanvas();
      window.addEventListener('resize', resizeCanvas);
      return () => window.removeEventListener('resize', resizeCanvas);
    }, [resizeCanvas]);

    // disabled가 true로 바뀌면 그리기 중단
    useEffect(() => {
      if (disabled) {
        isDrawingRef.current = false;
        currentStrokeRef.current = [];
      }
    }, [disabled]);

    // ref API 노출
    useImperativeHandle(
      ref,
      () => ({
        getStrokes: () => strokesRef.current.map((s) => [...s]),
        clear: () => {
          strokesRef.current = [];
          currentStrokeRef.current = [];
          isDrawingRef.current = false;
          const canvas = canvasRef.current;
          if (canvas) {
            const ctx = canvas.getContext('2d');
            const rect = canvas.getBoundingClientRect();
            ctx?.clearRect(0, 0, rect.width, rect.height);
          }
        },
        undo: () => {
          if (strokesRef.current.length === 0) return;
          strokesRef.current.pop();
          redrawAll();
        },
        hasStrokes: () => strokesRef.current.length > 0,
      }),
      [redrawAll]
    );

    return (
      <canvas
        ref={canvasRef}
        className={`
          w-full aspect-square mx-auto
          bg-white rounded-2xl border-2 border-gray-200
          shadow-inner touch-none
          ${disabled ? 'opacity-70 cursor-not-allowed' : 'cursor-crosshair'}
          ${className}
        `}
        aria-label="한자 필기 영역"
      />
    );
  }
);

export default HandwritingPad;
