import Link from "next/link";
import { AudioLines } from "lucide-react";

export function Wordmark() {
  return (
    <Link href="/" className="wordmark" aria-label="MockMate AI home">
      <span className="brand-mark"><AudioLines size={24} strokeWidth={2.5} /></span>
      <span>MockMate<span className="brand-suffix">.AI</span></span>
    </Link>
  );
}
