# Power Automate: Orbit App Password Auth

This guide creates a **new** flow for password login and first-time password change. It does **not** replace the existing moderator directory read or write flows.

After you finish, paste the flow’s HTTP POST URL into `ADMIN_PA_AUTH_URL` in `twilight.js`. Until that constant is set:

- **Admin-orbit** still signs in without a password
- Every other user sees: **Password login is not configured yet**

---

## Important security notes (read first)

1. Passwords in your Excel **Password** column are stored as **plain text** with the current Excel + Power Automate setup. This is **not** enterprise-grade authentication (no hashing, no MFA, no identity provider).
2. The app **never** downloads, compares, logs, or stores Excel passwords in the browser. Comparison happens **only** inside this Power Automate flow.
3. The signed HTTP URL (`sig=…`) can call this flow. Treat it like a secret: do not paste it into tickets, chat, or screenshots.
4. Anyone with edit access to the Excel workbook can read passwords. Limit SharePoint/OneDrive permissions.
5. You must also remove `Password` from the **directory read** flow response (steps at the end). Otherwise the Admin Moderators list could expose passwords to the browser.

---

## What you need open

1. [Power Automate](https://make.powerautomate.com/) (same environment as **Orbit App Mod Info**)
2. Excel file **Moderator_Masterlist.xlsx** → table **Moderator** (same table the directory flows use)
3. The Orbit app file `twilight.js` (to paste the URL at the end)

---

## Step A — Create the new flow

1. In Power Automate, open **My flows** (or **Cloud flows**).
2. Click **+ New flow** → **Instant cloud flow** (or **Create** → **Instant cloud flow**).
3. Flow name: **`Orbit App Password Auth`**
4. Skip picking a trigger for now if prompted, then click **Create**.
5. On the empty canvas, click **Add a trigger** (or **+ New step** if you already have a blank trigger).

> Do **not** edit **Orbit App Mod Info** or the moderator write flow for authentication. This is a separate flow.

---

## Step B — Trigger: When an HTTP request is received

1. Search for **When an HTTP request is received**.
2. Select that trigger (Request connector).
3. **Method**: **POST**
4. Under **Request Body JSON Schema**, click **Use sample payload to generate schema**.
5. Paste this sample, then click **Done**:

```json
{
  "operation": "login",
  "orbitLoginId": "Jamie-orbit",
  "password": "example-current",
  "newPassword": "example-new-password"
}
```

6. Or paste this exact schema:

```json
{
  "type": "object",
  "properties": {
    "operation": { "type": "string" },
    "orbitLoginId": { "type": "string" },
    "password": { "type": "string" },
    "newPassword": { "type": "string" }
  },
  "required": ["operation", "orbitLoginId", "password"]
}
```

7. Leave the URL blank for now — Power Automate shows the HTTP URL only after the first **Save**.

> Do not put real passwords or secrets in the schema. The trigger URL already includes a signature (`sig=…`).

---

## Step C — List rows from Excel

1. Click **+ New step**.
2. Search **Excel Online (Business)** → **List rows present in a table**.
3. Fill in:

| Field | Value |
|--------|--------|
| Location | Same SharePoint / OneDrive site as the directory flows |
| Document Library | Same library as **Moderator_Masterlist.xlsx** |
| File | **Moderator_Masterlist.xlsx** |
| Table | **Moderator** |

4. Optional but helpful: under **Advanced options**, raise **Top count** if your directory is large (e.g. `500` or `1000`) so the row is not missed.

---

## Step D — Find the matching user (Filter array)

1. Click **+ New step** → search **Filter array** (Data Operations).
2. **From**: select **value** from the List rows action (the array of Excel rows).
3. Click **Edit in advanced mode** (or use the expression editor) and set the filter so the row’s Orbit Login ID matches the request, **case-insensitive**.

Example expression for the left side (adjust the column name if your Excel header differs):

```
toLower(string(item()?['orbitLoginId']))
```

If your Excel header is **Orbit Login ID** (with spaces), use:

```
toLower(string(coalesce(item()?['orbitLoginId'], item()?['Orbit Login ID'], item()?['OrbitLoginId'])))
```

Right side (is equal to):

```
toLower(string(triggerBody()?['orbitLoginId']))
```

4. Click **+ New step** → **Compose** (name it **MatchedRow**).
5. Expression for Inputs:

```
first(body('Filter_array'))
```

(If Power Automate renamed the Filter action, pick that action’s body instead.)

6. Optional: add a **Condition** right after Compose:  
   `empty(outputs('MatchedRow'))` is equal to `true`  
   - **If yes** → go to **Response · invalid credentials** (Step G)  
   - **If no** → continue

---

## Step E — Branch by operation (login vs changePassword)

1. Click **+ New step** → **Condition**.
2. Left: `triggerBody()?['operation']`
3. Operator: **is equal to**
4. Right: `login`

- **If yes** → Login path (Step F)
- **If no** → Change password path (Step H)  
  (Optionally add a nested check that operation equals `changePassword`; anything else should return 400.)

---

## Step F — Login path

### F1 — Effective password

1. Add a **Compose** action named **StoredPassword**:

```
string(coalesce(outputs('MatchedRow')?['Password'], outputs('MatchedRow')?['password'], ''))
```

2. Add a **Compose** action named **EffectivePassword** with this expression:

```
if(equals(trim(outputs('StoredPassword')), ''), 'Twilight2006', outputs('StoredPassword'))
```

Meaning:

- If Excel **Password** is blank → effective password is the default **`Twilight2006`**
- Otherwise → effective password is the stored value

### F2 — Compare request password

1. Add a **Condition**:  
   `triggerBody()?['password']` **is equal to** `outputs('EffectivePassword')`

**If no (wrong password):**

- Add **Response** (Step G — invalid credentials)

**If yes (correct password):**

2. Add a **Compose** named **MustChangePassword**:

```
or(equals(trim(outputs('StoredPassword')), ''), equals(outputs('StoredPassword'), 'Twilight2006'))
```

**Chosen behavior (document this for your team):**

- `mustChangePassword` is **true** when Excel Password is **blank** (first login), **or** when the stored password is still exactly `Twilight2006`.
- That way users who somehow saved the default still must pick a real password.

3. Add **Response** — Status code **200**.

**Headers:**

| Name | Value |
|------|--------|
| Content-Type | application/json |
| Access-Control-Allow-Origin | * |

(If your org forbids `*`, set the exact origin where the Orbit app is hosted.)

**Body** — build with **Compose** then paste into Response, or use this JSON shape (map dynamic fields from **MatchedRow**; **never** include Password):

```json
{
  "ok": true,
  "mustChangePassword": true,
  "profile": {
    "orbitLoginId": "",
    "firstName": "",
    "lastName": "",
    "LoginRole": "",
    "phoneNumber": "",
    "centificEmail": ""
  }
}
```

In the designer, set:

- `mustChangePassword` → output of **MustChangePassword**
- `profile.orbitLoginId` → MatchedRow orbitLoginId / Orbit Login ID
- `profile.firstName` → firstName / First Name
- `profile.lastName` → lastName / Last Name
- `profile.LoginRole` → LoginRole
- `profile.phoneNumber` → phoneNumber / Phone Number
- `profile.centificEmail` → centificEmail / Centific Email

**Critical:** Do **not** put `Password`, `password`, or any secret field in this Response.

---

## Step G — Invalid credentials response (reuse everywhere)

Whenever the user is missing, the password is wrong, or current password fails on change:

1. **Response** action
2. Status code: **401**
3. Headers: same as above (`Content-Type`, `Access-Control-Allow-Origin`)
4. Body:

```json
{
  "ok": false,
  "error": "invalid_credentials"
}
```

Use this **same** generic body for “user not found” and “wrong password” so the app cannot tell which case it was.

---

## Step H — Change password path

Only runs when `operation` is `changePassword`.

### H1 — Verify current password (same rules as login)

1. Reuse **StoredPassword** / **EffectivePassword** (or duplicate the Compose expressions).
2. Condition: `triggerBody()?['password']` equals `outputs('EffectivePassword')`.
3. If no → **401** invalid credentials (Step G).

### H2 — Validate newPassword in Power Automate too

1. Add a **Condition** (or two):

- Length of `triggerBody()?['newPassword']` is greater than or equal to **8**
- `triggerBody()?['newPassword']` is **not equal to** `Twilight2006`

2. If validation fails → **Response** status **400**, body:

```json
{
  "ok": false,
  "error": "invalid_new_password"
}
```

### H3 — Update the Excel row

1. **+ New step** → Excel Online (Business) → **Update a row**.
2. Same Location / Library / File / Table as List rows.
3. **Key Column**: type the literal text **`orbitLoginId`**  
   (Must match the Excel column that uniquely identifies the user. If your column header is **Orbit Login ID**, use that exact header text instead.)
4. **Key Value**: dynamic content → **orbitLoginId** from the **HTTP trigger** (`triggerBody()?['orbitLoginId']`).
5. **Password** field: dynamic content → **newPassword** from the trigger.

**Preserving other columns:**

- In the Excel connector, leave every other column **blank / unmapped**.
- For **Update a row**, unmapped columns are typically **left unchanged** in the workbook. Do **not** map other fields to empty strings unless you intend to clear them.
- If your connector build warns otherwise, map each other column explicitly to the existing MatchedRow value for that column.

### H4 — Success response

1. **Response** — Status **200**
2. Headers: same CORS / Content-Type as login
3. Body:

```json
{
  "ok": true
}
```

(Optional: include a safe `profile` object again; the app can also reuse the profile from the prior login.)

---

## Step I — Save, turn on, copy URL

1. Click **Save**.
2. Open the trigger **When an HTTP request is received** again.
3. Copy **HTTP POST URL**.
4. Ensure the flow is **On** (Turn on).
5. In `twilight.js`, find:

```js
const ADMIN_PA_AUTH_URL = '';
```

6. Paste the URL between the quotes:

```js
const ADMIN_PA_AUTH_URL = 'https://…/triggers/manual/paths/invoke?…&sig=…';
```

7. Save the file and refresh the Orbit app.

**Do not** paste this URL into the directory read or write constants. Those stay unchanged.

---

## Step J — Remove Password from the directory READ flow (critical)

The Admin **Moderators** screen still uses the directory **read** flow (`ADMIN_PA_MODERATORS_URL`). If that flow returns full Excel rows, the browser can see **Password**.

Do this on the **existing read flow** (for example **Orbit App Mod Info**), not on the new auth flow:

1. Open the read flow in Power Automate.
2. Find the **Response** action that returns the list to the app.
3. **Before** that Response, add **Data Operations → Select**.
4. **From**: the List rows **value** array (or whatever array you currently return).
5. **Map** only safe fields, for example:

| Map name | Map value (from item) |
|----------|------------------------|
| orbitLoginId | orbitLoginId / Orbit Login ID |
| firstName | firstName / First Name |
| lastName | lastName / Last Name |
| LoginRole | LoginRole |
| phoneNumber | phoneNumber |
| centificEmail | centificEmail |
| personalEmail | personalEmail |
| modAddress | modAddress |
| zipcode | zipcode |
| timeOff | timeOff |
| smartPhone | smartPhone |
| carType | carType |
| off-date | off-date |

6. **Do not** map `Password` / `password`.
7. Change the **Response** body to use the **Select** output (for example `body('Select')`), not the raw List rows output.
8. Save the read flow.

After this, the app directory profile never receives passwords.

---

## App request / response contract (for testers)

### Login

Request POST body:

```json
{
  "operation": "login",
  "orbitLoginId": "Jamie-orbit",
  "password": "…"
}
```

Success (200):

```json
{
  "ok": true,
  "mustChangePassword": false,
  "profile": {
    "orbitLoginId": "Jamie-orbit",
    "firstName": "Jamie",
    "lastName": "Lee",
    "LoginRole": "Mod",
    "phoneNumber": "5551234567",
    "centificEmail": "jamie.lee@centific.com"
  }
}
```

Failure (401): `{ "ok": false, "error": "invalid_credentials" }`

### Change password

```json
{
  "operation": "changePassword",
  "orbitLoginId": "Jamie-orbit",
  "password": "Twilight2006",
  "newPassword": "MyNewPass99"
}
```

Success (200): `{ "ok": true }`

---

## Testing checklist

1. Excel row for a test user: **Password** cell blank.
2. In the app, sign in with that Orbit Login ID and password `Twilight2006`.
3. You must see **Set a new password** (cannot enter the app yet).
4. Try a password shorter than 8 characters → rejected.
5. Try `Twilight2006` as the new password → rejected.
6. Set a valid new password → Excel **Password** updates; you enter the app.
7. Sign out. Try `Twilight2006` again → **Orbit Login ID or password is incorrect.**
8. Sign in with the new password → enters the app (no forced change).
9. Sign in as **Admin-orbit** with no password → still works.
10. Wrong password for a real user → same generic error as an unknown user.
11. With `ADMIN_PA_AUTH_URL` still empty: non–Admin-orbit users see the configure message; Admin-orbit still works.
12. Confirm browser **localStorage** has no password fields after login/logout.

---

## Checklist

- [ ] New flow named **Orbit App Password Auth** (separate from read/write)
- [ ] HTTP POST trigger with operation / orbitLoginId / password / newPassword
- [ ] List rows from Moderator_Masterlist.xlsx / Moderator
- [ ] Filter by orbitLoginId; never return Password
- [ ] Login: blank Password → default `Twilight2006`; `mustChangePassword` when blank or still default
- [ ] changePassword: verify current password; validate new; Update row Key Column `orbitLoginId`
- [ ] CORS headers on Responses
- [ ] Flow On; URL pasted into `ADMIN_PA_AUTH_URL` only
- [ ] Directory **read** flow Select excludes Password
- [ ] End-to-end test above passed

---

## What this does *not* claim

Server-side comparison stops the Orbit web app from mass-exposing passwords, but Excel plaintext storage and the signed PA URL remain sensitive. This is a practical control for your current PA/Excel setup — not a replacement for SSO or hashed credential storage.
