"use client";

import InstitutionalError from "../components/InstitutionalError";

export default function ErrorPage({ retry }: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return <InstitutionalError retry={retry} />;
}
