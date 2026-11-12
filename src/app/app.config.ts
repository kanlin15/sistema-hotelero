
import { ApplicationConfig, LOCALE_ID, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideClientHydration } from '@angular/platform-browser';
import { registerLocaleData } from '@angular/common';
import localeEsCO from '@angular/common/locales/es-CO';

// Importa la inicialización de Firebase.
import './firebase.init';

import { routes } from './app.routes';

// Registra el idioma español de Colombia (punto para miles: 190.000)
registerLocaleData(localeEsCO);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideClientHydration(),
    // Hace que el pipe "currency" use formato colombiano
    { provide: LOCALE_ID, useValue: 'es-CO' },
  ],
};
