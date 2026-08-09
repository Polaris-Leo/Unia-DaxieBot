function isPortableArtifact(name) {
  return /^Unia-DaxieBot-\d+\.\d+\.\d+-Portable\.exe$/i.test(name);
}

module.exports = { isPortableArtifact };
