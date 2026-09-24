import { Suspense } from 'react';
import SetPasswordForm from './SetPasswordForm';
import styles from '../login/login.module.css';

export const metadata = {
  title: { absolute: 'Set your password | CV Yard Works' },
  robots: { index: false, follow: false },
};

// Landing page for invite and password-reset links. Public: the token in the
// URL is what signs the visitor in.
export default function SetPasswordPage() {
  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>CV Yard Works</h1>
        <p className={styles.subtitle}>Set your admin password</p>
        <Suspense fallback={null}>
          <SetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
