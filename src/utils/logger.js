function log(level, consoleMethod, ...args) {
  const ts = new Date().toISOString();
  // eslint-disable-next-line no-console
  console[consoleMethod](`[${ts}] [${level}]`, ...args);
}

module.exports = {
  info:  (...args) => log('info',  'log',   ...args),
  warn:  (...args) => log('warn',  'warn',  ...args),
  error: (...args) => log('error', 'error', ...args),
};
