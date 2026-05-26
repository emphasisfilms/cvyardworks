import { Suspense } from 'react';
import LoginForm from './LoginForm';
import styles from './login.module.css';

export const metadata = {
  title: 'Admin Login | CV Yard Works',
  robots: { index: false, follow: false },
};

export default function AdminLoginPage() {
  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>CV Yard Works</h1>
        <p className={styles.subtitle}>Admin sign in</p>
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
