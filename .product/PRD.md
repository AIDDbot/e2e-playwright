# PRD — Demo (front-standard + back-express)

Framework-free web client served at `http://localhost:4000`, consuming the API at `http://localhost:3000`. Requirements below drive the Playwright end-to-end suite.

## Requirements

### Web client

- **F0001**: The system SHALL render on every page a navigation bar with the application title linking to `/`, the menu links "Home" and "About", and a theme toggle button.
- **F0002**: WHEN a user follows a link or uses the browser back and forward buttons, the system SHALL render the matching page without a full reload and update the URL and the document title.
- **F0003**: WHEN a user opens any route directly by URL or reloads it, the system SHALL render the page for that route.
- **F0004**: WHEN a user visits `/`, the system SHALL show the application title, a welcome message, and an "Engineering" list of links to `/items/1` through `/items/4`.
- **F0005**: WHEN a user visits `/items/{id}`, the system SHALL show the heading "Item #{id}", rendering the id as literal text, and a link back home.
- **F0006**: WHEN a user visits `/about` and the API health endpoint responds, the system SHALL show the server uptime in seconds and the number of recorded runs.
- **F0007**: IF the API health request fails, THEN the system SHALL show "Health unavailable."
- **F0008**: IF a user visits a route that matches no page, THEN the system SHALL show "Page not found", the requested path, and a link back home.
- **F0009**: WHEN a user clicks the theme toggle, the system SHALL switch between dark and light themes and keep the choice after a reload.

### API

- **F0010**: WHEN a client requests `GET /api/health`, the system SHALL respond `200` with a JSON body containing the numeric server `uptime` in seconds and the number of recorded `runs`.
- **F0011**: WHILE the server keeps running, the system SHALL report a strictly increasing `uptime` on successive health requests.
- **F0012**: WHEN the web client calls the API from its own origin, the system SHALL allow the cross-origin request (CORS).
