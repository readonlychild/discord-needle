const fs = require('fs');

const handler = {
  type: 'FS',
  save: function (threadData) {

    let filename = `${threadData.key.replace(/\//g, '_')}`;
    let folder = process.env.ARCHIVE_FS_DIR || 'c:/temp/needles/';
    
    return new Promise ((resolve, reject) => {
      fs.writeFileSync(`${folder}${filename}`, JSON.stringify(threadData, null, 2));
      resolve(true);
    });
  }
};

module.exports = handler;
