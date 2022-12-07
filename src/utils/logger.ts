import { Logger, format, transports, createLogger } from 'winston';
import path from 'path';
import ecsFormat from '@elastic/ecs-winston-format';
import LokiTransport from 'winston-loki';
import {
  LOG_LEVEL,
  LOG_FILE,
  NODE_ENV,
  APP_NAME,
  GRAFANA_URL,
} from '../config';

export class LoggerFactory {
  private static isConfigured = false;
  private static parsePathToScope(filepath: string): string {
    if (filepath.indexOf(path.sep) >= 0) {
      filepath = filepath.replace(process.cwd(), '');
      filepath = filepath.replace(`${path.sep}src${path.sep}`, '');
      filepath = filepath.replace(`${path.sep}dist${path.sep}`, '');
      filepath = filepath.replace('.ts', '');
      filepath = filepath.replace('.js', '');
      filepath = filepath.replace(path.sep, ':');
    }
    return filepath;
  }
  public static createLogger(
    scope: string,
    customLabels?: object // @todo Provide correct typing
  ): Logger {
    const journalLog = new transports.File({
      filename: LOG_FILE,
      level: LOG_LEVEL,
    });
    const consoleLog = new transports.Console({
      level: LOG_LEVEL,
      handleExceptions: true,
      format:
        NODE_ENV !== 'development'
          ? format.combine(format.json())
          : format.combine(format.colorize(), format.simple()),
    });

    let lokiLog: LokiTransport | undefined;

    if (GRAFANA_URL) {
      lokiLog = new LokiTransport({
        level: 'debug', // default level?
        host: GRAFANA_URL,
        json: true,
        labels: {
          scope: LoggerFactory.parsePathToScope(scope),
          app: APP_NAME,
          environment: NODE_ENV,
          ...customLabels,
        },
      });
    }

    const options = {
      format: ecsFormat(),
      transports: [journalLog, consoleLog, ...(lokiLog ? [lokiLog] : [])],
    };
    LoggerFactory.isConfigured = true;
    const logger = createLogger(options);
    return logger;
  }
}

export const logger = (filename: string, customLabels?: object) =>
  LoggerFactory.createLogger(filename, customLabels);
