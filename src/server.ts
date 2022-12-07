import express, { Response } from 'express';
import http from 'http';
import helmet from 'helmet';
import cors from 'cors';
import { Service } from 'typedi';
import {
  decodeJwt,
  verifyAuthJWT,
  verifyAuthJWTWithEthers,
} from '@windingtree/org.id-auth/dist/tokens';
import { resolver } from './utils/resolver';
import { extractVerificationMethod } from './utils/orgId';
import { PORT, ALLOWED_ORIGINS } from './config';
import { cache } from './utils/cache';
import { logger } from './utils/logger';

const log = logger(__filename);

@Service()
export class Server {
  protected server: http.Server;
  protected app: express.Application;

  constructor() {
    this.app = express();

    // CORS setup
    const corsOptions = {
      origin: ALLOWED_ORIGINS,
      optionsSuccessStatus: 200,
      methods: 'GET,PUT,POST,DELETE,PATCH,OPTIONS',
      allowedHeaders:
        'Origin,X-Requested-With,Content-Type,Accept,Authorization',
      exposedHeaders: 'Content-Range,X-Content-Range',
      credentials: true,
    };
    log.info('CORS options:', corsOptions);
    this.app.use(cors(corsOptions));

    // Helmet setup
    this.app.set('trust proxy', 1);
    this.app.disable('x-powered-by');
    this.app.use(helmet());
    this.app.use(helmet.contentSecurityPolicy());
    this.app.use(helmet.crossOriginEmbedderPolicy());
    this.app.use(helmet.crossOriginOpenerPolicy());
    this.app.use(helmet.crossOriginResourcePolicy());
    this.app.use(helmet.dnsPrefetchControl());
    this.app.use(helmet.expectCt());
    this.app.use(helmet.frameguard());
    this.app.use(helmet.hidePoweredBy());
    this.app.use(helmet.hsts());
    this.app.use(helmet.ieNoOpen());
    this.app.use(helmet.noSniff());
    this.app.use(helmet.originAgentCluster());
    this.app.use(helmet.permittedCrossDomainPolicies());
    this.app.use(helmet.referrerPolicy());
    this.app.use(helmet.xssFilter());

    // Routes setup
    this.setup();
  }

  private setup(): void {
    log.info('OrgId validator starting up');

    // Ping-pong endpoint
    this.app.get('/test', (_, res) => {
      res.status(200).send({
        status: 'OK',
      });
    });

    // JWT validation
    this.app.get('/jwt', async (req, res) => {
      const jwt = req.query['jwt'] as string;
      const audience = req.query['audience'] as string;
      const scope = (req.query['scope'] as string | undefined)?.split(',');
      log.debug(`GET /jwt, parameters: jwt=${jwt}, audience=${audience}`);

      if (!jwt || jwt.length === 0) {
        return res.status(400).send({
          error: 'Missing JWT parameter',
        });
      }

      try {
        await this.handleJWT(jwt, audience, res, scope);
        log.debug('JWT successfully validated');
      } catch (e) {
        log.warn('Cannot validate JWT, got error:', e);
      }
    });

    // ORGiD resolution
    this.app.get('/orgid', async (req, res) => {
      const orgid: string = req.query['orgid'] as string;
      log.debug(`GET /orgid, parameters: orgid=${orgid}`);

      if (!orgid || orgid.length === 0) {
        const errorMessage = 'Missing orgid parameter';
        log.error(errorMessage);
        return res.status(400).send({
          error: errorMessage,
        });
      }

      try {
        await this.handleORGID(orgid, res);
      } catch (e) {
        log.warn('Cannot retrieve orgID, got error:', e);
      }
    });
  }

  private async handleJWT(
    jwt: string,
    audience: string,
    res: Response,
    scope?: string[]
  ): Promise<void> {
    try {
      log.debug('Starting validation of JWT:', jwt);

      const rowJwtPayload = decodeJwt(jwt);
      log.debug('Issuer found in JWT:', rowJwtPayload.iss);

      if (!rowJwtPayload.iss) {
        throw new Error('Issuer not found in the JWT payload');
      }

      let resolutionResponse = await cache.getResponse(rowJwtPayload.iss);

      if (!resolutionResponse) {
        resolutionResponse = await resolver.resolve(rowJwtPayload.iss);
        await cache.storeResponse(rowJwtPayload.iss, resolutionResponse);
      }

      log.debug('Resolution response:', resolutionResponse);

      if (resolutionResponse.didDocument === null) {
        const errMessage = `Resolution of ${rowJwtPayload.iss} is failed`;
        log.warn(errMessage);
        res.status(404).send({
          status: 'FAILED',
          payload: rowJwtPayload,
          resolutionResponse,
          error: errMessage,
        });
        return;
      }

      const { blockchainAccountId, publicKeyJwk } = extractVerificationMethod(
        resolutionResponse.didDocument,
        rowJwtPayload.iss // this did contains `fragment` with key Id
      );
      log.debug('Found verification public key:', publicKeyJwk);

      let result;

      if (blockchainAccountId) {
        result = await verifyAuthJWTWithEthers(
          jwt,
          blockchainAccountId,
          rowJwtPayload.iss,
          audience,
          scope
        );
      } else if (publicKeyJwk) {
        result = await verifyAuthJWT(
          jwt,
          publicKeyJwk,
          rowJwtPayload.iss,
          audience,
          scope
        );
      } else {
        throw new Error(`Public key not found in the verification method`);
      }

      log.debug('Verified JWT payload:', result.payload);

      res.status(200).send({
        status: 'OK',
        payload: result.payload,
        resolutionResponse,
      });
    } catch (err) {
      log.warn(err.message || 'Unknown verification error');
      res.status(404).send({
        status: 'FAILED',
        error: err,
      });
    }
  }

  private async handleORGID(did: string, res: Response): Promise<void> {
    try {
      log.debug('Starting resolution of ORGiD:', did);

      let resolutionResponse = await cache.getResponse(did);

      if (!resolutionResponse) {
        resolutionResponse = await resolver.resolve(did);
        await cache.storeResponse(did, resolutionResponse);
      }

      log.debug('Resolution response:', resolutionResponse);

      res.status(200).send({
        resolutionResponse,
      });
    } catch (err) {
      log.warn(err);
      res.status(404).send({
        status: 'FAILED',
        error: err,
      });
    }
  }

  async start(): Promise<http.Server> {
    return await new Promise((resolve, reject) => {
      try {
        this.server = this.app.listen(PORT, () => {
          console.log(`Server listening on port ${PORT}`);
          resolve(this.server);
        });
      } catch (e) {
        log.error('Error during start:', e);
        reject(e);
      }
    });
  }

  async stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.server.once('close', resolve);
        this.server.close();
      } catch (e) {
        log.error('Error during stop:', e);
        reject(e);
      }
    });
  }
}
