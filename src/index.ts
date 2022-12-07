import 'reflect-metadata';
// import { IncomingMessage } from 'http';
import { Container } from 'typedi';
import { Server } from './server';
import { cache } from './utils/cache';
import { logger } from './utils/logger';

const log = logger(__filename);

process.once('unhandledRejection', async (error) => {
  console.log(error);
  process.exit(1);
});

const main = async (): Promise<void> => {
  const server = Container.get<Server>(Server);
  const httpServer = await server.start();

  // Graceful Shutdown handler
  process.once('SIGTERM', async () => {
    log.debug('SIGTERM signal received: closing HTTP server');
    await server.stop();
    await cache.stop();
  });

  httpServer.on('error', (err) => {
    log.error('Error occurred (server):', err);
  });

  // httpServer.on('request',(req: IncomingMessage) => {
  //   console.log(`Request received ${req.url}`)
  // });
};

export default main().catch(async (err) => {
  log.error('Error occurred (main):', err);
  process.exit(1);
});
