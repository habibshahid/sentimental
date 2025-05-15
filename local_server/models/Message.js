// models/Message.js - MongoDB Message Model
const mongoose = require('mongoose');

// Create schema for nested objects
const SentimentSchema = new mongoose.Schema({
  score: Number,
  sentiment: String
}, { _id: false });

const ProfanitySchema = new mongoose.Schema({
  score: Number,
  words: [String]
}, { _id: false });

const SentimentAnalysisSchema = new mongoose.Schema({
  sentiment: SentimentSchema,
  profanity: ProfanitySchema,
  intents: [String],
  language: String
}, { _id: false });

const ExtraPayloadSchema = new mongoose.Schema({
  threadId: String,
  isCanned: Boolean,
  cannedMessageName: String,
  sentimentAnalysis: SentimentAnalysisSchema
}, { _id: false });

const AuthorSchema = new mongoose.Schema({
  name: String,
  id: String,
  role: String
}, { _id: false });

const StatusSchema = new mongoose.Schema({
  error: mongoose.Schema.Types.Mixed,
  message: String,
  remarks: String
}, { _id: false });

// Main Message Schema
const MessageSchema = new mongoose.Schema({
  _id: mongoose.Schema.Types.ObjectId,
  author: AuthorSchema,
  status: StatusSchema,
  channelMessageId: String,
  message: String,
  readBy: [String],
  forwarded: Boolean,
  isChild: Boolean,
  parentId: mongoose.Schema.Types.Mixed,
  queue: String,
  isDeleted: Boolean,
  interactionDirection: Number,
  interactionSource: String,
  interactionDestination: String,
  interactionId: mongoose.Schema.Types.ObjectId,
  channel: String,
  messageType: String,
  direction: Number,
  extension: String,
  recipient: String,
  extraPayload: ExtraPayloadSchema,
  attachments: [mongoose.Schema.Types.Mixed],
  createdAt: Date,
  updatedAt: Date,
  __v: Number
}, {
  collection: process.env.MONGODB_MESSAGES_COLLECTION || 'messages',
  timestamps: true
});

// Create indexes for better performance
MessageSchema.index({ channel: 1 });
MessageSchema.index({ queue: 1 });
MessageSchema.index({ createdAt: 1 });
MessageSchema.index({ 'author.name': 1 });
MessageSchema.index({ 'extraPayload.sentimentAnalysis.sentiment.sentiment': 1 });

const Message = mongoose.model('Message', MessageSchema);

module.exports = Message;