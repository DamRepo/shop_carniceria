# deploy

Orquesta el proceso completo de despliegue a través del agente DevOps/DevSecOps con validaciones pre y post deploy.

## Uso
```
/deploy [staging|prod] [--canary] [--dry-run]
```

## Parámetros
- `staging` (default) — despliega a ambiente de staging
- `prod` — despliega a producción (requiere confirmación explícita)
- `--canary` — despliegue progresivo (5% → 25% → 100%)
- `--dry-run` — simula el deploy sin ejecutar cambios reales

## Flujo de ejecución

### Pre-deploy checks (obligatorio)
Invoke `qa-tester` para verificar:
1. Todos los tests pasan (`npm test` o equivalente)
2. No hay tests fallando o pendientes
3. Coverage mínimo del 70% en código nuevo

Invoke `devops-devsecops` para:
1. Ejecutar security scan: `python .claude/hooks/security_gate.py` sobre todos los archivos cambiados
2. Verificar que no hay secrets en el código
3. Revisar vulnerabilidades en dependencias

Si algún check falla → detener el deploy y reportar al usuario.

### Build
```bash
# Verificar que el build compila sin errores
npm run build

# Build de imagen Docker (si aplica)
docker build -t app:$(git rev-parse --short HEAD) .

# Scan de imagen
trivy image app:$(git rev-parse --short HEAD) --exit-code 0
```

### Deploy a staging
```bash
# Tag y push
git tag staging-$(date +%Y%m%d-%H%M%S)
# Deploy según plataforma (Vercel/Railway/K8s/ECS)
```

### Smoke tests post-deploy
Invoke `qa-tester` para ejecutar:
- Health check del endpoint principal
- Tests e2e críticos contra el ambiente desplegado
- Verificar métricas básicas (latencia, error rate)

### Deploy a producción
⚠️  Requiere confirmación explícita del usuario antes de proceder.

Estrategia según flag:
- Sin flag: blue/green deploy
- `--canary`: 5% por 10min → 25% por 10min → 100%

### Post-deploy
- Crear tag de release: `git tag v[semver]`
- Actualizar `CHANGELOG.md`
- Notificar resultado al usuario

## Rollback automático
Si los smoke tests fallan después del deploy:
1. Revertir automáticamente al release anterior
2. Notificar al usuario con los detalles del fallo
3. Mantener los logs para diagnóstico

## Variables de entorno necesarias
```
DEPLOY_TARGET     # staging | prod
REGISTRY_URL      # URL del container registry
KUBECONFIG        # Path al kubeconfig (si usa K8s)
SLACK_WEBHOOK     # Para notificaciones (opcional)
```
