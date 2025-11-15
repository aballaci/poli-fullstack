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
    "label": "topics.everyday_social",
    "icon": "fa-solid fa-comments",
    "children": [
      { "id": "greetings", "label": "topics.greetings", "icon": "fa-solid fa-handshake" },
      { "id": "weather", "label": "topics.weather", "icon": "fa-solid fa-cloud-sun" },
      { "id": "directions", "label": "topics.directions", "icon": "fa-solid fa-diamond-turn-right" },
      { "id": "time", "label": "topics.time", "icon": "fa-solid fa-calendar-days" },
      { "id": "feelings", "label": "topics.feelings", "icon": "fa-solid fa-face-smile" },
      { "id": "meeting-friends", "label": "topics.meeting_friends", "icon": "fa-solid fa-users" },
      { "id": "etiquette", "label": "topics.etiquette", "icon": "fa-solid fa-people-arrows" },
      { "id": "events", "label": "topics.events", "icon": "fa-solid fa-champagne-glasses" }
    ]
  },
  {
    "id": "travel-transport",
    "label": "topics.travel_transport",
    "icon": "fa-solid fa-plane",
    "children": [
      { "id": "airport", "label": "topics.airport", "icon": "fa-solid fa-plane-departure" },
      { "id": "public-transport", "label": "topics.public_transport", "icon": "fa-solid fa-train-subway" },
      { "id": "hotel", "label": "topics.hotel", "icon": "fa-solid fa-bell-concierge" },
      { "id": "sightseeing", "label": "topics.sightseeing", "icon": "fa-solid fa-camera-retro" },
      { "id": "car-rental", "label": "topics.car_rental", "icon": "fa-solid fa-car" },
      { "id": "customs", "label": "topics.customs", "icon": "fa-solid fa-passport" },
      { "id": "emergencies", "label": "topics.emergencies", "icon": "fa-solid fa-kit-medical" },
      { "id": "holiday-type", "label": "topics.holiday_type", "icon": "fa-solid fa-umbrella-beach" }
    ]
  },
  {
    "id": "food-dining",
    "label": "topics.food_dining",
    "icon": "fa-solid fa-utensils",
    "children": [
      { "id": "cafe", "label": "topics.cafe", "icon": "fa-solid fa-mug-saucer" },
      { "id": "restaurant", "label": "topics.restaurant", "icon": "fa-solid fa-book-open-reader" },
      { "id": "street-food", "label": "topics.street_food", "icon": "fa-solid fa-store" },
      { "id": "dietary-needs", "label": "topics.dietary_needs", "icon": "fa-solid fa-wheat-awn-circle-exclamation" },
      { "id": "paying-bill", "label": "topics.paying_bill", "icon": "fa-solid fa-receipt" },
      { "id": "cooking", "label": "topics.cooking", "icon": "fa-solid fa-kitchen-set" },
      { "id": "groceries", "label": "topics.groceries", "icon": "fa-solid fa-basket-shopping" },
      { "id": "nightlife", "label": "topics.nightlife", "icon": "fa-solid fa-martini-glass-citrus" }
    ]
  },
  {
    "id": "home-family",
    "label": "topics.home_family",
    "icon": "fa-solid fa-house",
    "children": [
      { "id": "housing", "label": "topics.housing", "icon": "fa-solid fa-house-chimney-user" },
      { "id": "utilities", "label": "topics.utilities", "icon": "fa-solid fa-lightbulb" },
      { "id": "chores", "label": "topics.chores", "icon": "fa-solid fa-broom" },
      { "id": "parenting", "label": "topics.parenting", "icon": "fa-solid fa-children" },
      { "id": "pets", "label": "topics.pets", "icon": "fa-solid fa-paw" },
      { "id": "neighbors", "label": "topics.neighbors", "icon": "fa-solid fa-person-shelter" },
      { "id": "repairs", "label": "topics.repairs", "icon": "fa-solid fa-screwdriver-wrench" },
      { "id": "gardening", "label": "topics.gardening", "icon": "fa-solid fa-seedling" }
    ]
  },
  {
    "id": "work-professions",
    "label": "topics.work_professions",
    "icon": "fa-solid fa-briefcase",
    "children": [
      { "id": "office", "label": "topics.office", "icon": "fa-solid fa-users-viewfinder" },
      { "id": "email", "label": "topics.email", "icon": "fa-solid fa-at" },
      { "id": "factory", "label": "topics.factory", "icon": "fa-solid fa-industry" },
      { "id": "construction", "label": "topics.construction", "icon": "fa-solid fa-helmet-safety" },
      { "id": "retail", "label": "topics.retail", "icon": "fa-solid fa-cash-register" },
      { "id": "bakery", "label": "topics.bakery", "icon": "fa-solid fa-bread-slice" },
      { "id": "call-center", "label": "topics.call_center", "icon": "fa-solid fa-headset" },
      { "id": "healthcare-setting", "label": "topics.healthcare_setting", "icon": "fa-solid fa-user-doctor" }
    ]
  },
  {
    "id": "education-academia",
    "label": "topics.education_academia",
    "icon": "fa-solid fa-school",
    "children": [
      { "id": "classroom", "label": "topics.classroom", "icon": "fa-solid fa-chalkboard-user" },
      { "id": "exams", "label": "topics.exams", "icon": "fa-solid fa-book" },
      { "id": "biology", "label": "topics.biology", "icon": "fa-solid fa-dna" },
      { "id": "engineering", "label": "topics.engineering", "icon": "fa-solid fa-gears" },
      { "id": "mathematics", "label": "topics.mathematics", "icon": "fa-solid fa-square-root-variable" },
      { "id": "history", "label": "topics.history", "icon": "fa-solid fa-landmark" },
      { "id": "literature", "label": "topics.literature", "icon": "fa-solid fa-book-bookmark" },
      { "id": "research", "label": "topics.research", "icon": "fa-solid fa-flask-vial" }
    ]
  },
  {
    "id": "culture-media",
    "label": "topics.culture_media",
    "icon": "fa-solid fa-masks-theater",
    "children": [
      { "id": "film-tv", "label": "topics.film_tv", "icon": "fa-solid fa-film" },
      { "id": "music", "label": "topics.music", "icon": "fa-solid fa-music" },
      { "id": "visual-arts", "label": "topics.visual_arts", "icon": "fa-solid fa-palette" },
      { "id": "theater", "label": "topics.theater", "icon": "fa-solid fa-masks-theater" },
      { "id": "sports", "label": "topics.sports", "icon": "fa-solid fa-futbol" },
      { "id": "literature-classics", "label": "topics.literature_classics", "icon": "fa-solid fa-book-open" },
      { "id": "literature-scifi", "label": "topics.literature_scifi", "icon": "fa-solid fa-meteor" },
      { "id": "literature-poetry", "label": "topics.literature_poetry", "icon": "fa-solid fa-feather-pointed" }
    ]
  },
  {
    "id": "health-wellness",
    "label": "topics.health_wellness",
    "icon": "fa-solid fa-heart-pulse",
    "children": [
      { "id": "doctor", "label": "topics.doctor", "icon": "fa-solid fa-stethoscope" },
      { "id": "pharmacy", "label": "topics.pharmacy", "icon": "fa-solid fa-pills" },
      { "id": "symptoms", "label": "topics.symptoms", "icon": "fa-solid fa-head-side-cough" },
      { "id": "fitness", "label": "topics.fitness", "icon": "fa-solid fa-dumbbell" },
      { "id": "mental-health", "label": "topics.mental_health", "icon": "fa-solid fa-brain" },
      { "id": "nutrition", "label": "topics.nutrition", "icon": "fa-solid fa-carrot" },
      { "id": "insurance", "label": "topics.insurance", "icon": "fa-solid fa-shield-heart" }
    ]
  },
  {
    "id": "shopping-money",
    "label": "topics.shopping_money",
    "icon": "fa-solid fa-shopping-bag",
    "children": [
      { "id": "clothing", "label": "topics.clothing", "icon": "fa-solid fa-shirt" },
      { "id": "electronics", "label": "topics.electronics", "icon": "fa-solid fa-mobile-screen-button" },
      { "id": "markets", "label": "topics.markets", "icon": "fa-solid fa-shop" },
      { "id": "online-shopping", "label": "topics.online_shopping", "icon": "fa-solid fa-cart-shopping" },
      { "id": "banking", "label": "topics.banking", "icon": "fa-solid fa-building-columns" },
      { "id": "post-office", "label": "topics.post_office", "icon": "fa-solid fa-envelopes-bulk" },
      { "id": "beauty", "label": "topics.beauty", "icon": "fa-solid fa-scissors" },
      { "id": "repairs-maintenance", "label": "topics.repairs_maintenance", "icon": "fa-solid fa-wrench" }
    ]
  },
  {
    "id": "civic-logistics",
    "label": "topics.civic_logistics",
    "icon": "fa-solid fa-gavel",
    "children": [
      { "id": "police", "label": "topics.police", "icon": "fa-solid fa-house-chimney-crack" },
      { "id": "government", "label": "topics.government", "icon": "fa-solid fa-building-flag" },
      { "id": "visas", "label": "topics.visas", "icon": "fa-solid fa-user-check" },
      { "id": "taxes", "label": "topics.taxes", "icon": "fa-solid fa-file-invoice-dollar" },
      { "id": "contracts", "label": "topics.contracts", "icon": "fa-solid fa-file-signature" },
      { "id": "legal", "label": "topics.legal", "icon": "fa-solid fa-scale-balanced" },
      { "id": "public-services", "label": "topics.public_services", "icon": "fa-solid fa-calendar-check" }
    ]
  }
];
