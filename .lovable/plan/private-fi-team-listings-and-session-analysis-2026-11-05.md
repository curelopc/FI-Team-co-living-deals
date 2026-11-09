# Private FI Team listings and session analysis

- Replace the home table with filtered active Research cards beside an OpenStreetMap map. Live access is confirmed for Craig's connected Google Sheets account.
- Use Research IDs for deal pages and prefer denser underwriting only when street addresses match. Preserve the existing pitch sections and missing-data states.
- Add labeled session-only rent and financing inputs, live dashboard calculations, editable CapEx, and Reset to original. Use the specified Fraser/Grove model assumptions.
- Keep Craig-only magic links, all sheet requests read-only, no thefiteam.com links, and no publishing.
- Verify eligibility and financial calculations with tests, then exercise filtering, map navigation, edits and Reset while signed in as Craig.

## Technical details
Extend existing authenticated server reads. Keep Research normalization and calculator math in pure modules. Load Leaflet only in the browser. Store edits solely in React state. Treat “public feed” as the data source description, not permission to remove private access.
