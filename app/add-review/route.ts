import { NextResponse } from 'next/server';

export async function GET() {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Leave us a review! - MM Earthmovers</title>
    <meta name="description" content="Share your experience with MM Earthmovers. We value your feedback!">
    
    <!-- Open Graph / Facebook / WhatsApp -->
    <meta property="og:type" content="website">
    <meta property="og:url" content="https://www.mmearthmovers.com/add-review">
    <meta property="og:title" content="Leave us a review! - MM Earthmovers">
    <meta property="og:description" content="Share your experience with MM Earthmovers. We value your feedback!">
    <meta property="og:image" content="https://www.mmearthmovers.com/review-og-image-2.png">
    
    <!-- Meta Refresh for automatic redirection -->
    <meta http-equiv="refresh" content="0; url=https://g.page/r/CZE_4NfHV7FQEBM/review">
    
    <!-- Immediate JS redirect fallback -->
    <script>
      window.location.replace("https://g.page/r/CZE_4NfHV7FQEBM/review");
    </script>
</head>
<body style="background-color: #f9fafb; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; font-family: system-ui, -apple-system, sans-serif;">
    <div style="text-align: center;">
        <p style="color: #6b7280; font-size: 16px;">Redirecting to Google Reviews...</p>
        <div style="margin-top: 16px; width: 40px; height: 40px; border: 3px solid #f3f4f6; border-top-3px solid #d97706; border-radius: 50%; animation: spin 1s linear infinite; margin-left: auto; margin-right: auto;"></div>
    </div>
    <style>
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    </style>
</body>
</html>
  `;

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}
