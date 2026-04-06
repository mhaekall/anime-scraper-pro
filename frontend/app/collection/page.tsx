"use client";
import dynamic from 'next/dynamic';

const CollectionClient = dynamic(() => import('./CollectionClient'), {
  ssr: false,
});

export default function CollectionPage() {
  return <CollectionClient />;
}
