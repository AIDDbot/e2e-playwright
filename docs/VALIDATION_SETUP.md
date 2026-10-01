# Validación de Testing Guidelines

Este documento explica cómo configurar la validación automática de las prácticas de testing.

## Instalación de ESLint (Opcional)

El proyecto usa **oxlint** por defecto (más rápido), pero puedes añadir **ESLint** para validaciones más específicas:

```bash
# Instalar ESLint y plugins
npm i -D eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin eslint-plugin-playwright @testing-library/eslint-plugin

# Verificar configuración
npx eslint --version
```

## Configuración Actual

### 1. **oxlint** (Principal)

Valida errores generales y complejidad:

```bash
# Lint básico (errores solo)
npm run lint

# Lint con warnings
npm run quality:warnings

# Lint con límites de complejidad
npm run quality:complexity

# Lint + format + complexity
npm run quality:all
```

### 2. **ESLint** (Opcional, para testing específico)

Valida reglas de testing y selectores:

```bash
# Ejecutar ESLint solo en tests
npx eslint tests/ --ext .ts

# Fijar automáticamente lo posible
npx eslint tests/ --ext .ts --fix

# Ver solo errores de selectores
npx eslint tests/ --ext .ts --format=json | grep "locator\|CSS"
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

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "26.10"
          cache: npm

      - name: Install dependencies
        run: npm install

      - name: Lint (Oxlint)
        run: npm run quality:all

      - name: Lint (ESLint - opcional)
        run: npx eslint tests/ --ext .ts

      - name: Run E2E Tests
        run: npm run test:e2e

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
    "fix": "npm run lint:fix && npm run lint:eslint:fix && npm run format",
    "quality:all": "npm run quality:warnings && npm run quality:complexity && npm run lint:eslint",
    "quality:warnings": "oxlint --deny-warnings --format=agent",
    "quality:complexity": "oxlint -c .oxlintrc.complexity.json --format=agent --quiet"
  }
}
```

## Pre-commit Hook (Recomendado)

Usa **husky** para validar antes de commit:

```bash
# Instalar husky
npm i -D husky
npx husky install

# Crear hook pre-commit
cat > .husky/pre-commit << 'EOF'
#!/bin/sh
echo "🔍 Linting tests..."
npm run lint:eslint -- tests/
if [ $? -ne 0 ]; then
  echo "❌ ESLint found issues. Run 'npm run lint:eslint:fix' to auto-fix."
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
npm run fix

# 2. Validar todo
npm run quality:all

# 3. Correr tests
npm run test:e2e

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
npm i -D eslint-plugin-playwright
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
