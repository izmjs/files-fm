const { mongo, model, Types, connection } = require('mongoose');
const { promisify } = require('util');
const multer = require('multer');
const multerStorage = require('multer-gridfs-storage');
const minimatch = require('minimatch');
const fileType = require('file-type');

const { filesManager } = require('@config/index');

const { bucket, accept = [], uploader } = filesManager;
const Grid = model('FMFiles');

const gfs = new mongo.GridFSBucket(connection.db, {
  bucketName: bucket,
});

const delete$ = promisify(gfs.delete).bind(gfs);

const storage = multerStorage({
  db: connection.db,
  client: connection.client,
  file: (req, file) => ({
    filename: file.originalname,
    bucketName: filesManager.bucket,
    metadata: {
      owner: req.user
        ? // eslint-disable-next-line
          req.user._id
        : null,
    },
  }),
});

/**
 * List files
 * @controller List files
 * @param {IncommingMessage} req The request
 * @param {OutcommingMessage} res The response
 * @param {Function} next Go to the next middleware
 */
exports.list = async function list(req, res, next) {
  const { $top: top, $skip: skip } = req.query;

  try {
    const result = await Grid.list(req.user).paginate({ top, skip });

    return res.json(result);
  } catch (e) {
    return next(e);
  }
};

/**
 * Check if the user can access the file
 * @controller Check access
 * @param {IncommingMessage} req The request
 * @param {OutcommingMessage} res The response
 * @param {Function} next Go to the next middleware
 */
exports.canAccess = async function canAccess(req, res, next) {
  const { user, gridFile: f } = req;
  let isCanAccess = false;

  try {
    isCanAccess = await f.canAccess(user);
  } catch (e) {
    return next(e);
  }

  if (!isCanAccess) {
    return res.status(403).json({
      message: req.t('UNAUTHORIZED_TO_VIEW'),
    });
  }

  return next();
};

/**
 * Check if the user can edit the file
 * @controller Check edit
 * @param {IncommingMessage} req The request
 * @param {OutcommingMessage} res The response
 * @param {Function} next Go to the next middleware
 */
exports.canEdit = async function canEdit(req, res, next) {
  const { user, gridFile: f } = req;
  let isCanEdit = false;

  try {
    isCanEdit = await f.canEdit(user);
  } catch (e) {
    return next(e);
  }

  if (!isCanEdit) {
    return res.status(403).json({
      message: req.t('UNAUTHORIZED_TO_EDIT'),
    });
  }

  return next();
};

/**
 * upload base64 file(s)
 * @controller upload64
 * @param {IncommingMessage} req The request
 * @param {OutcommingMessage} res The response
 * @param {Function} next Go to the next middleware
 */
exports.upload64 = async function upload64(req, res, next) {
  let { file64 = [] } = req.body;
  const { user = {} } = req;
  const { _id: userId } = user;

  if (!Array.isArray(file64)) {
    file64 = [file64];
  }

  const uploaded64 = await Promise.all(
    file64.map((oneFile) => {
      const file = Buffer.from(oneFile, 'base64');

      return fileType.fromBuffer(file).then((fType = {}) => {
        const { ext, mime } = fType;

        if (!ext) {
          return {
            error: req.t('FILE_WITH_NO_EXT'),
          };
        }

        const matchMime = accept.find((one) => minimatch(mime, one));

        if (!matchMime) {
          return {
            error: req.t('MIME_NOT_ACCEPTED', { mime }),
          };
        }

        return new Promise((resolve) => {
          const uploadStream = gfs.openUploadStream(`file.${ext}`, {
            metadata: {
              owner: userId,
              visibility: req.body.visibility,
            },
            contentType: mime,
          });

          const { id } = uploadStream;

          uploadStream.once('finish', () => {
            try {
              return resolve(id.toString());
            } catch (e) {
              return resolve({
                error: e.message,
              });
            }
          });

          uploadStream.write(file);
          uploadStream.end();
        });
      });
    }),
  );

  if (!req.meta) req.meta = {};

  req.meta.uploaded64 = uploaded64;

  return next();
};

/**
 * Upload file(s)
 * @controller Upload
 * @param {IncommingMessage} req The request
 * @param {OutcommingMessage} res The response
 * @param {Function} next Go to the next middleware
 */
exports.upload = async function upload(req, res, next) {
  const { uploaded64 = [] } = req.meta;
  let { files = [] } = req;
  let array;

  try {
    array = await Grid.find({
      _id: uploaded64.filter((one) => typeof one === 'string'),
    });
  } catch (e) {
    return next(e);
  }

  files = array.concat(uploaded64.filter((one) => typeof one !== 'string')).concat(files);

  const visibility = ['public', 'private', 'internal'].includes(req.body.visibility)
    ? req.body.visibility
    : 'private';

  try {
    await Grid.updateMany(
      {
        _id: {
          $in: files.filter((one) => !one.error).map((one) => one.id),
        },
      },
      {
        'metadata.visibility': visibility,
      },
    );
  } catch (e) {
    // Ignore error and proceed
  }

  return res.status(201).json(files);
};

/**
 * Get meta data of a file
 * @controller Get metadata
 * @param {IncommingMessage} req The request
 * @param {OutcommingMessage} res The response
 * @param {Function} next Go to the next middleware
 */
exports.meta = async function meta(req, res, next) {
  const { body, gridFile } = req;
  try {
    gridFile.set(body);
    const json = await gridFile.save({ new: true });
    return res.json(json);
  } catch (e) {
    return next(e);
  }
};

/**
 * Get one file
 * @controller Get one
 * @param {IncommingMessage} req The request
 * @param {OutcommingMessage} res The response
 * @param {Function} next Go to the next middleware
 */
exports.one = async function one(req, res) {
  res.json(req.gridFile);
};

/**
 * Remove a file
 * @controller Remove
 * @param {IncommingMessage} req The request
 * @param {OutcommingMessage} res The response
 * @param {Function} next Go to the next middleware
 */
exports.remove = async function remove(req, res, next) {
  const { gridFile } = req;
  const f = gridFile.toJSON();
  const { _id: id } = f;

  try {
    await delete$(id);
    return res.status(204).end();
  } catch (e) {
    return next(e);
  }
};

/**
 * Get file By ID
 * @controller Get by ID
 * @param {IncommingMessage} req The request
 * @param {OutcommingMessage} res The response
 * @param {Function} next Go to the next middleware
 */
exports.fileById = async function getById(req, res, next, id) {
  if (!Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      ok: false,
      result: {
        message: 'ID not valid',
      },
    });
  }

  let f;

  try {
    f = await Grid.findById(id);
  } catch (e) {
    return next(e);
  }

  if (!f) {
    return res.status(404).json({
      message: req.t('FILE_NOT_FOUND'),
    });
  }

  req.gridFile = f;
  return next();
};

/**
 * Download a file
 * @controller Download
 * @param {IncommingMessage} req The request
 * @param {OutcommingMessage} res The response
 * @param {Function} next Go to the next middleware
 */
exports.download = (isDownload) =>
  async function download(req, res) {
    const { gridFile: f } = req;
    const { _id: id } = f;

    const stream = gfs.openDownloadStream(id);

    if (isDownload === true) {
      res.header('Content-Type', 'application/octet-stream');
      res.header('Content-Disposition', `attachement; filename=${encodeURI(f.get('filename'))}`);
    } else {
      res.header('Content-Type', f.get('contentType'));
      res.header('Content-Disposition', `inline; filename=${encodeURI(f.get('filename'))}`);
    }

    stream.pipe(res);
  };

/**
 * Upload a file
 * @controller Upload file
 * @param {IncommingMessage} req The request
 * @param {OutcommingMessage} res The response
 * @param {Function} next Go to the next middleware
 */
exports.uploadFile = async function uploadFile(req, res) {
  res.status(204).end();
};

/**
 * Multer
 * @controller Mutler
 * @param {IncommingMessage} req The request
 * @param {OutcommingMessage} res The response
 * @param {Function} next Go to the next middleware
 */
exports.multer = multer(
  {
    storage,
    fileFilter: (req, file, cb) => {
      const result = accept.find((one) => minimatch(file.mimetype, one));
      return cb(null, !!result);
    },
  },
  uploader,
).any();

/**
 * Share a file
 * @controller Share
 * @param {IncommingMessage} req The request
 * @param {OutcommingMessage} res The response
 * @param {Function} next Go to the next middleware
 */
exports.share = async function share(req, res, next) {
  const { body, gridFile, user = {} } = req;
  const { _id: uId } = user;

  gridFile.set('metadata', {
    ...gridFile.metadata.toJSON(),
    share: body.map((s) => ({
      ...s,
      by: uId,
    })),
  });

  try {
    const json = await gridFile.save({ new: true });
    return res.json(json);
  } catch (e) {
    return next(e);
  }
};

/**
 * Stop file sharing
 * @controller Unshare
 * @param {IncommingMessage} req The request
 * @param {OutcommingMessage} res The response
 * @param {Function} next Go to the next middleware
 */
exports.unshare = async function unshare(req, res, next) {
  const { gridFile } = req;
  gridFile.set('metadata', {
    ...gridFile.metadata.toJSON(),
    share: [],
  });

  try {
    const json = await gridFile.save({ new: true });
    return res.json(json);
  } catch (e) {
    return next(e);
  }
};
