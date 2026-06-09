export default () => ({
  app: {
    name: process.env.APP_NAME ?? 'HR Letter Management API',
    port: Number(process.env.PORT ?? process.env.APP_PORT ?? 3000),
    url: process.env.API_URL ?? process.env.APP_URL ?? 'http://localhost:3000/api',
    corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
    corsOrigins: (process.env.CORS_ORIGIN ?? 'http://localhost:5173')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
    storagePath: process.env.STORAGE_PATH ?? './storage',
    generatedDocPath: process.env.GENERATED_DOC_PATH ?? './storage/generated',
  },
});
