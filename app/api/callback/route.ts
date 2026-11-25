import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const { OAUTH_CLIENT_ID, OAUTH_CLIENT_SECRET } = process.env;

    if (!code) {
        return NextResponse.json({ error: 'Missing code' }, { status: 400 });
    }

    if (!OAUTH_CLIENT_ID || !OAUTH_CLIENT_SECRET) {
        return NextResponse.json({ error: 'Missing OAuth credentials' }, { status: 500 });
    }

    try {
        const response = await fetch('https://github.com/login/oauth/access_token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
            body: JSON.stringify({
                client_id: OAUTH_CLIENT_ID,
                client_secret: OAUTH_CLIENT_SECRET,
                code,
            }),
        });

        const data = await response.json();

        if (data.error) {
            return NextResponse.json({ error: data.error_description }, { status: 400 });
        }

        // Return HTML that sends the token to the parent window (Decap CMS)
        const html = `
      <script>
        const allowed = new RegExp('^https://([a-z0-9-]+[.])?(mmearthmovers[.]com|vercel[.]app)$|^http://(localhost|127[.]0[.]0[.]1)(:[0-9]+)?$', 'i');
        const receiveMessage = (message) => {
          if (message.origin !== window.location.origin && !allowed.test(message.origin)) {
            return;
          }
          if (window.opener) {
            window.opener.postMessage(
              'authorization:github:success:${JSON.stringify({
              token: data.access_token,
              provider: 'github',
          })}',
              message.origin
            );
          }
          window.removeEventListener("message", receiveMessage, false);
        }
        window.addEventListener("message", receiveMessage, false);
        if (window.opener) {
          window.opener.postMessage("authorizing:github", "*");
        }
      </script>
    `;

        return new NextResponse(html, {
            headers: { 'Content-Type': 'text/html' },
        });
    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
