# Clínica Online

**Clínica Online** es una aplicación web para gestionar turnos médicos de manera 100% digital. Fue desarrollada como Trabajo Práctico de Laboratorio IV en sprints, donde cada entrega cubre funcionalidades específicas hasta completar un sistema de reserva de turnos, administración de usuarios y gestión de perfiles.


Rutas y pantallas
1. Página de Bienvenida (/)

URL: https://clinica-online-7b16e.web.app/

![BienvenidaClinica](https://github.com/user-attachments/assets/d13d48e0-e044-4611-b959-4750c0914498)

Botones para Login y Registro

Descripción breve de la clínica

2. Registro (/register)

URL: https://clinica-online-7b16e.web.app/register

![RegristroClinica](https://github.com/user-attachments/assets/94f1fe3d-e71b-4981-932b-69cb3ade986c)

Usuario Paciente: nombre, apellido, edad, DNI, obra social, mail, password, 2 imágenes.

URL: https://clinica-online-7b16e.web.app/register/paciente

![RegistroPaciente](https://github.com/user-attachments/assets/5f15fd55-6e5c-4de9-82ab-8773eef5c808)

Usuario Especialista: nombre, apellido, edad, DNI, especialidades (checkbox + campo libre), mail, password, avatar, reCAPTCHA.

URL: https://clinica-online-7b16e.web.app/register/especialista

![RegistroEspecialista](https://github.com/user-attachments/assets/018136e8-3c00-4000-b26b-0a887e3647aa)

Validaciones en frontend + confirmación de email.

3. Login (/login)

URL: https://clinica-online-7b16e.web.app/login

![LoginClinica](https://github.com/user-attachments/assets/15330ec4-8cb5-498b-bf22-ded98ac94086)

Email + contraseña

Botones de acceso rápido

Solo usuarios verificados y especialistas aprobados por Admin pueden ingresar.

4. Dashboard / Nav Principal
Según rol (Paciente, Especialista, Administrador), verás distintas secciones:

Paciente
Mis Turnos (/paciente/mis-turnos):

URL:https://clinica-online-7b16e.web.app/paciente/mis-turnos

![PacienteMisTurnos](https://github.com/user-attachments/assets/c0218f8a-104d-4759-a751-885f2e6637a4)

Filtrado por especialidad, especialista o historia clinica.

Cancelar turno (antes de realizado) + motivo.

Ver reseña (si el especialista ya dejó comentario).

Completar encuesta / calificar atención (si turno realizado).


Solicitar Turno (/paciente/solicitar-turno):

URL: https://clinica-online-7b16e.web.app/solicitar-turno

![PacienteSolicitarTurno](https://github.com/user-attachments/assets/de98b4f6-9511-4a67-8ea9-f2b4bc462e79)

Selección: especialidad → especialista → fecha (próximos 15 días) → hora (30′ slots según disponibilidad).

Sin datepicker, dropdowns + timepicker.

Especialista
Mis Turnos (/especialista/mis-turnos):

URL: https://clinica-online-7b16e.web.app/especialista/mis-turnos

![EspecialistaMisTurnos](https://github.com/user-attachments/assets/6c245757-c338-4019-a625-b788aeda430c)

Filtrado por especialidad,paciente o historia clinica.

Aceptar / rechazar / cancelar turno (con comentario).

Finalizar turno (reseña / diagnóstico).

Ver reseña del paciente.


Mi Perfil (/especialista/mi-perfil):

URL: https://clinica-online-7b16e.web.app/mi-perfil

![EspecialistaMiPerfil](https://github.com/user-attachments/assets/5848a644-3ac6-4483-ae24-a66daeebca21)


Mis Horarios:

Agregar bloques de disponibilidad por fecha (YYYY-MM-DD) o por día de la semana (opcional).

Desde / Hasta (time inputs).

Guardar con upsert (user_id, specialty, availability_date).

Administrador
Usuarios (/admin/users):

URL: https://clinica-online-7b16e.web.app/admin/users

![SeccionUsuariosAdmin](https://github.com/user-attachments/assets/1ddf8b3e-f789-4915-9d16-8cdec81457aa)

Listado de pacientes, especialistas, admins.

Habilitar / inhabilitar especialistas.

Crear usuarios (Paciente, Especialista, Admin).

Turnos (/admin/turnos):

URL: https://clinica-online-7b16e.web.app/turnos

![AdminTurnos](https://github.com/user-attachments/assets/6a578f9f-d99a-4e53-8a33-5f0ce7e4d547)

Vista global de todos los turnos.

Filtro único por especialidad o especialista.

Cancelar turno (antes de aceptado / realizado / rechazado).

Administrador
Estadisticas

Graficos de las estadisticas de la clinica, logs, turnos y demas

URL: https://clinica-online-7b16e.web.app/admin/estadisticas

Estadisticas (/admin/estadisticas):

![AdminEstadisticas](https://github.com/user-attachments/assets/0a3fa432-ba6d-48f5-86a0-01527e37cb87)


Sprints
Sprint 1: registro/login, validaciones, loading, favicon, despliegue.

Sprint 2: reCAPTCHA, README, “Mis Turnos” + “Solicitar Turno”.

Sprint 3: gestión de turnos por Especialista (aceptar/rechazar/finalizar).

Sprint 4: panel Admin (usuarios + turnos).

Uso rápido
Regístrate como Especialista y sube tu disponibilidad en Mi Perfil → Mis Horarios.

Regístrate como Paciente, verifica email.

Ingresa a Solicitar Turno, elige tu especialista y una fecha válida.

Selecciona la hora, confirma el turno.

El especialista lo verá en Mis Turnos y podrá aceptarlo o rechazarlo.
