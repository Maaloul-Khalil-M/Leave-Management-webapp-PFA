export const environment = {
  production: false,
  apiBaseUrl: 'http://localhost:8080',
  keycloak: {
    issuer: 'http://localhost:9090/realms/leave-workforce',
    clientId: 'leave-workforce-ui',
    redirectUri: 'http://localhost:4200/'
  }
};
