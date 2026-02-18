export const config = {
  openAi: {
    endpoint: process.env.AZURE_OPENAI_ENDPOINT ?? "",
    apiKey: process.env.AZURE_OPENAI_API_KEY ?? "",
    apiVersion: process.env.AZURE_OPENAI_API_VERSION ?? "2025-01-01-preview",
    primaryDeployment: process.env.MODEL_PRIMARY_DEPLOYMENT ?? "primary",
    fallbackDeployment: process.env.MODEL_FALLBACK_DEPLOYMENT ?? "gpt-4.1"
  },
  cosmos: {
    endpoint: process.env.COSMOS_ENDPOINT ?? "",
    key: process.env.COSMOS_KEY ?? "",
    database: process.env.COSMOS_DATABASE ?? "meeting-copilot",
    container: process.env.COSMOS_CONTAINER ?? "meeting-state"
  },
  appInsights: {
    connectionString: process.env.APPLICATIONINSIGHTS_CONNECTION_STRING ?? ""
  }
};

export function isOpenAiConfigured(): boolean {
  return Boolean(config.openAi.endpoint && config.openAi.apiKey);
}

export function isCosmosConfigured(): boolean {
  return Boolean(config.cosmos.endpoint && config.cosmos.key);
}
