# Power Automate: Moderator directory write (create / update)

This guide creates the **write** flow that the Admin app uses when you click **Add User** or **Edit** on **Moderator Hub → Moderators → All**.

The existing read flow (**Orbit App Mod Info**) only *lists* rows. This new flow *writes* rows to the same Excel table.

After you finish, paste the flow’s HTTP POST URL into `ADMIN_PA_MODERATOR_WRITE_URL` in `twilight.js`. Until that constant is set, the app keeps your form draft and shows a “write flow not configured” message (it will not pretend to save locally).

---

## What you need open

1. [Power Automate](https://make.powerautomate.com/) (same environment as **Orbit App Mod Info**)
2. The SharePoint Excel file that backs the moderator directory (same workbook/table the read flow uses)
3. The Orbit app repo file `twilight.js` (to paste the URL at the end)

---

## Step A — Duplicate the read flow (optional but helpful)

1. In Power Automate, open **My flows** (or **Cloud flows**).
2. Find **Orbit App Mod Info** (the flow behind `ADMIN_PA_MODERATORS_URL`).
3. Open the **⋯** menu → **Save as** / **Save a copy**.
4. Name the copy: **Orbit App Mod Info Write**.
5. Open the copy. **Delete every action** inside it so you start clean (keep only an empty canvas).  
   You mainly want the same *environment / connections* as the read flow.

If you prefer not to duplicate: **Create** → **Instant cloud flow** → name **Orbit App Mod Info Write** → skip the trigger picker for now (you will add HTTP in the next step).

---

## Step B — Trigger: When an HTTP request is received

1. Click **+ New step** (or **Add trigger**).
2. Search for **When an HTTP request is received**.
3. Select that trigger (Request connector).
4. Under **Request Body JSON Schema**, click **Use sample payload to generate schema** (or paste the schema below).
5. Paste this sample JSON, then click **Done**:

```json
{
  "operation": "create",
  "orbitLoginId": "Jamie-orbit",
  "firstName": "Jamie",
  "lastName": "Lee",
  "LoginRole": "Mod",
  "phoneNumber": "5551234567",
  "centificEmail": "jamie.lee@centific.com",
  "personalEmail": "jamie@example.com",
  "modAddress": "123 Main St",
  "zipcode": "98052",
  "timeOff": "No",
  "smartPhone": "iOS",
  "carType": "Sedan",
  "off-date": ""
}
```

6. Confirm the schema includes at least:

| Field | Notes |
|--------|--------|
| `operation` | `"create"` or `"update"` |
| `orbitLoginId` | Unique key (same as Excel **Orbit Login ID** column) |
| `firstName`, `lastName` | Required by the app |
| `LoginRole` | App writes `Mod`, `Reviewer`, or `Admin` |
| `phoneNumber`, `centificEmail`, `personalEmail`, `modAddress`, `zipcode`, `timeOff`, `smartPhone`, `carType`, `off-date` | Optional profile fields |

Exact JSON schema you can paste instead of generating:

```json
{
  "type": "object",
  "properties": {
    "operation": { "type": "string" },
    "orbitLoginId": { "type": "string" },
    "firstName": { "type": "string" },
    "lastName": { "type": "string" },
    "LoginRole": { "type": "string" },
    "phoneNumber": { "type": "string" },
    "centificEmail": { "type": "string" },
    "personalEmail": { "type": "string" },
    "modAddress": { "type": "string" },
    "zipcode": { "type": "string" },
    "timeOff": { "type": "string" },
    "smartPhone": { "type": "string" },
    "carType": { "type": "string" },
    "off-date": { "type": "string" }
  },
  "required": ["operation", "orbitLoginId", "firstName", "lastName", "LoginRole"]
}
```

7. **Method**: leave as the default that allows **POST** (the app sends POST).

> Do not put secrets in the schema. The trigger URL already includes a signature (`sig=…`), same pattern as the existing read URL.

---

## Step C — Condition: create vs update

1. Click **+ New step** → search **Condition**.
2. Left box: click **Dynamic content** → choose **operation** from the trigger.
3. Middle: **is equal to**.
4. Right box: type `create` (no quotes in the UI value box).

You now have **If yes** (create) and **If no** (update).

---

## Step D — Create path: Add a row into a table

1. Inside **If yes**, click **Add an action**.
2. Search **Excel Online (Business)** → **Add a row into a table**.
3. Sign in with the same account used by **Orbit App Mod Info** if prompted.
4. Fill location fields exactly as the read flow does:

   - **Location**: the SharePoint site  
   - **Document Library**: the library  
   - **File**: the moderator master Excel file  
   - **Table**: the same table the read flow lists (often something like `Table1` — copy from the read flow)

5. Map columns (use **Dynamic content** from the trigger body). Use the **exact Excel column names** from your sheet. Current directory columns are:

| Excel column | Map from trigger |
|--------------|------------------|
| orbitLoginId | orbitLoginId |
| firstName | firstName |
| lastName | lastName |
| phoneNumber | phoneNumber |
| centificEmail | centificEmail |
| personalEmail | personalEmail |
| modAddress | modAddress |
| zipcode | zipcode |
| timeOff | timeOff |
| smartPhone | smartPhone |
| carType | carType |
| off-date | off-date |
| LoginRole | LoginRole |

6. Leave any unused Excel columns blank if they are not in the app payload.

---

## Step E — Update path: Update a row

Excel Online’s **Update a row** action needs a **key column**. Use **orbitLoginId** (Orbit Login ID) as the key — that matches how the app identifies people.

1. Inside **If no**, click **Add an action**.
2. Search **Excel Online (Business)** → **Update a row**.
3. Same Location / Library / File / Table as the create step.
4. **Key Column**: choose **orbitLoginId** (or the exact column title shown in the dropdown for Orbit Login ID).
5. **Key Value**: Dynamic content → **orbitLoginId** from the trigger.
6. Map every supported field the same way as the create step (firstName, lastName, LoginRole, phoneNumber, emails, address, zipcode, timeOff, smartPhone, carType, off-date).

> If your tenant’s Excel connector refuses to key off `orbitLoginId` and only offers `ItemInternalId`, you have two options: (1) add a helper “List rows” + “Filter” by orbitLoginId then update by `ItemInternalId`, or (2) ask IT to ensure the table column can be used as a key. Prefer keying by **orbitLoginId** so the app payload stays simple.

---

## Step F — Response action (success)

Add a **Response** action **after** the Condition (so both branches finish before responding), or add one Response inside each branch.

1. **+ New step** → **Response** (Request connector).
2. **Status Code**: `200`.
3. **Headers**: add  

   - `Content-Type` = `application/json`  
   - Optional CORS (browser calls from the static app):  
     - `Access-Control-Allow-Origin` = `*`  
     (or your exact app origin if your security team prefers that)  
     - `Access-Control-Allow-Methods` = `POST, OPTIONS`  
     - `Access-Control-Allow-Headers` = `Content-Type`

4. **Body**:

```json
{ "ok": true }
```

### Error guidance

- If Excel add/update fails, the flow will fail and the app shows the error text from the failed run.
- Open **Run history** on the flow → open the failed run → expand the Excel action → fix column name mismatches (most common issue).
- Duplicate `orbitLoginId` on create: either let Excel fail, or add a Condition that lists rows first and returns `{ "ok": false, "error": "duplicate" }` with status `409`. The app already blocks duplicates in the UI when the directory is loaded.

---

## Step G — Turn on and copy the URL

1. Click **Save**.
2. Click **Turn on** if the flow is off.
3. Open the **When an HTTP request is received** trigger.
4. Copy the **HTTP POST URL**.
5. In `twilight.js`, find:

```js
const ADMIN_PA_MODERATOR_WRITE_URL = '';
```

6. Paste the URL between the quotes:

```js
const ADMIN_PA_MODERATOR_WRITE_URL = 'https://…/triggers/manual/paths/invoke?…&sig=…';
```

7. Deploy / refresh the app (hard refresh the browser).

### CORS / security notes

- Same model as the existing moderator **read** URL: the browser calls a signed Power Automate URL directly.
- Do **not** put passwords, client secrets, or connection strings in this doc or in the app.
- Anyone with the signed URL can invoke the flow. Treat the URL like a credential; rotate by recreating the trigger URL if it leaks.
- Prefer restricting SharePoint/Excel permissions on the connection account to only the moderator workbook.

---

## Step H — Click-by-click test from the app

1. Open the app → sign in as **Admin-orbit** (or another allowlisted admin).
2. Go to **Moderator Hub** → **Moderators** → **All**.
3. Confirm **Grid** / **List** toggle works (default Grid).
4. Click **Add User**.
5. Leave Orbit Login ID blank → click **Create user** → you should see a required-field error.
6. Fill Orbit Login ID, First Name, Last Name, choose Login Role **Moderator** → Save.
7. If `ADMIN_PA_MODERATOR_WRITE_URL` is still empty: you get the configure banner and your draft stays. Paste the URL, refresh, try again.
8. After a successful save: the directory reloads and the new person appears in Grid and List.
9. Click **Edit** on a card or list row → change phone or role → **Save changes** → confirm the list refresh shows the new values.
10. In Excel / SharePoint, confirm the row was added or updated.

### LoginRole values the app writes

| UI label | Value stored in Excel `LoginRole` |
|----------|-----------------------------------|
| Moderator | `Mod` (matches existing rows) |
| Reviewer | `Reviewer` |
| Admin | `Admin` |

### Admin login note (important)

- **Admin-orbit**, **Ritu-Orbit**, and **John-Orbit** are passwordless (hardcoded allowlist). Every other directory user (moderators, reviewers, and directory `LoginRole = Admin` rows) signs in through the dedicated login flow (`ADMIN_PA_MODERATOR_LOGIN_URL` — see `docs/power-automate-moderator-login.md`).
- Creating a directory row with `LoginRole = Admin` stores the role for display/directory purposes. After a successful password auth response, `LoginRole = Admin` still routes into the admin app. Do not reuse the directory read URL for login, and never map Password into the read Response.

---

## Quick checklist

- [ ] Flow named **Orbit App Mod Info Write**
- [ ] Trigger = **When an HTTP request is received** with schema above
- [ ] Condition on `operation` = `create`
- [ ] Create → Excel **Add a row into a table** (all columns mapped)
- [ ] Update → Excel **Update a row** keyed by **orbitLoginId**
- [ ] Response `{ "ok": true }` with CORS headers if needed
- [ ] Flow **On**
- [ ] HTTP POST URL pasted into `ADMIN_PA_MODERATOR_WRITE_URL`
- [ ] Tested Add User + Edit from Admin → Moderators → All
