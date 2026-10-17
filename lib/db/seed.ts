import { db } from "./index";
import { dorms } from "./schema";
import { UW_DORMS } from "../dorms";

async function main() {
  console.log(`Seeding ${UW_DORMS.length} dorms...`);
  for (const d of UW_DORMS) {
    await db
      .insert(dorms)
      .values(d)
      .onConflictDoUpdate({
        target: dorms.slug,
        set: { name: d.name, area: d.area },
      });
  }
  console.log("Done.");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
