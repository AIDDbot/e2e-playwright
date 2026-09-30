# Validación de Testing Guidelines

Este documento explica cómo configurar la validación automática de las prácticas de testing.

## Instalación de ESLint (Opcional)

El proyecto usa **oxlint** por defecto (más rápido), pero puedes añadir **ESLint** para validaciones más específicas:

```bash
# Instalar ESLint y plugins
bun add -d eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin eslint-plugin-playwright @testing-library/eslint-plugin

# Verificar configuración
bun exec eslint --version
```

## Configuración Actual

### 1. **oxlint** (Principal)

Valida errores generales y complejidad:

```bash
# Lint básico (errores solo)
bun lint

# Lint con warnings
bun quality:warnings

# Lint con límites de complejidad
bun quality:complexity

# Lint + format + complexity
bun quality:all
```

### 2. **ESLint** (Opcional, para testing específico)

Valida reglas de testing y selectores:

```bash
# Ejecutar ESLint solo en tests
bun exec eslint tests/ --ext .ts

# Fijar automáticamente lo posible
bun exec eslint tests/ --ext .ts --fix

# Ver solo errores de selectores
bun exec eslint tests/ --ext .ts --format=json | grep "locator\|CSS"
```

## Reglas Configuradas

### Selectores por Rol (Forzadas)

❌ **Error**: Selectores CSS directos

```typescript
page.locator(".email-field"); // CSS class
page.locator("#login-btn"); // CSS ID
page.locator("//input[@type]"); // XPath
```

✅ **Correcto**: Selectores por rol

```typescript
page.getByRole("textbox", { name: "Email" });
page.getByRole("button", { name: "Log in" });
page.getByLabel("Password");
```

### Waits Forzados

❌ **Advertencia**: Waits hardcodeados

```typescript
await page.waitForTimeout(2000);
await new Promise((r) => setTimeout(r, 1000));
```

✅ **Correcto**: Waits implícitos

```typescript
await expect(page).toHaveURL("/login");
await expect(button).toBeVisible();
```

### Playwright Rules

- ✅ No `page.evaluate()` sin justificación
- ✅ No tests focusados (`test.only`)
- ✅ No tests skipped (`test.skip`) sin tracking
- ✅ Expects válidos dentro de promises

## Agregar a CI/CD

En tu `.github/workflows/test.yml`:

```yaml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Bun
        uses: oven-sh/setup-bun@v1

      - name: Install dependencies
        run: bun install

      - name: Lint (Oxlint)
        run: bun quality:all

      - name: Lint (ESLint - opcional)
        run: bun exec eslint tests/ --ext .ts

      - name: Run E2E Tests
        run: bun test:e2e

      - name: Upload Report
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: test-report
          path: reports/html/
```

## Scripts Recomendados para package.json

```json
{
  "scripts": {
    "test:e2e": "playwright test",
    "lint": "oxlint --format=agent --quiet",
    "lint:fix": "oxlint --fix --format=agent --quiet",
    "lint:eslint": "eslint tests/ --ext .ts",
    "lint:eslint:fix": "eslint tests/ --ext .ts --fix",
    "format": "oxfmt --write",
    "fix": "bun run lint:fix && bun run lint:eslint:fix && bun run format",
    "quality:all": "bun run quality:warnings && bun run quality:complexity && bun run lint:eslint",
    "quality:warnings": "oxlint --deny-warnings --format=agent",
    "quality:complexity": "oxlint -c .oxlintrc.complexity.json --format=agent --quiet"
  }
}
```

## Pre-commit Hook (Recomendado)

Usa **husky** para validar antes de commit:

```bash
# Instalar husky
bun add -d husky
npx husky install

# Crear hook pre-commit
cat > .husky/pre-commit << 'EOF'
#!/bin/sh
echo "🔍 Linting tests..."
bun run lint:eslint tests/
if [ $? -ne 0 ]; then
  echo "❌ ESLint found issues. Run 'bun run lint:eslint:fix' to auto-fix."
  exit 1
fi
echo "✅ Lint passed"
EOF

chmod +x .husky/pre-commit
```

## Workflow Recomendado

### Antes de cada commit:

```bash
# 1. Fijar automáticamente
bun fix

# 2. Validar todo
bun quality:all

# 3. Correr tests
bun test:e2e

# 4. Commit si todo pasa
git add . && git commit -m "feat: add new test"
```

### En Pull Requests:

GitHub Actions ejecutará automáticamente:

- ✅ Oxlint (errores + warnings)
- ✅ ESLint (selectores y best practices)
- ✅ Playwright Tests
- ✅ Reporte HTML

## Personalizar Reglas

Para cambiar severidad o agregar nuevas reglas:

### Editar `.eslintrc.json`

```json
{
  "rules": {
    "playwright/no-wait-for-timeout": "error", // Cambiar a "warn"
    "playwright/no-focused-test": "error" // Agregar nueva regla
  }
}
```

### Ignorar Archivos

Crear `.eslintignore`:

```
node_modules/
reports/
dist/
```

## Troubleshooting

### Error: "Cannot find module 'eslint-plugin-playwright'"

```bash
bun add -d eslint-plugin-playwright
```

### ESLint no detecta mis tests

Verifica que `.eslintrc.json` incluya:

```json
{
  "plugins": ["playwright"]
}
```

### Las reglas de selectores no funcionan

ESLint solo puede detectar strings literales. Los selectores dinámicos no se validan:

```typescript
// ✅ Detectado por ESLint
page.locator(".bad-selector"); // Error de ESLint

// ❌ NO detectado (string dinámico)
const sel = ".bad-selector";
page.locator(sel); // No error, pero igual es mala práctica
```

Usa **code review** para estos casos.

## Recursos

- [ESLint Playwright Plugin](https://github.com/microsoft/eslint-plugin-playwright)
- [TypeScript ESLint](https://typescript-eslint.io/)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
