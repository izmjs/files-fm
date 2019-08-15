const SCOPE = 'files-manager';

module.exports = (config) => {
  const { env } = config.utils;
  return {
    filesManager: {
      uploader: {
        limits: {
          fileSize: env.get('UPLOADER_MAX_SIZE', SCOPE),
        },
      },
      accept: env.get('UPLOADER_ACCEPT', SCOPE).split(','),
      bucket: env.get('BUCKET', SCOPE),
      visibility: env.get('DEFAULT_VISIBILITY', SCOPE),
      unassignedAccess: env.get('UNASSIGNED_ACCESS', SCOPE).split(','),
    },
  };
};
