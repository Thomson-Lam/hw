// How an idea tag reads in a sentence ("Show fewer history ideas"). Same list as TAG_PHRASE in server/tree.mjs.
const TAG_PHRASE: Record<string, string> = {
  outdoors: "outdoor ideas", night: "nighttime ideas", "hands-on": "hands-on projects", visual: "visual art ideas", history: "history ideas",
  math: "math ideas", social: "ideas with other people", reading: "reading ideas", free: "free ideas", animals: "ideas with animals",
  far: "ideas far from home", food: "food ideas", cheap: "low-cost ideas", quick: "quick ideas", music: "music ideas", online: "online ideas",
  creative: "creative ideas", active: "active ideas",
};
export const tagPhrase = (t: string) => TAG_PHRASE[t] ?? `${t} ideas`;

// Short label for the chips on an idea card ("social" -> "With other people").
const TAG_CHIP: Record<string, string> = {
  outdoors: "Outdoors", night: "At night", "hands-on": "Hands-on", visual: "Visual art", history: "History", math: "Math",
  social: "With other people", reading: "Reading", free: "Free", animals: "Animals", far: "Far from home", food: "Food",
  cheap: "Low cost", quick: "Quick", music: "Music", online: "Online", creative: "Creative", active: "Active",
};
export const tagChip = (t: string) => TAG_CHIP[t] ?? t.charAt(0).toUpperCase() + t.slice(1);
// "About 2 hours", "About 30 min", "About 1 hour".
export const hoursLabel = (h: number) => (h < 1 ? `About ${Math.round(h * 60)} min` : `About ${h} ${h === 1 ? "hour" : "hours"}`);
