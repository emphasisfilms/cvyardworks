import Link from 'next/link';
import styles from './SeasonalServices.module.css';
import type { Service } from '@/lib/supabase/content-types';

export default function SeasonalServices({
  services,
}: {
  services: Service[];
}) {
  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <div className={styles.grid}>
          {services.map((service) => (
            <Link
              key={service.id}
              href={`/#${service.id}`}
              className={styles.item}
            >
              <span className={styles.icon}>{service.icon}</span>
              <span className={styles.label}>{service.season}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
