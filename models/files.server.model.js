/**
 * Module dependencies.
 */
const { Schema, model } = require('mongoose');
const { resolve } = require('path');

// eslint-disable-next-line import/no-dynamic-require
const { prefix, filesManager } = require(resolve('./config'));
const {
  bucket,
  visibility,
  unassignedAccess,
} = filesManager;

const filesSchema = new Schema({
  metadata: {
    owner: {
      type: Schema.ObjectId,
      ref: 'User',
    },
    visibility: {
      type: String,
      default: visibility,
      enum: ['private', 'internal', 'public'],
    },
    share: {
      type: [{
        user: {
          type: Schema.ObjectId,
          ref: 'User',
        },
        role: String,
        canEdit: {
          type: Boolean,
          default: false,
        },
        by: {
          type: Schema.ObjectId,
          ref: 'User',
        },
        at: {
          type: Date,
          default: Date.now,
        },
      }],
      default: [],
    },
  },
  length: Number,
  filename: String,
  md5: String,
  contentType: String,
}, {
  strict: false,
  timestamps: true,
  collection: `${bucket}.files`,
});

/**
 * Get the preview link
 */
filesSchema.virtual('preview').get(function get_preview() {
  const { _id: id } = this;
  return `${prefix}/files/${id}/view`;
});

/**
 * Check if a user can access to the current file
 */
filesSchema.methods.canAccess = async function canAccess(user = null) {
  const { metadata } = this;
  const roles = user ? user.roles : ['guest'];

  if (metadata && metadata.visibility === 'public') {
    return true;
  }

  if (!metadata || !metadata.owner) {
    const result = unassignedAccess.filter(r => roles.includes(r));
    return result.length > 0;
  }

  if (user && user.id === metadata.owner.toString()) {
    return true;
  }

  if (user && metadata.visibility === 'internal') {
    return true;
  }

  const { share = [] } = this;
  const index = share.findIndex(({ role: r, user: u }) => (
    r
      ? roles.includes(r)
      : (u && user && u.toString() === user.id)));

  return index >= 0;
};

/**
 * Check if a given user can edit the current file
 */
filesSchema.methods.canEdit = async function canAccess(user = null) {
  const canView = await this.canAccess(user);

  if (!canView) {
    return false;
  }

  const { metadata } = this;

  if (metadata && metadata.owner && user && user.id === metadata.owner.toString()) {
    return true;
  }

  const roles = user ? user.roles : ['guest'];
  const { share = [] } = this;
  const found = share.findIndex(({ role: r, user: u, canEdit = false }) => {
    if (!canEdit) {
      return false;
    }
    return r ? roles.includes(r) : (u && user && u.toString() === user.id);
  });

  return found >= 0;
};

/**
 * Get a specific user files
 */
filesSchema.statics.list = function list(user = null) {
  const ORs = [];
  const roles = Array.isArray(user && user.roles)
    ? user.roles
    : ['guest'];

  // Add public files
  ORs.push({
    'metadata.visibilty': 'public',
  });

  // Add internal, shared and owned files
  if (user) {
    const { _id: id } = user;
    ORs.push({
      'metadata.owner': id,
    }, {
      'metadata.visibilty': 'internal',
    }, {
      'metada.share.user': id,
    });
  }

  // Add shared files with the user roles
  ORs.push({
    'metadata.share.role': {
      $in: roles,
    },
  });

  // Add unassigned files
  const isInUnassignedAccess = unassignedAccess.filter(r => roles.includes(r));
  if (isInUnassignedAccess.length > 0) {
    ORs.push({
      'metada.owner': null,
    });
  }

  return this.find({
    $or: ORs,
  });
};

module.exports = model('FMFiles', filesSchema);
