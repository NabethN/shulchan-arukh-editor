import { redirect } from 'next/navigation';

export default function Home() {
  // ברגע שמישהו נכנס לדף הבית, הוא מועבר אוטומטית לסימן 1
  redirect('/siman/1');
}