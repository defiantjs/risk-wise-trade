import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "PipGrade — Risk & Reward Calculator" },
      { name: "description", content: "Check risk, reward, and trade quality before entering a trade. Free pre-trade sanity check for traders." },
      { name: "author", content: "PipGrade" },
      { property: "og:title", content: "PipGrade — Risk & Reward Calculator" },
      { property: "og:description", content: "Check risk, reward, and trade quality before entering a trade. Free pre-trade sanity check for traders." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@Lovable" },
      { name: "twitter:title", content: "PipGrade — Risk & Reward Calculator" },
      { name: "twitter:description", content: "Check risk, reward, and trade quality before entering a trade. Free pre-trade sanity check for traders." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/cb236d9f-b9ae-47e0-8cc6-79e99dee64d7/id-preview-9942304f--15692f78-30e4-4713-844f-110167503fa6.lovable.app-1779205658094.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/cb236d9f-b9ae-47e0-8cc6-79e99dee64d7/id-preview-9942304f--15692f78-30e4-4713-844f-110167503fa6.lovable.app-1779205658094.png" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return <Outlet />;
}
