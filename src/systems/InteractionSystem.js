import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { useKeyboardControls } from "@react-three/drei";
import { useGameStore } from "../state/useGameStore.js";

const MAX_INTERACTION_DISTANCE = 3.2;

export function InteractionSystem() {
  const { camera } = useThree();
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const animals = useGameStore((state) => state.animals);
  const playerRef = useGameStore((state) => state.playerRef);
  const mountedAnimalId = useGameStore((state) => state.mountedAnimalId);
  const setInteraction = useGameStore((state) => state.setInteraction);
  const clearInteraction = useGameStore((state) => state.clearInteraction);
  const toggleControls = useGameStore((state) => state.toggleControls);

  const [subscribe] = useKeyboardControls();

  useEffect(() => {
    const unsubInteract = subscribe(
      (state) => state.interact,
      (pressed) => {
        if (!pressed) return;
        const target = useGameStore.getState().interactionTarget;
        if (target?.onInteract) {
          target.onInteract();
        }
      }
    );

    const unsubToggle = subscribe(
      (state) => state.toggleUi,
      (pressed) => {
        if (pressed) toggleControls();
      }
    );

    return () => {
      unsubInteract();
      unsubToggle();
    };
  }, [subscribe, toggleControls]);

  useFrame(() => {
    if (!playerRef?.current) {
      clearInteraction();
      return;
    }

    if (mountedAnimalId) {
      const mountedAnimal = animals.get(mountedAnimalId);
      if (mountedAnimal) {
        setInteraction("Press E to Dismount", mountedAnimal);
      }
      return;
    }

    const interactables = Array.from(animals.values())
      .map((animal) => animal.interactionMesh)
      .filter(Boolean);

    if (interactables.length === 0) {
      clearInteraction();
      return;
    }

    raycaster.setFromCamera({ x: 0, y: 0 }, camera);
    const intersections = raycaster.intersectObjects(interactables, false);

    if (intersections.length === 0) {
      clearInteraction();
      return;
    }

    const intersection = intersections[0];
    const animal = intersection.object.userData.animalData;
    if (!animal) {
      clearInteraction();
      return;
    }

    const playerPosition = playerRef.current.translation();
    const distance = intersection.point.distanceTo(
      new THREE.Vector3(playerPosition.x, playerPosition.y, playerPosition.z)
    );

    if (distance > MAX_INTERACTION_DISTANCE) {
      clearInteraction();
      return;
    }

    let prompt = "Press E to Pet";
    if (mountedAnimalId === animal.id) {
      prompt = "Press E to Dismount";
    } else if (animal.mountable) {
      prompt = animal.canMount() ? "Press E to Mount" : "Press E to Pet";
    }

    setInteraction(prompt, animal);
  });

  return null;
}
