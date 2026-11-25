import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';

const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

process.env.NODE_ENV = 'test';
process.env.JWT_PUBLIC_KEY = publicKey;
process.env.JWT_ISSUER = 'simrs-yii';
process.env.LIS_INBOUND_API_KEY = 'test-inbound-key';

export function tokenFor(permissions = [], options = {}) {
  return jwt.sign({ name: 'Tester', username: 'tester', roles: [], permissions }, privateKey, {
    algorithm: 'RS256',
    issuer: 'simrs-yii',
    subject: '01900000-0000-7000-8000-000000000001',
    expiresIn: options.expiresIn ?? '5m',
  });
}
