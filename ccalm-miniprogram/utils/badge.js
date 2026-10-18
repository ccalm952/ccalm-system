function badgeText(count) {
  if (!count) return "";
  return count > 99 ? "99+" : String(count);
}

module.exports = {
  badgeText,
};
