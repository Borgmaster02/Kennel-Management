export function makeTrainingId() {
  const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, "");
  const suffix = Math.random().toString(36).slice(2, 7);
  return `TR-${timestamp}-${suffix}`;
}
