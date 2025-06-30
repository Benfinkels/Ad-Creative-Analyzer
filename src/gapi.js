const CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;
const API_KEY = process.env.REACT_APP_GOOGLE_API_KEY;
const DISCOVERY_DOC = 'https://slides.googleapis.com/$discovery/rest?version=v1';
const SCOPES = 'https://www.googleapis.com/auth/presentations';

let tokenClient;
let gapiReady = false;
let gisReady = false;

export function initGoogleApi() {
  return new Promise((resolve, reject) => {
    const checkAndResolve = () => {
      if (gapiReady && gisReady) {
        console.log("SUCCESS: Both GAPI and GIS are initialized.");
        resolve();
      }
    };

    const gapiScript = document.createElement('script');
    gapiScript.src = 'https://apis.google.com/js/api.js';
    gapiScript.async = true;
    gapiScript.defer = true;
    gapiScript.onload = () => {
      console.log("GAPI script loaded. Initializing client...");
      window.gapi.load('client', () => {
        window.gapi.client.init({
          apiKey: API_KEY,
          discoveryDocs: [DISCOVERY_DOC],
        }).then(() => {
          console.log("GAPI client initialized.");
          gapiReady = true;
          checkAndResolve();
        }, (error) => {
          console.error("GAPI client initialization failed:", error);
          reject(error);
        });
      });
    };
    gapiScript.onerror = (error) => {
      console.error("Failed to load GAPI script:", error);
      reject(error);
    };
    document.body.appendChild(gapiScript);

    const gisScript = document.createElement('script');
    gisScript.src = 'https://accounts.google.com/gsi/client';
    gisScript.async = true;
    gisScript.defer = true;
    gisScript.onload = () => {
      console.log("GIS script loaded. Initializing token client...");
      tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: (resp) => {
          if (resp.error) {
            console.error('Google authentication error:', resp.error);
            return;
          }
          console.log("Authentication successful. Setting token.");
          if (window.gapi && window.gapi.client) {
            window.gapi.client.setToken({ access_token: resp.access_token });
          } else {
            console.error("GAPI client not available to set token.");
          }
        },
      });
      console.log("GIS token client initialized.");
      gisReady = true;
      checkAndResolve();
    };
    gisScript.onerror = (error) => {
      console.error("Failed to load GIS script:", error);
      reject(error);
    };
    document.body.appendChild(gisScript);
  });
}

export function handleAuthClick() {
  return new Promise((resolve, reject) => {
    if (!gapiReady || !gisReady) {
      return reject(new Error('Google APIs not yet loaded.'));
    }

    if (window.gapi.client.getToken() === null) {
      tokenClient.callback = (resp) => {
        if (resp.error) {
          return reject(resp.error);
        }
        console.log("Authentication successful. Setting token.");
        if (window.gapi && window.gapi.client) {
          window.gapi.client.setToken({ access_token: resp.access_token });
          resolve();
        } else {
          reject(new Error("GAPI client not available to set token."));
        }
      };
      tokenClient.requestAccessToken({ prompt: 'consent' });
    } else {
      resolve();
    }
  });
}
