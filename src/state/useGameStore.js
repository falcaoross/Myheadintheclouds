import { create } from "zustand";

const initialState = {
  audioReady: false,
  showControls: true,
  interactionText: "",
  interactionTarget: null,
  mountedAnimalId: null,
  animals: new Map(),
  playerRef: null,
  audioController: null,
};

export const useGameStore = create((set, get) => ({
  ...initialState,
  startAudio: () => set({ audioReady: true }),
  toggleControls: () => set((state) => ({ showControls: !state.showControls })),
  setInteraction: (text, target) => set({ interactionText: text, interactionTarget: target }),
  clearInteraction: () => set({ interactionText: "", interactionTarget: null }),
  mountAnimal: (animalId) => set({ mountedAnimalId: animalId }),
  dismount: () => set({ mountedAnimalId: null }),
  setPlayerRef: (ref) => set({ playerRef: ref }),
  registerAnimal: (animalId, data) => {
    const animals = new Map(get().animals);
    animals.set(animalId, data);
    set({ animals });
  },
  unregisterAnimal: (animalId) => {
    const animals = new Map(get().animals);
    animals.delete(animalId);
    set({ animals });
  },
  setAudioController: (controller) => set({ audioController: controller }),
}));
