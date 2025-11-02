export interface Subtopic {
  id: string;
  label: string;
  icon: string;
}

export interface Category {
  id: string;
  label: string;
  icon: string;
  children: Subtopic[];
}

export const TOPICS_DATA: Category[] = [
  {
    "id": "everyday-social",
    "label": "Everyday Life & Social",
    "icon": "fa-solid fa-comments",
    "children": [
      {"id": "greetings", "label": "Greetings & Small Talk", "icon": "fa-solid fa-handshake"},
      {"id": "weather", "label": "Weather & Seasons", "icon": "fa-solid fa-cloud-sun"},
      {"id": "directions", "label": "Directions & Navigation", "icon": "fa-solid fa-diamond-turn-right"},
      {"id": "time", "label": "Time & Schedules", "icon": "fa-solid fa-calendar-days"},
      {"id": "feelings", "label": "Feelings & Opinions", "icon": "fa-solid fa-face-smile"},
      {"id": "meeting-friends", "label": "Meeting People & Friends", "icon": "fa-solid fa-users"},
      {"id": "etiquette", "label": "Etiquette & Politeness", "icon": "fa-solid fa-people-arrows"},
      {"id": "events", "label": "Events & Parties", "icon": "fa-solid fa-champagne-glasses"}
    ]
  },
  {
    "id": "travel-transport",
    "label": "Travel & Transport",
    "icon": "fa-solid fa-plane",
    "children": [
      {"id": "airport", "label": "Airport & Flying", "icon": "fa-solid fa-plane-departure"},
      {"id": "public-transport", "label": "Train/Bus/Metro", "icon": "fa-solid fa-train-subway"},
      {"id": "hotel", "label": "Hotel & Check‑in", "icon": "fa-solid fa-bell-concierge"},
      {"id": "sightseeing", "label": "Sightseeing & Tours", "icon": "fa-solid fa-camera-retro"},
      {"id": "car-rental", "label": "Car Rental & Driving", "icon": "fa-solid fa-car"},
      {"id": "customs", "label": "Customs & Immigration", "icon": "fa-solid fa-passport"},
      {"id": "emergencies", "label": "Emergencies Abroad", "icon": "fa-solid fa-kit-medical"},
      {"id": "holiday-type", "label": "Beach/Mountain Holiday", "icon": "fa-solid fa-umbrella-beach"}
    ]
  },
  {
    "id": "food-dining",
    "label": "Food & Dining",
    "icon": "fa-solid fa-utensils",
    "children": [
      {"id": "cafe", "label": "Café & Ordering Drinks", "icon": "fa-solid fa-mug-saucer"},
      {"id": "restaurant", "label": "At a Restaurant", "icon": "fa-solid fa-book-open-reader"},
      {"id": "street-food", "label": "Street Food & Markets", "icon": "fa-solid fa-store"},
      {"id": "dietary-needs", "label": "Dietary Needs & Allergies", "icon": "fa-solid fa-wheat-awn-circle-exclamation"},
      {"id": "paying-bill", "label": "Tipping & Paying the Bill", "icon": "fa-solid fa-receipt"},
      {"id": "cooking", "label": "Cooking & Recipes", "icon": "fa-solid fa-kitchen-set"},
      {"id": "groceries", "label": "Groceries & Supermarket", "icon": "fa-solid fa-basket-shopping"},
      {"id": "nightlife", "label": "Bar & Nightlife", "icon": "fa-solid fa-martini-glass-citrus"}
    ]
  },
  {
    "id": "home-family",
    "label": "Home & Family",
    "icon": "fa-solid fa-house",
    "children": [
      {"id": "housing", "label": "Housing & Renting", "icon": "fa-solid fa-house-chimney-user"},
      {"id": "utilities", "label": "Utilities & Bills", "icon": "fa-solid fa-lightbulb"},
      {"id": "chores", "label": "Chores & Cleaning", "icon": "fa-solid fa-broom"},
      {"id": "parenting", "label": "Family & Parenting", "icon": "fa-solid fa-children"},
      {"id": "pets", "label": "Pets", "icon": "fa-solid fa-paw"},
      {"id": "neighbors", "label": "Neighbors & Community", "icon": "fa-solid fa-person-shelter"},
      {"id": "repairs", "label": "Moving & Repairs", "icon": "fa-solid fa-screwdriver-wrench"},
      {"id": "gardening", "label": "Gardening", "icon": "fa-solid fa-seedling"}
    ]
  },
  {
    "id": "work-professions",
    "label": "Work & Professions",
    "icon": "fa-solid fa-briefcase",
    "children": [
      {"id": "office", "label": "Office & Meetings", "icon": "fa-solid fa-users-viewfinder"},
      {"id": "email", "label": "Emails & Messaging", "icon": "fa-solid fa-at"},
      {"id": "factory", "label": "Factory Floor", "icon": "fa-solid fa-industry"},
      {"id": "construction", "label": "Construction Site", "icon": "fa-solid fa-helmet-safety"},
      {"id": "retail", "label": "Retail/Store", "icon": "fa-solid fa-cash-register"},
      {"id": "bakery", "label": "Bakery & Kitchen", "icon": "fa-solid fa-bread-slice"},
      {"id": "call-center", "label": "Call Center/Support", "icon": "fa-solid fa-headset"},
      {"id": "healthcare-setting", "label": "Healthcare Setting", "icon": "fa-solid fa-user-doctor"}
    ]
  },
  {
    "id": "education-academia",
    "label": "Education & Academia",
    "icon": "fa-solid fa-school",
    "children": [
      {"id": "classroom", "label": "Classroom & Campus", "icon": "fa-solid fa-chalkboard-user"},
      {"id": "exams", "label": "Exams & Studying", "icon": "fa-solid fa-book"},
      {"id": "biology", "label": "Biology", "icon": "fa-solid fa-dna"},
      {"id": "engineering", "label": "Engineering", "icon": "fa-solid fa-gears"},
      {"id": "mathematics", "label": "Mathematics", "icon": "fa-solid fa-square-root-variable"},
      {"id": "history", "label": "History", "icon": "fa-solid fa-landmark"},
      {"id": "literature", "label": "Literature Studies", "icon": "fa-solid fa-book-bookmark"},
      {"id": "research", "label": "Lab & Research", "icon": "fa-solid fa-flask-vial"}
    ]
  },
  {
    "id": "culture-media",
    "label": "Culture, Media & Literature",
    "icon": "fa-solid fa-masks-theater",
    "children": [
      {"id": "film-tv", "label": "Film & TV", "icon": "fa-solid fa-film"},
      {"id": "music", "label": "Music", "icon": "fa-solid fa-music"},
      {"id": "visual-arts", "label": "Visual Arts", "icon": "fa-solid fa-palette"},
      {"id": "theater", "label": "Theater & Performance", "icon": "fa-solid fa-masks-theater"},
      {"id": "sports", "label": "Sports & Games", "icon": "fa-solid fa-futbol"},
      {"id": "literature-classics", "label": "Literature—Classics", "icon": "fa-solid fa-book-open"},
      {"id": "literature-scifi", "label": "Literature—Sci‑Fi/Fantasy", "icon": "fa-solid fa-meteor"},
      {"id": "literature-poetry", "label": "Literature—Poetry", "icon": "fa-solid fa-feather-pointed"}
    ]
  },
  {
    "id": "health-wellness",
    "label": "Health & Wellness",
    "icon": "fa-solid fa-heart-pulse",
    "children": [
      {"id": "doctor", "label": "At the Doctor", "icon": "fa-solid fa-stethoscope"},
      {"id": "pharmacy", "label": "Pharmacy", "icon": "fa-solid fa-pills"},
      {"id": "symptoms", "label": "Symptoms & Injuries", "icon": "fa-solid fa-head-side-cough"},
      {"id": "fitness", "label": "Fitness & Gym", "icon": "fa-solid fa-dumbbell"},
      {"id": "mental-health", "label": "Mental Health", "icon": "fa-solid fa-brain"},
      {"id": "nutrition", "label": "Nutrition & Diet", "icon": "fa-solid fa-carrot"},
      {"id": "insurance", "label": "Health Insurance", "icon": "fa-solid fa-shield-heart"}
    ]
  },
  {
    "id": "shopping-money",
    "label": "Shopping, Money & Services",
    "icon": "fa-solid fa-shopping-bag",
    "children": [
      {"id": "clothing", "label": "Clothing & Shoes", "icon": "fa-solid fa-shirt"},
      {"id": "electronics", "label": "Electronics & Gadgets", "icon": "fa-solid fa-mobile-screen-button"},
      {"id": "markets", "label": "Markets & Bargaining", "icon": "fa-solid fa-shop"},
      {"id": "online-shopping", "label": "Online Shopping", "icon": "fa-solid fa-cart-shopping"},
      {"id": "banking", "label": "Banking & Payments", "icon": "fa-solid fa-building-columns"},
      {"id": "post-office", "label": "Post Office & Shipping", "icon": "fa-solid fa-envelopes-bulk"},
      {"id": "beauty", "label": "Hair & Beauty", "icon": "fa-solid fa-scissors"},
      {"id": "repairs-maintenance", "label": "Repairs & Maintenance", "icon": "fa-solid fa-wrench"}
    ]
  },
  {
    "id": "civic-logistics",
    "label": "Civic & Logistics",
    "icon": "fa-solid fa-gavel",
    "children": [
      {"id": "police", "label": "Police & Emergencies", "icon": "fa-solid fa-house-chimney-crack"},
      {"id": "government", "label": "Government Offices", "icon": "fa-solid fa-building-flag"},
      {"id": "visas", "label": "Visas & Residency", "icon": "fa-solid fa-user-check"},
      {"id": "taxes", "label": "Taxes & Invoices", "icon": "fa-solid fa-file-invoice-dollar"},
      {"id": "contracts", "label": "Renting Contracts & Utilities", "icon": "fa-solid fa-file-signature"},
      {"id": "legal", "label": "Legal Help", "icon": "fa-solid fa-scale-balanced"},
      {"id": "public-services", "label": "Public Services & Appointments", "icon": "fa-solid fa-calendar-check"}
    ]
  }
];
