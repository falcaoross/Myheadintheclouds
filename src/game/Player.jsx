import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { CapsuleCollider, RigidBody, useRapier } from "@react-three/rapier";
import * as THREE from "three";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { useAnimations, useGLTF } from "@react-three/drei";
import { usePlayerControls } from "../systems/Controls.js";
import { useGameStore } from "../state/useGameStore.js";

const SPEED = 4.2;
const JUMP_FORCE = 4.8;
const CAMERA_DISTANCE = 7;
const CAMERA_HEIGHT = 2.2;
const GROUND_RAY_LENGTH = 1.2;
const GROUND_THRESHOLD = 0.25;

useGLTF.setDRACOLoader(() => {
  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath("/draco/");
  return dracoLoader;
});

export default function Player() {
  const rigidBody = useRef(null);
  const modelGroup = useRef(null);
  const { camera, gl } = useThree();
  const { get } = usePlayerControls();
  const { rapier, world } = useRapier();
  const mountedAnimalId = useGameStore((state) => state.mountedAnimalId);
  const animals = useGameStore((state) => state.animals);
  const setPlayerRef = useGameStore((state) => state.setPlayerRef);
  const setPlayerGrounded = useGameStore((state) => state.setPlayerGrounded);
  const { scene, animations } = useGLTF("/models/player.glb");
  const { actions } = useAnimations(animations, modelGroup);

  const yaw = useRef(0);
  const pitch = useRef(0.2);
  const isGrounded = useRef(false);

  const rotation = useMemo(() => new THREE.Quaternion(), []);

  useEffect(() => {
    setPlayerRef(rigidBody);
  }, [setPlayerRef]);

  useEffect(() => {
    // Apply PBR tuning for believable skin + clothing without heavy shaders.
    scene.traverse((child) => {
      if (!child.isMesh || !child.material) return;
      child.castShadow = true;
      child.receiveShadow = true;
      const material = child.material;
      const name = material.name?.toLowerCase() ?? "";
      const isSkin = name.includes("skin") || name.includes("face") || name.includes("body");
      material.metalness = 0;
      material.roughness = isSkin ? 0.52 : 0.75;
      if (material.map) {
        material.map.colorSpace = THREE.SRGBColorSpace;
      }
      material.needsUpdate = true;
    });
  }, [scene]);

  useEffect(() => {
    const onPointerMove = (event) => {
      if (document.pointerLockElement !== gl.domElement) return;
      yaw.current -= event.movementX * 0.002;
      pitch.current -= event.movementY * 0.002;
      pitch.current = Math.max(-0.35, Math.min(0.6, pitch.current));
    };

    const handlePointerLock = () => {
      if (document.pointerLockElement !== gl.domElement) {
        gl.domElement.requestPointerLock();
      }
    };

    gl.domElement.addEventListener("click", handlePointerLock);
    document.addEventListener("mousemove", onPointerMove);

    return () => {
      gl.domElement.removeEventListener("click", handlePointerLock);
      document.removeEventListener("mousemove", onPointerMove);
    };
  }, [gl.domElement]);

  useEffect(() => {
    if (!rigidBody.current) return;
    if (mountedAnimalId) {
      rigidBody.current.setEnabled(false);
    } else {
      rigidBody.current.setEnabled(true);
    }
  }, [mountedAnimalId]);

  const previousGrounded = useRef(false);
  const activeAction = useRef(null);
  const lastLandTime = useRef(0);
  const originalParent = useRef(null);
  const lastMountedId = useRef(null);

  const playAction = (name, fade = 0.2) => {
    if (!actions || !actions[name] || activeAction.current === name) return;
    const next = actions[name];
    next.reset().fadeIn(fade).play();
    if (activeAction.current && actions[activeAction.current]) {
      actions[activeAction.current].fadeOut(fade);
    }
    activeAction.current = name;
  };

  // Prefer semantic clip names when available, otherwise fall back to the first clip.
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
      idle: pickClipName(["idle"]),
      walk: pickClipName(["walk"]),
      run: pickClipName(["run", "sprint"]),
      jump: pickClipName(["jump", "hop"]),
      land: pickClipName(["land"]),
      rideIdle: pickClipName(["ride_idle", "ride"]),
    }),
    [animations]
  );

  useFrame((state, delta) => {
    if (!rigidBody.current) return;

    const mountedAnimal = mountedAnimalId ? animals.get(mountedAnimalId) : null;

    if (mountedAnimal?.mountPoint?.current) {
      if (modelGroup.current && mountedAnimal.mountPoint.current) {
        if (!originalParent.current) {
          originalParent.current = modelGroup.current.parent;
        }
        mountedAnimal.mountPoint.current.add(modelGroup.current);
        modelGroup.current.position.set(0, 0, 0);
        modelGroup.current.rotation.set(0, 0, 0);
      }
      const mountWorld = new THREE.Vector3();
      mountedAnimal.mountPoint.current.getWorldPosition(mountWorld);
      rigidBody.current.setTranslation(
        { x: mountWorld.x, y: mountWorld.y, z: mountWorld.z },
        false
      );
      isGrounded.current = false;
      lastMountedId.current = mountedAnimalId;
    } else if (!mountedAnimalId) {
      const origin = rigidBody.current.translation();
      const ray = new rapier.Ray(origin, { x: 0, y: -1, z: 0 });
      const hit = world.castRay(ray, GROUND_RAY_LENGTH, true);
      isGrounded.current = !!hit && hit.toi <= GROUND_THRESHOLD;

      const { forward, backward, left, right, jump } = get();
      const movement = new THREE.Vector3(
        (left ? -1 : 0) + (right ? 1 : 0),
        0,
        (forward ? -1 : 0) + (backward ? 1 : 0)
      );

      if (movement.lengthSq() > 0) {
        movement.normalize();
        const direction = movement
          .applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw.current)
          .multiplyScalar(SPEED);
        const velocity = rigidBody.current.linvel();
        rigidBody.current.setLinvel(
          { x: direction.x, y: velocity.y, z: direction.z },
          true
        );

        rotation.setFromEuler(new THREE.Euler(0, Math.atan2(direction.x, direction.z), 0));
        if (modelGroup.current) {
          modelGroup.current.quaternion.slerp(rotation, delta * 8);
        }
      } else {
        const velocity = rigidBody.current.linvel();
        rigidBody.current.setLinvel({ x: 0, y: velocity.y, z: 0 }, true);
      }

      if (jump && isGrounded.current) {
        rigidBody.current.applyImpulse({ x: 0, y: JUMP_FORCE, z: 0 }, true);
        isGrounded.current = false;
      }
    }

    if (previousGrounded.current !== isGrounded.current) {
      setPlayerGrounded(isGrounded.current);
    }

    if (!mountedAnimalId && lastMountedId.current) {
      const animal = animals.get(lastMountedId.current);
      if (animal?.rigidBody?.current) {
        const mountPosition = animal.rigidBody.current.translation();
        rigidBody.current.setTranslation(
          { x: mountPosition.x + 1.2, y: mountPosition.y + 0.2, z: mountPosition.z },
          true
        );
      }
      if (modelGroup.current && originalParent.current) {
        originalParent.current.add(modelGroup.current);
      }
      originalParent.current = null;
      lastMountedId.current = null;
    }

    // Animation blending based on speed + grounded state.
    if (actions && clips.idle) {
      const velocity = rigidBody.current.linvel();
      const horizontalSpeed = Math.hypot(velocity.x, velocity.z);
      if (mountedAnimalId && clips.rideIdle) {
        playAction(clips.rideIdle, 0.2);
      } else if (!isGrounded.current && clips.jump) {
        playAction(clips.jump, 0.1);
      } else if (
        isGrounded.current &&
        !previousGrounded.current &&
        clips.land &&
        state.clock.elapsedTime - lastLandTime.current > 0.2
      ) {
        playAction(clips.land, 0.1);
        lastLandTime.current = state.clock.elapsedTime;
      } else if (horizontalSpeed > 2.4 && clips.run) {
        playAction(clips.run, 0.2);
      } else if (horizontalSpeed > 0.4 && clips.walk) {
        playAction(clips.walk, 0.2);
      } else {
        playAction(clips.idle, 0.2);
      }
    }

    previousGrounded.current = isGrounded.current;

    const targetPosition = mountedAnimal?.mountPoint?.current
      ? mountedAnimal.mountPoint.current.getWorldPosition(new THREE.Vector3())
      : new THREE.Vector3(
          rigidBody.current.translation().x,
          rigidBody.current.translation().y,
          rigidBody.current.translation().z
        );

    const cameraDistance = mountedAnimalId ? CAMERA_DISTANCE + 2 : CAMERA_DISTANCE;
    const offset = new THREE.Vector3(
      Math.sin(yaw.current) * cameraDistance,
      CAMERA_HEIGHT + pitch.current * 4,
      Math.cos(yaw.current) * cameraDistance
    );

    const desired = targetPosition.clone().add(offset);
    camera.position.lerp(desired, 1 - Math.pow(0.001, delta));
    camera.lookAt(targetPosition.x, targetPosition.y + 1.2, targetPosition.z);
  });

  return (
    <RigidBody
      ref={rigidBody}
      colliders={false}
      mass={1}
      position={[0, 1.5, 0]}
      enabledRotations={[false, false, false]}
    >
      <CapsuleCollider args={[0.6, 0.4]} />
      <group ref={modelGroup}>
        <primitive object={scene} />
      </group>
    </RigidBody>
  );
}
