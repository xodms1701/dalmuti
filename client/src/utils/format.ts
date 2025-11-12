/**
 * 날짜를 "YYYY.MM.DD HH:mm" 형식으로 포맷팅합니다.
 */
export const formatDate = (date: Date): string => {
  const d = new Date(date);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

/**
 * 시간을 "HH:mm:ss" 형식으로 포맷팅합니다.
 */
export const formatTime = (date: Date): string => {
  const d = new Date(date);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
};

/**
 * 순위에 맞는 메달 이모지와 등수를 반환합니다.
 */
export const getRankLabel = (rank: number, includeText: boolean = false): string => {
  if (rank === 1) return includeText ? "🥇 1등" : "🥇";
  if (rank === 2) return includeText ? "🥈 2등" : "🥈";
  if (rank === 3) return includeText ? "🥉 3등" : "🥉";
  return `${rank}등`;
};
