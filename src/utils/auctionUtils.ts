// Countdown formatter helper
export const formatCountdown = (
  targetDate: string,
  now: Date
): { text: string; isUrgent: boolean; isExpired: boolean } => {
  const target = new Date(targetDate).getTime();
  const diff = target - now.getTime();

  if (diff <= 0) {
    return { text: "Ended", isUrgent: false, isExpired: true };
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);

  const isUrgent = diff < 1000 * 60 * 60 * 2; // less than 2 hours

  if (days > 0) {
    return { text: `${days}d ${hours}h ${minutes}m`, isUrgent: false, isExpired: false };
  }
  if (hours > 0) {
    return { text: `${hours}h ${minutes}m ${seconds}s`, isUrgent, isExpired: false };
  }
  return { text: `${minutes}m ${seconds}s`, isUrgent: true, isExpired: false };
};
