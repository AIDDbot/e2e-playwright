# ⚡ Quick Start: Testing Guidelines

Comienza aquí si eres nuevo en el proyecto.

---

## 🎯 Los 2 Consejos Obligatorios (30 segundos)

### 1. Datos Únicos por Test ✅

```typescript
import { uniqueEmail } from "../test-data/unique.js";

// ✅ BIEN: Datos únicos
const email = uniqueEmail("my-test");

// ❌ MAL: Hardcodeado
const email = "test@example.com";
```

**Por qué**: Tests paralelos no colisionan.

---

### 2. Localizadores por Rol ✅

```typescript
// ✅ BIEN: Por rol
page.getByRole("button", { name: "Log in" });
page.getByLabel("Email");

// ❌ MAL: CSS directo
page.locator(".btn");
page.locator("#email");
```

**Por qué**: Accesible, resiliente a cambios CSS, fácil de leer.

---

## 📖 Documentación (Leer en Este Orden)

1. **[TESTING_GUIDELINES.md](./TESTING_GUIDELINES.md)** — Explica cada práctica en detalle
2. **[TESTING_EXAMPLES.md](./TESTING_EXAMPLES.md)** — Código correcto vs. incorrecto
3. **[TESTING_CHECKLIST.md](./TESTING_CHECKLIST.md)** — Revisa antes de hacer commit

---

## 👨‍💻 Tu Primer Test (3 minutos)

```typescript
import { test, expect } from "../../fixtures/index.js";
import { uniqueEmail } from "../../test-data/unique.js";
import users from "../../test-data/users.json";

test("user can register with unique email", async ({ registerPage, page }) => {
  // 1. Datos únicos
  const email = uniqueEmail("register-test");
  const { name, password } = users.ada;

  // 2. Selecciona por rol (es en la página)
  await registerPage.goto();
  await registerPage.emailInput.fill(email); // getByRole definido en page object
  await registerPage.nameInput.fill(name);
  await registerPage.passwordInput.fill(password);
  await registerPage.submitButton.click(); // getByRole

  // 3. Assertions claras
  await expect(page).toHaveURL("/login?registered=1");
});
```

---

## 🔧 Antes de Hacer Commit (1 minuto)

```bash
# 1. Fijar problemas
bun fix

# 2. Validar
bun quality:all

# 3. Ejecutar tests
bun test:e2e

# 4. Commit si todo OK
git add .
git commit -m "test: add registration test"
```

---

## 🚨 Errores Más Comunes

| Error                            | Solución                                           |
| -------------------------------- | -------------------------------------------------- |
| Tests se rompen en paralelo      | Usa `uniqueEmail()` en cada test                   |
| Selectores fallan al cambiar CSS | Usa `getByRole()` en lugar de `.locator(".class")` |
| No sé qué AC tag usar            | Busca en la documentación del proyecto             |
| Test tarda mucho                 | Evita `waitForTimeout()`, usa `expect()`           |

---

## 📋 Estructura de Tu Page Object

```typescript
import { type Locator, type Page } from "@playwright/test";

export class LoginPage {
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;

  constructor(page: Page) {
    // Selectores por rol (accesibles)
    this.emailInput = page.getByRole("textbox", { name: "Email" });
    this.passwordInput = page.getByLabel("Password");
    this.submitButton = page.getByRole("button", { name: "Log in" });
  }

  async goto(): Promise<void> {
    await this.page.goto("/login");
  }

  async submit(email: string, password: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }
}
```

---

## 🎯 Patrón: Test Autenticado

```typescript
// El fixture signedInUser genera datos únicos + autentica
test("logged-in users see dashboard", async ({ signedInUser, page }) => {
  const { name } = signedInUser;

  await page.goto("/dashboard");
  await expect(page.getByText(`Welcome, ${name}`)).toBeVisible();
});
```

---

## 🆘 Ayuda Rápida

| Necesitas                 | Archivo                                                                                              |
| ------------------------- | ---------------------------------------------------------------------------------------------------- |
| Ver ejemplos de código    | [TESTING_EXAMPLES.md](./TESTING_EXAMPLES.md)                                                         |
| Checklist antes de commit | [TESTING_CHECKLIST.md](./TESTING_CHECKLIST.md)                                                       |
| Entender selectores       | [TESTING_GUIDELINES.md](./TESTING_GUIDELINES.md#2-localizadores-por-rol-accesibilidad-y-resiliencia) |
| Entender datos únicos     | [TESTING_GUIDELINES.md](./TESTING_GUIDELINES.md#1-datos-únicos-por-test-única-verdad)                |
| Preguntas frecuentes      | [TESTING_CHECKLIST.md](./TESTING_CHECKLIST.md#-dudas-frecuentes)                                     |
| Problemas con linting     | [VALIDATION_SETUP.md](./VALIDATION_SETUP.md)                                                         |

---

## ✅ Next Steps

- [ ] Lee [TESTING_GUIDELINES.md](./TESTING_GUIDELINES.md) (15 min)
- [ ] Revisa un test existente en `tests/e2e/auth/`
- [ ] Escribe tu primer test
- [ ] Usa [TESTING_CHECKLIST.md](./TESTING_CHECKLIST.md) antes de hacer commit
- [ ] Corre: `bun quality:all && bun test:e2e`

---

## 💡 Resumen

```typescript
// La fórmula:
// 1. Datos únicos + 2. Selectores por rol = Tests confiables
const email = uniqueEmail("test");
await page.getByRole("button", { name: "Log in" }).click();
await expect(page).toHaveURL("/dashboard");
```

🎉 **¡Listo! Ya sabes lo básico.**

Profundiza en [TESTING_GUIDELINES.md](./TESTING_GUIDELINES.md) cuando tengas dudas.
