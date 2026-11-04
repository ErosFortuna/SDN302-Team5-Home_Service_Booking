const { PayOS } = require('@payos/node');
const { env } = require('../../config/env.js');
const { AppError } = require('../../shared/app-error.js');

let payosClient;

function getPayOSClient({ requireCheckoutUrls = false } = {}) {
  const credentials = [env.payosClientId, env.payosApiKey, env.payosChecksumKey];
  if (credentials.some((value) => !value)) {
    throw new AppError(503, 'PayOS is not configured. Set PAYOS_CLIENT_ID, PAYOS_API_KEY, and PAYOS_CHECKSUM_KEY.');
  }
  if (requireCheckoutUrls && (!env.payosReturnUrl || !env.payosCancelUrl)) {
    throw new AppError(503, 'PayOS return and cancel URLs are not configured.');
  }

  if (!payosClient) {
    payosClient = new PayOS({
      clientId: env.payosClientId,
      apiKey: env.payosApiKey,
      checksumKey: env.payosChecksumKey,
      logLevel: 'off',
    });
  }
  return payosClient;
}

function resetPayOSClientForTests() {
  payosClient = undefined;
}

module.exports = { getPayOSClient, resetPayOSClientForTests };
