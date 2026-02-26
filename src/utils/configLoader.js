function requiredEnv(keys) {
  const missing = keys.filter((k) => !process.env[k]);
  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

function appConfig() {
  return {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '3000', 10),
    n8nBaseUrl: process.env.N8N_BASE_URL,
    logLevel: process.env.LOG_LEVEL || 'info',
  };
}

module.exports = { requiredEnv, appConfig };
