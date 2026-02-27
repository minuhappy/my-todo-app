import './globals.css';

export const metadata = {
  title: '나만의 할 일 관리',
  description: 'Supabase 연동 할 일 관리 앱',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
