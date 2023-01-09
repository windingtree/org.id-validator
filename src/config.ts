import { join, resolve } from 'path';
import dotenv from 'dotenv';
import { ChainConfig } from './types';

const envFilePath = join(process.cwd(), `.env`);
dotenv.config({ path: envFilePath });

export const checkEnvVariables = (vars: string[]): void =>
  vars.forEach((variable) => {
    if (!process.env[variable] || process.env[variable] === '') {
      throw new Error(`${variable} must be provided in the .env`);
    }
  });

checkEnvVariables([
  'APP_PORT',
  'LOG_LEVEL',
  'APP_NAME',
  'REDIS_HOST',
  'REDIS_PORT',
  'REDIS_USERNAME',
  'REDIS_PASSWORD',
]);

export const NODE_ENV = process.env.NODE_ENV || 'development';

export const PORT = process.env.APP_PORT;

switch (process.env.LOG_LEVEL) {
  case 'info':
  case 'warn':
  case 'debug':
    break;
  default:
    throw new Error(`Unknown LOG_LEVEL: ${process.env.LOG_LEVEL}`);
}

export const LOG_LEVEL = (process.env.LOG_LEVEL || 'info').toLowerCase();

export const LOG_FILE = resolve(
  process.cwd(),
  process.env.LOG_FILE || 'journal.log'
);

export const APP_NAME = process.env.APP_NAME;

export const GRAFANA_URL = process.env.GRAFANA_URL;

export const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split('|')
  : ['*'];

export const CHAINS: ChainConfig[] = [
  {
    name: 'Gnosis Chain',
    chainId: '100',
    blockchainType: 'eip155',
    orgIdAddress: '0xb63d48e9d1e51305a17F4d95aCa3637BBC181b44',
    providerUri:
      'https://poa-xdai.gateway.pokt.network/v1/lb/0b1afa3b501711635aee21f6',
  },
  {
    name: 'Polygon',
    chainId: '137',
    blockchainType: 'eip155',
    orgIdAddress: '0x8a093Cb94663994d19a778c7EA9161352a434c64',
    providerUri:
      'https://poly-mainnet.gateway.pokt.network/v1/lb/0b1afa3b501711635aee21f6',
  },
  {
    name: 'Goerli',
    chainId: '5',
    blockchainType: 'eip155',
    orgIdAddress: '0xe02dF24d8dFdd37B21690DB30F4813cf6c4D9D93',
    providerUri:
      'https://eth-goerli.g.alchemy.com/v2/aw5WyUmvvU_Uf4fI8nDj51Nx0QeUJ0lr',
  },
  {
    name: 'Chiado',
    chainId: '10200',
    blockchainType: 'eip155',
    orgIdAddress: '0xaa727223949Bf082a8AFcb29B34B358d9bad8736',
    providerUri: 'https://rpc.chiadochain.net',
  },
  {
    name: 'Columbus',
    chainId: '502',
    blockchainType: 'eip155',
    orgIdAddress: '0xd8b75be9a47ffab0b5c27a143b911af7a7bf4076',
    providerUri: 'https://columbus.camino.foundation/ext/bc/C/rpc',
  },
];

export const IPFS_GATEWAY_HOST =
  process.env.IPFS_GATEWAY_HOST || 'https://w3s.link/ipfs';

export const REDIS_URL = `redis://${process.env.REDIS_USERNAME}:${process.env.REDIS_PASSWORD}@${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`;

export const REDIS_STORE_PREFIX = 'orgId_';

export const CACHE_ENABLED = process.env.REDIS_CACHE_ENABLED === 'true';

export const CACHE_EXPIRY_TIME =
  Number(process.env.REDIS_CACHE_EXPIRY_TIME) || 2592000;
