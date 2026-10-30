import { Injectable, signal } from '@angular/core';

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

  // Valida usuario y contraseña; si coinciden, la sesión queda activa.
  iniciarSesion(usuario: string, password: string): boolean {
    const encontrado = this.usuarios.find(
      (u) => u.usuario === usuario && u.password === password,
    );
    if (!encontrado) return false;

    const sesion: DatosSesion = {
      usuario: encontrado.usuario,
      nombre: encontrado.nombre,
      rol: encontrado.rol,
    };
    this.usuarioActual.set(sesion);
    this.guardar('sesion', sesion);
    return true;
  }

  // Registra un nuevo usuario en el sistema y devuelve un mensaje si ya existe.
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
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('sesion');
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