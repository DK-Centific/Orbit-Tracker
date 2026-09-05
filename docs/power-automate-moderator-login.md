# Login flow — match this screen exactly

Your Power Automate uses the **new designer**. Instructions below use
only words that appear on that screen.

You will **not** see: Yes, No, is empty, Configure run after, Expression
(unless you open it — do not).

You **will** see:

- Tabs on a selected card: **Parameters**, **Settings**, **Code view**, **Testing**, **About**
- Condition paths labeled **True** and **False** (not Yes / No)
- Middle list: contains, does not contain, **is equal to**, is not equal to,
  is greater than, is greater or equal to, is less than, is less or equal to,
  starts with, does not start with, ends with, does not end with
- Right box placeholder: **Choose a value**
- Green Excel pills (from **Get a row**) and lightning pills (from the trigger / Parse JSON)

---

## Why this kept failing

Earlier steps named buttons that are **not on your screen**. You were not
doing it wrong. Those clicks do not exist here.

Also: a purple **fx** formula compared to the word `false` never matches,
because Power Automate stores `False`. That sent every login to **False**.

---

## Your flow order (must look like this)

```
manual
  → Parse JSON
  → Get a row
  → Condition 1
        False → Response 5
        True  → Condition 2
                    True  → Update a row → Response 6
                    False → Condition 3
                                True  → Condition 4
                                False → Condition 5
```

Do not type `1` on the website login. That `1` is only inside Condition 1.

---

## Condition 1 — Parameters tab

1. Click **Condition 1**.
2. Stay on the **Parameters** tab.
3. Left box: type `1`
4. Middle: **is equal to** (checkmark on that row)
5. Right box: type `1`
6. **True** side must go to **Condition 2**
7. **False** side must go to **Response 5**

---

## Condition 2 — Parameters tab (do this now — new password save)

First sign-in worked. Saving the new password did not. Condition 2 is
sending that save down the **False** path (same as a normal login), so
the new password is checked against `Twilight2006` and fails.

1. Click **Condition 2**.
2. Stay on the **Parameters** tab.
3. Left box: delete whatever is there.
4. Left box: click it → pick **operation** (lightning pill).  
   If you do not see **operation**, click **Parse JSON** first (steps below), **Save**, then come back.
5. Middle: **is equal to**
6. Right box: type `setPassword`  
   You should see exactly: `setPassword` (capital P, no spaces).
7. **True** side must show **Update a row** then **Response 6**
8. **False** side must show **Condition 3**
9. Top right: **Save**.

### If **operation** is missing from the pick list

1. Click **Parse JSON**.
2. **Parameters** tab.
3. **Schema** — replace with this (copy all of it):

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

4. **Save**.
5. Do Condition 2 again. **operation** should now appear.**

---

## Condition 3 — Parameters tab (do this now)

This is the first-login check. Your middle list has no **is empty**.

1. Click **Condition 3**.
2. **Parameters** tab.
3. Left box: green Excel pill **Password** (from **Get a row**).
   If you see a purple **fx** pill, click it and press Delete, then pick **Password**.
4. Middle: open the list → click **is equal to** (the one with the checkmark in your screenshot).
5. Right box: leave **Choose a value**. Click it and delete any text. Do not type `true` or `false`.
6. **True** → **Condition 4**
7. **False** → **Condition 5**
8. Top right: **Save**.

---

## Condition 4 — Parameters tab

1. Click **Condition 4**.
2. **Parameters** tab.
3. Left box: lightning pill **password** (typed password — not the Excel Password).
4. Middle: **is equal to**
5. Right box: type `Twilight2006`
6. **True** → Response body `{ "ok": true, "mustChangePassword": true }`
7. **False** → Response body `{ "ok": false, "reason": "wrongPassword" }`
8. **Save**.

---

## Condition 5 — Parameters tab

1. Click **Condition 5**.
2. **Parameters** tab.
3. Left box: lightning pill **password**
4. Middle: **is equal to**
5. Right box: green Excel pill **Password**
6. **True** → Response body `{ "ok": true }`
7. **False** → Response body `{ "ok": false, "reason": "wrongPassword" }`
8. **Save**.

---

## Response cards

Click each Response. **Parameters** tab.

- Status code: `200`
- **Response 5** body:

```json
{ "ok": false, "reason": "notFound" }
```

- First-login success body:

```json
{ "ok": true, "mustChangePassword": true }
```

- Wrong password body:

```json
{ "ok": false, "reason": "wrongPassword" }
```

- Success / after Update a row body:

```json
{ "ok": true }
```

---

## Update a row (under Condition 2 True)

1. Click **Update a row**.
2. **Parameters** tab.
3. **Key Column**: `orbitLoginId`
4. **Key Value**: lightning pill **orbitLoginId**
5. The Excel **Password** field: lightning pill **password**
6. Do not fill **NewPassword**

---

## Excel for David-orbit

In `Moderator_Masterlist.xlsx`:

- **Password** cell: empty
- **NewPassword** cell: empty

---

## Test on the website

1. Refresh the site.
2. Orbit Login ID: `david-orbit`
3. Password: `Twilight2006`
4. Click Sign In.

You should see the box to create a new password.
