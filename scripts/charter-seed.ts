#!/usr/bin/env npx tsx
/**
 * VELIQA — Seed the Charter Contact Database
 *
 * Usage: npx tsx scripts/charter-seed.ts
 *
 * Reads all JSON files from data/charter-*.json and inserts them
 * into the charter_companies table via /api/charter POST endpoint.
 */

import fs from "fs";
import path from "path";

const API_URL = process.env.API_URL || "https://veliqa.life";
const ADMIN_SECRET = process.env.ADMIN_SECRET || "veliqa-seed-2024";
const DATA_DIR = path.join(process.cwd(), "data");
const BATCH_SIZE = 25;

async function seedCompanies() {
  console.log("⚓ VELIQA Charter Database Seeder");
  console.log(`📡 Target: ${API_URL}`);
  console.log(`📂 Data dir: ${DATA_DIR}\n`);

  const files = fs.readdirSync(DATA_DIR)
    .filter(f => f.startsWith("charter-") && f.endsWith(".json"))
    .sort();

  if (files.length === 0) {
    console.log("⚠️  No charter-*.json files found in data/");
    return;
  }

  console.log(`📄 Found ${files.length} data files\n`);

  let totalInserted = 0;
  let totalSkipped = 0;
  const allSlugs: string[] = [];

  for (const file of files) {
    const filePath = path.join(DATA_DIR, file);
    console.log(`\n━━━ Processing ${file} ━━━`);

    try {
      const raw = fs.readFileSync(filePath, "utf-8");
      const entries = JSON.parse(raw);

      if (!Array.isArray(entries)) {
        console.log(`  ⚠️ Skipping — not an array`);
        continue;
      }

      // Deduplicate by slug within this file
      const seen = new Set<string>();
      const unique = entries.filter((e: { slug?: string; company_name?: string }) => {
        const slug = e.slug || String(e.company_name || "").toLowerCase().replace(/[^a-z0-9]+/g, "-");
        if (seen.has(slug) || allSlugs.includes(slug)) {
          totalSkipped++;
          return false;
        }
        seen.add(slug);
        allSlugs.push(slug);
        return true;
      });

      console.log(`  📦 ${unique.length} unique entries (${entries.length - unique.length} duplicates skipped)`);

      // Send in batches
      for (let i = 0; i < unique.length; i += BATCH_SIZE) {
        const batch = unique.slice(i, i + BATCH_SIZE);
        const batchEnd = Math.min(i + BATCH_SIZE, unique.length);

        try {
          const res = await fetch(`${API_URL}/api/charter`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-admin-secret": ADMIN_SECRET,
            },
            body: JSON.stringify({
              entity: "companies",
              data: batch,
            }),
          });

          if (!res.ok) {
            const err = await res.text();
            console.log(`  ❌ Batch ${i + 1}-${batchEnd} failed: ${err}`);
          } else {
            const data = await res.json();
            const count = data.inserted || 0;
            console.log(`  ✅ Batch ${i + 1}-${batchEnd}: ${count} inserted`);
            totalInserted += count;
          }
        } catch (err) {
          console.log(`  ❌ Batch ${i + 1}-${batchEnd} network error: ${err}`);
        }
      }
    } catch (err) {
      console.log(`  ❌ Error reading file: ${err}`);
    }
  }

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`🏁 Done!`);
  console.log(`   ✅ ${totalInserted} companies inserted`);
  console.log(`   ⏭️  ${totalSkipped} duplicates skipped`);
  console.log(`   📊 Total unique slugs: ${allSlugs.length}`);
}

seedCompanies().catch(console.error);
