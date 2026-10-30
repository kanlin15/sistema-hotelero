// Estados posibles de una reserva:
// Pendiente  → recién creada
// Confirmada → aprobada, la habitación queda "Reservada"
// Activa     → el huésped ya hizo check-in, la habitación queda "Ocupada"
// Finalizada → el huésped ya hizo check-out, la habitación pasa a "Limpieza"
// Cancelada  → anulada, la habitación vuelve a "Disponible"
export type EstadoReserva = 'Pendiente' | 'Confirmada' | 'Activa' | 'Finalizada' | 'Cancelada';

// Forma de una reserva: todos los datos que se guardan de cada una
export interface Reserva {
  id: number;                // identificador único (lo genera el servicio)
  nombre: string;            // nombre completo del huésped
  documento: string;         // cédula del huésped
  email: string;
  telefono: string;
  habitacionId: number;      // id de la habitación (enlace con Gestión de Habitaciones)
  numeroHabitacion: string;  // número que se muestra en la tabla (ej: "101")
  fechaEntrada: string;      // formato AAAA-MM-DD (el que entrega <input type="date">)
  fechaSalida: string;
  total: number;             // noches × precio por noche
  estado: EstadoReserva;
}