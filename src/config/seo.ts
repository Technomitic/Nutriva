/**
 * Nutriva — SEO Configuration
 * Central config for all web SEO meta tags.
 * Change SITE_URL once when adding a custom domain — everything updates automatically.
 */

/** Base URL of the deployed web app (NO trailing slash) */
export const SITE_URL = 'https://fresh-app-ivory-three.vercel.app';

/** Brand constants */
export const BRAND = {
  name: 'Nutriva',
  tagline: 'Farm-Fresh Fruits & Vegetables Delivered',
  description:
    'Nutriva brings farm-fresh organic fruits, vegetables, and groceries straight to your door. Order online for same-day delivery in India.',
  themeColor: '#154212',
  locale: 'en_IN',
  currency: 'INR',
  twitter: '@nutriva',
  ogImage: `${SITE_URL}/og-image.png`,
};

/** Per-page SEO data */
export const PAGE_SEO = {
  home: {
    title: `${BRAND.name} — ${BRAND.tagline}`,
    description: BRAND.description,
    path: '/',
  },
  about: {
    title: `About Us — ${BRAND.name}`,
    description:
      'Learn about Nutriva\'s mission to deliver farm-fresh organic produce. Our story, values, privacy policy, and terms of service.',
    path: '/about',
  },
  bulk: {
    title: `Bulk Deals & Festival Packs — ${BRAND.name}`,
    description:
      'Save more with Nutriva bulk deals. Buy fresh fruits and vegetables in bulk at wholesale prices with free delivery.',
    path: '/bulk',
  },
  cart: {
    title: `Your Cart — ${BRAND.name}`,
    description: 'Review your cart and checkout with Nutriva. Same-day delivery for fresh produce.',
    path: '/cart',
  },
  orders: {
    title: `My Orders — ${BRAND.name}`,
    description: 'Track your Nutriva orders, view order history, and manage deliveries.',
    path: '/orders',
  },
  support: {
    title: `Help & Support — ${BRAND.name}`,
    description:
      'Get help with your Nutriva orders. Contact our support team for order issues, refunds, and general enquiries.',
    path: '/support',
  },
  login: {
    title: `Sign In — ${BRAND.name}`,
    description: 'Sign in to your Nutriva account to order fresh fruits and vegetables online.',
    path: '/login',
  },
  signup: {
    title: `Create Account — ${BRAND.name}`,
    description: 'Join Nutriva for farm-fresh produce delivered to your door. Sign up in seconds.',
    path: '/signup',
  },
  product: (name: string, desc?: string) => ({
    title: `${name} — ${BRAND.name}`,
    description: desc || `Buy fresh ${name} online at Nutriva. Farm-fresh quality with same-day delivery.`,
    path: '/product',
  }),
} as const;
