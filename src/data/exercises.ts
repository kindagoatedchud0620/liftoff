import type { Exercise } from "@/lib/types";

// elite = e1RM/bodyweight ratio that scores 1000 (male, 180 lb reference). Dumbbell moves are per hand.
export const EXERCISES: Exercise[] = [
  // Legs
  { id: "back-squat", name: "Back Squat", equipment: "barbell", primary: ["quads", "glutes"], secondary: ["hamstrings", "abs"], pattern: "squat", elite: 3.0 },
  { id: "front-squat", name: "Front Squat", equipment: "barbell", primary: ["quads"], secondary: ["glutes", "abs"], pattern: "squat", elite: 2.5 },
  { id: "hack-squat", name: "Hack Squat", equipment: "machine", primary: ["quads"], secondary: ["glutes"], pattern: "squat", elite: 4.0 },
  { id: "leg-press", name: "Leg Press", equipment: "machine", primary: ["quads", "glutes"], secondary: ["hamstrings"], pattern: "squat", elite: 6.0 },
  { id: "bulgarian-split-squat", name: "Bulgarian Split Squat", equipment: "dumbbell", primary: ["quads", "glutes"], secondary: ["hamstrings"], pattern: "squat", elite: 0.8 },
  { id: "goblet-squat", name: "Goblet Squat", equipment: "dumbbell", primary: ["quads"], secondary: ["glutes", "abs"], pattern: "squat", elite: 1.0 },
  { id: "leg-extension", name: "Leg Extension", equipment: "machine", primary: ["quads"], secondary: [], pattern: "accessory", elite: 1.8 },
  { id: "deadlift", name: "Deadlift", equipment: "barbell", primary: ["hamstrings", "glutes", "lats"], secondary: ["traps", "forearms", "quads"], pattern: "hinge", elite: 3.5 },
  { id: "sumo-deadlift", name: "Sumo Deadlift", equipment: "barbell", primary: ["glutes", "quads"], secondary: ["hamstrings", "traps"], pattern: "hinge", elite: 3.5 },
  { id: "romanian-deadlift", name: "Romanian Deadlift", equipment: "barbell", primary: ["hamstrings", "glutes"], secondary: ["lats", "forearms"], pattern: "hinge", elite: 2.8 },
  { id: "hip-thrust", name: "Hip Thrust", equipment: "barbell", primary: ["glutes"], secondary: ["hamstrings"], pattern: "hinge", elite: 3.5 },
  { id: "leg-curl", name: "Lying Leg Curl", equipment: "machine", primary: ["hamstrings"], secondary: ["calves"], pattern: "accessory", elite: 1.4 },
  { id: "standing-calf-raise", name: "Standing Calf Raise", equipment: "machine", primary: ["calves"], secondary: [], pattern: "accessory", elite: 3.0 },
  { id: "seated-calf-raise", name: "Seated Calf Raise", equipment: "machine", primary: ["calves"], secondary: [], pattern: "accessory", elite: 2.2 },
  // Push
  { id: "bench-press", name: "Bench Press", equipment: "barbell", primary: ["chest"], secondary: ["triceps", "frontDelts"], pattern: "horizontalPush", elite: 2.25 },
  { id: "incline-bench-press", name: "Incline Bench Press", equipment: "barbell", primary: ["chest", "frontDelts"], secondary: ["triceps"], pattern: "horizontalPush", elite: 1.9 },
  { id: "db-bench-press", name: "Dumbbell Bench Press", equipment: "dumbbell", primary: ["chest"], secondary: ["triceps", "frontDelts"], pattern: "horizontalPush", elite: 0.9 },
  { id: "close-grip-bench", name: "Close-Grip Bench Press", equipment: "barbell", primary: ["triceps", "chest"], secondary: ["frontDelts"], pattern: "horizontalPush", elite: 1.9 },
  { id: "cable-fly", name: "Cable Fly", equipment: "cable", primary: ["chest"], secondary: ["frontDelts"], pattern: "accessory", elite: 0.6 },
  { id: "dip", name: "Dip", equipment: "bodyweight", primary: ["chest", "triceps"], secondary: ["frontDelts"], pattern: "horizontalPush", elite: 2.1, bwFactor: 1 },
  { id: "push-up", name: "Push-Up", equipment: "bodyweight", primary: ["chest"], secondary: ["triceps", "frontDelts", "abs"], pattern: "horizontalPush", elite: 1.6, bwFactor: 0.65 },
  { id: "overhead-press", name: "Overhead Press", equipment: "barbell", primary: ["frontDelts"], secondary: ["triceps", "traps"], pattern: "verticalPush", elite: 1.4 },
  { id: "db-shoulder-press", name: "Dumbbell Shoulder Press", equipment: "dumbbell", primary: ["frontDelts"], secondary: ["triceps"], pattern: "verticalPush", elite: 0.6 },
  { id: "lateral-raise", name: "Lateral Raise", equipment: "dumbbell", primary: ["frontDelts"], secondary: ["traps"], pattern: "accessory", elite: 0.35 },
  { id: "skull-crusher", name: "Skull Crusher", equipment: "barbell", primary: ["triceps"], secondary: [], pattern: "arms", elite: 0.9 },
  { id: "tricep-pushdown", name: "Tricep Pushdown", equipment: "cable", primary: ["triceps"], secondary: [], pattern: "arms", elite: 1.0 },
  // Pull
  { id: "pull-up", name: "Pull-Up", equipment: "bodyweight", primary: ["lats"], secondary: ["biceps", "rearDelts", "forearms"], pattern: "verticalPull", elite: 1.9, bwFactor: 1 },
  { id: "chin-up", name: "Chin-Up", equipment: "bodyweight", primary: ["lats", "biceps"], secondary: ["forearms"], pattern: "verticalPull", elite: 2.0, bwFactor: 1 },
  { id: "lat-pulldown", name: "Lat Pulldown", equipment: "cable", primary: ["lats"], secondary: ["biceps", "rearDelts"], pattern: "verticalPull", elite: 1.5 },
  { id: "barbell-row", name: "Barbell Row", equipment: "barbell", primary: ["lats", "traps"], secondary: ["rearDelts", "biceps"], pattern: "horizontalPull", elite: 2.0 },
  { id: "t-bar-row", name: "T-Bar Row", equipment: "machine", primary: ["lats", "traps"], secondary: ["rearDelts", "biceps"], pattern: "horizontalPull", elite: 2.0 },
  { id: "seated-cable-row", name: "Seated Cable Row", equipment: "cable", primary: ["lats"], secondary: ["traps", "biceps", "rearDelts"], pattern: "horizontalPull", elite: 1.6 },
  { id: "face-pull", name: "Face Pull", equipment: "cable", primary: ["rearDelts"], secondary: ["traps"], pattern: "accessory", elite: 0.8 },
  { id: "rear-delt-fly", name: "Rear Delt Fly", equipment: "dumbbell", primary: ["rearDelts"], secondary: ["traps"], pattern: "accessory", elite: 0.3 },
  { id: "barbell-shrug", name: "Barbell Shrug", equipment: "barbell", primary: ["traps"], secondary: ["forearms"], pattern: "accessory", elite: 3.0 },
  { id: "barbell-curl", name: "Barbell Curl", equipment: "barbell", primary: ["biceps"], secondary: ["forearms"], pattern: "arms", elite: 1.0 },
  { id: "db-curl", name: "Dumbbell Curl", equipment: "dumbbell", primary: ["biceps"], secondary: ["forearms"], pattern: "arms", elite: 0.5 },
  { id: "hammer-curl", name: "Hammer Curl", equipment: "dumbbell", primary: ["biceps", "forearms"], secondary: [], pattern: "arms", elite: 0.55 },
  { id: "wrist-curl", name: "Wrist Curl", equipment: "barbell", primary: ["forearms"], secondary: [], pattern: "arms", elite: 0.7 },
  { id: "farmer-carry", name: "Farmer Carry", equipment: "dumbbell", primary: ["forearms", "traps"], secondary: ["abs"], pattern: "accessory", elite: 1.25 },
  // Core
  { id: "cable-crunch", name: "Cable Crunch", equipment: "cable", primary: ["abs"], secondary: [], pattern: "core", elite: 1.4 },
  { id: "hanging-leg-raise", name: "Hanging Leg Raise", equipment: "bodyweight", primary: ["abs"], secondary: ["forearms"], pattern: "core", elite: 0.75, bwFactor: 0.4 },
  { id: "ab-wheel", name: "Ab Wheel Rollout", equipment: "bodyweight", primary: ["abs"], secondary: ["lats"], pattern: "core", elite: 0.85, bwFactor: 0.5 },
];

export const EXERCISE_MAP: Record<string, Exercise> = Object.fromEntries(EXERCISES.map((e) => [e.id, e]));
