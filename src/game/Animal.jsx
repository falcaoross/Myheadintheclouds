import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { RigidBody } from "@react-three/rapier";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { useAnimations, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { SkeletonUtils } from "three-stdlib";
import { useGameStore } from "../state/useGameStore.js";
import { usePlayerControls } from "../systems/Controls.js";

const WANDER_RADIUS = 12;
const WANDER_SPEED = 0.7;
const MOUNT_SPEED = 2.0;

useGLTF.setDRACOLoader(() => {
  const dracoLoader = new DRACOLoader();
  // Draco decoder path expected under public/draco; keeps GLB payloads tiny.
  dracoLoader.setDecoderPath("/draco/");
  return dracoLoader;
});

function seededRandom(seed) {
  return Math.sin(seed) * 10000 - Math.floor(Math.sin(seed) * 10000);
}

export default function Animal({ id, url, position, mountable = false, name = "Animal" }) {
  const rigidBody = useRef(null);
  const group = useRef(null);
  const interactionMesh = useRef(null);
  const mountPoint = useRef(null);
  const petPulse = useRef(0);
  const lastPetTime = useRef(0);
  const lastInteractTime = useRef(0);
  const activeAction = useRef(null);
  const waypoint = useRef(new THREE.Vector3(position[0], position[1], position[2]));
  const basePosition = useMemo(() => new THREE.Vector3(...position), [position]);

  const { get } = usePlayerControls();
  const mountedAnimalId = useGameStore((state) => state.mountedAnimalId);
  const mountAnimal = useGameStore((state) => state.mountAnimal);
  const dismount = useGameStore((state) => state.dismount);
  const registerAnimal = useGameStore((state) => state.registerAnimal);
  const unregisterAnimal = useGameStore((state) => state.unregisterAnimal);
  const audioController = useGameStore((state) => state.audioController);
  const { scene, animations } = useGLTF(url);
  const clonedScene = useMemo(() => SkeletonUtils.clone(scene), [scene]);
  const { actions } = useAnimations(animations, group);
  const tint = useMemo(() => {
    const base = new THREE.Color(0xffffff);
    const hueShift = (id.charCodeAt(0) % 12) / 120;
    return base.offsetHSL(hueShift, 0, 0);
  }, [id]);

  // Map animation clips by keywords so realistic models can supply their own names.
  const pickClipName = (candidates) => {
    if (!animations?.length) return null;
    const lower = animations.map((clip) => clip.name.toLowerCase());
    const matchIndex = lower.findIndex((name) =>
      candidates.some((candidate) => name.includes(candidate))
    );
    return matchIndex >= 0 ? animations[matchIndex].name : animations[0]?.name;
  };

  const clips = useMemo(
    () => ({
      idle: pickClipName(["idle", "breath"]),
      walk: pickClipName(["walk"]),
      interact: pickClipName(["interact", "head", "tail"]),
    }),
    [animations]
  );

  const playAction = (name, fade = 0.2) => {
    if (!actions || !actions[name] || activeAction.current === name) return;
    const next = actions[name];
    next.reset().fadeIn(fade).play();
    if (activeAction.current && actions[activeAction.current]) {
      actions[activeAction.current].fadeOut(fade);
    }
    activeAction.current = name;
  };

  const canMount = () => mountable && Date.now() - lastPetTime.current < 5000;

  useEffect(() => {
    // Tune materials for realistic fur/skin without expensive shaders.
    clonedScene.traverse((child) => {
      if (!child.isMesh || !child.material) return;
      child.castShadow = true;
      child.receiveShadow = true;
      const material = child.material;
      material.metalness = 0;
      material.roughness = 0.7;
      if (material.color) {
        material.color.lerp(tint, 0.08);
      }
      if (material.map) {
        material.map.colorSpace = THREE.SRGBColorSpace;
      }
      material.needsUpdate = true;
    });
  }, [clonedScene]);

  useEffect(() => {
    const data = {
      id,
      name,
      mountable,
      canMount,
      interactionMesh: interactionMesh.current,
      mountPoint,
      onInteract: () => {
        if (mountedAnimalId === id) {
          dismount();
          return;
        }

        if (mountable && canMount()) {
          mountAnimal(id);
          return;
        }

        lastPetTime.current = Date.now();
        lastInteractTime.current = Date.now();
        petPulse.current = 1;
        if (audioController) {
          audioController.playOneShot("/audio/animal-chirp.mp3", 0.8);
        }
        if (clips.interact && actions?.[clips.interact]) {
          const action = actions[clips.interact];
          action.reset();
          action.setLoop(THREE.LoopOnce, 1);
          action.clampWhenFinished = true;
          action.fadeIn(0.1).play();
          activeAction.current = clips.interact;
        }
      },
    };

    if (interactionMesh.current) {
      interactionMesh.current.userData.animalData = data;
    }

    registerAnimal(id, data);
    return () => unregisterAnimal(id);
  }, [
    id,
    name,
    mountable,
    mountedAnimalId,
    registerAnimal,
    unregisterAnimal,
    mountAnimal,
    dismount,
    audioController,
  ]);

  useFrame((state, delta) => {
    if (!rigidBody.current) return;

    const isMounted = mountedAnimalId === id;
    const target = waypoint.current;

    let horizontalSpeed = 0;
    if (!isMounted) {
      const current = rigidBody.current.translation();
      const currentPosition = new THREE.Vector3(current.x, current.y, current.z);
      const distance = currentPosition.distanceTo(target);

      if (distance < 0.6) {
        const seed = state.clock.elapsedTime * 0.37 + id.length;
        const offsetX = (seededRandom(seed) - 0.5) * WANDER_RADIUS;
        const offsetZ = (seededRandom(seed + 1.3) - 0.5) * WANDER_RADIUS;
        target.set(basePosition.x + offsetX, basePosition.y, basePosition.z + offsetZ);
      }

      const direction = target.clone().sub(currentPosition).normalize();
      const next = currentPosition.clone().add(direction.multiplyScalar(WANDER_SPEED * delta));
      rigidBody.current.setNextKinematicTranslation({ x: next.x, y: next.y, z: next.z });
      horizontalSpeed = direction.length();
      const angle = Math.atan2(direction.x, direction.z);
      const rotation = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, angle, 0));
      rigidBody.current.setNextKinematicRotation(rotation);
    } else {
      const { forward, backward, left, right } = get();
      const movement = new THREE.Vector3(
        (left ? -1 : 0) + (right ? 1 : 0),
        0,
        (forward ? -1 : 0) + (backward ? 1 : 0)
      );
      if (movement.lengthSq() > 0) {
        movement.normalize();
        const current = rigidBody.current.translation();
        const next = new THREE.Vector3(current.x, current.y, current.z).add(
          movement.multiplyScalar(MOUNT_SPEED * delta)
        );
        rigidBody.current.setNextKinematicTranslation({ x: next.x, y: next.y, z: next.z });
        horizontalSpeed = movement.length();
        const angle = Math.atan2(movement.x, movement.z);
        const rotation = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, angle, 0));
        rigidBody.current.setNextKinematicRotation(rotation);
      }
    }

    if (actions && clips.idle) {
      const isInteracting = Date.now() - lastInteractTime.current < 1200;
      if (isInteracting && clips.interact) {
        playAction(clips.interact, 0.1);
      } else if (horizontalSpeed > 0.1 && clips.walk) {
        playAction(clips.walk, 0.2);
      } else {
        playAction(clips.idle, 0.2);
      }
    }

    if (petPulse.current > 0 && group.current) {
      const pulse = petPulse.current;
      const scale = 1 + pulse * 0.08;
      group.current.scale.set(scale, scale, scale);
      petPulse.current = Math.max(0, pulse - delta * 2.4);
      if (petPulse.current === 0) {
        group.current.scale.set(1, 1, 1);
      }
    }
  });

  return (
    <RigidBody ref={rigidBody} type="kinematicPosition" colliders="hull">
      <group ref={group} position={position}>
        <primitive object={clonedScene} />
        <group ref={mountPoint} position={[0, 1.4, 0.4]} />
        <mesh ref={interactionMesh} position={[0, 0.8, 0]}>
          <sphereGeometry args={[1.4, 16, 16]} />
          <meshStandardMaterial color="#ffffff" transparent opacity={0} />
        </mesh>
      </group>
    </RigidBody>
  );
}
