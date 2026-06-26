const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');

// Load env vars
dotenv.config();

const User = require('./models/User');
const Startup = require('./models/Startup');
const Opportunity = require('./models/Opportunity');
const Application = require('./models/Application');
const Payment = require('./models/Payment');

const connectDB = require('./config/db');

const seedData = async () => {
  try {
    await connectDB();

    // Clear existing data
    console.log('Clearing database collections...');
    await User.deleteMany();
    await Startup.deleteMany();
    await Opportunity.deleteMany();
    await Application.deleteMany();
    await Payment.deleteMany();

    console.log('Seeding users...');
    const salt = await bcrypt.genSalt(10);
    const commonPassword = await bcrypt.hash('Password123', salt);

    // 1. Create Admin
    const admin = new User({
      name: 'Platform Admin',
      email: 'admin@startupforge.com',
      password: commonPassword,
      role: 'Admin',
      image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
      isBlocked: false,
    });
    await admin.save();

    // 2. Create Founders
    const founder1 = new User({
      name: 'Sarah Jenkins',
      email: 'sarah@founder.com',
      password: commonPassword,
      role: 'Founder',
      image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=face',
    });
    await founder1.save();

    const founder2 = new User({
      name: 'David Chen',
      email: 'david@founder.com',
      password: commonPassword,
      role: 'Founder',
      image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
    });
    await founder2.save();

    // 3. Create Collaborators
    const col1 = new User({
      name: 'Alex Rivera',
      email: 'alex@collaborator.com',
      password: commonPassword,
      role: 'Collaborator',
      image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face',
      skills: ['React', 'Next.js', 'CSS', 'Figma', 'TypeScript'],
      bio: 'Frontend engineer with 3 years of experience. Excited to build responsive products and craft clean user interfaces.'
    });
    await col1.save();

    const col2 = new User({
      name: 'Elena Rostova',
      email: 'elena@collaborator.com',
      password: commonPassword,
      role: 'Collaborator',
      image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
      skills: ['Python', 'Node.js', 'Express', 'MongoDB', 'FastAPI'],
      bio: 'Backend developer focused on building scalable cloud services, databases, and microservices architecture.'
    });
    await col2.save();

    console.log('Seeding startups...');
    // Startup 1: Sarah's startup
    const startup1 = new Startup({
      startup_name: 'NexusAI',
      logo: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&h=150&fit=crop',
      industry: 'AI / ML',
      description: 'An AI-powered document search engine and summary generation tool tailored for compliance officers and financial analysts.',
      funding_stage: 'Seed Stage',
      founder_email: 'sarah@founder.com',
      status: 'Approved', // Approved by admin
    });
    await startup1.save();

    // Startup 2: David's startup
    const startup2 = new Startup({
      startup_name: 'PayFlow',
      logo: 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=150&h=150&fit=crop',
      industry: 'Fintech',
      description: 'A global multi-currency billing and payroll reconciliation dashboard designed for remote contractor management.',
      funding_stage: 'Pre-seed',
      founder_email: 'david@founder.com',
      status: 'Approved',
    });
    await startup2.save();

    // Startup 3: Pending startup
    const startup3 = new Startup({
      startup_name: 'MedLink',
      logo: 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=150&h=150&fit=crop',
      industry: 'Healthtech',
      description: 'Telemedicine scheduling assistant and appointment logging software for specialized clinics.',
      funding_stage: 'Idea Phase',
      founder_email: 'medfounder@test.com',
      status: 'Pending',
    });
    await startup3.save();

    console.log('Seeding opportunities...');
    // NexusAI Opportunities
    const opp1 = new Opportunity({
      startup_id: startup1._id,
      role_title: 'Frontend React Developer',
      required_skills: ['React', 'CSS', 'JavaScript', 'Tailwind'],
      work_type: 'Remote',
      commitment_level: 'Contract',
      deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    });
    await opp1.save();

    const opp2 = new Opportunity({
      startup_id: startup1._id,
      role_title: 'AI Integration Engineer',
      required_skills: ['Python', 'LangChain', 'OpenAI API', 'Node.js'],
      work_type: 'Hybrid',
      commitment_level: 'Full-time',
      deadline: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
    });
    await opp2.save();

    // PayFlow Opportunities
    const opp3 = new Opportunity({
      startup_id: startup2._id,
      role_title: 'Fullstack Next.js Developer',
      required_skills: ['Next.js', 'React', 'Node.js', 'MongoDB', 'Stripe'],
      work_type: 'Remote',
      commitment_level: 'Full-time',
      deadline: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
    });
    await opp3.save();

    const opp4 = new Opportunity({
      startup_id: startup2._id,
      role_title: 'UI/UX Designer',
      required_skills: ['Figma', 'Prototyping', 'User Research', 'CSS'],
      work_type: 'On-site',
      commitment_level: 'Part-time',
      deadline: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
    });
    await opp4.save();

    console.log('Seeding applications...');
    // Alex Rivera applies to Frontend React Developer
    const app1 = new Application({
      Opportunity_id: opp1._id,
      Applicant_email: 'alex@collaborator.com',
      Portfolio_link: 'https://github.com/alexrivera',
      Motivation: 'I have extensive experience working with React and responsive layouts. NexusAI sounds like a highly challenging and innovative environment!',
      Status: 'Pending',
    });
    await app1.save();

    // Elena Rostova applies to Fullstack Next.js Developer
    const app2 = new Application({
      Opportunity_id: opp3._id,
      Applicant_email: 'elena@collaborator.com',
      Portfolio_link: 'https://github.com/elenarostova',
      Motivation: 'Next.js and MongoDB is my go-to stack. I have built several dashboards in the past and would love to contribute to PayFlow billing modules.',
      Status: 'Accepted', // Preset as accepted for stats check
    });
    await app2.save();

    console.log('Seeding transaction logs...');
    const pay1 = new Payment({
      user_email: 'sarah@founder.com',
      amount: 49.00,
      transaction_id: 'ch_stripe_mock_nexusai_premium',
      payment_status: 'succeeded',
      paid_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
    });
    await pay1.save();

    console.log('Database seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seedData();
