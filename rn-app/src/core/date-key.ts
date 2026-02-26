export function getDateKey(date = new Date()) {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

export function parseDateKey(key: string) {
  const parts = key.split("-").map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return null;
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

export function getPrevDateKey(key: string) {
  const date = parseDateKey(key);
  if (!date) return "";
  date.setDate(date.getDate() - 1);
  return getDateKey(date);
}
