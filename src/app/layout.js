import { Heebo, Frank_Ruhl_Libre } from "next/font/google";
import "./globals.css";

// פונט לממשק (UI)
const heebo = Heebo({
  subsets: ["hebrew"],
  variable: '--font-interface', // משתנה CSS
  weight: ['400', '700']
});

// פונט לטקסט תורני
const frank = Frank_Ruhl_Libre({
  subsets: ["hebrew"],
  variable: '--font-torah',
  weight: ['400', '700']
});

export const metadata = {
  title: "עורך שולחן ערוך",
  description: "מערכת ללימוד וכתיבת פירושים",
};

export default function RootLayout({ children }) {
  return (
    <html lang="he" dir="rtl" className={`${heebo.variable} ${frank.variable}`}>
      <body className="font-sans bg-gray-50 text-gray-900">
        {children}
      </body>
    </html>
  );
}