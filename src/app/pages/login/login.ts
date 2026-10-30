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

  usuario = '';
  password = '';
  error = false;

  // Intenta autenticar al usuario con lo que ingrese en el formulario.
  // Si es válido, entra al panel; si no, muestra mensaje de error.
  ingresar() {
    if (this.autenticacion.iniciarSesion(this.usuario, this.password)) {
      this.error = false;
      this.router.navigate(['/panel']);
    } else {
      this.error = true;
    }
  }
}
