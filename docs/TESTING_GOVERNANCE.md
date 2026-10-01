# 📋 Documentación de Testing Guidelines - Resumen Ejecutivo

Este documento resume cómo se han **documentado y obligado** los dos consejos clave de testing.

## 🎯 Objetivo

Garantizar que todos los tests sigan dos prácticas fundamentales:

1. ✅ **Datos únicos por test** — Evitar colisiones en ejecuciones paralelas
2. ✅ **Localizadores por rol** — Mejorar accesibilidad y resiliencia

---

## 📁 Archivos Creados

### 1. **TESTING_GUIDELINES.md**

**Guía completa** con:

- ✅ Explicación detallada de ambas prácticas
- ✅ Código correcto vs. incorrecto (lado a lado)
- ✅ Errores comunes y soluciones
- ✅ Checklist pre-commit

**Uso**: Consulta cuando dudes sobre una práctica.

### 2. **TESTING_EXAMPLES.md**

**Ejemplos prácticos** con:

- ✅ Datos únicos: qué hacer y qué no
- ✅ Selectores: orden de preferencia
- ✅ Estructura de page objects
- ✅ Fixtures para evitar repeticiones
- ✅ Tests ejemplo paso a paso

**Uso**: Cópialo y adáptalo a tus tests.

### 3. **TESTING_CHECKLIST.md**

**Checklist pre-commit** con:

- ✅ Lista de verificación para cada aspecto
- ✅ Errores más comunes
- ✅ Comandos útiles
- ✅ Preguntas frecuentes

**Uso**: Revísalo antes de hacer commit.

### 4. **VALIDATION_SETUP.md**

**Configuración de validación automática** con:

- ✅ Cómo instalar y usar ESLint
- ✅ Cómo integrar en CI/CD
- ✅ Reglas configuradas automáticamente
- ✅ Pre-commit hooks con husky

**Uso**: Para configurar validaciones automáticas en tu proyecto.

### 5. **.eslintrc.json**

**Configuración ESLint** que:

- ✅ Detecta selectores CSS directos
- ✅ Detecta XPath complejos
- ✅ Detecta hardcoded waits
- ✅ Valida reglas de Playwright

**Uso**: Automático, ejecuta `eslint tests/ --ext .ts`

### 6. **scripts/validate-tests.sh**

**Script de validación** que:

- ✅ Ejecuta oxlint
- ✅ Revisa complejidad
- ✅ Verifica formato
- ✅ Busca anti-patrones
- ✅ Cuenta tests y AC tags

**Uso**: `bash scripts/validate-tests.sh`

---

## 🚀 Cómo Usar (Workflow Recomendado)

### Opción A: Manual (Sin herramientas extra)

```bash
# 1. Escribir tests siguiendo TESTING_GUIDELINES.md
# 2. Revisar con TESTING_CHECKLIST.md
# 3. Auto-fijar problemas comunes
npm run fix

# 4. Validar todo
npm run quality:all

# 5. Ejecutar tests
npm run test:e2e

# 6. Hacer commit
git add .
git commit -m "test: add new test for @AC-XXX"
```

### Opción B: Automático con ESLint + Husky

```bash
# 1. Instalar ESLint (una sola vez)
npm i -D eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin eslint-plugin-playwright

# 2. Instalar husky (una sola vez)
npm i -D husky
npx husky install

# 3. Crear pre-commit hook
npx husky add .husky/pre-commit "bash scripts/validate-tests.sh"

# 4-5. Escribir tests y commit (valida automáticamente)
git add .
git commit -m "test: add new test"  # Valida antes de hacer commit
```

### Opción C: En CI/CD (GitHub Actions)

```bash
# GitHub ejecutará automáticamente
npm run quality:all  # Oxlint + ESLint
npm run test:e2e     # Tests
```

---

## 📊 Estructura de Referencia

```
📦 Testing Guidelines
├── 📄 TESTING_GUIDELINES.md      ← Guía completa (leer primero)
├── 📄 TESTING_EXAMPLES.md         ← Ejemplos de código
├── 📄 TESTING_CHECKLIST.md        ← Checklist pre-commit
├── 📄 VALIDATION_SETUP.md         ← Config de ESLint + CI/CD
├── ⚙️ .eslintrc.json               ← Configuración ESLint (automático)
├── 📝 scripts/validate-tests.sh    ← Script de validación
└── 📋 TESTING_GOVERNANCE.md        ← Este archivo
```

---

## 🔍 Validaciones Implementadas

### Nivel 1: Oxlint (Obligatorio)

```bash
npm run quality:all
```

Detecta:

- ✅ Errores de Playwright
- ✅ Complejidad de código
- ✅ Type safety

### Nivel 2: ESLint (Opcional pero Recomendado)

```bash
npx eslint tests/ --ext .ts
```

Detecta:

- ✅ Selectores CSS directos (`.class`, `#id`)
- ✅ XPath complejos
- ✅ Hardcoded waits
- ✅ Reglas de Playwright

### Nivel 3: Script Custom

```bash
bash scripts/validate-tests.sh
```

Detecta:

- ✅ Emails hardcodeados
- ✅ Anti-patrones comunes
- ✅ Cobertura de AC tags

---

## ✅ Checklist: Datos Únicos

| Situación                     | Solución               | Ejemplo                              |
| ----------------------------- | ---------------------- | ------------------------------------ |
| Nuevo usuario en cada test    | `uniqueEmail(label)`   | `uniqueEmail("register-test")`       |
| Datos compartidos (passwords) | `users.json`           | `users.ada.password`                 |
| Usuario autenticado           | `signedInUser` fixture | `test(..., async ({ signedInUser })` |

---

## ✅ Checklist: Localizadores por Rol

| Elemento               | Orden de Preferencia | Ejemplo                                        |
| ---------------------- | -------------------- | ---------------------------------------------- |
| Botones, inputs, links | 1️⃣ `getByRole()`     | `page.getByRole("button", { name: "Log in" })` |
| Campos con label       | 2️⃣ `getByLabel()`    | `page.getByLabel("Email")`                     |
| Contenido visible      | 3️⃣ `getByText()`     | `page.getByText("Welcome")`                    |
| Último recurso         | 4️⃣ `getByTestId()`   | `page.getByTestId("advanced")`                 |
| ❌ Nunca               | CSS/XPath            | `page.locator(".btn")`, `//div[@id]`           |

---

## 📚 Documentación por Caso de Uso

### Caso 1: "Estoy escribiendo un nuevo test"

1. Lee: [TESTING_GUIDELINES.md](./TESTING_GUIDELINES.md) (secciones 1-2)
2. Copia: Código de [TESTING_EXAMPLES.md](./TESTING_EXAMPLES.md)
3. Adapta: A tu caso específico
4. Valida: [TESTING_CHECKLIST.md](./TESTING_CHECKLIST.md)

### Caso 2: "Recibí comentarios de code review"

1. Busca: El error en [TESTING_CHECKLIST.md](./TESTING_CHECKLIST.md#-errores-comunes)
2. Lee: La sección correspondiente en [TESTING_GUIDELINES.md](./TESTING_GUIDELINES.md)
3. Busca: El patrón en [TESTING_EXAMPLES.md](./TESTING_EXAMPLES.md)
4. Reemplaza: El código con la versión correcta

### Caso 3: "Quiero automatizar validaciones"

1. Lee: [VALIDATION_SETUP.md](./VALIDATION_SETUP.md) completo
2. Instala: ESLint + husky
3. Configura: Pre-commit hook con `scripts/validate-tests.sh`

### Caso 4: "Mi test es flaky"

1. Revisa: [TESTING_CHECKLIST.md](./TESTING_CHECKLIST.md#-errores-comunes)
2. Verifica:
   - ✅ Datos únicos (no hardcodeado)
   - ✅ Selectores por rol (no CSS directo)
   - ✅ Assertions explícitas (no waits hardcodeados)

---

## 🎓 Comandos Clave

```bash
# Escribir tests
npm run test:e2e -- --grep @AC-XXX              # Ejecutar un AC específico
npm run test:e2e:report                       # Ver reporte HTML

# Validar tests
npm run fix                                   # Auto-fijar problemas
npm run quality:all                           # Oxlint + Complexity
npm run lint:eslint                           # ESLint (si instalado)
bash scripts/validate-tests.sh            # Script de validación

# Antes de commit
npm run quality:all && npm run test:e2e           # Validar + ejecutar
git add . && git commit -m "test: ..."    # Commit si todo pasa
```

---

## 🔗 Referencias Externas

- 📖 [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- ♿ [ARIA & Accessibility](https://www.w3.org/WAI/ARIA/apg/)
- 🧪 [Test Data Management](https://martinfowler.com/bliki/TestDataBuilder.html)
- 🎯 [Page Object Model](https://playwright.dev/docs/pom)

---

## ❓ Preguntas Frecuentes

**P: ¿Por qué datos únicos?**  
R: Tests paralelos reutilizarían los mismos datos → colisiones. Unique = tests aislados.

**P: ¿Por qué selectores por rol?**  
R: Más accesibles, resilientes a cambios CSS, fáciles de leer.

**P: ¿Puedo usar fixtures siempre?**  
R: Sí, si generan datos únicos internamente. `signedInUser` lo hace.

**P: ¿Qué pasa si el sitio no tiene ARIA?**  
R: Contacta al team de frontend. `getByTestId()` como fallback temporal.

**P: ¿Cómo corro validaciones en CI?**  
R: [VALIDATION_SETUP.md](./VALIDATION_SETUP.md) → GitHub Actions workflow.

---

## 📞 Soporte

- 📋 [Crear issue con etiqueta `testing-guidelines`](https://github.com/AIDDbot/e2e-playwright/issues)
- 💬 Team de testing en Slack/Teams
- 🔍 Buscar en [TESTING_EXAMPLES.md](./TESTING_EXAMPLES.md)

---

## 🎉 Resumen

| Aspecto                   | Herramienta   | Ubicación                                        |
| ------------------------- | ------------- | ------------------------------------------------ |
| **Guía de prácticas**     | Documentación | [TESTING_GUIDELINES.md](./TESTING_GUIDELINES.md) |
| **Ejemplos de código**    | Documentación | [TESTING_EXAMPLES.md](./TESTING_EXAMPLES.md)     |
| **Checklist**             | Documentación | [TESTING_CHECKLIST.md](./TESTING_CHECKLIST.md)   |
| **Validación manual**     | Script bash   | `scripts/validate-tests.sh`                      |
| **Validación automática** | Oxlint        | `npm run quality:all`                            |
| **Validación con ESLint** | Configuración | `.eslintrc.json`                                 |
| **Pre-commit hooks**      | Guía          | [VALIDATION_SETUP.md](./VALIDATION_SETUP.md)     |

✅ **Datos únicos + Selectores por rol = Tests confiables, paralelos y mantenibles.**
