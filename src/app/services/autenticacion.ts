import { Injectable, signal, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import { firebaseApp } from '../firebase.init';

// Define la información mínima que se guarda de una sesión activa.
export interface DatosSesion {
  usuario: string;
  nombre: string;
  rol: string;
  uid?: string;
  puntos?: number;
  nivel?: string;
  bienvenidaUsada?: boolean;
}

// Servicio de autenticación.
// Guarda usuarios, valida credenciales y mantiene la sesión actual del usuario.
@Injectable({ providedIn: 'root' })
export class Autenticacion {
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
      const resultado = await getDoc(doc(db, 'usuarios', usuarioNormalizado));

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
        uid: String(datos['uid'] ?? '').trim(),
        puntos: Number(datos['puntos'] ?? 0),
        nivel: String(datos['nivel'] ?? '').trim(),
      };

      this.usuarioActual.set(sesion);
      this.guardar('sesion', sesion);

      return true;
    } catch (error) {
      console.error('Error al iniciar sesión del personal:', error);

      // Si ocurre un error, no dejamos una sesión incompleta.
      await signOut(auth).catch(() => {});
      return false;
    }
  }

  async iniciarSesionCliente(usuario: string, password: string): Promise<boolean> {
    if (!isPlatformBrowser(this.plataforma)) return false;

    const usuarioNormalizado = usuario.trim().toLowerCase();

    try {
      let datos: Record<string, unknown> | null = null;

      try {
        const db = getFirestore(firebaseApp);
        const resultado = await getDoc(doc(db, 'usuarios', usuarioNormalizado));
        if (resultado.exists()) datos = resultado.data();
      } catch (error) {
        console.warn('No se pudo consultar el usuario en Firestore; se usa el registro local:', error);
      }

      if (!datos) {
        const clientes = JSON.parse(localStorage.getItem('clientes') ?? '[]') as Array<Record<string, unknown>>;
        datos = clientes.find((cliente) => cliente['usuario'] === usuarioNormalizado) ?? null;
      }

      if (!datos) return false;

      const correo = String(datos['correo'] ?? '').trim();

      if (!correo || String(datos['rol'] ?? '').toLowerCase() !== 'cliente') {
        return false;
      }

      await signInWithEmailAndPassword(getAuth(firebaseApp), correo, password);

      const sesion: DatosSesion = {
        usuario: usuarioNormalizado,
        nombre: String(datos['nombre'] ?? ''),
        rol: 'cliente',
        uid: String(datos['uid'] ?? '').trim(),
        puntos: Number(datos['puntos'] ?? 0),
        nivel: String(datos['nivel'] ?? '').trim(),
        bienvenidaUsada: datos['bienvenidaUsada'] === true,
      };

      this.usuarioActual.set(sesion);
      this.guardar('sesion', sesion);
      return true;
    } catch (error) {
      console.error('Error al iniciar sesión del cliente:', error);
      await signOut(getAuth(firebaseApp)).catch(() => {});
      return false;
    }
  }

  async registrarCliente(nombre: string, usuario: string, correo: string, celular: string, password: string): Promise<string | null> {
    if (!isPlatformBrowser(this.plataforma)) return 'El registro solo está disponible en el navegador';

    const usuarioNormalizado = usuario.trim().toLowerCase();
    const correoNormalizado = correo.trim().toLowerCase();
    const celularNormalizado = celular.trim();

    if (!nombre.trim() || !usuarioNormalizado || !correoNormalizado || !celularNormalizado || password.length < 6) {
      return 'Completa todos los datos. La contraseña debe tener al menos 6 caracteres';
    }

    try {
      const db = getFirestore(firebaseApp);

      const clientesLocales = JSON.parse(localStorage.getItem('clientes') ?? '[]') as Array<Record<string, unknown>>;
      if (clientesLocales.some((cliente) => cliente['usuario'] === usuarioNormalizado)) {
        return 'Ese nombre de usuario ya está registrado';
      }

      const credencial = await createUserWithEmailAndPassword(
        getAuth(firebaseApp),
        correoNormalizado,
        password,
      );

      const datosCliente = {
        uid: credencial.user.uid,
        usuario: usuarioNormalizado,
        nombre: nombre.trim(),
        correo: correoNormalizado,
        celular: celularNormalizado,
        rol: 'cliente',
        fechaRegistro: new Date().toISOString(),
        puntos: 500,
        nivel: 'bronze',
        bienvenidaUsada: false,
      };

      try {
        await setDoc(doc(db, 'usuarios', usuarioNormalizado), datosCliente);
      } catch (error) {
        console.warn('Firestore rechazó el documento; se guarda el cliente localmente:', error);
      }

      if (isPlatformBrowser(this.plataforma)) {
        const guardados = JSON.parse(localStorage.getItem('clientes') ?? '[]') as Array<Record<string, unknown>>;
        const actualizados = guardados.filter((cliente) => cliente['usuario'] !== usuarioNormalizado);
        actualizados.push(datosCliente);
        localStorage.setItem('clientes', JSON.stringify(actualizados));
      }

      return null;
    } catch (error: unknown) {
      const codigo = typeof error === 'object' && error && 'code' in error
        ? String(error.code)
        : '';

      if (codigo === 'auth/email-already-in-use') return 'Ese correo ya tiene una cuenta registrada';
      if (codigo === 'auth/invalid-email') return 'Ingresa un correo electrónico válido';
      if (codigo === 'auth/weak-password') return 'La contraseña debe tener al menos 6 caracteres';

      console.error('Error al registrar cliente:', error);
      return 'No se pudo completar el registro';
    }
  }

  async recuperarUsuario(correo: string): Promise<string | null> {
    if (!isPlatformBrowser(this.plataforma)) return null;

    try {
      const db = getFirestore(firebaseApp);
      const consulta = query(
        collection(db, 'usuarios'),
        where('correo', '==', correo.trim().toLowerCase()),
      );
      const resultados = await getDocs(consulta);

      if (resultados.empty) return null;

      const datos = resultados.docs[0].data();
      return String(datos['usuario'] ?? '').trim() || null;
    } catch (error) {
      console.error('Error al recuperar usuario:', error);
      return null;
    }
  }

  async recuperarContrasena(correo: string): Promise<boolean> {
    if (!isPlatformBrowser(this.plataforma) || !correo.trim()) return false;

    try {
      await sendPasswordResetEmail(getAuth(firebaseApp), correo.trim().toLowerCase());
      return true;
    } catch (error) {
      console.error('Error al enviar recuperación de contraseña:', error);
      return false;
    }
  }

  // Cierra la sesión current y elimina la información guardada en el navegador.
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

  // Recupera la sesión activa guardada en el navegador, si existe.
  private leerSesion(): DatosSesion | null {
    if (typeof localStorage === 'undefined') return null;

    const guardada = localStorage.getItem('sesion');
    return guardada ? JSON.parse(guardada) : null;
  }
}
