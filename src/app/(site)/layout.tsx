import Header from "@/components/Header/Header";
import Footer from "@/components/Footer/Footer";
import { fetchContent } from "@/lib/supabase/fetchContent";

const DEFAULT_SETTINGS = {
  businessName: 'Connecticut Valley Yard Works',
  shortName: 'CV Yard Works',
  phone: '(603) 499-6799',
  phoneTel: '6034996799',
  location: 'Walpole, NH',
  serviceArea: 'Connecticut Valley Region',
  hoursLine: 'Mon – Sat · 7:00 AM – 6:00 PM',
  social: { facebook: null as string | null, instagram: null as string | null },
};

export default async function SiteLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { site_settings } = await fetchContent(['site_settings']);
  const settings = site_settings ?? DEFAULT_SETTINGS;

  return (
    <>
      <Header shortName={settings.shortName} />
      <main>{children}</main>
      <Footer settings={settings} />
    </>
  );
}
