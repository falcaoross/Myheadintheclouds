import { useEffect } from "react";
import { useGameStore } from "../state/useGameStore.js";

export default function HUD() {
  const interactionText = useGameStore((state) => state.interactionText);
  const showControls = useGameStore((state) => state.showControls);
  const mountedAnimalId = useGameStore((state) => state.mountedAnimalId);
  const animals = useGameStore((state) => state.animals);

  useEffect(() => {
    const root = document.body;
    root.style.cursor = "crosshair";
  }, []);

  const mountName = mountedAnimalId ? animals.get(mountedAnimalId)?.name : null;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        color: "#f5f5f5",
      }}
    >
      {interactionText && (
        <div
          style={{
            position: "absolute",
            bottom: 60,
            width: "100%",
            textAlign: "center",
            fontSize: 18,
            textShadow: "0 2px 6px rgba(0,0,0,0.6)",
          }}
        >
          {interactionText}
        </div>
      )}
      {mountName && (
        <div
          style={{
            position: "absolute",
            top: 20,
            width: "100%",
            textAlign: "center",
            fontSize: 16,
            textShadow: "0 2px 6px rgba(0,0,0,0.6)",
          }}
        >
          Riding: {mountName}
        </div>
      )}
      {showControls && (
        <div
          style={{
            position: "absolute",
            right: 24,
            top: 24,
            background: "rgba(10, 20, 16, 0.7)",
            padding: "12px 14px",
            borderRadius: 12,
            fontSize: 13,
            lineHeight: 1.5,
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Controls</div>
          <div>WASD / Arrows - Move</div>
          <div>Mouse - Look</div>
          <div>Space - Jump</div>
          <div>E - Interact</div>
          <div>F - Dismount</div>
          <div>H - Toggle HUD</div>
        </div>
      )}
    </div>
  );
}
