import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { KeyboardControls } from "@react-three/drei";
import { Physics } from "@react-three/rapier";
import World from "./game/World.jsx";
import Player from "./game/Player.jsx";
import HUD from "./ui/HUD.jsx";
import LoadingScreen from "./ui/LoadingScreen.jsx";
import { useGameStore } from "./state/useGameStore.js";
import { InteractionSystem } from "./systems/InteractionSystem.js";
import { AudioSystem } from "./systems/AudioSystem.js";

const keyboardMap = [
  { name: "forward", keys: ["ArrowUp", "KeyW"] },
  { name: "backward", keys: ["ArrowDown", "KeyS"] },
  { name: "left", keys: ["ArrowLeft", "KeyA"] },
  { name: "right", keys: ["ArrowRight", "KeyD"] },
  { name: "jump", keys: ["Space"] },
  { name: "interact", keys: ["KeyE"] },
  { name: "toggleUi", keys: ["KeyH"] }
];

export default function App() {
  const audioReady = useGameStore((state) => state.audioReady);
  const startAudio = useGameStore((state) => state.startAudio);

  return (
    <div style={{ height: "100%", width: "100%" }}>
      {!audioReady && (
        <LoadingScreen
          title="Enter Forest"
          subtitle="A calm, low-poly woodland for quiet exploration."
          buttonLabel="Enter Forest"
          onStart={startAudio}
        />
      )}
      <KeyboardControls map={keyboardMap}>
        <Canvas
          shadows
          camera={{ fov: 55, position: [0, 3.5, 8] }}
          gl={{ antialias: true, powerPreference: "high-performance" }}
        >
          <Suspense fallback={null}>
            <color attach="background" args={["#a2c3d4"]} />
            <fog attach="fog" args={["#a2c3d4", 20, 60]} />
            <ambientLight intensity={0.5} />
            <directionalLight
              castShadow
              position={[12, 16, 8]}
              intensity={1.1}
              shadow-mapSize-width={2048}
              shadow-mapSize-height={2048}
            />
            <Physics gravity={[0, -9.81, 0]}>
              <World />
              <Player />
            </Physics>
            <InteractionSystem />
            <AudioSystem />
          </Suspense>
        </Canvas>
        <HUD />
      </KeyboardControls>
    </div>
  );
}
