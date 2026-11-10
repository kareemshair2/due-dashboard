# DUE Apps Script Proxy (production data source)

This folder contains the Google Apps Script Web App that reads the DUE Google Sheet and returns JSON for the dashboard. It replaces the public `gviz` endpoint in production. Data flows through the deployment instead of the browser reading the spreadsheet directly.

## What it does

- Reads three tabs, read-only: `Orders`, `BRANCHES&AGENTS`, `Cars`.
- Returns the same shape the dashboard already parses:
  - `tabs.orders`, `tabs.branches`, `tabs.cars`
  - each tab has `headers`, `rows`, `label`, `name`, `fetchedAt`
- Converts real Google Sheets date cells to `yyyy-MM-dd` strings so the dashboard does not have to guess between `D/M` and `M/D`.
- Trims trailing blank rows and caps the read at `MAX_ROWS`.
- Caches the response with `CacheService` for `CACHE_SECONDS` (default 300).
- Supports JSONP through `?callback=name` and plain JSON without a callback.
- Contains no write calls and no client secrets. A built-in `DEFAULT_SPREADSHEET_ID` lets the deployment run without any Script Properties; setting them overrides the default.

## Setup

1. Open <https://script.google.com> and create a new standalone project.
2. Replace the default `Code.gs` with this folder's `Code.gs`.
3. Open **Project Settings** and enable **Show "appsscript.json" manifest file in editor**.
4. Replace the manifest with this folder's `appsscript.json`.
5. (Optional) In **Project Settings → Script Properties**, add overrides if you want to point the deployment elsewhere:

   | Property | Value |
   | --- | --- |
   | `SPREADSHEET_ID` | the Google Sheets file ID (falls back to the built-in default) |
   | `SHEET_ORDERS` | `Orders` |
   | `SHEET_BRANCHES` | `BRANCHES&AGENTS` |
   | `SHEET_CARS` | `Cars` |
   | `CACHE_SECONDS` | `300` (optional) |
   | `MAX_ROWS` | `5000` (optional) |

   Skipping this step works out of the box with the default DUE spreadsheet.

6. Run `testConnection` once in the editor and approve the read-only Sheets scope.
7. Check the execution log: each tab should report its header count and row count.
8. Deploy → **New deployment** → **Web app**:
   - Execute as: **Me**
   - Who has access: **Anyone**
9. Copy the `/exec` URL.
10. In `js/config.js` set:

    ```js
    provider: "apps-script",
    appsScriptUrl: "https://script.google.com/macros/s/.../exec",
    ```

## Verify the deployment

Plain JSON:

```bash
curl -L "https://script.google.com/macros/s/XXXX/exec"
```

JSONP (what the dashboard uses):

```bash
curl -L "https://script.google.com/macros/s/XXXX/exec?callback=dueTest"
```

Expected response:

```json
{
  "ok": true,
  "provider": "apps-script",
  "tabs": {
    "orders": { "headers": ["التاريخ", "إسم العميل ", "الحالة", "الكمية"], "rows": [] },
    "branches": { "headers": ["التاريخ", "الفرع", "عدد PICK UP"], "rows": [] },
    "cars": { "headers": ["التاريخ", "وردية", "اسم السائق", "العربة"], "rows": [] }
  },
  "errors": [],
  "meta": { "title": "...", "timeZone": "Africa/Cairo", "cacheHit": false }
}
```

Use `?nocache=1` to bypass the script cache during testing.

## Security notes

- The Web App URL is a bearer credential. Anyone with the URL can read the tabs covered by the deployment. Do not post it publicly, commit it, or put it in screenshots.
- If the company uses Google Workspace, you can restrict the deployment instead of making it anonymous: set `access` to `DOMAIN` in `appsscript.json` (and choose "Anyone within <domain>" in the deploy dialog). The dashboard then only works for signed-in domain users.
- The deployment runs as the deploying account with the read-only Sheets scope. It cannot write to the spreadsheet.
- If the URL leaks: **Deploy → Manage deployments → Archive** the old version, create a new deployment, and update `js/config.js`.
- Keep `CACHE_SECONDS` above zero in normal use. It reduces quota usage and hides the sheet behind a short cache window.
- This project does not include a service-account private key or OAuth client secret. Apps Script holds the authorization server-side.

## Troubleshooting

| Symptom | Likely cause |
| --- | --- |
| `SPREADSHEET_ID غير مضبوط` | The built-in default was cleared and no `SPREADSHEET_ID` Script Property is set. |
| `التاب "..." غير موجود` | Tab name does not match `SHEET_*`. Check spelling and `&`. |
| Empty `rows` | Sheet is empty, the range is wrong, or the deployment account cannot open the file. |
| `ok: false` | Open the Apps Script execution log for the stack trace. |
| Dashboard shows a schema error | A required header was renamed. Update the sheet header or the aliases in `js/data/schema.js`. |
