const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '../src/app/(marketing)/page.tsx');

const code = `import { publicProducts } from "@/lib/solutions/public";
import { Suspense } from "react";
import { LandingDiscovery } from "@/components/landing-discovery";
import { FounderInvitation } from "@/components/founder-invitation";

export const dynamic = "force-dynamic";

export default async function Home() {
  const published = await publicProducts();

  return (
    <div>
      <Suspense fallback={<div className="min-h-[70vh]" aria-label="Cargando catálogo" />}>
        <LandingDiscovery published={published} />
      </Suspense>
      <FounderInvitation />
    </div>
  );
}
`;

fs.writeFileSync(file, code);
