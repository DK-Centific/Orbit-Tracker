# Login flow — only these boxes

The website cannot check the password. Anyone can read the page.
Power Automate is the lock. You need **four** Conditions. No formulas.

Do **not** open **Expression**. Do **not** type `empty`, `true`, or `false`.
Do **not** type `1` as the Orbit Login ID. That number is only for Condition 1.

---

## What each Condition must say

**Condition 1** (already done)

- Left: `1`
- Middle: **is equal to**
- Right: `1`
- **True** → Condition 2
- **False** → Response `{ "ok": false, "reason": "notFound" }`

**Condition 2** (password change)

- Left: Dynamic content → **operation**
- Middle: **is equal to**
- Right: type `setPassword` (one word, capital P)
- **True** → Excel **Update a row** (write into **Password** only) → Response `{ "ok": true }`
- **False** → Condition 3

**Condition 3** (first login?)

- Left: Dynamic content → **Get a row** → **Password**
- Middle: **is empty**  ← pick this. Not “is equal to”.
- Right: leave empty
- **True** → Condition 4
- **False** → Condition 5

**Condition 4** (first password)

- Left: Dynamic content → **password**
- Middle: **is equal to**
- Right: type `Twilight2006`
- **True** → Response `{ "ok": true, "mustChangePassword": true }`
- **False** → Response `{ "ok": false, "reason": "wrongPassword" }`

**Condition 5** (normal login)

- Left: Dynamic content → **password**
- Middle: **is equal to**
- Right: Dynamic content → **Get a row** → **Password**
- **True** → Response `{ "ok": true }`
- **False** → Response `{ "ok": false, "reason": "wrongPassword" }`

Every Response: Status **200**.

---

## Do Condition 3 now (this is the one still failing)

1. Click **Condition 3**.
2. Delete whatever is in the left box (including any purple **fx** pill).
3. Left: **Dynamic content** → **Get a row** → **Password**.
4. Middle: open the list → click **is empty**.
5. Delete anything in the right box. Leave it blank.
6. **Save**.

Then click **Condition 4**:
1. Left: **password** (the one the person typed).
2. Middle: **is equal to**.
3. Right: type `Twilight2006`.
4. **Save**.

---

## Test

1. Refresh the site.
2. Orbit Login ID: `david-orbit`
3. Password: `Twilight2006`
4. Sign in.

You should be asked to pick a new password.

---

## Excel (David)

Open `Moderator_Masterlist.xlsx` → **David-orbit**.

- **Password** = empty
- **NewPassword** = empty (clear it if it has anything)

Login only reads **Password**.
