// Uploads the local photo library to the cvy-site-photos Supabase bucket
// and wires the obvious placements into cvy_site_content / cvy_services.
//
// Run with: node --env-file=.env.local scripts/upload-site-photos.mjs
//
// Idempotent: upsert: true on storage, update on rows. Safe to re-run.

import { createClient } from '@supabase/supabase-js';
import { readFile, readdir } from 'node:fs/promises';
import { join, extname } from 'node:path';

const SRC = '/Users/roberthubbard/Desktop/images for cvyw';
const BUCKET = 'cvy-site-photos';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error(
    'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. ' +
      'Run with: node --env-file=.env.local scripts/upload-site-photos.mjs'
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

// filename → target storage path inside cvy-site-photos
const TARGETS = {
  'homeBackground-1.jpg': 'library/homeBackground-1.jpg',
  'homeBackground-2.jpg': 'hero/homeBackground-2.jpg',
  'teamTruck.png': 'home-about/teamTruck.png',
  'barkMulching.jpg': 'services/spring/barkMulching.jpg',
  'lawnmower.png': 'services/summer/lawnmower.png',
  'hirepage-3.jpg': 'services/fall/hirepage-3.jpg',
  'winterTruck.jpg': 'services/winter/winterTruck.jpg',
  'contactBackground.jpg': 'page-banners/contact.jpg',
  'hirepage-2.jpg': 'page-banners/careers.jpg',
  'quoteBackground.jpg': 'page-banners/estimate.jpg',
  'hirepage-4.jpg': 'library/hirepage-4.jpg',
  'hirepage-5.jpg': 'library/hirepage-5.jpg',
  'logo.png': 'library/logo.png',
};

const CONTENT_TYPES = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

async function uploadAll() {
  console.log('→ Listing source folder…');
  const files = await readdir(SRC);

  let uploaded = 0;
  let skipped = 0;

  for (const filename of files) {
    if (filename.startsWith('.')) continue;
    const target = TARGETS[filename];
    if (!target) {
      console.log(`  · skip (no mapping): ${filename}`);
      skipped++;
      continue;
    }

    const buf = await readFile(join(SRC, filename));
    const contentType = CONTENT_TYPES[extname(filename).toLowerCase()];

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(target, buf, {
        contentType,
        upsert: true,
        cacheControl: '3600',
      });

    if (error) {
      console.error(`  ✗ ${filename} → ${target}: ${error.message}`);
      process.exitCode = 1;
    } else {
      console.log(`  ✓ ${filename} → ${target}`);
      uploaded++;
    }
  }

  console.log(`Storage: ${uploaded} uploaded, ${skipped} skipped`);
}

async function placeInContent() {
  console.log('→ Placing photos in cvy_site_content…');

  // hero
  const { data: heroRow } = await supabase
    .from('cvy_site_content')
    .select('value')
    .eq('key', 'hero')
    .single();

  if (heroRow) {
    const next = { ...heroRow.value, backgroundPath: TARGETS['homeBackground-2.jpg'] };
    const { error } = await supabase
      .from('cvy_site_content')
      .update({ value: next })
      .eq('key', 'hero');
    if (error) console.error('  ✗ hero:', error.message);
    else console.log('  ✓ hero.backgroundPath set');
  }

  // home_about
  const { data: aboutRow } = await supabase
    .from('cvy_site_content')
    .select('value')
    .eq('key', 'home_about')
    .single();

  if (aboutRow) {
    const next = { ...aboutRow.value, imagePath: TARGETS['teamTruck.png'] };
    const { error } = await supabase
      .from('cvy_site_content')
      .update({ value: next })
      .eq('key', 'home_about');
    if (error) console.error('  ✗ home_about:', error.message);
    else console.log('  ✓ home_about.imagePath set');
  }
}

async function placeInServices() {
  console.log('→ Placing photos in cvy_services…');
  const placements = [
    { id: 'spring', path: TARGETS['barkMulching.jpg'] },
    { id: 'summer', path: TARGETS['lawnmower.png'] },
    { id: 'fall',   path: TARGETS['hirepage-3.jpg'] },
    { id: 'winter', path: TARGETS['winterTruck.jpg'] },
  ];

  for (const p of placements) {
    const { error } = await supabase
      .from('cvy_services')
      .update({ photo_path: p.path })
      .eq('id', p.id);
    if (error) console.error(`  ✗ ${p.id}:`, error.message);
    else console.log(`  ✓ ${p.id}.photo_path set`);
  }
}

await uploadAll();
await placeInContent();
await placeInServices();
console.log('Done.');
