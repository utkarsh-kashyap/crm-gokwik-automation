import winston from 'winston';
import * as path from 'path';
import * as fs from 'fs';

// Ensure logs directory exists
const logsDir = path.resolve('./logs');
if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });

// ─────────────────────────────────────────────
// Custom Format — pretty console output
// ─────────────────────────────────────────────
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(({ timestamp, level, message, context, ...meta }) => {
    const ctx = context ? `[${context}]` : '';
    const extra = Object.keys(meta).length ? `\n${JSON.stringify(meta, null, 2)}` : '';
    return `${timestamp} ${level} ${ctx} ${message}${extra}`;
  })
);

// ─────────────────────────────────────────────
// File Format — structured JSON for parsing
// ─────────────────────────────────────────────
const fileFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// ─────────────────────────────────────────────
// Logger Instance
// ─────────────────────────────────────────────
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL ?? 'info',
  transports: [
    new winston.transports.Console({ format: consoleFormat }),
    new winston.transports.File({
      filename: path.join(logsDir, 'automation.log'),
      format: fileFormat,
      maxsize: 5 * 1024 * 1024, // 5MB rotation
      maxFiles: 3,
    }),
    new winston.transports.File({
      filename: path.join(logsDir, 'errors.log'),
      level: 'error',
      format: fileFormat,
    }),
  ],
});

// ─────────────────────────────────────────────
// Context-aware child logger factory
// Each page/utility gets its own named logger
// ─────────────────────────────────────────────
export function getLogger(context: string) {
  return logger.child({ context });
}

// ─────────────────────────────────────────────
// Step logger — logs each test action visibly
// ─────────────────────────────────────────────
export function logStep(step: string, detail?: string): void {
  const msg = detail ? `▶ ${step} — ${detail}` : `▶ ${step}`;
  logger.info(msg, { context: 'TestStep' });
}

export default logger;
