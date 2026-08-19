# Águila — Gerencia (teléfono)

La vista de bolsillo del software de gerencia. Misma base de datos, mismas
reglas; pensada para el día a día desde el teléfono:

- **Panel** — quién está trabajando ahora, horas del día, viajes en ruta y
  permisos por resolver, por tienda.
- **Grupo** — el chat completo: privados con cualquiera, fotos, y publicar
  en Anuncios Generales.
- **Viajes** — los registros de kilometraje en vivo, con totales por día,
  semana o mes, y cierre de viajes olvidados.
- **Pedidos** — ver cada pedido y cambiarle el estado.
- **Permisos** — aprobar o denegar (con motivo) desde el teléfono; al
  aprobar, la persona sale sola del horario de esos días.

Recibe avisos push de mensajes, viajes (salida y llegada) y pedidos
nuevos. En iPhone hay que añadir la app a la pantalla de inicio
(Compartir → Añadir a inicio) para que lleguen.

Sólo entra la gerencia: una cuenta con ficha en `Colaboradores` es del
portal del colaborador y se rechaza aquí.

Lo que exige pantalla grande —nómina, horario, reporte del contador,
altas de personal— se queda en el software de escritorio a propósito.

## Despliegue

Sitio estático (Netlify). No necesita reglas nuevas de Firestore: usa las
mismas colecciones y permisos que el software de escritorio. Los avisos de
viajes y pedidos los envía la Cloud Function del repositorio
`domcub_employee` (`avisarViaje`, `avisarPedido`), que hay que desplegar
una vez desde su flujo de GitHub Actions.
