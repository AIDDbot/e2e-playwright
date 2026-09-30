# Testing Guidelines Checklist

Usa este checklist antes de hacer commit de tus tests.

## 📋 Checklist Pre-Commit

- [ ] **Datos Únicos**
  - [ ] Cada test genera datos únicos (email con `uniqueEmail()`)
  - [ ] Los usuarios compartidos usan `users.json`
  - [ ] Los fixtures `signedInUser` se usan para tests autenticados
  - [ ] No hay datos hardcodeados reutilizados en múltiples tests

- [ ] **Selectores por Rol**
  - [ ] Usa `getByRole()` para botones, inputs, links
  - [ ] Usa `getByLabel()` para campos con label
  - [ ] Usa `getByText()` para contenido visible
  - [ ] Solo usa `getByTestId()` como último recurso
  - [ ] NO hay selectores CSS directos (`.class`, `#id`)
  - [ ] NO hay XPath complejos (`//div[@class='...']`)

- [ ] **Page Objects**
  - [ ] Los selectores están en Page Objects, no en tests
  - [ ] Los Page Objects heredan de `AppPage`
  - [ ] Los selectores están organizados por sección/rol
  - [ ] Cada Page Object tiene métodos helper (goto, submit, etc.)

- [ ] **Tests**
  - [ ] Cada test tiene un tag AC (`{ tag: "@AC-XXX" }`)
  - [ ] El tag mapea a una acceptance criteria real
  - [ ] No hay `test.only` o `test.skip`
  - [ ] No hay `page.waitForTimeout()`
  - [ ] Las assertions son explícitas (`expect(...).toHaveURL()`)

- [ ] **Assertions**
  - [ ] Las assertions verifican comportamiento, no solo visibilidad
  - [ ] Se usan custom matchers (`.toHaveStatus()`, `.toBeApiError()`)
  - [ ] Las respuestas API se validan completas

- [ ] **Código**
  - [ ] No hay `// eslint-disable` sin justificación
  - [ ] No hay `console.log()` en tests
  - [ ] Los tipos están explícitos
  - [ ] El código pasa `bun quality:all`

---

## 🔧 Antes de Hacer Commit

```bash
# 1. Fijar problemas automáticamente
bun fix

# 2. Validar todo
bun quality:all

# 3. Correr solo tu test
bun test:e2e --grep @AC-XXX

# 4. Correr todo si está ok
bun test:e2e

# 5. Commit si todo pasa
git add .
git commit -m "test: add new test for @AC-XXX"
```

---

## 🚨 Errores Comunes

### ❌ Error 1: Datos Hardcodeados

```typescript
// MALO: Mismo email en múltiples tests
test("user can register", async ({ registerPage }) => {
  await registerPage.submit({
    email: "testuser@example.com", // ❌ Siempre igual
    name: "Test User"
  });
});

test("duplicate email fails", async ({ registerPage }) => {
  // Este test falla porque email ya existe
  await registerPage.submit({
    email: "testuser@example.com", // ❌ Conflicto
    name: "Another User"
  });
});

// BIEN: Datos únicos
test("user can register", async ({ registerPage }) => {
  const email = uniqueEmail("register-test");
  await registerPage.submit({
    email, // ✅ Único
    name: "Test User"
  });
});
```

**Solución**: Usa `uniqueEmail(label)` para cada test

---

### ❌ Error 2: Selectores CSS

```typescript
// MALO: Selectores CSS frágiles
export class LoginPage {
  readonly emailInput = page.locator(".email-field"); // ❌
  readonly button = page.locator("#login-btn");       // ❌
}

// BIEN: Selectores por rol
export class LoginPage {
  readonly emailInput = page.getByRole("textbox", { name: "Email" }); // ✅
  readonly button = page.getByRole("button", { name: "Log in" });     // ✅
}
```

**Solución**: Reemplaza con `getByRole()`, `getByLabel()` o `getByText()`

---

### ❌ Error 3: Sin Tags AC

```typescript
// MALO: Sin referencia a criteria
test("user can login", async ({ loginPage }) => {
  // ¿Qué AC cubre?
});

// BIEN: Con tag AC explícito
test("user can login with valid credentials", 
  { tag: "@AC-AUTH-01" }, 
  async ({ loginPage }) => {
    // Mapea a AC específica
  }
);
```

**Solución**: Agrega `{ tag: "@AC-XXX" }` a cada test

---

### ❌ Error 4: Waits Hardcodeados

```typescript
// MALO: Wait fijo
await page.waitForTimeout(2000); // ❌ Inestable
const result = await fetchData();

// BIEN: Wait implícito
const result = await fetchData();
await expect(page.getByText(result.name)).toBeVisible(); // ✅ Espera automático
```

**Solución**: Usa `expect()` con timeouts automáticos

---

### ❌ Error 5: Selectores dinámicos

```typescript
// MALO: CSS complejos
page.locator("form .email-field input[type='email']")

// BIEN: Por rol
page.getByRole("textbox", { name: "Email" })
```

**Solución**: Simplifica con `getByRole()` en lugar de selectores complejos

---

## ✅ Ejemplo Completo: Test Bien Hecho

```typescript
import { test, expect } from "../../fixtures/index.js";
import { uniqueEmail } from "../../test-data/unique.js";
import users from "../../test-data/users.json";
import { copy } from "../../test-data/copy.js";

test.describe("Authentication", () => {
  // ✅ Tag AC explícito
  test(
    "user can register and login with valid credentials",
    { tag: "@AC-AUTH-03" },
    async ({ registerPage, loginPage, page }) => {
      // ✅ Datos únicos
      const email = uniqueEmail("full-auth-flow");
      const { name, password } = users.ada;

      // ✅ Page objects con selectores por rol
      await registerPage.goto();
      await registerPage.emailInput.fill(email);
      await registerPage.nameInput.fill(name);
      await registerPage.passwordInput.fill(password);
      await registerPage.submitButton.click();

      // ✅ Assertions explícitas
      await expect(page).toHaveURL("/login?registered=1");
      await expect(loginPage.registrationSuccessMessage).toContainText(
        copy.auth.registrationSuccess
      );

      // ✅ Continuamos el flujo
      await loginPage.emailInput.fill(email);
      await loginPage.passwordInput.fill(password);
      await loginPage.submitButton.click();

      // ✅ Verificaciones finales
      await expect(page).toHaveURL("/");
      await expect(loginPage.navigation.authenticatedUser(name, "user")).toBeVisible();
    }
  );

  // ✅ Test con fixture pre-autenticado
  test(
    "authenticated users see personalized navigation",
    { tag: "@AC-AUTH-04" },
    async ({ signedInUser, page, appPage }) => {
      const { name } = signedInUser;

      // ✅ Ya autenticado, solo verificamos
      await page.goto("/");
      await expect(
        appPage.navigation.authenticatedUser(name, "user")
      ).toBeVisible();
    }
  );
});
```

---

## 📚 Documentación Relacionada

- [TESTING_GUIDELINES.md](./TESTING_GUIDELINES.md) - Guía completa
- [TESTING_EXAMPLES.md](./TESTING_EXAMPLES.md) - Ejemplos de código
- [VALIDATION_SETUP.md](./VALIDATION_SETUP.md) - Configuración de linting

---

## ❓ Dudas Frecuentes

**P: ¿Puedo usar fixtures en lugar de generar datos únicos?**
R: Sí, si el fixture genera datos únicos internamente (como `signedInUser`).

**P: ¿Qué pasa si el sitio no tiene ARIA roles?**
R: Usa `getByTestId()` como fallback y contacta al team de frontend.

**P: ¿Puedo usar XPath si no hay otra opción?**
R: Evítalo. Busca ARIA roles, labels o test IDs primero.

**P: ¿Cómo corro solo un AC?**
R: `bun test:e2e --grep @AC-XXX`

**P: ¿Qué hago si un test es flaky?**
R: Revisa timeouts, datos únicos y assertions explícitas.

---

## 🚀 Comandos Útiles

```bash
# Fijar automáticamente lo posible
bun fix

# Validar todo
bun quality:all

# Correr solo tests de autenticación
bun test:e2e tests/e2e/auth/

# Correr solo un AC
bun test:e2e --grep @AC-AUTH-01

# Ver reporte HTML
bun test:e2e:report

# Lint solo tu código
bun lint tests/

# Fijar lint issues
bun lint:fix
```

---

## 📝 Notas Finales

- **Datos únicos** → Tests paralelos sin colisiones
- **Selectores por rol** → Tests resilientes a cambios UI
- **Page objects** → Tests legibles y mantenibles
- **Tags AC** → Trazabilidad a requirements
- **Assertions claras** → Fácil debuggear fallos

Si algo no está claro, abre un issue con la etiqueta `testing-guidelines`.
