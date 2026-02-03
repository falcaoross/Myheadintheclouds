import { useKeyboardControls } from "@react-three/drei";
import { useMemo } from "react";

export const usePlayerControls = () => {
  const [subscribe, get] = useKeyboardControls();

  const current = useMemo(
    () => () => {
      const state = get();
      return {
        forward: state.forward,
        backward: state.backward,
        left: state.left,
        right: state.right,
        jump: state.jump,
        interact: state.interact,
        toggleUi: state.toggleUi,
      };
    },
    [get]
  );

  return { subscribe, get: current };
};
