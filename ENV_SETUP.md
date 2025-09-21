# Environment Variables Setup

## Required Environment Variables

Create a `.env` file in the root directory of your project with the following variables:

```bash
# ElevenLabs API Key (for high-quality TTS)
VITE_ELEVENLABS_KEY=your_elevenlabs_api_key_here

# OpenAI API Key (for fallback TTS when ElevenLabs runs out of credit)
VITE_OPENAI_API_KEY=your_openai_api_key_here

# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

## Important Notes

1. **Restart Required**: After adding or modifying the `.env` file, you must restart your development server for the changes to take effect.

2. **Security**: The `.env` file is already included in `.gitignore` and will not be committed to version control.

3. **Vite Prefix**: All environment variables must start with `VITE_` to be accessible in the browser.

4. **No Spaces**: Do not add spaces around the `=` sign in the `.env` file.

## Restart Command

```bash
# Stop your current dev server (Ctrl+C)
# Then restart it
npm run dev
# or
yarn dev
```

## Verification

After restarting, check the browser console for:
- `VITE_ELEVENLABS_KEY: Present`
- `VITE_OPENAI_API_KEY: Present`

If you see "Missing" for either key, double-check your `.env` file format and restart the server.
