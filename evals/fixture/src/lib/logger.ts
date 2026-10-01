type Fields = Record<string, unknown>;

function write(level: 'info' | 'warn' | 'error', message: string, fields: Fields = {}) {
  process.stdout.write(JSON.stringify({ level, message, time: new Date().toISOString(), ...fields }) + '\n');
}

export const logger = {
  info: (message: string, fields?: Fields) => write('info', message, fields),
  warn: (message: string, fields?: Fields) => write('warn', message, fields),
  error: (message: string, fields?: Fields) => write('error', message, fields),
};
