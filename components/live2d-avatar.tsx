"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import Script from "next/script";

interface Live2DAvatarProps {
  emotion?: string;
  isTyping?: boolean;
  className?: string;
}

// ✅ 用索引数字（模型不支持字符串名字）
const EMOTION_TO_EXPRESSION: Record<string, number> = {
  happy:     0,  // blush - 脸红
  shy:       0,  // blush - 脸红
  love:      0,  // blush - 脸红
  sad:       6,  // cry - 哭
  crying:    6,  // cry - 哭
  angry:    16,  // squeezed_eyes - 眯眼
  surprised:  7,  // empty_eyes - 空洞眼神
  thinking:   2,  // closed_eyes - 闭眼
  sleepy:    2,  // closed_eyes - 闭眼
  default:   0,  // blush - 脸红
};

// 点击反应表情池（用索引）
const CLICK_REACTIONS = [0, 1, 16, 7];  // blush, chibi, squeezed_eyes, empty_eyes

// 外观切换配置
const APPEARANCE_GROUPS = [
  { name: "服装", key: "clothing", indices: [3, 4, 5] },
  { name: "眼睛", key: "eyes",    indices: [8, 9, 10] },
  { name: "头发", key: "hair",    indices: [11, 12, 13] },
  { name: "帽子", key: "hat",     indices: [14] },
  { name: "角",   key: "horns",   indices: [15] },
  { name: "翅膀", key: "wings",   indices: [17] },
];

const EVT_SPEAK_START = "l2d:speak-start";
const EVT_SPEAK_END   = "l2d:speak-end";

export default function Live2DAvatar({
  emotion = "default",
  isTyping = false,
  className = "",
}: Live2DAvatarProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<any>(null);
  const modelRef = useRef<any>(null);
  const emotionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const mouthTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const blinkTimerRef = useRef<NodeJS.Timeout | null>(null);  // ✅ 眨眼计时器
  const randomEyeTimerRef = useRef<NodeJS.Timeout | null>(null);  // ✅ 随机眼神计时器
  const lastTouchTimeRef = useRef<number>(0);  // ✅ 上次触摸时间

  const [step, setStep] = useState(0);
  const [loadStatus, setLoadStatus] = useState("等待加载...");
  const [ready, setReady] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showAppearance, setShowAppearance] = useState(false);

  // ====== 表情控制（用索引）=======
  const setExpression = useCallback((index: number) => {
    if (!modelRef.current) return;
    try {
      modelRef.current.expression(index);
      console.log(`[L2D] 表情 → [${index}]`);
    } catch (e) {
      console.warn(`[L2D] 表情[${index}] 切换失败:`, e);
    }
  }, []);

  // ====== 口型同步 ======
  const startMouthSync = useCallback(() => {
    if (!modelRef.current) return;
    if (mouthTimerRef.current) clearInterval(mouthTimerRef.current);

    mouthTimerRef.current = setInterval(() => {
      if (!modelRef.current) return;
      try {
        const open = Math.random() * 0.8 + 0.1;
        modelRef.current.internalModel.coreModel.setParameterValueById("ParamMouthOpenY", open);
        modelRef.current.internalModel.coreModel.setParameterValueById("ParamMouthForm", Math.random() * 0.3);
      } catch {}
    }, 80);
  }, []);

  const stopMouthSync = useCallback(() => {
    if (mouthTimerRef.current) {
      clearInterval(mouthTimerRef.current);
      mouthTimerRef.current = null;
    }
    if (modelRef.current) {
      try {
        const closeMouth = () => {
          if (!modelRef.current?.internalModel) return;
          let v = modelRef.current.internalModel.coreModel.getParameterValueById("ParamMouthOpenY") || 0;
          v *= 0.7;
          if (v < 0.02) {
            modelRef.current.internalModel.coreModel.setParameterValueById("ParamMouthOpenY", 0);
            return;
          }
          modelRef.current.internalModel.coreModel.setParameterValueById("ParamMouthOpenY", v);
          requestAnimationFrame(closeMouth);
        };
        closeMouth();
      } catch {}
    }
  }, []);

  // ====== 空闲动画 ======
  const startIdleAnimation = useCallback(() => {
    const tick = () => {
      if (!modelRef.current) return;
      try {
        const t = Date.now() / 1000;
        modelRef.current.internalModel.coreModel.setParameterValueById("ParamBreath", Math.sin(t * 0.5) * 0.03);
        try {
          modelRef.current.internalModel.coreModel.setParameterValueById("ParamBodyAngleX", Math.sin(t * 0.3) * 0.5);
        } catch {}
      } catch {}
      idleTimerRef.current = setTimeout(tick, 100);
    };
    tick();
  }, []);

  // ====== 点击互动 ======
  const handleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log("[L2D] 👆 点击触发!");
    
    if (!modelRef.current) {
      console.warn("[L2D] 模型未加载");
      return;
    }

    const pick = CLICK_REACTIONS[Math.floor(Math.random() * CLICK_REACTIONS.length)];
    setExpression(pick);

    // 3秒后恢复当前情绪表情
    setTimeout(() => {
      const idx = EMOTION_TO_EXPRESSION[emotion] ?? 0;
      setExpression(idx);
    }, 3000);
  }, [emotion, setExpression]);

  // ====== 服装循环切换 ======
  const CLOTHING_INDICES = [3, 4, 5];  // 服装颜色（3种）
  const [clothingIdx, setClothingIdx] = useState(0);  // 当前服装索引

  const handleClothingChange = useCallback(() => {
    const next = (clothingIdx + 1) % CLOTHING_INDICES.length;
    const expressionIdx = CLOTHING_INDICES[next];
    
    setClothingIdx(next);
    setExpression(expressionIdx);
    console.log(`[L2D] 服装切换 → [${expressionIdx}] (${next + 1}/${CLOTHING_INDICES.length})`);
  }, [clothingIdx, setExpression]);

  // ====== 自适应布局 ======
  const fitModel = useCallback(() => {
    if (!appRef.current || !modelRef.current || !containerRef.current) return;
    const w = containerRef.current.clientWidth;
    const h = containerRef.current.clientHeight;
    if (w === 0 || h === 0) return;

    appRef.current.renderer.resize(w, h);

    const mW = modelRef.current.internalModel?.originalWidth || 5500;
    const mH = modelRef.current.internalModel?.originalHeight || 5500;
    const s = Math.min((h * 1.35) / mH, (w * 1.30) / mW);  // ✅ 放大：增加乘数（1.15/1.10 → 1.35/1.30）

    modelRef.current.scale.set(s);
    modelRef.current.anchor.set(0.5, 1.0);  // ✅ 底部锚点（让底部对齐）
    modelRef.current.x = w * 0.72;  // ✅ 恢复原来的位置
    modelRef.current.y = h * 1.45;  // ✅ 往上移 20%：从 1.65 到 1.45
  }, []);

  // ====== 初始化 ======
  useEffect(() => {
    if (step !== 3 || !containerRef.current) return;

    let mounted = true;
    const timer = setTimeout(async () => {
      try {
        const { PIXI } = window as any;
        if (!PIXI?.live2d?.Live2DModel) {
          setLoadStatus("❌ 插件未注册");
          return;
        }

        setLoadStatus("创建画布...");
        const cw = containerRef.current!.clientWidth || 340;
        const ch = containerRef.current!.clientHeight || 600;

        const app = new PIXI.Application({
          width: cw, height: ch,
          transparent: true,
          antialias: true,
          autoDensity: true,
          resolution: window.devicePixelRatio || 1,
        });

        if (!mounted) { app.destroy(true); return; }

        containerRef.current!.appendChild(app.view as HTMLCanvasElement);
        
        // ✅ 关键：让 canvas 不拦截点击
        const canvas = app.view as HTMLCanvasElement;
        canvas.style.pointerEvents = "none";
        canvas.style.position = "absolute";
        canvas.style.top = "0";
        canvas.style.left = "0";
        canvas.style.width = "100%";
        canvas.style.height = "100%";

        appRef.current = app;

        setLoadStatus("加载模型...");
        const t0 = Date.now();

        const model = await PIXI.live2d.Live2DModel.from("/live2d/yena/yena_model3.json");
        if (!mounted) { app.destroy(true); return; }

        model.anchor.set(0.5, 0.5);
        app.stage.addChild(model);
        modelRef.current = model;

        fitModel();

        // ResizeObserver
        const ro = new ResizeObserver(fitModel);
        ro.observe(containerRef.current!);
        (containerRef.current as any)._ro = ro;

        window.addEventListener("resize", fitModel);
        (containerRef.current as any)._onResize = fitModel;

        // 眼神跟随
        const onMove = (e: MouseEvent) => {
          if (!model || !containerRef.current) return;
          const rect = containerRef.current.getBoundingClientRect();
          try {
            model.internalModel.coreModel.setParameterValueById("ParamEyeBallX", (e.clientX - rect.left) / rect.width - 0.5);
            model.internalModel.coreModel.setParameterValueById("ParamEyeBallY", (e.clientY - rect.top) / rect.height - 0.5);
          } catch {}
        };
        containerRef.current.addEventListener("mousemove", onMove);
        (containerRef.current as any)._eyeTrack = onMove;

        // ✅ 初始表情
        try { model.expression(0); } catch {}

        startIdleAnimation();
        setLoadStatus("");
        setReady(true);
        console.log(`[L2D] ✅ 完成! ${Math.round((Date.now()-t0)/1000)}s`);

        // ✅ 自动眨眼（A）
        const startBlinking = () => {
          const blink = () => {
            if (!modelRef.current) return;
            try {
              // 闭眼
              modelRef.current.internalModel.coreModel.setParameterValueById("ParamEyeOpenL", 0);
              modelRef.current.internalModel.coreModel.setParameterValueById("ParamEyeOpenR", 0);
              // 150ms 后睁眼
              setTimeout(() => {
                if (!modelRef.current) return;
                try {
                  modelRef.current.internalModel.coreModel.setParameterValueById("ParamEyeOpenL", 1);
                  modelRef.current.internalModel.coreModel.setParameterValueById("ParamEyeOpenR", 1);
                } catch {}
              }, 150);
            } catch {}
            // 3-5 秒后再次眨眼
            const nextBlink = 3000 + Math.random() * 2000;
            blinkTimerRef.current = setTimeout(blink, nextBlink);
          };
          blink();
        };
        startBlinking();

        // ✅ 方案 4：触摸跟随 + 随机眼神（手机端）
        const onTouchMove = (e: TouchEvent) => {
          if (!modelRef.current || !containerRef.current) return;
          lastTouchTimeRef.current = Date.now();
          const touch = e.touches[0];
          const rect = containerRef.current.getBoundingClientRect();
          try {
            modelRef.current.internalModel.coreModel.setParameterValueById("ParamEyeBallX", (touch.clientX - rect.left) / rect.width - 0.5);
            modelRef.current.internalModel.coreModel.setParameterValueById("ParamEyeBallY", (touch.clientY - rect.top) / rect.height - 0.5);
          } catch {}
        };
        const onTouchEnd = () => {
          lastTouchTimeRef.current = Date.now();
        };
        containerRef.current.addEventListener("touchmove", onTouchMove, { passive: true });
        containerRef.current.addEventListener("touchend", onTouchEnd, { passive: true });
        (containerRef.current as any)._touchFollow = onTouchMove;
        (containerRef.current as any)._touchEnd = onTouchEnd;

        // ✅ 随机眼神（5 秒没触摸，随机变化）
        const startRandomEye = () => {
          const randomEye = () => {
            if (!modelRef.current) return;
            const timeSinceTouch = Date.now() - lastTouchTimeRef.current;
            if (timeSinceTouch > 5000) {  // 5 秒没触摸，随机眼神
              try {
                const randomX = (Math.random() - 0.5) * 0.5;  // -0.25 到 0.25
                const randomY = (Math.random() - 0.5) * 0.3;  // -0.15 到 0.15
                modelRef.current.internalModel.coreModel.setParameterValueById("ParamEyeBallX", randomX);
                modelRef.current.internalModel.coreModel.setParameterValueById("ParamEyeBallY", randomY);
              } catch {}
            }
            randomEyeTimerRef.current = setTimeout(randomEye, 3000);  // 每 3 秒检查一次
          };
          randomEye();
        };
        startRandomEye();

      } catch (err) {
        console.error("[L2D] ❌ 失败:", err);
        setLoadStatus("❌ 加载失败");
      }
    }, 80);

    return () => {
      mounted = false;
      clearTimeout(timer);
      if (appRef.current) { try { appRef.current.destroy(true, { children: true }); } catch {} appRef.current = null; }
      if ((containerRef.current as any)?._ro) { (containerRef.current as any)._ro.disconnect(); }
      if ((containerRef.current as any)?._onResize) { window.removeEventListener("resize", (containerRef.current as any)._onResize); }
      if ((containerRef.current as any)?._eyeTrack) { containerRef.current.removeEventListener("mousemove", (containerRef.current as any)._eyeTrack); }
      if ((containerRef.current as any)?._touchFollow) { containerRef.current.removeEventListener("touchmove", (containerRef.current as any)._touchFollow); }
      if ((containerRef.current as any)?._touchEnd) { containerRef.current.removeEventListener("touchend", (containerRef.current as any)._touchEnd); }
      if (emotionTimerRef.current) clearTimeout(emotionTimerRef.current);
      if (mouthTimerRef.current) clearInterval(mouthTimerRef.current);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (blinkTimerRef.current) clearTimeout(blinkTimerRef.current);  // ✅ 清理眨眼计时器
      if (randomEyeTimerRef.current) clearTimeout(randomEyeTimerRef.current);  // ✅ 清理随机眼神计时器
    };
  }, [step, fitModel, startIdleAnimation]);

  // ====== 情绪变化 ======
  useEffect(() => {
    const idx = EMOTION_TO_EXPRESSION[emotion] ?? 0;
    if (emotionTimerRef.current) clearTimeout(emotionTimerRef.current);
    emotionTimerRef.current = setTimeout(() => setExpression(idx), 300);
    return () => { if (emotionTimerRef.current) clearTimeout(emotionTimerRef.current); };
  }, [emotion, setExpression]);

  // ====== 全局事件：口型同步 ======
  useEffect(() => {
    const onStart = () => { setIsSpeaking(true); };
    const onEnd   = () => { setIsSpeaking(false); };

    window.addEventListener(EVT_SPEAK_START, onStart);
    window.addEventListener(EVT_SPEAK_END, onEnd);

    return () => {
      window.removeEventListener(EVT_SPEAK_START, onStart);
      window.removeEventListener(EVT_SPEAK_END, onEnd);
    };
  }, []);

  useEffect(() => {
    if (isSpeaking && ready) {
      startMouthSync();
    } else {
      stopMouthSync();
    }
    return () => stopMouthSync();
  }, [isSpeaking, ready, startMouthSync, stopMouthSync]);

  // 导出触发函数到全局
  useEffect(() => {
    (window as any).__l2dSpeakStart = () => window.dispatchEvent(new CustomEvent(EVT_SPEAK_START));
    (window as any).__l2dSpeakEnd   = () => window.dispatchEvent(new CustomEvent(EVT_SPEAK_END));
  }, []);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        width: "100%",
        height: "100%",
        minHeight: "350px",
        position: "relative",
      }}
    >
      {/* ✅ 点击 overlay - 只覆盖模型区域（不挡住左边） */}
      <div
        onClick={handleClick}
        className="click-overlay"
        style={{
          position: "absolute",
          width: "60%",   // ✅ 只覆盖右侧 60% 区域（模型在那里）
          height: "100%",
          right: 0,            // ✅ 靠右
          top: 0,
          zIndex: 30,
          cursor: "pointer",
          pointerEvents: "auto",
        }}
        title="点击我互动！"
      />

      {/* ✅ 换装按钮 - 右下角，半透明，确保可点击 */}
      <button
        onClick={(e) => { e.stopPropagation(); handleClothingChange(); }}
        style={{
          position: "absolute",
          bottom: "10px",
          right: "10px",
          zIndex: 40,
          padding: "8px 16px",
          background: "rgba(244, 114, 182, 0.5)",  // ✅ 半透明 50%
          color: "white",
          border: "1px solid rgba(244, 114, 182, 0.6)",
          borderRadius: "20px",
          cursor: "pointer",
          fontSize: "14px",
          fontWeight: "bold",
          pointerEvents: "auto",  // ✅ 确保可点击
        }}
        title="点击切换服装"
      >
        🎨 换装
      </button>

      <Script src="/live2d/live2dcubismcore.min.js" strategy="lazyOnload"
        onLoad={() => { console.log("[L2D-1] ✅ Core"); setStep(1); }} />
      {step >= 1 && (
        <Script src="/live2d/pixi.min.js" strategy="lazyOnload"
          onLoad={() => { console.log("[L2D-2] ✅ PIXI"); setStep(2); }} />
      )}
      {step >= 2 && (
        <Script src="/live2d/cubism4-display.js" strategy="lazyOnload"
          onLoad={() => { console.log("[L2D-3] ✅ Display"); setStep(3); }} />
      )}

      {!ready && (
        <div style={{
          position: "absolute", inset: 0, zIndex: 10, pointerEvents: "none",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "#f472b6", fontSize: "14px",
        }}>{loadStatus}</div>
      )}
    </div>
  );
}
