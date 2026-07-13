import Link from 'next/link';
import Image from 'next/image';
import styles from './ServiceCard.module.css';
import type { Service } from '@/lib/supabase/content-types';
import { getPhotoUrl } from '@/lib/supabase/storage';

interface ServiceCardProps {
  service: Service;
}

export default function ServiceCard({ service }: ServiceCardProps) {
  const photoUrl = getPhotoUrl(service.photo_path);

  return (
    <div className={styles.card} id={service.id}>
      {photoUrl && (
        <div className={styles.photo}>
          <Image
            src={photoUrl}
            alt={service.title}
            fill
            sizes="(max-width: 768px) 100vw, 25vw"
            style={{ objectFit: 'cover' }}
          />
        </div>
      )}
      <div className={styles.header}>
        <span className={styles.icon}>{service.icon}</span>
        <h3 className={styles.title}>{service.title}</h3>
      </div>
      <p className={styles.description}>{service.description}</p>
      <ul className={styles.list}>
        {service.items.map((item, index) => (
          <li key={index} className={styles.listItem}>
            <span className={styles.bullet}></span>
            {item}
          </li>
        ))}
      </ul>
      <Link
        href={`/estimate?service=${service.id}`}
        className={styles.link}
      >
        Get a Quote &rarr;
      </Link>
    </div>
  );
}
