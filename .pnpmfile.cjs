module.exports = {
  hooks: {
    readPackage(pkg) {
      // Production does not use better-auth/test. Keep Vitest a direct dev dependency only.
      if (pkg.name === 'better-auth' && pkg.peerDependenciesMeta?.vitest?.optional) {
        delete pkg.peerDependencies.vitest;
        delete pkg.peerDependenciesMeta.vitest;
      }
      return pkg;
    },
  },
};
