import { supabase } from '@/lib/supabase/client.jsx';

/* ------------------------------------------------------------------ */
/*  Contact defaults                                                   */
/* ------------------------------------------------------------------ */
export const DEFAULT_CONTACT_CONTENT = {
  heroOpenText: 'We’re online now',
  heroClosedText: 'We’ll reply when we’re back',
  heroTitle: 'Tell us where you want to go',
  heroDescription: 'A real planner reads every message. Send your dates, your group and your ideas, and we’ll come back with a plan and a price.',
  waysHeading: 'Ways to reach us',
  channels: [
    { type: 'phone', title: 'Call us', text: '+34 631 632 341', href: 'tel:+34631632341', note: 'Fastest for urgent trips' },
    { type: 'whatsapp', title: 'WhatsApp', text: 'Chat with a planner', href: 'https://wa.me/34631632341', note: 'Share photos and dates easily' },
    { type: 'email', title: 'Email', text: 'habibiadventure.26@gmail.com', href: 'mailto:habibiadventure.26@gmail.com', note: 'Best for itineraries and quotes' },
    { type: 'visit', title: 'Visit', text: 'Boulevard Mohammed V', href: 'https://www.google.com/maps/search/?api=1&query=Tangier+Morocco', note: 'Tangier 90000, Morocco' },
  ],
  topics: [
    'Plan a trip',
    'Question about a booking',
    'Custom itinerary or group',
    'Partnership',
    'Something else',
  ],
  hoursHeading: 'Office hours',
  visitHeading: 'Visit the office',
  socialsHeading: 'Follow our trips',
  faqHeading: 'Before you write',
  address: ['Boulevard Mohammed V', 'Tangier 90000, Morocco'],
  mapsHref: 'https://www.google.com/maps/search/?api=1&query=Tangier+Morocco',
  timeZone: 'Africa/Casablanca',
  hours: {
    Mon: { open: '09:00', close: '18:00', closed: false },
    Tue: { open: '09:00', close: '18:00', closed: false },
    Wed: { open: '09:00', close: '18:00', closed: false },
    Thu: { open: '09:00', close: '18:00', closed: false },
    Fri: { open: '09:00', close: '18:00', closed: false },
    Sat: { open: '10:00', close: '14:00', closed: false },
    Sun: { open: '10:00', close: '14:00', closed: true },
  },
  socials: [
    { label: 'Instagram', href: '' },
    { label: 'Facebook', href: '' },
    { label: 'YouTube', href: '' },
  ],
  faqs: [
    { q: 'How fast will I get a reply?', a: 'Messages sent during office hours get a reply within a few hours. Anything sent overnight is answered first thing the next working day.' },
    { q: 'Do I pay anything to ask for a quote?', a: 'No. Quotes are free and come with no obligation. You only pay once you confirm a trip and we’ve confirmed availability.' },
    { q: 'Can you change a trip from the catalog?', a: 'Yes. Most packages can be shortened, extended or swapped for different stays. Tell us what you’d like and we’ll price it.' },
    { q: 'I already booked. Who do I contact?', a: 'Choose “Question about a booking” and include your reference number, or call us directly if you’re travelling in the next 48 hours.' },
  ],
};

/* ------------------------------------------------------------------ */
/*  About defaults                                                     */
/* ------------------------------------------------------------------ */
export const DEFAULT_ABOUT_CONTENT = {
  location: 'Based in Tangier, Morocco',
  heroTitle: 'We’re the people behind your trip',
  heroDescription: 'A small team of planners, guides and hosts who grew up on these roads and still can’t stop showing them off.',
  stats: [
    { value: 12, suffix: '+', label: 'Years planning trips', decimals: 0 },
    { value: 8400, suffix: '+', label: 'Travelers hosted', decimals: 0 },
    { value: 60, suffix: '+', label: 'Local partners', decimals: 0 },
    { value: 4.9, suffix: '/5', label: 'Average review', decimals: 1 },
  ],
  storyTitle: 'It started with a van and a long list of favorite places',
  storyParagraphs: [
    'We began by taking friends of friends around Tangier: the medina at dawn, the caves at Hercules, the café where two seas seem to meet. They kept telling their friends, and the van got bigger.',
    'Today we plan trips across Morocco, from the Rif mountains to the Sahara. What hasn’t changed is how we work. We pick every stay ourselves, we pay local people fairly, and we answer the phone.',
  ],
  storyPrimaryCta: 'See our trips',
  storySecondaryCta: 'Talk to a planner',
  reviewScore: '4.9 out of 5',
  reviewCaption: 'from guests',
  valuesTitle: 'What we promise every traveler',
  values: [
    { icon: 'Compass', title: 'Local first', text: 'Our guides, drivers and hosts live where you’re going. They know which café is worth the detour.' },
    { icon: 'Heart', title: 'Personal by default', text: 'No copy-pasted itineraries. Every trip is shaped around who’s travelling and how they like to move.' },
    { icon: 'ShieldCheck', title: 'Honest pricing', text: 'You see what’s included and what isn’t before you pay. No surprise fees at the border or the hotel desk.' },
    { icon: 'Leaf', title: 'Light footprint', text: 'Small groups, family-run stays and money that stays in the communities you visit.' },
  ],
  timelineTitle: 'How we got here',
  milestones: [
    { year: '2014', title: 'First tour', text: 'Two founders and one van, running day trips out of Tangier.' },
    { year: '2017', title: 'Beyond the north', text: 'Added Chefchaouen, Fes and Marrakech circuits with a growing guide team.' },
    { year: '2020', title: 'Rebuilt for flexibility', text: 'Introduced changeable bookings and a 24/7 support line.' },
    { year: '2023', title: 'Sahara and Atlas', text: 'Opened private desert camps and mountain treks with partner families.' },
    { year: '2026', title: 'Online booking', text: 'Launched this site so you can browse, tweak and request a trip in minutes.' },
  ],
  processTitle: 'How planning a trip with us works',
  steps: [
    { title: 'Tell us your idea', text: 'Dates, who’s coming, what you love. A short message or a call is enough.' },
    { title: 'We draft a plan', text: 'A planner sends a day-by-day itinerary and a clear price, usually within a day.' },
    { title: 'Adjust until it fits', text: 'Swap a stay, add a night, skip a stop. We keep revising until you’re happy.' },
    { title: 'Travel with backup', text: 'Transfers, tickets and tables are booked, and a real person is on call the whole way.' },
  ],
  teamTitle: 'Meet the team you’ll talk to',
  teamCaption: 'Real people, real names, real phone numbers',
  team: [
    { name: 'Ayoub El Idrissi', role: 'Founder and lead planner', img: '/images/team-1.jpg' },
    { name: 'Salma Benali', role: 'Head of experiences', img: '/images/team-2.jpg' },
    { name: 'Omar Tazi', role: 'Guide coordinator', img: '/images/team-3.jpg' },
    { name: 'Lina Chraibi', role: 'Guest care', img: '/images/team-4.jpg' },
  ],
  ctaKicker: 'Planning is free, and so is the quote',
  ctaTitle: 'Ready to see Morocco with people who love it?',
  ctaPrimary: 'Browse packages',
  ctaSecondary: 'Contact us',
};

/* ------------------------------------------------------------------ */
/*  Services defaults                                                  */
/* ------------------------------------------------------------------ */
export const DEFAULT_SERVICES_CONTENT = {
  hero: {
    badge: 'Our services',
    title: 'Everything a trip needs, handled',
    description: 'Take a ready-made package, or pick only the services you want. Add what you need to a request and we’ll send one clear quote.',
    image: '/images/services-hero.jpg',
  },
  categories: [
    { id: 'plan', label: 'Planning' },
    { id: 'stay', label: 'Stays' },
    { id: 'move', label: 'Getting around' },
    { id: 'experience', label: 'Experiences' },
    { id: 'support', label: 'Support' },
  ],
  services: [
    {
      id: 'itineraries',
      category: 'plan',
      icon: 'Route',
      title: 'Custom itineraries',
      text: 'A day-by-day plan built around your dates, pace and budget, with room to change it.',
      includes: ['Route and timing', 'Stay and activity picks', 'Fixed, written price'],
      goodFor: 'First visits and complex routes',
    },
    {
      id: 'groups',
      category: 'plan',
      icon: 'Users',
      title: 'Group and corporate trips',
      text: 'Family reunions, team retreats and friend groups, handled from first quote to last transfer.',
      includes: ['One point of contact', 'Group rates', 'Shared payment options'],
      goodFor: '6 or more travelers',
    },
    {
      id: 'celebrations',
      category: 'plan',
      icon: 'Heart',
      title: 'Honeymoons and celebrations',
      text: 'Private dinners, rooftop breakfasts and quiet stays for the moments worth marking.',
      includes: ['Romantic stays', 'Surprise arrangements', 'Photographer on request'],
      goodFor: 'Honeymoons, anniversaries, birthdays',
    },
    {
      id: 'stays',
      category: 'stay',
      icon: 'BedDouble',
      title: 'Riads, hotels and villas',
      text: 'Places we’ve visited ourselves, from courtyard riads to private pool villas.',
      includes: ['Handpicked properties', 'Room upgrades where we can', 'Late check-in coordination'],
      goodFor: 'Anyone who wants a stay with character',
    },
    {
      id: 'transfers',
      category: 'move',
      icon: 'Car',
      title: 'Private transfers',
      text: 'Airport pickups and city-to-city rides in clean, air-conditioned cars with a driver who waits.',
      includes: ['Meet and greet', 'Flight tracking', 'Child seats on request'],
      goodFor: 'Arrivals, departures, long drives',
    },
    {
      id: 'driver',
      category: 'move',
      icon: 'Compass',
      title: 'Car with a driver',
      text: 'Keep a driver for the day or the week and change the plan as you go.',
      includes: ['Local driver-guide', 'Flexible stops', 'Fuel and tolls included'],
      goodFor: 'Families and photographers',
    },
    {
      id: 'tours',
      category: 'experience',
      icon: 'Compass',
      title: 'Guided tours',
      text: 'Medina walks, food tours and day trips led by people who live there.',
      includes: ['Licensed local guides', 'Small groups or private', 'Tastings and tickets sorted'],
      goodFor: 'Culture, food and history',
    },
    {
      id: 'treks',
      category: 'experience',
      icon: 'Mountain',
      title: 'Desert and mountain treks',
      text: 'Camel treks, Atlas hikes and nights in camps run by partner families.',
      includes: ['Camp or lodge stay', 'Guides and gear', 'Meals on the trail'],
      goodFor: 'Adventure and big landscapes',
    },
    {
      id: 'documents',
      category: 'support',
      icon: 'FileCheck',
      title: 'Entry and document guidance',
      text: 'A checklist of what you need to enter and move around, so nothing surprises you at the border.',
      includes: ['Document checklist', 'Booking letters', 'Pointers to official sources'],
      goodFor: 'International first-timers',
    },
    {
      id: 'support',
      category: 'support',
      icon: 'Headphones',
      title: '24/7 trip support',
      text: 'A real person on call from the moment you land until you’re home.',
      includes: ['Phone and WhatsApp', 'Rebooking help', 'Local emergency contacts'],
      goodFor: 'Every trip we book',
    },
  ],
  ways: [
    {
      icon: 'PackageOpen',
      title: 'Book a ready-made package',
      text: 'Pick a trip from the catalog, choose a departure date and request it. Fastest way to go.',
      cta: 'Browse packages',
      to: '/packages',
    },
    {
      icon: 'Wrench',
      title: 'Tweak a package',
      text: 'Like a trip but want one more night, a different stay or a private guide? We’ll adjust and re-price it.',
      cta: 'Ask for changes',
      to: '/contact?topic=Custom%20itinerary%20or%20group',
    },
    {
      icon: 'Wand2',
      title: 'Build it from scratch',
      text: 'Choose the services you need above and we’ll assemble a plan around them.',
      cta: 'Start with services',
      to: '#catalog',
    },
  ],
  cta: {
    kicker: 'Not sure what you need?',
    title: 'Describe the trip and we’ll suggest the rest',
    buttonText: 'Talk to a planner',
    buttonLink: '/contact',
  },
};

/* ------------------------------------------------------------------ */
/*  Homepage Reviews defaults                                          */
/* ------------------------------------------------------------------ */
export const DEFAULT_REVIEWS_CONTENT = {
  heading: 'Memorable Journeys. Meaningful Experiences.',
  subheading: 'Every journey tells a story. Discover what travelers have to say about their experiences exploring Morocco with us.',
  badge: 'Guest Stories',
  items: [
    {
      id: 'rev-1',
      name: 'Sarah Mitchell',
      from: 'United States',
      rating: 5,
      avatar: '',
      trip: 'Tangier & Chefchaouen Cultural Circuit',
      text: 'Our guide made discovering Tangier such a wonderful experience. We explored places we would never have found on our own, and every moment felt authentic and memorable.',
    },
    {
      id: 'rev-2',
      name: 'Youssef El Idrissi',
      from: 'Casablanca, Morocco',
      rating: 5,
      avatar: '',
      trip: 'Merzouga Desert Luxury Expedition',
      text: 'Everything was so easy to organize. From transportation to our experiences, everything was planned with care. We had an amazing time and can’t wait to return to Morocco.',
    },
    {
      id: 'rev-3',
      name: 'Claire Dubois',
      from: 'Lyon, France',
      rating: 5,
      avatar: '',
      trip: 'Essaouira Coastal Retreat',
      text: 'Essaouira was absolutely beautiful. The experience was peaceful, comfortable and thoughtfully organized. It was exactly the kind of trip we wanted.',
    },
    {
      id: 'rev-4',
      name: 'David & Elena Schmidt',
      from: 'Berlin, Germany',
      rating: 5,
      avatar: '',
      trip: 'Grand Morocco 10-Day Private Tour',
      text: 'Flawless from start to finish. The team arranged wonderful local riads, reliable drivers, and authentic culinary stops that standard tours miss completely.',
    },
  ],
};

/* ------------------------------------------------------------------ */
/*  Blog defaults                                                      */
/* ------------------------------------------------------------------ */
export const DEFAULT_BLOG_CONTENT = {
  hero: {
    badge: 'Travel Journal & Insights',
    title: 'Stories, Guides & Inspiration from Morocco',
    description: 'Expert advice, hidden gems, and in-depth travel notes written by our local guides and journey planners.',
    featuredPostSlug: 'first-timers-guide-to-morocco',
  },
  categories: ['All', 'Travel Guides', 'Culture & Traditions', 'Food & Dining', 'Desert & Mountains', 'Tips & Packing'],
  posts: [
    {
      id: 'post-1',
      slug: 'first-timers-guide-to-morocco',
      title: 'The First-Timer’s Essential Guide to Morocco: What to Know Before You Go',
      excerpt: 'From navigating historic medinas with confidence to tipping etiquette and cultural customs, here is everything you need for a smooth and rewarding Moroccan journey.',
      coverImage: 'https://images.unsplash.com/photo-1539020140153-e479b8c22e70?auto=format&fit=crop&w=1200&q=80',
      category: 'Travel Guides',
      author: {
        name: 'Ayoub El Idrissi',
        role: 'Lead Journey Planner',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
      },
      publishedAt: '2026-11-15',
      readTime: '6 min read',
      published: true,
      featured: true,
      content: `### Welcoming Hospitality and Ancient Traditions\nMorocco is a sensory tapestry unlike anywhere else on earth. The scent of orange blossom water mingling with cumin, the call to prayer echoing against ancient city walls, and the labyrinthine lanes of imperial medinas welcome travelers into living history.\n\nFor travelers visiting for the first time, a few thoughtful preparations transform an overwhelming experience into an unforgettable adventure.\n\n### 1. Navigating the Medinas with Confidence\nThe old walled quarters of Fes, Marrakech, and Chefchaouen were designed centuries ago for pedestrians and pack animals. GPS signals often bounce erratically off tall riad walls, so here is the golden rule:\n- Don't worry about getting lost: getting pleasantly lost is part of the charm!\n- Look for main artery landmarks: minarets, main gates (babs), and central squares.\n- If you need directions, ask a shopkeeper sitting comfortably inside their shop rather than someone wandering the alley.\n\n### 2. Money, Currency & Tipping\nMorocco uses the Moroccan Dirham (MAD). While high-end hotels and modern restaurants accept cards, cash is essential in medinas, souks, and roadside cafes.\n- Keep small bills (20, 50 MAD) ready for tips, fresh juices, and souvenirs.\n- Tipping (pourboire) is customary and appreciated: 10% in sit-down restaurants, 5-10 MAD for luggage, and 100-200 MAD per day for dedicated drivers.\n\n### 3. Cultural Respect and What to Wear\nMorocco is a warm and hospitable country with diverse traditions. When exploring cities and rural villages:\n- Modest dress is respectful: light, breathable fabrics covering shoulders and knees work best for both climate and comfort.\n- In coastal areas like Taghazout and Essaouira, beachwear is completely normal by the water.\n- Always ask politely before photographing artisans or local residents.\n\n### 4. Savoring the Culinary Magic\nDo not leave without savoring slow-simmered lamb tagine with prunes and toasted almonds, crispy pastilla dusted with cinnamon and powdered sugar, and piping-hot mint tea poured from a height to create a delicate foam.`,
    },
    {
      id: 'post-2',
      slug: 'sahara-desert-luxury-camp-experience',
      title: 'Spending the Night Under the Stars: What to Expect in a Luxury Sahara Camp',
      excerpt: 'Beyond the dunes of Erg Chebbi and Erg Chigaga lies a peaceful silence found nowhere else. Discover the magic of sleeping under a celestial sky.',
      coverImage: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=1200&q=80',
      category: 'Desert & Mountains',
      author: {
        name: 'Salma Benali',
        role: 'Experiences Coordinator',
        avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=150&q=80',
      },
      publishedAt: '2026-11-10',
      readTime: '5 min read',
      published: true,
      featured: false,
      content: `### The Golden Silence of Erg Chebbi\nThere is a specific moment as the sun dips below the golden crests of the dunes when the entire desert seems to exhale. The warmth radiating from the sands softens into cool desert dusk, and shades of ochre and crimson dissolve into deep violet.\n\n### Glamping Without Compromise\nGone are the days when staying in the Sahara meant cramped trekking tents without amenities. Today's luxury desert camps feature:\n- Private en-suite bathrooms with hot showers and flush toilets.\n- King-size beds dressed in crisp organic cotton linens and handwoven Berber blankets.\n- Solar-powered electricity for charging cameras and lighting tents softly after dark.\n\n### Evenings Around the Campfire\nAfter a candlelit multi-course dinner featuring local specialties, guests gather around a crackling tamarisk-wood fire. Berber hosts share ancestral drumming, storytelling, and astronomical lore beneath the Milky Way, visible in awe-inspiring clarity free of light pollution.`,
    },
    {
      id: 'post-3',
      slug: 'moroccan-culinary-secrets-spices-tagines',
      title: 'A Culinary Journey Through Morocco: Spices, Street Food & Royal Pastilla',
      excerpt: 'Moroccan cuisine is an art form refined over dynasties. Learn how ras el hanout, preserved lemons, and slow cooking create unmatched flavors.',
      coverImage: 'https://images.unsplash.com/photo-1541518763669-27fef04b14ea?auto=format&fit=crop&w=1200&q=80',
      category: 'Food & Dining',
      author: {
        name: 'Omar Tazi',
        role: 'Culinary & Culture Guide',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
      },
      publishedAt: '2026-11-04',
      readTime: '7 min read',
      published: true,
      featured: false,
      content: `### The Alchemy of Ras El Hanout\nLiterally translating to "head of the shop", Ras El Hanout is a master spice blend that can contain between 15 and 30 distinct spices. Cardamom, nutmeg, mace, cinnamon, dried rosebuds, grains of paradise, and ground ginger are toasted and ground together in precise harmony.\n\n### Slow Cooking in Clay Tagines\nThe conical lid of the traditional earthenware tagine is an ingenious engineering feat. It traps rising steam, condenses it, and returns it to the simmering base, keeping meats astonishingly tender without needing excessive water or oils.\n\n### The Crown Jewel: Pastilla\nOriginating from Andalusian-Moorish heritage, pastilla marries savory poultry, slow-cooked onions, and eggs with crunchy layers of paper-thin warqa pastry, toasted almonds, cinnamon, and sugar. It is the centerpiece of festive Moroccan celebrations.`,
    },
    {
      id: 'post-4',
      slug: 'chefchaouen-blue-pearl-photography-guide',
      title: 'Photographing Chefchaouen: Quiet Corners of the Blue Pearl',
      excerpt: 'How to discover the most photogenic alleyways, avoid crowds, and capture the captivating shades of blue tucked away in the Rif Mountains.',
      coverImage: 'https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=1200&q=80',
      category: 'Culture & Traditions',
      author: {
        name: 'Lina Chraibi',
        role: 'Guest Care & Photography',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
      },
      publishedAt: '2026-10-28',
      readTime: '4 min read',
      published: true,
      featured: false,
      content: `### Why is Chefchaouen Painted Blue?\nNestled in the dramatic folds of the Rif Mountains, Chefchaouen's cerulean medina draws photographers worldwide. Several stories explain the hue: Jewish refugees who settled here in the 15th century introduced blue as a reminder of the heavens, while locals also note it deters mosquitoes and keeps houses cool in summer.\n\n### Best Times for Photography\n- **Early Morning (7:00 AM – 9:00 AM)**: The medina belongs to locals sweeping shop thresholds and schoolchildren carrying baguettes. The light is soft and the iconic blue staircases are empty.\n- **Golden Hour at the Spanish Mosque**: A gentle 20-minute hike up to Bouzafar offers panoramic vistas of the blue village bathed in amber twilight as the call to prayer reverberates across the valley.`,
    },
  ],
};

/* ------------------------------------------------------------------ */
/*  Destinations defaults                                              */
/* ------------------------------------------------------------------ */
export const DEFAULT_DESTINATIONS_CONTENT = {
  hero: {
    badge: 'Explore Morocco',
    title: 'Discover Incredible Destinations',
    description: 'From the blue streets of Chefchaouen to the golden dunes of the Sahara — find your perfect Moroccan adventure.',
    image: 'https://images.unsplash.com/photo-1539020140153-e479b8c22e70?auto=format&fit=crop&w=1600&q=80',
  },
  destinations: [
    {
      id: 'dest-1',
      slug: 'tangier',
      name: 'Tangier',
      tagline: 'Where Two Seas Meet',
      country: 'Morocco',
      region: 'Northern Morocco',
      image: 'https://images.unsplash.com/photo-1517154421773-0529f29ea451?auto=format&fit=crop&w=800&q=80',
      coverImage: 'https://images.unsplash.com/photo-1517154421773-0529f29ea451?auto=format&fit=crop&w=1200&q=80',
      description: 'Discover Tangier, a captivating coastal city where Mediterranean charm meets Moroccan culture. Explore its historic medina, stroll along scenic waterfronts and experience the unique atmosphere of a city connecting Africa and Europe.',
      highlights: ['Historic Medina', 'Cape Spartel', 'Hercules Caves', 'Kasbah Museum', 'Grand Socco Square'],
      duration: '2–3 days',
      difficulty: 'Easy',
      bestSeason: 'April – October',
      featured: true,
      published: true,
      activities: ['City Tours', 'Cultural Visits', 'Food Tours', 'Photography'],
      includes: ['Local guide', 'Entry tickets', 'Traditional lunch'],
      gallery: [],
    },
    {
      id: 'dest-2',
      slug: 'chefchaouen',
      name: 'Chefchaouen',
      tagline: "Morocco's Blue Pearl",
      country: 'Morocco',
      region: 'Rif Mountains',
      image: 'https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=800&q=80',
      coverImage: 'https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=1200&q=80',
      description: 'Wander through the enchanting blue streets of Chefchaouen, nestled in the Rif Mountains. Discover traditional architecture, mountain scenery, local crafts and a peaceful atmosphere unlike anywhere else in Morocco.',
      highlights: ['Blue Medina', 'Spanish Mosque', 'Ras El Maa Waterfall', 'Juta Mountain Hike', 'Local Craft Souks'],
      duration: '1–2 days',
      difficulty: 'Easy',
      bestSeason: 'March – June, September – November',
      featured: true,
      published: true,
      activities: ['Photography', 'Hiking', 'Shopping', 'Cultural Visits'],
      includes: ['Local guide', 'Mountain viewpoint visit'],
      gallery: [],
    },
    {
      id: 'dest-3',
      slug: 'marrakech',
      name: 'Marrakech',
      tagline: 'The Heart of Moroccan Culture',
      country: 'Morocco',
      region: 'Central Morocco',
      image: 'https://images.unsplash.com/photo-1553603227-2358aabe821e?auto=format&fit=crop&w=800&q=80',
      coverImage: 'https://images.unsplash.com/photo-1553603227-2358aabe821e?auto=format&fit=crop&w=1200&q=80',
      description: 'Explore Marrakech, one of Morocco\'s most iconic destinations. Discover vibrant souks, traditional riads, historic palaces, beautiful gardens and the unforgettable energy of Jemaa el-Fna.',
      highlights: ['Jemaa el-Fna Square', 'Majorelle Garden', 'Bahia Palace', 'Ben Youssef Medersa', 'Souks & Medina'],
      duration: '3–4 days',
      difficulty: 'Easy',
      bestSeason: 'October – April',
      featured: true,
      published: true,
      activities: ['City Tours', 'Cooking Classes', 'Hammam', 'Shopping', 'Nightlife'],
      includes: ['Riad accommodation', 'Guided medina tour', 'Traditional dinner'],
      gallery: [],
    },
    {
      id: 'dest-4',
      slug: 'merzouga',
      name: 'Merzouga & Sahara',
      tagline: 'Experience the Magic of the Desert',
      country: 'Morocco',
      region: 'Southeastern Morocco',
      image: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=800&q=80',
      coverImage: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=1200&q=80',
      description: 'Journey into the Sahara Desert in Merzouga and discover the breathtaking Erg Chebbi dunes. Enjoy unforgettable desert landscapes, traditional Berber experiences, sunset views and nights beneath the stars.',
      highlights: ['Erg Chebbi Dunes', 'Camel Trek', 'Desert Camp Overnight', 'Sunrise Dune Walk', 'Berber Villages'],
      duration: '2–3 days',
      difficulty: 'Moderate',
      bestSeason: 'October – March',
      featured: true,
      published: true,
      activities: ['Camel Trekking', 'Sandboarding', 'Stargazing', 'Quad Biking'],
      includes: ['Desert camp stay', 'Camel trek', 'Berber dinner', 'Sunrise hike'],
      gallery: [],
    },
    {
      id: 'dest-5',
      slug: 'essaouira',
      name: 'Essaouira',
      tagline: 'Coastal Charm & Atlantic Breezes',
      country: 'Morocco',
      region: 'Atlantic Coast',
      image: 'https://images.unsplash.com/photo-1569383746724-6f1b882b8f46?auto=format&fit=crop&w=800&q=80',
      coverImage: 'https://images.unsplash.com/photo-1569383746724-6f1b882b8f46?auto=format&fit=crop&w=1200&q=80',
      description: 'Experience the relaxed atmosphere of Essaouira, a coastal destination famous for its historic ramparts, charming medina, fishing harbor, fresh seafood and beautiful Atlantic coastline.',
      highlights: ['Skala Ramparts', 'Fishing Harbor', 'Gnaoua Music', 'Beach & Watersports', 'Medina UNESCO Site'],
      duration: '1–2 days',
      difficulty: 'Easy',
      bestSeason: 'April – October',
      featured: false,
      published: true,
      activities: ['Beach', 'Surfing', 'Kiteboarding', 'City Walking', 'Seafood Dining'],
      includes: ['Rampart walk', 'Fish market visit', 'Seafood lunch'],
      gallery: [],
    },
  ],
};

/* ------------------------------------------------------------------ */
/*  Partnerships defaults                                              */
/* ------------------------------------------------------------------ */
export const DEFAULT_PARTNERSHIPS_CONTENT = {
  badge: 'Trusted Partners',
  heading: 'The Local Experts Behind Your Journey',
  description: 'We work with the finest hotels, guides, transport providers and experience operators across Morocco — people we know personally and trust completely.',
  partners: [
    {
      id: 'partner-1',
      name: 'Atlas Luxury Riads',
      category: 'Hotels & Riads',
      logo: '',
      description: 'A curated collection of authentic riads and luxury boutique hotels across Morocco\'s imperial cities.',
      website: '',
      featured: true,
    },
    {
      id: 'partner-2',
      name: 'Sahara Desert Camps',
      category: 'Experiences',
      logo: '',
      description: 'Premium desert camps in Erg Chebbi offering luxury glamping with traditional Berber hospitality.',
      website: '',
      featured: true,
    },
    {
      id: 'partner-3',
      name: 'Royal Air Maroc',
      category: 'Transport',
      logo: '',
      description: 'Morocco\'s national airline, connecting travelers to major Moroccan destinations with reliable service.',
      website: '',
      featured: true,
    },
    {
      id: 'partner-4',
      name: 'Medina Expert Guides',
      category: 'Guides',
      logo: '',
      description: 'Licensed local guides specializing in immersive cultural and culinary tours of Morocco\'s historic medinas.',
      website: '',
      featured: true,
    },
  ],
};

/* ------------------------------------------------------------------ */
/*  Merge helper                                                       */
/* ------------------------------------------------------------------ */
function mergeContent(defaults, saved = {}) {
  if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return defaults;
  return Object.fromEntries(
    Object.entries(defaults).map(([key, defaultValue]) => {
      const savedValue = saved[key];
      if (Array.isArray(defaultValue)) {
        return [key, Array.isArray(savedValue) ? savedValue : defaultValue];
      }
      if (defaultValue && typeof defaultValue === 'object') {
        return [key, mergeContent(defaultValue, savedValue)];
      }
      return [key, savedValue ?? defaultValue];
    }),
  );
}

const LOCAL_STORAGE_KEY = 'public_site_content_cache';

function readLocalCache() {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeLocalCache(page, content) {
  if (typeof window === 'undefined') return;
  try {
    const current = readLocalCache();
    current[page] = content;
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(current));
  } catch {
    // ignore
  }
}

/* ------------------------------------------------------------------ */
/*  Fetch all public content                                           */
/* ------------------------------------------------------------------ */
export async function fetchPublicSiteContent() {
  const localCache = readLocalCache();

  try {
    // Try to fetch all columns
    const { data, error } = await supabase
      .from('public_site_content')
      .select('*')
      .eq('id', 'public')
      .maybeSingle();

    if (error) {
      console.warn('Could not select * from public_site_content, falling back to basic columns:', error.message);
      // Fallback to contact and about only
      const basic = await supabase
        .from('public_site_content')
        .select('contact, about, services, home_reviews, blog, destinations, partnerships, agency_settings, contract_template')
        .eq('id', 'public')
        .maybeSingle();
      
      const basicData = basic.data || {};
      const extras = basicData?.about?._public_extras || {};

      return {
        contact: mergeContent(DEFAULT_CONTACT_CONTENT, basicData?.contact || localCache.contact),
        about: mergeContent(DEFAULT_ABOUT_CONTENT, basicData?.about || localCache.about),
        services: mergeContent(DEFAULT_SERVICES_CONTENT, basicData?.services || extras.services || localCache.services),
        homeReviews: mergeContent(DEFAULT_REVIEWS_CONTENT, basicData?.home_reviews || extras.homeReviews || localCache.homeReviews),
        blog: mergeContent(DEFAULT_BLOG_CONTENT, basicData?.blog || extras.blog || localCache.blog),
        destinations: mergeContent(DEFAULT_DESTINATIONS_CONTENT, basicData?.destinations || extras.destinations || localCache.destinations),
        partnerships: mergeContent(DEFAULT_PARTNERSHIPS_CONTENT, basicData?.partnerships || extras.partnerships || localCache.partnerships),
        agencySettings: basicData?.agency_settings || localCache.agencySettings || {},
        contractTemplate: basicData?.contract_template || localCache.contractTemplate || {},
      };
    }

    const extras = data?.about?._public_extras || {};

    return {
      contact: mergeContent(DEFAULT_CONTACT_CONTENT, data?.contact || localCache.contact),
      about: mergeContent(DEFAULT_ABOUT_CONTENT, data?.about || localCache.about),
      services: mergeContent(DEFAULT_SERVICES_CONTENT, data?.services || extras.services || localCache.services),
      homeReviews: mergeContent(DEFAULT_REVIEWS_CONTENT, data?.home_reviews || extras.homeReviews || localCache.homeReviews),
      blog: mergeContent(DEFAULT_BLOG_CONTENT, data?.blog || extras.blog || localCache.blog),
      destinations: mergeContent(DEFAULT_DESTINATIONS_CONTENT, data?.destinations || extras.destinations || localCache.destinations),
      partnerships: mergeContent(DEFAULT_PARTNERSHIPS_CONTENT, data?.partnerships || extras.partnerships || localCache.partnerships),
      agencySettings: data?.agency_settings || localCache.agencySettings || {},
      contractTemplate: data?.contract_template || localCache.contractTemplate || {},
    };
  } catch (error) {
    console.error('fetchPublicSiteContent fallback to defaults & cache:', error);
    return {
      contact: mergeContent(DEFAULT_CONTACT_CONTENT, localCache.contact),
      about: mergeContent(DEFAULT_ABOUT_CONTENT, localCache.about),
      services: mergeContent(DEFAULT_SERVICES_CONTENT, localCache.services),
      homeReviews: mergeContent(DEFAULT_REVIEWS_CONTENT, localCache.homeReviews),
      blog: mergeContent(DEFAULT_BLOG_CONTENT, localCache.blog),
      destinations: mergeContent(DEFAULT_DESTINATIONS_CONTENT, localCache.destinations),
      partnerships: mergeContent(DEFAULT_PARTNERSHIPS_CONTENT, localCache.partnerships),
      agencySettings: localCache.agencySettings || {},
      contractTemplate: localCache.contractTemplate || {},
    };
  }
}

/* ------------------------------------------------------------------ */
/*  Save public content                                                */
/* ------------------------------------------------------------------ */
export async function savePublicPageContent(page, content) {
  const allowed = ['contact', 'about', 'services', 'homeReviews', 'blog', 'destinations', 'partnerships', 'agencySettings', 'contractTemplate'];
  if (!allowed.includes(page)) {
    throw new Error(`Unsupported public content page: ${page}.`);
  }

  // 1. Cache locally immediately
  writeLocalCache(page, content);

  const columnMap = {
    contact: 'contact',
    about: 'about',
    services: 'services',
    homeReviews: 'home_reviews',
    blog: 'blog',
    destinations: 'destinations',
    partnerships: 'partnerships',
    agencySettings: 'agency_settings',
    contractTemplate: 'contract_template',
  };

  const targetColumn = columnMap[page];

  // 2. Try direct column update on public_site_content
  try {
    const { data, error } = await supabase
      .from('public_site_content')
      .update({ [targetColumn]: content, updated_at: new Date().toISOString() })
      .eq('id', 'public')
      .select('id')
      .maybeSingle();

    if (!error && data) {
      return; // Direct column update succeeded
    }

    if (!error && !data) {
      throw new Error(`No se pudo encontrar el registro público al guardar ${targetColumn}.`);
    }

    if (error) {
      throw error;
    }
  } catch (err) {
    console.error(`Failed to save public page content for ${page}:`, err);
    throw err;
  }
}
