function formatTime(value) {
  const date = value ? new Date(value) : new Date();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

module.exports = { formatTime };
