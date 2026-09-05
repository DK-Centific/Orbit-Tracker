# Fix login — make Condition 1 always continue when Excel found the row

Do **not** compare two `orbitLoginId` pills. Those pills are not matching,
so every real ID still goes to **False** → not found.

Do **not** use a purple **fx** pill. Do **not** type `empty`, `true`, or `false`.

---

## Do this on Condition 1 (now)

1. Click **Condition 1**.
2. Click whatever is in the **left** box → press **Delete** until the box is empty.
3. Type `1` in the left box. Just the number 1. Do not open Expression.
4. Middle: **is equal to**.
5. Click the **right** box → delete everything in it.
6. Type `1` in the right box.
7. **Save**.

Leave the branches as they are: **True** = Condition 2. **False** = Response 5.

---

## Do this (12 clicks)

1. Open **Power Automate** → open your **moderator login** flow → **Edit**.
2. Click **Get a row**. Look at **Key Value**.
   - If you already see an **orbitLoginId** pill, leave it.
   - If **Key Value** is empty: click the box → **Dynamic content** → **orbitLoginId**.
3. On **Get a row**, click **⋯** → **Configure run after** → check **is successful** and **has failed** → **Done**.
4. Click the first **Condition** under Get a row (Condition 1) → **⋯** → **Delete**. Confirm.
5. Under **Get a row**, click **+** → **Add an action** → **Condition**.
6. **Left box**: **Dynamic content** → under **Get a row** → **orbitLoginId**.
7. **Middle**: **is equal to**.
8. **Right box**: **Dynamic content** → **orbitLoginId** from **When an HTTP request is received**  
   (or from **Parse JSON** if that is where you see it).
9. Drag the rest of the flow (the next Condition and everything under it) into the **Yes** side.
10. On the **No** side, click **+** → **Response**.
    - Status: **200**
    - Body (copy exactly):

```json
{ "ok": false, "reason": "notFound" }
```

11. Open **Update a row** (the step that runs when someone sets a new password).  
    The field that stores the new password must be **Password**.  
    If that field is **NewPassword**, change it to **Password**.
12. Top right → **Save**.

**Yes** = continue login. **No** = not found. Do not swap them.

---

## Then test

1. Open the Orbit Tracker login page.
2. Orbit Login ID: `david-orbit` (lowercase is fine).
3. Password: `Twilight2006`.
4. Sign in.

You should be asked to choose a new password. That means it worked.

---

## If Get a row Key Value was empty

That is only step 2 above: click **Get a row** → click **Key Value** → pick **orbitLoginId**. Three clicks.

---

## Picture of the finished flow

```
When an HTTP request is received
        |
   Parse JSON   (keep it if you already have it)
        |
   Excel: Get a row
   (⋯ → run after: successful AND failed)
        |
   (no Response here — if you see one, delete it)
        |
   NEW Condition 1
   Get a row orbitLoginId  is equal to  typed orbitLoginId
        |
   YES → rest of login (Condition 2+)
   NO  → Response  { "ok": false, "reason": "notFound" }
```

Condition 2+ (already in your flow — just leave them on the **Yes** side):

```
   YES → Condition 2  —  operation equals setPassword?
              |
         YES → Update a row  (write into Password only, not NewPassword)
              |         then Response  { "ok": true }
              |
         NO  → Condition 3  —  Password  is empty?
                    |
               YES → typed password equals Twilight2006?
               |          YES → { "ok": true, "mustChangePassword": true }
               |          NO  → { "ok": false, "reason": "wrongPassword" }
                    |
               NO  → typed password equals Get a row Password?
                          YES → { "ok": true }
                          NO  → { "ok": false, "reason": "wrongPassword" }
```

---

## Optional Excel cleanup (David)

David’s password was typed in **NewPassword**. Login only uses **Password**.

1. Open SharePoint file  
   `/Active Projects/Amazon/Ben Orbit/Quality/Moderator_Masterlist.xlsx`
2. Open the **Moderator** table.
3. Find **David-orbit**.
4. Clear the **NewPassword** cell. Leave **Password** empty.
5. Save.

---

## What the website sends and expects

POST:

```json
{ "orbitLoginId": "David-orbit", "password": "…", "operation": "login" }
```

or

```json
{ "orbitLoginId": "David-orbit", "password": "newPasswordHere", "operation": "setPassword" }
```

| Situation | Response body |
|-----------|----------------|
| Success | `{ "ok": true }` |
| First login (Password empty + `Twilight2006`) | `{ "ok": true, "mustChangePassword": true }` |
| Unknown id | `{ "ok": false, "reason": "notFound" }` |
| Bad password | `{ "ok": false, "reason": "wrongPassword" }` |

Status **200** for all of the above.
