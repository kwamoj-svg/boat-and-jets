#!/usr/bin/env npx tsx
/**
 * VELIQA — Seed the Verified Global Yacht Network
 *
 * Usage: npx tsx scripts/seed-network.ts
 *
 * Reads all JSON files from data/network-*.json and inserts them
 * into the yacht_network table via the /api/network endpoint.
 */

import fs from "fs";
import path from "path";

const API_URL = process.env.API_URL || "https://veliqa.life";
const ADMIN_SECRET = process.env.ADMIN_SECRET || "veliqa-seed-2024";
const DATA_DIR = path.join(process.cwd(), "data");

async function main() {
  console.log("🚢 VELIQA Network Seeder");
  console.log(`📡 Target: ${API_URL}`);
  console.log(`📂 Data dir: ${DATA_DIR}\n`);

  const files = fs.readdirSync(DATA_DIR).filter(f => f.startsWith("network-") && f.endsWith(".json"));

  if (files.length === 0) {
    console.log("⚠️  No network-*.json files found in data/");
    return;
  }

  let totalInserted = 0;

  for (const file of files) {
    const filePath = path.join(DATA_DIR, file);
    console.log(`📄 Processing ${file}...`);

    try {
      const raw = fs.readFileSync(filePath, "utf-8");
      const entries = JSON.parse(raw);

      if (!Array.isArray(entries)) {
        console.log(`  ⚠️ Skipping — not an array`);
        continue;
      }

      console.log(`  📦 ${entries.length} entries`);

      // Send in batches of 20
      for (let i = 0; i < entries.length; i += 20) {
        const batch = entries.slice(i, i + 20);

        const res = await fetch(`${API_URL}/api/network`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-admin-secret": ADMIN_SECRET,
          },
          body: JSON.stringify(batch),
        });

        if (!res.ok) {
          const err = await res.text();
          console.log(`  ❌ Batch ${i}-${i + batch.length} failed: ${err}`);
        } else {
          const data = await res.json();
          console.log(`  ✅ Batch ${i}-${i + batch.length}: ${data.inserted} inserted`);
          totalInserted += data.inserted || 0;
        }
      }
    } catch (err) {
      console.log(`  ❌ Error: ${err}`);
    }
  }

  console.log(`\n🏁 Done. Total inserted: ${totalInserted} partners`);
}

main().catch(console.error);
