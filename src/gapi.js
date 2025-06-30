const CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;
const API_KEY = process.env.REACT_APP_GOOGLE_API_KEY;
const DISCOVERY_DOC = 'https://slides.googleapis.com/$discovery/rest?version=v1';
const SCOPES = 'https://www.googleapis.com/auth/presentations';

let tokenClient;
let gapiLoaded = false;
let gisLoaded = false;

function loadScript(src, onLoad) {
  const script = document.createElement('script');
  script.src = src;
  script.async = true;
  script.defer = true;
  script.onload = onLoad;
  document.body.appendChild(script);
}

function gapiInit() {
  window.gapi.client.init({
    apiKey: API_KEY,
    discoveryDocs: [DISCOVERY_DOC],
  }).then(() => {
    gapiLoaded = true;
  }, (error) => {
    console.error('Error initializing GAPI client:', error);
  });
}

function gisInit() {
  tokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: SCOPES,
    callback: (resp) => {
      if (resp.error) {
        console.error('Google authentication error:', resp.error);
        return;
      }
      window.gapi.client.setToken({ access_token: resp.access_token });
    },
  });
  gisLoaded = true;
}

export function handleAuthClick() {
  return new Promise((resolve, reject) => {
    if (!gapiLoaded || !gisLoaded) {
      return reject(new Error('Google APIs not yet loaded.'));
    }

    if (window.gapi.client.getToken() === null) {
      tokenClient.requestAccessToken({ prompt: 'consent' });
    }
    resolve();
  });
}

export function handleSignoutClick() {
  if (!gapiLoaded || !gisLoaded) {
    console.error('Google APIs not yet loaded.');
    return;
  }

  const token = window.gapi.client.getToken();
  if (token !== null) {
    window.google.accounts.oauth2.revoke(token.access_token);
    window.gapi.client.setToken('');
  }
}

export function initGoogleApi() {
  return new Promise((resolve, reject) => {
    const gapiScript = document.createElement('script');
    gapiScript.src = 'https://apis.google.com/js/api.js';
    gapiScript.async = true;
    gapiScript.defer = true;
    gapiScript.onload = () => {
      window.gapi.load('client', () => {
        window.gapi.client.init({
          apiKey: API_KEY,
          discoveryDocs: [DISCOVERY_DOC],
        }).then(() => {
          gapiLoaded = true;
          if (gisLoaded) resolve();
        }, reject);
      });
    };
    gapiScript.onerror = reject;
    document.body.appendChild(gapiScript);

    const gisScript = document.createElement('script');
    gisScript.src = 'https://accounts.google.com/gsi/client';
    gisScript.async = true;
    gisScript.defer = true;
    gisScript.onload = () => {
      tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: (resp) => {
          if (resp.error) {
            console.error('Google authentication error:', resp.error);
            return;
          }
          window.gapi.client.setToken({ access_token: resp.access_token });
        },
      });
      gisLoaded = true;
      if (gapiLoaded) resolve();
    };
    gisScript.onerror = reject;
    document.body.appendChild(gisScript);
  });
}
