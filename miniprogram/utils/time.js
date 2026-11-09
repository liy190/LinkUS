const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatTime(value) {
  const date = value ? new Date(value) : new Date();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

function pad(value) {
  return String(value).padStart(2, '0');
}

// "14:20" for today, "Nov 9" within this year, "2025/11/9" otherwise.
function formatConversationTime(value) {
  if (!value) return '';
  const date = new Date(value);
  const now = new Date();
  const sameDay = date.getFullYear() === now.getFullYear()
    && date.getMonth() === now.getMonth()
    && date.getDate() === now.getDate();
  if (sameDay) return formatTime(date);
  if (date.getFullYear() === now.getFullYear()) return `${MONTHS[date.getMonth()]} ${date.getDate()}`;
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
}

// "Just now" / "12 min ago" / "3 h ago" / "Nov 9".
function formatRelative(value) {
  if (!value) return '';
  const then = new Date(value).getTime();
  const diff = Date.now() - then;
  if (diff < 60 * 1000) return 'Just now';
  if (diff < 60 * 60 * 1000) return `${Math.floor(diff / 60000)} min ago`;
  if (diff < 24 * 60 * 60 * 1000) return `${Math.floor(diff / 3600000)} h ago`;
  return formatConversationTime(then);
}

// "NOV 9" style divider used at the top of a chat.
function formatChatDate(value) {
  const date = value ? new Date(value) : new Date();
  return `${MONTHS[date.getMonth()]} ${date.getDate()}`.toUpperCase();
}

function formatDayTime(value) {
  if (!value) return '';
  const date = new Date(value);
  return `${formatTime(date)} ${pad(date.getMonth() + 1)}/${pad(date.getDate())}`;
}

module.exports = { formatTime, formatConversationTime, formatRelative, formatChatDate, formatDayTime };
