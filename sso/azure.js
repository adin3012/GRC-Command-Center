const { ConfidentialClientApplication } = require('@azure/msal-node');

function getConfig() {
  return {
    auth: {
      clientId:     process.env.AZURE_CLIENT_ID     || '',
      clientSecret: process.env.AZURE_CLIENT_SECRET || '',
      authority:    `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID || 'common'}`
    },
    system: {
      loggerOptions: {
        loggerCallback(loglevel, message) {
          console.log('[MSAL]', message);
        }
      }
    }
  };
}

// Lazy-initialize — only created when SSO is actually used
let msalClient = null;
function getMsalClient() {
  if (!msalClient) msalClient = new ConfidentialClientApplication(getConfig());
  return msalClient;
}

const tokenRequest = {
  scopes: ['User.Read']
};

const graphConfig = {
  graphMeEndpoint: 'https://graph.microsoft.com/v1.0/me'
};

async function getTokenFromCode(authCode, redirectUri) {
  try {
    const tokenResponse = await getMsalClient().acquireTokenByCode({
      code: authCode,
      scopes: ['User.Read'],
      redirectUri: redirectUri
    });
    return tokenResponse;
  } catch (error) {
    console.error('Error acquiring token by code:', error);
    throw error;
  }
}

async function getUserProfile(accessToken) {
  try {
    const response = await fetch(`${graphConfig.graphMeEndpoint}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });
    return await response.json();
  } catch (error) {
    console.error('Error fetching user profile:', error);
    throw error;
  }
}

function generateAzureAuthUrl(redirectUri) {
  const clientId = config.auth.clientId;
  const tenantId = process.env.AZURE_TENANT_ID || 'YOUR_TENANT_ID';
  const scope = 'openid profile email User.Read';
  const responseType = 'code';
  const state = Math.random().toString(36).substring(7);
  
  return `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize?client_id=${clientId}&response_type=${responseType}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&state=${state}`;
}

module.exports = {
  getMsalClient,
  getTokenFromCode,
  getUserProfile,
  generateAzureAuthUrl,
  graphConfig
};
