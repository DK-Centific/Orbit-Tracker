# Power Automate: TeamLog `personalEmail` (Lakitu project link)

The app stores the team’s Lakitu project link as **JSON inside the existing TeamLog Excel column `personalEmail`**. No new Excel column is required.

Example value written by the app:

```json
{"type":"teamLakituProject","version":1,"lakituProjectKey":"centific-1","lakituProjectUrl":"https://lakitu.ring.amazon.dev/project/..."}
```

Moderator directory rows still use a real personal email. Only **TeamLog** uses this column for the JSON payload.

## Do you need to change Power Automate?

**Usually no.** If your TeamLog **write** flow already maps `personalEmail` from the HTTP body into the Excel `personalEmail` column, you are done. Save a team with a Lakitu project in Admin and confirm the Excel cell shows the JSON above.

**Only if `personalEmail` is missing from the write mapping**, do the clicks below.

## Exact clicks (only if mapping is missing)

1. Open [Power Automate](https://make.powerautomate.com/).
2. Open **My flows** (or **Cloud flows**).
3. Open the **TeamLog write** flow (the one whose URL is in `TEAMLOG_PA_WRITE_URL` in `twilight.js`).
4. Click the **When an HTTP request is received** trigger.
5. If the schema has no `personalEmail` field: click **Use sample payload to generate schema**, paste a sample body that includes `"personalEmail": "{\"type\":\"teamLakituProject\",\"version\":1,\"lakituProjectKey\":\"centific-1\",\"lakituProjectUrl\":\"https://example.com\"}"`, then click **Done**.
6. Click the **Add a row** (Excel) action.
7. Find the **personalEmail** field.
8. Click it → **Dynamic content** → choose **personalEmail** from the trigger body (same as `centificEmail` / `orbitLoginId`).
9. Click **Save**.
10. In Admin, edit a team, pick a Lakitu project, save, then refresh Excel and confirm `personalEmail` shows the JSON.

The **TeamLog read** flow only needs to return the `personalEmail` column with the other columns (no special parsing in Power Automate — the app parses the JSON).
