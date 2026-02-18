targetScope = 'resourceGroup'

@description('Base name prefix for resources')
param baseName string = 'meetingcopilot'

@description('Azure region')
param location string = resourceGroup().location

@description('Deploy the Azure OpenAI account (model must be deployed manually in Foundry)')
param deploySpeech bool = true

// ── Azure OpenAI (account only — deploy model via Foundry portal) ──────
resource openAiAccount 'Microsoft.CognitiveServices/accounts@2024-04-01-preview' = {
  name: '${baseName}-oai'
  location: location
  kind: 'OpenAI'
  sku: { name: 'S0' }
  properties: {
    customSubDomainName: '${baseName}-oai'
  }
}

// ── Azure Speech (optional — browser Web Speech API works as fallback) ──
resource speechAccount 'Microsoft.CognitiveServices/accounts@2024-04-01-preview' = if (deploySpeech) {
  name: '${baseName}-speech'
  location: location
  kind: 'SpeechServices'
  sku: { name: 'S0' }
  properties: {}
}

// ── Outputs (use these to fill .env.local) ─────────────────────────────
output openAiEndpoint string = openAiAccount.properties.endpoint
output openAiKey string = openAiAccount.listKeys().key1
output speechKey string = deploySpeech ? speechAccount.listKeys().key1 : ''
output speechRegion string = location
