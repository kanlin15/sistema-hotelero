import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Autenticacion } from '../../services/autenticacion';

// Componente de inicio de sesión.
// Valida las credenciales del usuario y redirige al panel si el acceso es correcto.
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  private router = inject(Router);
  private autenticacion = inject(Autenticacion);

  tipoUsuario: 'personal' | 'cliente' | 'invitado' = 'personal';
  usuario = '';
  password = '';
  error = false;
  errorCliente = '';
  modoRecuperacion: 'usuario' | 'contrasena' | null = null;
  correoRecuperacion = '';
  usuarioRecuperacion = '';
  mensajeRecuperacion = '';

  // Selecciona el tipo de usuario para el inicio de sesión (personal, cliente o invitado).
  // Reinicia los campos de usuario y contraseña, y oculta mensajes de error.
  seleccionarTipo(tipo: 'personal' | 'cliente' | 'invitado') {
    this.tipoUsuario = tipo;
    this.usuario = '';
    this.password = '';
    this.error = false;
    this.errorCliente = '';

    if (tipo === 'invitado') {
      this.router.navigate(['/catalogo']);
    }
  }

  // Intenta autenticar al usuario con lo que ingrese en el formulario.
  // Si es válido, entra al panel; si no, muestra mensaje de error.
  async ingresar() {
    if (this.tipoUsuario === 'invitado') {
      this.router.navigate(['/catalogo']);
      return;
    }

    if (!this.usuario.trim() || !this.password.trim()) {
      this.error = true;
      return;
    }

    const accesoCorrecto =
      this.tipoUsuario === 'personal'
        ? await this.autenticacion.iniciarSesion(this.usuario, this.password)
        : await this.autenticacion.iniciarSesionCliente(this.usuario, this.password);

    if (accesoCorrecto) {
      this.error = false;
      this.errorCliente = '';
      this.router.navigate([this.tipoUsuario === 'cliente' ? '/catalogo' : '/panel']);
    } else {
      this.error = true;
      this.errorCliente = 'Usuario o contraseña incorrectos';
    }
  }

  // Abre el modo de recuperación de usuario o contraseña.
  abrirRecuperacion(modo: 'usuario' | 'contrasena') {
    this.modoRecuperacion = modo;
    this.mensajeRecuperacion = '';
  }

  // Cierra el modo de recuperación y reinicia los campos relacionados.
  cerrarRecuperacion() {
    this.modoRecuperacion = null;
    this.correoRecuperacion = '';
    this.usuarioRecuperacion = '';
  }

  // Intenta recuperar el usuario o la contraseña según el modo seleccionado.
  async recuperar() {
    if (this.modoRecuperacion === 'usuario') {
      const usuario = await this.autenticacion.recuperarUsuario(this.correoRecuperacion);
      this.mensajeRecuperacion = usuario
        ? `Tu usuario registrado es: ${usuario}`
        : 'No encontramos una cuenta con ese correo';
      return;
    }

    if (!this.correoRecuperacion.trim()) {
      this.mensajeRecuperacion = 'Ingresa tu correo registrado';
      return;
    }

    const enviado = await this.autenticacion.recuperarContrasena(this.correoRecuperacion);
    this.mensajeRecuperacion = enviado
      ? 'Te enviamos un enlace para restablecer la contraseña'
      : 'No pudimos enviar el correo. Verifica los datos ingresados';
  }

  // Navega a la página de registro de usuario.
  irARegistro() {
    this.router.navigate(['/registro-usuario']);
  }
}
