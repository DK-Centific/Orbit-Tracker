# Moderator login flow — fix guide

Use this when login always says **not found**, or when a wrong ID shows a
server error instead of a clear message.

The website is already pointed at your login flow URL. You only need to edit
the flow and clean one Excel cell.

---

## Do this now (about 8 clicks)

### A. Fix the flow

1. Open **Power Automate** in your browser.
2. Open your **moderator login** flow → click **Edit**.
3. Click the Excel step **Get a row**.
4. Click the **⋯** (three dots) on that step → **Configure run after**.
5. Check **both** boxes: **is successful** and **has failed** → **Done**.
6. Click the first **Condition** after Get a row (Condition 1).
7. Set it like this (plain text match — do **not** use Expression / `empty`):
   - **Left box**: Dynamic content → under **Get a row** → **orbitLoginId**
   - **Middle**: **is equal to**
   - **Right box**: Dynamic content → **orbitLoginId** from the trigger
     (**When an HTTP request is received**) or from **Parse JSON** if you have that step
8. Check the sides of that Condition:
   - **No** side must have a **Response** whose body is exactly:
     `{ "ok": false, "reason": "notFound" }`
   - **Yes** side must still hold the rest of the flow (more Conditions)
9. Click the Condition that checks whether the stored password is blank
   (Condition 3 — under the path that is **not** a password change).
10. Set it like this:
    - **Left box**: Dynamic content → under **Get a row** → **Password**
      (the column named **Password**, not **NewPassword**)
    - **Middle**: choose **is empty**
    - Leave the right box blank (or delete whatever is there)
11. Top right → **Save**.

### B. Fix Excel for David (wrong column)

You typed David’s password into **NewPassword**. The flow only uses **Password**.

1. Open SharePoint file  
   `/Active Projects/Amazon/Ben Orbit/Quality/Moderator_Masterlist.xlsx`
2. Open the **Moderator** table.
3. Find the row **David-orbit** (capital **D**).
4. Select the **NewPassword** cell → delete its contents → Enter.
5. Leave the **Password** cell **empty** (so first login uses `Twilight2006`),  
   **or** type the password only in **Password** (never in NewPassword).
6. Save the file.

### C. Quick test

1. Open the Orbit Tracker login page.
2. Orbit Login ID: `David-orbit`
3. Password: `Twilight2006`
4. Sign in.

Expected:
- If **Password** was empty → you should be asked to choose a new password.
- If **Password** already has a value → you should sign in when that value matches.

Wrong ID (for example `Nobody-orbit`) should return a clear “not found”
message, **not** a blank server error.

---

## Picture of the finished flow

```
When an HTTP request is received
        |
   Parse JSON   (optional but fine to keep)
        |
   Excel: Get a row
   (run after: successful OR failed)
        |
   Condition 1  —  Get a row orbitLoginId  equals  typed orbitLoginId
        |
   NO → Response  { "ok": false, "reason": "notFound" }
        |
   YES → Condition 2  —  operation equals setPassword?
              |
         YES → Excel: Update a row  (write into Password only)
              |         then Response  { "ok": true }
              |
         NO  → Condition 3  —  Password  is empty?
                    |
               YES → Condition 4  —  typed password is Twilight2006?
               |          YES → Response  { "ok": true, "mustChangePassword": true }
               |          NO  → Response  { "ok": false, "reason": "wrongPassword" }
                    |
               NO  → Condition 5  —  typed password equals Get a row Password?
                          YES → Response  { "ok": true }
                          NO  → Response  { "ok": false, "reason": "wrongPassword" }
```

---

## What the website sends

POST JSON:

```json
{ "orbitLoginId": "David-orbit", "password": "…", "operation": "login" }
```

or (after first-login password change):

```json
{ "orbitLoginId": "David-orbit", "password": "newPasswordHere", "operation": "setPassword" }
```

`setPassword` puts the **new** password in `password`. The Update a row step
must write that into the Excel **Password** column only.

---

## What the website expects back

| Situation | Response body |
|-----------|----------------|
| Success | `{ "ok": true }` |
| First login (Password blank + typed `Twilight2006`) | `{ "ok": true, "mustChangePassword": true }` |
| Unknown id | `{ "ok": false, "reason": "notFound" }` |
| Bad password | `{ "ok": false, "reason": "wrongPassword" }` |

Status code should be **200** for all of the above.

---

## Rebuild from scratch (only if the flow is beyond repair)

### Step 1 — new flow

1. Power Automate → **Create** → **Instant cloud flow**.
2. Name: `Orbit Tracker moderator login`.
3. Trigger: **When an HTTP request is received**.
4. **Create**.

### Step 2 — trigger

1. Click the trigger.
2. **Who can trigger this flow?** → **Anyone**.
3. **Request Body JSON Schema** → paste:

```json
{
  "type": "object",
  "properties": {
    "orbitLoginId": { "type": "string" },
    "password": { "type": "string" },
    "operation": { "type": "string" }
  }
}
```

### Step 3 — Parse JSON

1. **+ New step** → **Parse JSON**.
2. **Content**: Dynamic content → **Body**.
3. **Schema**: same JSON as Step 2.

### Step 4 — Excel Get a row

1. **+ New step** → Excel **Get a row**.
2. Same Location / Document / Table as your other Excel flows.
3. **Key Column**: type `orbitLoginId`.
4. **Key Value**: Dynamic content → **orbitLoginId**.
5. **⋯** → **Configure run after** → check **is successful** and **has failed**.

### Step 5 — Condition 1

1. **+ New step** → **Condition**.
2. Left: Dynamic content → **Get a row** → **orbitLoginId**.
3. Middle: **is equal to**.
4. Right: Dynamic content → typed **orbitLoginId**.
5. **No** → **Response**, status `200`, body:

```json
{ "ok": false, "reason": "notFound" }
```

### Step 6 — Condition 2 (password change)

1. On **Yes** of Condition 1 → **Condition**.
2. Left: **operation** · Middle: **is equal to** · Right: `setPassword`.
3. **Yes** → Excel **Update a row**:
   - Key Column `orbitLoginId`
   - Key Value: typed **orbitLoginId**
   - **Password** field: Dynamic content → **password**
   - Do **not** map **NewPassword**
4. Then **Response** `{ "ok": true }`.

### Step 7 — Condition 3 (Password blank?)

1. On **No** of Condition 2 → **Condition**.
2. Left: **Get a row** → **Password**.
3. Middle: **is empty**.

### Step 8 — Condition 4 (first login)

1. On **Yes** of Condition 3 → **Condition**.
2. Left: **password** · Middle: **is equal to** · Right: `Twilight2006`.
3. **Yes** → Response `{ "ok": true, "mustChangePassword": true }`
4. **No** → Response `{ "ok": false, "reason": "wrongPassword" }`

### Step 9 — Condition 5 (normal login)

1. On **No** of Condition 3 → **Condition**.
2. Left: typed **password**.
3. Middle: **is equal to**.
4. Right: **Get a row** → **Password**.
5. **Yes** → Response `{ "ok": true }`
6. **No** → Response `{ "ok": false, "reason": "wrongPassword" }`

### Step 10 — save and send the URL

1. **Save**.
2. Open the trigger → copy **HTTP POST URL**.
3. Send that URL so it can be pasted into the app.

---

## Excel cleanup rules

1. Use **only** the **Password** column for login.
2. Clear or delete the **NewPassword** column so nobody puts a password there by mistake.
3. The directory **read** flow should not return **Password** or **NewPassword**.
   The website already strips them, but they should not leave Excel.

---

## Spelling note

Excel key lookup is **case-sensitive**. Stored IDs look like `David-orbit`
(capital D, lowercase `orbit`). The website auto-corrects typing like
`david-orbit` before it calls this flow.
