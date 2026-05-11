# nueva-feature

Orquesta la creación completa de una nueva feature pasando por todos los agentes de la agencia.

## Uso
```
/nueva-feature [nombre de la feature]
```

## Flujo de ejecución

Cuando el usuario invoca esta skill, ejecutá los siguientes pasos en orden:

### 1. Product Management
Invoke `product-manager` para:
- Definir el alcance de la feature basado en la descripción del usuario
- Escribir las user stories con criterios de aceptación
- Estimar el esfuerzo y priorizar

Crear archivo: `docs/features/[feature-name]/PRD.md`

### 2. UX/UI Design
Invoke `ux-ui-designer` para:
- Definir el flujo de usuario
- Crear wireframes en texto de las pantallas involucradas
- Especificar componentes nuevos necesarios

Crear archivo: `docs/features/[feature-name]/DESIGN.md`

### 3. Planificación técnica
Antes de implementar, definir:
- Contrato de API (endpoints, payload, responses)
- Esquema de datos si hay cambios de DB
- Lista de componentes a crear/modificar

Crear archivo: `docs/features/[feature-name]/TECH_PLAN.md`

### 4. Implementación en paralelo
Invocar simultáneamente:
- `frontend-developer` para implementación de UI
- `backend-developer` para API y lógica de negocio

### 5. QA
Invoke `qa-tester` para:
- Revisar el código implementado
- Escribir tests automatizados faltantes
- Ejecutar checklist de feature

### 6. Resumen final
Reportar al usuario:
- Archivos creados/modificados
- Tests añadidos
- Issues de seguridad detectados (si hay)
- Próximos pasos sugeridos

## Notas
- Si la feature es muy grande, proponer dividirla en sub-features antes de comenzar
- Documentar decisiones técnicas importantes en `DECISIONS.md`
- Usar ramas de git: `feature/[feature-name]`
