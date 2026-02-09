const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema({
    userId: {type: mongoose.Schema.Types.ObjectId, ref: "user", required: true},
    categoryId: {type:String, required:true, unique:true},
    category: {type: String, required:true},
    budget: {type: Number},
    color: {type:String},
    icon: {type: String},
    upCategories: [{type: String}]
});

categorySchema.index({ userId: 1, categoryId: 1}, {unique: true});

const Category = mongoose.model("category", categorySchema);

module.exports = Category;
