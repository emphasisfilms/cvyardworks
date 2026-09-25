// Google reviews shown on the homepage. Pulled from the Google Business
// Profile listing (4.4 stars, 7 reviews as of 2026-09-24). Update the numbers
// and quotes here when new reviews come in.

export const GOOGLE_MAPS_URL = 'https://maps.google.com/maps?cid=4634380440297115636';
// The listing page has Google's own "Write a review" button. Swap in the short
// review link from the Business Profile dashboard if there is one.
export const GOOGLE_REVIEW_URL = GOOGLE_MAPS_URL;

export const GOOGLE_RATING = { value: 4.4, count: 7 };

export interface Review {
  name: string;
  text: string;
  when: string; // as shown on Google
}

export const REVIEWS: Review[] = [
  { name: 'Jeanne W.', text: 'Excellent company, and highly recommend!', when: 'Google review' },
  { name: 'Joshua S.', text: 'Awesome people and awesome work!!!', when: 'Google review' },
  { name: 'Cheri H.', text: 'Great people.', when: 'Google review' },
];
