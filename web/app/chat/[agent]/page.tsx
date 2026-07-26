// Cette route n'est pas utilisée directement — le dashboard fait tout.
// Rediriger vers le dashboard.
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ChatAgentPage() {
  const router = useRouter();
  useEffect(() => {
    router.push("/dashboard");
  }, [router]);
  return null;
}