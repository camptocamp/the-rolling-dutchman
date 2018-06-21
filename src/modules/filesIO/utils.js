const path = require('path');

function getDirectoryName(configPath, outputPath) {
  return `${path.dirname(configPath)}/${path.dirname(outputPath)}`;
}

function getFileNameExtension(outputPath) {
  return `${path.extname(outputPath)}`;
}

function getFileNameWithoutExtension(outputPath) {
  return path.basename(outputPath, getFileNameExtension(outputPath));
}

function getOutputFileOfBatch(configPath, outputPath, batchNumber) {
  return `${getDirectoryName(configPath, outputPath)}/${getFileNameWithoutExtension(outputPath)}${batchNumber}${getFileNameExtension(outputPath)}`;
}

export {
  getDirectoryName, getFileNameExtension,
  getFileNameWithoutExtension, getOutputFileOfBatch,
};
