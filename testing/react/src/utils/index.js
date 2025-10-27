export const formatWalletAddress = (address) => {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

export const getRandomAvatar = () => {
  const styles = [
    "adventurer",
    "avataaars",
    "bottts",
    "fun-emoji",
    "micah",
    "miniavs",
    "pixel-art",
    "personas",
  ];
  const style = styles[Math.floor(Math.random() * styles.length)];
  const seed = Math.random().toString(36).substring(7);
  return `https://api.dicebear.com/7.x/${style}/svg?seed=${seed}`;
};

export const truncateText = (text, maxLength) => {
  if (!text) return "";
  return text.length > maxLength ? text.slice(0, maxLength) + "..." : text;
};
