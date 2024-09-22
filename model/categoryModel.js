const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Category = new Schema({
    categoryName : {
        type : String,
        required : true,
    },description: {
         type: String,
          required: true },

    status: {
         type: String, 
         required: true },
         
    is_delete : {
        type : Boolean,
        default : false
    }
});


module.exports = mongoose.model("Category",Category);