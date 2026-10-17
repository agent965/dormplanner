import { db } from "./index";
import { users } from "./schema";
import { newId } from "../utils";
import bcrypt from "bcryptjs";

async function main() {
  const username = "testuser_" + Date.now();
  const password = "test1234";
  const passwordHash = await bcrypt.hash(password, 10);
  const id = newId();

  console.log("Attempting insert:", { id, username, passwordHashLen: passwordHash.length });
  await db.insert(users).values({ id, username, passwordHash });
  console.log("✓ Insert OK");

  const bcryptCheck = await bcrypt.compare(password, passwordHash);
  console.log("✓ bcrypt verify:", bcryptCheck);

  await db.delete(users).where((await import("drizzle-orm")).eq(users.id, id));
  console.log("✓ cleanup");
  process.exit(0);
}

main().catch((e) => {
  console.error("ERROR:", e);
  process.exit(1);
});
