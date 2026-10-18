/**
 * Makes a VAPID key pair for push notifications. Run once: `npm run vapid`
 * Paste both lines into Vercel > Settings > Environment Variables, then
 * redeploy. Keep the private key out of the repo and out of chat.
 * Making a new pair later means everyone has to tap "Get notified" again.
 */
import { generateKeyPairSync } from 'node:crypto';

const jwk = generateKeyPairSync('ec', { namedCurve: 'prime256v1' }).privateKey.export({ format: 'jwk' });
const pub = Buffer.concat([Buffer.from([4]), Buffer.from(jwk.x, 'base64url'), Buffer.from(jwk.y, 'base64url')]);
console.log(`VAPID_PUBLIC_KEY=${pub.toString('base64url')}`);
console.log(`VAPID_PRIVATE_KEY=${jwk.d}`);
