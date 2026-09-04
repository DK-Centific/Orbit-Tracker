# Login flow — simple click list

Build this in a **new** flow. Do **not** edit your existing GET or POST flows.

The login HTTP POST URL is already in the app (`ADMIN_PA_MODERATOR_LOGIN_URL` in `twilight.js`). Keep this guide if you ever need to rebuild the flow.

---

## What you add vs what you pick

| You click | When |
|-----------|------|
| **+ New step** then **Condition** | You need a Yes / No split |
| **+ New step** then **Compose** | You need to store a value |
| **+ New step** then **Excel** | You need to find or update a row |
| **+ New step** then **Response** | You need to send JSON back |
| Operator dropdown inside a Condition (`is equal to`, `is empty`) | You are **inside** a Condition you already added — do **not** add a new step |

---

## Picture of the flow

```
When an HTTP request is received
        |
   Parse JSON
        |
   Excel: Get a row
        |
   Condition 1  —  row found?
        |
   NO → Response  { "ok": false, "reason": "notFound" }
        |
   YES → Condition 2  —  operation equals setPassword?
              |
         YES → Excel: Update a row
              |         then Response  { "ok": true }
              |
         NO  → Condition 3  —  stored password is empty?
                    |
               YES → Condition 4  —  typed password is Twilight2006?
               |          YES → Response  { "ok": true, "mustChangePassword": true }
               |          NO  → Response  { "ok": false, "reason": "wrongPassword" }
                    |
               NO  → Condition 5  —  typed password equals stored password?
                          YES → Response  { "ok": true }
                          NO  → Response  { "ok": false, "reason": "wrongPassword" }
```

You add **5 Conditions**. Each one has a Yes side and a No side.

---

## Step 1 — new flow

1. Power Automate → **Create** → **Instant cloud flow**.
2. Name: `Orbit Tracker moderator login`.
3. Trigger: **When an HTTP request is received**.
4. **Create**.

---

## Step 2 — trigger

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

---

## Step 3 — Parse JSON

1. **+ New step**.
2. Search **Parse JSON**. Add it.
3. **Content**: click the box → Dynamic content → **Body**.
4. **Schema**: same JSON as Step 2.

---

## Step 4 — Excel Get a row

1. **+ New step**.
2. Search **Get a row**. Add **Excel Online (Business)**.
3. Location / Document / Table: same as your other Excel flows.
4. **Key Column**: type `orbitLoginId` (plain text).
5. **Key Value**: Dynamic content → **orbitLoginId**.
6. Click **…** on this step → **Configure run after**.
7. Check **is successful** and **has failed**. Save that.

---

## Step 5 — Condition 1 (did Excel find the person?)

1. **+ New step**.
2. Search **Condition**. Add it. This is Condition 1.
3. Left box: **Expression** tab. Paste:

```
empty(outputs('Get_a_row')?['body'])
```

4. Click **OK**.
5. Middle dropdown: pick **is equal to**. (This is an operator. You are not adding a new step.)
6. Right box: type `true`.

**No** side of Condition 1:

1. Click **Add an action**.
2. Search **Response**. Add it.
3. Status: `200`.
4. Body:

```json
{ "ok": false, "reason": "notFound" }
```

Leave the **Yes** side empty for now. Next steps go on **Yes**.

---

## Step 6 — Condition 2 (is this a password change?)

1. On the **Yes** side of Condition 1, click **Add an action**.
2. Search **Condition**. Add it. This is Condition 2.
3. Left box: Dynamic content → **operation**.
4. Middle: **is equal to**.
5. Right box: type `setPassword`.

**Yes** side of Condition 2 (password change):

1. **Add an action** → Excel **Update a row**.
2. Same Location / Document / Table.
3. **Key Column**: type `orbitLoginId`.
4. **Key Value**: Dynamic content → **orbitLoginId**.
5. In the Password field: Dynamic content → **password**.
6. **Add an action** → **Response**. Status `200`. Body:

```json
{ "ok": true }
```

**No** side of Condition 2: leave empty. Next step goes here.

---

## Step 7 — Condition 3 (is Excel Password blank?)

1. On the **No** side of Condition 2, click **Add an action**.
2. Search **Condition**. Add it. This is Condition 3.
3. Left box: **Expression**. Paste:

```
empty(outputs('Get_a_row')?['body']?['Password'])
```

4. **OK**.
5. Middle: **is equal to**.
6. Right box: `true`.

---

## Step 8 — Condition 4 (first login: did they type Twilight2006?)

1. On the **Yes** side of Condition 3, click **Add an action**.
2. Search **Condition**. Add it. This is Condition 4.
3. Left box: Dynamic content → **password**.
4. Middle: **is equal to**.
5. Right box: type `Twilight2006`.

**Yes** of Condition 4 → **Response**, status `200`:

```json
{ "ok": true, "mustChangePassword": true }
```

**No** of Condition 4 → **Response**, status `200`:

```json
{ "ok": false, "reason": "wrongPassword" }
```

---

## Step 9 — Condition 5 (normal login: does typed password match Excel?)

1. On the **No** side of Condition 3, click **Add an action**.
2. Search **Condition**. Add it. This is Condition 5.
3. Left box: Dynamic content → **password**.
4. Middle: **is equal to**.
5. Right box: Dynamic content from **Get a row** → **Password**.

**Yes** of Condition 5 → **Response**, status `200`:

```json
{ "ok": true }
```

**No** of Condition 5 → **Response**, status `200`:

```json
{ "ok": false, "reason": "wrongPassword" }
```

---

## Step 10 — save and send me the URL

1. Top right: **Save**.
2. Click the first step (**When an HTTP request is received**).
3. Copy **HTTP POST URL**.
4. Send that URL to me.

---

## Quick check

You should have:

- 1 trigger
- 1 Parse JSON
- 1 Get a row
- 5 Conditions
- 1 Update a row (only under Condition 2 Yes)
- 6 Response steps

If a Response is sitting **between** two Conditions (not inside Yes or No), drag it into the correct Yes or No box.

---

## If login shows HTTP 502

Power Automate returns 502 when the flow stops before any **Response** step runs.

Most common cause: **Get a row** fails with `No row was found with Id '...'`.

Fix:

1. Open the login flow → **Edit**.
2. Click **…** on the **Get a row** step → **Configure run after**.
3. Check both **is successful** and **has failed** → **Done**.
4. Make sure the **No** side of Condition 1 has a **Response** with `{ "ok": false, "reason": "notFound" }`.
5. **Save**.

Also check the Orbit Login ID spelling in Excel (for example `David-orbit`, not `David-Oribt`).

Capitalization does not matter when signing in. The app looks up the typed ID
without case, then corrects it to the spelling stored in Excel before it calls
this flow.

---

## Two things to clean up in Excel

1. Use only the **Password** column in this flow (check it, and update it).
   The **NewPassword** column is not used by the app — leave it empty or delete it.
2. The directory read flow currently returns **Password** and **NewPassword** to
   the browser. Remove those two columns from that flow's Response so passwords
   never leave Excel. The app already discards them, but they should not be sent.
