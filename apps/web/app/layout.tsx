import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'MLT Ops',
  description: 'ML Trading Business Ops',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
