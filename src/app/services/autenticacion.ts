
import { Injectable, signal, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

// Importaciones necesarias para Firebase Authentication.
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';

// Importaciones necesarias para consultar Firestore.
import {
  getFirestore,
  doc,
  getDoc,
} from 'firebase/firestore';

// Importa la aplicación Firebase que inicializamos anteriormente.
import { firebaseApp } from '../firebase.init';

// Define la información mínima que se guarda de una sesión activa.
export interface DatosSesion {
  usuario: string;
  nombre: string;
  rol: string;
}

// Representa cada usuario registrado del sistema.
interface UsuarioRegistrado extends DatosSesion {
  password: string;
}

// Servicio de autenticación.
// Guarda usuarios, valida credenciales y mantiene la sesión actual del usuario.
@Injectable({ providedIn: 'root' })
export class Autenticacion {
  private usuarios: UsuarioRegistrado[] = this.leerUsuarios();
  usuarioActual = signal<DatosSesion | null>(this.leerSesion());

  // Identifica si el código se está ejecutando en el navegador.
  // Esto evita inicializar las funciones de autenticación durante SSR.
  private plataforma = inject(PLATFORM_ID);

  // Valida usuario y contraseña mediante Firebase Authentication.
  // Después consulta Firestore para recuperar el nombre y el rol.
  async iniciarSesion(usuario: string, password: string): Promise<boolean> {
    if (!isPlatformBrowser(this.plataforma)) return false;

    // Por ahora utilizamos el correo real de la cuenta existente.
    // No inventamos direcciones para usuarios que todavía no hemos configurado.
   const correosInternos: Record<string, string> = {
  jhonatan: 'jhonatantierradentrohernandez@gmail.com',
  };
    const usuarioNormalizado = usuario.trim().toLowerCase();
    const correo = correosInternos[usuarioNormalizado];

    if (!correo) return false;

    const auth = getAuth(firebaseApp);

    try {
      // Comprueba las credenciales en Firebase Authentication.
      await signInWithEmailAndPassword(auth, correo, password);

      // Consulta el documento del usuario en Firestore.
      const db = getFirestore(firebaseApp);
      const referencia = doc(db, 'usuarios', usuarioNormalizado);
      const resultado = await getDoc(referencia);

      if (!resultado.exists()) {
        await signOut(auth);
        return false;
      }

      const datos = resultado.data();

      // Recupera los datos del usuario y limpia espacios innecesarios.
      const sesion: DatosSesion = {
        usuario: String(datos['usuario'] ?? usuarioNormalizado),
        nombre: String(datos['nombre'] ?? ''),
        rol: String(datos['rol'] ?? '').trim(),
      };

      this.usuarioActual.set(sesion);
      this.guardar('sesion', sesion);

      return true;
    } catch (error) {
      console.error('Error al iniciar sesión con Firebase:', error);

      // Si ocurre un error, no dejamos una sesión incompleta.
      await signOut(auth).catch(() => {});
      return false;
    }
  }

  // Registra un nuevo usuario en el sistema.
  // Se conserva el método original mientras no conectemos un formulario
  // de registro con Firebase.
  registrar(nombre: string, usuario: string, password: string, rol: string): string | null {
    if (this.usuarios.some((u) => u.usuario === usuario)) {
      return 'Ese usuario ya existe';
    }

    this.usuarios.push({ nombre, usuario, password, rol });
    this.guardar('usuarios', this.usuarios);
    return null;
  }

  // Cierra la sesión actual y elimina la información guardada en el navegador.
  cerrarSesion() {
    this.usuarioActual.set(null);

    if (isPlatformBrowser(this.plataforma)) {
      localStorage.removeItem('sesion');

      // Cierra también la sesión de Firebase Authentication.
      void signOut(getAuth(firebaseApp)).catch((error) => {
        console.error('Error al cerrar sesión:', error);
      });
    }
  }

  // Guarda información en localStorage para persistir la sesión.
  private guardar(clave: string, valor: unknown) {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(clave, JSON.stringify(valor));
    }
  }

  // Carga los usuarios iniciales que existen en el sistema.
  private leerUsuarios(): UsuarioRegistrado[] {
    const base: UsuarioRegistrado[] = [
      { usuario: 'katalina', password: '1234', nombre: 'katalina vidal', rol: 'administrador' },
    ];

    if (typeof localStorage === 'undefined') return base;

    const guardados = localStorage.getItem('usuarios');
    return guardados ? JSON.parse(guardados) : base;
  }

  // Recupera la sesión activa guardada en el navegador, si existe.
  private leerSesion(): DatosSesion | null {
    if (typeof localStorage === 'undefined') return null;

    const guardada = localStorage.getItem('sesion');
    return guardada ? JSON.parse(guardada) : null;
  }
}
