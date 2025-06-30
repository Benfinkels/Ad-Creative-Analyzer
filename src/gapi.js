import { google } from 'googleapis';

const CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;
const API_KEY = process.env.REACT_APP_GOOGLE_API_KEY;
const DISCOVERY_DOC = 'https://slides.googleapis.com/$discovery/rest?version=v1';
const SCOPES = 'https://www.googleapis.com/auth/presentations';

let tokenClient;

function gapiInit() {
  gapi.client.init({
    apiKey: API_KEY,
    discoveryDocs: [DISCOVERY_DOC],
  });
}

function gisInit() {
  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: SCOPES,
    callback: () => {},
  });
}

export function handleAuthClick() {
  return new Promise((resolve, reject) => {
    if (gapi.client.getToken() === null) {
      tokenClient.callback = (resp) => {
        if (resp.error !== undefined) {
          reject(resp);
        }
        resolve();
      };

      if (gapi.client.getToken() === null) {
        tokenClient.requestAccessToken({ prompt: 'consent' });
      } else {
        tokenClient.requestAccessToken({ prompt: '' });
      }
    } else {
      resolve();
    }
  });
}

export function handleSignoutClick() {
  const token = gapi.client.getToken();
  if (token !== null) {
    google.accounts.oauth2.revoke(token.access_token);
    gapi.client.setToken('');
  }
}

export function initGoogleApi() {
  if (window.gapi) {
    gapi.load('client', gapiInit);
  }
  if (window.google) {
    gisInit();
  }
}
