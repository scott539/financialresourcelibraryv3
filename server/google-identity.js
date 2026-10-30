// Google STS verifies Vercel's signature, issuer, audience and provider condition.
// Each request supplies its own short-lived Vercel token, including on warm instances.
import { AsyncLocalStorage } from 'node:async_hooks';
import { IdentityPoolClient } from 'google-auth-library';

const requestIdentity = new AsyncLocalStorage();
export const projectId = 'bp-money-resources';
const serviceAccount = 'bpm-library-metrics@bp-money-resources.iam.gserviceaccount.com';

export function withVercelIdentity(handler) {
  return (req, res) => requestIdentity.run(req.headers?.['x-vercel-oidc-token'], () => handler(req, res));
}

export function googleClient(provider, scope) {
  return new IdentityPoolClient({
    audience: '//iam.googleapis.com/' + provider,
    subject_token_type: 'urn:ietf:params:oauth:token-type:jwt',
    token_url: 'https://sts.googleapis.com/v1/token',
    service_account_impersonation_url: 'https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/' + serviceAccount + ':generateAccessToken',
    scopes: [scope],
    subject_token_supplier: {
      async getSubjectToken() {
        const token = requestIdentity.getStore();
        if (typeof token !== 'string' || !token) throw new Error('Vercel workload identity unavailable');
        return token;
      }
    }
  });
}
