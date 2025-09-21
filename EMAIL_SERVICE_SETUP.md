# Email Service Setup Guide

## Overview
The professional signup system includes email verification functionality. To enable actual email sending, you'll need to integrate with an email service provider.

## Recommended Email Services

### 1. Resend (Recommended)
- **Website**: https://resend.com
- **Pricing**: Free tier available (3,000 emails/month)
- **Setup**: Very easy, great for developers

```bash
npm install resend
```

### 2. SendGrid
- **Website**: https://sendgrid.com
- **Pricing**: Free tier available (100 emails/day)
- **Setup**: More complex but very reliable

### 3. AWS SES
- **Website**: https://aws.amazon.com/ses/
- **Pricing**: Pay-as-you-go, very cheap
- **Setup**: Requires AWS account

### 4. Mailgun
- **Website**: https://www.mailgun.com
- **Pricing**: Free tier available (5,000 emails/month)
- **Setup**: Good balance of features and simplicity

## Implementation Example (Resend)

### 1. Install Resend
```bash
npm install resend
```

### 2. Create Email Service
Create `src/lib/emailService.ts`:

```typescript
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export const sendVerificationEmail = async (
  email: string,
  token: string,
  businessName: string
) => {
  try {
    const verificationLink = `${process.env.VITE_APP_URL}/verify-email?token=${token}`
    
    const { data, error } = await resend.emails.send({
      from: 'noreply@yourdomain.com', // Replace with your verified domain
      to: [email],
      subject: `Verify your ${businessName} account`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Welcome to ${businessName}!</h2>
          <p>Thank you for creating your business account. Please verify your email address to complete the setup.</p>
          <a href="${verificationLink}" style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">
            Verify Email Address
          </a>
          <p>If the button doesn't work, copy and paste this link:</p>
          <p>${verificationLink}</p>
          <p>This link will expire in 24 hours.</p>
        </div>
      `
    })

    if (error) {
      console.error('Error sending email:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error sending email:', error)
    return false
  }
}
```

### 3. Update ProfessionalSignupForm
Replace the `sendVerificationEmail` function in `src/components/ProfessionalSignupForm.tsx`:

```typescript
import { sendVerificationEmail } from '../lib/emailService'

// Replace the existing sendVerificationEmail function with:
const sendVerificationEmail = async (email: string, token: string, businessName: string) => {
  return await sendVerificationEmail(email, token, businessName)
}
```

### 4. Environment Variables
Add to your `.env` file:

```env
RESEND_API_KEY=your_resend_api_key_here
VITE_APP_URL=http://localhost:5173
```

## Supabase Email Alternative

If you prefer to use Supabase's built-in email service:

### 1. Enable Email Auth in Supabase
1. Go to your Supabase dashboard
2. Navigate to Authentication > Settings
3. Enable email confirmations
4. Configure your email templates

### 2. Update Database Schema
Add this to your migration:

```sql
-- Enable email auth
UPDATE auth.users SET email_confirmed_at = now() WHERE email_confirmed_at IS NULL;
```

### 3. Use Supabase Auth
Update your signup to use Supabase Auth instead of custom implementation.

## Testing Email Verification

### 1. Development Testing
For development, you can:
- Use a service like Mailtrap or MailHog
- Log verification links to console (current implementation)
- Use a test email service

### 2. Production Testing
- Always test with real email addresses
- Verify email templates look correct
- Test expiration times
- Test resend functionality

## Security Considerations

1. **Token Expiration**: Verification tokens expire in 24 hours
2. **Rate Limiting**: Implement rate limiting for email sending
3. **Domain Verification**: Always verify your sending domain
4. **SPF/DKIM**: Set up proper email authentication records

## Troubleshooting

### Common Issues:
1. **Emails going to spam**: Set up SPF, DKIM, and DMARC records
2. **Rate limiting**: Implement proper rate limiting
3. **Invalid tokens**: Check token generation and storage
4. **Expired tokens**: Implement proper cleanup of expired tokens

### Debug Steps:
1. Check email service logs
2. Verify environment variables
3. Test with different email providers
4. Check domain reputation

## Next Steps

1. Choose an email service provider
2. Set up your domain for email sending
3. Implement the email service
4. Test thoroughly
5. Deploy to production

The current implementation logs verification links to the console for development purposes. Replace the `sendVerificationEmail` function with your chosen email service implementation.
