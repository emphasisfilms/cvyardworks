import type { Metadata } from "next";
import { Raleway } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const raleway = Raleway({
  variable: "--font-raleway",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

import { SITE_URL, BUSINESS_NAME } from "@/lib/seo";

const TITLE = "Landscaping, Lawn Care & Snow Removal in Walpole, NH | Connecticut Valley Yard Works";
const DESCRIPTION =
  "Connecticut Valley Yard Works: landscaping, lawn installation, mowing, fall cleanup and snow plowing for homes and businesses in Walpole, NH and the Connecticut River Valley. Free estimates. Call (603) 499-6799.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: TITLE,
    template: `%s | ${BUSINESS_NAME}`,
  },
  description: DESCRIPTION,
  applicationName: BUSINESS_NAME,
  keywords: [
    "landscaping Walpole NH",
    "lawn care Walpole NH",
    "snow removal Walpole NH",
    "snow plowing Walpole NH",
    "landscaper Keene NH",
    "lawn installation New Hampshire",
    "fall cleanup Connecticut Valley",
    "CV Yard Works",
    "Connecticut Valley Yard Works",
  ],
  alternates: { canonical: "/" },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    siteName: BUSINESS_NAME,
    title: TITLE,
    description: DESCRIPTION,
    images: [
      {
        url: "/opengraph-image.jpg",
        width: 1200,
        height: 630,
        alt: "Connecticut Valley Yard Works, Walpole, NH",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/opengraph-image.jpg"],
  },
  formatDetection: { telephone: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Supabase invite / reset links land on the site root with tokens in the hash.
            Send them to the set-password page before anything else runs. */}
        <Script id="auth-link-forward" strategy="beforeInteractive">
          {`(function(){var h=location.hash;if(h&&/(^|[#&])(access_token|error_description)=|(^|[#&])type=(invite|recovery|magiclink|signup)/.test(h)&&location.pathname!=='/admin/set-password'){location.replace('/admin/set-password'+h);}})();`}
        </Script>
      </head>
      <body className={raleway.variable}>{children}</body>
    </html>
  );
}
