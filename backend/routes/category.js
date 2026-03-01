const express = require("express");
const authMiddleware = require("../middleware/auth");
const Category = require("../models/category");
const { seedCategories } = require("../utils/seedCategories");
const router = express.Router();

// Get all categories for user
router.get("/", authMiddleware, async (req, res) => {
  try {
    const categories = await Category.find({ userId: req.user.userId });
    res.json({ categories });
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// Create a new category
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { categoryId, category, budget, color, icon, upCategories } = req.body;

    const existing = await Category.findOne({
      userId: req.user.userId,
      categoryId,
    });

    if (existing) {
      return res.status(400).json({ message: "Category already exists" });
    }

    const newCategory = new Category({
      userId: req.user.userId,
      categoryId,
      category,
      budget: budget || 0,
      color: color || "#22c55e",
      icon,
      upCategories: upCategories || [],
    });

    await newCategory.save();
    res.status(201).json({ message: "Category created", category: newCategory });
  } catch (error) {
    console.error("Error creating category:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// Update a category
router.put("/:categoryId", authMiddleware, async (req, res) => {
  try {
    const { category, budget, color, icon, upCategories } = req.body;

    const patch = {};
    if (category !== undefined) patch.category = category;
    if (budget !== undefined) patch.budget = budget;
    if (color !== undefined) patch.color = color;
    if (icon !== undefined) patch.icon = icon;
    if (upCategories !== undefined) patch.upCategories = upCategories;

    const updated = await Category.findOneAndUpdate(
      { userId: req.user.userId, categoryId: req.params.categoryId },
      { $set: patch },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: "Category not found" });
    }

    res.json({ message: "Category updated", category: updated });
  } catch (error) {
    console.error("Error updating category:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// Delete a category
router.delete("/:categoryId", authMiddleware, async (req, res) => {
  try {
    const deleted = await Category.findOneAndDelete({
      userId: req.user.userId,
      categoryId: req.params.categoryId,
    });

    if (!deleted) {
      return res.status(404).json({ message: "Category not found" });
    }

    res.json({ message: "Category deleted" });
  } catch (error) {
    console.error("Error deleting category:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// Batch-update the upCategories mapping across all user categories
router.post("/mapping", authMiddleware, async (req, res) => {
  try {
    const { mappings } = req.body; // { [upCategoryId]: userCategoryId }

    const userCategories = await Category.find({ userId: req.user.userId });

    await Promise.all(
      userCategories.map((cat) => {
        const newUpCategories = Object.entries(mappings)
          .filter(([, userCatId]) => userCatId === cat.categoryId)
          .map(([upCatId]) => upCatId);
        return Category.updateOne(
          { userId: req.user.userId, categoryId: cat.categoryId },
          { $set: { upCategories: newUpCategories } }
        );
      })
    );

    res.json({ message: "Mapping updated" });
  } catch (error) {
    console.error("Error updating mapping:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// Seed default categories for new user
router.post("/seed", authMiddleware, async (req, res) => {
  try {
    const result = await seedCategories(req.user.userId);

    if (!result.success) {
      return res.status(400).json({ message: result.message });
    }

    res.status(201).json({ message: "Default categories created", count: result.count });
  } catch (error) {
    console.error("Error seeding categories:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

module.exports = router;
