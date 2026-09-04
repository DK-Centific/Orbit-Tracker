# Power Automate: Orbit moderator login (password)

Click-by-click guide for a **new** HTTP flow that checks and sets passwords. It does **not** replace the existing moderator directory read (`ADMIN_PA_MODERATORS_URL`) or write flows.

After you finish, paste the flow’s HTTP POST URL into `ADMIN_PA_MODERATOR_LOGIN_URL` in `twilight.js` (leave it `''` until then).

Until that constant is set:

- **Admin-orbit**, **Ritu-Orbit**, and **John-Orbit** still sign in without a password
- Every other user sees: **Login flow is not configured yet** (no passwordless fallback)

---

## Important security notes (read first)

1. Excel stores passwords in the **Password** column as **plain text**. With Excel + Power Automate this is the best practical option; it is still better than sending all passwords to the browser. This is **not** enterprise auth (no hashing, no MFA, no IdP).
2. The app **never** downloads, compares, logs, or stores Excel passwords in the browser. Comparison happens **only** inside this flow.
3. Do **not** use the directory read flow (`ADMIN_PA_MODERATORS_URL`) for login. That flow must **not** return Password (see Step J).
4. The signed HTTP URL (`sig=…`) can call this flow. Treat it like a secret.
5. Anyone with edit access to the Excel workbook can read passwords. Limit SharePoint/OneDrive permissions.

---

## What you need open

1. [Power Automate](https://make.powerautomate.com/) (same environment as **Orbit App Mod Info**)
2. Excel file **Moderator_Masterlist.xlsx** → table **Moderator** (same table as the directory flows)
3. Column **Password** on that table (you renamed a table head to `Password`)
4. The Orbit app file `twilight.js` (to paste the URL at the end)

---

## Step A — Create the new flow

1. In Power Automate, open **My flows** (or **Cloud flows**).
2. Click **+ New flow** → **Instant cloud flow** (or **Create** → **Instant cloud flow**).
3. Flow name: **`Orbit App Moderator Login`**
4. Skip picking a trigger if prompted, then click **Create**.
5. On the empty canvas, click **Add a trigger** (or **+ New step**).

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
  "orbitLoginId": "David-orbit",
  "password": "Twilight2006",
  "newPassword": ""
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

> Do not put real passwords in the schema. The trigger URL already includes a signature (`sig=…`).

**Operations this flow supports:**

| `operation` | Purpose |
|-------------|---------|
| `login` | Check password; return public profile (+ `mustChangePassword` when Excel Password is blank) |
| `setPassword` | After first login, write a new Password into Excel |

---

## Step C — Look up the user row

You can use **Get a row** or **List rows** + filter. Both work if Key Column / filter match the Excel header for Orbit Login ID.

### Option 1 — Get a row (preferred when Key Column works)

1. Click **+ New step**.
2. Search **Excel Online (Business)** → **Get a row**.
3. Fill in:

| Field | Value |
|--------|--------|
| Location | Same SharePoint / OneDrive site as the directory flows |
| Document Library | Same library as **Moderator_Masterlist.xlsx** |
| File | **Moderator_Masterlist.xlsx** |
| Table | **Moderator** |
| **Key Column** | Type the plain text **`orbitLoginId`** (or your exact Excel header, e.g. `Orbit Login ID`) |
| **Key Value** | Dynamic content → **orbitLoginId** from the trigger |

**Critical:** For **Key Column**, type `orbitLoginId` as **plain text**. Do **not** insert a dynamic token. Pasting a dynamic value into Key Column is a known bug that breaks the lookup.

If Get a row fails when the user is missing, wrap it in **Configure run after** / handle empty, or use Option 2.

### Option 2 — List rows + Filter array

1. **+ New step** → Excel Online (Business) → **List rows present in a table** (same Location / Library / File / Table).
2. Optional: under **Advanced options**, raise **Top count** (e.g. `500` or `1000`).
3. **+ New step** → **Filter array** (Data Operations).
4. **From**: **value** from List rows.
5. Left expression (adjust header if needed):

```
toLower(string(coalesce(item()?['orbitLoginId'], item()?['Orbit Login ID'], item()?['OrbitLoginId'])))
```

Right side:

```
toLower(string(triggerBody()?['orbitLoginId']))
```

6. **+ New step** → **Compose** named **MatchedRow**:

```
first(body('Filter_array'))
```

7. **Condition**: `empty(outputs('MatchedRow'))` is equal to `true`  
   - **If yes** → **Response** 401 (unknown user) — Step G1  
   - **If no** → continue

For the rest of this guide, “the matched row” means the Get a row output **or** `outputs('MatchedRow')`.

---

## Step D — Branch by operation (`login` vs `setPassword`)

1. Click **+ New step** → **Condition**.
2. Left: `triggerBody()?['operation']`
3. Operator: **is equal to**
4. Right: `login` (plain text)

- **If yes** → Login path (Step E)
- **If no** → setPassword path (Step F)  
  (Optionally nest a check that operation equals `setPassword`; anything else → Response 400)

---

## Step E — Login branch

### E1 — Read Password column

1. **Compose** named **StoredPassword**:

```
string(coalesce(outputs('MatchedRow')?['Password'], outputs('MatchedRow')?['password'], ''))
```

(If you used Get a row, use that action’s outputs instead of `MatchedRow`.)

### E2 — Blank Password + default first login

1. **Condition**: `trim(outputs('StoredPassword'))` is equal to `''` (empty).

**If Password is blank:**

2. Nested condition: `triggerBody()?['password']` **is equal to** `Twilight2006` (exact, case-sensitive).

- **If yes** → Response **200**:

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

Map profile fields from the matched row (public fields only).  
**Never** include `Password` / `password` in the body.

Headers (same for all Responses in this flow):

| Name | Value |
|------|--------|
| Content-Type | application/json |
| Access-Control-Allow-Origin | * |

(If your org forbids `*`, use the exact origin where the Orbit app is hosted.)

- **If no** (blank Password but typed password ≠ `Twilight2006`) → Response **401**:

```json
{
  "ok": false,
  "error": "invalid_password"
}
```

### E3 — Password already set

**If Password is not blank:**

1. Condition: `triggerBody()?['password']` **is equal to** `outputs('StoredPassword')` (exact match).

- **If yes** → Response **200**:

```json
{
  "ok": true,
  "mustChangePassword": false,
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

Again: public fields only — **no Password**.

- **If no** → Response **401** `{ "ok": false, "error": "invalid_password" }`

### E4 — Unknown user

If no row was found earlier → Response **401**:

```json
{
  "ok": false,
  "error": "unknown_user"
}
```

---

## Step F — setPassword branch

Only when `operation` is `setPassword`.

### F1 — Validate newPassword

1. Reject if `newPassword` is empty, shorter than **8** characters, or equals **`Twilight2006`**.
2. On reject → Response **400**:

```json
{
  "ok": false,
  "error": "invalid_new_password"
}
```

### F2 — Verify current password

1. Look up the row (same as login).
2. Read **StoredPassword** as in E1.
3. If **StoredPassword** is blank → require `triggerBody()?['password']` equals **`Twilight2006`**.
4. If **StoredPassword** is set → require `triggerBody()?['password']` equals **StoredPassword**.
5. On failure → Response **401** `{ "ok": false, "error": "invalid_password" }` (or `unknown_user` if no row).

### F3 — Update Excel Password

1. **+ New step** → Excel Online (Business) → **Update a row**.
2. Same Location / Library / File / Table.
3. **Key Column**: type the literal text **`orbitLoginId`** (plain text — **not** a dynamic token).  
   If your Excel header is different (e.g. `Orbit Login ID`), type that exact header instead.
4. **Key Value**: dynamic content → **orbitLoginId** from the HTTP trigger (`triggerBody()?['orbitLoginId']`).
5. **Password** field: dynamic content → **newPassword** from the trigger.
6. Leave every other column **blank / unmapped** so they stay unchanged.

### F4 — Success

Response **200**:

```json
{
  "ok": true
}
```

Headers: same CORS / Content-Type. **Do not** return Password.

---

## Step G — Shared error shapes (reference)

| Case | Status | Body |
|------|--------|------|
| No row | 401 | `{ "ok": false, "error": "unknown_user" }` |
| Wrong password | 401 | `{ "ok": false, "error": "invalid_password" }` |
| Bad new password | 400 | `{ "ok": false, "error": "invalid_new_password" }` |

The app shows a generic “Orbit Login ID or password is incorrect” for 401 so the UI does not reveal which case it was.

---

## Step H — Save, turn on, copy URL

1. Click **Save**.
2. Open the trigger again — copy the **HTTP POST URL**.
3. Turn the flow **On**.
4. In `twilight.js`, find:

```js
const ADMIN_PA_MODERATOR_LOGIN_URL = '';
```

5. Paste the URL between the quotes:

```js
const ADMIN_PA_MODERATOR_LOGIN_URL = 'https://…paste-here…';
```

6. Redeploy / refresh the static app so the new constant loads.

---

## Step I — CORS (if browser blocks)

If the browser console shows a CORS error:

1. On every **Response** action, keep:
   - `Access-Control-Allow-Origin: *` (or your app origin)
   - `Content-Type: application/json`
2. Some tenants also need a separate OPTIONS handling flow; mirror whatever your other Orbit HTTP flows already use.

---

## Step J — Remove Password from the directory READ flow (critical)

The Admin **Moderators** tab still uses `ADMIN_PA_MODERATORS_URL`. If that flow returns full Excel rows, the browser can see **Password**.

**Do this in the read flow:**

1. Open the existing directory **read** flow (Orbit App Mod Info / moderators list).
2. Find the **Response** (or Select / Compose that builds the JSON array).
3. Prefer a **Select** action that maps only public columns, for example:
   - orbitLoginId / Orbit Login ID
   - firstName / First Name
   - lastName / Last Name
   - phoneNumber / Phone Number
   - centificEmail / Centific Email
   - personalEmail / Personal Email
   - modAddress / Mod Address
   - zipcode / Zip
   - timeOff / Time Off
   - smartPhone / Smart Phone
   - carType / Car Type
   - off-date / Off Date
   - LoginRole
4. **Do not** map `Password` / `password`.
5. Save and turn the flow back **On**.

The app also strips Password client-side before storing `adminState.moderators`, but the read flow should still exclude it.

---

## Step K — Test checklist

1. Excel row for a test user: **Password** cell blank.
2. In the app, sign in with that Orbit Login ID and password `Twilight2006`.
3. You must see **Set a new password** (cannot enter the app yet).
4. Try a password shorter than 8 characters → rejected.
5. Try `Twilight2006` as the new password → rejected.
6. Confirm field must match.
7. Set a valid new password → Excel **Password** updates; you enter the app.
8. Sign out. Try `Twilight2006` again → incorrect.
9. Sign in with the new password → enters the app (no forced change).
10. Sign in as **Admin-orbit**, **Ritu-Orbit**, or **John-Orbit** with no password → still works.
11. Wrong password for a real user → shake / error; not logged in.
12. With `ADMIN_PA_MODERATOR_LOGIN_URL` still empty: non-allowlist users see the configure message.
13. Confirm browser **localStorage** / Moderators list has no password fields.

---

## Quick checklist

- [ ] New flow named **Orbit App Moderator Login** (separate from read/write)
- [ ] HTTP POST trigger with `operation` / `orbitLoginId` / `password` / `newPassword`
- [ ] Excel: **Moderator_Masterlist.xlsx** / table **Moderator** / column **Password**
- [ ] Lookup by orbitLoginId; Key Column typed as plain text `orbitLoginId`
- [ ] Login: blank Password → only `Twilight2006`; `mustChangePassword: true`; never return Password
- [ ] Login: set Password → must match; `mustChangePassword: false`
- [ ] setPassword: verify current; reject empty / `Twilight2006`; Update row
- [ ] CORS headers on Responses
- [ ] Directory **read** flow Select excludes Password
- [ ] Flow **On**; URL pasted into `ADMIN_PA_MODERATOR_LOGIN_URL`

---

## Honest limitation

Server-side comparison stops the Orbit web app from mass-exposing passwords, but Excel plaintext storage and the signed PA URL remain sensitive. This is a practical control for your current PA/Excel setup — not a replacement for SSO or hashed credential storage.
