import { createClient, RedisClientOptions } from 'redis';
import { DidResolutionResponse } from '@windingtree/org.id-resolver';
import {
  REDIS_STORE_PREFIX,
  CACHE_ENABLED,
  CACHE_EXPIRY_TIME,
  REDIS_URL,
} from '../config';
import { logger } from './logger';

export class OrgIdCache {
  private static instance: OrgIdCache;
  private log = logger(__filename, { topic: 'cache' });
  private client: ReturnType<typeof createClient>;
  private prefix = REDIS_STORE_PREFIX;
  private enabled = CACHE_ENABLED;
  private expiryTime = CACHE_EXPIRY_TIME;

  public static getInstance() {
    if (!OrgIdCache.instance) {
      OrgIdCache.instance = new OrgIdCache();
    }
    return this.instance;
  }

  // Initializes a connection to Redis server
  private async init(): Promise<void> {
    if (this.client) {
      await this.client.ping();
      return;
    }
    const options: RedisClientOptions = {
      url: REDIS_URL,
      socket: {
        connectTimeout: 10000, // connection timeout after 10 secs
      },
    };
    this.client = createClient(options);
    this.client.on('error', (err) =>
      this.log.error('Redis client error:', err)
    );
    this.client.on('connect', () =>
      this.log.info('Redis client initiated connection to the server')
    );
    this.client.on('ready', () => this.log.info('Redis client connected'));
    this.client.on('end', () => this.log.warn('Redis client disconnected'));
    this.client.on('reconnecting', () =>
      this.log.warn('Redis client reconnecting')
    );
    await this.client.connect();
  }

  // Closes connection
  public async stop(): Promise<void> {
    if (!this.client) {
      return;
    }
    await this.client.disconnect();
  }

  private getKey(did: string): string {
    return `${this.prefix}${did}`;
  }

  // Save an ORGiD resolution response to cache
  public async storeResponse(
    did: string,
    resolutionResults: DidResolutionResponse
  ): Promise<void> {
    if (!this.enabled) {
      return;
    }
    try {
      await this.init();
      await this.client.setEx(
        this.getKey(did),
        this.expiryTime,
        JSON.stringify(resolutionResults)
      );
    } catch (error) {
      this.log.error('Cache store error:', error);
    }
  }

  // Fetch cached ORGiD resolution response
  public async getResponse(did: string): Promise<DidResolutionResponse | null> {
    if (!this.enabled) {
      return null;
    }
    try {
      await this.init();
      const response = await this.client.get(this.getKey(did));
      return response ? (JSON.parse(response) as DidResolutionResponse) : null;
    } catch (error) {
      this.log.error('Cache get error:', error);
      return null;
    }
  }
}

export const cache = OrgIdCache.getInstance();
