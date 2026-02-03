import { Suspense } from "react";
import * as THREE from "three";
import { Canvas } from "@react-three/fiber";
import { KeyboardControls, SoftShadows } from "@react-three/drei";
import { Physics } from "@react-three/rapier";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
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
          onCreated={({ gl }) => {
            gl.physicallyCorrectLights = true;
            gl.outputColorSpace = THREE.SRGBColorSpace;
            gl.toneMapping = THREE.ACESFilmicToneMapping;
            gl.toneMappingExposure = 1.0;
          }}
        >
          <SoftShadows size={20} samples={16} focus={0.6} />
          <Suspense fallback={null}>
            <color attach="background" args={["#b7d0de"]} />
            <fogExp2 attach="fog" args={["#b7d0de", 0.02]} />
            <Physics gravity={[0, -9.81, 0]}>
              <World />
              <Player />
            </Physics>
            <InteractionSystem />
            <AudioSystem />
            <EffectComposer>
              <Bloom intensity={0.15} luminanceThreshold={0.7} mipmapBlur />
              <Vignette eskil={false} offset={0.2} darkness={0.35} />
            </EffectComposer>
          </Suspense>
        </Canvas>
        <HUD />
      </KeyboardControls>
    </div>
  );
}
