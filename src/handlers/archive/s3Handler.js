const aws = require('aws-sdk');

const handler = {
  type: 'S3',
  save: function (threadData) {
    const s3 = new aws.S3({
      accessKeyId: process.env.S3_API_KEY,
      secretAccessKey: process.env.S3_API_SECRET
    });

    //const threadTags = await fetchThread(threadData.id);
    //console.log('=== TaGS ===');
    //console.log(JSON.stringify(threadTags,null,2));
    //threadData.tags = threadTags.tags;

    let parms = {
      Bucket: `${process.env.S3_BUCKET}`,
      Key: `${process.env.S3_KEY_PREFIX}${threadData.key}`,
      Body: JSON.stringify(threadData, null, 2),
      ContentType: 'text/json'
    };
    return new Promise ((resolve, reject) => {
      return s3.putObject(parms).promise()
      .then(() => {
        resolve(true);
      })
      .catch((s3err) => {
        console.log('s3.save', s3err.message);
        resolve(false);
      });
    });
  }
};

module.exports = handler;
