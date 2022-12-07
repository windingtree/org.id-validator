import type {
  ORGJSON,
  VerificationMethodReference,
} from '@windingtree/org.json-schema/types/org.json';
import { parsers } from '@windingtree/org.id-utils';

// Extracts a proper verification method from didDocument
// @todo Move extractVerificationMethod to thg SDK
export const extractVerificationMethod = (
  didDocument: ORGJSON,
  did: string
): VerificationMethodReference => {
  const { fragment: key } = parsers.parseDid(did);

  if (!key) {
    throw new Error(`Key Id not found in the did: ${did}`);
  }

  if (!didDocument.verificationMethod) {
    throw new Error('Invalid DID document: verificationMethod not found');
  }

  const verificationMethod = didDocument.verificationMethod.find((m) => {
    const { fragment } = parsers.parseDid(m.id);
    return fragment === key;
  });

  if (!verificationMethod) {
    throw new Error(`Verification method with key ${key} not found`);
  }

  return verificationMethod;
};
