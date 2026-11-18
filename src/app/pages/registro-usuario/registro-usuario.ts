import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Autenticacion } from '../../services/autenticacion';

@Component({
  selector: 'app-registro-usuario',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './registro-usuario.html',
  styleUrl: './registro-usuario.css',
})
export class RegistroUsuario {
  private router = inject(Router);
  private autenticacion = inject(Autenticacion);

  nombre = '';
  usuario = '';
  correo = '';
  celular = '';
  password = '';
  confirmarPassword = '';
  error = '';
  mensaje = '';
  registrando = false;

  async registrar() {
    if (this.registrando) return;

    this.error = '';
    this.mensaje = '';

    if (!this.nombre.trim() || !this.usuario.trim() || !this.correo.trim() || !this.celular.trim()) {
      this.error = 'Completa todos los datos';
      return;
    }

    if (this.password.length < 6) {
      this.error = 'La contraseña debe tener al menos 6 caracteres';
      return;
    }

    if (this.password !== this.confirmarPassword) {
      this.error = 'Las contraseñas no coinciden';
      return;
    }

    this.registrando = true;

    try {
      const resultado = await this.autenticacion.registrarCliente(
        this.nombre,
        this.usuario,
        this.correo,
        this.celular,
        this.password,
      );

      if (resultado) {
        this.error = resultado;
        return;
      }

      this.mensaje = 'Cuenta creada y registrada correctamente';
      this.password = '';
      this.confirmarPassword = '';
    } catch (error) {
      console.error('Error al crear la cuenta:', error);
      this.error = 'No se pudo guardar la cuenta. Inténtalo nuevamente.';
    } finally {
      this.registrando = false;
    }
  }

  volverAlLogin() {
    this.router.navigate(['/login']);
  }
}