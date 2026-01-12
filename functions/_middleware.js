// Cloudflare Pages middleware for SPA routing
export async function onRequest(context) {
  const { request, next } = context;
  const url = new URL(request.url);

  // If the request is for a file (has extension), serve it normally
  if (url.pathname.match(/\.[a-zA-Z0-9]+$/)) {
    return next();
  }

  // For all other routes, serve index.html
  return next(new Request(new URL('/index.html', request.url), request));
}

