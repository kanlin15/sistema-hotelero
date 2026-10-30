import { Injectable, signal } from '@angular/core';

export interface Sesion {
  usuario: string;
  nombre: string;
  rol: string;
}

interface UsuarioRegistrado extends Sesion {
  password: string;
}

@Injectable({ providedIn: 'root' })
export class Auth {
  private usuarios: UsuarioRegistrado[] = this.leerUsuarios();
  usuarioActual = signal<Sesion | null>(this.leerSesion());

  login(usuario: string, password: string): boolean {
    const encontrado = this.usuarios.find(
      (u) => u.usuario === usuario && u.password === password,
    );
    if (!encontrado) return false;

    const sesion: Sesion = {
      usuario: encontrado.usuario,
      nombre: encontrado.nombre,
      rol: encontrado.rol,
    };
    this.usuarioActual.set(sesion);
    this.guardar('sesion', sesion);
    return true;
  }

  // Devuelve un mensaje de error, o null si todo salió bien
  registrar(nombre: string, usuario: string, password: string, rol: string): string | null {
    if (this.usuarios.some((u) => u.usuario === usuario)) {
      return 'Ese usuario ya existe';
    }
    this.usuarios.push({ nombre, usuario, password, rol });
    this.guardar('usuarios', this.usuarios);
    return null;
  }

  logout() {
    this.usuarioActual.set(null);
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('sesion');
    }
  }

  private guardar(clave: string, valor: unknown) {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(clave, JSON.stringify(valor));
    }
  }

  private leerUsuarios(): UsuarioRegistrado[] {
    const base: UsuarioRegistrado[] = [
      { usuario: 'admin', password: '1234', nombre: 'Carlos Andres Hernandez', rol: 'administrador' },
    ];
    if (typeof localStorage === 'undefined') return base;
    const guardados = localStorage.getItem('usuarios');
    return guardados ? JSON.parse(guardados) : base;
  }

  private leerSesion(): Sesion | null {
    if (typeof localStorage === 'undefined') return null;
    const guardada = localStorage.getItem('sesion');
    return guardada ? JSON.parse(guardada) : null;
  }
}