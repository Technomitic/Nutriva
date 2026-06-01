/**
 * Fresh — Error message sanitizer
 * Strips file paths, stack traces, and internal details from error messages
 * so users never see raw system paths like "C:\Users\hanuk\Desktop\...".
 */

/**
 * Sanitize an error message for display to the user.
 * Removes:
 *  - Windows file paths  (C:\Users\..., D:\projects\...)
 *  - Unix file paths     (/home/user/..., /var/...)
 *  - Stack trace lines   (at Module._compile ...)
 *  - Metro bundler paths (http://localhost:8081/...)
 *  - Long technical noise (keeps only the first meaningful sentence)
 */
export function sanitizeError(raw: string | undefined | null): string {
  if (!raw) return 'Something went wrong';

  let msg = String(raw);

  // Strip Windows paths: C:\... or D:\...
  msg = msg.replace(/[A-Z]:\\[^\s,;)}\]]+/gi, '');

  // Strip Unix-style paths: /home/..., /Users/..., /var/...
  msg = msg.replace(/\/(?:home|Users|var|tmp|usr|app|node_modules|src|dist)[^\s,;)}\]]*/gi, '');

  // Strip Metro bundler / localhost URLs
  msg = msg.replace(/https?:\/\/localhost[^\s,;)}\]]*/gi, '');

  // Strip stack-trace lines (e.g. "at Module._compile ...")
  msg = msg.replace(/\bat\s+[\w$.]+\s*\(.*?\)/g, '');
  msg = msg.replace(/\bat\s+.*?:\d+:\d+/g, '');

  // Strip "in <file>" references
  msg = msg.replace(/\bin\s+[\w./\\]+\.(ts|tsx|js|jsx)/gi, '');

  // Collapse excess whitespace / newlines
  msg = msg.replace(/[\r\n]+/g, ' ').replace(/\s{2,}/g, ' ').trim();

  // If after stripping everything the message is empty, return a generic one
  if (!msg || msg.length < 3) return 'Something went wrong';

  // Cap at a reasonable length for a toast
  if (msg.length > 120) {
    msg = msg.slice(0, 117) + '…';
  }

  return msg;
}
