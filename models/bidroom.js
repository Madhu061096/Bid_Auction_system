const mongoose = require('mongoose');
const BidSchema = new mongoose.Schema({
     Bidname : {
        type : String,
        required : true
    },
    Bidstatus : {
        type : String,
        required : true
    },
  

})
const Bid = mongoose.model('bid',BidSchema);
module.exports = Bid;