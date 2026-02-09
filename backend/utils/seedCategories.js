const Category = require("../models/category");

const defaultCategories = [
  { categoryId: "food", category: "Food", budget: 600, color: "#22c55e", icon: "utensils", upCategories: ["groceries", "restaurants-and-cafes", "takeaway"] },
  { categoryId: "pet", category: "Pet", budget: 100, color: "#f97316", icon: "paw-print", upCategories: ["pets"] },
  { categoryId: "shopping", category: "Shopping", budget: 300, color: "#ec4899", icon: "shopping-bag", upCategories: ["clothing-and-accessories", "homeware-and-appliances", "technology"] },
  { categoryId: "entertainment", category: "Entertainment", budget: 200, color: "#8b5cf6", icon: "music", upCategories: ["events-and-gigs", "hobbies", "tv-and-music", "pubs-and-bars", "booze", "games-and-software"] },
  { categoryId: "investment", category: "Investment", budget: 500, color: "#10b981", icon: "trending-up", upCategories: ["investments"] },
  { categoryId: "bills", category: "Bills", budget: 800, color: "#f59e0b", icon: "receipt", upCategories: ["utilities", "internet", "mobile-phone", "home-insurance-and-rates"] },
  { categoryId: "transport", category: "Transport", budget: 150, color: "#3b82f6", icon: "car", upCategories: ["fuel", "public-transport", "taxis-and-share-cars", "parking", "toll-roads", "car-insurance-and-maintenance", "car-repayments", "cycling"] },
  { categoryId: "health", category: "Health", budget: 100, color: "#14b8a6", icon: "heart", upCategories: ["health-and-medical", "fitness-and-wellbeing", "hair-and-beauty"] },
  { categoryId: "home", category: "Home", budget: 1000, color: "#6366f1", icon: "home", upCategories: ["rent-and-mortgage", "home-maintenance-and-improvements"] },
  { categoryId: "other", category: "Other", budget: 200, color: "#6b7280", icon: "more-horizontal", upCategories: [] },
];

async function seedCategories(userId) {
  const existing = await Category.findOne({ userId });
  if (existing) {
    return { success: false, message: "Categories already exist" };
  }

  const categories = defaultCategories.map((cat) => ({
    ...cat,
    userId,
  }));

  await Category.insertMany(categories);
  return { success: true, count: categories.length };
}

module.exports = { seedCategories, defaultCategories };
