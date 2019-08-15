// eslint-disable-next-line
const { validate } = require('utils');

const ctrl = require('../controllers/main.server.controller');
const metaSchema = require('../schemas/meta.server.schema');
const shareSchema = require('../schemas/share.server.schema');

module.exports = {
  prefix: '/files-manager/files',
  params: [{
    name: 'fileID',
    middleware: ctrl.fileById,
  }],
  routes: [{
    path: '/',
    methods: {
      /**
       * @bodyMode formdata
       *
       * @body
       * [{
       *   "key": "files",
       *   "type": "file"
       * }]
       *
       * @headers
       * {
       *   "Content-Type": "multipart/form-data"
       * }
       */
      post: {
        title: 'Upload files',
        description: 'Upload files',
        groups: [],
        parents: ['modules:files-manager'],
        iam: 'modules:files-manager:upload',
        middlewares: [
          ctrl.multer,
          ctrl.upload,
        ],
      },
      /**
       * @params
       * [{
       *   "key": "$top",
       *   "value": "10",
       *   "description": "Number of records to return"
       * }, {
       *   "key": "$skip",
       *   "value": "0",
       *   "description": "Number of records to skip"
       * }]
       *
       * @test
       * pm.test("Status code is 200", () => {
       *   pm.response.to.have.status(200);
       *   const json = pm.response.json().value;
       *   if(!Array.isArray(json) || json.length === 0) {
       *     return;
       *   }
       *
       *   const fId = pm.variables.get("fileID");
       *
       *   if(!fId || !json.find(one => one.id === fId)) {
       *     pm.environment.set("fileID", json[0]._id);
       *   }
       * });
       */
      get: {
        title: 'List files',
        description: 'List files',
        groups: [],
        parents: ['modules:files-manager'],
        middlewares: [
          ctrl.list,
        ],
        iam: 'modules:files-manager:list',
      },
    },
  }, {
    path: '/:fileID',
    methods: {
      get: {
        title: 'Get file metadata',
        description: 'Get a file metadata',
        groups: [],
        parents: ['modules:files-manager'],
        middlewares: [
          ctrl.canAccess,
          ctrl.one,
        ],
        iam: 'modules:files-manager:meta:get',
      },
      /**
       * @body
       * {
       *   "filename": "new name.png"
       * }
       */
      put: {
        title: 'Edit file metadata',
        description: 'Edit file metadata',
        groups: [],
        parents: ['modules:files-manager'],
        middlewares: [
          validate(metaSchema),
          ctrl.canEdit,
          ctrl.meta,
        ],
        iam: 'modules:files-manager:meta:edit',
      },
      delete: {
        title: 'Remove file',
        description: 'Remove a specific file',
        groups: [],
        parents: ['modules:files-manager'],
        middlewares: [
          ctrl.canEdit,
          ctrl.remove,
        ],
        iam: 'modules:files-manager:delete',
      },
    },
  }, {
    path: '/:fileID/download',
    methods: {
      get: {
        title: 'Download file',
        description: 'Download a specific file',
        groups: [],
        parents: ['modules:files-manager'],
        middlewares: [
          ctrl.canAccess,
          ctrl.download(true),
        ],
        iam: 'modules:files-manager:download',
      },
    },
  }, {
    path: '/:fileID/view',
    methods: {
      get: {
        title: 'View file',
        description: 'View a specific file',
        groups: [],
        parents: ['modules:files-manager'],
        middlewares: [
          ctrl.canAccess,
          ctrl.download(false),
        ],
        iam: 'modules:files-manager:view',
      },
    },
  }, {
    path: '/:fileID/share',
    methods: {
      /**
       * @body
       * [{
       *   "role": "guest",
       *   "canEdit": false
       * }, {
       *   "user": "{{userId}}",
       *   "canEdit": true
       * }]
       */
      post: {
        title: 'Share file',
        description: 'Share a specific file',
        groups: [],
        parents: ['modules:files-manager'],
        middlewares: [
          validate(shareSchema),
          ctrl.canEdit,
          ctrl.share,
        ],
        iam: 'modules:files-manager:share',
      },
    },
  }, {
    path: '/:fileID/unshare',
    methods: {
      post: {
        title: 'Stop file sharing',
        description: 'Unshare a specific file',
        groups: [],
        parents: ['modules:files-manager'],
        middlewares: [
          ctrl.canEdit,
          ctrl.unshare,
        ],
        iam: 'modules:files-manager:unshare',
      },
    },
  }],
};
