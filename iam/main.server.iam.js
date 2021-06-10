const { validate } = require('@helpers/utils');

const ctrl = require('../controllers/main.server.controller');
const metaSchema = require('../schemas/meta.server.schema.json');
const shareSchema = require('../schemas/share.server.schema.json');
const file64Schema = require('../schemas/file64.server.schema.json');

module.exports = {
  prefix: '/files',
  params: [
    {
      name: 'fileID',
      middleware: ctrl.fileById,
    },
  ],
  routes: [
    {
      path: '/',
      methods: {
        /**
         * @bodyMode formdata
         *
         * @formdata
         * [{
         *   "key": "files",
         *   "type": "file",
         *   "description": "List of files to upload"
         * }, {
         *   "key": "file64",
         *   "type": "text",
         *   "value": "",
         *   "description": "Base64 encoded files. You can dupplicate this field as many as you want."
         * }, {
         *   "key": "file64",
         *   "type": "text",
         *   "value": "",
         *   "description": "Base64 encoded files. You can dupplicate this field as many as you want."
         * }, {
         *   "key": "visibility",
         *   "type": "text",
         *   "value": "private",
         *   "description": "The visibility of the uploaded files. Possible values: private, public and internal"
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
          parents: ['modules:files', 'modules:files:main'],
          iam: 'modules:files:main:upload',
          middlewares: [ctrl.multer, validate(file64Schema), ctrl.upload64, ctrl.upload],
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
          groups    : [],
          parents: ['modules:files', 'modules:files:main'],
          middlewares: [ctrl.list],
          iam: 'modules:files:main:list',
        },
      },
    },
    {
      path: '/:fileID',
      methods: {
        get: {
          title: 'Get file metadata',
          description: 'Get a file metadata',
          groups: [],
          parents: ['modules:files', 'modules:files:main'],
          middlewares: [ctrl.canAccess, ctrl.one],
          iam: 'modules:files:main:meta:get',
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
          parents: ['modules:files', 'modules:files:main'],
          middlewares: [validate(metaSchema), ctrl.canEdit, ctrl.meta],
          iam: 'modules:files:main:meta:edit',
        },
        delete: {
          title: 'Remove file',
          description: 'Remove a specific file',
          groups: [],
          parents: ['modules:files', 'modules:files:main'],
          middlewares: [ctrl.canEdit, ctrl.remove],
          iam: 'modules:files:main:delete',
        },
      },
    },
    {
      path: '/:fileID/download',
      methods: {
        get: {
          title: 'Download file',
          description: 'Download a specific file',
          groups: [],
          parents: ['modules:files', 'modules:files:main'],
          middlewares: [ctrl.canAccess, ctrl.download(true)],
          iam: 'modules:files:main:download',
        },
      },
    },
    {
      path: '/:fileID/view',
      methods: {
        get: {
          title: 'View file',
          description: 'View a specific file',
          groups: [],
          parents: ['modules:files', 'modules:files:main'],
          middlewares: [ctrl.canAccess, ctrl.download(false)],
          iam: 'modules:files:main:view',
        },
      },
    },
    {
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
          parents: ['modules:files', 'modules:files:main'],
          middlewares: [validate(shareSchema), ctrl.canEdit, ctrl.share],
          iam: 'modules:files:main:share',
        },
      },
    },
    {
      path: '/:fileID/unshare',
      methods: {
        post: {
          title: 'Stop file sharing',
          description: 'Unshare a specific file',
          groups: [],
          parents: ['modules:files', 'modules:files:main'],
          middlewares: [ctrl.canEdit, ctrl.unshare],
          iam: 'modules:files:main:unshare',
        },
      },
    },
  ],
};
