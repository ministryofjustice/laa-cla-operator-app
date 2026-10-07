import fs from "node:fs";
import dotenv from "dotenv";

if (fs.existsSync(".env.test")) {
  dotenv.config({ path: ".env.test", override: true });
}
