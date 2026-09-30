/* eslint-disable */
// Este archivo tiene ejemplos de lo que SÍ y NO hacer

/**

- ============================================================
- EJEMPLOS: DATOS ÚNICOS POR TEST
- ============================================================
  */

// ❌ MALO: Hardcodeado, causa colisiones en tests paralelos
async function badDataExample() {
const user = {
email: "test@example.com", // Siempre igual, múltiples tests compiten
name: "Test User",
password: "password123",
};
return user;
}

// ✅ BUENO: Datos únicos por ejecución
async function goodDataExample() {
import { uniqueEmail } from "../test-data/unique.js";

const user = {
email: uniqueEmail("my-test"), // Único cada vez
name: "Test User",
password: "password123",
};
return user;
}

// ✅ BUENO: Datos compartidos (iguales en cada test, pero explícito)
async function sharedDataExample() {
import users from "../test-data/users.json";

const baseUser = users.ada; // Mismo en cada test, se usa como base
const user = {
...baseUser,
email: uniqueEmail("login-flow"), // Email único, otros datos compartidos
};
return user;
}

/**

- ============================================================
- EJEMPLOS: SELECTORES POR ROL
- ============================================================
  */

// ❌ MALO: Selectores CSS directos (frágiles)
class BadLoginPage {
constructor(page) {
this.emailInput = page.locator(".email-field"); // CSS directo
this.passwordInput = page.locator("input[type='password']"); // Selector de atributo
this.submitButton = page.locator("#login-btn"); // ID directo
this.errorAlert = page.locator(".alert.alert-danger"); // CSS classes
}
}

// ❌ MALO: XPath complejos (ilegibles y frágiles)
class BadXPathPage {
constructor(page) {
this.email = page.locator("//form//input[@type='email']");
this.password = page.locator("//form//input[@type='password']");
this.submit = page.locator("//button[contains(text(), 'Login')]");
}
}

// ✅ BUENO: Selectores por rol (accesibles, resilientes)
class GoodLoginPage {
constructor(page) {
// 1. Por rol (mejor - accesible)
this.emailInput = page.getByRole("textbox", { name: "Email" });
this.submitButton = page.getByRole("button", { name: "Log in" });

    // 2. Por label (para campos de formulario)
    this.passwordInput = page.getByLabel("Password");

    // 3. Por texto visible (para mensajes)
    this.errorAlert = page.getByRole("alert");

}
}

/**

- ============================================================
- ESTRUCTURA DE PAGE OBJECTS
- ============================================================
  */

// ❌ MALO: Selectores sueltos, sin organización
class BadOrderForm {
constructor(page) {
this.firstName = page.locator(".first-name");
this.email = page.locator(".email");
this.age = page.locator(".age");
this.country = page.locator(".country-select");
this.terms = page.locator(".checkbox-terms");
this.submit = page.locator(".btn-submit");
this.successMsg = page.locator(".success-alert");
}
}

// ✅ BUENO: Selectores organizados por rol/sección
class GoodOrderForm {
constructor(page) {
// Sección de datos personales
this.firstNameInput = page.getByLabel("First Name");
this.emailInput = page.getByRole("textbox", { name: "Email" });
this.ageInput = page.getByLabel("Age");

    // Sección de ubicación
    this.countrySelect = page.getByRole("combobox", { name: "Country" });

    // Aceptación de términos
    this.termsCheckbox = page.getByRole("checkbox", { name: "I accept terms" });

    // Acciones
    this.submitButton = page.getByRole("button", { name: "Place Order" });

    // Feedback
    this.successMessage = page.getByRole("status");

}
}

/**

- ============================================================
- TESTS CON BUENAS PRÁCTICAS
- ============================================================
  */

// ❌ MALO: Múltiples violaciones
async function badTest({ page }) {
// 1. Datos hardcodeados
const email = "testuser@example.com";
const password = "password123";

// 2. Selectores CSS directos
await page.locator(".email-input").fill(email);
await page.locator("#pwd-field").fill(password);
await page.locator(".login-btn").click();

// 3. Sin assertions claras
await page.waitForTimeout(2000);
const success = await page.locator(".success").isVisible();
}

// ✅ BUENO: Sigue todas las guías
async function goodTest({ loginPage, authClient }) {
// 1. Datos únicos
const email = uniqueEmail("login-flow");
const password = "secure-pw";

// 2. Usa page objects con selectores por rol
await loginPage.goto();
await loginPage.emailInput.fill(email);
await loginPage.passwordInput.fill(password);
await loginPage.submitButton.click();

// 3. Assertions claras y explícitas
await expect(page).toHaveURL("/dashboard");
await expect(loginPage.navigation.userName).toContainText("Welcome");

// 4. Tag AC (acceptance criteria)
test("user can login with valid credentials", { tag: "@AC-AUTH-01" }, async () => {
// test body
});
}

/**

- ============================================================
- FIXTURES - PARA EVITAR REPETIR DATOS ÚNICOS
- ============================================================
  */

// ✅ Define un fixture para usuarios autenticados
export const test = base.extend({
signedInUser: async ({ authClient, page }, use) => {
// Genera datos únicos automáticamente
const user = {
email: uniqueEmail("signed-in"),
name: "Test User",
password: "secure-pw",
};

    // Registra y autentica
    await authClient.registerUser(user);
    const session = await authClient.loginUser(user);
    await seedBrowserSession(page, session);

    // Pasa el usuario al test
    await use({ ...user, session });

    // Cleanup si es necesario
    await authClient.deleteUser(user.email);

},
});

// En el test:
test("logged-in users see personalized dashboard", async ({ signedInUser, page }) => {
// signedInUser ya tiene datos únicos y está autenticado
const { name } = signedInUser;

await page.goto("/dashboard");
await expect(page.getByText(`Welcome, ${name}`)).toBeVisible();
});

/**

- ============================================================
- ORDEN DE PREFERENCIA PARA SELECTORES
- ============================================================
  */

// Orden de preferencia (de mejor a peor):
class SelectorPreference {
constructor(page) {
// 1️⃣ MEJOR: getByRole
// - Accesible (respeta ARIA)
// - Resiliente a cambios de CSS
// - Testea como lo hace un usuario real
this.button1 = page.getByRole("button", { name: "Click me" });
this.textbox1 = page.getByRole("textbox", { name: "Email" });
this.link1 = page.getByRole("link", { name: "Home" });

    // 2️⃣ BUENO: getByLabel
    // - Para campos con <label>
    // - Semántico y accesible
    this.email2 = page.getByLabel("Email Address");

    // 3️⃣ ACEPTABLE: getByText
    // - Para contenido visible
    // - Fácil de leer y mantener
    this.heading = page.getByText("Welcome");

    // 4️⃣ ÚLTIMO RECURSO: getByTestId
    // - Requiere cambios en HTML (<data-testid>)
    // - Úsalo solo cuando no hay alternativa
    this.advancedSettings = page.getByTestId("advanced-options");

    // ❌ NUNCA: Selectores CSS directos
    // this.bad1 = page.locator(".btn.btn-primary");
    // this.bad2 = page.locator("#email-field");
    // this.bad3 = page.locator("button[type='submit']");

    // ❌ NUNCA: XPath complejos
    // this.bad4 = page.locator("//div[@class='form']//input[@type='email']");

}
}

/**

- ============================================================
- VALIDACIONES Y ASSERTIONS
- ============================================================
  */

// ❌ MALO: Sin validar el tipo de dato
async function badAssertion() {
const result = await api.createUser(data);
// Asume que está bien sin verificar
return result;
}

// ✅ BUENO: Valida el resultado explícitamente
async function goodAssertion() {
const response = await api.createUser(data);

// Verifica el status HTTP
await expect(response).toHaveStatus(201);

// Verifica la estructura del JSON
const json = await response.json();
expect(json).toHaveProperty("id");
expect(json).toHaveProperty("email");
expect(json.email).toBe(data.email);
}

/**

- ============================================================
- TEST TAGGING (ACCEPTANCE CRITERIA)
- ============================================================
  */

// ❌ MALO: Sin tags, difícil saber qué prueba
test("test something", async ({ page }) => {
// ¿Qué acceptance criteria cubre?
});

// ✅ BUENO: Con tags AC explícitos
test("user can login with valid email and password",
{ tag: "@AC-AUTH-01" }, // Mapea a un AC específico
async ({ loginPage }) => {
// Test body
}
);

// Ejecutar solo los tests de un AC:
// bun test:e2e --grep @AC-AUTH-01
