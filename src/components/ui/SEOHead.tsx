/**
 * SEOHead — Reusable web-only SEO <Head> component
 * Renders meta tags on web, no-op on native.
 * Usage: <SEOHead title="Page Title" description="..." path="/page" />
 */

import { Platform } from 'react-native';
import Head from 'expo-router/head';
import { SITE_URL, BRAND } from '../../config/seo';

interface SEOHeadProps {
  title: string;
  description: string;
  path?: string;
  ogImage?: string;
  ogType?: string;
  /** For product pages — structured data price */
  productPrice?: number;
}

export function SEOHead({
  title,
  description,
  path = '/',
  ogImage,
  ogType = 'website',
}: SEOHeadProps) {
  // Only render on web
  if (Platform.OS !== 'web') return null;

  const canonicalUrl = `${SITE_URL}${path}`;
  const imageUrl = ogImage || BRAND.ogImage;

  return (
    <Head>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="theme-color" content={BRAND.themeColor} />

      {/* Canonical */}
      <link rel="canonical" href={canonicalUrl} />

      {/* Open Graph */}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:type" content={ogType} />
      <meta property="og:image" content={imageUrl} />
      <meta property="og:site_name" content={BRAND.name} />
      <meta property="og:locale" content={BRAND.locale} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={imageUrl} />

      {/* Mobile */}
      <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
      <meta name="mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      <meta name="apple-mobile-web-app-title" content={BRAND.name} />
    </Head>
  );
}
