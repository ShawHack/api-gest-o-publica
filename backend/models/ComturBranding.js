const mongoose = require('../db/conn')
const { Schema } = mongoose

const snapshotSchema = new Schema({ version:{type:Number,required:true}, value:{type:Schema.Types.Mixed,required:true}, createdAt:{type:Date,default:Date.now}, createdBy:{type:Schema.Types.ObjectId,ref:'User',default:null} },{_id:false})
const schema = new Schema({
  key:{type:String,default:'default',unique:true,immutable:true}, value:{type:Schema.Types.Mixed,required:true}, version:{type:Number,default:1,min:1}, history:{type:[snapshotSchema],default:[]}, updatedBy:{type:Schema.Types.ObjectId,ref:'User',default:null},
},{timestamps:true})
module.exports = mongoose.models.ComturBranding || mongoose.model('ComturBranding',schema)
