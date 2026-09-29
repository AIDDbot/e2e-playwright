// User-visible texts the tests assert, in one place so a copy change is a one-line edit.
// Accessible names of controls ("Log in", "Email") stay in the page objects that locate them.
// The app title and author are not here: they come from the front package.json (run-context.ts).

export const copy = {
  about: {
    heading: "About",
    healthSummary: /Server up for \d+s — \d+ run\(s\) recorded\./,
    healthUnavailable: "Health unavailable.",
    title: (appTitle: string): string => `About — ${appTitle}`,
  },
  auth: {
    emailAlreadyRegistered: "Email already registered",
    invalidCredentials: "Invalid credentials",
    registrationSuccess: "Registration successful. Please log in.",
    requiredFields: "Email, name, and password are required",
  },
  home: {
    archetypesHeading: "Archetypes",
    trustMessage: /trust/i,
  },
  item: {
    heading: (id: string | number): string => `Item #${id}`,
    title: "Item — Details",
  },
  notFound: {
    heading: "Page not found",
  },
} as const;
