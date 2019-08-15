/* eslint-disable import/no-dynamic-require */

/**
 * Module dependencies.
 */
const mongoose = require('mongoose');

const {
  Schema,
} = mongoose;

/**
 * File Schema
 */
const FolderSchema = new Schema({
  name: {
    type: String,
    default: '',
    required: 'Please fill Folder name',
    trim: true,
  },
  created: {
    type: Date,
    default: Date.now,
  },
  owner: {
    type: Schema.ObjectId,
    ref: 'User',
  },
  files: [{
    type: Schema.ObjectId,
  }],
  parent: {
    type: Schema.ObjectId,
    ref: 'Folder',
  },
}, {
  timestamps: true,
  collection: 'folders',
});

mongoose.model('Folder', FolderSchema);
