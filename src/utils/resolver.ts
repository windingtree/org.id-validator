import { providers } from 'ethers';
import {
  buildEvmChainConfig,
  buildHttpFetcherConfig,
  OrgIdResolver,
  ResolverOptions,
  FetcherResolver,
  FetcherConfig,
} from '@windingtree/org.id-resolver';
import { ORGJSONVCNFT } from '@windingtree/org.json-schema/types/orgVc';
import { http } from '@windingtree/org.id-utils';
import { CHAINS, IPFS_GATEWAY_HOST } from '../config';

export const createChainsConfig = () =>
  CHAINS.map((chain) =>
    buildEvmChainConfig(
      chain.chainId,
      chain.blockchainType,
      chain.orgIdAddress,
      new providers.JsonRpcProvider(chain.providerUri)
    )
  );

export const chains = createChainsConfig();

export const getFromIpfs = <T>(cid: string): Promise<T> =>
  http.request(
    `${IPFS_GATEWAY_HOST}/${cid}`,
    'GET',
    undefined,
    undefined,
    10000 // 10 sec timeout
  ) as Promise<T>;

export const httpFetcherConfig = buildHttpFetcherConfig();

export const ipfsFetcherInitializer = (): FetcherResolver => ({
  getOrgJson: async (uri: string): Promise<ORGJSONVCNFT> =>
    getFromIpfs<ORGJSONVCNFT>(uri),
});

export const buildIpfsFetcherConfig = (): FetcherConfig => ({
  id: 'ipfs',
  name: 'IPFS fetcher',
  init: ipfsFetcherInitializer,
});

export const resolverOptions: ResolverOptions = {
  chains,
  fetchers: [httpFetcherConfig, buildIpfsFetcherConfig()],
};

export const resolver = OrgIdResolver(resolverOptions);
