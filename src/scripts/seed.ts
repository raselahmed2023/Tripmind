import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from '../modules/user/user.model';
import { Destination } from '../modules/destination/destination.model';
import { Subscription } from '../modules/subscription/subscription.model';

dotenv.config();

const DESTINATIONS = [
  {
    title: 'Kyoto',
    country: 'Japan',
    city: 'Kyoto',
    shortDescription: 'Ancient capital known for classical Buddhist temples, imperial palaces, and traditional wooden houses.',
    fullDescription: 'Kyoto is a city on the island of Honshu. It was the former imperial capital of Japan for more than a thousand years. The city is famous for its numerous classical Buddhist temples, as well as its imperial palaces, Shinto shrines, traditional wooden houses, and formal gardens.',
    images: ['https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e'],
    category: 'culture',
    averageDailyCost: 120,
    currency: 'USD',
    rating: 4.8,
    reviewCount: 245,
    bestSeason: 'Spring',
    recommendedDays: 5,
    latitude: 35.0116,
    longitude: 135.7681,
    highlights: ['Fushimi Inari Shrine', 'Arashiyama Bamboo Grove', 'Kinkaku-ji', 'Nishiki Market'],
    status: 'published',
  },
  {
    title: 'Barcelona',
    country: 'Spain',
    city: 'Barcelona',
    shortDescription: 'Vibrant capital of Catalonia known for art, architecture, and Mediterranean beaches.',
    fullDescription: 'Barcelona is the capital city of the autonomous community of Catalonia in Spain. It is the largest city on the Mediterranean coast, known for its unique architecture, vibrant street life, and rich cultural heritage.',
    images: ['https://images.unsplash.com/photo-1583422409516-2895a77efded'],
    category: 'city',
    averageDailyCost: 100,
    currency: 'USD',
    rating: 4.7,
    reviewCount: 312,
    bestSeason: 'Summer',
    recommendedDays: 4,
    latitude: 41.3874,
    longitude: 2.1686,
    highlights: ['Sagrada Familia', 'Park Guell', 'La Rambla', 'Gothic Quarter'],
    status: 'published',
  },
  {
    title: 'Bali',
    country: 'Indonesia',
    city: 'Ubud',
    shortDescription: 'Tropical paradise with lush rice terraces, ancient temples, and vibrant arts scene.',
    fullDescription: 'Bali is an island and province of Indonesia. It is known for its volcanic mountains, iconic rice terraces, pristine beaches, and coral reefs. The island is home to religious sites such as cliffside Uluwatu Temple.',
    images: ['https://images.unsplash.com/photo-1537996194471-e657df975ab4'],
    category: 'beach',
    averageDailyCost: 60,
    currency: 'USD',
    rating: 4.9,
    reviewCount: 567,
    bestSeason: 'Dry Season',
    recommendedDays: 7,
    latitude: -8.3405,
    longitude: 115.092,
    highlights: ['Tegallalang Rice Terraces', 'Uluwatu Temple', 'Seminyak Beach', 'Ubud Monkey Forest'],
    status: 'published',
  },
  {
    title: 'Reykjavik',
    country: 'Iceland',
    city: 'Reykjavik',
    shortDescription: 'Gateway to dramatic landscapes of geysers, hot springs, and the Northern Lights.',
    fullDescription: 'Reykjavik is the capital and largest city of Iceland. It is the most populous city in the country and serves as a gateway to the dramatic Icelandic landscapes including geysers, hot springs, glaciers, and volcanoes.',
    images: ['https://images.unsplash.com/photo-1504893524553-b855bce32c67'],
    category: 'adventure',
    averageDailyCost: 150,
    currency: 'USD',
    rating: 4.6,
    reviewCount: 189,
    bestSeason: 'Winter',
    recommendedDays: 6,
    latitude: 64.1466,
    longitude: -21.9426,
    highlights: ['Northern Lights', 'Blue Lagoon', 'Golden Circle', 'Hallgrimskirkja'],
    status: 'published',
  },
  {
    title: 'Marrakech',
    country: 'Morocco',
    city: 'Marrakech',
    shortDescription: 'Ancient medina with bustling souks, palaces, and the iconic Jemaa el-Fnaa square.',
    fullDescription: 'Marrakech is a major city in Morocco. The medina is a densely packed, walled medieval city dating to the Berber Empire, with mazelike alleys where thriving souks sell traditional textiles, pottery, and jewelry.',
    images: ['https://images.unsplash.com/photo-1518730518541-d0843268c287'],
    category: 'cultural',
    averageDailyCost: 50,
    currency: 'USD',
    rating: 4.5,
    reviewCount: 203,
    bestSeason: 'Spring',
    recommendedDays: 4,
    latitude: 31.6295,
    longitude: -7.9811,
    highlights: ['Jemaa el-Fnaa', 'Bahia Palace', 'Majorelle Garden', 'Medina Souks'],
    status: 'published',
  },
];

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || 'admin@tripmind.ai';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || 'Admin123!';
const DEMO_EMAIL = process.env.SEED_DEMO_EMAIL || 'demo@tripmind.ai';
const DEMO_PASSWORD = process.env.SEED_DEMO_PASSWORD || 'Demo123!';

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('Connected to MongoDB');

    // Create admin user (upsert by email)
    const existingAdmin = await User.findOne({ email: ADMIN_EMAIL });
    let adminUser;
    if (existingAdmin) {
      adminUser = existingAdmin;
      console.log(`Admin user already exists: ${ADMIN_EMAIL}`);
    } else {
      adminUser = await User.create({
        name: 'Admin',
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        role: 'admin',
      });
      console.log(`Admin user created: ${ADMIN_EMAIL}`);
    }

    // Create demo user (upsert by email)
    const existingDemo = await User.findOne({ email: DEMO_EMAIL });
    let demoUser;
    if (existingDemo) {
      demoUser = existingDemo;
      console.log(`Demo user already exists: ${DEMO_EMAIL}`);
    } else {
      demoUser = await User.create({
        name: 'Demo User',
        email: DEMO_EMAIL,
        password: DEMO_PASSWORD,
        role: 'user',
      });
      console.log(`Demo user created: ${DEMO_EMAIL}`);
    }

    // Ensure free subscriptions exist for both users
    for (const user of [adminUser, demoUser]) {
      const existing = await Subscription.findOne({ userId: user._id });
      if (!existing) {
        await Subscription.create({
          userId: user._id,
          plan: 'free',
          status: 'active',
          aiCredits: 3,
        });
        console.log(`Free subscription created for ${user.email}`);
      }
    }

    // Seed destinations (upsert by title+country)
    for (const dest of DESTINATIONS) {
      const existing = await Destination.findOne({ title: dest.title, country: dest.country });
      if (!existing) {
        let slug = dest.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        const slugExists = await Destination.findOne({ slug });
        if (slugExists) {
          slug = slug + '-' + Date.now();
        }
        await Destination.create({
          ...dest,
          slug,
          createdBy: adminUser._id,
        });
        console.log(`Destination created: ${dest.title}`);
      } else {
        console.log(`Destination already exists: ${dest.title}`);
      }
    }

    console.log('\nSeed completed successfully!');
    console.log(`Admin: ${ADMIN_EMAIL}`);
    console.log(`Demo: ${DEMO_EMAIL}`);
    process.exit(0);
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  }
};

seed();
