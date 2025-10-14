# Email Configuration Guide for Supabase

## Problem: Not Receiving Verification Emails

### Quick Diagnosis Steps

#### 1. **Check Email Confirmation Setting**
- Go to: **Supabase Dashboard** → **Authentication** → **Providers** → **Email**
- Look for: **"Confirm email"** toggle
- **Status**: If enabled, emails should be sent. If disabled, signup works immediately without email.

#### 2. **Check Email Service**
Go to: **Supabase Dashboard** → **Project Settings** → **Auth** → **Email Templates**

You should see one of these:

**Option A: Using Supabase's Email Service (Free Tier)**
- Default for new projects
- Limited to **3-4 emails per hour** (rate limited)
- Emails might go to spam
- Domain: `@supabase.io` or `@noreply.supabase.io`

**Option B: Custom SMTP Provider (Recommended)**
- Use your own email service (Gmail, SendGrid, AWS SES, etc.)
- No rate limits
- Better deliverability
- Custom domain

---

## Solution 1: Use Supabase's Built-in Email (Quick Test)

### Check Rate Limits
Supabase's free email service is rate-limited. If you're testing multiple times, you might hit the limit.

**Wait 1-2 hours and try again** OR **use different email addresses** for each test.

### Check Spam Folder
- Supabase emails often go to spam
- Check Gmail/Outlook spam folder
- Add `noreply@supabase.io` to contacts

### Verify Email Template
1. Go to: **Authentication** → **Email Templates**
2. Click **"Confirm signup"**
3. Make sure template is enabled and contains `{{ .ConfirmationURL }}`

---

## Solution 2: Set Up Custom SMTP (Recommended for Production)

### Why Use Custom SMTP?
- ✅ No rate limits
- ✅ Better deliverability (won't go to spam)
- ✅ Custom email branding
- ✅ Better tracking

### Setup with Gmail (Free)

1. **Enable 2-Step Verification on Gmail:**
   - Go to: https://myaccount.google.com/security
   - Enable 2-Step Verification

2. **Generate App Password:**
   - Go to: https://myaccount.google.com/apppasswords
   - Select "Mail" and "Other (Custom name)"
   - Enter "Supabase" as the name
   - Copy the 16-character password

3. **Configure in Supabase:**
   - Go to: **Project Settings** → **Auth** → **SMTP Settings**
   - Enable SMTP
   - Fill in:
     ```
     Host: smtp.gmail.com
     Port: 587
     Username: your-gmail@gmail.com
     Password: [paste 16-char app password]
     Sender email: your-gmail@gmail.com
     Sender name: YourBusinessName
     ```
   - Click **Save**

4. **Test:**
   - Click "Send test email" button
   - Check if you receive it

### Setup with SendGrid (Professional)

1. **Sign up at:** https://sendgrid.com (Free tier: 100 emails/day)

2. **Create API Key:**
   - Go to: **Settings** → **API Keys** → **Create API Key**
   - Copy the key

3. **Configure in Supabase:**
   - Host: `smtp.sendgrid.net`
   - Port: `587`
   - Username: `apikey`
   - Password: [paste your API key]
   - Sender email: Your verified email
   - Sender name: Your business name

---

## Solution 3: Disable Email Confirmation (Development Only)

**WARNING: Only for development/testing. Not recommended for production.**

1. Go to: **Authentication** → **Providers** → **Email**
2. **Disable "Confirm email"**
3. Click **Save**

Now users can sign up without email verification.

**Re-enable this before going to production!**

---

## Testing After Configuration

### Test Signup:
1. Use a **new email address** you haven't tried before
2. Fill out signup form
3. Submit

### Check Results:
- **With email confirmation ON:** You should receive an email within 1-2 minutes
- **With email confirmation OFF:** Signup completes immediately, user is logged in

### If Still Not Working:

#### Check Supabase Logs:
1. Go to: **Logs** → **Auth Logs**
2. Look for signup events
3. Check for errors

#### Check Browser Console:
1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for errors after clicking Submit

#### Check Network Tab:
1. Open DevTools → Network tab
2. Click Submit on signup
3. Look for failed requests (red)
4. Click on them to see error details

---

## Current Code Configuration

Your app's signup code (`AuthContext.tsx`) is configured to:
1. Create Supabase Auth user via `supabase.auth.signUp()`
2. If `authData.session` is null → email confirmation required (pendingApproval: true)
3. If `authData.session` exists → auto-confirmed (bootstraps immediately)

This means:
- **Email confirmation ON:** User sees "Check your email" screen
- **Email confirmation OFF:** User is logged in immediately

---

## Quick Action Plan

### For Testing (Now):
1. ✅ Disable email confirmation in Supabase
2. ✅ Try signup again
3. ✅ Verify it works

### For Production (Before Launch):
1. ⚠️ Enable email confirmation
2. ⚠️ Set up custom SMTP (Gmail or SendGrid)
3. ⚠️ Test with multiple email providers
4. ⚠️ Add domain to SPF/DKIM records (advanced)

---

## Troubleshooting Checklist

- [ ] Checked spam/junk folder
- [ ] Tried different email address
- [ ] Waited 1-2 hours (if hit rate limit)
- [ ] Checked Supabase Auth logs
- [ ] Verified email template is enabled
- [ ] Tried disabling email confirmation
- [ ] Set up custom SMTP
- [ ] Sent test email from Supabase
- [ ] Checked browser console for errors
- [ ] Checked network requests for failures

---

## Need More Help?

If emails still aren't working after trying these steps, check:
1. **Supabase Status:** https://status.supabase.com
2. **Supabase Discord:** https://discord.supabase.com
3. Browser console errors (send screenshots)
4. Supabase Auth logs (send screenshots)

