// Attendance math. Integer arithmetic on percentages so 75% boundaries are exact.
export const TARGET = 75;

export const percent = (attended, held) =>
  held ? Math.round((1000 * attended) / held) / 10 : null;

// Smallest x such that (attended + x) / (held + x) >= target%
export const classesNeeded = (attended, held, target = TARGET) =>
  Math.max(0, Math.ceil((target * held - 100 * attended) / (100 - target)));

// Largest y such that attended / (held + y) >= target%
export const classesCanSkip = (attended, held, target = TARGET) =>
  Math.max(0, Math.floor((100 * attended - target * held) / target));
