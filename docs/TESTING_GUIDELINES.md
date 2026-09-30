# Testing Guidelines

Esta guía documenta las prácticas obligatorias para mantener tests confiables, mantenibles y resilientes.

## Principios Fundamentales

### 1. Datos Únicos por Test (Única Verdad)

**Objetivo**: Evitar colisiones de datos cuando múltiples tests comparten la misma base de datos.

#### ✅ Correcto

```typescript
test("user can register with a unique email", async ({ registerPage }) => {
  const email = uniqueEmail("register-flow"); // Genera un email único
  const { name, password } = users.ada;

  await registerPage.goto();
  await registerPage.submit({ email, name, password });
  await expect(page).toHaveURL("/login?registered=1");
});

test("another test with different data", async ({ authClient }) => {
  const uniqueUser = {
    email: uniqueEmail("another-test"),
    name: "Different User",
    password: "secure-pw"
  };
  const response = await authClient.registerUser(uniqueUser);
  expect(response).toHaveStatus(201);
});
```

#### ❌ Incorrecto

```typescript
// ❌ Datos hardcodeados reutilizados - causará colisiones
test("user can register", async ({ registerPage }) => {
  await registerPage.submit({
    email: "testuser@example.com", // Siempre igual
    name: "Test User",
    password: "password123"
  });
});

test("another test", async ({ registerPage }) => {
  // Este test fallará porque el email ya existe
  await registerPage.submit({
    email: "testuser@example.com", // Conflicto
    name: "Another User",
    password: "password123"
  });
});
```

#### Funciones Disponibles

- **`uniqueEmail(label)`** - Genera email único
  ```typescript
  import { uniqueEmail } from "../test-data/unique.js";
  
  const email = uniqueEmail("auth-flow"); 
  // Resultado: "auth-flow-550e8400-e29b-41d4-a716-446655440000@example.com"
  ```

- **`users.json`** - Datos compartidos (NO generados)
  ```typescript
  import users from "../test-data/users.json";
  
  const { name, password } = users.ada; // Siempre igual, se usa en cada test
  ```

---

### 2. Localizadores por Rol (Accesibilidad y Resiliencia)

**Objetivo**: Usar selectores que sean accesibles e impermeables a cambios de CSS.

#### ✅ Correcto: Orden de Preferencia

```typescript
export class LoginPage extends AuthFormPage<LoginFields> {
  // 1️⃣ getByRole (mejor - accesible, resistente a cambios CSS)
  readonly emailInput: Locator = page.getByRole("textbox", { name: "Email" });
  readonly submitButton: Locator = page.getByRole("button", { name: "Log in" });
  
  // 2️⃣ getByLabel (para campos de formulario)
  readonly passwordInput: Locator = page.getByLabel("Password");
  
  // 3️⃣ getByText (para contenido visible)
  readonly errorMessage: Locator = page.getByText("Invalid credentials");
  
  // 4️⃣ getByTestId (último recurso - requiere cambios en HTML)
  readonly advancedOptions: Locator = page.getByTestId("advanced-options");
}
```

#### ❌ Incorrecto: Evita Estos Selectores

```typescript
export class LoginPage extends AuthFormPage<LoginFields> {
  // ❌ Selectores CSS directos (frágiles ante cambios de estilo)
  readonly emailInput: Locator = page.locator(".email-field");
  readonly submitButton: Locator = page.locator("#login-btn");
  
  // ❌ XPath complejos (ilegibles y difíciles de mantener)
  readonly password: Locator = page.locator("//input[@type='password']");
  
  // ❌ Selectores basados en atributos data- no estándares
  readonly form: Locator = page.locator("[data-component='loginForm']");
}
```

#### Ejemplo Completo: Page Object

```typescript
import { type Locator, type Page } from "@playwright/test";
import { copy } from "../test-data/copy.js";

export class AuthFormPage {
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly alert: Locator;

  constructor(
    page: Page,
    private readonly submitButtonLabel: string = "Log in"
  ) {
    // Por rol (accesibilidad)
    this.emailInput = page.getByRole("textbox", { name: "Email" });
    this.submitButton = page.getByRole("button", { name: this.submitButtonLabel });
    
    // Por label (semántica)
    this.passwordInput = page.getByLabel("Password");
    
    // Por texto visible
    this.alert = page.getByRole("alert");
  }

  async fill(email: string, password: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
  }

  async submit(): Promise<void> {
    await this.submitButton.click();
  }
}
```

---

## Estructura de Tests

### Organización por Rol

Agrupa los localizadores por su responsabilidad (rol en la UI):

```typescript
// ❌ Mala organización
export class HomePage {
  readonly heading: Locator;
  readonly logo: Locator;
  readonly search: Locator;
  readonly results: Locator;
  readonly navigation: Locator;
  readonly footer: Locator;
}

// ✅ Buena organización - por rol/sección
export class HomePage extends AppPage {
  // Búsqueda
  readonly searchInput: Locator = page.getByPlaceholder("Search items");
  readonly searchButton: Locator = page.getByRole("button", { name: "Search" });
  
  // Resultados
  readonly results: Locator = page.locator("[role='list']");
  
  // Navegación (heredada de AppPage)
  // readonly navigation = super.navigation;
}
```

---

## Fixtures y Test Data

### Usar Fixtures para Datos Compartidos

```typescript
import { test } from "../fixtures/index.js";

// ✅ Usa el fixture signedInUser para tests que requieren autenticación
test("only signed-in users can access protected routes", async ({ signedInUser, page }) => {
  // El fixture crea automáticamente un usuario único y lo autentica
  const { name } = signedInUser;
  
  await page.goto("/dashboard");
  await expect(page.getByText(`Welcome, ${name}`)).toBeVisible();
});

// ✅ Para tests de registro, genera tu propio email único
test("new users can register", async ({ registerPage }) => {
  const email = uniqueEmail("new-registration");
  
  await registerPage.goto();
  await registerPage.submit({ email, name: "New User", password: "secret" });
  await expect(page).toHaveURL("/login?registered=1");
});
```

### Estructura de Datos de Test

```typescript
// tests/test-data/users.json - Datos compartidos (mismos en cada test)
{
  "ada": {
    "name": "Ada Lovelace",
    "password": "s3cret-pw"
  }
}

// tests/test-data/unique.ts - Funciones para generar datos únicos
export const uniqueEmail = (label: string): string => 
  `${label}-${randomUUID()}@example.com`;

// tests/test-data/copy.ts - Textos verificables (UI copy)
export const copy = {
  auth: {
    registrationSuccess: "Registration successful!",
    invalidCredentials: "Invalid email or password"
  }
};
```

---

## Checklist para Cada Test

Antes de hacer commit, verifica:

- [ ] **Datos Únicos**: ¿Cada test genera datos únicos con `uniqueEmail()` o fixtures?
- [ ] **Selectores por Rol**: ¿Usa `getByRole()`, `getByLabel()`, `getByText()`?
- [ ] **Sin CSS Directo**: ¿Evita `.locator(".class")` o `#id`?
- [ ] **Page Objects**: ¿Los selectores están en Page Objects, no en tests?
- [ ] **Accesibilidad**: ¿Los localizadores de rol mejoran la accesibilidad?
- [ ] **Tags AC**: ¿Cada test tiene un tag `{ tag: "@AC-XXX" }`?

---

## Errores Comunes

### Error 1: Reutilizar Datos Fijos

```typescript
// ❌ FALLA EN CI PARALELO
const email = "testuser@example.com"; // Múltiples tests compiten
const user1 = await register(email);
const user2 = await register(email);
// user2 falla: Email ya existe
```

**Solución**:
```typescript
// ✅ FUNCIONA EN PARALELO
const email1 = uniqueEmail("test1");
const email2 = uniqueEmail("test2");
```

### Error 2: Selectores Frágiles

```typescript
// ❌ CSS Class (Cambiar estilo = test roto)
const button = page.locator(".btn.btn-primary.mt-4");

// ❌ XPath Complejo
const field = page.locator("//div[@class='form']//input[@name='email']");

// ✅ Por Rol (Accesible y robusto)
const button = page.getByRole("button", { name: "Submit" });
const field = page.getByRole("textbox", { name: "Email" });
```

### Error 3: Seleccionar el Rol Incorrecto

```typescript
// ❌ Selecciona el contenedor, no el campo
await page.getByRole("form").fill("email@test.com");

// ✅ Selecciona el campo específico
await page.getByRole("textbox", { name: "Email" }).fill("email@test.com");

// ✅ Usa getByLabel para inputs con label
await page.getByLabel("Email").fill("email@test.com");
```

---

## Validación Automática

### ESLint Rules (Propuesto)

Para forzar estas prácticas en CI:

```bash
# Lint y comprueba violaciones
bun run quality:all

# Fija automáticamente lo posible
bun run fix
```

### Reglas a Implementar (`.eslintrc.json`)

```json
{
  "rules": {
    "playwright/no-eval": "error",
    "playwright/no-wait-for-timeout": "error",
    "no-hardcoded-fixtures": "warn"
  }
}
```

---

## Referencias

- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [ARIA & Accessibility](https://www.w3.org/WAI/ARIA/apg/)
- [Test Data Management](https://martinfowler.com/bliki/TestDataBuilder.html)
- [Page Object Model](https://playwright.dev/docs/pom)

---

## Preguntas y Contribuciones

Si tienes dudas sobre estas prácticas, crea un issue con la etiqueta `testing-guidelines`.
