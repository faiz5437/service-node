const write = (level, message, context = {}) => {
  const line = { time: new Date().toISOString(), level, message, ...context };
  const output = level === 'error' ? console.error : console.log;
  output(JSON.stringify(line));
};

export const logger = {
  info: (message, context) => write('info', message, context),
  warn: (message, context) => write('warn', message, context),
  error: (message, context) => write('error', message, context),
};
