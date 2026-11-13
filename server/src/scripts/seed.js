// Development seed:  npm run seed          (adds demo users + sample data if collections are empty)
//                    npm run seed -- --reset   (wipes users/reports/tenders/disputes first)
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { connectDb } from '../config/db.js';
import { User } from '../models/User.js';
import { Report } from '../models/Report.js';
import { Tender } from '../models/Tender.js';
import { Dispute } from '../models/Dispute.js';

if (env.isProd) { console.error('Refusing to seed demo accounts in production.'); process.exit(1); }

const PASSWORD = process.env.SEED_PASSWORD || 'Passw0rd!demo';
await connectDb();
if (process.argv.includes('--reset')) await Promise.all([User.deleteMany(), Report.deleteMany(), Tender.deleteMany(), Dispute.deleteMany()]);

const hash = await bcrypt.hash(PASSWORD, 12);
const upsert = (name, email, role) => User.findOneAndUpdate({ email }, { name, role, $setOnInsert: { passwordHash: hash } }, { upsert: true, new: true });
const admin = await upsert('Admin Officer', 'admin@smartcity.test', 'admin');
const authority = await upsert('PWD Engineer', 'authority@smartcity.test', 'authority');
const citizen = await upsert('Demo Citizen', 'citizen@smartcity.test', 'citizen');

if (!(await Report.countDocuments())) {
  await Report.create([
    { category: 'Road Damage', severity: 'critical', risk: 'high', description: 'Deep pothole cluster on the primary bus route near the new bus stand causing traffic diversion and vehicle hazard.', department: 'Highways & Public Works Department', priority: 9, fixTime: '24-48 hours', steps: 'Barricade lane, level sub-base, compact cold-mix', location: { type: 'Point', coordinates: [77.7180, 11.3415] }, status: 'in_progress', user: citizen._id, userName: citizen.name },
    { category: 'Street Lights', severity: 'medium', risk: 'medium', description: 'A 200 m stretch of LED streetlights is dark along the Ward 12 main cross street.', department: 'Municipal Electrical Department', priority: 6, fixTime: '2-3 days', steps: 'Inspect feeder pillar, replace fuse, re-engage relay', location: { type: 'Point', coordinates: [77.7140, 11.3385] }, status: 'reported', user: citizen._id, userName: citizen.name },
  ]);
}

if (!(await Tender.countDocuments())) {
  const sample = (tenderId, title, budget, department, contractor, location, deadline, warranty, status, table) => ({
    tenderId, title, budget, department, contractor, location, deadline: new Date(deadline), warranty, status, createdBy: authority._id,
    aiBreakdown: table && { estimate: true, generatedAt: new Date(), warrantyNotes: 'Sample data for demonstration.', checklist: ['Compare against the published Schedule of Rates', 'Check drain covers sit flush with the road surface'],
      table: table.map(([component, amount, specs, summary]) => ({ component, amount, specs, summary, share: `${((amount / budget) * 100).toFixed(1)}%` })) },
  });
  await Tender.create([
    sample('TN-PWD-2026-T881', 'Main Road 4-Lane Bituminous Overlay & Stormwater Drain', 4850000, 'Public Works Department (PWD)', 'Sri Murugan Infrastructure & Paving Ltd', 'Salem Junction to Gandhi Road, Ward 12', '2026-12-15', '36 months defect liability', 'in_progress', [
      ['Bituminous Concrete wearing course (50 mm)', 2182500, 'VG-30 bitumen, paver finish', 'Waterproof top driving layer for heavy traffic'],
      ['Wet Mix Macadam base (150 mm)', 1067000, 'Crushed stone, vibratory compaction', 'Stone foundation that prevents sinkholes and potholes'],
      ['RCC covered stormwater drain', 873000, 'M25 concrete, slotted slabs', 'Monsoon drainage that stops road flooding'],
      ['Road markings & reflectors', 242500, 'Thermoplastic paint, glass beads', 'Night-time lane visibility'],
      ['Labour, rollers & supervision', 339500, 'Tandem roller crew, site engineer', 'Machinery, fuel and compaction supervision'],
      ['Lab core tests & contingency', 145500, 'Bitumen extraction, core strength', 'Independent testing of asphalt quality'],
    ]),
    sample('TN-MUNICIPAL-2026-W042', 'Ward 14 RCC Box Drain & Silt Trap Construction', 3200000, 'City Municipal Corporation', 'Apex Urban Builders & Civic Works', 'Main Bazaar Road', '2026-11-20', '24 months structural warranty', 'sanctioned', null),
    sample('TN-SMART-2026-E510', 'Energy-Efficient LED Streetlight & Smart Metering Grid', 1975000, 'Smart City Development Mission', 'V-Tech Electricals & Smart Infra', 'Outer Ring Road', '2026-10-30', '60 months replacement warranty', 'completed', null),
  ]);
}

if (!(await Dispute.countDocuments())) {
  await Dispute.create({ tenderId: 'TN-PWD-2026-T881', category: 'Substandard Material Quality', description: 'Loose gravel was laid at the Gandhi Road junction without enough bitumen bonding; stones dislodge after light rain and cause two-wheeler skids.', user: citizen._id, userName: citizen.name, supporters: [citizen._id], letter: 'Sample letter.' });
}

console.log(`Seeded. Demo logins (password "${PASSWORD}"): admin@smartcity.test, authority@smartcity.test, citizen@smartcity.test`);
await mongoose.disconnect();
