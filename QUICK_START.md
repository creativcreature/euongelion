# ⚡ QUICK START
## 3 Steps to Test Locally

---

## STEP 1: Edit .env.local (2 minutes)

```bash
cd /Users/meltmac/Documents/Personal/wkGD/EUONGELION-STARTUP/euongelion
nano .env.local
```

**Change this line:**
```bash
ADMIN_PASSWORD=your-strong-password-here
```

**Save:** Ctrl+O, Enter, Ctrl+X

---

## STEP 2: Test Locally (1 minute)

```bash
npm run dev
```

**Visit:**
- http://localhost:3333 → Landing page (should match your screenshot)
- Click hamburger → Navigation menu
- http://localhost:3333/admin/unlock → Password unlock

---

## STEP 3: Test Admin Access (1 minute)

1. Visit: http://localhost:3333/admin/unlock
2. Enter password from `.env.local`
3. Click "UNLOCK"
4. Visit: http://localhost:3333/blog
5. Should work now (or show empty page)

**Cookie lasts 7 days** - you won't need to unlock again.

---

## ✅ IF THIS WORKS

**You're ready to deploy!**

See: `SETUP_COMPLETE.md` for full deployment guide.

**Quick deploy:**
```bash
git add .
git commit -m "Add Wake Up Zine design"
git push origin main
```

Vercel auto-deploys.

---

## 🌐 CONNECT DOMAIN

**After deployment works:**

1. Vercel → Add domain `wokegod.world`
2. Namecheap → Advanced DNS → Add records Vercel shows
3. Wait 10-15 minutes
4. Visit: https://wokegod.world

**Full guide:** `SETUP_COMPLETE.md` → "Connect Domain" section

---

## 🆘 PROBLEMS?

**Port already in use:**
```bash
# Edit package.json, change dev script to:
"dev": "next dev -p 3333"
```

**Styling doesn't match:**
- Clear browser cache (Cmd+Shift+R)
- Check `src/app/globals.css` exists

**More help:** See `SETUP_COMPLETE.md`

---

**Start with Step 1: Edit .env.local now.**
