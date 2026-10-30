
// Estados posibles de una habitación
export type EstadoHabitacion =
  | 'Disponible'
  | 'Ocupada'
  | 'Limpieza'
  | 'Mantenimiento'
  | 'Reservada';

// Forma de una habitación: todos los datos que se guardan de cada una
export interface Habitacion {
  id: number;                // identificador único (lo genera el servicio)
  numero: string;            // ej: "101"
  tipo: string;              // Individual, Familiar o Pareja
  estado: EstadoHabitacion;
  precio: number;            // precio por noche en COP
  capacidad: number;         // cantidad de personas
  descripcion: string;       // ej: "Habitacion Junior"
}